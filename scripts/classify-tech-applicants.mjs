import fs from 'node:fs';

const apps = JSON.parse(fs.readFileSync('.careers-data/applications.json', 'utf8'));

const techApps = apps.filter(a => a.role === 'technical' || a.role === 'cctv_technical_manager');

export function classifyLocation(cand) {
  const locRaw = (cand.currentLocation || (cand.technicalData && cand.technicalData.currentLocation) || '').trim();
  const loc = locRaw.toLowerCase();
  const phone = (cand.whatsapp || '').replace(/[\s\-\(\)]/g, '');

  const mozKeywords = [
    'maputo', 'matola', 'marracuene', 'beira', 'sofala', 'nampula', 
    'inhambane', 'quelimane', 'tete', 'chimoio', 'manica', 'gaza', 
    'xai-xai', 'zambezia', 'niassa', 'lichinga', 'pemba', 'cabo delgado', 
    'mocambique', 'moçambique', 'mozambique', 'mavalane', 'zimpeto', 'machava'
  ];

  const foreignKeywords = [
    'pretoria', 'johannesburg', 'south africa', 'durban', 'cape town',
    'india', 'chennai', 'mumbai', 'cuddalore', 'paramakudi', 'kalicherla', 'andhra pradesh', 'bharuch',
    'accra', 'ghana',
    'abu dhabi', 'abudhabi', 'dubai', 'uae', 'sharjah', 'united arab emirates',
    'khobar', 'riyadh', 'saudi', 'jeddah', 'dammam',
    'lagos', 'nigeria', 'abuja',
    'angola', 'luanda',
    'rwanda', 'kigali',
    'lahore', 'pakistan', 'karachi', 'islamabad',
    'doha', 'qatar',
    'united kingdom', 'uk', 'london',
    'muscat', 'oman',
    'mateur', 'tunisia',
    'egypt', 'cairo'
  ];

  // 1. Foreign keyword matches
  for (const fk of foreignKeywords) {
    if (loc.includes(fk)) {
      return {
        isMozambique: false,
        countryGroup: 'outside_mozambique',
        reason: `Foreign keyword in location: "${fk}"`,
        location: locRaw,
        phone: cand.whatsapp
      };
    }
  }

  // 2. Mozambique keyword matches
  for (const mk of mozKeywords) {
    if (loc.includes(mk)) {
      return {
        isMozambique: true,
        countryGroup: 'mozambique',
        reason: `Mozambique city/region: "${mk}"`,
        location: locRaw,
        phone: cand.whatsapp
      };
    }
  }

  // 3. Mozambique phone pattern check (+258 or local 82-87 9-digit number)
  const isMozPhone = /^(\+?258)?8[2-7]\d{7}$/.test(phone);
  if (isMozPhone) {
    return {
      isMozambique: true,
      countryGroup: 'mozambique',
      reason: 'Mozambique mobile prefix (+258 / 8x)',
      location: locRaw,
      phone: cand.whatsapp
    };
  }

  // 4. Fallback if not matched
  return {
    isMozambique: false,
    countryGroup: 'outside_mozambique',
    reason: 'Unmatched location and foreign/unrecognized phone format',
    location: locRaw,
    phone: cand.whatsapp
  };
}

const classified = techApps.map(a => ({ candidate: a, ...classifyLocation(a) }));
const moz = classified.filter(c => c.isMozambique);
const outside = classified.filter(c => !c.isMozambique);

console.log(`TOTAL Gestor Técnico Applications: ${techApps.length}`);
console.log(`- In Mozambique: ${moz.length}`);
console.log(`- Outside Mozambique: ${outside.length}\n`);

console.log('='.repeat(70));
console.log(`APPLICANTS OUTSIDE MOZAMBIQUE (${outside.length})`);
console.log('='.repeat(70));
outside.forEach((c, idx) => {
  console.log(`${(idx + 1).toString().padStart(2, '0')}. ${c.candidate.name.padEnd(35)} | ${c.candidate.email.padEnd(34)} | Loc: ${c.location.padEnd(25)} | Phone: ${c.candidate.whatsapp.padEnd(16)} | Status: ${c.candidate.status}`);
});
