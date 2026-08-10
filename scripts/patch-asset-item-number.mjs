import fs from 'node:fs';

for (const path of ['src/app/pages/AddAssetPage.tsx','src/app/pages/EditAssetPage.tsx']) {
  let s = fs.readFileSync(path, 'utf8');
  if (!s.includes("itemNumber:")) {
    s = s.replace("barcode: '',", "itemNumber: '',\n  barcode: '',");
  }
  if (path.includes('AddAssetPage')) {
    s = s.replace("if (!String(form.name || '').trim()) {", "if (!String(form.itemNumber || '').trim()) { setError('رقم الصنف مطلوب.'); return; }\n\n    if (!String(form.name || '').trim()) {");
    s = s.replace("...form,\n        barcode:", "...form,\n        itemNumber: String(form.itemNumber || '').trim(),\n        barcode:");
    s = s.replace('<Label>رقم الأصل الداخلي</Label>\n            <Input placeholder="يُنشأ تلقائيًا مثل AST-2026-000001" disabled />', '<Label>رقم الصنف *</Label>\n            <Input value={form.itemNumber || \'\'} onChange={(e) => setField(\'itemNumber\', e.target.value)} placeholder="أدخل رقم الصنف الفريد" />');
  } else {
    s = s.replace("barcode: asset.barcode || '',", "itemNumber: asset.itemNumber || asset.assetNumber || '', barcode: asset.barcode || '',");
    s = s.replace("if (!String(form.name || '').trim()", "if (!String(form.itemNumber || '').trim() || !String(form.name || '').trim()");
    s = s.replace("...form,\n        barcode:", "...form,\n        itemNumber: String(form.itemNumber || '').trim(),\n        barcode:");
    s = s.replace('<div><Label>رقم الأصل</Label><Input value={assetNumber} disabled /></div>', '<div><Label>رقم الصنف *</Label><Input value={form.itemNumber || \'\'} onChange={(e) => setField(\'itemNumber\', e.target.value)} /></div>');
  }
  fs.writeFileSync(path, s, 'utf8');
}
console.log('Asset item number patch applied.');
