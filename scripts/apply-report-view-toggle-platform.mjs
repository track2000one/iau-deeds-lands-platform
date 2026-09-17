import fs from 'node:fs';

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

const patchFile = (path, transform) => {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  ensure(after !== before || before.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1'), `No changes applied to ${path}`);
  fs.writeFileSync(path, after);
};

const addImport = (source, statement, anchor) => {
  if (source.includes(statement)) return source;
  ensure(source.includes(anchor), `Import anchor not found: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${statement}`);
};

// 1) Main reports page: each report section has its own remembered Cards/Table mode.
patchFile('src/app/pages/ReportsPage.tsx', (input) => {
  let s = addImport(input, "import { ReportViewToggle } from '../components/ReportViewToggle';", "import { Badge } from '../components/ui/badge';");
  if (!s.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1')) {
    const cardAnchor = '<Card key={type} className="group relative overflow-hidden';
    ensure(s.includes(cardAnchor), 'ReportsPage report card anchor not found');
    s = s.replace(cardAnchor, '<Card id={`reports-section-${type}`} key={type} className="group relative overflow-hidden');
    const buttonAnchor = `            <Button\n              variant="ghost"\n              size="sm"\n              onClick={() => toggleSection(type)}`;
    ensure(s.includes(buttonAnchor), 'ReportsPage collapse button anchor not found');
    const insertedToggle = '            {/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}\n' +
      '            <div className="flex items-center gap-2">\n' +
      '              <ReportViewToggle storageKey={`iau-report-view-${type}`} scopeId={`reports-section-${type}`} />\n' +
      buttonAnchor;
    s = s.replace(buttonAnchor, insertedToggle);
    const closeButton = `            </Button>\n          </div>\n        </CardHeader>`;
    ensure(s.includes(closeButton), 'ReportsPage header close anchor not found');
    s = s.replace(closeButton, `            </Button>\n            </div>\n          </div>\n        </CardHeader>`);
  }
  return s;
});

// 2) Assets reports.
patchFile('src/app/pages/AssetReportsPage.tsx', (input) => {
  let s = addImport(input, "import { ReportViewToggle } from '../components/ReportViewToggle';", "import { Badge } from '../components/ui/badge';");
  if (!s.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1')) {
    const root = '<div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">';
    ensure(s.includes(root), 'AssetReportsPage root not found');
    s = s.replace(root, '<div id="asset-reports-view" className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">');
    const actions = '<div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={()=>void exportExcel()}';
    ensure(s.includes(actions), 'AssetReportsPage actions not found');
    s = s.replace(actions, '<div className="flex flex-wrap items-center gap-2">{/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}<ReportViewToggle storageKey="iau-asset-reports-view" scopeId="asset-reports-view" /><Button variant="outline" onClick={()=>void exportExcel()}');
  }
  return s;
});

// 3) Accounting transformation reports.
patchFile('src/app/pages/AccountingTransformationReportsPage.tsx', (input) => {
  let s = input;
  const importAnchor = "import { Button } from '../components/ui/button';";
  s = addImport(s, "import { ReportViewToggle } from '../components/ReportViewToggle';", importAnchor);
  if (!s.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1')) {
    const root = '<div className="accounting-report mx-auto w-full max-w-[1780px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">';
    ensure(s.includes(root), 'Accounting reports root not found');
    s = s.replace(root, '<div id="accounting-reports-view" className="accounting-report mx-auto w-full max-w-[1780px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">');
    const actions = '<div className="flex flex-wrap gap-2">\n            <Button variant="outline" onClick={() => navigate(\'/accounting-transformation\')}>';
    ensure(s.includes(actions), 'Accounting reports actions not found');
    s = s.replace(actions, '<div className="flex flex-wrap gap-2">\n            {/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}\n            <ReportViewToggle storageKey="iau-accounting-reports-view" scopeId="accounting-reports-view" />\n            <Button variant="outline" onClick={() => navigate(\'/accounting-transformation\')}>');
  }
  return s;
});

// 4) Mosque reports center.
patchFile('src/app/components/MosqueReportsCenter.tsx', (input) => {
  let s = addImport(input, "import { ReportViewToggle } from './ReportViewToggle';", "import { Button } from './ui/button';");
  if (!s.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1')) {
    const root = 'return <div className="space-y-4" dir="rtl">';
    ensure(s.includes(root), 'MosqueReportsCenter root not found');
    s = s.replace(root, 'return <div id="mosque-reports-view" className="space-y-4" dir="rtl">');
    const target = '<div className="flex flex-wrap gap-2">{canPrint && <Button variant="outline" onClick={printPdf}>';
    ensure(s.includes(target), 'MosqueReportsCenter action area not found');
    s = s.replace(target, '<div className="flex flex-wrap gap-2">{/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}<ReportViewToggle storageKey="iau-mosque-reports-view" scopeId="mosque-reports-view" />{canPrint && <Button variant="outline" onClick={printPdf}>');
  }
  return s;
});

const patchDialog = (path, importAnchor, scopeId, storageKey) => {
  patchFile(path, (input) => {
    let s = addImport(input, "import { ReportViewToggle } from './ReportViewToggle';", importAnchor);
    if (s.includes('IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1')) return s;
    const dialogContentPattern = /<DialogContent(?![^>]*\bid=)([^>]*)>/;
    ensure(dialogContentPattern.test(s), `${path}: DialogContent not found`);
    s = s.replace(dialogContentPattern, `<DialogContent id="${scopeId}"$1>`);
    const headerClose = '</DialogHeader>';
    ensure(s.includes(headerClose), `${path}: DialogHeader close not found`);
    s = s.replace(headerClose, `${headerClose}\n          {/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}\n          <div className="flex justify-end"><ReportViewToggle storageKey="${storageKey}" scopeId="${scopeId}" /></div>`);
    return s;
  });
};

// 5) Central building reports dialog.
patchDialog(
  'src/app/components/CentralBuildingsReports.tsx',
  "import { NativeSelect } from './ui/native-select';",
  'central-buildings-reports-view',
  'iau-central-buildings-reports-view',
);

// 6) Building prayer coverage reports dialog.
patchDialog(
  'src/app/components/BuildingCoverageReportsDialog.tsx',
  "import { NativeSelect } from './ui/native-select';",
  'building-coverage-reports-view',
  'iau-building-coverage-reports-view',
);

// 7) Archive flexible reports dialog. Archive listing itself already has its own dedicated cards/table switch.
patchDialog(
  'src/app/components/ArchiveReportsDialog.tsx',
  "import { NativeSelect } from './ui/native-select';",
  'archive-reports-dialog-view',
  'iau-archive-reports-dialog-view',
);

console.log('Applied Cards/Table display mode across platform reporting surfaces.');
