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
      <circle cx="153" cy="115" r="38" fill="#06b6d4" fill-opacity="0.1" stroke="#06b6d4" stroke-width="1.5"/>
      <path d="M135 110 L160 98 L160 132 L135 120 Z" fill="#06b6d4"/>
      <rect x="156" y="103" width="16" height="24" rx="3" fill="#06b6d4" fill-opacity="0.6"/>
      <circle cx="132" cy="115" r="4" fill="#38bdf8"/>
      <line x1="126" y1="115" x2="114" y2="105" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2"/>
      <line x1="126" y1="115" x2="114" y2="125" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2"/>
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
      <circle cx="153" cy="115" r="38" fill="#3b82f6" fill-opacity="0.1" stroke="#3b82f6" stroke-width="1.5"/>
      <rect x="131" y="98" width="44" height="15" rx="3" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="131" y="117" width="44" height="15" rx="3" fill="#3b82f6" fill-opacity="0.4"/>
      <circle cx="139" cy="105.5" r="2" fill="#60a5fa"/>
      <circle cx="145" cy="105.5" r="2" fill="#60a5fa"/>
      <circle cx="139" cy="124.5" r="2" fill="#60a5fa"/>
      <circle cx="145" cy="124.5" r="2" fill="#60a5fa"/>
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
      <circle cx="153" cy="115" r="38" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.5"/>
      <circle cx="153" cy="102" r="7" fill="#10b981"/>
      <circle cx="137" cy="126" r="6" fill="#10b981" fill-opacity="0.6"/>
      <circle cx="169" cy="126" r="6" fill="#10b981" fill-opacity="0.6"/>
      <line x1="153" y1="109" x2="140" y2="121" stroke="#34d399" stroke-width="1.5"/>
      <line x1="153" y1="109" x2="166" y2="121" stroke="#34d399" stroke-width="1.5"/>
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
      <circle cx="153" cy="115" r="38" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1.5"/>
      <path d="M141 115 L149 123 L165 107" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="153" cy="115" r="24" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
    `
  },
  {
    domain: "DOMAIN 05",
    tag: "FIELD MANAGEMENT",
    title: "Team & Quality",
    sub: "Supervision & Standards",
    color: "#8b5cf6", // purple
    items: ["Technician Supervision", "Tooling & Spares Control", "Rigorous QA Standards"],
    icon: `
      <circle cx="153" cy="115" r="38" fill="#8b5cf6" fill-opacity="0.1" stroke="#8b5cf6" stroke-width="1.5"/>
      <path d="M153 96 L168 103 V116 C168 126 153 133 153 133 C153 133 138 126 138 116 V103 Z" fill="#8b5cf6" fill-opacity="0.8"/>
      <path d="M148 114 L152 118 L159 110" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    `
  }
];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateCardSvg(c) {
  return `<svg width="306" height="373" viewBox="0 0 306 373" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e172a" />
      <stop offset="50%" stop-color="#0a101f" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
    <radialGradient id="topGlow" cx="50%" cy="15%" r="65%">
      <stop offset="0%" stop-color="${c.color}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Card Background -->
  <rect x="2" y="2" width="302" height="369" rx="26" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="2" y="2" width="302" height="369" rx="26" fill="url(#topGlow)" />

  <!-- Subtle Tech Grid Lines -->
  <line x1="20" y1="62" x2="286" y2="62" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />
  <line x1="20" y1="228" x2="286" y2="228" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />
  
  <!-- Header Bar -->
  <rect x="20" y="22" width="82" height="20" rx="10" fill="${c.color}" fill-opacity="0.15" stroke="${c.color}" stroke-opacity="0.4" stroke-width="1"/>
  <text x="61" y="36" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="1" text-anchor="middle">${escapeXml(c.domain)}</text>

  <text x="286" y="36" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" letter-spacing="1.5" text-anchor="end">OVERWATCH</text>

  <!-- Central Illustrated Icon -->
  <g>${c.icon}</g>

  <!-- Card Title & Subtitle -->
  <text x="153" y="180" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" letter-spacing="-0.3" text-anchor="middle">${escapeXml(c.title)}</text>
  <text x="153" y="200" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="500" text-anchor="middle">${escapeXml(c.sub)}</text>

  <!-- Feature Bullets -->
  <g transform="translate(24, 244)">
    <circle cx="4" cy="7" r="2.5" fill="${c.color}"/>
    <text x="14" y="10" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="500">${escapeXml(c.items[0])}</text>

    <circle cx="4" cy="28" r="2.5" fill="${c.color}"/>
    <text x="14" y="31" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="500">${escapeXml(c.items[1])}</text>

    <circle cx="4" cy="49" r="2.5" fill="${c.color}"/>
    <text x="14" y="52" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="500">${escapeXml(c.items[2])}</text>
  </g>

  <!-- Footer Tag -->
  <rect x="20" y="325" width="266" height="28" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
  <text x="32" y="342.5" fill="#64748b" font-family="monospace" font-size="8.5" font-weight="700">STATUS // ACTIVE</text>
  <text x="274" y="342.5" fill="${c.color}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" letter-spacing="0.5" text-anchor="end">${escapeXml(c.tag)}</text>
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

    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(w, h)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    console.log(`Generated Card ${i + 1} (${card.title}) -> Asset ${assetId}: ${pngBuffer.length} bytes`);

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

  console.log('Successfully optimized and modified Lottie card stack JSON!');
}

run().catch(err => {
  console.error('Error generating card stack:', err);
  process.exit(1);
});
