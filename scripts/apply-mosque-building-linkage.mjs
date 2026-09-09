import fs from 'node:fs';

const apiPath = 'src/app/api/mosques.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('export type MosqueBuilding = {')) {
  const marker = 'export type MosqueSite = {';
  if (!api.includes(marker)) throw new Error('MosqueSite type marker not found');
  const buildingType = `export type MosqueBuilding = {
  id: string;
  buildingNumber: string;
  name?: string | null;
  campusLocation?: string | null;
  city?: string | null;
  district?: string | null;
  expectedUsers?: number | null;
  coverageStatus: 'unassessed' | 'covered' | 'needs_prayer_room' | 'under_feasibility_study' | 'not_feasible_alternative' | 'under_implementation';
  creationFeasibility: 'available' | 'unavailable' | 'under_study';
  unavailableReason?: string | null;
  approvedAlternative?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sites?: Array<{
    id: string;
    name: string;
    siteType: 'mosque' | 'jami' | 'prayer_room';
    prayerRoomGender?: 'men' | 'women' | null;
    status: 'active' | 'maintenance' | 'temporarily_closed';
  }>;
  _count?: { sites: number };
};

`;
  api = api.replace(marker, buildingType + marker);
}

if (!api.includes("spatialRelation?: 'inside_building' | 'independent';")) {
  api = api.replace(
    "  prayerRoomGender?: 'men' | 'women' | null;\n",
    "  prayerRoomGender?: 'men' | 'women' | null;\n  spatialRelation?: 'inside_building' | 'independent';\n  buildingId?: string | null;\n  floor?: string | null;\n  roomNumber?: string | null;\n  building?: Pick<MosqueBuilding, 'id' | 'buildingNumber' | 'name' | 'coverageStatus' | 'creationFeasibility'> | null;\n",
  );
}

if (!api.includes("buildings: () => apiJson<MosqueBuilding[]>('/api/mosques/buildings')")) {
  api = api.replace(
    "  sites: () => apiJson<MosqueSite[]>('/api/mosques/sites'),\n",
    "  sites: () => apiJson<MosqueSite[]>('/api/mosques/sites'),\n  buildings: () => apiJson<MosqueBuilding[]>('/api/mosques/buildings'),\n  createBuilding: (input: Partial<MosqueBuilding>) => apiJson<MosqueBuilding>('/api/mosques/buildings', { method: 'POST', body: JSON.stringify(input) }),\n  updateBuilding: (id: string, input: Partial<MosqueBuilding>) => apiJson<MosqueBuilding>(`/api/mosques/buildings/${id}`, { method: 'PUT', body: JSON.stringify(input) }),\n  deleteBuilding: (id: string) => apiJson<void>(`/api/mosques/buildings/${id}`, { method: 'DELETE' }),\n",
  );
}
fs.writeFileSync(apiPath, api);

const pagePath = 'src/app/pages/MosquesUnitPage.tsx';
let s = fs.readFileSync(pagePath, 'utf8');

if (!s.includes('type MosqueBuilding,')) {
  s = s.replace('  type MosqueRequest,\n  type MosqueSite,', '  type MosqueRequest,\n  type MosqueBuilding,\n  type MosqueSite,');
}

if (!s.includes('const buildingCoverageStatusLabels')) {
  const marker = "const prayerRoomGenderLabels: Record<string, string> = { men: 'رجال', women: 'نساء' };";
  if (!s.includes(marker)) throw new Error('prayerRoomGenderLabels marker not found');
  s = s.replace(marker, marker + `
const buildingCoverageStatusLabels: Record<string, string> = {
  unassessed: 'لم يتم التقييم',
  covered: 'مغطى بخدمة الصلاة',
  needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إمكانية الإنشاء',
  not_feasible_alternative: 'تعذر الإنشاء / بديل معتمد',
  under_implementation: 'مصلى تحت التنفيذ',
};
const buildingFeasibilityLabels: Record<string, string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};`);
}

if (!s.includes("spatialRelation: 'independent'")) {
  s = s.replace(
    "  name: '', siteType: 'mosque', prayerRoomGender: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', quranTargetCount: '', latitude: '', longitude: '',",
    "  name: '', siteType: 'mosque', prayerRoomGender: '', spatialRelation: 'independent', buildingId: '', floor: '', roomNumber: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', quranTargetCount: '', latitude: '', longitude: '',",
  );
}

if (!s.includes('const emptyBuilding = {')) {
  const marker = 'const emptyRequest = {';
  const pos = s.indexOf(marker);
  if (pos < 0) throw new Error('emptyRequest marker not found');
  const form = `const emptyBuilding = {
  buildingNumber: '', name: '', campusLocation: '', city: 'الدمام', district: '', expectedUsers: '',
  coverageStatus: 'unassessed', creationFeasibility: 'under_study', unavailableReason: '', approvedAlternative: '', notes: '',
};
`;
  s = s.slice(0, pos) + form + s.slice(pos);
}

if (!s.includes('const [buildings, setBuildings]')) {
  s = s.replace(
    '  const [sites, setSites] = useState<MosqueSite[]>([]);\n',
    '  const [sites, setSites] = useState<MosqueSite[]>([]);\n  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);\n',
  );
}

if (!s.includes('const [buildingDialog, setBuildingDialog]')) {
  s = s.replace(
    '  const [siteDialog, setSiteDialog] = useState(false);\n',
    "  const [buildingDialog, setBuildingDialog] = useState(false);\n  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);\n  const [buildingForm, setBuildingForm] = useState<any>(emptyBuilding);\n  const [siteDialog, setSiteDialog] = useState(false);\n",
  );
}

if (!s.includes('mosqueApi.buildings()')) {
  s = s.replace(
    '      const [dash, siteRows, noticeRows] = await Promise.all([\n        mosqueApi.dashboard(), mosqueApi.sites(), mosqueApi.notifications(),\n      ]);\n      setDashboard(dash);\n      setSites(siteRows);\n      setNotifications(noticeRows);',
    '      const [dash, siteRows, buildingRows, noticeRows] = await Promise.all([\n        mosqueApi.dashboard(), mosqueApi.sites(), mosqueApi.buildings(), mosqueApi.notifications(),\n      ]);\n      setDashboard(dash);\n      setSites(siteRows);\n      setBuildings(buildingRows);\n      setNotifications(noticeRows);',
  );
}

if (!s.includes('const openBuildingDialog =')) {
  const marker = '  const openSiteDialog = (site?: MosqueSite) => {';
  const pos = s.indexOf(marker);
  if (pos < 0) throw new Error('openSiteDialog marker not found');
  const funcs = `  const openBuildingDialog = (building?: MosqueBuilding) => {
    setEditingBuilding(building || null);
    setBuildingForm(building ? {
      buildingNumber: building.buildingNumber || '',
      name: building.name || '',
      campusLocation: building.campusLocation || '',
      city: building.city || '',
      district: building.district || '',
      expectedUsers: building.expectedUsers ?? '',
      coverageStatus: building.coverageStatus || 'unassessed',
      creationFeasibility: building.creationFeasibility || 'under_study',
      unavailableReason: building.unavailableReason || '',
      approvedAlternative: building.approvedAlternative || '',
      notes: building.notes || '',
    } : emptyBuilding);
    setBuildingDialog(true);
  };

  const saveBuilding = async () => {
    if (!String(buildingForm.buildingNumber || '').trim()) return toast.error('رقم المبنى مطلوب');
    if (buildingForm.creationFeasibility === 'unavailable' && !String(buildingForm.unavailableReason || '').trim()) {
      return toast.error('سبب تعذر إنشاء المصلى مطلوب');
    }
    setSaving(true);
    try {
      const payload = {
        ...buildingForm,
        buildingNumber: String(buildingForm.buildingNumber).trim(),
        name: String(buildingForm.name || '').trim() || null,
        expectedUsers: buildingForm.expectedUsers === '' ? null : Number(buildingForm.expectedUsers),
        unavailableReason: buildingForm.creationFeasibility === 'unavailable' ? (String(buildingForm.unavailableReason || '').trim() || null) : null,
        approvedAlternative: String(buildingForm.approvedAlternative || '').trim() || null,
      };
      if (editingBuilding) await mosqueApi.updateBuilding(editingBuilding.id, payload);
      else await mosqueApi.createBuilding(payload);
      toast.success(editingBuilding ? 'تم تحديث بيانات تغطية المبنى' : 'تمت إضافة المبنى إلى سجل تغطية المصليات');
      setBuildingDialog(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ المبنى');
    } finally { setSaving(false); }
  };

  const deleteBuilding = async (building: MosqueBuilding) => {
    if (!window.confirm(\`حذف المبنى رقم \${building.buildingNumber} من سجل التغطية؟\`)) return;
    try {
      await mosqueApi.deleteBuilding(building.id);
      toast.success('تم حذف المبنى من سجل التغطية');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المبنى');
    }
  };

  const selectedSiteBuilding = buildings.find((building) => building.id === siteForm.buildingId) || null;
  const selectedBuildingHasMen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed'));
  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));

`;
  s = s.slice(0, pos) + funcs + s.slice(pos);
}

if (!s.includes("spatialRelation: site.spatialRelation || 'independent'")) {
  s = s.replace(
    "      name: site.name, siteType: site.siteType, prayerRoomGender: site.prayerRoomGender || '', city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',",
    "      name: site.name, siteType: site.siteType, prayerRoomGender: site.prayerRoomGender || '', spatialRelation: site.spatialRelation || 'independent', buildingId: site.buildingId || '', floor: site.floor || '', roomNumber: site.roomNumber || '', city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',",
  );
}

if (!s.includes("if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId)")) {
  s = s.replace(
    "    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');\n",
    "    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');\n    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');\n",
  );
}

if (!s.includes("spatialRelation: site.spatialRelation ?? 'independent'")) {
  const payloadMarker = '  prayerRoomGender: site.prayerRoomGender ?? null,\n';
  if (s.includes(payloadMarker)) {
    s = s.replace(payloadMarker, payloadMarker + "  spatialRelation: site.spatialRelation ?? 'independent',\n  buildingId: site.buildingId ?? null,\n  floor: site.floor ?? null,\n  roomNumber: site.roomNumber ?? null,\n");
  }
}

s = s.replaceAll(
  "const buildingCode = String(site.campusLocation || '').match(/\\b(?:M|A|H)\\d+\\b/i)?.[0]?.toUpperCase() || '-';",
  "const buildingCode = site.building?.buildingNumber || String(site.campusLocation || '').match(/\\b(?:M|A|H)\\d+\\b/i)?.[0]?.toUpperCase() || '-';",
);

if (!s.includes('<option value="buildings">تغطية المباني</option>')) {
  s = s.replace(
    '            <option value="sites">المساجد والمصليات</option>\n',
    '            <option value="sites">المساجد والمصليات</option>\n            {[\'head\', \'supervisor\'].includes(role) && <option value="buildings">تغطية المباني</option>}\n',
  );
}
if (!s.includes('<TabsTrigger value="buildings">تغطية المباني</TabsTrigger>')) {
  s = s.replace(
    '          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>\n',
    '          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>\n          {[\'head\', \'supervisor\'].includes(role) && <TabsTrigger value="buildings">تغطية المباني</TabsTrigger>}\n',
  );
}

if (!s.includes('<TabsContent value="buildings"')) {
  const marker = "        {['head', 'supervisor'].includes(role) && <TabsContent value=\"field-visits\"";
  const pos = s.indexOf(marker);
  if (pos < 0) throw new Error('field visits tab marker not found');
  const tab = `        {['head', 'supervisor'].includes(role) && <TabsContent value="buildings" className="space-y-4">
          <Card className={card3d}>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-700" />تغطية المباني بخدمة الصلاة</CardTitle>
                <CardDescription>سجل مستقل لجميع المباني، بما فيها المباني التي لا يوجد بها مصلى، مع توثيق إمكانية إنشاء مصلى والبديل المعتمد.</CardDescription>
              </div>
              {role === 'head' && canAdd && <Button className={button3d} onClick={() => openBuildingDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مبنى</Button>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <ReportMetric label="إجمالي المباني" value={buildings.length} />
                <ReportMetric label="مغطاة بخدمة الصلاة" value={buildings.filter((x) => x.coverageStatus === 'covered').length} />
                <ReportMetric label="تحتاج مصلى" value={buildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} />
                <ReportMetric label="قيد الدراسة / التنفيذ" value={buildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} />
                <ReportMetric label="تعذر الإنشاء + بديل" value={buildings.filter((x) => x.coverageStatus === 'not_feasible_alternative').length} />
              </div>
            </CardContent>
          </Card>
          {!buildings.length ? <Empty text="لم تتم إضافة مباني إلى سجل تغطية المصليات بعد" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{buildings.map((building) => {
            const men = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed');
            const women = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed');
            const mosque = building.sites?.some((site) => ['mosque', 'jami'].includes(site.siteType) && site.status !== 'temporarily_closed');
            return <Card key={building.id} className={card3d}>
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2 border-sky-200 bg-sky-50 text-sky-800">مبنى رقم {building.buildingNumber}</Badge><CardTitle className="text-lg">{building.name || `مبنى ${building.buildingNumber}`}</CardTitle><CardDescription>{[building.campusLocation, building.city, building.district].filter(Boolean).join(' — ') || 'لم يحدد الموقع'}</CardDescription></div><Badge variant="outline">{buildingCoverageStatusLabels[building.coverageStatus] || building.coverageStatus}</Badge></div></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs"><div className={`rounded-xl border p-2 text-center ${men ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>مصلى رجال: <b>{men ? 'موجود' : 'غير موجود'}</b></div><div className={`rounded-xl border p-2 text-center ${women ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>مصلى نساء: <b>{women ? 'موجود' : 'غير موجود'}</b></div></div>
                {mosque && <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-center text-xs font-bold text-blue-800">يوجد مسجد / جامع مرتبط بالمبنى</div>}
                <Info label="إمكانية إنشاء مصلى" value={buildingFeasibilityLabels[building.creationFeasibility] || building.creationFeasibility} />
                {building.unavailableReason && <Info label="سبب عدم الإمكانية" value={building.unavailableReason} />}
                {building.approvedAlternative && <Info label="البديل المعتمد" value={building.approvedAlternative} />}
                <div className="rounded-xl border bg-slate-50 p-2 text-xs text-slate-600">المواقع المرتبطة: <b>{building._count?.sites ?? building.sites?.length ?? 0}</b></div>
                {role === 'head' && <div className="flex gap-2">{canEdit && <Button variant="outline" size="sm" className={button3d} onClick={() => openBuildingDialog(building)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}{canDelete && <Button variant="outline" size="sm" className="border-red-300 text-red-600" onClick={() => deleteBuilding(building)}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}</div>}
              </CardContent>
            </Card>;
          })}</div>}
        </TabsContent>}

`;
  s = s.slice(0, pos) + tab + s.slice(pos);
}

if (!s.includes('الارتباط المكاني *')) {
  const marker = '                <Field label="الحالة"><NativeSelect className="h-11" value={siteForm.status}';
  const pos = s.indexOf(marker);
  if (pos < 0) throw new Error('site status field marker not found');
  const fields = `                <Field label="الارتباط المكاني *"><NativeSelect className="h-11" value={siteForm.spatialRelation || 'independent'} onChange={(e) => setSiteForm({ ...siteForm, spatialRelation: e.target.value, buildingId: e.target.value === 'inside_building' ? siteForm.buildingId : '', floor: e.target.value === 'inside_building' ? siteForm.floor : '', roomNumber: e.target.value === 'inside_building' ? siteForm.roomNumber : '' })}><option value="independent">موقع مستقل</option><option value="inside_building">داخل مبنى جامعي</option></NativeSelect></Field>
                {siteForm.spatialRelation === 'inside_building' && <>
                  <Field label="رقم المبنى *"><NativeSelect className="h-11" value={siteForm.buildingId || ''} onChange={(e) => setSiteForm({ ...siteForm, buildingId: e.target.value })}><option value="">اختر المبنى</option>{buildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? ` — ${building.name}` : ''}</option>)}</NativeSelect></Field>
                  <Field label="الدور"><Input className="h-11" value={siteForm.floor || ''} onChange={(e) => setSiteForm({ ...siteForm, floor: e.target.value })} placeholder="مثال: الأرضي" /></Field>
                  <Field label="رقم الغرفة / الموقع الداخلي"><Input className="h-11" value={siteForm.roomNumber || ''} onChange={(e) => setSiteForm({ ...siteForm, roomNumber: e.target.value })} placeholder="مثال: 012 أو الجناح الشرقي" /></Field>
                </>}
                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b><Badge variant="outline" className={selectedBuildingHasMen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>مصلى رجال: {selectedBuildingHasMen ? 'موجود' : 'غير موجود'}</Badge><Badge variant="outline" className={selectedBuildingHasWomen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>مصلى نساء: {selectedBuildingHasWomen ? 'موجود' : 'غير موجود'}</Badge><Badge variant="outline">{buildingFeasibilityLabels[selectedSiteBuilding.creationFeasibility] || selectedSiteBuilding.creationFeasibility}</Badge></div><p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار ودعم استكمال التغطية الرجالية والنسائية.</p></div>}
`;
  s = s.slice(0, pos) + fields + s.slice(pos);
}

if (!s.includes('<Dialog open={buildingDialog}')) {
  const marker = '      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>';
  const pos = s.indexOf(marker);
  if (pos < 0) throw new Error('site dialog marker not found');
  const dialog = `      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[850px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>{editingBuilding ? 'تعديل بيانات تغطية المبنى' : 'إضافة مبنى إلى سجل التغطية'}</DialogTitle><DialogDescription>سجل المبنى مستقل عن المصليات، ويستخدم رقم المبنى للربط عند إنشاء مصلى رجال أو نساء.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-3 md:grid-cols-2">
            <Field label="رقم المبنى *"><Input value={buildingForm.buildingNumber} onChange={(e) => setBuildingForm({ ...buildingForm, buildingNumber: e.target.value })} placeholder="مثال: 550 أو D3" /></Field>
            <Field label="اسم المبنى"><Input value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} placeholder="مثال: كلية طب الأسنان" /></Field>
            <Field label="الموقع داخل الجامعة"><Input value={buildingForm.campusLocation} onChange={(e) => setBuildingForm({ ...buildingForm, campusLocation: e.target.value })} /></Field>
            <Field label="عدد المستفيدين التقريبي"><Input type="number" min="0" value={buildingForm.expectedUsers} onChange={(e) => setBuildingForm({ ...buildingForm, expectedUsers: e.target.value })} /></Field>
            <Field label="المدينة"><Input value={buildingForm.city} onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })} /></Field>
            <Field label="الحي"><Input value={buildingForm.district} onChange={(e) => setBuildingForm({ ...buildingForm, district: e.target.value })} /></Field>
            <Field label="حالة التغطية"><NativeSelect value={buildingForm.coverageStatus} onChange={(e) => setBuildingForm({ ...buildingForm, coverageStatus: e.target.value })}><option value="unassessed">لم يتم التقييم</option><option value="covered">مغطى بخدمة الصلاة</option><option value="needs_prayer_room">يحتاج مصلى</option><option value="under_feasibility_study">قيد دراسة إمكانية الإنشاء</option><option value="under_implementation">مصلى تحت التنفيذ</option><option value="not_feasible_alternative">تعذر الإنشاء / بديل معتمد</option></NativeSelect></Field>
            <Field label="إمكانية إنشاء مصلى"><NativeSelect value={buildingForm.creationFeasibility} onChange={(e) => setBuildingForm({ ...buildingForm, creationFeasibility: e.target.value })}><option value="under_study">قيد الدراسة</option><option value="available">متاح إنشاء مصلى</option><option value="unavailable">غير متاح إنشاء مصلى</option></NativeSelect></Field>
            {buildingForm.creationFeasibility === 'unavailable' && <Field label="سبب عدم إمكانية الإنشاء *"><Textarea rows={3} value={buildingForm.unavailableReason} onChange={(e) => setBuildingForm({ ...buildingForm, unavailableReason: e.target.value })} placeholder="عدم توفر مساحة، اشتراطات السلامة، طبيعة المبنى..." /></Field>}
            <Field label="البديل المعتمد"><Textarea rows={3} value={buildingForm.approvedAlternative} onChange={(e) => setBuildingForm({ ...buildingForm, approvedAlternative: e.target.value })} placeholder="ربط بأقرب مصلى، مساحة متعددة الاستخدام، لوحات إرشادية..." /></Field>
            <div className="md:col-span-2"><Field label="ملاحظات"><Textarea rows={3} value={buildingForm.notes} onChange={(e) => setBuildingForm({ ...buildingForm, notes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>إلغاء</Button><Button className={button3d} disabled={saving} onClick={saveBuilding}>{saving ? 'جاري الحفظ...' : 'حفظ بيانات المبنى'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

`;
  s = s.slice(0, pos) + dialog + s.slice(pos);
}

fs.writeFileSync(pagePath, s);
