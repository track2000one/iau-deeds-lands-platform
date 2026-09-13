import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Patch anchor not found: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "import { MosqueReportsCenter } from '../components/MosqueReportsCenter';",
  "import { MosqueReportsCenter } from '../components/MosqueReportsCenter';\nimport { BuildingCoverageReportsDialog } from '../components/BuildingCoverageReportsDialog';",
  'report dialog import',
);

replaceOnce(
  "  const [buildingDialog, setBuildingDialog] = useState(false);\n  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);",
  "  const [buildingDialog, setBuildingDialog] = useState(false);\n  const [buildingCoverageReportOpen, setBuildingCoverageReportOpen] = useState(false);\n  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);",
  'report dialog state',
);

replaceOnce(
  "              <Button className={button3d} variant=\"outline\" onClick={() => navigate('/buildings/registry')}><Building2 className=\"ml-2 h-4 w-4\" />السجل المركزي للمباني</Button>",
  "              <div className=\"flex flex-wrap gap-2\">\n                {canPrint && <Button className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={() => setBuildingCoverageReportOpen(true)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />تقارير التغطية — PDF / Excel</Button>}\n                <Button className={button3d} variant=\"outline\" onClick={() => navigate('/buildings/registry')}><Building2 className=\"ml-2 h-4 w-4\" />السجل المركزي للمباني</Button>\n              </div>",
  'building coverage report button',
);

replaceOnce(
  "      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>",
  "      <BuildingCoverageReportsDialog\n        open={buildingCoverageReportOpen}\n        onOpenChange={setBuildingCoverageReportOpen}\n        buildings={officialBuildings}\n        canPrint={canPrint}\n      />\n\n      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>",
  'report dialog mount',
);

fs.writeFileSync(path, source);
console.log('Applied building coverage report tools patch.');
