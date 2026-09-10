import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('BuildingExcelImportManager, isPendingImportedBuilding')) {
  console.log('Building Excel manager page integration is already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Could not find anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce("import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';", "import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';\nimport { BuildingExcelImportManager, isPendingImportedBuilding } from '../components/BuildingExcelImportManager';", "import building Excel manager");
replaceOnce("  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);", "  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);\n  const officialBuildings = useMemo(() => buildings.filter((building) => !isPendingImportedBuilding(building)), [buildings]);", "official buildings");
replaceOnce("  const selectedSiteBuilding = buildings.find((building) => building.id === siteForm.buildingId) || null;", "  const selectedSiteBuilding = officialBuildings.find((building) => building.id === siteForm.buildingId) || null;", "selected site building");
replaceOnce("            <CardContent>\n              <div className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-5\">\n                <ReportMetric label=\"إجمالي المباني\" value={buildings.length} />\n                <ReportMetric label=\"مغطاة بخدمة الصلاة\" value={buildings.filter((x) => x.coverageStatus === 'covered').length} />\n                <ReportMetric label=\"تحتاج مصلى\" value={buildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} />\n                <ReportMetric label=\"قيد الدراسة / التنفيذ\" value={buildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} />\n                <ReportMetric label=\"تعذر الإنشاء + بديل\" value={buildings.filter((x) => x.coverageStatus === 'not_feasible_alternative').length} />\n              </div>\n            </CardContent>", "            <CardContent className=\"space-y-4\">\n              <BuildingExcelImportManager\n                buildings={buildings}\n                role={role}\n                canAdd={canAdd}\n                canEdit={canEdit}\n                canDelete={canDelete}\n                onReload={loadAll}\n              />\n              <div className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-5\">\n                <ReportMetric label=\"إجمالي المباني المعتمدة\" value={officialBuildings.length} />\n                <ReportMetric label=\"مغطاة بخدمة الصلاة\" value={officialBuildings.filter((x) => x.coverageStatus === 'covered').length} />\n                <ReportMetric label=\"تحتاج مصلى\" value={officialBuildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} />\n                <ReportMetric label=\"قيد الدراسة / التنفيذ\" value={officialBuildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} />\n                <ReportMetric label=\"تعذر الإنشاء + بديل\" value={officialBuildings.filter((x) => x.coverageStatus === 'not_feasible_alternative').length} />\n              </div>\n            </CardContent>", "building metrics manager");
replaceOnce("          {!buildings.length ? <Empty text=\"لم تتم إضافة مباني إلى سجل تغطية المصليات بعد\" /> : <div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{buildings.map((building) => {", "          {!officialBuildings.length ? <Empty text=\"لم تتم إضافة مبانٍ معتمدة إلى سجل تغطية المصليات بعد\" /> : <div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{officialBuildings.map((building) => {", "official building cards");
replaceOnce("{buildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}", "{officialBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}", "official building dropdown");

fs.writeFileSync(path, source);
console.log('Integrated reviewed building Excel import manager.');
