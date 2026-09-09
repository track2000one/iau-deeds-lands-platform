import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing patch anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "  'سلامة الميكروفونات والسماعات وأجهزة الأذان': 'operation',\n",
  "  'سلامة الميكروفونات والسماعات وأجهزة الأذان': 'operation',\n  'توفر وجاهزية جهاز الأذان التلقائي': 'operation',\n",
  'status profile mapping',
);

replaceOnce(
  "const ACTIVITY_APPROVAL_ITEM_TITLE = 'اعتماد حلقات التحفيظ والمحاضرات والأنشطة القائمة';\nconst isActivityApprovalItem = (item: Pick<MosqueFieldVisitItem, 'title'>) => item.title === ACTIVITY_APPROVAL_ITEM_TITLE;\n",
  `const ACTIVITY_APPROVAL_ITEM_TITLE = 'اعتماد حلقات التحفيظ والمحاضرات والأنشطة القائمة';
const isActivityApprovalItem = (item: Pick<MosqueFieldVisitItem, 'title'>) => item.title === ACTIVITY_APPROVAL_ITEM_TITLE;

const AUTOMATIC_ADHAN_ITEM_TITLE = 'توفر وجاهزية جهاز الأذان التلقائي';
type AutomaticAdhanDetails = {
  applicability: 'not_checked' | 'applies' | 'not_applicable';
  availability: 'not_checked' | 'present' | 'missing';
  technicalCondition: 'not_checked' | 'good' | 'needs_maintenance';
  operationalStatus: 'not_checked' | 'working' | 'not_working' | 'needs_programming' | 'needs_time_reset';
};

const defaultAutomaticAdhanDetails: AutomaticAdhanDetails = {
  applicability: 'not_checked',
  availability: 'not_checked',
  technicalCondition: 'not_checked',
  operationalStatus: 'not_checked',
};

const isAutomaticAdhanItem = (item: Pick<MosqueFieldVisitItem, 'title'>) => item.title === AUTOMATIC_ADHAN_ITEM_TITLE;
const automaticAdhanDetails = (item: Pick<MosqueFieldVisitItem, 'details'>): AutomaticAdhanDetails => ({
  ...defaultAutomaticAdhanDetails,
  ...((item.details?.automaticAdhan || {}) as Partial<AutomaticAdhanDetails>),
});

const assessAutomaticAdhan = (details: AutomaticAdhanDetails): {
  status: MosqueFieldVisitItem['status'];
  priority: MosqueFieldVisitItem['priority'];
  label: string;
} => {
  if (details.applicability === 'not_applicable') return { status: 'not_applicable', priority: 'normal', label: 'لا ينطبق على الموقع' };
  if (details.applicability !== 'applies') return { status: 'not_checked', priority: 'normal', label: 'لم يتم التحقق' };
  if (details.availability === 'missing') return { status: 'needs_action', priority: 'medium', label: 'الجهاز غير موجود' };
  if (details.availability !== 'present') return { status: 'not_checked', priority: 'normal', label: 'تحقق من توفر الجهاز' };
  if (details.technicalCondition === 'needs_maintenance') return { status: 'needs_action', priority: 'high', label: 'يحتاج صيانة' };
  if (details.operationalStatus === 'not_working') return { status: 'needs_action', priority: 'high', label: 'الجهاز لا يعمل' };
  if (details.operationalStatus === 'needs_programming') return { status: 'needs_action', priority: 'medium', label: 'يحتاج برمجة' };
  if (details.operationalStatus === 'needs_time_reset') return { status: 'needs_action', priority: 'medium', label: 'يحتاج إعادة ضبط أوقات الأذان' };
  if (details.technicalCondition === 'good' && details.operationalStatus === 'working') return { status: 'good', priority: 'normal', label: 'سليم ويعمل' };
  return { status: 'not_checked', priority: 'normal', label: 'استكمل فحص الجهاز' };
};

const AutomaticAdhanEditor: React.FC<{
  item: MosqueFieldVisitItem;
  onChange: (patch: Partial<AutomaticAdhanDetails>) => void;
}> = ({ item, onChange }) => {
  const details = automaticAdhanDetails(item);
  const assessment = assessAutomaticAdhan(details);
  const resultClass = assessment.status === 'good'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
    : assessment.status === 'needs_action'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : assessment.status === 'not_applicable'
        ? 'border-slate-300 bg-slate-50 text-slate-700'
        : 'border-sky-200 bg-sky-50 text-sky-800';

  return <div className="rounded-2xl border border-indigo-200 bg-gradient-to-l from-indigo-50/80 via-white to-sky-50/60 p-4 shadow-sm">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div><b className="text-sm text-indigo-950">فحص جهاز الأذان التلقائي</b><p className="mt-1 text-[11px] leading-5 text-slate-600">حدد انطباق الجهاز أولًا، ثم توفره وحالته الفنية والتشغيلية. النتيجة والأولوية تحتسبان تلقائيًا.</p></div>
      <Badge variant="outline" className={resultClass}>{assessment.label} · {priorityLabels[assessment.priority]}</Badge>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="هل ينطبق الأذان التلقائي على الموقع؟ *"><NativeSelect value={details.applicability} onChange={(event) => onChange({ applicability: event.target.value as AutomaticAdhanDetails['applicability'] })}><option value="not_checked">لم يتم التحقق</option><option value="applies">ينطبق</option><option value="not_applicable">لا ينطبق</option></NativeSelect></Field>
      {details.applicability === 'applies' && <Field label="توفر جهاز الأذان التلقائي *"><NativeSelect value={details.availability} onChange={(event) => onChange({ availability: event.target.value as AutomaticAdhanDetails['availability'] })}><option value="not_checked">لم يتم التحقق</option><option value="present">موجود</option><option value="missing">غير موجود</option></NativeSelect></Field>}
      {details.applicability === 'applies' && details.availability === 'present' && <Field label="الحالة الفنية للجهاز *"><NativeSelect value={details.technicalCondition} onChange={(event) => onChange({ technicalCondition: event.target.value as AutomaticAdhanDetails['technicalCondition'] })}><option value="not_checked">لم يتم التحقق</option><option value="good">سليم</option><option value="needs_maintenance">يحتاج صيانة</option></NativeSelect></Field>}
      {details.applicability === 'applies' && details.availability === 'present' && <Field label="الحالة التشغيلية *"><NativeSelect value={details.operationalStatus} onChange={(event) => onChange({ operationalStatus: event.target.value as AutomaticAdhanDetails['operationalStatus'] })}><option value="not_checked">لم يتم التحقق</option><option value="working">يعمل</option><option value="not_working">لا يعمل</option><option value="needs_programming">يحتاج برمجة</option><option value="needs_time_reset">يحتاج إعادة ضبط أوقات الأذان</option></NativeSelect></Field>}
    </div>
    {assessment.status === 'needs_action' && <div className="mt-3 rounded-xl border border-amber-200 bg-white/85 px-3 py-2 text-xs font-bold text-amber-900">تم تسجيل الحالة كملاحظة تحتاج معالجة، وتحدد الأولوية تلقائيًا حسب نوع المشكلة. أكمل وصف الملاحظة وإجراء المعالجة أدناه.</div>}
  </div>;
};
`,
  'automatic adhan helpers',
);

replaceOnce(
  "      attachments: [...(visit.attachments || [])], items: freshItems(visit.items || template),\n",
  `      attachments: [...(visit.attachments || [])], items: freshItems((() => {
        const savedItems = visit.items || template;
        const automaticAdhanTemplateItem = template.find(isAutomaticAdhanItem);
        if (visit.workflowStatus !== 'closed' && automaticAdhanTemplateItem && !savedItems.some(isAutomaticAdhanItem)) {
          return [...savedItems, automaticAdhanTemplateItem];
        }
        return savedItems;
      })()),
`,
  'merge template item into active historical visit',
);

replaceOnce(
  `  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {
    setVisitForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };
`,
  `  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {
    setVisitForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const updateAutomaticAdhanDetails = (index: number, patch: Partial<AutomaticAdhanDetails>) => {
    setVisitForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        let nextDetails: AutomaticAdhanDetails = { ...automaticAdhanDetails(item), ...patch };
        if (nextDetails.applicability !== 'applies') {
          nextDetails = { ...nextDetails, availability: 'not_checked', technicalCondition: 'not_checked', operationalStatus: 'not_checked' };
        } else if (nextDetails.availability !== 'present') {
          nextDetails = { ...nextDetails, technicalCondition: 'not_checked', operationalStatus: 'not_checked' };
        }
        const assessment = assessAutomaticAdhan(nextDetails);
        return {
          ...item,
          status: assessment.status,
          priority: assessment.priority,
          details: { ...(item.details || {}), automaticAdhan: nextDetails },
        };
      }),
    }));
  };
`,
  'automatic adhan state updater',
);

const oldControls = `}<NativeSelect className="lg:w-64" value={item.status} onChange={(event) => setVisitItem(index, { status: event.target.value as MosqueFieldVisitItem['status'] })}>{getItemStatusOptions(item).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</NativeSelect><NativeSelect className="lg:w-36" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>{isQuranFieldVisitItem(item) &&`;
const newControls = `}{isAutomaticAdhanItem(item) ? <div className="flex shrink-0 items-center gap-2 lg:w-[26rem] lg:justify-end"><Badge variant="outline" className="border-indigo-300 bg-indigo-50 px-3 py-2 text-indigo-800">النتيجة والأولوية تلقائية</Badge></div> : <><NativeSelect className="lg:w-64" value={item.status} onChange={(event) => setVisitItem(index, { status: event.target.value as MosqueFieldVisitItem['status'] })}>{getItemStatusOptions(item).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</NativeSelect><NativeSelect className="lg:w-36" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></>}</div>{isAutomaticAdhanItem(item) && <AutomaticAdhanEditor item={item} onChange={(patch) => updateAutomaticAdhanDetails(index, patch)} />}{isQuranFieldVisitItem(item) &&`;
replaceOnce(oldControls, newControls, 'checklist item controls');

fs.writeFileSync(path, source);
console.log('Applied automatic adhan checklist UI.');
