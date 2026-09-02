import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const from = '<div className="rounded-2xl border border-sky-200/80 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:hidden">';
const to = '<div className="relative overflow-hidden rounded-2xl border border-sky-300/90 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08),0_0_0_1px_rgba(56,189,248,0.08),0_0_22px_rgba(56,189,248,0.10)] ring-1 ring-sky-100/80 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-sky-300/60 before:opacity-40 before:content-[\'\'] before:animate-pulse motion-reduce:before:animate-none sm:hidden">';

if (!source.includes(from)) {
  if (source.includes('before:animate-pulse motion-reduce:before:animate-none sm:hidden')) {
    console.log('Mobile section navigation glow is already applied.');
    process.exit(0);
  }
  throw new Error('Could not find the mobile unit-section navigation card anchor.');
}

source = source.replace(from, to);
fs.writeFileSync(path, source);
console.log('Applied subtle pulse glow to the mobile unit-section navigation card.');
