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

  // Live Studio Preview HTML rendering check: ensure button HTML is not escaped to &lt;a
  const studioHtml = renderStudioMessage(text, candidate, 'Operadora de CCO', 'pt');
  assert.ok(studioHtml.includes('<a data-action-button="true"'), 'Should render live unescaped HTML action button');
  assert.ok(!studioHtml.includes('&lt;a data-action-button='), 'Must not escape button into raw HTML string &lt;a');
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

test('training slot configuration isolates pipelines per recruitment cycle (cohort)', async () => {
  const cwd = process.cwd();
  const temp = mkdtempSync(path.join(os.tmpdir(), 'overwatch-cohort-training-test-'));
  process.chdir(temp);
  try {
    const cohortAConfig = {
      roleId: 'cctv',
      title: 'Formação CCO Ciclo 1',
      location: 'Sala 1',
      groups: [
        {
          id: 'group_a',
          name: 'GRUPO A — Ciclo 1',
          schedule: '2 a 5 Nov',
          timeRange: '08h00–12h00',
          evaluationTime: '09h00–11h00',
          capacity: 10,
          enabled: true,
        },
      ],
    };

    const cohortBConfig = {
      roleId: 'manager',
      title: 'Formação Gestor Técnico Ciclo 2',
      location: 'Sala 2',
      groups: [
        {
          id: 'group_special',
          name: 'GRUPO GESTORES',
          schedule: '10 a 12 Nov',
          timeRange: '14h00–18h00',
          evaluationTime: '15h00–17h00',
          capacity: 5,
          enabled: true,
        },
      ],
    };

    // Store Cohort A and Cohort B in configured cohorts
    const { setConfiguredCohorts } = require('../src/lib/careers-config-store.ts');
    await setConfiguredCohorts([
      {
        id: 'cohort-1',
        roleId: 'cctv',
        name: 'Ciclo 1',
        openedAt: '2026-10-01',
        status: 'active',
        stages: [],
        screeningRules: [],
        trainingSlots: cohortAConfig,
      },
      {
        id: 'cohort-2',
        roleId: 'manager',
        name: 'Ciclo 2',
        openedAt: '2026-10-15',
        status: 'active',
        stages: [],
        screeningRules: [],
        trainingSlots: cohortBConfig,
      },
    ]);

    const retrievedA = await getConfiguredTrainingSlots('cohort-1');
    const retrievedB = await getConfiguredTrainingSlots('cohort-2');

    assert.equal(retrievedA.title, 'Formação CCO Ciclo 1');
    assert.equal(retrievedA.groups[0].name, 'GRUPO A — Ciclo 1');
    assert.equal(retrievedA.groups[0].capacity, 10);

    assert.equal(retrievedB.title, 'Formação Gestor Técnico Ciclo 2');
    assert.equal(retrievedB.groups[0].name, 'GRUPO GESTORES');
    assert.equal(retrievedB.groups[0].capacity, 5);

    // Default configuration remains untouched
    const retrievedDefault = await getConfiguredTrainingSlots(null);
    assert.ok(retrievedDefault.groups.length >= 2);
  } finally {
    process.chdir(cwd);
  }
});

test('communications studio next-phase audience isolates confirmed (SIM) from awaiting response', () => {
  const { isConfirmed, isAwaiting, isNextPhase, hasTested } = require('../src/lib/careers-workflow.ts');

  const confirmedApplicant = {
    id: 'cand-1',
    name: 'Cand 1',
    role: 'cctv_operator',
    status: 'interest_confirmed',
    testScore: 85,
  };
  const awaitingApplicant = {
    id: 'cand-2',
    name: 'Cand 2',
    role: 'cctv_operator',
    status: 'next_phase_invited',
    testScore: 80,
  };
  const testedNotAdvancing = {
    id: 'cand-3',
    name: 'Cand 3',
    role: 'cctv_operator',
    status: 'not_advancing',
    testScore: 65,
  };
  const unbookedApplicant = {
    id: 'cand-4',
    name: 'Cand 4',
    role: 'cctv_operator',
    status: 'not_advancing', // cycle closed / unbooked but terminal
    testSlot: null,
  };

  const pool = [confirmedApplicant, awaitingApplicant, testedNotAdvancing, unbookedApplicant];

  // Confirmed audience ONLY returns interest_confirmed (the 17 who accepted SIM)
  const confirmedPool = pool.filter(isConfirmed);
  assert.equal(confirmedPool.length, 1);
  assert.equal(confirmedPool[0].id, 'cand-1');

  // Awaiting audience ONLY returns next_phase_invited (the 2 still waiting)
  const awaitingPool = pool.filter(isAwaiting);
  assert.equal(awaitingPool.length, 1);
  assert.equal(awaitingPool[0].id, 'cand-2');

  // All next phase returns both (19 total)
  const nextPhaseAll = pool.filter(isNextPhase);
  assert.equal(nextPhaseAll.length, 2);

  // Tested audience includes all candidates who took test, even if not advancing
  const testedPool = pool.filter(hasTested);
  assert.equal(testedPool.length, 3);
  assert.ok(testedPool.some((c) => c.id === 'cand-3'));
});

test('training group booking auto-invalidates 1 day prior to start date at 11:59:59 PM Maputo time', () => {
  const { getTrainingGroupStartDate, isTrainingGroupBookingExpired } = require('../src/lib/careers.ts');

  const groupA = {
    id: 'group_a',
    name: 'Grupo A',
    schedule: 'Segunda a Quarta (2, 3 e 4 de Novembro): 08h00–12h00',
    timeRange: '08h00–12h00',
  };

  const parsed = getTrainingGroupStartDate(groupA);
  assert.ok(parsed, 'Should parse start date from schedule');
  assert.equal(parsed.day, 2);
  assert.equal(parsed.month, 11);
  assert.equal(parsed.year, 2026);

  // Reference date: Oct 26, 2026 -> 7 days prior -> Not expired
  const oct26 = new Date('2026-10-26T10:00:00Z');
  assert.equal(isTrainingGroupBookingExpired(groupA, oct26), false);

  // Reference date: Nov 1, 2026 23:59:00 Maputo (UTC+2) -> 1 day prior -> Not expired yet
  const nov1Evening = new Date('2026-11-01T21:50:00Z'); // 23:50 Maputo
  assert.equal(isTrainingGroupBookingExpired(groupA, nov1Evening), false);

  // Reference date: Nov 2, 2026 00:01:00 Maputo (UTC+2) -> Day of training -> Expired!
  const nov2Start = new Date('2026-11-01T22:05:00Z'); // 00:05 Nov 2 Maputo
  assert.equal(isTrainingGroupBookingExpired(groupA, nov2Start), true);

  // Explicit startDate override
  const groupCustom = {
    id: 'group_custom',
    startDate: '2026-11-15',
    schedule: 'Custom schedule',
  };
  assert.equal(isTrainingGroupBookingExpired(groupCustom, oct26), false);
  const nov15 = new Date('2026-11-15T08:00:00Z');
  assert.equal(isTrainingGroupBookingExpired(groupCustom, nov15), true);
});


