import fs from 'node:fs';

const filePath = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (oldValue, newValue, label) => {
  if (source.includes(newValue)) return;
  const matches = source.split(oldValue).length - 1;
  if (matches !== 1) throw new Error(`${label}: expected exactly one match, found ${matches}`);
  source = source.replace(oldValue, newValue);
};

replaceOnce(
  "  type MosqueFieldVisitSummary,\n  type MosqueSite,",
  "  type MosqueFieldVisitSummary,\n  type MosqueQuranStockDashboard,\n  type MosqueSite,",
  'quran stock dashboard type import',
);

const quranReferenceComponentMarker = `const getItemStatusLabel = (item: MosqueFieldVisitItem) =>
  getItemStatusOptions(item).find((option) => option.value === item.status)?.label
  || itemStatusLabels[item.status]
  || item.status;`;

const quranReferenceComponent = `${quranReferenceComponentMarker}

const QURAN_QUANTITY_ITEM_TITLE = 'كفاية أعداد المصاحف وملاءمة أحجامها';
const QURAN_EVIDENCE_PREFIX = 'مرجع مكتبة المصاحف وقت الزيارة:';

const mergeQuranEvidence = (currentNote: string | null | undefined, evidence: string) => {
  const keptLines = String(currentNote || '')
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(QURAN_EVIDENCE_PREFIX));
  return [...keptLines, evidence].join('\\n');
};

const QuranVisitStockLink: React.FC<{
  dashboard: MosqueQuranStockDashboard | null;
  siteId: string;
  onApplyQuantity: () => void;
}> = ({ dashboard, siteId, onApplyQuantity }) => {
  if (!dashboard) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        جارٍ تحميل بيانات مكتبة المصاحف المرتبطة بالموقع...
      </div>
    );
  }

  const stock = dashboard.sites.find((row) => row.site.id === siteId) || null;
  if (!stock) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
        لم يتم العثور على سجل مصاحف مرتبط بهذا المسجد أو المصلى. يفضل إجراء الجرد الأولي وتحديد العدد المستهدف قبل تقييم الكفاية.
      </div>
    );
  }

  const latestCountDate = stock.latestInventory?.countedAt
    ? new Date(stock.latestInventory.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')
    : 'لم يتم الجرد';
  const coverage = stock.coveragePercent == null ? 'غير محسوبة' : String(stock.coveragePercent) + '%';
  const target = stock.targetCount > 0 ? stock.targetCount.toLocaleString('ar-SA') : 'غير محدد';
  const statusLabel = stock.targetCount <= 0
    ? 'يلزم تحديد العدد المستهدف'
    : stock.needCount > 0
      ? 'احتياج ' + stock.needCount.toLocaleString('ar-SA') + ' مصحف'
      : 'العدد المستهدف مكتمل';

  return (
    <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              <b className="text-sm text-emerald-950">مرجع مكتبة المصاحف المرتبط بالموقع</b>
              <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">تُعرض بيانات الرصيد النظامي مباشرة داخل الزيارة لتجنب إعادة إدخال الأعداد يدويًا.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onApplyQuantity}>
            <CheckCircle2 className="ml-2 h-4 w-4" />
            تطبيق التقييم العددي المقترح
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            ['الرصيد بالموقع', stock.systemStock.totalCount.toLocaleString('ar-SA')],
            ['كبير', stock.systemStock.largeCount.toLocaleString('ar-SA')],
            ['متوسط', stock.systemStock.mediumCount.toLocaleString('ar-SA')],
            ['صغير', stock.systemStock.smallCount.toLocaleString('ar-SA')],
            ['المستهدف', target],
            ['الاحتياج', stock.needCount.toLocaleString('ar-SA')],
            ['التغطية', coverage],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-center">
              <div className="text-[10px] text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-black text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl bg-white/80 px-3 py-2">آخر جرد: <b>{latestCountDate}</b></div>
          <div className="rounded-xl bg-white/80 px-3 py-2">المتاح في مكتبة المصاحف: <b>{dashboard.summary.warehouseTotal.toLocaleString('ar-SA')}</b></div>
          <div className="rounded-xl bg-white/80 px-3 py-2">المصاحف المسحوبة من الموقع: <b>{stock.withdrawnStock.totalCount.toLocaleString('ar-SA')}</b></div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-[11px] leading-6 text-sky-900">
          <b>مهم:</b> التقييم العددي يساعد في بند «كفاية أعداد المصاحف»، لكنه لا يعتمد تلقائيًا بند «سلامة المصاحف والتحقق من جهة الطباعة»؛ هذا البند يبقى تحققًا ميدانيًا بصريًا. وعند وجود نقص تتم المعالجة من «مكتبة المصاحف» عبر حركة إضافة للموقع حتى يُخصم الرصيد من المكتبة ويُحدّث رصيد المسجد أو المصلى تلقائيًا.
        </div>
      </CardContent>
    </Card>
  );
};`;

if (!source.includes('const QuranVisitStockLink: React.FC<')) {
  if (!source.includes(quranReferenceComponentMarker)) throw new Error('quran reference component marker not found');
  source = source.replace(quranReferenceComponentMarker, quranReferenceComponent);
}

replaceOnce(
  "  const [summary, setSummary] = React.useState<MosqueFieldVisitSummary>(emptySummary);\n  const [tours, setTours] = React.useState<MosqueFieldTour[]>([]);",
  "  const [summary, setSummary] = React.useState<MosqueFieldVisitSummary>(emptySummary);\n  const [quranStockDashboard, setQuranStockDashboard] = React.useState<MosqueQuranStockDashboard | null>(null);\n  const [tours, setTours] = React.useState<MosqueFieldTour[]>([]);",
  'quran stock dashboard state',
);

replaceOnce(
  `      const [summaryData, tourData, visitData, checklist] = await Promise.all([
        mosqueApi.fieldVisitSummary(), mosqueApi.fieldTours(), mosqueApi.fieldVisits(), mosqueApi.fieldVisitChecklist(),
      ]);
      setSummary(summaryData);
      setTours(tourData);
      setVisits(visitData);
      setTemplate(checklist);`,
  `      const [summaryData, tourData, visitData, checklist, quranStockData] = await Promise.all([
        mosqueApi.fieldVisitSummary(), mosqueApi.fieldTours(), mosqueApi.fieldVisits(), mosqueApi.fieldVisitChecklist(), mosqueApi.quranStockDashboard(),
      ]);
      setSummary(summaryData);
      setQuranStockDashboard(quranStockData);
      setTours(tourData);
      setVisits(visitData);
      setTemplate(checklist);`,
  'load quran stock with field visits',
);

const setVisitItemMarker = `  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {
    setVisitForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };`;

const quranAssessmentHelpers = `${setVisitItemMarker}

  const selectedQuranStock = quranStockDashboard?.sites.find((row) => row.site.id === visitForm.siteId) || null;

  const applyQuranQuantityAssessment = () => {
    const itemIndex = visitForm.items.findIndex((item) => item.title === QURAN_QUANTITY_ITEM_TITLE);
    if (itemIndex < 0) {
      toast.error('تعذر العثور على بند كفاية أعداد المصاحف في قائمة الفحص');
      return;
    }
    if (!selectedQuranStock) {
      toast.error('لا توجد بيانات رصيد مصاحف مرتبطة بالموقع المحدد');
      return;
    }

    const currentItem = visitForm.items[itemIndex];
    const lastCount = selectedQuranStock.latestInventory?.countedAt
      ? new Date(selectedQuranStock.latestInventory.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')
      : 'لم يتم الجرد';
    const coverage = selectedQuranStock.coveragePercent == null ? 'غير محسوبة' : String(selectedQuranStock.coveragePercent) + '%';
    const targetText = selectedQuranStock.targetCount > 0
      ? selectedQuranStock.targetCount.toLocaleString('ar-SA')
      : 'غير محدد';
    const evidence = QURAN_EVIDENCE_PREFIX
      + ' الرصيد النظامي ' + selectedQuranStock.systemStock.totalCount.toLocaleString('ar-SA')
      + ' (كبير ' + selectedQuranStock.systemStock.largeCount.toLocaleString('ar-SA')
      + '، متوسط ' + selectedQuranStock.systemStock.mediumCount.toLocaleString('ar-SA')
      + '، صغير ' + selectedQuranStock.systemStock.smallCount.toLocaleString('ar-SA')
      + ')، المستهدف ' + targetText
      + '، الاحتياج ' + selectedQuranStock.needCount.toLocaleString('ar-SA')
      + '، التغطية ' + coverage
      + '، آخر جرد ' + lastCount + '.';

    if (selectedQuranStock.targetCount <= 0) {
      setVisitItem(itemIndex, { note: mergeQuranEvidence(currentItem.note, evidence) });
      toast.warning('تم ربط بيانات الرصيد بالملاحظة، لكن لم يتم تغيير النتيجة لأن العدد المستهدف غير محدد للموقع');
      return;
    }

    const needsAction = selectedQuranStock.needCount > 0;
    const suggestedPriority: MosqueFieldVisitItem['priority'] = needsAction
      ? selectedQuranStock.needLevel === 'high'
        ? 'high'
        : selectedQuranStock.needLevel === 'medium'
          ? 'medium'
          : 'normal'
      : currentItem.priority;

    setVisitItem(itemIndex, {
      status: needsAction ? 'needs_action' : 'good',
      note: mergeQuranEvidence(currentItem.note, evidence),
      priority: suggestedPriority,
      responsibleEntity: needsAction
        ? currentItem.responsibleEntity || 'وحدة العناية بالمساجد والمصليات الجامعية - مكتبة المصاحف'
        : currentItem.responsibleEntity,
    });
    toast.success(needsAction ? 'تم ربط الرصيد وتسجيل احتياج المصاحف في بند الفحص' : 'تم ربط الرصيد واعتماد كفاية العدد وفق البيانات النظامية');
  };`;

if (!source.includes('const applyQuranQuantityAssessment = () =>')) {
  if (!source.includes(setVisitItemMarker)) throw new Error('setVisitItem marker not found');
  source = source.replace(setVisitItemMarker, quranAssessmentHelpers);
}

const checklistMarker = `<div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-black">قائمة الفحص الميداني</h3>`;
const checklistWithQuranLink = `{visitForm.siteId && <QuranVisitStockLink dashboard={quranStockDashboard} siteId={visitForm.siteId} onApplyQuantity={applyQuranQuantityAssessment} />}\n        ${checklistMarker}`;

if (!source.includes('<QuranVisitStockLink dashboard={quranStockDashboard}')) {
  const matches = source.split(checklistMarker).length - 1;
  if (matches !== 1) throw new Error(`checklist marker: expected exactly one match, found ${matches}`);
  source = source.replace(checklistMarker, checklistWithQuranLink);
}

fs.writeFileSync(filePath, source);
console.log('Linked mosque field visits with Quran inventory and warehouse stock.');
