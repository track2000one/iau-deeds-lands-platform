import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';";
const importLine = "import { MosqueReportsCenter } from '../components/MosqueReportsCenter';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('MosqueFieldVisitsPanel import anchor not found');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const reportBlock = /\n\s*<TabsContent value="reports" className="space-y-4">[\s\S]*?<\/TabsContent>\n\n\s*<TabsContent value="team" className="space-y-4">/;
const replacement = `\n        <TabsContent value="reports" className="space-y-4">\n          <MosqueReportsCenter\n            sites={sites}\n            buildings={officialBuildings}\n            requests={requests}\n            tickets={tickets}\n            leaves={leaves}\n            jobs={jobs}\n            personnel={personnel}\n            quranInventoryItems={quranInventoryItems}\n            quranStockDashboard={quranStockDashboard}\n            canPrint={canPrint}\n          />\n        </TabsContent>\n\n        <TabsContent value="team" className="space-y-4">`;

if (!source.includes('<MosqueReportsCenter')) {
  if (!reportBlock.test(source)) throw new Error('Reports TabsContent block not found');
  source = source.replace(reportBlock, replacement);
}

fs.writeFileSync(path, source);
console.log('Mosque reports center applied');
