const fs = require('fs');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

function replaceAllChecked(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`Patch target count mismatch for ${label}: expected ${expected}, got ${count}`);
  return source.split(before).join(after);
}

// Types
{
  const path = 'src/types/asset.ts';
  let s = fs.readFileSync(path, 'utf8');
  s = replaceAllChecked(
    s,
    "  purchaseValue?: number | null;\n  serviceDate?: string | null;",
    "  purchaseValue?: number | null;\n  vatRate?: number | null;\n  vatAmount?: number | null;\n  purchaseValueBeforeVat?: number | null;\n  purchaseValueIncludingVat?: number | null;\n  serviceDate?: string | null;",
    2,
    'asset VAT fields in record/input'
  );
  fs.writeFileSync(path, s);
}

// API extraction types
{
  const path = 'src/app/api/assets.ts';
  let s = fs.readFileSync(path, 'utf8');
  s = replaceOnce(
    s,
    "  purchaseValue?: number | null;\n  department?: string | null;",
    "  purchaseValue?: number | null;\n  vatRate?: number | null;\n  vatAmount?: number | null;\n  purchaseValueBeforeVat?: number | null;\n  purchaseValueIncludingVat?: number | null;\n  department?: string | null;",
    'smart extraction VAT fields'
  );
  fs.writeFileSync(path, s);
}

// Add Asset page
{
  const path = 'src/app/pages/AddAssetPage.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    "  purchaseValue: 'قيمة الشراء',\n  department: 'الجهة / الإدارة',",
    "  purchaseValue: 'قيمة الشراء قبل الضريبة',\n  vatRate: 'نسبة ضريبة القيمة المضافة',\n  vatAmount: 'قيمة الضريبة',\n  purchaseValueBeforeVat: 'القيمة قبل الضريبة',\n  purchaseValueIncludingVat: 'الإجمالي شامل الضريبة',\n  department: 'الجهة / الإدارة',",
    'smart extraction VAT labels'
  );

  s = replaceOnce(
    s,
    "const formatFileSize = (size: number) => {\n  if (size < 1024) return `${size} B`;\n  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;\n  return `${(size / (1024 * 1024)).toFixed(1)} MB`;\n};",
    "const formatFileSize = (size: number) => {\n  if (size < 1024) return `${size} B`;\n  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;\n  return `${(size / (1024 * 1024)).toFixed(1)} MB`;\n};\n\nconst SAUDI_STANDARD_VAT_RATE = 15;\nconst roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;\nconst formatMoney = (value: number | null | undefined) =>\n  Number(value || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });",
    'VAT helpers'
  );

  s = replaceOnce(
    s,
    "  purchaseValue: null,\n  notes: '',",
    "  purchaseValue: null,\n  vatRate: SAUDI_STANDARD_VAT_RATE,\n  vatAmount: null,\n  purchaseValueBeforeVat: null,\n  purchaseValueIncludingVat: null,\n  notes: '',",
    'empty form VAT defaults'
  );

  s = replaceOnce(
    s,
    "  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {\n    setForm((current) => ({ ...current, [key]: value }));\n  };",
    "  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {\n    setForm((current) => ({ ...current, [key]: value }));\n  };\n\n  const updatePurchaseFinancials = (rawValue: number | null, rate = Number(form.vatRate ?? SAUDI_STANDARD_VAT_RATE)) => {\n    const safeRate = Number.isFinite(rate) ? Math.max(0, rate) : SAUDI_STANDARD_VAT_RATE;\n    if (rawValue === null || !Number.isFinite(Number(rawValue))) {\n      setForm((current) => ({\n        ...current,\n        purchaseValue: null,\n        purchaseValueBeforeVat: null,\n        vatRate: safeRate,\n        vatAmount: null,\n        purchaseValueIncludingVat: null,\n      }));\n      return;\n    }\n    const base = roundMoney(Math.max(0, Number(rawValue)));\n    const tax = roundMoney(base * safeRate / 100);\n    const total = roundMoney(base + tax);\n    setForm((current) => ({\n      ...current,\n      purchaseValue: base,\n      purchaseValueBeforeVat: base,\n      vatRate: safeRate,\n      vatAmount: tax,\n      purchaseValueIncludingVat: total,\n    }));\n  };\n\n  const updateVatRate = (rate: number) => {\n    const base = form.purchaseValueBeforeVat ?? form.purchaseValue ?? null;\n    updatePurchaseFinancials(base === null || base === undefined ? null : Number(base), rate);\n  };",
    'purchase VAT handlers'
  );

  s = replaceOnce(
    s,
    "      if (fields.purchaseValue !== null && fields.purchaseValue !== undefined && (current.purchaseValue === null || current.purchaseValue === undefined || current.purchaseValue === ('' as any))) {\n        next.purchaseValue = Number(fields.purchaseValue);\n        applied += 1;\n      }",
    "      const purchaseIsEmpty = current.purchaseValue === null || current.purchaseValue === undefined || current.purchaseValue === ('' as any);\n      const extractedRate = Number(fields.vatRate ?? SAUDI_STANDARD_VAT_RATE);\n      let extractedBase = fields.purchaseValueBeforeVat ?? fields.purchaseValue ?? null;\n      const extractedTotal = fields.purchaseValueIncludingVat ?? null;\n      if ((extractedBase === null || extractedBase === undefined) && extractedTotal !== null && extractedTotal !== undefined) {\n        extractedBase = Number(extractedTotal) / (1 + extractedRate / 100);\n      }\n      if (purchaseIsEmpty && extractedBase !== null && extractedBase !== undefined && Number.isFinite(Number(extractedBase))) {\n        const base = roundMoney(Number(extractedBase));\n        const tax = fields.vatAmount !== null && fields.vatAmount !== undefined\n          ? roundMoney(Number(fields.vatAmount))\n          : roundMoney(base * extractedRate / 100);\n        const total = extractedTotal !== null && extractedTotal !== undefined\n          ? roundMoney(Number(extractedTotal))\n          : roundMoney(base + tax);\n        next.purchaseValue = base;\n        next.purchaseValueBeforeVat = base;\n        next.vatRate = extractedRate;\n        next.vatAmount = tax;\n        next.purchaseValueIncludingVat = total;\n        applied += 4;\n      }",
    'apply extracted VAT breakdown'
  );

  s = replaceOnce(
    s,
    "          <div className=\"space-y-2\">\n            <Label>قيمة الشراء</Label>\n            <Input type=\"number\" min=\"0\" step=\"0.01\" value={form.purchaseValue ?? ''} onChange={(e) => setField('purchaseValue', e.target.value === '' ? null : Number(e.target.value))} placeholder=\"0.00\" />\n          </div>\n          <div className=\"space-y-2 md:col-span-2\">",
    "          <div className=\"space-y-2\">\n            <Label>قيمة الشراء قبل الضريبة</Label>\n            <Input\n              type=\"number\"\n              min=\"0\"\n              step=\"0.01\"\n              value={form.purchaseValueBeforeVat ?? form.purchaseValue ?? ''}\n              onChange={(e) => updatePurchaseFinancials(e.target.value === '' ? null : Number(e.target.value))}\n              placeholder=\"0.00\"\n            />\n          </div>\n          <div className=\"space-y-2\">\n            <Label>ضريبة القيمة المضافة</Label>\n            <Select value={String(Number(form.vatRate ?? SAUDI_STANDARD_VAT_RATE))} onValueChange={(value) => updateVatRate(Number(value))}>\n              <SelectTrigger><SelectValue /></SelectTrigger>\n              <SelectContent>\n                <SelectItem value=\"15\">النسبة الأساسية في السعودية — 15%</SelectItem>\n                <SelectItem value=\"0\">بدون ضريبة / غير خاضع</SelectItem>\n              </SelectContent>\n            </Select>\n          </div>\n          <div className=\"space-y-2\">\n            <Label>قيمة الضريبة</Label>\n            <div className=\"flex h-10 items-center justify-between rounded-md border border-amber-200 bg-amber-50/70 px-3 text-sm\">\n              <span className=\"font-black text-amber-900\">{formatMoney(form.vatAmount)} ر.س</span>\n              <span className=\"text-xs font-bold text-amber-700\">{Number(form.vatRate ?? SAUDI_STANDARD_VAT_RATE)}%</span>\n            </div>\n          </div>\n          <div className=\"space-y-2\">\n            <Label>الإجمالي شامل الضريبة</Label>\n            <div className=\"flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50/70 px-3 text-sm font-black text-emerald-900\">\n              {formatMoney(form.purchaseValueIncludingVat)} ر.س\n            </div>\n          </div>\n          <div className=\"md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/55 px-3 py-2 text-xs leading-6 text-blue-800\">\n            تُطبّق النسبة الأساسية لضريبة القيمة المضافة في المملكة العربية السعودية تلقائيًا بنسبة 15%. ويمكن اختيار «بدون ضريبة» للحالات غير الخاضعة أو المستثناة وفق المستند المالي.\n          </div>\n          <div className=\"space-y-2 md:col-span-2\">",
    'purchase VAT UI'
  );

  s = replaceOnce(
    s,
    "        purchaseValue:\n          form.purchaseValue === null || form.purchaseValue === undefined || form.purchaseValue === ('' as any)\n            ? null\n            : Number(form.purchaseValue),\n        notes:",
    "        purchaseValue:\n          form.purchaseValue === null || form.purchaseValue === undefined || form.purchaseValue === ('' as any)\n            ? null\n            : Number(form.purchaseValue),\n        vatRate: Number(form.vatRate ?? SAUDI_STANDARD_VAT_RATE),\n        vatAmount: form.vatAmount === null || form.vatAmount === undefined ? null : Number(form.vatAmount),\n        purchaseValueBeforeVat: form.purchaseValueBeforeVat === null || form.purchaseValueBeforeVat === undefined ? null : Number(form.purchaseValueBeforeVat),\n        purchaseValueIncludingVat: form.purchaseValueIncludingVat === null || form.purchaseValueIncludingVat === undefined ? null : Number(form.purchaseValueIncludingVat),\n        notes:",
    'submit VAT fields'
  );

  fs.writeFileSync(path, s);
}

console.log('Saudi VAT asset frontend patch applied.');
