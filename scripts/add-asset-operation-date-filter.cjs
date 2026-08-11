const fs = require('fs');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Patch target not found: ${label}`);
  }
  return source.replace(before, after);
}

const apiPath = 'src/app/api/assets.ts';
let api = fs.readFileSync(apiPath, 'utf8');

api = replaceOnce(
  api,
  "  all?: boolean;\n};",
  "  all?: boolean;\n  dateFrom?: string;\n  dateTo?: string;\n};",
  'AssetReportQuery date fields'
);

api = replaceOnce(
  api,
  "  if (query.status && query.status !== 'all') params.set('status', query.status);\n};",
  "  if (query.status && query.status !== 'all') params.set('status', query.status);\n  if (query.dateFrom) params.set('dateFrom', query.dateFrom);\n  if (query.dateTo) params.set('dateTo', query.dateTo);\n};",
  'appendAssetFilters date params'
);

api = replaceOnce(
  api,
  "Pick<AssetReportQuery, 'search' | 'category' | 'status'>",
  "Pick<AssetReportQuery, 'search' | 'category' | 'status' | 'dateFrom' | 'dateTo'>",
  'asset groups date filter typing'
);

fs.writeFileSync(apiPath, api);

const pagePath = 'src/app/pages/AssetReportsPage.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

page = replaceOnce(
  page,
  "  ['purchaseValue', 'قيمة الشراء'],\n  ['attachments', 'عدد المرفقات'],",
  "  ['purchaseValue', 'قيمة الشراء'],\n  ['createdAt', 'تاريخ الإدخال'],\n  ['attachments', 'عدد المرفقات'],",
  'printable createdAt field'
);

page = replaceOnce(
  page,
  "  purchaseValue: 9,\n  attachments: 6,",
  "  purchaseValue: 9,\n  createdAt: 10,\n  attachments: 6,",
  'createdAt screen width'
);

page = replaceOnce(
  page,
  "  if (key === 'purchaseValue') {\n    return asset.purchaseValue != null ? Number(asset.purchaseValue).toLocaleString('ar-SA') : '-';\n  }",
  "  if (key === 'createdAt') {\n    return asset.createdAt ? new Date(asset.createdAt).toLocaleString('ar-SA') : '-';\n  }\n  if (key === 'purchaseValue') {\n    return asset.purchaseValue != null ? Number(asset.purchaseValue).toLocaleString('ar-SA') : '-';\n  }",
  'createdAt value formatter'
);

page = replaceOnce(
  page,
  "    ['رقم البطاقة', asset.cardNumber],\n    ['قيمة الشراء', asset.purchaseValue != null ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س` : '-'],",
  "    ['رقم البطاقة', asset.cardNumber],\n    ['قيمة الشراء', asset.purchaseValue != null ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س` : '-'],\n    ['تاريخ إدخال البيانات', asset.createdAt ? new Date(asset.createdAt).toLocaleString('ar-SA') : '-'],",
  'single asset entry date'
);

page = replaceOnce(
  page,
  "  const [group, setGroup] = useState('all');\n  const [sortKey, setSortKey] = useState<FieldKey>('itemNumber');",
  "  const [group, setGroup] = useState('all');\n  const [entryDateFrom, setEntryDateFrom] = useState('');\n  const [entryDateTo, setEntryDateTo] = useState('');\n  const [sortKey, setSortKey] = useState<FieldKey>('itemNumber');",
  'date filter state'
);

page = replaceOnce(
  page,
  "  }, [debouncedQuery, status, category, group, sortKey, sortDirection, pageSize]);",
  "  }, [debouncedQuery, status, category, group, entryDateFrom, entryDateTo, sortKey, sortDirection, pageSize]);",
  'page reset date dependencies'
);

page = replaceOnce(
  page,
  "      category,\n      group,\n      page,",
  "      category,\n      group,\n      dateFrom: entryDateFrom || undefined,\n      dateTo: entryDateTo || undefined,\n      page,",
  'report query date params'
);

page = replaceOnce(
  page,
  "  }, [debouncedQuery, status, category, group, page, pageSize, sortKey, sortDirection]);",
  "  }, [debouncedQuery, status, category, group, entryDateFrom, entryDateTo, page, pageSize, sortKey, sortDirection]);",
  'report effect date dependencies'
);

page = replaceOnce(
  page,
  "    getAssetGroups({ search: debouncedQuery, category, status })",
  "    getAssetGroups({ search: debouncedQuery, category, status, dateFrom: entryDateFrom || undefined, dateTo: entryDateTo || undefined })",
  'group query date params'
);

page = replaceOnce(
  page,
  "  }, [debouncedQuery, category, status]);",
  "  }, [debouncedQuery, category, status, entryDateFrom, entryDateTo]);",
  'group effect date dependencies'
);

page = replaceOnce(
  page,
  "      category,\n      group,\n      sortKey,\n      sortDirection,\n      all: true,",
  "      category,\n      group,\n      dateFrom: entryDateFrom || undefined,\n      dateTo: entryDateTo || undefined,\n      sortKey,\n      sortDirection,\n      all: true,",
  'export query date params'
);

page = replaceOnce(
  page,
  "    setGroup('all');\n    setSortKey('itemNumber');",
  "    setGroup('all');\n    setEntryDateFrom('');\n    setEntryDateTo('');\n    setSortKey('itemNumber');",
  'reset date filters'
);

page = replaceOnce(
  page,
  "const printWeights: Record<FieldKey, number> = { itemNumber: 8, barcode: 10, name: 14, category: 7, brand: 6, model: 7, serialNumber: 9, status: 6, department: 13, building: 6, floor: 4, room: 8, cardNumber: 8, purchaseDate: 7, purchaseValue: 8, attachments: 5 };",
  "const printWeights: Record<FieldKey, number> = { itemNumber: 8, barcode: 10, name: 14, category: 7, brand: 6, model: 7, serialNumber: 9, status: 6, department: 13, building: 6, floor: 4, room: 8, cardNumber: 8, purchaseDate: 7, purchaseValue: 8, createdAt: 9, attachments: 5 };",
  'print createdAt width'
);

page = replaceOnce(
  page,
  "      const groupLabel = activeGroup?.label || 'جميع المجموعات';\n      openPrintHtml(`<!doctype html>",
  "      const groupLabel = activeGroup?.label || 'جميع المجموعات';\n      const operationDateLabel = entryDateFrom || entryDateTo\n        ? ' | تاريخ إدخال البيانات: ' + (entryDateFrom ? 'من ' + new Date(entryDateFrom + 'T12:00:00').toLocaleDateString('ar-SA') : 'من البداية') + ' ' + (entryDateTo ? 'إلى ' + new Date(entryDateTo + 'T12:00:00').toLocaleDateString('ar-SA') : 'حتى الآن')\n        : '';\n      openPrintHtml(`<!doctype html>",
  'printed operation date label'
);

page = replaceOnce(
  page,
  "${debouncedQuery ? ` | البحث: ${escapeHtml(debouncedQuery)}` : ''}</div>",
  "${debouncedQuery ? ` | البحث: ${escapeHtml(debouncedQuery)}` : ''}${escapeHtml(operationDateLabel)}</div>",
  'printed filters operation date'
);

page = replaceOnce(
  page,
  "          <p className=\"mt-2 max-w-3xl text-sm text-muted-foreground\">تصفية مرنة حسب نوع الأصل والمجموعة والحالة والبحث، مع تحميل النتائج على دفعات سريعة وتطبيق نفس التصفية على Excel وPDF والقالب الرسمي.</p>",
  "          <p className=\"mt-2 max-w-3xl text-sm text-muted-foreground\">تصفية مرنة حسب نوع الأصل والمجموعة والحالة والبحث وتاريخ إدخال البيانات، مع تطبيق نفس التصفية على الجدول وExcel وPDF والقالب الرسمي.</p>",
  'report intro date filter text'
);

page = replaceOnce(
  page,
  "            <Button variant=\"outline\" onClick={resetFilters}><RotateCcw className=\"ml-2 h-4 w-4\"/>إعادة ضبط</Button>\n          </div>\n\n          <div className=\"rounded-2xl border bg-background/55 p-4\">",
  "            <Button variant=\"outline\" onClick={resetFilters}><RotateCcw className=\"ml-2 h-4 w-4\"/>إعادة ضبط</Button>\n          </div>\n\n          <div className=\"rounded-2xl border bg-background/55 p-4\">\n            <div className=\"mb-3\">\n              <div className=\"font-black\">حصر تاريخ عمليات إدخال البيانات</div>\n              <p className=\"mt-1 text-xs text-muted-foreground\">حدد فترة الإدخال لعرض الأصول التي تم تسجيلها خلال هذه المدة فقط. تطبق الفترة نفسها على الجدول وExcel وPDF.</p>\n            </div>\n            <div className=\"grid grid-cols-1 gap-3 sm:grid-cols-2\">\n              <label className=\"space-y-1.5\"><span className=\"text-xs font-bold text-muted-foreground\">من تاريخ الإدخال</span><Input type=\"date\" value={entryDateFrom} max={entryDateTo || undefined} onChange={(e)=>setEntryDateFrom(e.target.value)} dir=\"ltr\"/></label>\n              <label className=\"space-y-1.5\"><span className=\"text-xs font-bold text-muted-foreground\">إلى تاريخ الإدخال</span><Input type=\"date\" value={entryDateTo} min={entryDateFrom || undefined} onChange={(e)=>setEntryDateTo(e.target.value)} dir=\"ltr\"/></label>\n            </div>\n          </div>\n\n          <div className=\"rounded-2xl border bg-background/55 p-4\">",
  'operation date filter UI'
);

fs.writeFileSync(pagePath, page);
console.log('Asset report operation date filter patch applied.');

// Workflow trigger marker.
