import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('BUILDING_IMPORT_PENDING_MARKER')) {
  console.log('Reviewed building Excel import is already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Could not find anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`const emptyBuilding = {
  buildingNumber: '', name: '', campusLocation: '', city: 'الدمام', district: '', latitude: '', longitude: '', expectedUsers: '',
  coverageStatus: 'unassessed', creationFeasibility: 'under_study', unavailableReason: '', approvedAlternative: '', notes: '',
};`,
`const emptyBuilding = {
  buildingNumber: '', name: '', campusLocation: '', city: 'الدمام', district: '', latitude: '', longitude: '', expectedUsers: '',
  coverageStatus: 'unassessed', creationFeasibility: 'under_study', unavailableReason: '', approvedAlternative: '', notes: '',
};

const BUILDING_IMPORT_PENDING_MARKER = '[[IAU_BUILDING_IMPORT_PENDING_V1]]';
const BUILDING_IMPORT_PENDING_END = '[[/IAU_BUILDING_IMPORT_PENDING_V1]]';

type BuildingImportDraft = {
  buildingNumber: string;
  name: string;
  campusLocation: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  expectedUsers: string;
  coverageStatus: MosqueBuilding['coverageStatus'];
  creationFeasibility: MosqueBuilding['creationFeasibility'];
  unavailableReason: string;
  approvedAlternative: string;
  notes: string;
};

type BuildingImportEnvelope = {
  sourceFile: string;
  sheetName: string;
  rowNumber: number;
  importedAt: string;
  draft: BuildingImportDraft;
  raw: Record<string, string>;
};

const normalizeBuildingImportHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\s_\-./\\()[\]{}:]+/g, '');

const buildingImportText = (value: unknown) => String(value ?? '').trim();

const readBuildingImportCell = (row: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = new Set(aliases.map(normalizeBuildingImportHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeBuildingImportHeader(key))) return buildingImportText(value);
  }
  return '';
};

const normalizeBuildingCoverageImportValue = (value: string): MosqueBuilding['coverageStatus'] => {
  const normalized = normalizeBuildingImportHeader(value);
  if (['covered', 'مغطى', 'مغطاه', 'مغطىبخدمهالصلاه'].includes(normalized) || normalized.includes('مغط')) return 'covered';
  if (normalized === 'needsprayerroom' || normalized.includes('يحتاج') || normalized.includes('بحاجه')) return 'needs_prayer_room';
  if (normalized === 'underimplementation' || normalized.includes('تنفيذ')) return 'under_implementation';
  if (normalized === 'notfeasiblealternative' || normalized.includes('تعذر') || normalized.includes('بديل')) return 'not_feasible_alternative';
  if (normalized === 'underfeasibilitystudy' || normalized.includes('دراس')) return 'under_feasibility_study';
  return 'unassessed';
};

const normalizeBuildingFeasibilityImportValue = (value: string): MosqueBuilding['creationFeasibility'] => {
  const normalized = normalizeBuildingImportHeader(value);
  if (normalized === 'unavailable' || normalized.includes('غيرمتاح') || normalized.includes('تعذر')) return 'unavailable';
  if (normalized === 'available' || (normalized.includes('متاح') && !normalized.includes('غيرمتاح'))) return 'available';
  return 'under_study';
};

const buildingImportDraftFromRow = (row: Record<string, unknown>): BuildingImportDraft => ({
  buildingNumber: readBuildingImportCell(row, ['رقم المبنى', 'رقم مبنى', 'building number', 'building no', 'building_number', 'buildingnumber']),
  name: readBuildingImportCell(row, ['اسم المبنى', 'اسم المنشأة', 'اسم المنشاه', 'المبنى', 'building name', 'name']),
  campusLocation: readBuildingImportCell(row, ['الحرم', 'الموقع داخل الجامعة', 'الموقع داخل الجامعه', 'الموقع', 'campus', 'campus location', 'campus_location']),
  city: readBuildingImportCell(row, ['المدينة', 'المدينه', 'city']),
  district: readBuildingImportCell(row, ['الحي', 'district']),
  latitude: readBuildingImportCell(row, ['خط العرض', 'latitude', 'lat']),
  longitude: readBuildingImportCell(row, ['خط الطول', 'longitude', 'lng', 'lon', 'long']),
  expectedUsers: readBuildingImportCell(row, ['عدد المستفيدين', 'المستفيدون المتوقعون', 'عدد المستخدمين', 'expected users', 'expected_users', 'users']),
  coverageStatus: normalizeBuildingCoverageImportValue(readBuildingImportCell(row, ['حالة التغطية', 'حاله التغطيه', 'التغطية', 'التغطيه', 'coverage status', 'coverage_status'])),
  creationFeasibility: normalizeBuildingFeasibilityImportValue(readBuildingImportCell(row, ['إمكانية إنشاء مصلى', 'امكانية انشاء مصلى', 'امكانيه انشاء مصلى', 'feasibility', 'creation feasibility', 'creation_feasibility'])),
  unavailableReason: readBuildingImportCell(row, ['سبب عدم الإمكانية', 'سبب عدم الامكانية', 'سبب تعذر الإنشاء', 'سبب تعذر الانشاء', 'unavailable reason', 'unavailable_reason']),
  approvedAlternative: readBuildingImportCell(row, ['البديل المعتمد', 'approved alternative', 'approved_alternative']),
  notes: readBuildingImportCell(row, ['ملاحظات', 'الملاحظات', 'notes']),
});

const buildingFormToImportDraft = (form: any): BuildingImportDraft => ({
  buildingNumber: String(form?.buildingNumber ?? '').trim(),
  name: String(form?.name ?? '').trim(),
  campusLocation: String(form?.campusLocation ?? '').trim(),
  city: String(form?.city ?? '').trim(),
  district: String(form?.district ?? '').trim(),
  latitude: String(form?.latitude ?? '').trim(),
  longitude: String(form?.longitude ?? '').trim(),
  expectedUsers: String(form?.expectedUsers ?? '').trim(),
  coverageStatus: Object.prototype.hasOwnProperty.call(buildingCoverageStatusLabels, String(form?.coverageStatus ?? ''))
    ? form.coverageStatus
    : 'unassessed',
  creationFeasibility: Object.prototype.hasOwnProperty.call(buildingFeasibilityLabels, String(form?.creationFeasibility ?? ''))
    ? form.creationFeasibility
    : 'under_study',
  unavailableReason: String(form?.unavailableReason ?? '').trim(),
  approvedAlternative: String(form?.approvedAlternative ?? '').trim(),
  notes: String(form?.notes ?? '').trim(),
});

const serializePendingBuildingImport = (envelope: BuildingImportEnvelope) =>
  `${BUILDING_IMPORT_PENDING_MARKER}\n${JSON.stringify(envelope)}\n${BUILDING_IMPORT_PENDING_END}`;

const parsePendingBuildingImport = (building?: MosqueBuilding | null): BuildingImportEnvelope | null => {
  const notes = String(building?.notes || '');
  const start = notes.indexOf(BUILDING_IMPORT_PENDING_MARKER);
  const end = notes.indexOf(BUILDING_IMPORT_PENDING_END);
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const payload = notes.slice(start + BUILDING_IMPORT_PENDING_MARKER.length, end).trim();
    const parsed = JSON.parse(payload) as BuildingImportEnvelope;
    if (!parsed?.draft || !parsed?.sourceFile) return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildingDraftReviewNotes = (draft: BuildingImportDraft) => {
  const notes: string[] = [];
  if (!draft.buildingNumber) notes.push('رقم المبنى غير مدخل');
  if (!draft.name) notes.push('اسم المبنى غير مدخل');
  if (!draft.campusLocation) notes.push('الموقع داخل الجامعة غير مدخل');
  if (!draft.city) notes.push('المدينة غير مدخلة');
  if (!draft.district) notes.push('الحي غير مدخل');
  if (draft.creationFeasibility === 'unavailable' && !draft.unavailableReason) notes.push('سبب تعذر إنشاء المصلى غير مدخل');
  const hasLat = draft.latitude !== '';
  const hasLng = draft.longitude !== '';
  if (hasLat !== hasLng) notes.push('الإحداثيات غير مكتملة');
  if (hasLat && (!Number.isFinite(Number(draft.latitude)) || Number(draft.latitude) < -90 || Number(draft.latitude) > 90)) notes.push('خط العرض يحتاج مراجعة');
  if (hasLng && (!Number.isFinite(Number(draft.longitude)) || Number(draft.longitude) < -180 || Number(draft.longitude) > 180)) notes.push('خط الطول يحتاج مراجعة');
  if (draft.expectedUsers && (!Number.isFinite(Number(draft.expectedUsers)) || Number(draft.expectedUsers) < 0)) notes.push('عدد المستفيدين يحتاج مراجعة');
  return notes;
};

const buildingDraftApprovalBlockers = (draft: BuildingImportDraft) => {
  const blockers: string[] = [];
  if (!draft.buildingNumber) blockers.push('رقم المبنى');
  if (draft.creationFeasibility === 'unavailable' && !draft.unavailableReason) blockers.push('سبب تعذر إنشاء المصلى');
  const hasLat = draft.latitude !== '';
  const hasLng = draft.longitude !== '';
  if (hasLat !== hasLng) blockers.push('استكمال خط العرض وخط الطول معًا');
  if (hasLat && (!Number.isFinite(Number(draft.latitude)) || Number(draft.latitude) < -90 || Number(draft.latitude) > 90)) blockers.push('خط العرض الصحيح');
  if (hasLng && (!Number.isFinite(Number(draft.longitude)) || Number(draft.longitude) < -180 || Number(draft.longitude) > 180)) blockers.push('خط الطول الصحيح');
  if (draft.expectedUsers && (!Number.isFinite(Number(draft.expectedUsers)) || Number(draft.expectedUsers) < 0)) blockers.push('عدد المستفيدين الصحيح');
  return blockers;
};

const buildingDraftToPayload = (draft: BuildingImportDraft) => ({
  buildingNumber: draft.buildingNumber.trim(),
  name: draft.name.trim() || null,
  campusLocation: draft.campusLocation.trim() || null,
  city: draft.city.trim() || null,
  district: draft.district.trim() || null,
  latitude: draft.latitude === '' ? null : Number(draft.latitude),
  longitude: draft.longitude === '' ? null : Number(draft.longitude),
  expectedUsers: draft.expectedUsers === '' ? null : Number(draft.expectedUsers),
  coverageStatus: draft.coverageStatus,
  creationFeasibility: draft.creationFeasibility,
  unavailableReason: draft.creationFeasibility === 'unavailable' ? (draft.unavailableReason.trim() || null) : null,
  approvedAlternative: draft.approvedAlternative.trim() || null,
  notes: draft.notes.trim() || null,
});`,
  'building import helpers',
);

replaceOnce(
`  const [buildingDialog, setBuildingDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);
  const [buildingForm, setBuildingForm] = useState<any>(emptyBuilding);
  const [showBuildingMap, setShowBuildingMap] = useState(false);
  const [locatingBuilding, setLocatingBuilding] = useState(false);`,
`  const [buildingDialog, setBuildingDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);
  const [buildingForm, setBuildingForm] = useState<any>(emptyBuilding);
  const [showBuildingMap, setShowBuildingMap] = useState(false);
  const [locatingBuilding, setLocatingBuilding] = useState(false);
  const buildingImportInputRef = useRef<HTMLInputElement | null>(null);
  const [buildingImportDialog, setBuildingImportDialog] = useState(false);
  const [buildingImportFileName, setBuildingImportFileName] = useState('');
  const [buildingImportRows, setBuildingImportRows] = useState<BuildingImportEnvelope[]>([]);
  const [buildingImportSaving, setBuildingImportSaving] = useState(false);`,
  'building import state',
);

replaceOnce(
`  const openBuildingDialog = (building?: MosqueBuilding) => {`,
`  const pendingBuildingImports = useMemo(() => buildings.flatMap((building) => {
    const envelope = parsePendingBuildingImport(building);
    return envelope ? [{ building, envelope }] : [];
  }), [buildings]);
  const officialBuildings = useMemo(() => buildings.filter((building) => !parsePendingBuildingImport(building)), [buildings]);
  const editingPendingBuildingImport = editingBuilding ? parsePendingBuildingImport(editingBuilding) : null;

  const openPendingBuildingReview = (building: MosqueBuilding) => {
    const envelope = parsePendingBuildingImport(building);
    if (!envelope) return toast.error('تعذر قراءة بيانات السجل المستورد');
    setEditingBuilding(building);
    setBuildingForm({ ...emptyBuilding, ...envelope.draft });
    setShowBuildingMap(false);
    setBuildingDialog(true);
  };

  const handleBuildingExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const importedAt = new Date().toISOString();
      const rows: BuildingImportEnvelope[] = [];
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
        sheetRows.forEach((rawRow, index) => {
          const raw = Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [key, buildingImportText(value)]));
          rows.push({
            sourceFile: file.name,
            sheetName,
            rowNumber: index + 2,
            importedAt,
            draft: buildingImportDraftFromRow(rawRow),
            raw,
          });
        });
      });
      if (!rows.length) return toast.error('لم يتم العثور على صفوف بيانات داخل ملف Excel');
      setBuildingImportFileName(file.name);
      setBuildingImportRows(rows);
      setBuildingImportDialog(true);
    } catch (error) {
      console.error('Building Excel read error:', error);
      toast.error('تعذر قراءة ملف Excel. تأكد من أن الملف بصيغة XLSX أو XLS.');
    }
  };

  const downloadBuildingImportTemplate = () => {
    const headers = ['رقم المبنى', 'اسم المبنى', 'الموقع داخل الجامعة', 'المدينة', 'الحي', 'خط العرض', 'خط الطول', 'عدد المستفيدين', 'حالة التغطية', 'إمكانية إنشاء مصلى', 'سبب تعذر الإنشاء', 'البديل المعتمد', 'ملاحظات'];
    const example = ['A101', 'كلية مثال', 'الحرم الشرقي', 'الدمام', '', '26.392700', '50.043800', '250', 'يحتاج مصلى', 'قيد الدراسة', '', '', ''];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, header.length + 5) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تغطية المباني');
    XLSX.writeFile(workbook, 'قالب-استيراد-تغطية-المباني.xlsx');
  };

  const stageBuildingImportRows = async () => {
    if (!buildingImportRows.length) return;
    setBuildingImportSaving(true);
    const failed: BuildingImportEnvelope[] = [];
    let imported = 0;
    const session = Date.now().toString(36).toUpperCase();
    for (let index = 0; index < buildingImportRows.length; index += 1) {
      const envelope = buildingImportRows[index];
      try {
        await mosqueApi.createBuilding({
          buildingNumber: `IMP-${session}-${index + 1}`,
          name: envelope.draft.name || 'سجل مستورد بانتظار المراجعة',
          campusLocation: envelope.draft.campusLocation || null,
          city: envelope.draft.city || null,
          district: envelope.draft.district || null,
          coverageStatus: 'unassessed',
          creationFeasibility: 'under_study',
          notes: serializePendingBuildingImport(envelope),
        });
        imported += 1;
      } catch (error) {
        console.error('Building pending import save error:', error);
        failed.push(envelope);
      }
    }
    setBuildingImportSaving(false);
    if (imported) await loadAll();
    if (!failed.length) {
      setBuildingImportDialog(false);
      setBuildingImportRows([]);
      toast.success(`تم استيراد ${imported} سجلًا وحفظها جميعًا بحالة «معلق للمراجعة» دون رفض الصفوف الناقصة.`);
    } else {
      setBuildingImportRows(failed);
      toast.error(`تم حفظ ${imported} سجلًا، وتعذر حفظ ${failed.length} سجل تقنيًا. بقيت الصفوف غير المحفوظة في النافذة لإعادة المحاولة.`);
    }
  };

  const savePendingBuildingCorrections = async (building: MosqueBuilding, envelope: BuildingImportEnvelope, draft: BuildingImportDraft) => {
    await mosqueApi.updateBuilding(building.id, {
      name: draft.name || 'سجل مستورد بانتظار المراجعة',
      campusLocation: draft.campusLocation || null,
      city: draft.city || null,
      district: draft.district || null,
      notes: serializePendingBuildingImport({ ...envelope, draft }),
    });
  };

  const approvePendingBuilding = async (building: MosqueBuilding) => {
    const envelope = parsePendingBuildingImport(building);
    if (!envelope) return toast.error('تعذر قراءة السجل المستورد');
    const draft = envelope.draft;
    const blockers = buildingDraftApprovalBlockers(draft);
    if (blockers.length) {
      toast.error(`لا يمكن الاعتماد قبل استكمال: ${blockers.join('، ')}`);
      openPendingBuildingReview(building);
      return;
    }
    const duplicate = officialBuildings.find((item) => String(item.buildingNumber || '').trim().toLowerCase() === draft.buildingNumber.trim().toLowerCase() && item.id !== building.id);
    if (duplicate) {
      toast.error(`رقم المبنى ${draft.buildingNumber} مستخدم في سجل معتمد. صحح رقم المبنى قبل الاعتماد.`);
      openPendingBuildingReview(building);
      return;
    }
    if (!window.confirm(`اعتماد السجل المستورد للمبنى ${draft.buildingNumber}؟ بعد الاعتماد سيظهر ضمن سجل المباني الرسمي.`)) return;
    setSaving(true);
    try {
      await mosqueApi.updateBuilding(building.id, buildingDraftToPayload(draft));
      toast.success('تم اعتماد السجل وإضافته إلى سجل تغطية المباني الرسمي');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر اعتماد السجل');
    } finally {
      setSaving(false);
    }
  };

  const openBuildingDialog = (building?: MosqueBuilding) => {`,
  'building import functions',
);

replaceOnce(
`  const saveBuilding = async () => {
    if (!String(buildingForm.buildingNumber || '').trim()) return toast.error('رقم المبنى مطلوب');`,
`  const saveBuilding = async () => {
    const pendingEnvelope = editingBuilding ? parsePendingBuildingImport(editingBuilding) : null;
    if (editingBuilding && pendingEnvelope) {
      setSaving(true);
      try {
        const draft = buildingFormToImportDraft(buildingForm);
        await savePendingBuildingCorrections(editingBuilding, pendingEnvelope, draft);
        toast.success('تم حفظ التصحيحات. سيبقى السجل معلقًا حتى يعتمد المسؤول البيانات.');
        setBuildingDialog(false);
        await loadAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'تعذر حفظ التصحيحات');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!String(buildingForm.buildingNumber || '').trim()) return toast.error('رقم المبنى مطلوب');`,
  'pending building save path',
);

replaceOnce(
`  const selectedSiteBuilding = buildings.find((building) => building.id === siteForm.buildingId) || null;`,
`  const selectedSiteBuilding = officialBuildings.find((building) => building.id === siteForm.buildingId) || null;`,
  'exclude pending from selected site building',
);

replaceOnce(
`              {role === 'head' && canAdd && <Button className={button3d} onClick={() => openBuildingDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مبنى</Button>}`,
`              {role === 'head' && canAdd && <div className="flex flex-wrap items-center gap-2">
                <input ref={buildingImportInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBuildingExcelFile} />
                <Button type="button" variant="outline" className={button3d} onClick={downloadBuildingImportTemplate}><FileSpreadsheet className="ml-2 h-4 w-4" />تحميل قالب Excel</Button>
                <Button type="button" variant="outline" className={button3d} onClick={() => buildingImportInputRef.current?.click()}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد Excel</Button>
                <Button className={button3d} onClick={() => openBuildingDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مبنى</Button>
              </div>}`,
  'building header actions',
);

replaceOnce(
`              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <ReportMetric label="إجمالي المباني" value={buildings.length} />
                <ReportMetric label="مغطاة بخدمة الصلاة" value={buildings.filter((x) => x.coverageStatus === 'covered').length} />
                <ReportMetric label="تحتاج مصلى" value={buildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} />
                <ReportMetric label="قيد الدراسة / التنفيذ" value={buildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} />
                <ReportMetric label="تعذر الإنشاء + بديل" value={buildings.filter((x) => x.coverageStatus === 'not_feasible_alternative').length} />
              </div>`,
`              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <ReportMetric label="إجمالي المباني المعتمدة" value={officialBuildings.length} />
                <ReportMetric label="بانتظار الاعتماد" value={pendingBuildingImports.length} />
                <ReportMetric label="مغطاة بخدمة الصلاة" value={officialBuildings.filter((x) => x.coverageStatus === 'covered').length} />
                <ReportMetric label="تحتاج مصلى" value={officialBuildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} />
                <ReportMetric label="قيد الدراسة / التنفيذ" value={officialBuildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} />
                <ReportMetric label="تعذر الإنشاء + بديل" value={officialBuildings.filter((x) => x.coverageStatus === 'not_feasible_alternative').length} />
              </div>`,
  'official building metrics',
);

replaceOnce(
`          {!buildings.length ? <Empty text="لم تتم إضافة مباني إلى سجل تغطية المصليات بعد" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{buildings.map((building) => {`,
`          {pendingBuildingImports.length > 0 && <Card className="border-amber-300 bg-gradient-to-b from-amber-50/90 to-white shadow-[0_6px_0_rgba(180,83,9,0.10),0_13px_26px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-900"><ClipboardList className="h-5 w-5" />سجلات مستوردة بانتظار المراجعة والاعتماد</CardTitle>
                  <CardDescription className="mt-1">لا تُحتسب هذه السجلات ضمن المباني المعتمدة. لا يُرفض الصف بسبب نقص أو عدم تطابق البيانات؛ يصحح المسؤول البيانات داخل المنصة ثم يعتمدها.</CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">{pendingBuildingImports.length} معلق</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {pendingBuildingImports.map(({ building, envelope }) => {
                  const reviewNotes = buildingDraftReviewNotes(envelope.draft);
                  return <div key={building.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800">{envelope.draft.name || 'اسم المبنى غير مدخل'}</div>
                        <div className="mt-1 text-xs text-slate-500">رقم المبنى: <b>{envelope.draft.buildingNumber || 'غير مدخل'}</b></div>
                      </div>
                      <Badge className="shrink-0 border-amber-300 bg-amber-100 text-amber-800" variant="outline">معلق — غير معتمد</Badge>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">المصدر: <b>{envelope.sourceFile}</b> · ورقة: <b>{envelope.sheetName}</b> · صف: <b>{envelope.rowNumber}</b></div>
                    <div className="mt-3 text-xs">
                      {reviewNotes.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-900"><b>ملاحظات للمراجعة ({reviewNotes.length}):</b> {reviewNotes.slice(0, 4).join('، ')}{reviewNotes.length > 4 ? '…' : ''}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 className="ml-1 inline h-4 w-4" />البيانات المقروءة لا تحتوي ملاحظات ظاهرة، وما زالت تحتاج اعتماد المسؤول.</div>}
                    </div>
                    {role === 'head' && <div className="mt-3 flex flex-wrap gap-2">
                      {canEdit && <Button size="sm" variant="outline" className={button3d} onClick={() => openPendingBuildingReview(building)}><Pencil className="ml-1 h-4 w-4" />مراجعة وتصحيح</Button>}
                      {canEdit && <Button size="sm" className={button3d} disabled={saving} onClick={() => approvePendingBuilding(building)}><CheckCircle2 className="ml-1 h-4 w-4" />اعتماد</Button>}
                      {canDelete && <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => deleteBuilding(building)}><Trash2 className="ml-1 h-4 w-4" />حذف المسودة</Button>}
                    </div>}
                  </div>;
                })}
              </div>
            </CardContent>
          </Card>}
          {!officialBuildings.length ? <Empty text={pendingBuildingImports.length ? 'لا توجد مبانٍ معتمدة حتى الآن؛ توجد سجلات معلقة بانتظار المراجعة أعلاه' : 'لم تتم إضافة مباني إلى سجل تغطية المصليات بعد'} /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{officialBuildings.map((building) => {`,
  'pending and official building lists',
);

replaceOnce(
`{buildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}`,
`{officialBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}`,
  'exclude pending from building dropdown',
);

replaceOnce(
`      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[850px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>{editingBuilding ? 'تعديل بيانات تغطية المبنى' : 'إضافة مبنى إلى سجل التغطية'}</DialogTitle><DialogDescription>سجل المبنى مستقل عن المصليات، ويستخدم رقم المبنى للربط عند إنشاء مصلى رجال أو نساء.</DialogDescription></DialogHeader>`,
`      <Dialog open={buildingImportDialog} onOpenChange={(open) => !buildingImportSaving && setBuildingImportDialog(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />استيراد بيانات تغطية المباني من Excel</DialogTitle>
            <DialogDescription>سيتم إدخال جميع الصفوف كسجلات معلقة للمراجعة، حتى لو كانت البيانات ناقصة أو تحتاج تصحيحًا. لا تنتقل إلى سجل المباني الرسمي إلا بعد مراجعة المسؤول واعتماده.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <b>آلية العمل:</b> استيراد الملف ← حفظ جميع الصفوف بحالة «معلق» ← المسؤول يراجع ويصحح داخل المنصة ← اعتماد السجل ← يصبح مبنى رسميًا.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-slate-50 p-3 text-sm">
            <span>الملف: <b>{buildingImportFileName}</b></span>
            <Badge variant="outline">إجمالي الصفوف: {buildingImportRows.length}</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[850px] text-right text-xs">
              <thead className="bg-slate-100 text-slate-700"><tr><th className="p-2">#</th><th className="p-2">رقم المبنى</th><th className="p-2">اسم المبنى</th><th className="p-2">الموقع</th><th className="p-2">المدينة</th><th className="p-2">حالة القراءة</th><th className="p-2">الحالة بعد الاستيراد</th></tr></thead>
              <tbody>{buildingImportRows.slice(0, 25).map((row, index) => {
                const reviewNotes = buildingDraftReviewNotes(row.draft);
                return <tr key={`${row.sheetName}-${row.rowNumber}-${index}`} className="border-t"><td className="p-2">{index + 1}</td><td className="p-2 font-medium">{row.draft.buildingNumber || '—'}</td><td className="p-2">{row.draft.name || '—'}</td><td className="p-2">{row.draft.campusLocation || '—'}</td><td className="p-2">{row.draft.city || '—'}</td><td className="p-2">{reviewNotes.length ? <span className="text-amber-700">{reviewNotes.length} ملاحظة للمراجعة</span> : <span className="text-emerald-700">مقروءة</span>}</td><td className="p-2"><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">معلق للمراجعة</Badge></td></tr>;
              })}</tbody>
            </table>
          </div>
          {buildingImportRows.length > 25 && <p className="text-xs text-slate-500">يتم عرض أول 25 صفًا للمعاينة فقط، وسيتم استيراد جميع الصفوف وعددها {buildingImportRows.length}.</p>}
          <DialogFooter>
            <Button variant="outline" disabled={buildingImportSaving} onClick={() => setBuildingImportDialog(false)}>إلغاء</Button>
            <Button className={button3d} disabled={buildingImportSaving || !buildingImportRows.length} onClick={stageBuildingImportRows}>{buildingImportSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}{buildingImportSaving ? 'جاري حفظ السجلات المعلقة...' : `استيراد وإرسال للمراجعة (${buildingImportRows.length})`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[850px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>{editingPendingBuildingImport ? 'مراجعة وتصحيح سجل مبنى مستورد' : editingBuilding ? 'تعديل بيانات تغطية المبنى' : 'إضافة مبنى إلى سجل التغطية'}</DialogTitle><DialogDescription>{editingPendingBuildingImport ? 'يمكن حفظ التصحيحات في أي وقت وسيبقى السجل معلقًا. الاعتماد يتم بشكل مستقل بعد اكتمال مراجعة المسؤول.' : 'سجل المبنى مستقل عن المصليات، ويستخدم رقم المبنى للربط عند إنشاء مصلى رجال أو نساء.'}</DialogDescription></DialogHeader>
          {editingPendingBuildingImport && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-bold text-amber-900">السجل معلق وغير معتمد</div>
            <div className="mt-1 text-xs text-amber-800">المصدر: {editingPendingBuildingImport.sourceFile} · الورقة: {editingPendingBuildingImport.sheetName} · الصف: {editingPendingBuildingImport.rowNumber}</div>
            <details className="mt-2 rounded-xl border border-amber-200 bg-white p-2"><summary className="cursor-pointer font-medium">عرض بيانات الصف الأصلية من Excel</summary><div className="mt-2 grid gap-2 md:grid-cols-2">{Object.entries(editingPendingBuildingImport.raw || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-2 text-xs"><b>{key}:</b> {value || '—'}</div>)}</div></details>
          </div>}`,
  'building import and review dialogs',
);

replaceOnce(
`          <DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>إلغاء</Button><Button className={button3d} disabled={saving} onClick={saveBuilding}>{saving ? 'جاري الحفظ...' : 'حفظ بيانات المبنى'}</Button></DialogFooter>`,
`          <DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>إلغاء</Button><Button className={button3d} disabled={saving} onClick={saveBuilding}>{saving ? 'جاري الحفظ...' : editingPendingBuildingImport ? 'حفظ التصحيحات (يبقى معلقًا)' : 'حفظ بيانات المبنى'}</Button></DialogFooter>`,
  'pending review save label',
);

fs.writeFileSync(path, source);
console.log('Applied reviewed Excel import workflow for building coverage.');
