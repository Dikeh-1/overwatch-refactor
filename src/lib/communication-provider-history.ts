import "server-only";

type ProviderMessage = { uuid: string; messageId?: string; subject?: string; date?: string; email?: string };
export type MailEvent = { name: string; time: string; link?: string };
/** Read provider evidence only; never recreate historical mail from today's template. */
export async function readProviderMessage(record: { recipient: string; subject: string; sentAt: string; providerMessageId?: string }) {
  const keys = [...new Set([process.env.BREVO_API_KEY, process.env.BREVO_API_KEY_BACKUP, process.env.BREVO_API_KEY_SECONDARY].filter((key): key is string => Boolean(key)))];
  const query = new URLSearchParams({ email: record.recipient, limit: "100", sort: "desc" });
  if (record.providerMessageId) query.set("messageId", record.providerMessageId);
  else if (Number.isFinite(Date.parse(record.sentAt))) {
    query.set("startDate", new Date(Date.parse(record.sentAt) - 86400000).toISOString().slice(0, 10));
    // Brevo rejects an end date after today, including tomorrow's safety margin.
    query.set("endDate", new Date(Math.min(Date.now(), Date.parse(record.sentAt) + 86400000)).toISOString().slice(0, 10));
  }

  const probeKey = async (key: string) => {
    const read = async (path: string) => {
      const response = await fetch(`https://api.brevo.com/v3/${path}`, { headers: { "api-key": key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      return response.json();
    };
    const listing = await read(`smtp/emails?${query}`);
    const matches = (listing?.transactionalEmails || []).filter((message: ProviderMessage) =>
      record.providerMessageId
        ? message.messageId === record.providerMessageId
        : message.subject === record.subject && Math.abs(Date.parse(message.date || "") - Date.parse(record.sentAt)) < 90000
    );
    if (matches.length !== 1) return null;
    const match = matches[0] as ProviderMessage;
    if (!/^[a-z\d_-]{1,150}$/i.test(match.uuid)) return null;
    const [content, report] = await Promise.all([
      read(`smtp/emails/${match.uuid}`),
      match.messageId
        ? read(`smtp/statistics/events?${new URLSearchParams({ email: record.recipient, messageId: match.messageId, limit: "100", days: "90" })}`)
        : Promise.resolve(null),
    ]);
    if (!content || content.email?.toLowerCase() !== record.recipient.toLowerCase() || content.subject !== record.subject) return null;
    const events: MailEvent[] = (content.events || []).map((event: MailEvent) => ({
      name: String(event.name),
      time: String(event.time),
      ...(event.link ? { link: String(event.link) } : {}),
    }));
    // The detailed events endpoint includes clicked URLs; content history may omit them.
    if (match.messageId && report?.events) {
      for (const event of report.events) {
        if (event.messageId === match.messageId && event.email?.toLowerCase() === record.recipient.toLowerCase()) {
          if (!events.some((row) => row.name === event.event && row.time === event.date)) {
            events.push({ name: String(event.event), time: String(event.date), ...(event.link ? { link: String(event.link) } : {}) });
          }
        }
      }
    }
    const unique = new Map<string, MailEvent>();
    for (const event of events) {
      const name = event.name === "requests" ? "sent" : event.name === "clicks" ? "click" : event.name;
      const at = Date.parse(event.time),
        eventKey = `${name}:${Number.isFinite(at) ? Math.floor(at / 1000) : event.time}`;
      const previous = unique.get(eventKey);
      unique.set(eventKey, { ...event, name, link: event.link || previous?.link });
    }
    return {
      htmlContent: typeof content.body === "string" ? content.body : undefined,
      events: [...unique.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
    };
  };

  const results = await Promise.all(keys.map((key) => probeKey(key).catch(() => null)));
  const found = results.find((r) => r !== null);
  return found || { htmlContent: undefined, events: [] as MailEvent[] };
}
