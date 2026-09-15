import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let text = fs.readFileSync(path, 'utf8');

const before = '<Input className="h-11 border-sky-300 bg-sky-100/70 pr-10 placeholder:text-slate-500 focus-visible:border-sky-400 focus-visible:ring-sky-300/50" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." />';
const after = '<Input className="h-11 border-transparent bg-sky-100/70 pr-10 shadow-none placeholder:text-slate-500 focus-visible:border-transparent focus-visible:bg-sky-100 focus-visible:ring-0 focus-visible:ring-offset-0" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." />';

if (text.includes(after)) {
  console.log('Quran search background-only style already applied.');
  process.exit(0);
}
if (!text.includes(before)) {
  throw new Error('Target Quran search input was not found.');
}
text = text.replace(before, after);
fs.writeFileSync(path, text);
console.log('Applied background-only style to Quran search input without border highlight.');
