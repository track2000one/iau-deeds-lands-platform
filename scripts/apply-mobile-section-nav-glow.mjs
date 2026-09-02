import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const from = '<div className="relative overflow-hidden rounded-2xl border border-sky-300/90 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08),0_0_0_1px_rgba(56,189,248,0.08),0_0_22px_rgba(56,189,248,0.10)] ring-1 ring-sky-100/80 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-sky-300/60 before:opacity-40 before:content-[\'\'] before:animate-pulse motion-reduce:before:animate-none sm:hidden">';
const to = '<div className="relative overflow-hidden rounded-2xl border border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 shadow-[0_10px_28px_rgba(5,150,105,0.10),0_0_0_1px_rgba(16,185,129,0.08),0_0_24px_rgba(45,212,191,0.12)] ring-1 ring-emerald-100/80 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-emerald-300/60 before:opacity-35 before:content-[\'\'] before:animate-pulse motion-reduce:before:animate-none sm:hidden">';

if (source.includes(from)) {
  source = source.replace(from, to);
} else if (!source.includes('bg-gradient-to-br from-emerald-50 via-white to-teal-50')) {
  throw new Error('Could not find the mobile unit-section navigation card anchor.');
}

const titleFrom = '<p className="text-[11px] font-bold text-sky-700">التنقل بين أقسام الوحدة</p>';
const titleTo = '<p className="text-[11px] font-bold text-emerald-800">التنقل بين أقسام الوحدة</p>';
if (source.includes(titleFrom)) source = source.replace(titleFrom, titleTo);

fs.writeFileSync(path, source);
console.log('Applied mint/teal visual emphasis to the mobile unit-section navigation card.');
