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
  const base = 'relative mb-2 inline-flex min-h-8 items-center gap-2 overflow-hidden rounded-xl border px-3.5 py-1.5 text-[11px] font-black tracking-tight ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105';

  if (value.includes('التكييف') || value.includes('التهوية')) {
    return \`${'${base}'} border-cyan-400 bg-gradient-to-b from-cyan-100 via-sky-200 to-cyan-300 text-cyan-950 ring-cyan-300/80 shadow-[0_4px_0_rgba(8,145,178,0.48),0_9px_18px_rgba(14,165,233,0.30),0_0_20px_rgba(34,211,238,0.34)]\`;
  }
  if (value.includes('الإنارة') || value.includes('الكهرباء')) {
    return \`${'${base}'} border-amber-400 bg-gradient-to-b from-yellow-100 via-amber-200 to-yellow-300 text-amber-950 ring-yellow-300/90 shadow-[0_4px_0_rgba(217,119,6,0.48),0_9px_18px_rgba(245,158,11,0.28),0_0_20px_rgba(250,204,21,0.38)]\`;
  }
  if (value.includes('التجهيزات')) {
    return \`${'${base}'} border-violet-400 bg-gradient-to-b from-violet-100 via-purple-200 to-violet-300 text-violet-950 ring-violet-300/90 shadow-[0_4px_0_rgba(109,40,217,0.46),0_9px_18px_rgba(139,92,246,0.28),0_0_20px_rgba(167,139,250,0.36)]\`;
  }
  if (value.includes('الأنشطة') || value.includes('التحفيظ') || value.includes('المحاضرات')) {
    return \`${'${base}'} border-fuchsia-400 bg-gradient-to-b from-fuchsia-100 via-pink-200 to-fuchsia-300 text-fuchsia-950 ring-fuchsia-300/90 shadow-[0_4px_0_rgba(192,38,211,0.46),0_9px_18px_rgba(217,70,239,0.26),0_0_20px_rgba(232,121,249,0.36)]\`;
  }
  if (value.includes('السلامة') || value.includes('الطوارئ') || value.includes('الحريق')) {
    return \`${'${base}'} border-rose-400 bg-gradient-to-b from-rose-100 via-red-200 to-rose-300 text-rose-950 ring-rose-300/90 shadow-[0_4px_0_rgba(225,29,72,0.46),0_9px_18px_rgba(244,63,94,0.26),0_0_20px_rgba(251,113,133,0.34)]\`;
  }
  if (value.includes('النظافة')) {
    return \`${'${base}'} border-emerald-400 bg-gradient-to-b from-emerald-100 via-green-200 to-emerald-300 text-emerald-950 ring-emerald-300/90 shadow-[0_4px_0_rgba(5,150,105,0.46),0_9px_18px_rgba(16,185,129,0.26),0_0_20px_rgba(52,211,153,0.34)]\`;
  }
  if (value.includes('المصاحف') || value.includes('القرآن')) {
    return \`${'${base}'} border-teal-400 bg-gradient-to-b from-teal-100 via-emerald-200 to-teal-300 text-teal-950 ring-teal-300/90 shadow-[0_4px_0_rgba(13,148,136,0.46),0_9px_18px_rgba(20,184,166,0.26),0_0_20px_rgba(45,212,191,0.34)]\`;
  }
  if (value.includes('الصوت') || value.includes('الأذان') || value.includes('الميكروفونات') || value.includes('السماعات')) {
    return \`${'${base}'} border-indigo-400 bg-gradient-to-b from-indigo-100 via-blue-200 to-indigo-300 text-indigo-950 ring-indigo-300/90 shadow-[0_4px_0_rgba(79,70,229,0.46),0_9px_18px_rgba(99,102,241,0.26),0_0_20px_rgba(129,140,248,0.34)]\`;
  }
  if (value.includes('الوصول') || value.includes('الإعاقة') || value.includes('كبار السن')) {
    return \`${'${base}'} border-orange-400 bg-gradient-to-b from-orange-100 via-amber-200 to-orange-300 text-orange-950 ring-orange-300/90 shadow-[0_4px_0_rgba(234,88,12,0.46),0_9px_18px_rgba(249,115,22,0.26),0_0_20px_rgba(251,146,60,0.34)]\`;
  }

  return \`${'${base}'} border-slate-400 bg-gradient-to-b from-white via-slate-200 to-slate-300 text-slate-900 ring-slate-300/90 shadow-[0_4px_0_rgba(71,85,105,0.38),0_9px_18px_rgba(100,116,139,0.22),0_0_18px_rgba(148,163,184,0.28)]\`;
};
`;

if (!source.includes(helperMarker)) {
  if (!source.includes(helperAnchor)) {
    throw new Error('Could not find the item status labels anchor.');
  }
  source = source.replace(helperAnchor, `${helperAnchor}\n${helperCode}\n`);
} else {
  const helperStart = source.indexOf(helperMarker);
  const helperEndMarker = '\n};';
  const helperEnd = source.indexOf(helperEndMarker, helperStart);
  if (helperEnd === -1) throw new Error('Could not locate the end of the category badge helper.');
  source = source.slice(0, helperStart) + helperCode.trimEnd() + source.slice(helperEnd + helperEndMarker.length);
}

const oldBadge = '<Badge variant="outline" className="mb-1">{item.category}</Badge>';
const newBadge = '<span className={getFieldVisitCategoryBadgeClass(item.category)}><span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70 shadow-[0_0_8px_currentColor]" /><span aria-hidden className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/95" /><span className="relative">{item.category}</span></span>';

if (source.includes(oldBadge)) {
  source = source.replaceAll(oldBadge, newBadge);
}

if (!source.includes('getFieldVisitCategoryBadgeClass(item.category)')) {
  throw new Error('Category badge rendering was not updated.');
}

if (source.includes(oldBadge)) {
  throw new Error('A legacy flat category badge is still present.');
}

fs.writeFileSync(path, source);
console.log('Applied visible illuminated 3D category badges to the mosque field-visit checklist.');
