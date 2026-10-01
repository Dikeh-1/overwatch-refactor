const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 5 Domain Cards replacing Dubai, Maldives, Sicily, Bali, Japan
const cards = [
  {
    domain: "DOMAIN 01",
    tag: "SURVEYS & OPTICS",
    title: "Site Engineering",
    sub: "Surveys & Blind Spots",
    color: "#06b6d4", // cyan
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
    items: ["Technician Supervision", "Tooling & Spares Control", "Rigorous QA Standards"],
    icon: `
      <circle cx="153" cy="78" r="26" fill="#a855f7" fill-opacity="0.12" stroke="#a855f7" stroke-width="2"/>
      <path d="M153 65 L164 70 V80 C164 87 153 92 153 92 C153 92 142 87 142 80 V70 Z" fill="#a855f7" fill-opacity="0.8"/>
      <path d="M149 78 L152 81 L158 75" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    `
  }
];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateCardSvg(c) {
  return `<svg width="306" height="373" viewBox="0 0 306 373" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad_${c.domain.replace(' ', '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e172a" />
      <stop offset="50%" stop-color="#0a101f" />
      <stop offset="100%" stop-color="#04060d" />
    </linearGradient>
    <radialGradient id="topGlow_${c.domain.replace(' ', '_')}" cx="50%" cy="10%" r="70%">
      <stop offset="0%" stop-color="${c.color}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Card Background with High-Tech Border -->
  <rect x="2" y="2" width="302" height="369" rx="24" fill="url(#bgGrad_${c.domain.replace(' ', '_')})" stroke="${c.color}" stroke-opacity="0.4" stroke-width="1.8"/>
  <rect x="2" y="2" width="302" height="369" rx="24" fill="url(#topGlow_${c.domain.replace(' ', '_')})" />

  <!-- Subtle Tech Grid Lines -->
  <line x1="18" y1="48" x2="288" y2="48" stroke="#334155" stroke-opacity="0.4" stroke-width="1" />
  <line x1="18" y1="178" x2="288" y2="178" stroke="#334155" stroke-opacity="0.4" stroke-width="1" />
  
  <!-- Header Bar -->
  <rect x="18" y="16" width="90" height="22" rx="11" fill="${c.color}" fill-opacity="0.18" stroke="${c.color}" stroke-opacity="0.5" stroke-width="1"/>
  <text x="63" y="31.5" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" letter-spacing="1" text-anchor="middle">${escapeXml(c.domain)}</text>

  <text x="286" y="31" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="1.5" text-anchor="end">OVERWATCH</text>

  <!-- Central Illustrated Icon -->
  <g>${c.icon}</g>

  <!-- Card Title & Subtitle: EXTRA LARGE, HIGH-CONTRAST AND PROMINENT -->
  <text x="153" y="131" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="23" font-weight="900" letter-spacing="-0.4" text-anchor="middle">${escapeXml(c.title)}</text>
  <text x="153" y="153" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${escapeXml(c.sub)}</text>

  <!-- Feature Bullets: MAXIMUM VISIBILITY, BOLD AND CRISP -->
  <g transform="translate(20, 194)">
    <!-- Bullet 1 -->
    <circle cx="8" cy="14" r="4.5" fill="${c.color}"/>
    <text x="21" y="19" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14.5" font-weight="800">${escapeXml(c.items[0])}</text>

    <!-- Bullet 2 -->
    <circle cx="8" cy="49" r="4.5" fill="${c.color}"/>
    <text x="21" y="54" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14.5" font-weight="800">${escapeXml(c.items[1])}</text>

    <!-- Bullet 3 -->
    <circle cx="8" cy="84" r="4.5" fill="${c.color}"/>
    <text x="21" y="89" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14.5" font-weight="800">${escapeXml(c.items[2])}</text>
  </g>

  <!-- Footer Tag -->
  <rect x="18" y="322" width="270" height="30" rx="8" fill="#080d1a" stroke="#1e293b" stroke-width="1"/>
  <text x="30" y="341.5" fill="#64748b" font-family="monospace" font-size="8.5" font-weight="700">STATUS // ACTIVE</text>
  <text x="276" y="341.5" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="800" letter-spacing="0.5" text-anchor="end">${escapeXml(c.tag)}</text>
</svg>`;
}

async function run() {
  const downloadPath = 'C:/Users/ebube/Downloads/Free Interactive Card Stack.json';
  if (!fs.existsSync(downloadPath)) {
    console.error('Download file not found:', downloadPath);
    process.exit(1);
  }

  const lottieData = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
  console.log('Original Lottie loaded. Asset count:', lottieData.assets.length);

  // Asset IDs in Free Interactive Card Stack.json:
  // "2": Dubai (306x373)
  // "4": Maldives (306x373)
  // "6": Sicily (306x372)
  // "8": Bali (306x373)
  // "10": Japan (307x374)
  const targetAssetIds = ['2', '4', '6', '8', '10'];

  for (let i = 0; i < 5; i++) {
    const card = cards[i];
    const assetId = targetAssetIds[i];
    const svg = generateCardSvg(card);
    const assetObj = lottieData.assets.find(a => a.id === assetId);

    const w = assetObj && assetObj.w ? assetObj.w : 306;
    const h = assetObj && assetObj.h ? assetObj.h : 373;

    // Render at 2x resolution (612x746) for crystal clear sharpness
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(w * 2, h * 2)
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    console.log(`Generated Card ${i + 1} (${card.title}) -> Asset ${assetId}: ${pngBuffer.length} bytes (High-Res 2x)`);

    const base64Data = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    if (assetObj) {
      assetObj.p = base64Data;
      assetObj.u = '';
    }
  }

  // Ensure directories exist
  const publicAnimDir = path.join(__dirname, '../public/animations');
  if (!fs.existsSync(publicAnimDir)) {
    fs.mkdirSync(publicAnimDir, { recursive: true });
  }

  const srcDataDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(srcDataDir)) {
    fs.mkdirSync(srcDataDir, { recursive: true });
  }

  const outPublic = path.join(publicAnimDir, 'cctv-card-stack.json');
  fs.writeFileSync(outPublic, JSON.stringify(lottieData));
  const publicStat = fs.statSync(outPublic);
  console.log(`Saved to ${outPublic} (Size: ${Math.round(publicStat.size / 1024)} KB)`);

  const outSrc = path.join(srcDataDir, 'cctv-card-stack.json');
  fs.writeFileSync(outSrc, JSON.stringify(lottieData));
  console.log(`Saved to ${outSrc}`);

  console.log('Successfully optimized and modified Lottie card stack JSON with large, high-res text!');
}

run().catch(err => {
  console.error('Error generating card stack:', err);
  process.exit(1);
});
