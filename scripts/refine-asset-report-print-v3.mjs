import fs from 'node:fs';

const path = 'src/app/pages/AssetReportsPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const oldCss = `@page{size:A4 landscape;margin:1.5mm 2mm 2mm}*{box-sizing:border-box}html,body{width:100%;margin:0;padding:0}body{font-family:Tahoma,Arial,sans-serif;color:#172033}.header{text-align:center;border-bottom:1.5px solid #1f4e79;padding:0 0 2px;margin:0 0 2px}.header h1{font-size:16px;line-height:1.05;margin:0}.sub{font-size:7px;line-height:1.05;color:#64748b;margin-top:0}.filters{margin:1.5px 0;padding:2px 3px;border:1px solid #dbe3ec;border-radius:3px;font-size:6.6px;line-height:1.05}.summary{display:flex;gap:2px;margin:0 0 2px}.summary div{flex:1;border:1px solid #dbe3ec;border-radius:3px;padding:2px 3px;text-align:center;line-height:1.05}.summary strong{font-size:10.5px}table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:auto;font-size:6.35px;line-height:1.02}th{background:#1f4e79;color:#fff;padding:1.2px 1px;border:0.7px solid #dbe3ec;font-weight:700;vertical-align:middle}td{padding:1.15px 1px;border:0.7px solid #dbe3ec;text-align:center;vertical-align:middle}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.footer{margin-top:2px;font-size:5.8px;line-height:1;color:#64748b;display:flex;justify-content:space-between}`;

const newCss = `@page{size:A4 landscape;margin:.5mm}*{box-sizing:border-box}html,body{width:100%;margin:0;padding:0}body{font-family:Tahoma,Arial,sans-serif;color:#172033;padding:0 .5mm}.header{text-align:center;border-bottom:1.5px solid #1f4e79;padding:0 0 2px;margin:0 0 2px}.header h1{font-size:19px;line-height:1.05;margin:0;font-weight:800}.sub{font-size:10px;line-height:1.05;color:#64748b;margin-top:1px}.filters{margin:1px 0;padding:2px 4px;border:1px solid #dbe3ec;border-radius:3px;font-size:10px;line-height:1.1}.summary{display:flex;gap:2px;margin:0 0 2px}.summary div{flex:1;border:1px solid #dbe3ec;border-radius:3px;padding:2px 4px;text-align:center;line-height:1.05;font-size:11px}.summary strong{font-size:16px}table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:14px;line-height:1.12}th{background:#1f4e79;color:#fff;padding:2px 2px;border:.6px solid #dbe3ec;font-weight:800;vertical-align:middle;white-space:normal;overflow-wrap:anywhere}td{padding:1.5px 2px;border:.6px solid #dbe3ec;text-align:center;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.footer{margin-top:2px;font-size:8px;line-height:1;color:#64748b;display:flex;justify-content:space-between}`;

if (!s.includes(oldCss)) {
  console.error('print CSS target not found');
  process.exit(1);
}
s = s.replace(oldCss, newCss);

const oldHeaders = `const headers = selectedFields.map((key) => printableFields.find(([field]) => field === key)?.[1] || key).map((label) => \`<th>\${escapeHtml(label)}</th>\`).join('');`;
const newHeaders = `const headers = selectedFields.map((key) => printableFields.find(([field]) => field === key)?.[1] || key).map((label) => \`<th>\${escapeHtml(label)}</th>\`).join('');\n      const printWeights: Record<FieldKey, number> = { itemNumber: 8, barcode: 10, name: 14, category: 7, brand: 6, model: 7, serialNumber: 9, status: 6, department: 13, building: 6, floor: 4, room: 8, cardNumber: 8, purchaseDate: 7, purchaseValue: 8, attachments: 5 };\n      const weightTotal = 3 + selectedFields.reduce((sum, key) => sum + (printWeights[key] || 7), 0);\n      const colgroup = \`<colgroup><col style="width:\${(3 / weightTotal * 100).toFixed(3)}%">\${selectedFields.map((key) => \`<col style="width:\${((printWeights[key] || 7) / weightTotal * 100).toFixed(3)}%">\`).join('')}</colgroup>\`;`;
if (!s.includes(oldHeaders)) {
  console.error('headers target not found');
  process.exit(1);
}
s = s.replace(oldHeaders, newHeaders);

const oldTable = `<table><thead><tr><th>#</th>\${headers}</tr></thead><tbody>\${body}</tbody></table>`;
const newTable = `<table>\${colgroup}<thead><tr><th>#</th>\${headers}</tr></thead><tbody>\${body}</tbody></table>`;
if (!s.includes(oldTable)) {
  console.error('table target not found');
  process.exit(1);
}
s = s.replace(oldTable, newTable);

fs.writeFileSync(path, s);
console.log('asset report print refined v3');
