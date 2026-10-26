require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { mkdtempSync } = require('node:fs');

const {
  DEFAULT_TRAINING_SLOT_CONFIG,
  getConfiguredTrainingSlots,
  setConfiguredTrainingSlots,
} = require('../src/lib/careers-config-store.ts');
const {
  candidateVariables,
  renderStudioMessage,
  TRAINING_TOKEN,
} = require('../src/lib/communication-content.ts');

test('default training slot configuration has Group A (8 slots) and Group B (8 slots)', async () => {
  assert.equal(DEFAULT_TRAINING_SLOT_CONFIG.groups.length, 2);
  const groupA = DEFAULT_TRAINING_SLOT_CONFIG.groups[0];
  const groupB = DEFAULT_TRAINING_SLOT_CONFIG.groups[1];

  assert.equal(groupA.id, 'group_a');
  assert.equal(groupA.capacity, 8);
  assert.match(groupA.name, /GRUPO A/i);
  assert.equal(groupA.timeRange, '08h00–12h00');
  assert.equal(groupA.evaluationTime, '09h00–11h00');

  assert.equal(groupB.id, 'group_b');
  assert.equal(groupB.capacity, 8);
  assert.match(groupB.name, /GRUPO B/i);
  assert.equal(groupB.timeRange, '13h00–17h00');
  assert.equal(groupB.evaluationTime, '13h00–15h00');
});

test('communications studio tokens include {{training_link}} and {{training_group}}', () => {
  const candidate = {
    id: 'test-cand-abc',
    name: 'Ana Maria',
    email: 'ana@example.com',
    role: 'cctv_operator',
    status: 'next_phase',
    nextPhaseToken: 'tok-12345',
    trainingGroup: 'Grupo A — Manhã',
  };

  const text = 'Olá {{candidate_name}}, clique aqui: {{training_link}} no {{training_group}}';
  const rendered = candidateVariables(text, candidate, 'Operadora de CCO', 'pt');
  assert.match(rendered, /Olá Ana Maria/);
  assert.match(rendered, /\/careers\/training-invite\/test-cand-abc/);
  assert.match(rendered, /Grupo A — Manhã/);
});

test('training slot configuration supports adding more groups dynamically (Group C, D, etc.)', async () => {
  const cwd = process.cwd();
  const temp = mkdtempSync(path.join(os.tmpdir(), 'overwatch-training-test-'));
  process.chdir(temp);
  try {
    const customConfig = {
      roleId: 'cctv',
      title: 'Formação Prática CCO',
      location: 'Av Paulo Samuel Khankhomba 1948',
      groups: [
        {
          id: 'group_a',
          name: 'GRUPO A — Manhã',
          schedule: '2, 3 e 4 de Novembro (08h00–12h00)',
          timeRange: '08h00–12h00',
          evaluationTime: '09h00–11h00',
          capacity: 8,
          enabled: true,
        },
        {
          id: 'group_b',
          name: 'GRUPO B — Tarde',
          schedule: '2, 3 e 4 de Novembro (13h00–17h00)',
          timeRange: '13h00–17h00',
          evaluationTime: '13h00–15h00',
          capacity: 8,
          enabled: true,
        },
        {
          id: 'group_c',
          name: 'GRUPO C — Noite / Especial',
          schedule: '2, 3 e 4 de Novembro (18h00–21h00)',
          timeRange: '18h00–21h00',
          evaluationTime: '18h00–20h00',
          capacity: 6,
          enabled: true,
        },
      ],
    };

    const saved = await setConfiguredTrainingSlots(customConfig);
    assert.equal(saved.groups.length, 3);
    assert.equal(saved.groups[2].id, 'group_c');
    assert.equal(saved.groups[2].capacity, 6);

    const retrieved = await getConfiguredTrainingSlots();
    assert.equal(retrieved.groups.length, 3);
    assert.equal(retrieved.groups[2].name, 'GRUPO C — Noite / Especial');
  } finally {
    process.chdir(cwd);
  }
});
