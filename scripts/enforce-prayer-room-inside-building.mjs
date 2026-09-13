import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Patch anchor not found: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`  const saveSite = async () => {
    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');
    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');
    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');
    const linkedBuilding = siteForm.spatialRelation === 'inside_building'
`,
`  const saveSite = async () => {
    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');
    const effectiveSiteType = siteForm.spatialRelation === 'inside_building' ? 'prayer_room' : siteForm.siteType;
    if (effectiveSiteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');
    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');
    const linkedBuilding = siteForm.spatialRelation === 'inside_building'
`,
  'save-site effective type',
);

replaceOnce(
`    if (siteForm.spatialRelation === 'inside_building' && siteForm.siteType === 'prayer_room' && siteForm.prayerRoomGender) {
`,
`    if (siteForm.spatialRelation === 'inside_building' && siteForm.prayerRoomGender) {
`,
  'save-site duplicate condition',
);

replaceOnce(
`      const payload = {
        ...siteForm,
        spatialRelation: siteForm.spatialRelation || 'independent',
`,
`      const payload = {
        ...siteForm,
        siteType: effectiveSiteType,
        spatialRelation: siteForm.spatialRelation || 'independent',
`,
  'site payload effective type',
);

replaceOnce(
`        prayerRoomGender: siteForm.siteType === 'prayer_room' ? siteForm.prayerRoomGender : null,
`,
`        prayerRoomGender: effectiveSiteType === 'prayer_room' ? siteForm.prayerRoomGender : null,
`,
  'site payload prayer room gender',
);

replaceOnce(
`  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.siteType === 'prayer_room' && siteForm.buildingId && siteForm.prayerRoomGender
`,
`  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.buildingId && siteForm.prayerRoomGender
`,
  'duplicate prayer room indicator',
);

replaceOnce(
`                <Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value, prayerRoomGender: e.target.value === 'prayer_room' ? siteForm.prayerRoomGender : '' })}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect></Field>
                {siteForm.siteType === 'prayer_room' && <Field label="فئة المصلى *"><NativeSelect className="h-11" value={siteForm.prayerRoomGender || ''} onChange={(e) => setSiteForm({ ...siteForm, prayerRoomGender: e.target.value })}><option value="">اختر الفئة</option><option value="men">رجال</option><option value="women">نساء</option></NativeSelect></Field>}
                <Field label="الارتباط المكاني *"><NativeSelect className="h-11" value={siteForm.spatialRelation || 'independent'} onChange={(e) => setSiteForm({ ...siteForm, spatialRelation: e.target.value, buildingId: e.target.value === 'inside_building' ? siteForm.buildingId : '', floor: e.target.value === 'inside_building' ? siteForm.floor : '', roomNumber: e.target.value === 'inside_building' ? siteForm.roomNumber : '' })}><option value="independent">موقع مستقل</option><option value="inside_building">داخل مبنى جامعي</option></NativeSelect></Field>
`,
`                <Field label="النوع">
                  {siteForm.spatialRelation === 'inside_building'
                    ? <div className="space-y-1"><Input className="h-11 bg-emerald-50 font-bold text-emerald-800" readOnly value="مصلى" /><p className="text-[11px] leading-5 text-emerald-700">داخل المباني الجامعية يسمح بتسجيل المصليات فقط، ولا يمكن إنشاء مسجد أو جامع داخل المبنى.</p></div>
                    : <NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value, prayerRoomGender: e.target.value === 'prayer_room' ? siteForm.prayerRoomGender : '' })}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect>}
                </Field>
                {siteForm.siteType === 'prayer_room' && <Field label="فئة المصلى *"><NativeSelect className="h-11" value={siteForm.prayerRoomGender || ''} onChange={(e) => setSiteForm({ ...siteForm, prayerRoomGender: e.target.value })}><option value="">اختر الفئة</option><option value="men">رجال</option><option value="women">نساء</option></NativeSelect></Field>}
                <Field label="الارتباط المكاني *"><NativeSelect className="h-11" value={siteForm.spatialRelation || 'independent'} onChange={(e) => {
                  const insideBuilding = e.target.value === 'inside_building';
                  setSiteForm({
                    ...siteForm,
                    spatialRelation: e.target.value,
                    siteType: insideBuilding ? 'prayer_room' : siteForm.siteType,
                    prayerRoomGender: insideBuilding ? siteForm.prayerRoomGender : siteForm.prayerRoomGender,
                    buildingId: insideBuilding ? siteForm.buildingId : '',
                    floor: insideBuilding ? siteForm.floor : '',
                    roomNumber: insideBuilding ? siteForm.roomNumber : '',
                  });
                }}><option value="independent">موقع مستقل</option><option value="inside_building">داخل مبنى جامعي — مصلى فقط</option></NativeSelect></Field>
`,
  'site type and spatial relation controls',
);

// A visible guard near the selected central building makes the rule explicit for operators.
replaceOnce(
`                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b>`,
`                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">المبنى الجامعي يرتبط بمصلى رجال و/أو مصلى نساء فقط. المسجد والجامع يسجلان كموقع مستقل.</div><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b>`,
  'inside building guidance',
);

fs.writeFileSync(path, source);
console.log('Applied prayer-room-only rule for sites inside university buildings.');
