import fs from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.dependencies?.jszip) {
  execSync('npm install jszip@^3.10.1 --save', { stdio: 'inherit' });
}

const apiPath = 'src/app/api/assets.ts';
let api = fs.readFileSync(apiPath, 'utf8');
if (!api.includes('export type AssetExcelTemplateMeta')) {
  api += `\n\nexport type AssetExcelTemplateMeta = {\n  id: string;\n  templateKey: string;\n  title: string;\n  fileName: string;\n  driveFileId: string;\n  driveUrl: string;\n  mimeType?: string | null;\n  fileSize?: number | null;\n  uploadedBy?: string | null;\n  createdAt: string;\n  updatedAt: string;\n};\n\nexport const getOfficialAssetExcelTemplate = () =>\n  apiJson<AssetExcelTemplateMeta | null>('/api/assets/excel-template');\n\nexport const uploadOfficialAssetExcelTemplate = async (file: File) => {\n  const body = new FormData();\n  body.append('file', file);\n  const response = await authenticatedFetch('/api/assets/excel-template', {\n    method: 'POST',\n    body,\n  });\n  const result = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(String(result?.message || result?.error || 'تعذر رفع قالب Excel الرسمي.'));\n  return result as AssetExcelTemplateMeta;\n};\n\nexport const downloadOfficialAssetExcelTemplate = async () => {\n  const response = await authenticatedFetch('/api/assets/excel-template/file');\n  if (!response.ok) {\n    const result = await response.json().catch(() => ({}));\n    throw new Error(String(result?.message || result?.error || 'تعذر تنزيل قالب Excel الرسمي.'));\n  }\n  return response.arrayBuffer();\n};\n`;
  fs.writeFileSync(apiPath, api);
}

const reportPath = 'src/app/pages/AssetReportsPage.tsx';
let report = fs.readFileSync(reportPath, 'utf8');

if (!report.includes("from 'file-saver'")) {
  report = report.replace("import * as XLSX from 'xlsx';", "import * as XLSX from 'xlsx';\nimport { saveAs } from 'file-saver';");
}
if (!report.includes('UploadCloud')) {
  report = report.replace('  Search,\n}', '  Search,\n  UploadCloud,\n  Download,\n}');
}
report = report.replace(
  "import { getAssets } from '../api/assets';",
  "import {\n  getAssets,\n  getOfficialAssetExcelTemplate,\n  uploadOfficialAssetExcelTemplate,\n  downloadOfficialAssetExcelTemplate,\n  type AssetExcelTemplateMeta,\n} from '../api/assets';\nimport { buildOfficialAssetExcel } from '../../utils/officialAssetExcel';"
);

if (!report.includes('const [officialTemplate')) {
  report = report.replace(
    "  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(\n    printableFields.map(([key]) => key)\n  );",
    "  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(\n    printableFields.map(([key]) => key)\n  );\n  const [officialTemplate, setOfficialTemplate] = useState<AssetExcelTemplateMeta | null>(null);\n  const [templateLoading, setTemplateLoading] = useState(true);\n  const [templateUploading, setTemplateUploading] = useState(false);\n  const [officialExporting, setOfficialExporting] = useState(false);\n  const [officialExcelMessage, setOfficialExcelMessage] = useState('');"
  );
}

if (!report.includes('getOfficialAssetExcelTemplate()')) {
  const firstEffect = report.indexOf('  useEffect(() => {');
  const nextConst = report.indexOf('\n\n  const ', firstEffect + 1);
  if (firstEffect < 0 || nextConst < 0) throw new Error('Could not locate report initial effect block');
  const block = `\n\n  useEffect(() => {\n    let cancelled = false;\n    setTemplateLoading(true);\n    getOfficialAssetExcelTemplate()\n      .then((template) => { if (!cancelled) setOfficialTemplate(template); })\n      .catch(() => { if (!cancelled) setOfficialTemplate(null); })\n      .finally(() => { if (!cancelled) setTemplateLoading(false); });\n    return () => { cancelled = true; };\n  }, []);`;
  report = report.slice(0, nextConst) + block + report.slice(nextConst);
}

if (!report.includes('const handleOfficialTemplateUpload')) {
  const exportExcelMarker = '  const exportExcel = () => {';
  const idx = report.indexOf(exportExcelMarker);
  if (idx < 0) throw new Error('exportExcel marker not found');
  const handlers = `  const handleOfficialTemplateUpload = async (file: File | null) => {\n    if (!file) return;\n    if (!file.name.toLowerCase().endsWith('.xlsx')) {\n      setOfficialExcelMessage('القالب الرسمي يجب أن يكون بصيغة XLSX.');\n      return;\n    }\n    try {\n      setTemplateUploading(true);\n      setOfficialExcelMessage('جارٍ رفع القالب الرسمي واعتماده...');\n      const uploaded = await uploadOfficialAssetExcelTemplate(file);\n      setOfficialTemplate(uploaded);\n      setOfficialExcelMessage('تم اعتماد قالب Excel الرسمي بنجاح.');\n    } catch (error: any) {\n      setOfficialExcelMessage(error?.message || 'تعذر رفع قالب Excel الرسمي.');\n    } finally {\n      setTemplateUploading(false);\n    }\n  };\n\n  const exportOfficialExcel = async () => {\n    if (!officialTemplate || rows.length === 0) return;\n    try {\n      setOfficialExporting(true);\n      setOfficialExcelMessage('جارٍ تجهيز نموذج Excel الرسمي بنفس التصميم المعتمد...');\n      const templateBuffer = await downloadOfficialAssetExcelTemplate();\n      const result = await buildOfficialAssetExcel(templateBuffer, rows);\n      const stamp = new Date().toISOString().slice(0, 10);\n      saveAs(result.blob, \`نموذج-الأصول-الرسمي-\${stamp}.xlsx\`);\n      setOfficialExcelMessage(\n        result.skippedCount > 0\n          ? \`تم تجهيز \${result.exportedCount} سجل في ورقة الآلات والمعدات. تم استبعاد \${result.skippedCount} سجل من أنواع أخرى لأن الأوراق الأخرى محفوظة دون تغيير حسب الاعتماد.\`\n          : \`تم تجهيز \${result.exportedCount} سجل في نموذج Excel الرسمي مع الحفاظ على القالب والأوراق الأخرى.\`\n      );\n    } catch (error: any) {\n      setOfficialExcelMessage(error?.message || 'تعذر تجهيز نموذج Excel الرسمي.');\n    } finally {\n      setOfficialExporting(false);\n    }\n  };\n\n`;
  report = report.slice(0, idx) + handlers + report.slice(idx);
}

if (!report.includes('نموذج Excel الرسمي المعتمد')) {
  const marker = '      <div className="flex flex-wrap gap-2">';
  const idx = report.indexOf(marker);
  if (idx < 0) throw new Error('Report action buttons marker not found');
  const panel = `      <Card className="rounded-[26px] border-emerald-200/70 bg-emerald-50/35 shadow-sm">\n        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">\n          <div>\n            <div className="flex items-center gap-2 font-black text-slate-900">\n              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />\n              نموذج Excel الرسمي المعتمد\n            </div>\n            <p className="mt-1 text-sm text-muted-foreground">\n              يتم تنزيل نفس القالب الرسمي دون تغيير الأوراق أو التصميم، وتعبئة الحقول المعتمدة في ورقة هـ- الآلات والمعدات من نتائج التقرير الحالية.\n            </p>\n            <p className="mt-2 text-xs font-medium text-slate-600">\n              {templateLoading\n                ? 'جارٍ التحقق من القالب...'\n                : officialTemplate\n                  ? \`القالب المعتمد: \${officialTemplate.fileName}\`\n                  : 'لم يتم رفع القالب الرسمي إلى المنصة بعد.'}\n            </p>\n            {officialExcelMessage && (\n              <p className="mt-2 text-xs font-semibold text-emerald-800">{officialExcelMessage}</p>\n            )}\n          </div>\n          <div className="flex flex-wrap gap-2">\n            {isAdmin && (\n              <label className={\`inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-slate-50 \${templateUploading ? 'pointer-events-none opacity-60' : ''}\`}>\n                <UploadCloud className="ml-2 h-4 w-4" />\n                {templateUploading ? 'جارٍ رفع القالب...' : officialTemplate ? 'استبدال القالب الرسمي' : 'رفع القالب الرسمي'}\n                <input\n                  type="file"\n                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"\n                  className="hidden"\n                  onChange={(event) => {\n                    const file = event.target.files?.[0] || null;\n                    void handleOfficialTemplateUpload(file);\n                    event.currentTarget.value = '';\n                  }}\n                />\n              </label>\n            )}\n            {canPrint && (\n              <Button\n                type="button"\n                onClick={() => void exportOfficialExcel()}\n                disabled={templateLoading || officialExporting || !officialTemplate || loading || rows.length === 0}\n                className="bg-emerald-700 text-white hover:bg-emerald-800"\n              >\n                <Download className="ml-2 h-4 w-4" />\n                {officialExporting ? 'جارٍ تجهيز Excel...' : 'تنزيل Excel الرسمي'}\n              </Button>\n            )}\n          </div>\n        </CardContent>\n      </Card>\n\n`;
  report = report.slice(0, idx) + panel + report.slice(idx);
}

fs.writeFileSync(reportPath, report);
console.log('Official asset Excel export UI applied.');
// trigger 2026-08-10T14:12+03:00
