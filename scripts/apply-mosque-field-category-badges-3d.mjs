import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');

const helperAnchor = `const itemStatusLabels: Record<string, string> = {
  good: 'سليم',
  needs_action: 'يحتاج معالجة',
  not_available: 'غير متوفر',
  not_applicable: 'لا ينطبق',
  not_checked: 'لم يتم التحقق',
};
`;

const helperMarker = 'const getFieldVisitCategoryBadgeClass = (category: string) => {';
const helperCode = `const getFieldVisitCategoryBadgeClass = (category: string) => {
  const value = String(category || '').trim();
  const base = 'relative mb-2 inline-flex min-h-7 items-center gap-1.5 overflow-hidden rounded-xl border px-3 py-1.5 text-[11px] font-black tracking-tight transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03]';

  if (value.includes('التكييف') || value.includes('التهوية')) {
    return \`${'${base}'} border-cyan-300/90 bg-gradient-to-b from-cyan-50 via-sky-100 to-cyan-200 text-cyan-950 ring-1 ring-cyan-200/70 shadow-[0_4px_0_rgba(8,145,178,0.36),0_8px_16px_rgba(14,165,233,0.22),0_0_18px_rgba(34,211,238,0.28)]\`;
  }
  if (value.includes('الإنارة') || value.includes('الكهرباء')) {
    return \`${'${base}'} border-amber-300/90 bg-gradient-to-b from-yellow-50 via-amber-100 to-yellow-200 text-amber-950 ring-1 ring-yellow-200/80 shadow-[0_4px_0_rgba(217,119,6,0.34),0_8px_16px_rgba(245,158,11,0.20),0_0_20px_rgba(250,204,21,0.36)]\`;
  }
  if (value.includes('التجهيزات')) {
    return \`${'${base}'} border-violet-300/90 bg-gradient-to-b from-violet-50 via-purple-100 to-violet-200 text-violet-950 ring-1 ring-violet-200/80 shadow-[0_4px_0_rgba(109,40,217,0.32),0_8px_16px_rgba(139,92,246,0.20),0_0_18px_rgba(167,139,250,0.30)]\`;
  }
  if (value.includes('الأنشطة') || value.includes('التحفيظ') || value.includes('المحاضرات')) {
    return \`${'${base}'} border-fuchsia-300/90 bg-gradient-to-b from-fuchsia-50 via-pink-100 to-fuchsia-200 text-fuchsia-950 ring-1 ring-fuchsia-200/80 shadow-[0_4px_0_rgba(192,38,211,0.30),0_8px_16px_rgba(217,70,239,0.18),0_0_18px_rgba(232,121,249,0.30)]\`;
  }
  if (value.includes('السلامة') || value.includes('الطوارئ') || value.includes('الحريق')) {
    return \`${'${base}'} border-rose-300/90 bg-gradient-to-b from-rose-50 via-red-100 to-rose-200 text-rose-950 ring-1 ring-rose-200/80 shadow-[0_4px_0_rgba(225,29,72,0.30),0_8px_16px_rgba(244,63,94,0.18),0_0_18px_rgba(251,113,133,0.28)]\`;
  }
  if (value.includes('النظافة')) {
    return \`${'${base}'} border-emerald-300/90 bg-gradient-to-b from-emerald-50 via-green-100 to-emerald-200 text-emerald-950 ring-1 ring-emerald-200/80 shadow-[0_4px_0_rgba(5,150,105,0.30),0_8px_16px_rgba(16,185,129,0.18),0_0_18px_rgba(52,211,153,0.28)]\`;
  }
  if (value.includes('المصاحف') || value.includes('القرآن')) {
    return \`${'${base}'} border-teal-300/90 bg-gradient-to-b from-teal-50 via-emerald-100 to-teal-200 text-teal-950 ring-1 ring-teal-200/80 shadow-[0_4px_0_rgba(13,148,136,0.30),0_8px_16px_rgba(20,184,166,0.18),0_0_18px_rgba(45,212,191,0.28)]\`;
  }
  if (value.includes('الصوت') || value.includes('الأذان') || value.includes('الميكروفونات') || value.includes('السماعات')) {
    return \`${'${base}'} border-indigo-300/90 bg-gradient-to-b from-indigo-50 via-blue-100 to-indigo-200 text-indigo-950 ring-1 ring-indigo-200/80 shadow-[0_4px_0_rgba(79,70,229,0.30),0_8px_16px_rgba(99,102,241,0.18),0_0_18px_rgba(129,140,248,0.28)]\`;
  }
  if (value.includes('الوصول') || value.includes('الإعاقة') || value.includes('كبار السن')) {
    return \`${'${base}'} border-orange-300/90 bg-gradient-to-b from-orange-50 via-amber-100 to-orange-200 text-orange-950 ring-1 ring-orange-200/80 shadow-[0_4px_0_rgba(234,88,12,0.30),0_8px_16px_rgba(249,115,22,0.18),0_0_18px_rgba(251,146,60,0.28)]\`;
  }

  return \`${'${base}'} border-slate-300/90 bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-800 ring-1 ring-slate-200/80 shadow-[0_4px_0_rgba(71,85,105,0.24),0_8px_16px_rgba(100,116,139,0.14),0_0_16px_rgba(148,163,184,0.22)]\`;
};
`;

if (!source.includes(helperMarker)) {
  if (!source.includes(helperAnchor)) {
    throw new Error('Could not find the item status labels anchor.');
  }
  source = source.replace(helperAnchor, `${helperAnchor}\n${helperCode}\n`);
}

const badgeFrom = '<Badge variant="outline" className="mb-1">{item.category}</Badge><p className="font-bold text-slate-800">{item.title}</p>';
const badgeTo = '<Badge variant="outline" className={getFieldVisitCategoryBadgeClass(item.category)}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /><span aria-hidden className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/90" /><span className="relative">{item.category}</span></Badge><p className="font-bold text-slate-800">{item.title}</p>';

if (source.includes(badgeFrom)) {
  source = source.replace(badgeFrom, badgeTo);
} else if (!source.includes('getFieldVisitCategoryBadgeClass(item.category)')) {
  throw new Error('Could not find the checklist category badge anchor.');
}

fs.writeFileSync(path, source);
console.log('Applied illuminated 3D category badges to the mosque field-visit checklist.');
