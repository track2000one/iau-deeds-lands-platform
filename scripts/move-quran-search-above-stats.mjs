import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('QURAN_TOP_SEARCH_V1')) {
  console.log('Quran top search already applied');
  process.exit(0);
}

const searchBlock = `              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                <div className="relative"><Search className="absolute right-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-sky-700" /><Input className="h-12 rounded-xl border-2 border-sky-500 bg-sky-100 pr-11 text-sm font-semibold text-slate-900 shadow-[0_4px_12px_rgba(14,165,233,0.20),inset_0_1px_0_rgba(255,255,255,0.85)] placeholder:font-semibold placeholder:text-slate-600 focus-visible:border-sky-600 focus-visible:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-200/80 focus-visible:ring-offset-0" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>
                <label className={\`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold \${quranNeedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}\`}><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={quranNeedOnly} onChange={(e) => setQuranNeedOnly(e.target.checked)} />المواقع التي لديها احتياج فقط</label>
                <Badge variant="outline" className="h-9 justify-center border-sky-200 bg-white px-3">تم جرد {quranSummary.countedSites} من {quranSummary.sites}</Badge>
              </div>
`;

if (!source.includes(searchBlock)) {
  throw new Error('Could not find the existing Quran search block');
}

source = source.replace(searchBlock, '');

const navAnchor = `        </TabsList>
        </div>

`;
if (!source.includes(navAnchor)) {
  throw new Error('Could not find the sticky navigation closing anchor');
}

const topSearch = `        {/* QURAN_TOP_SEARCH_V1: show Quran search immediately below navigation and above KPI cards. */}
        {activeTab === 'quran' && <div className="grid gap-3 rounded-2xl border-2 border-sky-300 bg-gradient-to-l from-sky-100 via-sky-50 to-white p-3 shadow-[0_8px_24px_rgba(14,165,233,0.16)] md:grid-cols-[1fr_220px_auto] md:items-center">
          <div className="relative"><Search className="absolute right-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-sky-700" /><Input className="h-12 rounded-xl border-2 border-sky-500 bg-white pr-11 text-sm font-bold text-slate-900 shadow-[0_4px_12px_rgba(14,165,233,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:font-semibold placeholder:text-slate-600 focus-visible:border-sky-600 focus-visible:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-200/80 focus-visible:ring-offset-0" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>
          <label className={\`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold \${quranNeedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-sky-200 bg-white text-slate-700'}\`}><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={quranNeedOnly} onChange={(e) => setQuranNeedOnly(e.target.checked)} />المواقع التي لديها احتياج فقط</label>
          <Badge variant="outline" className="h-10 justify-center border-sky-300 bg-white px-3 font-bold text-sky-800">تم جرد {quranSummary.countedSites} من {quranSummary.sites}</Badge>
        </div>}

`;

source = source.replace(navAnchor, navAnchor + topSearch);
fs.writeFileSync(path, source);
console.log('Moved Quran search above KPI cards');
