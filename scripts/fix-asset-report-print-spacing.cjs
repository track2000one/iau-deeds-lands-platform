const fs = require('fs');

const path = 'src/app/pages/AssetReportsPage.tsx';
let src = fs.readFileSync(path, 'utf8');

// Increase vertical breathing room between report identity, filters, summary, statement title, and table.
const replacements = [
  [
    '@page{size:A4 landscape;margin:0}',
    '@page{size:A4 landscape;margin:5mm 3mm 4mm}'
  ],
  [
    'body{font-family:Tahoma,Arial,sans-serif;color:#172033}',
    'body{font-family:Tahoma,Arial,sans-serif;color:#172033;background:#fff}'
  ],
  [
    '.header{text-align:center;border-bottom:1px solid #1f4e79;padding:0;margin:0}',
    '.header{text-align:center;border-bottom:1px solid #1f4e79;padding:2.5mm 3mm 2mm;margin:0 0 2.5mm}'
  ],
  [
    '.header h1{font-size:14px;line-height:1;margin:0;font-weight:800}',
    '.header h1{font-size:15px;line-height:1.2;margin:0 0 .8mm;font-weight:800}'
  ],
  [
    '.sub{font-size:8px;line-height:1;color:#64748b;margin:0}',
    '.sub{font-size:8px;line-height:1.25;color:#64748b;margin:.45mm 0 0}'
  ],
  [
    '.filters{margin:0;padding:1px 2px;border:1px solid #dbe3ec;border-radius:0;font-size:8.5px;line-height:1}',
    '.filters{margin:0 0 2mm;padding:1.5mm 2mm;border:1px solid #dbe3ec;border-radius:1.5mm;font-size:8.5px;line-height:1.25;background:#fbfdff}'
  ],
  [
    '.summary{display:flex;gap:0;margin:0}',
    '.summary{display:flex;gap:1.5mm;margin:0 0 2mm}'
  ],
  [
    '.summary div{flex:1;border:1px solid #dbe3ec;border-radius:0;padding:1px 2px;text-align:center;line-height:1;font-size:9px}',
    '.summary div{flex:1;border:1px solid #dbe3ec;border-radius:1.5mm;padding:1.4mm 2mm;text-align:center;line-height:1.15;font-size:9px;background:#fff}'
  ],
  [
    '.summary strong{font-size:12px}',
    '.summary strong{font-size:12px;display:inline-block;margin-top:.6mm}'
  ],
  [
    '.statement-title{text-align:center;padding:2px 4px;border-right:1px solid #dbe3ec;border-left:1px solid #dbe3ec;font-size:11px;font-weight:800;line-height:1.1;color:#172033;background:#fff}',
    '.statement-title{text-align:center;margin:1mm 0 2.2mm;padding:1.6mm 4mm;border:1px solid #cbd8e5;border-radius:1.5mm;font-size:12px;font-weight:800;line-height:1.2;color:#172033;background:#f8fafc}'
  ],
  [
    'table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:11px;line-height:1.02}',
    'table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:11px;line-height:1.08}'
  ],
  [
    '.footer{margin-top:0;padding:0 1px;font-size:7px;line-height:1;color:#64748b;display:flex;justify-content:space-between}',
    '.footer{margin-top:1.5mm;padding:.8mm 1mm 0;font-size:7px;line-height:1.15;color:#64748b;display:flex;justify-content:space-between;border-top:1px solid #eef2f6}'
  ],
];

for (const [before, after] of replacements) {
  if (!src.includes(before)) {
    throw new Error(`Expected print style fragment not found: ${before}`);
  }
  src = src.replace(before, after);
}

fs.writeFileSync(path, src);
console.log('Asset report print spacing updated.');
