import fs from 'node:fs';

const managerPath = 'src/app/components/BuildingExcelImportManager.tsx';
const registryPath = 'src/app/pages/CentralBuildingsRegistryPage.tsx';

const replaceOnce = (source, search, replacement, label) => {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(search, replacement);
};

let manager = fs.readFileSync(managerPath, 'utf8');

manager = replaceOnce(
  manager,
  "  onReload: () => Promise<void> | void;\n};",
  "  onReload: () => Promise<void> | void;\n  context?: 'mosque' | 'central';\n};",
  'manager props context',
);

manager = replaceOnce(
  manager,
  "export const BuildingExcelImportManager: React.FC<Props> = ({ buildings, role, canAdd, canEdit, canDelete, onReload }) => {\n  const inputRef",
  "export const BuildingExcelImportManager: React.FC<Props> = ({ buildings, role, canAdd, canEdit, canDelete, onReload, context = 'mosque' }) => {\n  const isCentral = context === 'central';\n  const inputRef",
  'manager context signature',
);

manager = manager.replace(
  "['الحرم', 'الموقع داخل الجامعة', 'الموقع داخل الجامعه', 'الموقع', 'campus', 'campus location', 'campus_location']",
  "['الحرم', 'الحرم / الموقع الجامعي', 'الحرم/الموقع الجامعي', 'الموقع الجامعي', 'الموقع داخل الجامعة', 'الموقع داخل الجامعه', 'الموقع', 'campus', 'campus location', 'campus_location']",
);

manager = replaceOnce(
  manager,
  "  if (!draft.buildingNumber) blockers.push('رقم المبنى');\n  if (draft.creationFeasibility",
  "  if (!draft.buildingNumber) blockers.push('رقم المبنى');\n  if (!draft.name) blockers.push('اسم المبنى');\n  if (draft.creationFeasibility",
  'approval requires name',
);

const templateStart = manager.indexOf('  const downloadTemplate = () => {');
const templateEnd = manager.indexOf('  const savePendingRows = async () => {', templateStart);
if (templateStart < 0 || templateEnd < 0) throw new Error('downloadTemplate block not found');
const newTemplate = `  const downloadTemplate = () => {\n    const headers = isCentral\n      ? ['رقم المبنى', 'اسم المبنى', 'الحرم / الموقع الجامعي', 'المدينة', 'الحي', 'خط العرض', 'خط الطول', 'ملاحظات']\n      : [\n          'رقم المبنى',\n          'اسم المبنى',\n          'الموقع داخل الجامعة',\n          'المدينة',\n          'الحي',\n          'خط العرض',\n          'خط الطول',\n          'عدد المستفيدين',\n          'حالة التغطية',\n          'إمكانية إنشاء مصلى',\n          'سبب تعذر الإنشاء',\n          'البديل المعتمد',\n          'ملاحظات',\n        ];\n    const example = isCentral\n      ? ['A101', 'كلية مثال', 'الحرم الشرقي', 'الدمام', '', '26.392700', '50.043800', 'مبنى تعريفي تجريبي']\n      : ['A101', 'كلية مثال', 'الحرم الشرقي', 'الدمام', '', '26.392700', '50.043800', '250', 'يحتاج مصلى', 'قيد الدراسة', '', '', ''];\n    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);\n    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, header.length + 5) }));\n    const workbook = XLSX.utils.book_new();\n    XLSX.utils.book_append_sheet(workbook, worksheet, isCentral ? 'السجل المركزي للمباني' : 'تغطية المباني');\n    XLSX.writeFile(workbook, isCentral ? 'قالب-استيراد-السجل-المركزي-للمباني.xlsx' : 'قالب-استيراد-تغطية-المباني.xlsx');\n  };\n\n`;
manager = manager.slice(0, templateStart) + newTemplate + manager.slice(templateEnd);

manager = manager.replace(
  "toast.success('تم اعتماد السجل ونقله إلى سجل تغطية المباني الرسمي.');",
  "toast.success(isCentral ? 'تم اعتماد السجل ونقله إلى السجل المركزي الرسمي للمباني.' : 'تم اعتماد السجل ونقله إلى سجل تغطية المباني الرسمي.');",
);
manager = manager.replace(
  "if (!window.confirm(`اعتماد السجل للمبنى ${reviewDraft.buildingNumber} ونقله إلى سجل المباني الرسمي؟`)) return;",
  "if (!window.confirm(`اعتماد السجل للمبنى ${reviewDraft.buildingNumber} ونقله إلى ${isCentral ? 'السجل المركزي الرسمي للمباني' : 'سجل المباني الرسمي'}؟`)) return;",
);
manager = manager.replace(
  "جميع الصفوف المستوردة تحفظ أولًا <b>كمعلقة للمراجعة</b> ولا تعتمد تلقائيًا.",
  "{isCentral ? <>جميع المباني المستوردة تحفظ أولًا <b>كمعلقة للمراجعة</b> ثم يعتمدها المسؤول قبل إتاحتها للوحدات.</> : <>جميع الصفوف المستوردة تحفظ أولًا <b>كمعلقة للمراجعة</b> ولا تعتمد تلقائيًا.</>}",
);

fs.writeFileSync(managerPath, manager);

let registry = fs.readFileSync(registryPath, 'utf8');

registry = replaceOnce(
  registry,
  "import { Label } from '../components/ui/label';",
  "import { Label } from '../components/ui/label';\nimport { BuildingExcelImportManager, getPendingBuildingImport, isPendingImportedBuilding } from '../components/BuildingExcelImportManager';\nimport { CentralBuildingsReports } from '../components/CentralBuildingsReports';",
  'registry tool imports',
);

registry = replaceOnce(
  registry,
  "  const filteredBuildings = useMemo(() => {\n    const needle = normalizeKey(search);\n    if (!needle) return buildings;\n\n    return buildings.filter((building) =>\n      [\n        building.buildingNumber,\n        building.name,\n        building.campusLocation,\n        building.city,\n        building.district,\n      ].some((value) => normalizeKey(value).includes(needle))\n    );\n  }, [buildings, search]);",
  "  const approvedBuildings = useMemo(() => buildings.filter((building) => !isPendingImportedBuilding(building)), [buildings]);\n  const pendingBuildings = useMemo(() => buildings.filter((building) => isPendingImportedBuilding(building)), [buildings]);\n\n  const filteredBuildings = useMemo(() => {\n    const needle = normalizeKey(search);\n    if (!needle) return buildings;\n\n    return buildings.filter((building) => {\n      const pendingDraft = getPendingBuildingImport(building)?.draft;\n      return [\n        pendingDraft?.buildingNumber,\n        pendingDraft?.name,\n        pendingDraft?.campusLocation,\n        pendingDraft?.city,\n        pendingDraft?.district,\n        building.buildingNumber,\n        building.name,\n        building.campusLocation,\n        building.city,\n        building.district,\n      ].some((value) => normalizeKey(value).includes(needle));\n    });\n  }, [buildings, search]);",
  'registry approved pending and search',
);

registry = replaceOnce(
  registry,
  "    buildings.forEach((building) => {\n      const item = usage.get(building.id);",
  "    approvedBuildings.forEach((building) => {\n      const item = usage.get(building.id);",
  'registry totals approved only',
);
registry = registry.replace('  }, [buildings, usage]);\n\n  const openCreate', '  }, [approvedBuildings, usage]);\n\n  const openCreate');

registry = replaceOnce(
  registry,
  "          <div className=\"flex flex-wrap gap-2\">\n            <Button variant=\"outline\" onClick={() => void loadData()} disabled={loading}>",
  "          <div className=\"flex flex-wrap gap-2\">\n            <CentralBuildingsReports buildings={buildings} usage={usage} usageLoading={usageLoading} />\n            <Button variant=\"outline\" onClick={() => void loadData()} disabled={loading}>",
  'registry reports button',
);

registry = replaceOnce(
  registry,
  "      </section>\n\n      <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n        <StatCard icon={Building2} label=\"إجمالي المباني\" value={buildings.length} />\n        <StatCard icon={Landmark} label=\"العناية بالمساجد\" value={usageLoading ? '…' : totals.mosque} />\n        <StatCard icon={Boxes} label=\"وحدة الأصول\" value={usageLoading ? '…' : totals.asset} />\n        <StatCard icon={ShieldCheck} label=\"التحول المحاسبي\" value={usageLoading ? '…' : totals.accounting} />\n      </div>",
  "      </section>\n\n      <BuildingExcelImportManager\n        buildings={buildings}\n        role=\"head\"\n        canAdd={canAdd}\n        canEdit={canEdit}\n        canDelete={canDelete}\n        onReload={loadData}\n        context=\"central\"\n      />\n\n      <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-6\">\n        <StatCard icon={Database} label=\"إجمالي السجلات\" value={buildings.length} />\n        <StatCard icon={Building2} label=\"مباني معتمدة\" value={approvedBuildings.length} />\n        <StatCard icon={RefreshCw} label=\"معلق للمراجعة\" value={pendingBuildings.length} />\n        <StatCard icon={Landmark} label=\"العناية بالمساجد\" value={usageLoading ? '…' : totals.mosque} />\n        <StatCard icon={Boxes} label=\"وحدة الأصول\" value={usageLoading ? '…' : totals.asset} />\n        <StatCard icon={ShieldCheck} label=\"التحول المحاسبي\" value={usageLoading ? '…' : totals.accounting} />\n      </div>",
  'registry import manager and stats',
);

registry = replaceOnce(
  registry,
  "                          {visibleBuildings.map((building) => {\n                            const item = usage.get(building.id);\n                            const references =",
  "                          {visibleBuildings.map((building) => {\n                            const item = usage.get(building.id);\n                            const pendingEnvelope = getPendingBuildingImport(building);\n                            const displayNumber = pendingEnvelope?.draft.buildingNumber || building.buildingNumber;\n                            const displayName = pendingEnvelope?.draft.name || building.name;\n                            const displayCampus = pendingEnvelope?.draft.campusLocation || building.campusLocation;\n                            const displayCity = pendingEnvelope?.draft.city || building.city;\n                            const displayDistrict = pendingEnvelope?.draft.district || building.district;\n                            const references =",
  'registry pending display variables',
);

registry = registry.replace('<Badge variant="outline">مبنى {building.buildingNumber}</Badge>\n                                      <Badge variant="secondary">سجل مركزي</Badge>', '<Badge variant="outline">مبنى {displayNumber || \'غير مدخل\'}</Badge>\n                                      {pendingEnvelope ? <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">معلق — يحتاج اعتماد</Badge> : <Badge variant="secondary">سجل مركزي معتمد</Badge>}');
registry = registry.replace("{building.name || 'بدون مسمى'}", "{displayName || 'بدون مسمى'}");
registry = registry.replace("{[building.campusLocation, building.city, building.district]\n                                        .filter(Boolean)\n                                        .join(' — ') || 'الموقع غير مكتمل'}", "{[displayCampus, displayCity, displayDistrict]\n                                        .filter(Boolean)\n                                        .join(' — ') || 'الموقع غير مكتمل'}");
registry = registry.replace('{canEdit && (\n                                      <Button size="icon" variant="outline" onClick={() => openEdit(building)} title="تعديل البيانات الأساسية">', '{canEdit && !pendingEnvelope && (\n                                      <Button size="icon" variant="outline" onClick={() => openEdit(building)} title="تعديل البيانات الأساسية">');

fs.writeFileSync(registryPath, registry);
console.log('Central building data tools patch applied.');
