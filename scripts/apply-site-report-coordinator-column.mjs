import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(before, after);
};

replaceOnce(
  "type SitePrintColumnKey = 'name' | 'type' | 'building' | 'location' | 'cityDistrict' | 'area' | 'capacity' | 'imam' | 'muezzin' | 'khateeb' | 'contactPhone' | 'coordinates' | 'status' | 'notes';",
  "type SitePrintColumnKey = 'name' | 'type' | 'building' | 'location' | 'cityDistrict' | 'area' | 'capacity' | 'imam' | 'muezzin' | 'khateeb' | 'coordinatorName' | 'contactPhone' | 'coordinates' | 'status' | 'notes';",
  'SitePrintColumnKey coordinatorName',
);

replaceOnce(
  "  { key: 'khateeb', label: 'الخطيب' },\n  { key: 'contactPhone', label: 'رقم التواصل' },",
  "  { key: 'khateeb', label: 'الخطيب' },\n  { key: 'coordinatorName', label: 'اسم المنسق' },\n  { key: 'contactPhone', label: 'رقم التواصل' },",
  'SITE_PRINT_COLUMNS coordinatorName',
);

replaceOnce(
  "      khateeb: 1.05,\n      contactPhone: 0.9,",
  "      khateeb: 1.05,\n      coordinatorName: 1.15,\n      contactPhone: 0.9,",
  'compactWeights coordinatorName',
);

replaceOnce(
  "      if (key === 'khateeb') return site.khateebName || '-';\n      if (key === 'contactPhone') return site.contactPhone || '-';",
  "      if (key === 'khateeb') return site.khateebName || '-';\n      if (key === 'coordinatorName') return site.coordinatorName || '-';\n      if (key === 'contactPhone') return site.contactPhone || '-';",
  'columnValue coordinatorName',
);

fs.writeFileSync(file, source);
console.log('Site report coordinator column patch applied successfully.');
