import fs from 'node:fs';

const componentPath = 'src/app/components/MosqueFieldVisitsPanel.tsx';
const apiPath = 'src/app/api/mosques.ts';
let source = fs.readFileSync(componentPath, 'utf8');
let api = fs.readFileSync(apiPath, 'utf8');

const replaceOnce = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`Missing anchor: ${label}`);
  return text.replace(from, to);
};

api = replaceOnce(
  api,
  'export type MosqueFieldVisitAttachment = MosqueFieldVisitImage;\n\nexport type MosqueFieldVisitItem = {',
  `export type MosqueFieldVisitAttachment = MosqueFieldVisitImage;\n\nexport type MosqueFieldVisitQuranInventoryDetails = {\n  largeCount?: number | null;\n  mediumCount?: number | null;\n  smallCount?: number | null;\n  recommendedWithdrawalCount?: number | null;\n  conditionStatus?: 'not_checked' | 'good' | 'needs_attention';\n  publisherStatus?: 'not_checked' | 'approved' | 'needs_review';\n  notes?: string | null;\n  capturedFrom?: 'field_visit';\n};\n\nexport type MosqueFieldVisitItemDetails = {\n  quranInventory?: MosqueFieldVisitQuranInventoryDetails;\n  [key: string]: unknown;\n};\n\nexport type MosqueFieldVisitItem = {`,
  'Quran item detail types',
);

api = replaceOnce(
  api,
  '  resolutionNote?: string | null;\n  beforeImages: MosqueFieldVisitImage[];',
  '  resolutionNote?: string | null;\n  details?: MosqueFieldVisitItemDetails | null;\n  beforeImages: MosqueFieldVisitImage[];',
  'MosqueFieldVisitItem.details',
);

source = replaceOnce(
  source,
  '  type MosqueQuranStockDashboard,\n  type MosqueRequest,',
  '  type MosqueQuranStockDashboard,\n  type MosqueQuranOpeningBaselineStatus,\n  type MosqueFieldVisitQuranInventoryDetails,\n  type MosqueRequest,',
  'Quran detail imports',
);

source = replaceOnce(
  source,
  "  | 'quran_quantity'\n  | 'activity_approval'",
  "  | 'quran_quantity'\n  | 'quran_full'\n  | 'activity_approval'",
  'quran_full profile key',
);

source = replaceOnce(
  source,
  "  quran_quantity: [\n    { value: 'good', label: 'كافية ومناسبة' },\n    { value: 'needs_action', label: 'غير كافية / تحتاج استكمال' },\n    notApplicableStatus,\n    uncheckedStatus,\n  ],\n  activity_approval:",
  "  quran_quantity: [\n    { value: 'good', label: 'كافية ومناسبة' },\n    { value: 'needs_action', label: 'غير كافية / تحتاج استكمال' },\n    notApplicableStatus,\n    uncheckedStatus,\n  ],\n  quran_full: [\n    { value: 'good', label: 'سليمة ومعتمدة وكافية' },\n    { value: 'needs_action', label: 'تحتاج معالجة / استكمال' },\n    { value: 'not_available', label: 'لا توجد مصاحف بالموقع' },\n    notApplicableStatus,\n    uncheckedStatus,\n  ],\n  activity_approval:",
  'quran_full profile',
);

source = replaceOnce(
  source,
  "  'كفاية أعداد المصاحف وملاءمة أحجامها': 'quran_quantity',\n  'خلو الموقع من الكتب",
  "  'كفاية أعداد المصاحف وملاءمة أحجامها': 'quran_quantity',\n  'سلامة المصاحف والتحقق من جهة الطباعة وكفاية الأعداد وملاءمة الأحجام': 'quran_full',\n  'خلو الموقع من الكتب",
  'merged Quran profile mapping',
);

source = replaceOnce(
  source,
  "const QURAN_QUANTITY_ITEM_TITLE = 'كفاية أعداد المصاحف وملاءمة أحجامها';\nconst QURAN_EVIDENCE_PREFIX = 'مرجع مكتبة المصاحف وقت الزيارة:';",
  `const QURAN_FIELD_ITEM_TITLE = 'سلامة المصاحف والتحقق من جهة الطباعة وكفاية الأعداد وملاءمة الأحجام';\nconst LEGACY_QURAN_ITEM_TITLES = new Set(['سلامة المصاحف والتحقق من جهة الطباعة', 'كفاية أعداد المصاحف وملاءمة أحجامها']);\nconst isQuranFieldVisitItem = (item: Pick<MosqueFieldVisitItem, 'title'>) => item.title === QURAN_FIELD_ITEM_TITLE || LEGACY_QURAN_ITEM_TITLES.has(item.title);\nconst QURAN_EVIDENCE_PREFIX = 'مرجع مكتبة المصاحف وقت الزيارة:';`,
  'merged Quran constants',
);

const helperAnchor = `const mergeQuranEvidence = (currentNote: string | null | undefined, evidence: string) => {\n  const keptLines = String(currentNote || '')\n    .split('\\n')\n    .map((line) => line.trim())\n    .filter((line) => line && !line.startsWith(QURAN_EVIDENCE_PREFIX));\n  return [...keptLines, evidence].join('\\n');\n};\n`;

const helpers = `${helperAnchor}\nconst normalizeQuranChecklistItems = (items: MosqueFieldVisitItem[] = []) => {\n  const mergedExisting = items.find((item) => item.title === QURAN_FIELD_ITEM_TITLE);\n  const legacy = items.filter((item) => LEGACY_QURAN_ITEM_TITLES.has(item.title));\n  if (!mergedExisting && legacy.length < 2) return items;\n\n  const candidates = mergedExisting ? [mergedExisting, ...legacy] : legacy;\n  const firstIndex = Math.min(...candidates.map((candidate) => items.indexOf(candidate)).filter((index) => index >= 0));\n  const priorityRank: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };\n  const resolutionRank: Record<string, number> = { new: 1, referred: 2, in_progress: 3, resolved: 4, closed: 5 };\n  const status = candidates.some((item) => item.status === 'needs_action')\n    ? 'needs_action'\n    : candidates.every((item) => item.status === 'good')\n      ? 'good'\n      : candidates.every((item) => item.status === 'not_available')\n        ? 'not_available'\n        : 'not_checked';\n  const selectedPriority = [...candidates].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))[0]?.priority || 'normal';\n  const selectedResolution = [...candidates].sort((a, b) => (resolutionRank[b.resolutionStatus] || 0) - (resolutionRank[a.resolutionStatus] || 0))[0]?.resolutionStatus || 'new';\n  const notes = Array.from(new Set(candidates.map((item) => String(item.note || '').trim()).filter(Boolean)));\n  const resolutionNotes = Array.from(new Set(candidates.map((item) => String(item.resolutionNote || '').trim()).filter(Boolean)));\n  const merged: MosqueFieldVisitItem = {\n    ...(mergedExisting || candidates[0]),\n    title: QURAN_FIELD_ITEM_TITLE,\n    category: 'المصاحف',\n    status,\n    priority: selectedPriority as MosqueFieldVisitItem['priority'],\n    resolutionStatus: selectedResolution as MosqueFieldVisitItem['resolutionStatus'],\n    note: notes.join('\\n'),\n    resolutionNote: resolutionNotes.join('\\n'),\n    responsibleEntity: candidates.find((item) => item.responsibleEntity)?.responsibleEntity || null,\n    dueDate: candidates.find((item) => item.dueDate)?.dueDate || null,\n    details: mergedExisting?.details || candidates.find((item) => item.details)?.details || null,\n    beforeImages: candidates.flatMap((item) => item.beforeImages || []),\n    afterImages: candidates.flatMap((item) => item.afterImages || []),\n  };\n  const withoutQuran = items.filter((item) => item.title !== QURAN_FIELD_ITEM_TITLE && !LEGACY_QURAN_ITEM_TITLES.has(item.title));\n  withoutQuran.splice(Math.max(0, firstIndex), 0, merged);\n  return withoutQuran;\n};\n\nconst quranInventoryDetails = (item: MosqueFieldVisitItem): MosqueFieldVisitQuranInventoryDetails =>\n  (item.details?.quranInventory || {}) as MosqueFieldVisitQuranInventoryDetails;\n\nconst quranInventorySummary = (item: MosqueFieldVisitItem) => {\n  const details = quranInventoryDetails(item);\n  const values = [details.largeCount, details.mediumCount, details.smallCount];\n  const ready = values.every((value) => Number.isFinite(Number(value)));\n  if (!ready) return '';\n  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);\n  const condition = details.conditionStatus === 'good' ? 'سليمة' : details.conditionStatus === 'needs_attention' ? 'توجد ملاحظات' : 'لم يتحقق';\n  const publisher = details.publisherStatus === 'approved' ? 'معتمدة' : details.publisherStatus === 'needs_review' ? 'تحتاج مراجعة' : 'لم يتحقق';\n  return \`الجرد الميداني: إجمالي \${total} — كبير \${Number(details.largeCount || 0)} — متوسط \${Number(details.mediumCount || 0)} — صغير \${Number(details.smallCount || 0)} — المقترح سحبها/استبدالها \${Number(details.recommendedWithdrawalCount || 0)} — الحالة \${condition} — جهة الطباعة \${publisher}\`;\n};\n\nconst QuranFieldInventoryEditor: React.FC<{\n  item: MosqueFieldVisitItem;\n  stock: MosqueQuranStockDashboard['sites'][number] | null;\n  baselineClosed?: boolean | null;\n  onChange: (patch: Partial<MosqueFieldVisitQuranInventoryDetails>) => void;\n}> = ({ item, stock, baselineClosed, onChange }) => {\n  const details = quranInventoryDetails(item);\n  const numericValue = (key: 'largeCount' | 'mediumCount' | 'smallCount' | 'recommendedWithdrawalCount') => details[key] == null ? '' : String(details[key]);\n  const updateNumber = (key: 'largeCount' | 'mediumCount' | 'smallCount' | 'recommendedWithdrawalCount', value: string) =>\n    onChange({ [key]: value === '' ? null : Math.max(0, Math.trunc(Number(value) || 0)) });\n  const counts = [details.largeCount, details.mediumCount, details.smallCount];\n  const total = counts.every((value) => value != null && Number.isFinite(Number(value)))\n    ? counts.reduce((sum, value) => sum + Number(value || 0), 0)\n    : null;\n  const target = stock?.targetCount || 0;\n  const need = total == null || target <= 0 ? null : Math.max(0, target - total);\n  return <div className=\"md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4\">\n    <div className=\"mb-3 flex flex-wrap items-start justify-between gap-2\"><div><b className=\"text-sm text-emerald-950\">الجرد الميداني للمصاحف</b><p className=\"mt-1 text-[11px] leading-5 text-slate-600\">أدخل العدد الفعلي الموجود أثناء الزيارة. عند الحفظ ينتقل الجرد تلقائيًا إلى قائمة المصاحف؛ قبل إقفال الجرد التأسيسي يُسجل كتحديث تأسيسي، وبعد الإقفال يُحفظ كجرد دوري جديد.</p></div><Badge variant=\"outline\" className={baselineClosed ? 'border-sky-300 bg-white text-sky-700' : 'border-amber-300 bg-white text-amber-700'}>{baselineClosed ? 'جرد دوري' : 'الجرد التأسيسي مفتوح'}</Badge></div>\n    <div className=\"grid gap-3 sm:grid-cols-2 lg:grid-cols-4\">\n      <Field label=\"المصاحف الكبيرة *\"><Input type=\"number\" min=\"0\" value={numericValue('largeCount')} onChange={(event) => updateNumber('largeCount', event.target.value)} /></Field>\n      <Field label=\"المصاحف المتوسطة *\"><Input type=\"number\" min=\"0\" value={numericValue('mediumCount')} onChange={(event) => updateNumber('mediumCount', event.target.value)} /></Field>\n      <Field label=\"المصاحف الصغيرة *\"><Input type=\"number\" min=\"0\" value={numericValue('smallCount')} onChange={(event) => updateNumber('smallCount', event.target.value)} /></Field>\n      <Field label=\"المقترح سحبها / استبدالها\"><Input type=\"number\" min=\"0\" value={numericValue('recommendedWithdrawalCount')} onChange={(event) => updateNumber('recommendedWithdrawalCount', event.target.value)} /></Field>\n      <Field label=\"سلامة المصاحف *\"><NativeSelect value={details.conditionStatus || 'not_checked'} onChange={(event) => onChange({ conditionStatus: event.target.value as MosqueFieldVisitQuranInventoryDetails['conditionStatus'] })}><option value=\"not_checked\">لم يتم التحقق</option><option value=\"good\">سليمة</option><option value=\"needs_attention\">توجد مصاحف تالفة / تحتاج معالجة</option></NativeSelect></Field>\n      <Field label=\"التحقق من جهة الطباعة *\"><NativeSelect value={details.publisherStatus || 'not_checked'} onChange={(event) => onChange({ publisherStatus: event.target.value as MosqueFieldVisitQuranInventoryDetails['publisherStatus'] })}><option value=\"not_checked\">لم يتم التحقق</option><option value=\"approved\">تم التحقق / معتمدة</option><option value=\"needs_review\">تحتاج مراجعة أو توجد ملاحظة</option></NativeSelect></Field>\n      <Field label=\"إجمالي العد الفعلي\"><Input readOnly value={total == null ? '' : total} className=\"bg-white font-black\" /></Field>\n      <Field label=\"الاحتياج وفق المستهدف\"><Input readOnly value={need == null ? (target > 0 ? '' : 'المستهدف غير محدد') : need} className=\"bg-white font-black\" /></Field>\n    </div>\n    <div className=\"mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3\"><div className=\"rounded-xl bg-white px-3 py-2\">الرصيد النظامي الحالي: <b>{stock?.systemStock.totalCount ?? 0}</b></div><div className=\"rounded-xl bg-white px-3 py-2\">العدد المستهدف: <b>{target > 0 ? target : 'غير محدد'}</b></div><div className=\"rounded-xl bg-white px-3 py-2\">آخر جرد: <b>{stock?.latestInventory?.countedAt ? new Date(stock.latestInventory.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لا يوجد'}</b></div></div>\n  </div>;\n};\n`;
source = replaceOnce(source, helperAnchor, helpers, 'Quran normalization helpers');

source = replaceOnce(
  source,
  "            تطبيق التقييم العددي المقترح",
  "            نسخ الرصيد النظامي كبداية للجرد",
  'Quran stock copy button label',
);

source = replaceOnce(
  source,
  'const freshItems = (items: MosqueFieldVisitItem[]) => items.map((item) => ({',
  'const freshItems = (items: MosqueFieldVisitItem[]) => normalizeQuranChecklistItems(items).map((item) => ({',
  'normalize fresh items',
);

source = replaceOnce(
  source,
  "  resolutionNote: item.resolutionNote || '',\n  beforeImages:",
  "  resolutionNote: item.resolutionNote || '',\n  details: item.details ? JSON.parse(JSON.stringify(item.details)) : null,\n  beforeImages:",
  'clone item details',
);

source = replaceOnce(
  source,
  "  const [quranStockDashboard, setQuranStockDashboard] = React.useState<MosqueQuranStockDashboard | null>(null);\n  const [quranSupplyRequests",
  "  const [quranStockDashboard, setQuranStockDashboard] = React.useState<MosqueQuranStockDashboard | null>(null);\n  const [quranOpeningBaselineStatus, setQuranOpeningBaselineStatus] = React.useState<MosqueQuranOpeningBaselineStatus | null>(null);\n  const [quranSupplyRequests",
  'baseline state',
);

source = replaceOnce(
  source,
  "      const [summaryData, tourData, visitData, checklist, quranStockData, requestRows] = await Promise.all([",
  "      const [summaryData, tourData, visitData, checklist, quranStockData, requestRows, baselineStatus] = await Promise.all([",
  'load tuple baseline',
);
source = replaceOnce(
  source,
  "        mosqueApi.requests().catch(() => [] as MosqueRequest[]),\n      ]);",
  "        mosqueApi.requests().catch(() => [] as MosqueRequest[]),\n        mosqueApi.quranOpeningBaselineStatus().catch(() => null as MosqueQuranOpeningBaselineStatus | null),\n      ]);",
  'load baseline call',
);
source = replaceOnce(
  source,
  "      setQuranStockDashboard(quranStockData);\n      setQuranSupplyRequests(requestRows.filter(isQuranSupplyRequest));\n      setTours(tourData);\n      setVisits(visitData);\n      setTemplate(checklist);",
  "      setQuranStockDashboard(quranStockData);\n      setQuranOpeningBaselineStatus(baselineStatus);\n      setQuranSupplyRequests(requestRows.filter(isQuranSupplyRequest));\n      setTours(tourData);\n      setVisits(visitData.map((visit) => ({ ...visit, items: normalizeQuranChecklistItems(visit.items || []) })));\n      setTemplate(normalizeQuranChecklistItems(checklist));",
  'normalize loaded visits',
);

const applyStart = source.indexOf('  const applyQuranQuantityAssessment = () => {');
const syncStart = source.indexOf('\n\n  const syncQuranSupplyRequest = async', applyStart);
if (applyStart < 0 || syncStart < 0) throw new Error('Unable to locate Quran assessment function');
const newApply = `  const updateQuranInventoryDetails = (index: number, patch: Partial<MosqueFieldVisitQuranInventoryDetails>) => {\n    const item = visitForm.items[index];\n    const currentDetails = quranInventoryDetails(item);\n    setVisitItem(index, {\n      details: {\n        ...(item.details || {}),\n        quranInventory: { ...currentDetails, ...patch, capturedFrom: 'field_visit' },\n      },\n    });\n  };\n\n  const applyQuranQuantityAssessment = () => {\n    const itemIndex = visitForm.items.findIndex(isQuranFieldVisitItem);\n    if (itemIndex < 0) {\n      toast.error('تعذر العثور على بند فحص وجرد المصاحف في قائمة الفحص');\n      return;\n    }\n    if (!selectedQuranStock) {\n      toast.error('لا توجد بيانات رصيد مصاحف مرتبطة بالموقع المحدد');\n      return;\n    }\n    updateQuranInventoryDetails(itemIndex, {\n      largeCount: selectedQuranStock.systemStock.largeCount,\n      mediumCount: selectedQuranStock.systemStock.mediumCount,\n      smallCount: selectedQuranStock.systemStock.smallCount,\n      recommendedWithdrawalCount: 0,\n    });\n    toast.success('تم نسخ الرصيد النظامي الحالي كنقطة بداية؛ عدّل الأعداد لتطابق العد الفعلي في الموقع');\n  };\n\n  const syncQuranVisitInventory = async (visit: MosqueFieldVisit) => {\n    const item = (visit.items || []).find(isQuranFieldVisitItem);\n    if (!item) return;\n    const details = quranInventoryDetails(item);\n    const counts = [details.largeCount, details.mediumCount, details.smallCount];\n    if (!counts.every((value) => value != null && Number.isFinite(Number(value)))) return;\n    const total = counts.reduce((sum, value) => sum + Number(value || 0), 0);\n    const stock = quranStockDashboard?.sites.find((row) => row.site.id === visit.siteId) || null;\n    const target = stock?.targetCount || 0;\n    const conditionLabel = details.conditionStatus === 'good' ? 'سليمة' : details.conditionStatus === 'needs_attention' ? 'توجد ملاحظات / تالفة' : 'لم يتم التحقق';\n    const publisherLabel = details.publisherStatus === 'approved' ? 'معتمدة' : details.publisherStatus === 'needs_review' ? 'تحتاج مراجعة' : 'لم يتم التحقق';\n    const notes = [\n      'مصدر الجرد: الزيارة الميدانية ' + visit.visitNumber + '.',\n      'إجمالي العد الفعلي: ' + total + ' مصحف.',\n      'سلامة المصاحف: ' + conditionLabel + '.',\n      'جهة الطباعة: ' + publisherLabel + '.',\n      details.notes ? 'ملاحظات: ' + details.notes : '',\n    ].filter(Boolean).join('\\n');\n\n    let baseline = quranOpeningBaselineStatus;\n    if (!baseline) baseline = await mosqueApi.quranOpeningBaselineStatus().catch(() => null);\n    if (baseline && !baseline.closed) {\n      const response = await mosqueApi.saveQuranOpeningBaseline({\n        siteId: visit.siteId,\n        largeCount: Number(details.largeCount || 0),\n        mediumCount: Number(details.mediumCount || 0),\n        smallCount: Number(details.smallCount || 0),\n        recommendedWithdrawalCount: Number(details.recommendedWithdrawalCount || 0),\n        countedAt: visit.visitDate,\n        notes,\n      });\n      setQuranOpeningBaselineStatus(response.state);\n      toast.success('تم نقل أعداد المصاحف من الزيارة إلى الجرد التأسيسي للموقع');\n      return;\n    }\n\n    await mosqueApi.createQuranInventory({\n      siteId: visit.siteId,\n      largeCount: Number(details.largeCount || 0),\n      mediumCount: Number(details.mediumCount || 0),\n      smallCount: Number(details.smallCount || 0),\n      damagedCount: Number(details.recommendedWithdrawalCount || 0),\n      neededCount: target > 0 ? Math.max(0, target - total) : 0,\n      countedAt: visit.visitDate,\n      notes,\n    });\n    toast.success('تم تسجيل أعداد المصاحف من الزيارة كجرد دوري جديد');\n  };`;
source = source.slice(0, applyStart) + newApply + source.slice(syncStart);

source = source.replace(
  '  const syncQuranSupplyRequest = async (visit: MosqueFieldVisit) => {\n    const stock = quranStockDashboard?.sites.find((row) => row.site.id === visit.siteId) || null;\n    const quantityItem = (visit.items || []).find((item) => item.title === QURAN_QUANTITY_ITEM_TITLE) || null;',
  "  const syncQuranSupplyRequest = async (visit: MosqueFieldVisit, dashboardOverride?: MosqueQuranStockDashboard | null) => {\n    const stock = (dashboardOverride || quranStockDashboard)?.sites.find((row) => row.site.id === visit.siteId) || null;\n    const quantityItem = (visit.items || []).find(isQuranFieldVisitItem) || null;",
);

source = replaceOnce(
  source,
  "    const missingBeforeEvidence = ['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus)\n      ? visitForm.items.find((item) => item.status === 'needs_action' && !isActivityApprovalItem(item) && !(item.beforeImages || []).length)",
  "    const missingBeforeEvidence = ['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus)\n      ? visitForm.items.find((item) => item.status === 'needs_action' && !isActivityApprovalItem(item) && !isQuranFieldVisitItem(item) && !(item.beforeImages || []).length)",
  'Quran before-photo exemption',
);
source = replaceOnce(
  source,
  "      && !isActivityApprovalItem(item)\n      && item.resolutionStatus === 'closed'",
  "      && !isActivityApprovalItem(item)\n      && !isQuranFieldVisitItem(item)\n      && item.resolutionStatus === 'closed'",
  'Quran after-photo exemption',
);

source = replaceOnce(
  source,
  "    if (['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus) && visitForm.items.some((item) => item.status === 'not_checked')) {",
  "    const quranCensusItem = visitForm.items.find(isQuranFieldVisitItem);\n    if (quranCensusItem && ['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus)) {\n      const details = quranInventoryDetails(quranCensusItem);\n      const missingCount = [details.largeCount, details.mediumCount, details.smallCount].some((value) => value == null || !Number.isFinite(Number(value)));\n      if (missingCount) { toast.error('أدخل عدد المصاحف الكبيرة والمتوسطة والصغيرة في بند المصاحف قبل إكمال الزيارة'); return; }\n      if (!details.conditionStatus || details.conditionStatus === 'not_checked') { toast.error('حدد نتيجة سلامة المصاحف في بند المصاحف'); return; }\n      if (!details.publisherStatus || details.publisherStatus === 'not_checked') { toast.error('حدد نتيجة التحقق من جهة طباعة المصاحف'); return; }\n    }\n    if (['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus) && visitForm.items.some((item) => item.status === 'not_checked')) {",
  'Quran census completion validation',
);

source = replaceOnce(
  source,
  "      toast.success(editingVisit ? 'تم تحديث الزيارة وحفظ نتائجها' : 'تم إنشاء الزيارة الميدانية');\n      await syncQuranSupplyRequest(savedVisit);",
  "      toast.success(editingVisit ? 'تم تحديث الزيارة وحفظ نتائجها' : 'تم إنشاء الزيارة الميدانية');\n      try { await syncQuranVisitInventory(savedVisit); } catch (error) { toast.warning('تم حفظ الزيارة، لكن تعذر تحديث جرد المصاحف: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')); }\n      const refreshedQuranStock = await mosqueApi.quranStockDashboard().catch(() => quranStockDashboard);\n      if (refreshedQuranStock) setQuranStockDashboard(refreshedQuranStock);\n      await syncQuranSupplyRequest(savedVisit, refreshedQuranStock);",
  'sync Quran census on save',
);

source = replaceOnce(
  source,
  "        case 'note': return item.note || '-';",
  "        case 'note': { const census = isQuranFieldVisitItem(item) ? quranInventorySummary(item) : ''; return [item.note, census].filter(Boolean).join(' — ') || '-'; }",
  'print Quran census summary',
);

source = replaceOnce(
  source,
  "                {item.note && <ReadOnlyNote label=\"الملاحظة\" value={item.note} />}\n                {item.status === 'needs_action'",
  "                {item.note && <ReadOnlyNote label=\"الملاحظة\" value={item.note} />}\n                {isQuranFieldVisitItem(item) && quranInventorySummary(item) && <ReadOnlyNote label=\"الجرد الميداني للمصاحف\" value={quranInventorySummary(item)} />}\n                {item.status === 'needs_action'",
  'view Quran census summary',
);

const editNeedle = "</NativeSelect><NativeSelect className=\"lg:w-36\" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>{item.status === 'needs_action' &&";
const editReplacement = "</NativeSelect><NativeSelect className=\"lg:w-36\" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>{isQuranFieldVisitItem(item) && <QuranFieldInventoryEditor item={item} stock={selectedQuranStock} baselineClosed={quranOpeningBaselineStatus?.closed ?? null} onChange={(patch) => updateQuranInventoryDetails(index, patch)} />}{item.status === 'needs_action' &&";
source = replaceOnce(source, editNeedle, editReplacement, 'Quran census editor in visit form');

source = replaceOnce(
  source,
  "<div className=\"md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3\"><div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\"><div><b className=\"text-sm text-emerald-900\">سجل المعالجة المصور — قبل / بعد</b><p className=\"mt-1 text-[11px] text-slate-500\">وثّق الحالة قبل المعالجة، ثم أضف صورة بعد التنفيذ لإغلاق الملاحظة والتحقق منها.</p></div><div className=\"flex gap-2\"><Badge variant=\"outline\">قبل: {(item.beforeImages || []).length}</Badge><Badge variant=\"outline\">بعد: {(item.afterImages || []).length}</Badge></div></div><div className=\"grid gap-3 md:grid-cols-2\">{isActivityApprovalItem(item) ? <ActivityApprovalEvidenceField",
  "{!isQuranFieldVisitItem(item) && <div className=\"md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3\"><div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\"><div><b className=\"text-sm text-emerald-900\">سجل المعالجة المصور — قبل / بعد</b><p className=\"mt-1 text-[11px] text-slate-500\">وثّق الحالة قبل المعالجة، ثم أضف صورة بعد التنفيذ لإغلاق الملاحظة والتحقق منها.</p></div><div className=\"flex gap-2\"><Badge variant=\"outline\">قبل: {(item.beforeImages || []).length}</Badge><Badge variant=\"outline\">بعد: {(item.afterImages || []).length}</Badge></div></div><div className=\"grid gap-3 md:grid-cols-2\">{isActivityApprovalItem(item) ? <ActivityApprovalEvidenceField",
  'hide before-after panel for Quran item',
);
source = replaceOnce(
  source,
  " /></div></div></div>}</CardContent></Card>)}</div>",
  " /></div></div>}</div>}</CardContent></Card>)}</div>",
  'close Quran treatment conditional',
);

fs.writeFileSync(apiPath, api);
fs.writeFileSync(componentPath, source);
console.log('Applied merged Quran field census frontend patch.');
