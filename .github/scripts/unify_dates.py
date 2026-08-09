from pathlib import Path
import re


def patch(path, old, new, count=1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# Asset types
patch(
    'src/types/asset.ts',
    "  purchaseDate?: string | null;\n  purchaseValue?: number | null;",
    "  purchaseDate?: string | null;\n  purchaseDateType?: 'gregorian' | 'hijri';\n  purchaseValue?: number | null;",
    2,
)

# Add asset page
patch(
    'src/app/pages/AddAssetPage.tsx',
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';\n",
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';\nimport { AppDateField } from '../components/AppDateField';\n",
)
patch(
    'src/app/pages/AddAssetPage.tsx',
    "  purchaseDate: '',\n  purchaseValue: null,",
    "  purchaseDate: '',\n  purchaseDateType: 'gregorian',\n  purchaseValue: null,",
)
p = Path('src/app/pages/AddAssetPage.tsx')
text = p.read_text(encoding='utf-8')
pattern = re.compile(
    r'<div className="space-y-2">\s*<Label>تاريخ الشراء</Label>\s*<Input\s+type="date"\s+value=\{form\.purchaseDate \|\| \'\'\}\s+onChange=\{\(e\) => setField\(\'purchaseDate\', e\.target\.value\)\}\s*/>\s*</div>',
    re.S,
)
replacement = '''<div className="md:col-span-2">
            <AppDateField
              id="asset-purchase-date"
              label="تاريخ الشراء"
              value={String(form.purchaseDate || '')}
              dateType={form.purchaseDateType || 'gregorian'}
              onValueChange={(value) => setField('purchaseDate', value)}
              onDateTypeChange={(value) => setField('purchaseDateType', value)}
            />
          </div>'''
text2, n = pattern.subn(replacement, text, count=1)
if n != 1:
    raise SystemExit('AddAssetPage purchase date block not found')
p.write_text(text2, encoding='utf-8')

# Edit asset page
patch(
    'src/app/pages/EditAssetPage.tsx',
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';\n",
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';\nimport { AppDateField } from '../components/AppDateField';\nimport { normalizeFlexibleDateForInput } from '../../utils/dateUtils';\n",
)
patch(
    'src/app/pages/EditAssetPage.tsx',
    "  department: '', building: '', floor: '', room: '', custodian: '', purchaseDate: '', purchaseValue: null, notes: '', attachments: [],",
    "  department: '', building: '', floor: '', room: '', custodian: '', purchaseDate: '', purchaseDateType: 'gregorian', purchaseValue: null, notes: '', attachments: [],",
)
patch(
    'src/app/pages/EditAssetPage.tsx',
    "          purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : '', purchaseValue: asset.purchaseValue ?? null,",
    "          purchaseDate: normalizeFlexibleDateForInput(asset.purchaseDate, asset.purchaseDateType || 'gregorian'), purchaseDateType: asset.purchaseDateType || 'gregorian', purchaseValue: asset.purchaseValue ?? null,",
)
p = Path('src/app/pages/EditAssetPage.tsx')
text = p.read_text(encoding='utf-8')
old = "          <div><Label>تاريخ الشراء</Label><Input type=\"date\" value={String(form.purchaseDate || '')} onChange={(e) => setField('purchaseDate', e.target.value)} /></div>"
new = "          <div><AppDateField id=\"asset-purchase-date-edit\" label=\"تاريخ الشراء\" value={String(form.purchaseDate || '')} dateType={form.purchaseDateType || 'gregorian'} onValueChange={(value) => setField('purchaseDate', value)} onDateTypeChange={(value) => setField('purchaseDateType', value)} /></div>"
if old not in text:
    raise SystemExit('EditAssetPage purchase date block not found')
p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Delivered lands edit values
patch(
    'src/app/pages/DeliveredLandsPage.tsx',
    "import { formatFlexibleDate } from '../../utils/dateUtils';",
    "import { formatFlexibleDate, normalizeFlexibleDateForInput } from '../../utils/dateUtils';",
)
patch(
    'src/app/pages/DeliveredLandsPage.tsx',
    "      receiptDate: land.receiptDate || land.deliveryDate || '',\n      receiptDateType:\n        land.receiptDateType || land.deliveryDateType || 'gregorian',",
    "      receiptDate: normalizeFlexibleDateForInput(\n        land.receiptDate || land.deliveryDate || '',\n        land.receiptDateType || land.deliveryDateType || 'gregorian'\n      ),\n      receiptDateType:\n        land.receiptDateType || land.deliveryDateType || 'gregorian',",
)

# Leased land out edit values
patch(
    'src/app/pages/LeasedLandsOutPage.tsx',
    "import { formatFlexibleDate } from '../../utils/dateUtils';",
    "import { formatFlexibleDate, normalizeFlexibleDateForInput } from '../../utils/dateUtils';",
)
patch(
    'src/app/pages/LeasedLandsOutPage.tsx',
    "      contractStartDate: record.contractStartDate || '',\n      contractStartDateType: record.contractStartDateType || 'gregorian',",
    "      contractStartDate: normalizeFlexibleDateForInput(\n        record.contractStartDate || '',\n        record.contractStartDateType || 'gregorian'\n      ),\n      contractStartDateType: record.contractStartDateType || 'gregorian',",
)

# Site inspection types
patch(
    'src/types/siteInspection.ts',
    "  visitDate: string;\n  visitPurpose?: string | null;",
    "  visitDate: string;\n  visitDateType?: 'gregorian' | 'hijri';\n  visitPurpose?: string | null;",
)
patch(
    'src/types/siteInspection.ts',
    "  followUpDate?: string | null;\n  workflowStatus: string;",
    "  followUpDate?: string | null;\n  followUpDateType?: 'gregorian' | 'hijri';\n  workflowStatus: string;",
)

# Site inspection form
patch(
    'src/app/pages/SiteInspectionFormPage.tsx',
    "import { MapCoordinatePicker } from '../components/MapCoordinatePicker';\n",
    "import { MapCoordinatePicker } from '../components/MapCoordinatePicker';\nimport { AppDateField } from '../components/AppDateField';\nimport { normalizeFlexibleDateForInput } from '../../utils/dateUtils';\n",
)
patch(
    'src/app/pages/SiteInspectionFormPage.tsx',
    "  visitDate: new Date().toISOString().slice(0, 16),\n  visitPurpose: '',",
    "  visitDate: new Date().toISOString().slice(0, 10),\n  visitDateType: 'gregorian',\n  visitPurpose: '',",
)
patch(
    'src/app/pages/SiteInspectionFormPage.tsx',
    "  followUpDate: null,\n  workflowStatus: 'new',",
    "  followUpDate: null,\n  followUpDateType: 'gregorian',\n  workflowStatus: 'new',",
)
patch(
    'src/app/pages/SiteInspectionFormPage.tsx',
    "          visitDate: record.visitDate.slice(0, 16),\n          visitPurpose: record.visitPurpose || '',",
    "          visitDate: normalizeFlexibleDateForInput(record.visitDate, record.visitDateType || 'gregorian'),\n          visitDateType: record.visitDateType || 'gregorian',\n          visitPurpose: record.visitPurpose || '',",
)
patch(
    'src/app/pages/SiteInspectionFormPage.tsx',
    "          followUpDate: record.followUpDate?.slice(0, 10) || null,\n          workflowStatus: record.workflowStatus,",
    "          followUpDate: record.followUpDate ? normalizeFlexibleDateForInput(record.followUpDate, record.followUpDateType || 'gregorian') : null,\n          followUpDateType: record.followUpDateType || 'gregorian',\n          workflowStatus: record.workflowStatus,",
)
p = Path('src/app/pages/SiteInspectionFormPage.tsx')
text = p.read_text(encoding='utf-8')
old = '''          <Field label="تاريخ ووقت الزيارة *">
            <Input type="datetime-local" value={form.visitDate} onChange={(e) => setField('visitDate', e.target.value)} />
          </Field>'''
new = '''          <div className="md:col-span-2">
            <AppDateField
              id="inspection-visit-date"
              label="تاريخ الزيارة"
              required
              value={form.visitDate}
              dateType={form.visitDateType || 'gregorian'}
              onValueChange={(value) => setField('visitDate', value)}
              onDateTypeChange={(value) => setField('visitDateType', value)}
              helperText="اختر نوع التاريخ حسب محضر الزيارة أو المستند الرسمي."
            />
          </div>'''
if old not in text:
    raise SystemExit('SiteInspection visit date block not found')
text = text.replace(old, new, 1)
text = re.sub(
    r'<Field label="تاريخ المتابعة">\s*<Input type="date" value=\{form\.followUpDate \|\| \'\'\} onChange=\{\(e\) => setField\(\'followUpDate\', e\.target\.value \|\| null\)\} />\s*</Field>',
    '''<div className="md:col-span-2">
              <AppDateField
                id="inspection-followup-date"
                label="تاريخ المتابعة"
                value={form.followUpDate || ''}
                dateType={form.followUpDateType || 'gregorian'}
                onValueChange={(value) => setField('followUpDate', value || null)}
                onDateTypeChange={(value) => setField('followUpDateType', value)}
              />
            </div>''',
    text,
    count=1,
    flags=re.S,
)
p.write_text(text, encoding='utf-8')

# Shared date validation
p = Path('src/utils/dateUtils.ts')
text = p.read_text(encoding='utf-8')
insert = '''
export const isValidFlexibleDate = (value: string, type: DateType = 'gregorian') => {
  if (!value) return true;
  if (type === 'hijri') {
    const match = value.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return year >= 1200 && year <= 1700 && month >= 1 && month <= 12 && day >= 1 && day <= 30;
  }
  const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() == year && date.getUTCMonth() == month - 1 && date.getUTCDate() == day;
};
'''
marker = "export const getFlexibleDateType = (record: any, key: string): DateType => {"
if 'export const isValidFlexibleDate' not in text:
    text = text.replace(marker, insert + '\n' + marker, 1)
p.write_text(text, encoding='utf-8')

p = Path('src/app/components/AppDateField.tsx')
text = p.read_text(encoding='utf-8')
text = text.replace(
    "import { formatFlexibleDate, normalizeHijriInput } from '../../utils/dateUtils';",
    "import { formatFlexibleDate, isValidFlexibleDate, normalizeHijriInput } from '../../utils/dateUtils';",
)
text = text.replace(
    "  const inputId = id || label.replace(/\\s+/g, '-');\n",
    "  const inputId = id || label.replace(/\\s+/g, '-');\n  const isValid = isValidFlexibleDate(value, dateType);\n",
)
text = text.replace(
    "              disabled={disabled}\n            />",
    "              disabled={disabled}\n              aria-invalid={!isValid}\n              className={!isValid ? 'border-destructive focus-visible:ring-destructive' : undefined}\n            />",
    1,
)
text = text.replace(
    "              dir=\"ltr\"\n              disabled={disabled}\n            />",
    "              dir=\"ltr\"\n              disabled={disabled}\n              aria-invalid={!isValid}\n              className={!isValid ? 'border-destructive focus-visible:ring-destructive' : undefined}\n            />",
    1,
)
text = text.replace(
    "      <p className=\"text-xs text-muted-foreground\">\n        {helperText || 'يمكن ترك التاريخ فارغًا، أو اختيار ميلادي/هجري حسب المستند.'}\n      </p>",
    "      <p className={`text-xs ${isValid ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>\n        {!isValid\n          ? dateType === 'hijri'\n            ? 'أدخل التاريخ الهجري بصيغة صحيحة مثل 1447/07/18.'\n            : 'أدخل تاريخًا ميلاديًا صحيحًا.'\n          : helperText || 'يمكن ترك التاريخ فارغًا، أو اختيار ميلادي/هجري حسب المستند.'}\n      </p>",
)
p.write_text(text, encoding='utf-8')
