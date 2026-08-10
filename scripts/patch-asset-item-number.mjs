import fs from 'node:fs';

for (const path of ['src/app/pages/AddAssetPage.tsx','src/app/pages/EditAssetPage.tsx']) {
  let s = fs.readFileSync(path, 'utf8');

  s = s.replace("status: 'active'", "status: 'available'");
  s = s.replace(/\s*custodian:\s*'',?/g, '');
  s = s.replace(/\n\s*custodian: String\(form\.custodian \|\| ''\)\.trim\(\) \|\| null,/g, '');
  s = s.replace(/,\s*custodian: asset\.custodian \|\| ''/g, '');

  const oldStatusesMultiline = `<SelectItem value="active">نشط</SelectItem>\n                <SelectItem value="assigned">بعهدة</SelectItem>\n                <SelectItem value="maintenance">تحت الصيانة</SelectItem>\n                <SelectItem value="stored">بالمستودع</SelectItem>\n                <SelectItem value="disposed">مستبعد</SelectItem>`;
  const newStatusesMultiline = `<SelectItem value="available">متاح</SelectItem>\n                <SelectItem value="in_use">قيد الاستخدام</SelectItem>\n                <SelectItem value="maintenance">تحت الصيانة</SelectItem>\n                <SelectItem value="damaged">تالف</SelectItem>\n                <SelectItem value="lost">مفقود / عجز</SelectItem>\n                <SelectItem value="disposed">مستبعد</SelectItem>`;
  s = s.replace(oldStatusesMultiline, newStatusesMultiline);

  const oldStatusesInline = `<SelectItem value="active">نشط</SelectItem><SelectItem value="assigned">بعهدة</SelectItem><SelectItem value="maintenance">تحت الصيانة</SelectItem><SelectItem value="stored">بالمستودع</SelectItem><SelectItem value="disposed">مستبعد</SelectItem>`;
  const newStatusesInline = `<SelectItem value="available">متاح</SelectItem><SelectItem value="in_use">قيد الاستخدام</SelectItem><SelectItem value="maintenance">تحت الصيانة</SelectItem><SelectItem value="damaged">تالف</SelectItem><SelectItem value="lost">مفقود / عجز</SelectItem><SelectItem value="disposed">مستبعد</SelectItem>`;
  s = s.replace(oldStatusesInline, newStatusesInline);

  s = s.replace('الموقع والعهدة', 'الموقع الإداري');

  s = s.replace(/\n\s*<div className="space-y-2 md:col-span-2">\s*\n\s*<Label>صاحب العهدة<\/Label>[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n\s*<\/CardContent>/m, '\n        </CardContent>');
  s = s.replace(/\n\s*<div className="md:col-span-2"><Label>صاحب العهدة<\/Label>[\s\S]*?<\/div><\/div>\n/m, '\n');

  if (path.includes('AddAssetPage')) {
    s = s.replace('placeholder="امسح الباركود أو أدخل الرقم يدويًا"', 'placeholder="اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول"');
    s = s.replace(
      '<Input value={form.barcode || \'\'} onChange={(e) => setField(\'barcode\', e.target.value)} placeholder="اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول" />',
      '<Input value={form.barcode || \'\'} onChange={(e) => setField(\'barcode\', e.target.value)} placeholder="اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول" />\n            <p className="text-xs text-muted-foreground">سيُنشئ النظام رقم باركود فريدًا تلقائيًا عند الحفظ.</p>'
    );
  } else {
    s = s.replace('<div><Label>الباركود</Label><Input value={form.barcode || \'\'} onChange={(e) => setField(\'barcode\', e.target.value)} /></div>', '<div><Label>الباركود</Label><Input value={form.barcode || \'\'} onChange={(e) => setField(\'barcode\', e.target.value)} placeholder="يُنشأ تلقائيًا إذا تُرك فارغًا" /></div>');
  }

  fs.writeFileSync(path, s, 'utf8');
}
console.log('Asset forms aligned with item number, system barcode, department custody and operational statuses.');
// phase 2 trigger 2026-08-10
