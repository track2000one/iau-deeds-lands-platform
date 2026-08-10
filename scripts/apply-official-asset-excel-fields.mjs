import fs from 'node:fs';

const componentPath = 'src/app/components/AssetOfficialTemplateFields.tsx';
let component = fs.readFileSync(componentPath, 'utf8');
component = component
  .replace("<AppDateField label=\"تاريخ الدخول في الخدمة\" value={value.serviceDate || ''} dateType={value.serviceDateType || 'gregorian'} onChange={(date) => setField('serviceDate', date)} onTypeChange={(type) => setField('serviceDateType', type)} />", "<AppDateField id=\"asset-official-service-date\" label=\"تاريخ الدخول في الخدمة\" value={String(value.serviceDate || '')} dateType={value.serviceDateType || 'gregorian'} onValueChange={(date) => setField('serviceDate', date)} onDateTypeChange={(type) => setField('serviceDateType', type)} />")
  .replace("<AppDateField label=\"تاريخ الاقتناء\" value={value.purchaseDate || ''} dateType={value.purchaseDateType || 'gregorian'} onChange={(date) => setField('purchaseDate', date)} onTypeChange={(type) => setField('purchaseDateType', type)} />", "<AppDateField id=\"asset-official-purchase-date\" label=\"تاريخ الاقتناء\" value={String(value.purchaseDate || '')} dateType={value.purchaseDateType || 'gregorian'} onValueChange={(date) => setField('purchaseDate', date)} onDateTypeChange={(type) => setField('purchaseDateType', type)} />")
  .replace("<AppDateField label=\"تاريخ التحقق الميداني\" value={value.lastInventoryDate || ''} dateType={value.lastInventoryDateType || 'gregorian'} onChange={(date) => setField('lastInventoryDate', date)} onTypeChange={(type) => setField('lastInventoryDateType', type)} />", "<AppDateField id=\"asset-official-inventory-date\" label=\"تاريخ التحقق الميداني\" value={String(value.lastInventoryDate || '')} dateType={value.lastInventoryDateType || 'gregorian'} onValueChange={(date) => setField('lastInventoryDate', date)} onDateTypeChange={(type) => setField('lastInventoryDateType', type)} />");
fs.writeFileSync(componentPath, component);

const addPath = 'src/app/pages/AddAssetPage.tsx';
let add = fs.readFileSync(addPath, 'utf8');
if (!add.includes("AssetOfficialTemplateFields")) {
  add = add.replace("import { AppDateField } from '../components/AppDateField';", "import { AppDateField } from '../components/AppDateField';\nimport { AssetOfficialTemplateFields } from '../components/AssetOfficialTemplateFields';");
}
if (!add.includes("excelPayload: { templateType: 'ppe' }")) {
  add = add.replace("  attachments: [],\n};", "  attachments: [],\n  excelPayload: { templateType: 'ppe' },\n};");
}
if (!add.includes("<AssetOfficialTemplateFields value={form}")) {
  const titleIndex = add.indexOf('المرفقات والوثائق');
  if (titleIndex < 0) throw new Error('AddAssetPage attachments marker not found');
  const cardIndex = add.lastIndexOf('      <Card className=', titleIndex);
  if (cardIndex < 0) throw new Error('AddAssetPage attachment card start not found');
  add = add.slice(0, cardIndex) + "      <AssetOfficialTemplateFields value={form} onChange={setForm} />\n\n" + add.slice(cardIndex);
}
fs.writeFileSync(addPath, add);

const editPath = 'src/app/pages/EditAssetPage.tsx';
let edit = fs.readFileSync(editPath, 'utf8');
if (!edit.includes("AssetOfficialTemplateFields")) {
  edit = edit.replace("import { AppDateField } from '../components/AppDateField';", "import { AppDateField } from '../components/AppDateField';\nimport { AssetOfficialTemplateFields } from '../components/AssetOfficialTemplateFields';");
}
if (!edit.includes("excelPayload: { templateType: 'ppe' }")) {
  edit = edit.replace("purchaseValue: null, notes: '', attachments: [],\n};", "purchaseValue: null, notes: '', attachments: [], excelPayload: { templateType: 'ppe' },\n};");
}
const oldSetForm = `        setForm({
          itemNumber: asset.itemNumber || asset.assetNumber || '', barcode: asset.barcode || '', name: asset.name, category: asset.category, brand: asset.brand || '', model: asset.model || '',
          serialNumber: asset.serialNumber || '', status: asset.status, department: asset.department || '', building: asset.building || '',
          floor: asset.floor || '', room: asset.room || '',
          purchaseDate: normalizeFlexibleDateForInput(asset.purchaseDate, asset.purchaseDateType || 'gregorian'), purchaseDateType: asset.purchaseDateType || 'gregorian', purchaseValue: asset.purchaseValue ?? null,
          notes: asset.notes || '', attachments: asset.attachments || [],
        });`;
const newSetForm = `        setForm({
          itemNumber: asset.itemNumber || asset.assetNumber || '', barcode: asset.barcode || '', name: asset.name, category: asset.category, brand: asset.brand || '', model: asset.model || '',
          serialNumber: asset.serialNumber || '', status: asset.status, technicalCondition: asset.technicalCondition || '', department: asset.department || '', building: asset.building || '',
          floor: asset.floor || '', room: asset.room || '', entityName: asset.entityName || '', entityCode: asset.entityCode || '', assetDescription: asset.assetDescription || '', cardNumber: asset.cardNumber || '',
          responsibleDepartment: asset.responsibleDepartment || asset.department || '', region: asset.region || '', city: asset.city || '', buildingNumber: asset.buildingNumber || asset.building || '', coordinates: asset.coordinates || '',
          classification1: asset.classification1 || '', classification2: asset.classification2 || '', classification3: asset.classification3 || '', classification4: asset.classification4 || '', classification5: asset.classification5 || '', classification6: asset.classification6 || '',
          accountingGroup: asset.accountingGroup || '', accountingGroupCode: asset.accountingGroupCode || '', assetCode: asset.assetCode || '', remainingLife: asset.remainingLife ?? null, usefulLife: asset.usefulLife ?? null,
          purchaseDate: normalizeFlexibleDateForInput(asset.purchaseDate, asset.purchaseDateType || 'gregorian'), purchaseDateType: asset.purchaseDateType || 'gregorian', purchaseValue: asset.purchaseValue ?? null,
          serviceDate: normalizeFlexibleDateForInput(asset.serviceDate, asset.serviceDateType || 'gregorian'), serviceDateType: asset.serviceDateType || 'gregorian', acquisitionCost: asset.acquisitionCost ?? asset.purchaseValue ?? null,
          supportingCostDocument: asset.supportingCostDocument || '', archiveDocumentNumber: asset.archiveDocumentNumber || '', manufacturer: asset.manufacturer || '',
          lastInventoryDate: normalizeFlexibleDateForInput(asset.lastInventoryDate, asset.lastInventoryDateType || 'gregorian'), lastInventoryDateType: asset.lastInventoryDateType || 'gregorian',
          unitOfMeasure: asset.unitOfMeasure || '', quantity: asset.quantity ?? 1, excelPayload: asset.excelPayload || { templateType: 'ppe' },
          notes: asset.notes || '', attachments: asset.attachments || [],
        });`;
if (edit.includes(oldSetForm)) edit = edit.replace(oldSetForm, newSetForm);
else if (!edit.includes('technicalCondition: asset.technicalCondition')) throw new Error('EditAssetPage setForm marker not found');

if (!edit.includes("<AssetOfficialTemplateFields value={form}")) {
  const titleIndex = edit.indexOf('المرفقات والوثائق');
  if (titleIndex < 0) throw new Error('EditAssetPage attachments marker not found');
  const cardIndex = edit.lastIndexOf('      <Card className=', titleIndex);
  if (cardIndex < 0) throw new Error('EditAssetPage attachment card start not found');
  edit = edit.slice(0, cardIndex) + "      <AssetOfficialTemplateFields value={form} onChange={setForm} />\n\n" + edit.slice(cardIndex);
}
fs.writeFileSync(editPath, edit);

console.log('Official Excel asset fields applied to add/edit forms.');
// trigger 2026-08-10T13:50+03:00
