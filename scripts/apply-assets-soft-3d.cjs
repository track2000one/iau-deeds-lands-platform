const fs = require('fs');
const path = 'src/app/pages/AssetsPage.tsx';
let source = fs.readFileSync(path, 'utf8');

source = source.replace(
`const getAssetStatusTone = (status: AssetRecord['status']) => {
  const key = String(status || '').toLowerCase();
  if (key === 'available') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (key === 'in_use' || key === 'inuse') return 'border-sky-300 bg-sky-50 text-sky-800';
  if (key === 'maintenance') return 'border-amber-300 bg-amber-50 text-amber-800';
  if (key === 'lost') return 'border-red-300 bg-red-50 text-red-700';
  if (key === 'disposed' || key === 'excluded') return 'border-slate-300 bg-slate-50 text-slate-700';
  return 'border-slate-300 bg-white text-slate-700';
};`,
`const getAssetStatusTone = (status: AssetRecord['status']) => {
  const key = String(status || '').toLowerCase();
  if (key === 'available') return 'border-emerald-300/90 bg-[linear-gradient(180deg,#f0fff8,#daf8e9)] text-emerald-800 shadow-[0_4px_8px_rgba(16,185,129,0.17),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.08)]';
  if (key === 'in_use' || key === 'inuse') return 'border-sky-300/90 bg-[linear-gradient(180deg,#eef9ff,#d8f0ff)] text-sky-800 shadow-[0_4px_8px_rgba(14,165,233,0.17),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(14,165,233,0.08)]';
  if (key === 'maintenance') return 'border-amber-300/90 bg-[linear-gradient(180deg,#fffaf0,#ffefc7)] text-amber-800 shadow-[0_4px_8px_rgba(245,158,11,0.18),inset_0_1px_0_rgba(255,255,255,0.95)]';
  if (key === 'lost') return 'border-red-300/90 bg-[linear-gradient(180deg,#fff4f4,#ffe0e0)] text-red-700 shadow-[0_4px_8px_rgba(239,68,68,0.15),inset_0_1px_0_rgba(255,255,255,0.95)]';
  if (key === 'disposed' || key === 'excluded') return 'border-slate-300 bg-[linear-gradient(180deg,#fbfcfd,#e9edf1)] text-slate-700 shadow-[0_4px_8px_rgba(71,85,105,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]';
  return 'border-slate-300 bg-[linear-gradient(180deg,#ffffff,#edf2f6)] text-slate-700 shadow-[0_4px_8px_rgba(71,85,105,0.11),inset_0_1px_0_rgba(255,255,255,0.95)]';
};`);

source = source.replace(
'    <article className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-[18px] border-[1.5px] border-[#17395f]/90 bg-white shadow-[0_8px_22px_rgba(15,42,70,0.08),0_2px_5px_rgba(15,42,70,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f3158] hover:shadow-[0_14px_30px_rgba(15,42,70,0.13),0_4px_9px_rgba(15,42,70,0.06)]">',
'    <article className="group relative flex min-h-[318px] flex-col overflow-hidden rounded-[19px] border-[1.5px] border-[#17395f]/85 bg-[linear-gradient(145deg,#ffffff_0%,#fbfdff_48%,#edf3f8_100%)] shadow-[0_10px_0_rgba(13,48,82,0.11),0_16px_28px_rgba(15,42,70,0.11),inset_0_2px_0_rgba(255,255,255,1),inset_0_-2px_5px_rgba(23,57,95,0.06)] transition-all duration-200 hover:-translate-y-[3px] hover:border-[#0f3158] hover:shadow-[0_13px_0_rgba(13,48,82,0.12),0_22px_36px_rgba(15,42,70,0.15),inset_0_2px_0_rgba(255,255,255,1),inset_0_-3px_7px_rgba(23,57,95,0.07)]">');

source = source.replace(
'      <div className="h-1 w-full bg-gradient-to-l from-[#17395f] via-[#7aaace] to-[#d9b66f] opacity-90" />',
'      <div className="relative h-[7px] w-full bg-[linear-gradient(180deg,#f7fbff_0%,#8db4d2_18%,#345b7c_58%,#17395f_100%)] shadow-[0_2px_4px_rgba(15,49,88,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]"><span className="absolute inset-x-6 top-[1px] h-px rounded-full bg-white/70" /></div>');

source = source.replace(
'          <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-sm ${getAssetStatusTone(asset.status)}`}>',
'          <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-black transition-transform duration-150 group-hover:-translate-y-0.5 ${getAssetStatusTone(asset.status)}`}>');

source = source.replace(
'            className="h-9 rounded-lg border-[#17395f] bg-white font-bold text-[#17395f] shadow-[0_1px_2px_rgba(15,42,70,0.05)] hover:bg-[#f4f8fc] hover:text-[#102f52]"',
'            className="h-10 rounded-[10px] border-[#17395f]/90 bg-[linear-gradient(180deg,#ffffff_0%,#edf4f9_100%)] font-black text-[#17395f] shadow-[0_5px_0_#c1cfdb,0_8px_13px_rgba(15,42,70,0.12),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#ffffff,#e4eef6)] hover:text-[#102f52] active:translate-y-[3px] active:shadow-[0_1px_0_#aebdca,0_3px_6px_rgba(15,42,70,0.10),inset_0_1px_3px_rgba(15,42,70,0.07)]"');

source = source.replace(
'              className="h-9 rounded-lg border-[#557896] bg-white font-bold text-[#244967] shadow-[0_1px_2px_rgba(15,42,70,0.05)] hover:bg-[#f2f7fb] hover:text-[#17395f]"',
'              className="h-10 rounded-[10px] border-[#557896] bg-[linear-gradient(180deg,#ffffff_0%,#e8f0f6_100%)] font-black text-[#244967] shadow-[0_5px_0_#b4c6d3,0_8px_13px_rgba(15,42,70,0.11),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#ffffff,#dfeaf2)] hover:text-[#17395f] active:translate-y-[3px] active:shadow-[0_1px_0_#9fb2c0,0_3px_6px_rgba(15,42,70,0.10),inset_0_1px_3px_rgba(15,42,70,0.07)]"');

source = source.replace(
'              className="h-9 rounded-lg border-red-400 bg-red-50/70 font-bold text-red-600 shadow-[0_1px_2px_rgba(185,28,28,0.04)] hover:border-red-500 hover:bg-red-100 hover:text-red-700"',
'              className="h-10 rounded-[10px] border-red-400 bg-[linear-gradient(180deg,#fffdfd_0%,#ffe7e7_100%)] font-black text-red-600 shadow-[0_5px_0_#f1b8b8,0_8px_13px_rgba(185,28,28,0.10),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-150 hover:-translate-y-0.5 hover:border-red-500 hover:bg-[linear-gradient(180deg,#fff8f8,#ffdcdc)] hover:text-red-700 active:translate-y-[3px] active:shadow-[0_1px_0_#dfa2a2,0_3px_6px_rgba(185,28,28,0.09),inset_0_1px_3px_rgba(185,28,28,0.07)]"');

source = source.replace(
'className="scroll-mt-24 overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[1px]" style={{ borderColor: \'rgba(148,163,184,0.28)\', background: \'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.94))\', boxShadow: \'0 10px 28px rgba(15,23,42,0.055), inset 0 1px 0 rgba(255,255,255,0.96)\' }}',
'className="scroll-mt-24 overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[2px]" style={{ borderColor: \'rgba(83,112,140,0.38)\', background: \'linear-gradient(145deg, rgba(255,255,255,0.99), rgba(246,249,252,0.97))\', boxShadow: \'0 8px 0 rgba(23,57,95,0.08), 0 18px 32px rgba(15,23,42,0.08), inset 0 2px 0 rgba(255,255,255,1), inset 0 -2px 6px rgba(23,57,95,0.05)\' }}');

source = source.replace(
'className="group relative flex w-full items-center justify-between gap-4 overflow-hidden p-4 text-right transition hover:bg-white/30 sm:p-5"',
'className="group relative flex w-full items-center justify-between gap-4 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,251,0.86))] p-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(23,57,95,0.04)] transition hover:bg-white sm:p-5"');

source = source.replace(
'className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] border bg-white/85 transition duration-300 group-hover:scale-[1.04]"',
'className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] border bg-white/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04]"');

source = source.replace(
'<Badge variant="outline" className="rounded-xl px-3 py-1">{group.count.toLocaleString(\'ar-SA\')}</Badge><div className="grid h-9 w-9 place-items-center rounded-xl border bg-background">',
'<Badge variant="outline" className="rounded-xl border-[#8fa6b8] bg-[linear-gradient(180deg,#ffffff,#e9f0f5)] px-3 py-1.5 font-black text-[#17395f] shadow-[0_4px_0_#c3d0da,0_7px_10px_rgba(15,42,70,0.10),inset_0_1px_0_#fff]">{group.count.toLocaleString(\'ar-SA\')}</Badge><div className="grid h-10 w-10 place-items-center rounded-xl border border-[#6d879d] bg-[linear-gradient(180deg,#ffffff,#e7eef4)] text-[#17395f] shadow-[0_5px_0_#bbc8d2,0_8px_12px_rgba(15,42,70,0.11),inset_0_1px_0_#fff] transition-all duration-150 group-active:translate-y-[3px] group-active:shadow-[0_1px_0_#a6b5c1,0_3px_6px_rgba(15,42,70,0.08)]">');

fs.writeFileSync(path, source);
console.log('Applied Soft 3D styling to asset cards and group controls');
