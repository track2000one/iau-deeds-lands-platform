import fs from 'node:fs';

const filePath = 'src/app/pages/ArchivePage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (name, from, to) => {
  if (source.includes(to)) {
    console.log(`Already applied: ${name}`);
    return;
  }
  if (!source.includes(from)) {
    throw new Error(`Unable to apply ${name}: source fragment not found`);
  }
  source = source.replace(from, to);
  console.log(`Applied: ${name}`);
};

replaceOnce(
  'FileSpreadsheet icon import',
  `  FileDown,\n  ShieldCheck,`,
  `  FileDown,\n  FileSpreadsheet,\n  ShieldCheck,`,
);

replaceOnce(
  'ArchiveExcelImportDialog import',
  `import { ArchiveReportsDialog } from '../components/ArchiveReportsDialog';`,
  `import { ArchiveReportsDialog } from '../components/ArchiveReportsDialog';\nimport { ArchiveExcelImportDialog, type ArchiveExcelImportPayload } from '../components/ArchiveExcelImportDialog';`,
);

replaceOnce(
  'Excel import dialog state',
  `  const [reportsOpen, setReportsOpen] = useState(false);`,
  `  const [reportsOpen, setReportsOpen] = useState(false);\n  const [excelImportOpen, setExcelImportOpen] = useState(false);`,
);

replaceOnce(
  'Excel import top button',
  `          {canAdd && (\n            <Button onClick={openAddForm} className="w-full lg:w-auto">\n              <Plus className="ml-2 h-4 w-4" />\n              إضافة ملف للأرشفة\n            </Button>\n          )}`,
  `          {canAdd && (\n            <Button\n              variant="outline"\n              onClick={() => setExcelImportOpen(true)}\n              className="w-full border-emerald-300 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100 lg:w-auto"\n            >\n              <FileSpreadsheet className="ml-2 h-4 w-4" />\n              استيراد Excel\n            </Button>\n          )}\n          {canAdd && (\n            <Button onClick={openAddForm} className="w-full lg:w-auto">\n              <Plus className="ml-2 h-4 w-4" />\n              إضافة ملف للأرشفة\n            </Button>\n          )}`,
);

replaceOnce(
  'Excel import dialog render',
  `      <ArchiveReportsDialog documents={documents} open={reportsOpen} onOpenChange={setReportsOpen} />`,
  `      <ArchiveExcelImportDialog\n        open={excelImportOpen}\n        onOpenChange={setExcelImportOpen}\n        existingDocuments={documents}\n        createArchiveDocument={(payload: ArchiveExcelImportPayload) =>\n          archiveRequest<ArchiveDocument>('', {\n            method: 'POST',\n            body: JSON.stringify(payload),\n          })\n        }\n        onImported={async () => {\n          await loadDocumentsFromServer();\n        }}\n      />\n\n      <ArchiveReportsDialog documents={documents} open={reportsOpen} onOpenChange={setReportsOpen} />`,
);

fs.writeFileSync(filePath, source);
console.log('Archive Excel import integration completed.');
