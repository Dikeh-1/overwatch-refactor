const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// English Domain Cards
const cardsEn = [
  {
    domain: "DOMAIN 01",
    tag: "SURVEYS & OPTICS",
    title: "Site Engineering",
    sub: "Surveys & Blind Spots",
    color: "#06b6d4", // cyan
    statusText: "STATUS // ACTIVE",
    items: ["Technical Site Surveys", "Blind Spot Elimination", "BoQ & Scope Design"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="2"/>
      <path d="M141 74 L158 66 L158 90 L141 82 Z" fill="#06b6d4"/>
      <rect x="155" y="70" width="11" height="16" rx="2" fill="#06b6d4" fill-opacity="0.8"/>
      <circle cx="138" cy="78" r="3" fill="#38bdf8"/>
    `
  },
  {
    domain: "DOMAIN 02",
    tag: "PLATFORMS & NVR",
    title: "IP CCTV Systems",
    sub: "Hikvision, Dahua & NVRs",
    color: "#3b82f6", // blue
    statusText: "STATUS // ACTIVE",
    items: ["IP & Analogue Cameras", "NVR/DVR Configuration", "Storage & RAID Sizing"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-width="2"/>
      <rect x="137" y="66" width="32" height="10" rx="2.5" fill="#3b82f6" fill-opacity="0.9"/>
      <rect x="137" y="80" width="32" height="10" rx="2.5" fill="#3b82f6" fill-opacity="0.5"/>
      <circle cx="143" cy="71" r="1.5" fill="#93c5fd"/>
      <circle cx="148" cy="71" r="1.5" fill="#93c5fd"/>
      <circle cx="143" cy="85" r="1.5" fill="#93c5fd"/>
      <circle cx="148" cy="85" r="1.5" fill="#93c5fd"/>
    `
  },
  {
    domain: "DOMAIN 03",
    tag: "NETWORKS & FEEDS",
    title: "Remote Monitoring",
    sub: "IP Routing & Control Centre",
    color: "#10b981", // emerald
    statusText: "STATUS // ACTIVE",
    items: ["Switches, VLANs & Routers", "Structured Cabling Cat6", "Live CCO Stream Feeds"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-width="2"/>
      <circle cx="153" cy="69" r="5" fill="#10b981"/>
      <circle cx="141" cy="86" r="4.5" fill="#10b981" fill-opacity="0.7"/>
      <circle cx="165" cy="86" r="4.5" fill="#10b981" fill-opacity="0.7"/>
      <line x1="153" y1="74" x2="143" y2="82" stroke="#34d399" stroke-width="2"/>
      <line x1="153" y1="74" x2="163" y2="82" stroke="#34d399" stroke-width="2"/>
    `
  },
  {
    domain: "DOMAIN 04",
    tag: "DIAGNOSTICS & AI",
    title: "Maintenance & AI",
    sub: "Video Analytics & Upkeep",
    color: "#f59e0b", // amber
    statusText: "STATUS // ACTIVE",
    items: ["Preventive Maintenance", "Rapid Fault Diagnosis", "AI Perimeter Analytics"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="2"/>
      <path d="M144 78 L150 84 L163 71" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="153" cy="78" r="17" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
    `
  },
  {
    domain: "DOMAIN 05",
    tag: "FIELD MANAGEMENT",
    title: "Team & Quality",
    sub: "Supervision & Standards",
    color: "#a855f7", // purple
    statusText: "STATUS // ACTIVE",
    items: ["Technician Supervision", "Tooling & Spares Control", "Rigorous QA Standards"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#a855f7" fill-opacity="0.12" stroke="#a855f7" stroke-width="2"/>
      <path d="M153 65 L164 70 V80 C164 87 153 92 153 92 C153 92 142 87 142 80 V70 Z" fill="#a855f7" fill-opacity="0.8"/>
      <path d="M149 78 L152 81 L158 75" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    `
  }
];

// Portuguese Domain Cards (Moçambique PT)
const cardsPt = [
  {
    domain: "DOMÍNIO 01",
    tag: "VISTORIAS & ÓPTICA",
    title: "Engenharia de Campo",
    sub: "Levantamentos & Ângulos Mortos",
    color: "#06b6d4",
    statusText: "ESTADO // ATIVO",
    items: ["Vistorias Técnicas no Terreno", "Eliminação de Ângulos Mortos", "Cadernos de Encargos & BoQ"],
    icon: cardsEn[0].icon
  },
  {
    domain: "DOMÍNIO 02",
    tag: "PLATAFORMAS & NVR",
    title: "Sistemas CCTV IP",
    sub: "Hikvision, Dahua & NVRs",
    color: "#3b82f6",
    statusText: "ESTADO // ATIVO",
    items: ["Câmaras IP e Analógicas", "Configuração de NVRs/DVRs", "Armazenamento & RAID"],
    icon: cardsEn[1].icon
  },
  {
    domain: "DOMÍNIO 03",
    tag: "REDES & TRANSMISSÃO",
    title: "Monitorização Remota",
    sub: "Redes IP & Central 24/7",
    color: "#10b981",
    statusText: "ESTADO // ATIVO",
    items: ["Switches, VLANs & Routers", "Cablagem Estruturada Cat6", "Fluxos para Central CCO"],
    icon: cardsEn[2].icon
  },
  {
    domain: "DOMÍNIO 04",
    tag: "DIAGNÓSTICO & IA",
    title: "Manutenção & IA",
    sub: "Analítica de Vídeo & Suporte",
    color: "#f59e0b",
    statusText: "ESTADO // ATIVO",
    items: ["Manutenção Preventiva", "Diagnóstico Rápido de Avarias", "Analítica Perimetral com IA"],
    icon: cardsEn[3].icon
  },
  {
    domain: "DOMÍNIO 05",
    tag: "GESTÃO DE CAMPO",
    title: "Equipa & Qualidade",
    sub: "Supervisão & Padrões",
    color: "#a855f7",
    statusText: "ESTADO // ATIVO",
    items: ["Supervisão de Técnicos", "Gestão de Peças & Ferramental", "Padrões Rigorosos de Qualidade"],
    icon: cardsEn[4].icon
  }
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateCardSvg(c) {
  const gradId = `bgGrad_${c.domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const glowId = `topGlow_${c.domain.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `<svg width="306" height="373" viewBox="0 0 306 373" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e172a" />
      <stop offset="50%" stop-color="#0a101f" />
      <stop offset="100%" stop-color="#04060d" />
    </linearGradient>
    <radialGradient id="${glowId}" cx="50%" cy="10%" r="70%">
      <stop offset="0%" stop-color="${c.color}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Card Background with High-Tech Border -->
  <rect x="2" y="2" width="302" height="369" rx="24" fill="url(#${gradId})" stroke="${c.color}" stroke-opacity="0.45" stroke-width="2"/>
  <rect x="2" y="2" width="302" height="369" rx="24" fill="url(#${glowId})" />

  <!-- Subtle Tech Grid Lines -->
  <line x1="16" y1="46" x2="290" y2="46" stroke="#334155" stroke-opacity="0.45" stroke-width="1" />
  <line x1="16" y1="168" x2="290" y2="168" stroke="#334155" stroke-opacity="0.45" stroke-width="1" />
  
  <!-- Header Bar -->
  <rect x="16" y="15" width="94" height="23" rx="11.5" fill="${c.color}" fill-opacity="0.22" stroke="${c.color}" stroke-opacity="0.6" stroke-width="1"/>
  <text x="63" y="30.5" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" letter-spacing="1" text-anchor="middle">${escapeXml(c.domain)}</text>

  <text x="288" y="31" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="800" letter-spacing="1.5" text-anchor="end">OVERWATCH</text>

  <!-- Central Illustrated Icon -->
  <g>${c.icon}</g>

  <!-- Card Title & Subtitle: EXTRA LARGE, HIGH-CONTRAST AND PROMINENT -->
  <text x="153" y="127" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="23.5" font-weight="900" letter-spacing="-0.5" text-anchor="middle">${escapeXml(c.title)}</text>
  <text x="153" y="148" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${escapeXml(c.sub)}</text>

  <!-- Feature Bullets: MAXIMUM VISIBILITY, BOLD AND CRISP -->
  <g transform="translate(16, 182)">
    <!-- Bullet 1 -->
    <circle cx="8" cy="14" r="7" fill="${c.color}" fill-opacity="0.2"/>
    <circle cx="8" cy="14" r="4.5" fill="${c.color}"/>
    <text x="22" y="19" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800">${escapeXml(c.items[0])}</text>

    <!-- Bullet 2 -->
    <circle cx="8" cy="50" r="7" fill="${c.color}" fill-opacity="0.2"/>
    <circle cx="8" cy="50" r="4.5" fill="${c.color}"/>
    <text x="22" y="55" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800">${escapeXml(c.items[1])}</text>

    <!-- Bullet 3 -->
    <circle cx="8" cy="86" r="7" fill="${c.color}" fill-opacity="0.2"/>
    <circle cx="8" cy="86" r="4.5" fill="${c.color}"/>
    <text x="22" y="91" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800">${escapeXml(c.items[2])}</text>
  </g>

  <!-- Footer Tag -->
  <rect x="16" y="322" width="274" height="32" rx="8" fill="#080d1a" stroke="#1e293b" stroke-width="1"/>
  <text x="28" y="342" fill="#64748b" font-family="monospace" font-size="9" font-weight="700">${escapeXml(c.statusText || 'STATUS // ACTIVE')}</text>
  <text x="278" y="342" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="800" letter-spacing="0.5" text-anchor="end">${escapeXml(c.tag)}</text>
</svg>`;
}

async function buildLottieDeck(cards, outputFile, baseLottieData) {
  const cloned = JSON.parse(JSON.stringify(baseLottieData));

  // 1. Strip the 15 Ellipse layers from the downloaded template to eliminate the clipped blurry rectangle box
  cloned.layers = cloned.layers.filter(l => !l.nm || !l.nm.startsWith('Ellipse'));
  
  // 2. Scale up all card layers by 20% around their anchor point so the cards fill the empty screen spaces generously
  cloned.layers.forEach((l, idx) => {
    l.ind = idx + 1;
    if (l.ks && l.ks.s) {
      l.ks.s = { a: 0, k: [120, 120] };
    }
  });

  const targetAssetIds = ['2', '4', '6', '8', '10'];

  for (let i = 0; i < 5; i++) {
    const card = cards[i];
    const assetId = targetAssetIds[i];
    const svg = generateCardSvg(card);
    const assetObj = cloned.assets.find(a => a.id === assetId);

    const w = assetObj && assetObj.w ? assetObj.w : 306;
    const h = assetObj && assetObj.h ? assetObj.h : 373;

    // Render at 2.5x resolution for crystal-clear readability
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(Math.round(w * 2.5), Math.round(h * 2.5))
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    const base64Data = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    if (assetObj) {
      assetObj.p = base64Data;
      assetObj.u = '';
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(cloned));
  const stat = fs.statSync(outputFile);
  console.log(`Saved ${path.basename(outputFile)} (${Math.round(stat.size / 1024)} KB)`);
}

async function run() {
  const downloadPath = 'C:/Users/ebube/Downloads/Free Interactive Card Stack.json';
  if (!fs.existsSync(downloadPath)) {
    console.error('Download file not found:', downloadPath);
    process.exit(1);
  }

  const rawLottie = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));

  const publicAnimDir = path.join(__dirname, '../public/animations');
  if (!fs.existsSync(publicAnimDir)) {
    fs.mkdirSync(publicAnimDir, { recursive: true });
  }

  const srcDataDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(srcDataDir)) {
    fs.mkdirSync(srcDataDir, { recursive: true });
  }

  // 1. Build English Deck
  console.log('Building English Card Stack…');
  const enPublic = path.join(publicAnimDir, 'cctv-card-stack-en.json');
  await buildLottieDeck(cardsEn, enPublic, rawLottie);

  // Also copy to cctv-card-stack.json for fallback compatibility
  const fallbackPublic = path.join(publicAnimDir, 'cctv-card-stack.json');
  fs.copyFileSync(enPublic, fallbackPublic);

  const fallbackSrc = path.join(srcDataDir, 'cctv-card-stack.json');
  fs.copyFileSync(enPublic, fallbackSrc);

  // 2. Build Portuguese Deck
  console.log('Building Portuguese Card Stack…');
  const ptPublic = path.join(publicAnimDir, 'cctv-card-stack-pt.json');
  await buildLottieDeck(cardsPt, ptPublic, rawLottie);

  console.log('Successfully generated both English and Portuguese card stacks!');
}

run().catch(err => {
  console.error('Error generating card stacks:', err);
  process.exit(1);
});
