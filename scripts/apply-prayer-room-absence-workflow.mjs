import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('PRAYER_ROOM_ABSENCE_WORKFLOW_V1')) {
  console.log('Prayer room absence workflow already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Patch anchor not found: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`const buildingFeasibilityLabels: Record<string, string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};
`,
`const buildingFeasibilityLabels: Record<string, string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};

// PRAYER_ROOM_ABSENCE_WORKFLOW_V1
// عدم وجود سجل مصلى لا يعني تلقائيًا أن المصلى غير موجود ميدانيًا.
// يعتبر الغياب مؤكدًا فقط بعد تقييم ملف خدمة الصلاة للمبنى (أي عندما لا تكون الحالة "لم يتم التقييم").
type BuildingPrayerRoomPresence = 'present' | 'absent' | 'unknown';
const buildingPrayerRoomPresenceLabels: Record<BuildingPrayerRoomPresence, string> = {
  present: 'موجود',
  absent: 'غير موجود — تم التحقق',
  unknown: 'لم يتم التحقق',
};
const buildingPrayerRoomPresence = (building: MosqueBuilding | null | undefined, gender: 'men' | 'women'): BuildingPrayerRoomPresence => {
  if (!building) return 'unknown';
  const linked = Boolean(building.sites?.some((site) =>
    site.siteType === 'prayer_room' && site.prayerRoomGender === gender && site.status !== 'temporarily_closed'
  ));
  if (linked) return 'present';
  return building.coverageStatus === 'unassessed' ? 'unknown' : 'absent';
};
const prayerRoomPresenceClass = (presence: BuildingPrayerRoomPresence) =>
  presence === 'present'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
    : presence === 'absent'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-slate-300 bg-slate-50 text-slate-600';
`,
  'presence helpers',
);

replaceOnce(
`  const selectedBuildingHasMen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed'));
  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));
  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.buildingId && siteForm.prayerRoomGender
`,
`  const selectedBuildingHasMen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed'));
  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));
  const selectedBuildingMenPresence = buildingPrayerRoomPresence(selectedSiteBuilding, 'men');
  const selectedBuildingWomenPresence = buildingPrayerRoomPresence(selectedSiteBuilding, 'women');
  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.buildingId && siteForm.prayerRoomGender
`,
  'selected building presence',
);

replaceOnce(
`  const openSiteDialog = (site?: MosqueSite) => {
`,
`  const confirmNoPrayerRoomInBuilding = async (building: MosqueBuilding) => {
    const hasPrayerRoom = Boolean(building.sites?.some((site) =>
      site.siteType === 'prayer_room' && site.status !== 'temporarily_closed'
    ));
    if (hasPrayerRoom) {
      toast.error('يوجد مصلى فعلي مرتبط بهذا المبنى. عدّل سجل المصلى الموجود بدل تسجيل عدم وجود مصلى.');
      return;
    }
    if (!window.confirm(\`سيتم إثبات أن المبنى رقم \${building.buildingNumber} لا يوجد به مصلى حاليًا، وتحديث ملف خدمة الصلاة دون إنشاء سجل مصلى وهمي. هل تريد المتابعة؟\`)) return;

    const nextCoverageStatus: MosqueBuilding['coverageStatus'] = ['needs_prayer_room', 'under_feasibility_study', 'under_implementation', 'not_feasible_alternative'].includes(building.coverageStatus)
      ? building.coverageStatus
      : 'needs_prayer_room';

    setSaving(true);
    try {
      await mosqueApi.updateBuilding(building.id, { coverageStatus: nextCoverageStatus });
      toast.success('تم إثبات عدم وجود مصلى في المبنى ضمن ملف خدمة الصلاة، دون إنشاء موقع وهمي');
      setSiteDialog(false);
      setBuildingDialog(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة خدمة الصلاة للمبنى');
    } finally {
      setSaving(false);
    }
  };

  const openSiteDialog = (site?: MosqueSite) => {
`,
  'confirm no prayer room action',
);

replaceOnce(
`    if (siteForm.spatialRelation === 'inside_building' && !linkedBuilding) return toast.error('المبنى المحدد غير موجود أو غير معتمد في السجل المركزي');
    if (siteForm.spatialRelation === 'inside_building' && siteForm.prayerRoomGender) {
`,
`    if (siteForm.spatialRelation === 'inside_building' && !linkedBuilding) return toast.error('المبنى المحدد غير موجود أو غير معتمد في السجل المركزي');
    if (siteForm.spatialRelation === 'inside_building' && /^(لا\\s*يوجد|غير\\s*موجود)/.test(siteForm.name.trim())) {
      return toast.error('لا تنشئ سجل مصلى باسم «لا يوجد». استخدم إجراء «تسجيل: لا يوجد مصلى في المبنى» ليحفظ الحالة في ملف خدمة الصلاة.');
    }
    if (siteForm.spatialRelation === 'inside_building' && siteForm.prayerRoomGender) {
`,
  'block fake prayer room records',
);

replaceOnce(
`      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, payload)
        : await mosqueApi.createSite(payload);
      toast.success(editingSite ? 'تم تحديث بيانات الموقع والمرفقات' : 'تمت إضافة الموقع والمرفقات وإنشاء QR تلقائيًا');
`,
`      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, payload)
        : await mosqueApi.createSite(payload);
      if (linkedBuilding && savedSite.status !== 'temporarily_closed' && linkedBuilding.coverageStatus !== 'covered') {
        try { await mosqueApi.updateBuilding(linkedBuilding.id, { coverageStatus: 'covered' }); }
        catch { /* حفظ المصلى نجح؛ تحديث مؤشر التغطية يعاد احتسابه عند المراجعة التالية إن تعذر الطلب */ }
      }
      toast.success(editingSite ? 'تم تحديث بيانات الموقع والمرفقات' : 'تمت إضافة الموقع والمرفقات وإنشاء QR تلقائيًا');
`,
  'sync building coverage after prayer room save',
);

replaceOnce(
`            const men = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed');
            const women = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed');
            const mosque = building.sites?.some((site) => ['mosque', 'jami'].includes(site.siteType) && site.status !== 'temporarily_closed');
`,
`            const men = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed');
            const women = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed');
            const menPresence = buildingPrayerRoomPresence(building, 'men');
            const womenPresence = buildingPrayerRoomPresence(building, 'women');
            const mosque = building.sites?.some((site) => ['mosque', 'jami'].includes(site.siteType) && site.status !== 'temporarily_closed');
`,
  'building card presence values',
);

replaceOnce(
`                <div className="grid grid-cols-2 gap-2 text-xs"><div className={'rounded-xl border p-2 text-center ' + (men ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500')}>مصلى رجال: <b>{men ? 'موجود' : 'غير موجود'}</b></div><div className={'rounded-xl border p-2 text-center ' + (women ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500')}>مصلى نساء: <b>{women ? 'موجود' : 'غير موجود'}</b></div></div>
                {mosque && <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-center text-xs font-bold text-blue-800">يوجد مسجد / جامع مرتبط بالمبنى</div>}
`,
`                <div className="grid grid-cols-2 gap-2 text-xs"><div className={'rounded-xl border p-2 text-center ' + prayerRoomPresenceClass(menPresence)}>مصلى رجال: <b>{buildingPrayerRoomPresenceLabels[menPresence]}</b></div><div className={'rounded-xl border p-2 text-center ' + prayerRoomPresenceClass(womenPresence)}>مصلى نساء: <b>{buildingPrayerRoomPresenceLabels[womenPresence]}</b></div></div>
                {!men && !women && building.coverageStatus === 'needs_prayer_room' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-center text-xs font-bold text-amber-900">لا يوجد مصلى في هذا المبنى — تم تقييمه ويحتاج مصلى</div>}
                {mosque && <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs font-bold text-red-800">سجل قديم يحتاج مراجعة: يوجد مسجد / جامع مرتبط بالمبنى، بينما المباني الجامعية يسمح بربط المصليات فقط.</div>}
`,
  'building card status labels',
);

replaceOnce(
`            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عدد المستفيدين المتوقع لخدمة الصلاة"><Input type="number" min="0" value={buildingForm.expectedUsers} onChange={(e) => setBuildingForm({ ...buildingForm, expectedUsers: e.target.value })} /></Field>
`,
`            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div><p className="font-black text-emerald-950">التحقق من وجود المصليات</p><p className="mt-1 text-xs leading-6 text-emerald-800">وجود المصلى يثبت من سجل مصلى فعلي مرتبط بالمبنى. عدم وجود سجل لا يعد إثباتًا للغياب قبل تقييم المبنى.</p></div>
                {!editingBuilding.sites?.some((site) => site.siteType === 'prayer_room' && site.status !== 'temporarily_closed') && <Button type="button" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={saving} onClick={() => void confirmNoPrayerRoomInBuilding(editingBuilding)}><AlertTriangle className="ml-2 h-4 w-4" />تسجيل: لا يوجد مصلى في المبنى</Button>}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(['men', 'women'] as const).map((gender) => { const presence = buildingPrayerRoomPresence(editingBuilding, gender); return <div key={gender} className={'rounded-xl border p-3 text-center text-sm font-bold ' + prayerRoomPresenceClass(presence)}>مصلى {gender === 'men' ? 'رجال' : 'نساء'}: {buildingPrayerRoomPresenceLabels[presence]}</div>; })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عدد المستفيدين المتوقع لخدمة الصلاة"><Input type="number" min="0" value={buildingForm.expectedUsers} onChange={(e) => setBuildingForm({ ...buildingForm, expectedUsers: e.target.value })} /></Field>
`,
  'building dialog verification panel',
);

replaceOnce(
`                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">المبنى الجامعي يرتبط بمصلى رجال و/أو مصلى نساء فقط. المسجد والجامع يسجلان كموقع مستقل.</div><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b><Badge variant="outline" className={selectedBuildingHasMen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>مصلى رجال: {selectedBuildingHasMen ? 'موجود' : 'غير موجود'}</Badge><Badge variant="outline" className={selectedBuildingHasWomen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>مصلى نساء: {selectedBuildingHasWomen ? 'موجود' : 'غير موجود'}</Badge><Badge variant="outline">{buildingFeasibilityLabels[selectedSiteBuilding.creationFeasibility] || selectedSiteBuilding.creationFeasibility}</Badge></div><p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار. المدينة والحي والحرم والإحداثيات تورث تلقائيًا من السجل المركزي ولا تعدل من هنا.</p></div>}{duplicatePrayerRoom && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-800"><strong>لا يمكن إنشاء سجل مكرر:</strong> يوجد بالفعل مصلى {siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} في هذا المبنى باسم «{duplicatePrayerRoom.name}». استخدم تعديل السجل الموجود بدل إنشاء مصلى آخر من الفئة نفسها.</div>}
`,
`                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">المبنى الجامعي يرتبط بمصلى رجال و/أو مصلى نساء فقط. المسجد والجامع يسجلان كموقع مستقل.</div><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b><Badge variant="outline" className={prayerRoomPresenceClass(selectedBuildingMenPresence)}>مصلى رجال: {buildingPrayerRoomPresenceLabels[selectedBuildingMenPresence]}</Badge><Badge variant="outline" className={prayerRoomPresenceClass(selectedBuildingWomenPresence)}>مصلى نساء: {buildingPrayerRoomPresenceLabels[selectedBuildingWomenPresence]}</Badge><Badge variant="outline">{buildingFeasibilityLabels[selectedSiteBuilding.creationFeasibility] || selectedSiteBuilding.creationFeasibility}</Badge></div><div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-6 text-amber-900"><strong>إذا لم يوجد مصلى فعليًا:</strong> لا تنشئ موقعًا باسم «لا يوجد مصلى». سجّل النتيجة في ملف خدمة الصلاة للمبنى.</p>{!selectedBuildingHasMen && !selectedBuildingHasWomen && <Button type="button" size="sm" variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={saving} onClick={() => void confirmNoPrayerRoomInBuilding(selectedSiteBuilding)}><AlertTriangle className="ml-1 h-3.5 w-3.5" />تسجيل: لا يوجد مصلى في المبنى</Button>}</div><p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار. المدينة والحي والحرم والإحداثيات تورث تلقائيًا من السجل المركزي ولا تعدل من هنا.</p></div>}{duplicatePrayerRoom && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-800"><strong>لا يمكن إنشاء سجل مكرر:</strong> يوجد بالفعل مصلى {siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} في هذا المبنى باسم «{duplicatePrayerRoom.name}». استخدم تعديل السجل الموجود بدل إنشاء مصلى آخر من الفئة نفسها.</div>}
`,
  'site dialog absence action and labels',
);

fs.writeFileSync(path, source);
console.log('Applied prayer room absence workflow and data-integrity guards.');
