import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
const source = fs.readFileSync(file, 'utf8');

const before = '<div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 border-transparent bg-sky-100/70 pr-10 shadow-none placeholder:text-slate-500 focus-visible:border-transparent focus-visible:bg-sky-100 focus-visible:ring-0 focus-visible:ring-offset-0" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>';
const after = '<div className="relative"><Search className="absolute right-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-sky-700" /><Input className="h-12 rounded-xl border-2 border-sky-500 bg-sky-100 pr-11 text-sm font-semibold text-slate-900 shadow-[0_4px_12px_rgba(14,165,233,0.20),inset_0_1px_0_rgba(255,255,255,0.85)] placeholder:font-semibold placeholder:text-slate-600 focus-visible:border-sky-600 focus-visible:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-200/80 focus-visible:ring-offset-0" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>';

if (!source.includes(before)) {
  if (source.includes(after)) {
    console.log('Prominent Quran search field already applied.');
    process.exit(0);
  }
  throw new Error('Target Quran search field markup was not found.');
}

fs.writeFileSync(file, source.replace(before, after));
console.log('Applied prominent sky-blue Quran search field.');
