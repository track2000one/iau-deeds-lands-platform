const fs = require('fs');

const targets = [
  {
    path: 'src/app/pages/AllocatedLandsPage.tsx',
    formId: 'allocated-land-form',
    module: 'allocated_land',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current };
      const canReplace = (key: keyof AllocatedLandFormState, value: unknown) => {
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        return empty || (formMode === 'add' && existing === initial);
      };
      const assign = (key: keyof AllocatedLandFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '' || !canReplace(key, value)) return;
        (next as any)[key] = String(value);
      };
      ['propertyDescription', 'plotNumber', 'planNumber', 'area', 'usageType', 'region', 'city', 'district', 'googleEarthLink', 'notes'].forEach((key) => assign(key as keyof AllocatedLandFormState, fields[key]));
      const directCoordinates = String(fields.coordinates || '').trim();
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || (formMode === 'add' && next.latitude === emptyForm.latitude)) && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || (formMode === 'add' && next.longitude === emptyForm.longitude)) && Number.isFinite(longitude)) next.longitude = String(longitude);
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

`,
  },
  {
    path: 'src/app/pages/DeliveredLandsPage.tsx',
    formId: 'delivered-land-form',
    module: 'delivered_land',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current };
      const canReplace = (key: keyof DeliveredLandFormState) => {
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        return empty || (formMode === 'add' && existing === initial);
      };
      const assign = (key: keyof DeliveredLandFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '' || !canReplace(key)) return;
        (next as any)[key] = value;
      };
      assign('receiptNumber', fields.deliveryMinutesNumber ?? fields.receiptNumber);
      assign('receiptDate', fields.deliveryDate ?? fields.receiptDate);
      assign('receiptDateType', fields.deliveryDateType ?? fields.receiptDateType);
      assign('deliveringEntity', fields.deliveringEntity);
      assign('recipientEntity', fields.recipientEntity);
      assign('landName', fields.landName ?? fields.propertyDescription);
      assign('description', fields.description ?? fields.propertyDescription);
      assign('region', fields.region);
      assign('city', fields.city);
      assign('district', fields.district);
      assign('plotNumber', fields.plotNumber);
      assign('planNumber', fields.planNumber);
      assign('area', fields.area);
      assign('usageType', fields.usageType);
      assign('location', fields.location);
      assign('notes', fields.notes);
      const directCoordinates = String(fields.coordinates || '').trim();
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if (canReplace('latitude') && Number.isFinite(latitude)) next.latitude = String(latitude);
      if (canReplace('longitude') && Number.isFinite(longitude)) next.longitude = String(longitude);
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

`,
  },
  {
    path: 'src/app/pages/LeasedLandsOutPage.tsx',
    formId: 'leased-land-out-form',
    module: 'leased_land_out',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current, tenant: { ...current.tenant } };
      const assign = (key: keyof LeasedLandOutFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        if (empty || (formMode === 'add' && existing === initial)) (next as any)[key] = String(value);
      };
      ['contractNumber', 'contractStartDate', 'contractDuration', 'plotNumber', 'planNumber', 'area', 'location', 'rentAmount', 'notes'].forEach((key) => assign(key as keyof LeasedLandOutFormState, fields[key]));
      if (fields.contractStartDateType === 'hijri' || fields.contractStartDateType === 'gregorian') {
        if (!next.contractStartDate || formMode === 'add') next.contractStartDateType = fields.contractStartDateType as DateType;
      }
      ['name', 'commercialRegistration', 'entityRepresentative', 'identityNumber', 'nationality', 'mobileNumber'].forEach((part) => {
        const value = fields['tenant.' + part];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = (next.tenant as any)[part];
        if (!existing || (formMode === 'add' && existing === (emptyParty as any)[part])) (next.tenant as any)[part] = String(value);
      });
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || formMode === 'add') && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || formMode === 'add') && Number.isFinite(longitude)) next.longitude = String(longitude);
      const directCoordinates = String(fields.coordinates || '').trim();
      if (directCoordinates && (!next.latitude || !next.longitude)) {
        const parsed = parseCoordinates(directCoordinates);
        if (parsed) { next.latitude = String(parsed.latitude); next.longitude = String(parsed.longitude); }
      }
      return next;
    });
  }, [formMode]);

`,
  },
  {
    path: 'src/app/pages/LeasedLandsInPage.tsx',
    formId: 'leased-land-in-form',
    module: 'leased_land_in',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current, owner: { ...current.owner } };
      const assign = (key: keyof LeasedLandInFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        if (empty || (formMode === 'add' && existing === initial)) (next as any)[key] = String(value);
      };
      ['contractNumber', 'contractStartDate', 'contractDuration', 'plotNumber', 'planNumber', 'area', 'location', 'rentAmount', 'notes'].forEach((key) => assign(key as keyof LeasedLandInFormState, fields[key]));
      if (fields.contractStartDateType === 'hijri' || fields.contractStartDateType === 'gregorian') {
        if (!next.contractStartDate || formMode === 'add') next.contractStartDateType = fields.contractStartDateType as DateType;
      }
      ['name', 'commercialRegistration', 'entityRepresentative', 'identityNumber', 'nationality', 'mobileNumber'].forEach((part) => {
        const value = fields['owner.' + part];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = (next.owner as any)[part];
        if (!existing || (formMode === 'add' && existing === (emptyParty as any)[part])) (next.owner as any)[part] = String(value);
      });
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || formMode === 'add') && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || formMode === 'add') && Number.isFinite(longitude)) next.longitude = String(longitude);
      const directCoordinates = String(fields.coordinates || '').trim();
      if (directCoordinates && (!next.latitude || !next.longitude)) {
        const parsed = parseCoordinates(directCoordinates);
        if (parsed) { next.latitude = String(parsed.latitude); next.longitude = String(parsed.longitude); }
      }
      return next;
    });
  }, [formMode]);

`,
  },
  {
    path: 'src/app/pages/LeasedBuildingsOutPage.tsx',
    formId: 'leased-building-out-form',
    module: 'leased_building_out',
    partyPrefix: 'tenant',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current, party: { ...current.party } };
      const assign = (key: keyof BuildingFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        if (empty || (formMode === 'add' && existing === initial)) (next as any)[key] = String(value);
      };
      ['contractNumber', 'buildingNumber', 'planNumber', 'locationName', 'area', 'region', 'city', 'district', 'rentAmount', 'notes'].forEach((key) => assign(key as keyof BuildingFormState, fields[key]));
      ['name', 'commercialRegistration', 'entityRepresentative', 'identityNumber', 'nationality', 'mobileNumber'].forEach((part) => {
        const value = fields['tenant.' + part];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = (next.party as any)[part];
        if (!existing || (formMode === 'add' && existing === (emptyParty as any)[part])) (next.party as any)[part] = String(value);
      });
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || formMode === 'add') && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || formMode === 'add') && Number.isFinite(longitude)) next.longitude = String(longitude);
      const directCoordinates = String(fields.coordinates || '').trim();
      if (directCoordinates && (!next.latitude || !next.longitude)) {
        const parsed = parseCoordinates(directCoordinates);
        if (parsed) { next.latitude = String(parsed.latitude); next.longitude = String(parsed.longitude); }
      }
      return next;
    });
  }, [formMode]);

`,
  },
  {
    path: 'src/app/pages/LeasedBuildingsInPage.tsx',
    formId: 'leased-building-in-form',
    module: 'leased_building_in',
    partyPrefix: 'owner',
    apply: `  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current, party: { ...current.party } };
      const assign = (key: keyof BuildingFormState, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const initial = emptyForm[key];
        const empty = existing === null || existing === undefined || String(existing).trim() === '';
        if (empty || (formMode === 'add' && existing === initial)) (next as any)[key] = String(value);
      };
      ['contractNumber', 'buildingNumber', 'planNumber', 'locationName', 'area', 'region', 'city', 'district', 'rentAmount', 'notes'].forEach((key) => assign(key as keyof BuildingFormState, fields[key]));
      ['name', 'commercialRegistration', 'entityRepresentative', 'identityNumber', 'nationality', 'mobileNumber'].forEach((part) => {
        const value = fields['owner.' + part];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = (next.party as any)[part];
        if (!existing || (formMode === 'add' && existing === (emptyParty as any)[part])) (next.party as any)[part] = String(value);
      });
      const latitude = Number(fields.latitude);
      const longitude = Number(fields.longitude);
      if ((!next.latitude || formMode === 'add') && Number.isFinite(latitude)) next.latitude = String(latitude);
      if ((!next.longitude || formMode === 'add') && Number.isFinite(longitude)) next.longitude = String(longitude);
      const directCoordinates = String(fields.coordinates || '').trim();
      if (directCoordinates && (!next.latitude || !next.longitude)) {
        const parsed = parseCoordinates(directCoordinates);
        if (parsed) { next.latitude = String(parsed.latitude); next.longitude = String(parsed.longitude); }
      }
      return next;
    });
  }, [formMode]);

`,
  },
];

function addImport(source) {
  if (source.includes("from '../components/SmartDocumentExtraction'")) return source;
  const marker = "import { AttachmentPreviewGrid } from '../components/AttachmentPreview';";
  if (!source.includes(marker)) throw new Error('AttachmentPreview import marker not found');
  return source.replace(marker, `${marker}\nimport { SmartDocumentExtraction } from '../components/SmartDocumentExtraction';`);
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
  source = source.replace(openAddMarker, target.apply + openAddMarker);

  const formMarker = `id="${target.formId}"`;
  const formIndex = source.indexOf(formMarker);
  if (formIndex < 0) throw new Error(`form id marker not found in ${target.path}`);
  const spaceMarker = '<div className="space-y-6">';
  const spaceIndex = source.indexOf(spaceMarker, formIndex);
  if (spaceIndex < 0) throw new Error(`form space marker not found in ${target.path}`);
  const insertAt = spaceIndex + spaceMarker.length;
  const component = `\n            <SmartDocumentExtraction module="${target.module}" onApply={applySmartExtraction} />\n`;
  source = source.slice(0, insertAt) + component + source.slice(insertAt);

  fs.writeFileSync(target.path, source);
  console.log(`Patched ${target.path}`);
}
