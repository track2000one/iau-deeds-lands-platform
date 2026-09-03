import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
};

const apiFile = 'src/app/api/mosques.ts';
let api = fs.readFileSync(apiFile, 'utf8');
api = replaceOnce(
  api,
  "  contactPhone?: string | null;\n",
  "  coordinatorName?: string | null;\n  contactPhone?: string | null;\n",
  'MosqueSite coordinatorName type',
);
fs.writeFileSync(apiFile, api);

const pageFile = 'src/app/pages/MosquesUnitPage.tsx';
let page = fs.readFileSync(pageFile, 'utf8');

page = replaceOnce(
  page,
  "  status: 'active', imamName: '', muezzinName: '', khateebName: '', contactPhone: '', supervisorUserId: '', notes: '',\n",
  "  status: 'active', imamName: '', muezzinName: '', khateebName: '', coordinatorName: '', contactPhone: '', supervisorUserId: '', notes: '',\n",
  'empty site coordinatorName',
);

page = replaceOnce(
  page,
  "  khateebName: site.khateebName ?? null,\n  contactPhone: site.contactPhone ?? null,\n",
  "  khateebName: site.khateebName ?? null,\n  coordinatorName: site.coordinatorName ?? null,\n  contactPhone: site.contactPhone ?? null,\n",
  'site media payload coordinatorName',
);

page = replaceOnce(
  page,
  "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',\n",
  "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', coordinatorName: site.coordinatorName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',\n",
  'edit site coordinatorName',
);

page = replaceOnce(
  page,
  "              <CardHeader className=\"border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/60 pb-4\"><CardTitle className=\"flex items-center gap-2 text-base md:text-lg\"><Building2 className=\"h-5 w-5\" />السعة وبيانات التواصل</CardTitle></CardHeader>\n              <CardContent className=\"grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:grid-cols-4\">",
  "              <CardHeader className=\"border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/60 pb-4\"><CardTitle className=\"flex items-center gap-2 text-base md:text-lg\"><Building2 className=\"h-5 w-5\" />السعة وبيانات التواصل</CardTitle></CardHeader>\n              <CardContent className=\"grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:grid-cols-5\">",
  'contact capacity grid',
);

page = replaceOnce(
  page,
  "                <Field label=\"رقم التواصل\"><Input className=\"h-11\" type=\"tel\" inputMode=\"tel\" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder=\"05xxxxxxxx\" /></Field>\n",
  "                <Field label=\"اسم المنسق\"><Input className=\"h-11\" value={siteForm.coordinatorName} onChange={(e) => setSiteForm({ ...siteForm, coordinatorName: e.target.value })} placeholder=\"اسم منسق الموقع\" /></Field>\n                <Field label=\"رقم التواصل\"><Input className=\"h-11\" type=\"tel\" inputMode=\"tel\" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder=\"05xxxxxxxx\" /></Field>\n",
  'coordinator name field beside contact phone',
);

page = replaceOnce(
  page,
  "        ['الخطيب', site.khateebName || '-'],\n        ['رقم التواصل', site.contactPhone || '-'],\n",
  "        ['الخطيب', site.khateebName || '-'],\n        ['اسم المنسق', site.coordinatorName || '-'],\n        ['رقم التواصل', site.contactPhone || '-'],\n",
  'site details coordinatorName',
);

fs.writeFileSync(pageFile, page);
console.log('Frontend coordinator name patch applied successfully.');
