import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const tabsStart = '      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">';
const tabsContentStart = '        <TabsContent value="overview" className="space-y-4">';
const statsStart = '      {role === \'head\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">';

const startIndex = source.indexOf(tabsStart);
const contentIndex = source.indexOf(tabsContentStart, startIndex);
const statsIndex = source.indexOf(statsStart);

if (startIndex < 0 || contentIndex < 0 || statsIndex < 0) {
  throw new Error('Could not locate mosque unit navigation/statistics blocks');
}

if (startIndex < statsIndex) {
  console.log('Mosque unit navigation is already above the statistics cards. No changes needed.');
  process.exit(0);
}

const navBlock = source.slice(startIndex, contentIndex);
source = source.slice(0, startIndex) + source.slice(contentIndex);

const refreshedStatsIndex = source.indexOf(statsStart);
if (refreshedStatsIndex < 0) throw new Error('Statistics block disappeared during patch');

source = source.slice(0, refreshedStatsIndex) + navBlock + source.slice(refreshedStatsIndex);
source = source.replace(
  '{/* STICKY_UNIT_NAV_V1: keep unit navigation visible while scrolling on desktop and mobile. */}',
  '{/* STICKY_UNIT_NAV_V2: navigation stays above KPI cards and remains visible while scrolling on desktop and mobile. */}',
);

fs.writeFileSync(file, source);
console.log('Moved mosque unit navigation above statistics cards.');
