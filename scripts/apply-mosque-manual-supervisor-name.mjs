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
  "  coordinatorName?: string | null;\n  contactPhone?: string | null;\n",
  "  coordinatorName?: string | null;\n  supervisorName?: string | null;\n  contactPhone?: string | null;\n",
  'MosqueSite supervisorName type',
);
fs.writeFileSync(apiFile, api);

const pageFile = 'src/app/pages/MosquesUnitPage.tsx';
let page = fs.readFileSync(pageFile, 'utf8');

page = replaceOnce(
  page,
  "  status: 'active', imamName: '', muezzinName: '', khateebName: '', coordinatorName: '', contactPhone: '', supervisorUserId: '', notes: '',\n",
  "  status: 'active', imamName: '', muezzinName: '', khateebName: '', coordinatorName: '', supervisorName: '', contactPhone: '', supervisorUserId: '', notes: '',\n",
  'empty site supervisorName',
);

page = replaceOnce(
  page,
  "  coordinatorName: site.coordinatorName ?? null,\n  contactPhone: site.contactPhone ?? null,\n",
  "  coordinatorName: site.coordinatorName ?? null,\n  supervisorName: site.supervisorName ?? null,\n  contactPhone: site.contactPhone ?? null,\n",
  'site media payload supervisorName',
);

page = replaceOnce(
  page,
  "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', coordinatorName: site.coordinatorName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',\n",
  "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', coordinatorName: site.coordinatorName || '', supervisorName: site.supervisorName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',\n",
  'edit site supervisorName',
);

page = replaceOnce(
  page,
  "                {isAdmin && <Field label=\"المشرف المسؤول عن الموقع\"><NativeSelect className=\"h-11\" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value=\"\">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}\n",
  "                {isAdmin && <Field label=\"المشرف المسؤول عن الموقع\"><NativeSelect className=\"h-11\" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value=\"\">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}\n                <Field label=\"اسم المشرف (يدوي)\"><Input className=\"h-11\" value={siteForm.supervisorName} onChange={(e) => setSiteForm({ ...siteForm, supervisorName: e.target.value })} placeholder=\"اكتب اسم المشرف يدويًا\" /><p className=\"mt-1 text-[11px] leading-5 text-muted-foreground\">للتوثيق الاسمي فقط؛ لا ينشئ حسابًا ولا يمنح صلاحيات دخول.</p></Field>\n",
  'manual supervisor name field',
);

page = replaceOnce(
  page,
  "        ['الخطيب', site.khateebName || '-'],\n        ['اسم المنسق', site.coordinatorName || '-'],\n",
  "        ['الخطيب', site.khateebName || '-'],\n        ['اسم المشرف', site.supervisorName || '-'],\n        ['اسم المنسق', site.coordinatorName || '-'],\n",
  'site details supervisorName',
);

fs.writeFileSync(pageFile, page);
console.log('Frontend manual supervisor name patch applied successfully.');
