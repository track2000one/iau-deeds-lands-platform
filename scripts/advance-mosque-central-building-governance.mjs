import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('CENTRAL_BUILDING_GOVERNANCE_V1')) {
  console.log('Central building governance patch already applied.');
  process.exit(0);
}

const replaceExact = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing anchor: ${label}`);
  source = source.replace(from, to);
};

const replaceBetween = (start, end, replacement, label) => {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing start anchor: ${label}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`Missing end anchor: ${label}`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
};

replaceExact(
  "import { BuildingExcelImportManager, isPendingImportedBuilding } from '../components/BuildingExcelImportManager';",
  "import { isPendingImportedBuilding } from '../components/BuildingExcelImportManager';",
  'building import',
);

const effectAnchor = `  useEffect(() => {\n    if (!isAdmin && activeTab === 'roles') setActiveTab('team');\n  }, [isAdmin, activeTab]);\n`;
replaceExact(effectAnchor, `${effectAnchor}\n  // CENTRAL_BUILDING_GOVERNANCE_V1: when a mosque/prayer room is inside a university building,\n  // the central building registry is the authoritative source for shared location data.\n  useEffect(() => {\n    if (!siteDialog || siteForm.spatialRelation !== 'inside_building' || !siteForm.buildingId) return;\n    const building = officialBuildings.find((item) => item.id === siteForm.buildingId);\n    if (!building) return;\n    setSiteForm((current: any) => {\n      const next = {\n        ...current,\n        city: building.city || '',\n        district: building.district || '',\n        campusLocation: building.campusLocation || '',\n        latitude: building.latitude ?? '',\n        longitude: building.longitude ?? '',\n      };\n      if (\n        current.city === next.city &&\n        current.district === next.district &&\n        current.campusLocation === next.campusLocation &&\n        current.latitude === next.latitude &&\n        current.longitude === next.longitude\n      ) return current;\n      return next;\n    });\n    setShowSiteMap(false);\n  }, [siteDialog, siteForm.spatialRelation, siteForm.buildingId, officialBuildings]);\n`, 'role effect');

replaceBetween(
  '  const saveBuilding = async () => {',
  '  const deleteBuilding = async',
  `  const saveBuilding = async () => {\n    if (!editingBuilding) return toast.error('تعريف المبنى وتعديل بياناته الأساسية يتم من السجل المركزي للمباني');\n    if (buildingForm.creationFeasibility === 'unavailable' && !String(buildingForm.unavailableReason || '').trim()) {\n      return toast.error('سبب تعذر إنشاء المصلى مطلوب');\n    }\n    setSaving(true);\n    try {\n      await mosqueApi.updateBuilding(editingBuilding.id, {\n        expectedUsers: buildingForm.expectedUsers === '' ? null : Number(buildingForm.expectedUsers),\n        coverageStatus: buildingForm.coverageStatus,\n        creationFeasibility: buildingForm.creationFeasibility,\n        unavailableReason: buildingForm.creationFeasibility === 'unavailable' ? (String(buildingForm.unavailableReason || '').trim() || null) : null,\n        approvedAlternative: String(buildingForm.approvedAlternative || '').trim() || null,\n      });\n      toast.success('تم تحديث ملف خدمة الصلاة للمبنى دون تعديل بياناته المركزية');\n      setBuildingDialog(false);\n      await loadAll();\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : 'تعذر حفظ ملف خدمة الصلاة');\n    } finally { setSaving(false); }\n  };\n\n`,
  'saveBuilding',
);

replaceExact(
  "  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));\n",
  "  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));\n  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.siteType === 'prayer_room' && siteForm.buildingId && siteForm.prayerRoomGender\n    ? sites.find((site) => site.id !== editingSite?.id && site.buildingId === siteForm.buildingId && site.siteType === 'prayer_room' && site.prayerRoomGender === siteForm.prayerRoomGender) || null\n    : null;\n",
  'duplicate prayer room state',
);

replaceExact(
  `  const saveSite = async () => {\n    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');\n    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');\n    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');\n    setSaving(true);\n`,
  `  const saveSite = async () => {\n    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');\n    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');\n    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');\n    const linkedBuilding = siteForm.spatialRelation === 'inside_building'\n      ? officialBuildings.find((building) => building.id === siteForm.buildingId) || null\n      : null;\n    if (siteForm.spatialRelation === 'inside_building' && !linkedBuilding) return toast.error('المبنى المحدد غير موجود أو غير معتمد في السجل المركزي');\n    if (siteForm.spatialRelation === 'inside_building' && siteForm.siteType === 'prayer_room' && siteForm.prayerRoomGender) {\n      const duplicate = sites.find((site) =>\n        site.id !== editingSite?.id &&\n        site.buildingId === siteForm.buildingId &&\n        site.siteType === 'prayer_room' &&\n        site.prayerRoomGender === siteForm.prayerRoomGender\n      );\n      if (duplicate) return toast.error(\`يوجد بالفعل مصلى \${siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} مرتبط بهذا المبنى باسم «\${duplicate.name}». عدّل السجل الموجود بدل إنشاء سجل مكرر.\`);\n    }\n    setSaving(true);\n`,
  'saveSite validation',
);

replaceExact(
  `      const payload = {\n        ...siteForm,\n`,
  `      const effectiveLatitude = linkedBuilding ? linkedBuilding.latitude ?? null : (siteForm.latitude === '' ? null : Number(siteForm.latitude));\n      const effectiveLongitude = linkedBuilding ? linkedBuilding.longitude ?? null : (siteForm.longitude === '' ? null : Number(siteForm.longitude));\n      const payload = {\n        ...siteForm,\n        spatialRelation: siteForm.spatialRelation || 'independent',\n        buildingId: linkedBuilding?.id || null,\n        floor: linkedBuilding ? (siteForm.floor || null) : null,\n        roomNumber: linkedBuilding ? (siteForm.roomNumber || null) : null,\n        city: linkedBuilding ? (linkedBuilding.city || null) : (siteForm.city || null),\n        district: linkedBuilding ? (linkedBuilding.district || null) : (siteForm.district || null),\n        campusLocation: linkedBuilding ? (linkedBuilding.campusLocation || null) : (siteForm.campusLocation || null),\n`,
  'site payload start',
);

replaceExact(
  `        latitude: siteForm.latitude === '' ? null : Number(siteForm.latitude),\n        longitude: siteForm.longitude === '' ? null : Number(siteForm.longitude),\n        mapUrl: siteForm.latitude !== '' && siteForm.longitude !== '' ? \`https://www.google.com/maps?q=\${siteForm.latitude},\${siteForm.longitude}\` : null,\n`,
  `        latitude: effectiveLatitude,\n        longitude: effectiveLongitude,\n        mapUrl: effectiveLatitude != null && effectiveLongitude != null ? \`https://www.google.com/maps?q=\${effectiveLatitude},\${effectiveLongitude}\` : null,\n`,
  'site coordinates payload',
);

replaceExact(
  `              <BuildingExcelImportManager\n                buildings={buildings}\n                role={role}\n                canAdd={canAdd}\n                canEdit={canEdit}\n                canDelete={canDelete}\n                onReload={loadAll}\n              />\n`,
  `              <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-7 text-sky-950 md:flex-row md:items-center md:justify-between">\n                <div><strong>مصدر تعريف المباني: السجل المركزي للمباني.</strong><div className="text-xs text-sky-800">إضافة المبنى أو استيراده من Excel أو تعديل رقمه واسمه وموقعه وإحداثياته يتم مركزيًا. هذه الصفحة تحفظ فقط بيانات تغطية خدمة الصلاة.</div></div>\n                <Button type="button" variant="outline" className={button3d} onClick={() => navigate('/buildings/registry')}><Building2 className="ml-2 h-4 w-4" />فتح السجل المركزي</Button>\n              </div>\n`,
  'building excel manager',
);

replaceExact(
  `{role === 'head' && <div className="flex gap-2">{canEdit && <Button variant="outline" size="sm" className={button3d} onClick={() => openBuildingDialog(building)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}{canDelete && <Button variant="outline" size="sm" className="border-red-300 text-red-600" onClick={() => deleteBuilding(building)}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}</div>}`,
  `{canEdit && ['head', 'supervisor'].includes(role) && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" className={button3d} onClick={() => openBuildingDialog(building)}><Pencil className="ml-1 h-4 w-4" />ملف خدمة الصلاة</Button><Button variant="outline" size="sm" className={button3d} onClick={() => navigate('/buildings/registry')}><Building2 className="ml-1 h-4 w-4" />السجل المركزي</Button></div>}`,
  'building card actions',
);

replaceBetween(
  '      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>',
  '      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>',
  `      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>\n        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[900px]" dir="rtl">\n          <DialogHeader className="text-right"><DialogTitle>ملف خدمة الصلاة للمبنى</DialogTitle><DialogDescription>بيانات تعريف المبنى مصدرها السجل المركزي ولا تعدل من وحدة العناية. هنا يتم تحديث بيانات التغطية والاحتياج فقط.</DialogDescription></DialogHeader>\n          {editingBuilding && <div className="space-y-4 py-3">\n            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">\n              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-sky-950">البيانات المركزية للمبنى — للقراءة فقط</p><p className="mt-1 text-xs text-sky-800">أي تعديل على رقم المبنى أو مسماه أو موقعه أو إحداثياته يتم من السجل المركزي لينعكس على جميع الوحدات.</p></div><Button type="button" variant="outline" className={button3d} onClick={() => navigate('/buildings/registry')}><Building2 className="ml-2 h-4 w-4" />فتح السجل المركزي</Button></div>\n              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">\n                <Info label="رقم المبنى" value={editingBuilding.buildingNumber} />\n                <Info label="اسم المبنى" value={editingBuilding.name || '-'} />\n                <Info label="الحرم / الموقع" value={editingBuilding.campusLocation || '-'} />\n                <Info label="المدينة" value={editingBuilding.city || '-'} />\n                <Info label="الحي" value={editingBuilding.district || '-'} />\n                <Info label="الإحداثيات" value={editingBuilding.latitude != null && editingBuilding.longitude != null ? \`\${editingBuilding.latitude}, \${editingBuilding.longitude}\` : '-'} />\n              </div>\n            </div>\n            <div className="grid gap-4 md:grid-cols-2">\n              <Field label="عدد المستفيدين المتوقع لخدمة الصلاة"><Input type="number" min="0" value={buildingForm.expectedUsers} onChange={(e) => setBuildingForm({ ...buildingForm, expectedUsers: e.target.value })} /></Field>\n              <Field label="حالة التغطية"><NativeSelect value={buildingForm.coverageStatus} onChange={(e) => setBuildingForm({ ...buildingForm, coverageStatus: e.target.value })}><option value="unassessed">لم يتم التقييم</option><option value="covered">مغطى بخدمة الصلاة</option><option value="needs_prayer_room">يحتاج مصلى</option><option value="under_feasibility_study">قيد دراسة إمكانية الإنشاء</option><option value="under_implementation">مصلى تحت التنفيذ</option><option value="not_feasible_alternative">تعذر الإنشاء / بديل معتمد</option></NativeSelect></Field>\n              <Field label="إمكانية إنشاء مصلى"><NativeSelect value={buildingForm.creationFeasibility} onChange={(e) => setBuildingForm({ ...buildingForm, creationFeasibility: e.target.value })}><option value="under_study">قيد الدراسة</option><option value="available">متاح إنشاء مصلى</option><option value="unavailable">غير متاح إنشاء مصلى</option></NativeSelect></Field>\n              {buildingForm.creationFeasibility === 'unavailable' && <Field label="سبب عدم إمكانية الإنشاء *"><Textarea rows={3} value={buildingForm.unavailableReason} onChange={(e) => setBuildingForm({ ...buildingForm, unavailableReason: e.target.value })} placeholder="عدم توفر مساحة، اشتراطات السلامة، طبيعة المبنى..." /></Field>}\n              <div className="md:col-span-2"><Field label="البديل المعتمد"><Textarea rows={3} value={buildingForm.approvedAlternative} onChange={(e) => setBuildingForm({ ...buildingForm, approvedAlternative: e.target.value })} placeholder="ربط بأقرب مصلى، مساحة متعددة الاستخدام، لوحات إرشادية..." /></Field></div>\n            </div>\n            {editingBuilding.notes && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm"><strong>ملاحظات السجل المركزي:</strong><p className="mt-1 whitespace-pre-wrap text-slate-600">{editingBuilding.notes}</p></div>}\n          </div>}\n          <DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>إلغاء</Button><Button className={button3d} disabled={saving || !editingBuilding} onClick={saveBuilding}>{saving ? 'جاري الحفظ...' : 'حفظ ملف خدمة الصلاة'}</Button></DialogFooter>\n        </DialogContent>\n      </Dialog>\n\n`,
  'building dialog',
);

replaceExact(
  `<Field label="رقم المبنى *"><NativeSelect className="h-11" value={siteForm.buildingId || ''} onChange={(e) => setSiteForm({ ...siteForm, buildingId: e.target.value })}><option value="">اختر المبنى</option>{officialBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}</NativeSelect></Field>`,
  `<Field label="رقم المبنى * — من السجل المركزي"><NativeSelect className="h-11" value={siteForm.buildingId || ''} onChange={(e) => setSiteForm({ ...siteForm, buildingId: e.target.value })}><option value="">اختر المبنى المعتمد</option>{officialBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}</NativeSelect></Field>`,
  'site building selector',
);

replaceExact(
  `<p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار ودعم استكمال التغطية الرجالية والنسائية.</p></div>}`,
  `<p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار. المدينة والحي والحرم والإحداثيات تورث تلقائيًا من السجل المركزي ولا تعدل من هنا.</p></div>}{duplicatePrayerRoom && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-800"><strong>لا يمكن إنشاء سجل مكرر:</strong> يوجد بالفعل مصلى {siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} في هذا المبنى باسم «{duplicatePrayerRoom.name}». استخدم تعديل السجل الموجود بدل إنشاء مصلى آخر من الفئة نفسها.</div>}`,
  'duplicate warning',
);

replaceExact(
  `<Field label="المدينة"><Input className="h-11" value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} /></Field>`,
  `<Field label={siteForm.spatialRelation === 'inside_building' ? 'المدينة — موروثة من السجل المركزي' : 'المدينة'}><Input className={\`h-11 \${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}\`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} /></Field>`,
  'site city',
);
replaceExact(
  `<Field label="الحي"><Input className="h-11" value={siteForm.district} onChange={(e) => setSiteForm({ ...siteForm, district: e.target.value })} /></Field>`,
  `<Field label={siteForm.spatialRelation === 'inside_building' ? 'الحي — موروث من السجل المركزي' : 'الحي'}><Input className={\`h-11 \${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}\`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.district} onChange={(e) => setSiteForm({ ...siteForm, district: e.target.value })} /></Field>`,
  'site district',
);
replaceExact(
  `<Field label="الموقع داخل الجامعة"><Input className="h-11" value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>`,
  `<Field label={siteForm.spatialRelation === 'inside_building' ? 'الحرم / الموقع — موروث من السجل المركزي' : 'الموقع داخل الجامعة'}><Input className={\`h-11 \${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}\`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>`,
  'site campus',
);

replaceExact(
  `<CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-blue-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle><CardDescription>يمكن إدخال الإحداثيات يدويًا أو التقاط الموقع الحالي من الجهاز.</CardDescription></CardHeader>`,
  `<CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-blue-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle><CardDescription>{siteForm.spatialRelation === 'inside_building' ? 'الإحداثيات موروثة تلقائيًا من السجل المركزي للمبنى. لتعديلها حدّث المبنى المركزي.' : 'يمكن إدخال الإحداثيات يدويًا أو التقاط الموقع الحالي من الجهاز.'}</CardDescription></CardHeader>`,
  'geo description',
);
replaceExact(
  `<Field label="خط العرض"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.latitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, latitude: e.target.value }))} placeholder="26.3927" /></Field>`,
  `<Field label="خط العرض"><Input className={\`h-11 \${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}\`} readOnly={siteForm.spatialRelation === 'inside_building'} type="number" step="any" inputMode="decimal" value={siteForm.latitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, latitude: e.target.value }))} placeholder="26.3927" /></Field>`,
  'latitude input',
);
replaceExact(
  `<Field label="خط الطول"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.longitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, longitude: e.target.value }))} placeholder="50.0438" /></Field>`,
  `<Field label="خط الطول"><Input className={\`h-11 \${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}\`} readOnly={siteForm.spatialRelation === 'inside_building'} type="number" step="any" inputMode="decimal" value={siteForm.longitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, longitude: e.target.value }))} placeholder="50.0438" /></Field>`,
  'longitude input',
);
replaceExact(
  `onClick={captureCurrentSiteLocation} disabled={locatingSite}`,
  `onClick={captureCurrentSiteLocation} disabled={locatingSite || siteForm.spatialRelation === 'inside_building'}`,
  'current site location button',
);
replaceExact(
  `onClick={() => setShowSiteMap((current) => !current)}>\n                    <MapPin className="ml-2 h-4 w-4" />`,
  `onClick={() => setShowSiteMap((current) => !current)} disabled={siteForm.spatialRelation === 'inside_building'}>\n                    <MapPin className="ml-2 h-4 w-4" />`,
  'site map toggle',
);
replaceExact(
  `{showSiteMap && (\n                  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white p-1 shadow-sm">`,
  `{showSiteMap && siteForm.spatialRelation !== 'inside_building' && (\n                  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white p-1 shadow-sm">`,
  'site map render',
);

fs.writeFileSync(file, source);
console.log('Applied central building governance and prayer-room duplicate protections.');
