import { authenticated, sameOrigin } from '@/lib/careers-auth';
import { DEFAULT_TEST_SLOTS, type Application } from '@/lib/careers';
import {
  sendTestInvitation,
  sendCustomBookingConfirmation,
  sendDisqualificationEmail,
} from '@/lib/careers-email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const type: 'convocation' | 'confirmation' | 'disqualification' =
      body.type || 'confirmation';
    const toEmail: string =
      typeof body.toEmail === 'string' && body.toEmail.trim()
        ? body.toEmail.trim()
        : '';

    if (!toEmail || !toEmail.includes('@')) {
      return Response.json(
        { error: 'Por favor indique um endereço de e-mail de teste válido.' },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    const slot =
      typeof body.slot === 'string' && body.slot.trim()
        ? body.slot.trim()
        : 'Segunda-feira, 21 de Setembro — 10h00';

    const mockApplication: Application = {
      id: 'test-preview-id',
      name: body.testName || 'Candidata (Teste)',
      email: toEmail,
      whatsapp: '+258 84 287 0793',
      role: 'cctv-operator',
      locale: 'pt',
      grade12: 'yes',
      experience: 'yes',
      shifts: 'yes',
      sex: 'female',
      ai: 'yes',
      cvName: 'curriculo_teste.pdf',
      cvSize: 15000,
      cvType: 'application/pdf',
      lastProfession: 'Operadora CCO',
      createdAt: new Date().toISOString(),
      status: 'shortlisted',
      testSlot: slot,
    };

    let result: { success: boolean; provider?: string; messageId?: string; mocked?: boolean };

    if (type === 'convocation') {
      const slots: string[] =
        Array.isArray(body.slots) && body.slots.length > 0
          ? body.slots
          : [...DEFAULT_TEST_SLOTS];

      const defaultMsg = `{{greeting}} {{name}},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`;

      result = await sendTestInvitation({
        application: mockApplication,
        subject:
          body.subject ||
          'Convocatória: Teste de Selecção Presencial — Overwatch Moçambique',
        messageText: body.messageText || defaultMsg,
        slots,
        baseUrl: origin,
      });
    } else if (type === 'disqualification') {
      const reason =
        body.reason ||
        'Não cumprimento dos requisitos eliminatórios do concurso (ausência de carta de apresentação ou falta de comprovação de experiência em CCTV para candidatos masculinos).';

      result = await sendDisqualificationEmail({
        application: mockApplication,
        reason,
        baseUrl: origin,
      });
    } else {
      result = await sendCustomBookingConfirmation({
        application: mockApplication,
        slot,
        messageText: body.messageText,
        subject:
          body.subject ||
          'Confirmação de Presença: Teste de Selecção — Overwatch Moçambique',
        baseUrl: origin,
      });
    }

    return Response.json({
      success: result.success,
      type,
      to: toEmail,
      provider: result.provider || 'default',
      messageId: result.messageId,
      mocked: result.mocked,
    });
  } catch (err) {
    console.error('Test email route error:', err);
    return Response.json(
      { error: (err as Error).message || 'Falha ao enviar e-mail de teste.' },
      { status: 500 }
    );
  }
}
