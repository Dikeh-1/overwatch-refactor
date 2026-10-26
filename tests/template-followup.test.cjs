require('../scripts/register-typescript.cjs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const original = Module._load;

let savedTemplates = [];
let configQueue = Promise.resolve();

Module._load = function(name, ...args) {
  if (name === '@/lib/careers-db' || name === './careers-db') return { getCareersPool: () => null };
  if (name === '@/lib/careers-auth' || name === './careers-auth') {
    return {
      authenticated: async () => true,
      sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin,
    };
  }
  if (name === '@/lib/admin-activity' || name === './admin-activity') {
    return {
      auditRequest: async (req, fn) => fn(),
      createActivityEvent: () => ({ id: 'evt-1', timestamp: new Date().toISOString() }),
      auditChange: async (action, details, fn) => fn(),
      activityRest: async () => ({ json: async () => [] }),
      hasActivityRest: () => false,
      prepareActivityStore: async () => {},
    };
  }
  if (name === '@/lib/careers-store' || name === './careers-store') {
    return {
      exclusive: fn => {
        const result = configQueue.then(fn);
        configQueue = result.catch(() => {});
        return result;
      },
    };
  }
  if (name === '@/lib/careers-config-store' || name === './careers-config-store') {
    return {
      getSystemConfig: async () => savedTemplates,
      setSystemConfig: async (_, value) => {
        savedTemplates = value;
        return value;
      },
    };
  }
  return original.call(this, name, ...args);
};

const templatesRoute = require(path.join(root, 'src/app/api/admin/careers/templates/route.ts'));

after(() => {
  Module._load = original;
});

const makeRequest = (body, method = 'PATCH') =>
  new Request('http://localhost:3000/api/admin/careers/templates', {
    method,
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

test('templates API persists and restores followUpEnabled, followUpSubject, followUpBody, and attachments', async () => {
  const templatePayload = {
    action: 'save',
    template: {
      id: 'tpl_training_convocation_v1',
      title: 'Training Convocation with Follow-up',
      subject: 'Convocatória para Formação e Avaliação Presencial',
      body: '<p>Estimado(a) {{candidate_name}}, foi seleccionado(a)...</p>',
      createdAt: new Date().toISOString(),
      followUpEnabled: true,
      followUpSubject: 'Confirmação de Inscrição: Formação e Avaliação Presencial',
      followUpBody: '<p>Confirmamos a sua inscrição com sucesso no grupo escolhido.</p>',
      attachments: [{ name: 'Regulamento.pdf', size: 1024, type: 'application/pdf', content: 'base64content' }],
    },
  };

  const saveRes = await templatesRoute.PATCH(makeRequest(templatePayload));
  assert.equal(saveRes.status, 200);
  const saveJson = await saveRes.json();
  assert.equal(saveJson.success, true);

  const saved = saveJson.templates.find(t => t.id === 'tpl_training_convocation_v1');
  assert.ok(saved, 'Template should be present in saved list');
  assert.equal(saved.followUpEnabled, true);
  assert.equal(saved.followUpSubject, 'Confirmação de Inscrição: Formação e Avaliação Presencial');
  assert.equal(saved.followUpBody, '<p>Confirmamos a sua inscrição com sucesso no grupo escolhido.</p>');
  assert.equal(saved.attachments.length, 1);
  assert.equal(saved.attachments[0].name, 'Regulamento.pdf');

  // Verify GET also returns the follow-up fields
  const getRes = await templatesRoute.GET();
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  const fetched = getJson.templates.find(t => t.id === 'tpl_training_convocation_v1');
  assert.ok(fetched);
  assert.equal(fetched.followUpEnabled, true);
  assert.equal(fetched.followUpSubject, 'Confirmação de Inscrição: Formação e Avaliação Presencial');
});
