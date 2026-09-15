import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const startOld = `      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">\n        <div className="relative overflow-hidden rounded-2xl border border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 shadow-[0_10px_28px_rgba(5,150,105,0.10),0_0_0_1px_rgba(16,185,129,0.08),0_0_24px_rgba(45,212,191,0.12)] ring-1 ring-emerald-100/80 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-emerald-300/60 before:opacity-35 before:content-[''] before:animate-pulse motion-reduce:before:animate-none sm:hidden">`;

const startNew = `      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">\n        {/* STICKY_UNIT_NAV_V1: keep unit navigation visible while scrolling on desktop and mobile. */}\n        <div className="sticky top-0 z-40 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/85">\n          <div className="relative overflow-hidden rounded-2xl border border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 shadow-[0_10px_28px_rgba(5,150,105,0.10),0_0_0_1px_rgba(16,185,129,0.08),0_0_24px_rgba(45,212,191,0.12)] ring-1 ring-emerald-100/80 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-emerald-300/60 before:opacity-35 before:content-[''] before:animate-pulse motion-reduce:before:animate-none sm:hidden">`;

if (!source.includes(startOld)) {
  if (source.includes('STICKY_UNIT_NAV_V1')) {
    console.log('Sticky unit navigation already applied.');
    process.exit(0);
  }
  throw new Error('Could not find Tabs navigation start block.');
}
source = source.replace(startOld, startNew);

const endOld = `        </TabsList>\n\n        <TabsContent value="overview" className="space-y-4">`;
const endNew = `        </TabsList>\n        </div>\n\n        <TabsContent value="overview" className="space-y-4">`;
if (!source.includes(endOld)) throw new Error('Could not find Tabs navigation end block.');
source = source.replace(endOld, endNew);

source = source.replace(
  `        <TabsList className="hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2 sm:flex [&>[data-slot=tabs-trigger]]:min-w-max [&>[data-slot=tabs-trigger]]:flex-none">`,
  `        <TabsList className="hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-sky-200/80 bg-white/95 p-2 shadow-sm sm:flex [&>[data-slot=tabs-trigger]]:min-w-max [&>[data-slot=tabs-trigger]]:flex-none">`
);

fs.writeFileSync(file, source);
console.log('Applied sticky navigation for Mosques Unit tabs.');
