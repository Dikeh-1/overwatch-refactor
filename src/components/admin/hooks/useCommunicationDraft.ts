"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type DraftContent = { subject: string; messageBody: string; attachments?: unknown[] };
type SavedDraft<T> = { id: string; kind: string; version: number; data: T & { status?: string }; updated_at: string; savedAt?: string };
export function useCommunicationDraft<T extends DraftContent>(scope: string, snapshot: T, restore: (data: Partial<T>) => void) {
  const [ready, setReady] = useState(false), [status, setStatus] = useState("Loading draft…");
  const state = useRef({ id: "", version: 0, scope: "", saved: "", savedAttachments: "", generation: 0 });
  const latest = useRef(snapshot);
  const restoreRef = useRef(restore);
  useEffect(() => { latest.current = snapshot; restoreRef.current = restore; });
  const pending = useRef<Promise<void> | null>(null);
  const [revision, setRevision] = useState(0);
  const snapshotJson = JSON.stringify(snapshot);
  useEffect(() => {
    const controller = new AbortController(), generation = ++state.current.generation;
    // Loading state resets when switching to a different external draft scope.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false); setStatus("Loading draft…");
    void (async () => {
      let recovery: SavedDraft<T> | undefined;
      try { recovery = JSON.parse(localStorage.getItem(`overwatch-draft:${scope}`) || "null"); } catch { /* Server copy remains available. */ }
      try {
        const response = await fetch(`/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as { items: SavedDraft<T>[]; error?: string }; if (!response.ok) throw Error(data.error);
        const server = data.items.find((item: SavedDraft<T>) => item.kind === "draft" && item.data.status === "draft");
        const knownRecovery = recovery && data.items.find((item: SavedDraft<T>) => item.id === recovery.id);
        const useRecovery = recovery && (!knownRecovery || knownRecovery.data.status === "draft") && (!server || ((recovery.savedAt || "") > server.updated_at && (recovery.id !== server.id || recovery.version >= server.version)));
        let item = useRecovery ? recovery : server;
        if (item && !useRecovery) {
          const loaded = await fetch("/api/admin/careers/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", id: item.id, scope }), signal: controller.signal });
          const result = await loaded.json(); if (!loaded.ok) throw Error(result.error); item = result.item;
        }
        if (controller.signal.aborted || generation !== state.current.generation) return;
        const activeId = server?.id || (knownRecovery?.data.status === "draft" ? knownRecovery.id : undefined) || (useRecovery && !knownRecovery ? recovery?.id : undefined) || item?.id || crypto.randomUUID();
        const activeVersion = server && activeId === server.id ? server.version : knownRecovery && activeId === knownRecovery.id ? knownRecovery.version : item?.version || 0;
        state.current = { id: activeId, version: activeVersion, scope, saved: useRecovery ? "" : JSON.stringify(item?.data || {}), savedAttachments: useRecovery ? "" : JSON.stringify(item?.data?.attachments || []), generation };
        restoreRef.current(item?.data || {});
        setStatus(item ? (useRecovery ? "Recovered local draft" : "Draft restored") : "New draft"); setReady(true);
      } catch {
        if (controller.signal.aborted) return;
        state.current = { id: recovery?.id || crypto.randomUUID(), version: recovery?.version || 0, scope, saved: "", savedAttachments: "", generation };
        restoreRef.current(recovery?.data || {});
        setStatus("Server unavailable · recovery copy kept in this browser"); setReady(true);
      }
    })();
    return () => controller.abort();
  }, [scope]);
  const flush = useCallback(async () => {
    if (pending.current) await pending.current.catch(() => {});
    const current = { ...state.current };
    if (current.scope !== scope || !current.id) throw Error("Draft is still loading");
    const data = latest.current, json = JSON.stringify(data);
    if (json === current.saved || (!current.version && !data.subject && !data.messageBody && !data.attachments?.length)) return state.current.id;
    let resolvedId = current.id;
    const task = (async () => {
      const sendSave = async (draftId: string, version: number, forceUploadAttachments = false) => {
        const response = await fetch("/api/admin/careers/mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draftId,
            scope,
            version,
            data: {
              ...data,
              attachments: !forceUploadAttachments && JSON.stringify(data.attachments || []) === current.savedAttachments ? undefined : data.attachments,
            },
          }),
        });
        const result = await response.json();
        return { response, result };
      };
      let { response, result } = await sendSave(current.id, current.version);
      if (response.status === 409) {
        if (result.currentStatus === "draft" && Number.isInteger(result.currentVersion)) {
          ({ response, result } = await sendSave(current.id, result.currentVersion, true));
        } else if (result.currentStatus && result.currentStatus !== "draft") {
          resolvedId = crypto.randomUUID();
          state.current.id = resolvedId;
          state.current.version = 0;
          ({ response, result } = await sendSave(resolvedId, 0, true));
        }
      }
      if (!response.ok) throw Error(result.error);
      if (state.current.id === resolvedId && state.current.generation === current.generation) {
        state.current.version = result.item.version; state.current.saved = json; state.current.savedAttachments = JSON.stringify(data.attachments || []);
        try { localStorage.setItem(`overwatch-draft:${scope}`, JSON.stringify({ ...result.item, data, savedAt: result.item.updated_at })); } catch { /* Server saved the complete draft. */ }
        setStatus(prev => prev === "Draft saved" ? prev : "Draft saved");
      }
    })();
    pending.current = task;
    try { await task; return resolvedId; } catch (error) { setStatus((error as Error).message); throw error; } finally { if (pending.current === task) pending.current = null; }
  }, [scope]);
  useEffect(() => {
    if (!ready || state.current.scope !== scope) return;
    if (!snapshot.subject && !snapshot.messageBody && !snapshot.attachments?.length) {
      try { localStorage.removeItem(`overwatch-draft:${scope}`); } catch {}
      return;
    }
    try { localStorage.setItem(`overwatch-draft:${scope}`, JSON.stringify({ id: state.current.id, version: state.current.version, data: snapshot, savedAt: new Date().toISOString() })); } catch { queueMicrotask(() => setStatus("Browser recovery storage full · saving to server…")); }
    const timer = setTimeout(() => { void flush().catch(() => {}); }, 2000);
    return () => clearTimeout(timer);
  }, [snapshotJson, ready, scope, flush, revision]);
  const open = async (id: string) => {
    await flush().catch(() => {});
    const response = await fetch("/api/admin/careers/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", id, scope }) });
    const data = await response.json(); if (!response.ok) throw Error(data.error);
    state.current.id = id; state.current.version = data.item.version; state.current.saved = JSON.stringify(data.item.data); state.current.savedAttachments = JSON.stringify(data.item.data.attachments || []);
    restoreRef.current(data.item.data); setStatus("Draft restored");
  };
  const newDraft = async () => {
    await flush().catch(() => {}); state.current.id = crypto.randomUUID(); state.current.version = 0; state.current.saved = ""; state.current.savedAttachments = "";
    restoreRef.current({}); setRevision(n => n + 1); setStatus("New draft");
  };
  const sent = (queued = false) => {
    try { localStorage.removeItem(`overwatch-draft:${scope}`); } catch { /* Optional browser cache. */ }
    state.current.id = crypto.randomUUID(); state.current.version = 0; state.current.saved = ""; state.current.savedAttachments = "";
    restoreRef.current({}); setStatus(queued ? "Queued · message preserved in Outbox" : "Sent · ready for a new draft");
  };
  return { ready, status, flush, open, newDraft, sent };
}
