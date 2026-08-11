const fs = require('fs');

const pages = [
  'src/app/pages/AddDeedPage.tsx',
  'src/app/pages/AddAllocatedLandPage.tsx',
  'src/app/pages/AddDeliveredLandPage.tsx',
  'src/app/pages/AddLeasedLandOutPage.tsx',
  'src/app/pages/AddLeasedLandInPage.tsx',
  'src/app/pages/AddLeasedBuildingOutPage.tsx',
  'src/app/pages/AddLeasedBuildingInPage.tsx',
  'src/app/pages/SiteInspectionFormPage.tsx',
];

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function ensureImport(source) {
  if (source.includes("SmartDocumentExtraction'")) return source;
  const anchor = "import { toast } from 'sonner';";
  if (!source.includes(anchor)) throw new Error('toast import anchor not found');
  return source.replace(anchor, `${anchor}\nimport { SmartDocumentExtraction } from '../components/SmartDocumentExtraction';`);
}
function insertBeforeFirstForm(source, moduleName, handlerName = 'applySmartExtraction') {
  const anchor = '\n      <form onSubmit=';
  if (!source.includes(anchor)) throw new Error(`form anchor not found for ${moduleName}`);
  return source.replace(anchor, `\n      <SmartDocumentExtraction module="${moduleName}" onApply={${handlerName}} />\n${anchor}`);
}
function addSetAndGetValues(source) {
  const compact = 'const { register, handleSubmit, formState: { errors } } = useForm<';
  if (source.includes(compact)) return source.replace(compact, 'const { register, handleSubmit, formState: { errors }, setValue, getValues } = useForm<');
  return source;
}

// Deed
{
  const path = pages[0];
  let s = ensureImport(read(path));
  if (!s.includes('    getValues,\n    watch,')) {
    s = s.replace('    setValue,\n    watch,', '    setValue,\n    getValues,\n    watch,');
  }
  const anchor = '\n\n  if (!isAdmin) {';
  if (!s.includes('const applySmartExtraction = React.useCallback') ) {
    if (!s.includes(anchor)) throw new Error('deed handler anchor not found');
    const handler = `\n\n  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {\n    const assign = (key: string, value: unknown) => {\n      if (value === null || value === undefined || String(value).trim() === '') return;\n      const current = getValues(key as any);\n      const empty = current === null || current === undefined || current === '' || (typeof current === 'number' && current === 0);\n      if (empty) setValue(key as any, value as any, { shouldDirty: true });\n    };\n    ['deedNumber', 'deedDate', 'propertyDescription', 'plotNumber', 'planNumber', 'area', 'location', 'region', 'city', 'district', 'usageType', 'notes'].forEach((key) => assign(key, fields[key]));\n    if (fields.deedDateType === 'hijri' || fields.deedDateType === 'gregorian') setDeedDateType(fields.deedDateType);\n    if (!coordinates) {\n      const latitude = Number(fields.latitude);\n      const longitude = Number(fields.longitude);\n      if (Number.isFinite(latitude) && Number.isFinite(longitude)) setCoordinates({ latitude, longitude });\n    }\n  }, [coordinates, getValues, setValue]);`;
    s = s.replace(anchor, handler + anchor);
  }
  s = insertBeforeFirstForm(s, 'deed');
  write(path, s);
}

// Allocated land
{
  const path = pages[1];
  let s = addSetAndGetValues(ensureImport(read(path)));
  const anchor = "\n  const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];";
  if (!s.includes('const applySmartExtraction = React.useCallback')) {
    if (!s.includes(anchor)) throw new Error('allocated handler anchor not found');
    const handler = `\n\n  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {\n    const assign = (key: string, value: unknown) => {\n      if (value === null || value === undefined || String(value).trim() === '') return;\n      const current = getValues(key as any);\n      const empty = current === null || current === undefined || current === '' || (typeof current === 'number' && current === 0);\n      if (empty || key === 'usageType') setValue(key as any, value as any, { shouldDirty: true });\n    };\n    ['propertyDescription', 'plotNumber', 'planNumber', 'area', 'usageType', 'region', 'city', 'district', 'googleEarthLink', 'notes'].forEach((key) => assign(key, fields[key]));\n    if (!coordinates.trim()) {\n      const direct = String(fields.coordinates || '').trim();\n      const latitude = Number(fields.latitude);\n      const longitude = Number(fields.longitude);\n      if (direct) setCoordinates(direct);\n      else if (Number.isFinite(latitude) && Number.isFinite(longitude)) setCoordinates(\`\${latitude.toFixed(6)}, \${longitude.toFixed(6)}\`);\n    }\n  }, [coordinates, getValues, setValue]);`;
    s = s.replace(anchor, handler + anchor);
  }
  s = insertBeforeFirstForm(s, 'allocated_land');
  write(path, s);
}

// Delivered land
{
  const path = pages[2];
  let s = addSetAndGetValues(ensureImport(read(path)));
  const anchor = '\n  return (\n    <div className="space-y-4 md:space-y-6">';
  if (!s.includes('const applySmartExtraction = React.useCallback')) {
    if (!s.includes(anchor)) throw new Error('delivered handler anchor not found');
    const handler = `\n\n  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {\n    const assign = (key: string, value: unknown) => {\n      if (value === null || value === undefined || String(value).trim() === '') return;\n      const current = getValues(key as any);\n      const empty = current === null || current === undefined || current === '' || (typeof current === 'number' && current === 0);\n      if (empty || key === 'deliveryDate') setValue(key as any, value as any, { shouldDirty: true });\n    };\n    ['recipientEntity', 'deliveryDate', 'propertyDescription', 'plotNumber', 'planNumber', 'area', 'location', 'deliveryMinutesNumber', 'notes'].forEach((key) => assign(key, fields[key]));\n    if (!coordinates.trim()) {\n      const direct = String(fields.coordinates || '').trim();\n      const latitude = Number(fields.latitude);\n      const longitude = Number(fields.longitude);\n      if (direct) setCoordinates(direct);\n      else if (Number.isFinite(latitude) && Number.isFinite(longitude)) setCoordinates(\`\${latitude.toFixed(6)}, \${longitude.toFixed(6)}\`);\n    }\n  }, [coordinates, getValues, setValue]);`;
    s = s.replace(anchor, handler + anchor);
  }
  s = insertBeforeFirstForm(s, 'delivered_land');
  write(path, s);
}

const contractConfigs = [
  { path: pages[3], module: 'leased_land_out', party: 'tenant', fields: ['contractNumber','contractDuration','plotNumber','planNumber','area','location','rentAmount','notes'] },
  { path: pages[4], module: 'leased_land_in', party: 'owner', fields: ['contractNumber','contractDuration','propertyDescription','area','location','rentAmount','notes'] },
  { path: pages[5], module: 'leased_building_out', party: 'tenant', fields: ['contractNumber','buildingNumber','planNumber','locationName','area','city','district','rentAmount','notes'] },
  { path: pages[6], module: 'leased_building_in', party: 'owner', fields: ['contractNumber','buildingNumber','locationName','area','region','city','rentAmount','notes'] },
];

for (const config of contractConfigs) {
  let s = addSetAndGetValues(ensureImport(read(config.path)));
  const anchor = '\n  return (\n    <div className="space-y-6">';
  if (!s.includes('const applySmartExtraction = React.useCallback')) {
    if (!s.includes(anchor)) throw new Error(`contract handler anchor not found: ${config.path}`);
    const fieldList = JSON.stringify(config.fields);
    const handler = `\n\n  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {\n    const assign = (key: string, value: unknown) => {\n      if (value === null || value === undefined || String(value).trim() === '') return;\n      const current = getValues(key as any);\n      const empty = current === null || current === undefined || current === '' || (typeof current === 'number' && current === 0);\n      if (empty) setValue(key as any, value as any, { shouldDirty: true });\n    };\n    ${fieldList}.forEach((key) => assign(key, fields[key]));\n    ['name', 'commercialRegistration', 'entityRepresentative', 'identityNumber', 'nationality', 'mobileNumber'].forEach((part) => assign('${config.party}.' + part, fields['${config.party}.' + part]));\n    setContractDates((current) => ({\n      ...current,\n      startDate: current.startDate || String(fields.contractStartDate || ''),\n      startDateType: current.startDate ? current.startDateType : (fields.contractStartDateType === 'hijri' ? 'hijri' : 'gregorian'),\n      endDate: current.endDate || String(fields.contractEndDate || ''),\n      endDateType: current.endDate ? current.endDateType : (fields.contractEndDateType === 'hijri' ? 'hijri' : 'gregorian'),\n    }));\n    if (!coordinates.trim()) {\n      const direct = String(fields.coordinates || '').trim();\n      const latitude = Number(fields.latitude);\n      const longitude = Number(fields.longitude);\n      if (direct) setCoordinates(direct);\n      else if (Number.isFinite(latitude) && Number.isFinite(longitude)) setCoordinates(\`\${latitude.toFixed(6)}, \${longitude.toFixed(6)}\`);\n    }\n  }, [coordinates, getValues, setValue]);`;
    s = s.replace(anchor, handler + anchor);
  }
  s = insertBeforeFirstForm(s, config.module);
  write(config.path, s);
}

// Site inspection form
{
  const path = pages[7];
  let s = ensureImport(read(path));
  const anchor = '\n  if (loading) {';
  if (!s.includes('const applySmartExtraction = React.useCallback')) {
    if (!s.includes(anchor)) throw new Error('site inspection handler anchor not found');
    const handler = `\n\n  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {\n    setForm((current) => {\n      const next = { ...current } as any;\n      const alwaysApply = new Set(['siteType', 'visitDate', 'visitDateType', 'followUpDate', 'followUpDateType', 'region']);\n      const keys = ['title', 'siteType', 'siteName', 'visitDate', 'visitDateType', 'visitPurpose', 'inspectorName', 'accompanyingEntity', 'region', 'city', 'district', 'locationDescription', 'deedNumber', 'plotNumber', 'planNumber', 'latitude', 'longitude', 'observations', 'recommendedAction', 'referredEntity', 'followUpDate', 'followUpDateType'];\n      keys.forEach((key) => {\n        const value = fields[key];\n        if (value === null || value === undefined || String(value).trim() === '') return;\n        const existing = next[key];\n        const empty = existing === null || existing === undefined || existing === '';\n        if (empty || alwaysApply.has(key)) next[key] = value;\n      });\n      return next;\n    });\n  }, []);`;
    s = s.replace(anchor, handler + anchor);
  }
  const cardAnchor = '\n      <Card className="w-full min-w-0 overflow-hidden">';
  if (!s.includes('<SmartDocumentExtraction module="site_inspection"')) {
    if (!s.includes(cardAnchor)) throw new Error('site inspection UI anchor not found');
    s = s.replace(cardAnchor, '\n      <SmartDocumentExtraction module="site_inspection" onApply={applySmartExtraction} />\n' + cardAnchor);
  }
  write(path, s);
}

console.log('Applied reusable smart extraction to:', pages.join(', '));
