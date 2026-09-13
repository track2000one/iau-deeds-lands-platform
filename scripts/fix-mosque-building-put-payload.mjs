import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('MOSQUE_BUILDING_PUT_PAYLOAD_FIX_V1')) {
  console.log('Mosque building PUT payload fix already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Patch anchor not found: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`  const saveBuilding = async () => {\n`,
`  // MOSQUE_BUILDING_PUT_PAYLOAD_FIX_V1\n  // The buildings endpoint uses PUT and requires buildingNumber even when only coverage fields change.\n  const saveBuilding = async () => {\n`,
  'fix marker',
);

replaceOnce(
`      await mosqueApi.updateBuilding(editingBuilding.id, {\n        expectedUsers: buildingForm.expectedUsers === '' ? null : Number(buildingForm.expectedUsers),\n`,
`      await mosqueApi.updateBuilding(editingBuilding.id, {\n        buildingNumber: editingBuilding.buildingNumber,\n        expectedUsers: buildingForm.expectedUsers === '' ? null : Number(buildingForm.expectedUsers),\n`,
  'building coverage form PUT payload',
);

replaceOnce(
`      await mosqueApi.updateBuilding(building.id, { coverageStatus: nextCoverageStatus });\n`,
`      await mosqueApi.updateBuilding(building.id, {\n        buildingNumber: building.buildingNumber,\n        coverageStatus: nextCoverageStatus,\n      });\n`,
  'no prayer room PUT payload',
);

replaceOnce(
`        try { await mosqueApi.updateBuilding(linkedBuilding.id, { coverageStatus: 'covered' }); }\n`,
`        try {\n          await mosqueApi.updateBuilding(linkedBuilding.id, {\n            buildingNumber: linkedBuilding.buildingNumber,\n            coverageStatus: 'covered',\n          });\n        }\n`,
  'automatic covered PUT payload',
);

fs.writeFileSync(path, source);
console.log('Fixed mosque building PUT payloads to always include buildingNumber.');
