require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const XLSX = require('xlsx');

const {
  sanitizeScore,
  parseSpreadsheetBuffer,
  matchScoresToCandidates,
} = require('../src/lib/test-score-parser.ts');

test('sanitizeScore handles percentages, fractions, decimals and clamping', () => {
  assert.equal(sanitizeScore(85), 85);
  assert.equal(sanitizeScore('85%'), 85);
  assert.equal(sanitizeScore('17/20'), 85);
  assert.equal(sanitizeScore('8.5/10'), 85);
  assert.equal(sanitizeScore(0.92), 92);
  assert.equal(sanitizeScore('92.4'), 92);
  assert.equal(sanitizeScore('105%'), 100);
  assert.equal(sanitizeScore('-10'), 0);
  assert.equal(sanitizeScore('invalid text'), null);
  assert.equal(sanitizeScore(null), null);
});

test('parseSpreadsheetBuffer parses CSV and Excel buffers with Portuguese and English headers', () => {
  // Test CSV buffer
  const csvText = 'Nome Completo,E-mail,Nota do Teste\nGeraldo Machamacha,geraldo@example.com,88%\nChelton Zaqueu,chelton@example.com,92';
  const csvBuffer = Buffer.from(csvText, 'utf8');
  const csvRecords = parseSpreadsheetBuffer(csvBuffer);

  assert.equal(csvRecords.length, 2);
  assert.equal(csvRecords[0].name, 'Geraldo Machamacha');
  assert.equal(csvRecords[0].email, 'geraldo@example.com');
  assert.equal(csvRecords[0].score, 88);

  assert.equal(csvRecords[1].name, 'Chelton Zaqueu');
  assert.equal(csvRecords[1].email, 'chelton@example.com');
  assert.equal(csvRecords[1].score, 92);

  // Test XLSX buffer
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([
    { Candidate: 'Albino Sozinho', WhatsApp: '+258 84 987 6543', Score: '18/20' },
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxRecords = parseSpreadsheetBuffer(xlsxBuffer);

  assert.equal(xlsxRecords.length, 1);
  assert.equal(xlsxRecords[0].name, 'Albino Sozinho');
  assert.equal(xlsxRecords[0].phone, '849876543');
  assert.equal(xlsxRecords[0].score, 90);
});

test('matchScoresToCandidates matches by email, phone, and full or tokenized name', () => {
  const candidates = [
    {
      id: 'cand-1',
      name: 'Geraldo Jose Jairosse Machamacha',
      email: 'geraldomachamacha@gmail.com',
      whatsapp: '+258841112233',
      role: 'cctv_technical_manager',
      status: 'test_booked',
    },
    {
      id: 'cand-2',
      name: 'Chelton Zaqueu',
      email: 'chelton.zaqueu@outlook.com',
      whatsapp: '+258823334455',
      role: 'cctv_technical_manager',
      status: 'test_booked',
    },
    {
      id: 'cand-3',
      name: 'Albino David Sozinho Albino',
      email: 'albisozinho@gmail.com',
      whatsapp: '+258849998877',
      role: 'cctv_technical_manager',
      status: 'test_booked',
    },
  ];

  const records = [
    // 1. Email match
    { email: 'geraldomachamacha@gmail.com', score: 88, rawScore: 88 },
    // 2. Tokenized name match ("Chelton Zaqueu")
    { name: 'Chelton Zaqueu', score: 95, rawScore: 95 },
    // 3. Phone match
    { phone: '849998877', score: 82, rawScore: 82 },
    // 4. Unmatched candidate
    { name: 'Unknown Candidate Who Did Not Apply', email: 'unknown@example.org', score: 70, rawScore: 70 },
  ];

  const { matched, unmatched } = matchScoresToCandidates(records, candidates);

  assert.equal(matched.length, 3);
  assert.equal(unmatched.length, 1);

  assert.equal(matched[0].candidate.id, 'cand-1');
  assert.equal(matched[0].score, 88);
  assert.equal(matched[0].matchType, 'email');

  assert.equal(matched[1].candidate.id, 'cand-2');
  assert.equal(matched[1].score, 95);

  assert.equal(matched[2].candidate.id, 'cand-3');
  assert.equal(matched[2].score, 82);
  assert.equal(matched[2].matchType, 'phone');

  assert.equal(unmatched[0].record.name, 'Unknown Candidate Who Did Not Apply');
});

test('upload-test-scores route performs preview and commits scores and next phase transition', async () => {
  const original = Module._load;
  const mockCandidates = new Map([
    [
      'app-1',
      {
        id: 'app-1',
        name: 'Geraldo Jose Machamacha',
        email: 'geraldo@example.com',
        whatsapp: '+258841234567',
        role: 'cctv_technical_manager',
        status: 'test_booked',
      },
    ],
  ]);

  Module._load = function (name, ...args) {
    if (name === '@/lib/admin-activity') return { auditRequest: async (_, h) => h() };
    if (name === '@/lib/careers-auth') {
      return {
        authenticated: async () => true,
        sameOrigin: (r) => r.headers.get('origin') === 'http://localhost:3100',
      };
    }
    if (name === '@/lib/careers-store') {
      return {
        getApplications: async () => Array.from(mockCandidates.values()),
        updateApplication: async (id, patch) => {
          const current = mockCandidates.get(id);
          const updated = { ...current, ...patch };
          mockCandidates.set(id, updated);
          return updated;
        },
      };
    }
    if (name === '@/lib/careers-workflow') {
      return require('../src/lib/careers-workflow.ts');
    }
    if (name === '@/lib/test-score-parser') {
      return require('../src/lib/test-score-parser.ts');
    }
    if (name === '@/lib/careers') {
      return require('../src/lib/careers.ts');
    }
    return original.call(this, name, ...args);
  };

  const route = require('../src/app/api/admin/careers/upload-test-scores/route.ts');
  Module._load = original;

  // 1. Dry run preview
  const csvContent = 'Email,Score\ngeraldo@example.com,88';
  const csvFile = new File([csvContent], 'scores.csv', { type: 'text/csv' });

  const previewFormData = new FormData();
  previewFormData.append('file', csvFile);
  previewFormData.append('commit', 'false');

  const previewReq = new Request('http://localhost:3100/api/admin/careers/upload-test-scores', {
    method: 'POST',
    headers: { origin: 'http://localhost:3100' },
    body: previewFormData,
  });

  const previewRes = await route.POST(previewReq);
  assert.equal(previewRes.status, 200);
  const previewData = await previewRes.json();
  assert.equal(previewData.preview, true);
  assert.equal(previewData.matchedCount, 1);
  assert.equal(previewData.matched[0].newScore, 88);

  // Candidate in DB should NOT be modified in dry-run
  assert.equal(mockCandidates.get('app-1').testScore, undefined);

  // 2. Commit mode with Next Phase advancement
  const commitFormData = new FormData();
  commitFormData.append('file', csvFile);
  commitFormData.append('commit', 'true');
  commitFormData.append('advanceIds', JSON.stringify(['app-1']));

  const commitReq = new Request('http://localhost:3100/api/admin/careers/upload-test-scores', {
    method: 'POST',
    headers: { origin: 'http://localhost:3100' },
    body: commitFormData,
  });

  const commitRes = await route.POST(commitReq);
  assert.equal(commitRes.status, 200);
  const commitData = await commitRes.json();
  assert.equal(commitData.success, true);
  assert.equal(commitData.updatedCount, 1);

  // Candidate in DB must now have testScore: 88 and status: next_phase_selected
  const updatedApp = mockCandidates.get('app-1');
  assert.equal(updatedApp.testScore, 88);
  assert.equal(updatedApp.attendanceStatus, 'present');
  assert.equal(updatedApp.status, 'next_phase_selected');
  assert.equal(updatedApp.nextPhaseStatus, 'selected');
  assert.ok(updatedApp.nextPhaseToken);
});
