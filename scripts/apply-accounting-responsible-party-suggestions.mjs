import fs from 'node:fs';

const filePath = 'src/app/pages/AccountingTransformationFormPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (needle, replacement, label) => {
  if (!source.includes(needle)) throw new Error(`Missing patch anchor: ${label}`);
  source = source.replace(needle, replacement);
};

if (!source.includes("getOrganizationUnits")) {
  replaceOnce(
    "} from '../api/accountingTransformation';\nimport type {",
    "} from '../api/accountingTransformation';\nimport { getOrganizationUnits } from '../api/organization';\nimport type {",
    'organization import',
  );
}

if (!source.includes('responsiblePartyOptions')) {
  replaceOnce(
    "  const [uploading, setUploading] = useState(false);\n\n  useEffect(() => {",
    `  const [uploading, setUploading] = useState(false);\n  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);\n\n  useEffect(() => {\n    let active = true;\n    getOrganizationUnits()\n      .then((units) => {\n        if (!active) return;\n        const options = Array.from(new Set(\n          units\n            .filter((unit) => unit.isActive && unit.nameAr?.trim())\n            .map((unit) => unit.nameAr.trim())\n        )).sort((a, b) => a.localeCompare(b, 'ar'));\n        setResponsiblePartyOptions(options);\n      })\n      .catch(() => {\n        // Non-critical lookup: keep the field available for free-text entry.\n      });\n    return () => { active = false; };\n  }, []);\n\n  useEffect(() => {`,
    'organization options effect',
  );
}

if (!source.includes('accounting-responsible-parties')) {
  replaceOnce(
    `    if (recordType === 'fixed_asset' && field.c === 'AG') {\n      return <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر طريقة التقييم</option>{MODEL_B_VALUATION_METHODS.map((option) => <option key={option} value={option}>{option}</option>)}</NativeSelect>;\n    }\n    const numericColumns = new Set(['AD','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AZ','BA','BB']);`,
    `    if (recordType === 'fixed_asset' && field.c === 'AG') {\n      return <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر طريقة التقييم</option>{MODEL_B_VALUATION_METHODS.map((option) => <option key={option} value={option}>{option}</option>)}</NativeSelect>;\n    }\n    const responsiblePartyField =\n      (recordType === 'fixed_asset' && field.c === 'V') ||\n      (recordType === 'building' && field.c === 'AW') ||\n      (recordType === 'land' && field.c === 'AK');\n    if (responsiblePartyField) {\n      return <div className="space-y-1.5">\n        <Input list="accounting-responsible-parties" value={String(value)} onChange={(e) => setField(field.c, e.target.value)} placeholder="اختر إدارة مسجلة أو اكتب اسم الشخص المسؤول" />\n        <datalist id="accounting-responsible-parties">{responsiblePartyOptions.map((option) => <option key={option} value={option} />)}</datalist>\n        <p className="text-[10px] leading-4 text-slate-500">تظهر الإدارات النشطة المسجلة في المنصة كمقترحات، ويمكن كتابة اسم شخص أو جهة أخرى عند الحاجة.</p>\n      </div>;\n    }\n    const numericColumns = new Set(['AD','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AZ','BA','BB']);`,
    'responsible party input',
  );
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Accounting responsible party suggestions applied.');
