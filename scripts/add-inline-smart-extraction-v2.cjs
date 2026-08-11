const fs = require('fs');

const targets = [
  {
    path: 'src/app/pages/AllocatedLandsPage.tsx',
    module: 'allocated_land',
    formId: 'allocated-land-form',
    scalarPairs: [
      ['propertyDescription','propertyDescription'],['plotNumber','plotNumber'],['planNumber','planNumber'],['area','area'],['usageType','usageType'],['region','region'],['city','city'],['district','district'],['googleEarthLink','googleEarthLink'],['notes','notes'],
    ],
  },
  {
    path: 'src/app/pages/DeliveredLandsPage.tsx',
    module: 'delivered_land',
    formId: 'delivered-land-form',
    scalarPairs: [
      ['receiptNumber','deliveryMinutesNumber'],['receiptDate','deliveryDate'],['receiptDateType','deliveryDateType'],['deliveringEntity','deliveringEntity'],['recipientEntity','recipientEntity'],['landName','propertyDescription'],['description','propertyDescription'],['region','region'],['city','city'],['district','district'],['plotNumber','plotNumber'],['planNumber','planNumber'],['area','area'],['usageType','usageType'],['location','location'],['notes','notes'],
    ],
  },
  {
    path: 'src/app/pages/LeasedLandsOutPage.tsx',
    module: 'leased_land_out',
    formId: 'leased-land-out-form',
    partyStateKey: 'tenant',
    partyOutputPrefix: 'tenant',
    scalarPairs: [
      ['contractNumber','contractNumber'],['contractStartDate','contractStartDate'],['contractStartDateType','contractStartDateType'],['contractDuration','contractDuration'],['plotNumber','plotNumber'],['planNumber','planNumber'],['area','area'],['location','location'],['rentAmount','rentAmount'],['notes','notes'],
    ],
  },
  {
    path: 'src/app/pages/LeasedLandsInPage.tsx',
    module: 'leased_land_in',
    formId: 'leased-land-in-form',
    partyStateKey: 'owner',
    partyOutputPrefix: 'owner',
    scalarPairs: [
      ['contractNumber','contractNumber'],['contractStartDate','contractStartDate'],['contractStartDateType','contractStartDateType'],['contractDuration','contractDuration'],['plotNumber','plotNumber'],['planNumber','planNumber'],['area','area'],['location','location'],['rentAmount','rentAmount'],['notes','notes'],
    ],
  },
  {
    path: 'src/app/pages/LeasedBuildingsOutPage.tsx',
    module: 'leased_building_out',
    buildingForm: true,
    partyStateKey: 'party',
    partyOutputPrefix: 'tenant',
    scalarPairs: [
      ['contractNumber','contractNumber'],['buildingNumber','buildingNumber'],['planNumber','planNumber'],['locationName','locationName'],['area','area'],['region','region'],['city','city'],['district','district'],['rentAmount','rentAmount'],['notes','notes'],
    ],
  },
  {
    path: 'src/app/pages/LeasedBuildingsInPage.tsx',
    module: 'leased_building_in',
    buildingForm: true,
    partyStateKey: 'party',
    partyOutputPrefix: 'owner',
    scalarPairs: [
      ['contractNumber','contractNumber'],['buildingNumber','buildingNumber'],['planNumber','planNumber'],['locationName','locationName'],['area','area'],['region','region'],['city','city'],['district','district'],['rentAmount','rentAmount'],['notes','notes'],
    ],
  },
];

const partyParts = ['name','commercialRegistration','entityRepresentative','identityNumber','nationality','mobileNumber'];

function addImport(source) {
  if (source.includes("from '../components/SmartDocumentExtraction'")) return source;
  const marker = "import { AttachmentPreviewGrid } from '../components/AttachmentPreview';";
  if (!source.includes(marker)) throw new Error('AttachmentPreview import marker not found');
  return source.replace(marker, `${marker}\nimport { SmartDocumentExtraction } from '../components/SmartDocumentExtraction';`);
}

function makeApply(target) {
  const scalarLines = target.scalarPairs.map(([stateKey, outputKey]) => `      assign('${stateKey}', fields['${outputKey}']);`).join('\n');
  const nested = target.partyStateKey ? `
      const partyKey = '${target.partyStateKey}';
      const partyOutputPrefix = '${target.partyOutputPrefix}';
      next[partyKey] = { ...(current as any)[partyKey] };
      ${JSON.stringify(partyParts)}.forEach((part) => {
        const value = fields[partyOutputPrefix + '.' + part];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[partyKey]?.[part];
        const initial = (emptyForm as any)[partyKey]?.[part];
        if (!existing || (formMode === 'add' && existing === initial)) next[partyKey][part] = String(value);
      });` : '';
  return `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current: any) => {
      const next: any = { ...current };
      const assign = (key: string, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const initial = (emptyForm as any)[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        if (empty || (formMode === 'add' && existing === initial)) next[key] = String(value);
      };
${scalarLines}${nested}
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || (formMode === 'add' && next.latitude === (emptyForm as any).latitude)) && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || (formMode === 'add' && next.longitude === (emptyForm as any).longitude)) && Number.isFinite(longitude)) next.longitude = String(longitude);
      const directCoordinates = String(fields.coordinates || '').trim();
      if (directCoordinates && (!next.latitude || !next.longitude)) {
        const parsed = parseCoordinates(directCoordinates);
        if (parsed) {
          next.latitude = String(parsed.latitude);
          next.longitude = String(parsed.longitude);
        }
      }
      return next;
    });
  }, [formMode]);

`;
}

function insertInlineComponent(source, target) {
  if (!target.buildingForm) {
    const formMarker = `id="${target.formId}"`;
    const formIndex = source.indexOf(formMarker);
    if (formIndex < 0) throw new Error(`form marker not found in ${target.path}`);
    const spaceMarker = '<div className="space-y-6">';
    const spaceIndex = source.indexOf(spaceMarker, formIndex);
    if (spaceIndex < 0) throw new Error(`space marker not found in ${target.path}`);
    const insertAt = spaceIndex + spaceMarker.length;
    return source.slice(0, insertAt) + `\n            <SmartDocumentExtraction module="${target.module}" onApply={applySmartExtraction} />\n` + source.slice(insertAt);
  }

  const blockStart = '      {formOpen && (\n        <BuildingForm';
  const startIndex = source.indexOf(blockStart);
  if (startIndex < 0) throw new Error(`BuildingForm block not found in ${target.path}`);
  const closing = '        />\n      )}';
  const closeIndex = source.indexOf(closing, startIndex);
  if (closeIndex < 0) throw new Error(`BuildingForm closing not found in ${target.path}`);
  const blockEnd = closeIndex + closing.length;
  const oldBlock = source.slice(startIndex, blockEnd);
  const buildingForm = oldBlock.replace('      {formOpen && (\n        <BuildingForm', '          <BuildingForm').replace(/\n      \)\}$/, '');
  const newBlock = `      {formOpen && (\n        <div className="space-y-4">\n          <SmartDocumentExtraction module="${target.module}" onApply={applySmartExtraction} />\n${buildingForm}\n        </div>\n      )}`;
  return source.slice(0, startIndex) + newBlock + source.slice(blockEnd);
}

for (const target of targets) {
  let source = fs.readFileSync(target.path, 'utf8');
  if (source.includes(`<SmartDocumentExtraction module="${target.module}"`)) {
    console.log(`Already patched ${target.path}`);
    continue;
  }
  source = addImport(source);
  const openAddMarker = '  const openAddForm = () => {';
  if (!source.includes(openAddMarker)) throw new Error(`openAddForm marker not found in ${target.path}`);
  source = source.replace(openAddMarker, makeApply(target) + openAddMarker);
  source = insertInlineComponent(source, target);
  fs.writeFileSync(target.path, source);
  console.log(`Patched ${target.path}`);
}
