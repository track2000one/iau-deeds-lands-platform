import fs from 'node:fs';

const files = {
  addAsset: 'src/app/pages/AddAssetPage.tsx',
  editAsset: 'src/app/pages/EditAssetPage.tsx',
  accounting: 'src/app/pages/AccountingTransformationFormPage.tsx',
};

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  return source.replace(from, to);
}

function patchAddAsset() {
  let source = read(files.addAsset);

  source = replaceOnce(
    source,
`  const selectCentralBuilding = (buildingId: string) => {
    if (buildingId === '__manual__') {
      setForm((current) => ({
        ...current,
        excelPayload: withCentralBuildingId(current.excelPayload, null),
      }));
      return;
    }`,
`  const selectCentralBuilding = (buildingId: string) => {
    if (buildingId === '__independent__') {
      setForm((current) => ({
        ...current,
        building: '',
        buildingNumber: '',
        floor: '',
        room: '',
        coordinates: '',
        excelPayload: withCentralBuildingId(current.excelPayload, null),
      }));
      return;
    }`,
    'AddAsset independent selector'
  );

  source = replaceOnce(
    source,
`    if (!String(form.category || '').trim()) {
      setError('تصنيف الأصل مطلوب.');
      return;
    }

    try {`,
`    if (!String(form.category || '').trim()) {
      setError('تصنيف الأصل مطلوب.');
      return;
    }

    const centralBuildingId = getAssetCentralBuildingId(form);
    const hasBuildingLocation = Boolean(
      String(form.building || '').trim() ||
      String(form.buildingNumber || '').trim() ||
      String(form.floor || '').trim() ||
      String(form.room || '').trim()
    );
    if (hasBuildingLocation && !centralBuildingId) {
      setError('عند تسجيل الأصل داخل مبنى يجب اختيار المبنى من السجل المركزي للمباني. لا يعتمد الإدخال اليدوي لرقم أو اسم المبنى.');
      return;
    }

    try {`,
    'AddAsset save validation'
  );

  source = replaceOnce(
    source,
`            <Label>المبنى — السجل المركزي</Label>
            <Select
              value={getAssetCentralBuildingId(form) || '__manual__'}
              onValueChange={selectCentralBuilding}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المبنى من السجل المركزي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">بدون ربط مركزي / إدخال يدوي</SelectItem>`,
`            <Label>ارتباط الأصل بالمبنى — السجل المركزي *</Label>
            <Select
              value={getAssetCentralBuildingId(form) || (String(form.building || form.buildingNumber || form.floor || form.room || '').trim() ? '__legacy__' : '__independent__')}
              onValueChange={selectCentralBuilding}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المبنى من السجل المركزي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__legacy__" disabled>بيانات موقع غير مرتبطة — اختر المبنى لاعتمادها</SelectItem>
                <SelectItem value="__independent__">موقع مستقل / غير مرتبط بمبنى جامعي</SelectItem>`,
    'AddAsset central selector UI'
  );

  source = replaceOnce(
    source,
`              <Input
                value={form.building || ''}
                onChange={(e) => setField('building', e.target.value)}
                className="pr-9"
                placeholder="الوصف التشغيلي للمبنى"
              />`,
`              <Input
                value={form.building || ''}
                onChange={(e) => setField('building', e.target.value)}
                className="pr-9"
                placeholder="الوصف التشغيلي للمبنى"
                disabled={!getAssetCentralBuildingId(form)}
              />`,
    'AddAsset building input lock'
  );

  source = replaceOnce(
    source,
`              اختيار مبنى من السجل المركزي يحفظ معرفًا ثابتًا مع الأصل، ويبقى اسم/رقم المبنى للعرض والتوافق مع السجلات السابقة.`,
`              إذا كان الأصل داخل مبنى جامعي فاختيار المبنى من السجل المركزي إلزامي. استخدم «موقع مستقل» فقط للأصول غير المرتبطة بأي مبنى.`,
    'AddAsset help text'
  );

  source = replaceOnce(
    source,
`            <Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} placeholder="الدور" />`,
`            <Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} placeholder="الدور" disabled={!getAssetCentralBuildingId(form)} />`,
    'AddAsset floor lock'
  );

  source = replaceOnce(
    source,
`            <Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} placeholder="رقم الغرفة أو وصف الموقع" />`,
`            <Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} placeholder="رقم الغرفة أو وصف الموقع" disabled={!getAssetCentralBuildingId(form)} />`,
    'AddAsset room lock'
  );

  write(files.addAsset, source);
}

function patchEditAsset() {
  let source = read(files.editAsset);

  source = replaceOnce(
    source,
`  const selectCentralBuilding = (buildingId: string) => {
    if (buildingId === '__manual__') {
      setForm((current) => ({ ...current, excelPayload: withCentralBuildingId(current.excelPayload, null) }));
      return;
    }`,
`  const selectCentralBuilding = (buildingId: string) => {
    if (buildingId === '__independent__') {
      setForm((current) => ({
        ...current,
        building: '',
        buildingNumber: '',
        floor: '',
        room: '',
        coordinates: '',
        excelPayload: withCentralBuildingId(current.excelPayload, null),
      }));
      return;
    }`,
    'EditAsset independent selector'
  );

  source = replaceOnce(
    source,
`    if (!String(form.itemNumber || '').trim() || !String(form.name || '').trim() || !String(form.category || '').trim()) {
      setError('اسم الأصل والتصنيف حقول مطلوبة.');
      return;
    }

    try {`,
`    if (!String(form.itemNumber || '').trim() || !String(form.name || '').trim() || !String(form.category || '').trim()) {
      setError('اسم الأصل والتصنيف حقول مطلوبة.');
      return;
    }

    const centralBuildingId = getAssetCentralBuildingId(form);
    const hasBuildingLocation = Boolean(
      String(form.building || '').trim() ||
      String(form.buildingNumber || '').trim() ||
      String(form.floor || '').trim() ||
      String(form.room || '').trim()
    );
    if (hasBuildingLocation && !centralBuildingId) {
      setError('هذا الأصل يحتوي بيانات موقع داخل مبنى، ويجب ربطه أولًا بمبنى معتمد من السجل المركزي قبل حفظ التعديلات.');
      return;
    }

    try {`,
    'EditAsset save validation'
  );

  source = replaceOnce(
    source,
`          <div className="space-y-2"><Label>المبنى — السجل المركزي</Label><Select value={getAssetCentralBuildingId(form) || '__manual__'} onValueChange={selectCentralBuilding}><SelectTrigger><SelectValue placeholder="اختر المبنى من السجل المركزي" /></SelectTrigger><SelectContent><SelectItem value="__manual__">بدون ربط مركزي / إدخال يدوي</SelectItem>{centralBuildings.map((building) => <SelectItem key={building.id} value={building.id}>{building.buildingNumber} — {building.name || 'بدون مسمى'}</SelectItem>)}</SelectContent></Select><div className="relative"><Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.building || ''} onChange={(e) => setField('building', e.target.value)} placeholder="الوصف التشغيلي للمبنى" /></div><p className="text-[11px] leading-5 text-muted-foreground">الرابط المركزي ثابت حتى عند تعديل اسم المبنى لاحقًا.</p></div>
          <div><Label>الدور</Label><Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} /></div>`,
`          <div className="space-y-2"><Label>ارتباط الأصل بالمبنى — السجل المركزي *</Label><Select value={getAssetCentralBuildingId(form) || (String(form.building || form.buildingNumber || form.floor || form.room || '').trim() ? '__legacy__' : '__independent__')} onValueChange={selectCentralBuilding}><SelectTrigger><SelectValue placeholder="اختر المبنى من السجل المركزي" /></SelectTrigger><SelectContent><SelectItem value="__legacy__" disabled>بيانات موقع غير مرتبطة — اختر المبنى لاعتمادها</SelectItem><SelectItem value="__independent__">موقع مستقل / غير مرتبط بمبنى جامعي</SelectItem>{centralBuildings.map((building) => <SelectItem key={building.id} value={building.id}>{building.buildingNumber} — {building.name || 'بدون مسمى'}</SelectItem>)}</SelectContent></Select><div className="relative"><Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.building || ''} onChange={(e) => setField('building', e.target.value)} placeholder="الوصف التشغيلي للمبنى" disabled={!getAssetCentralBuildingId(form)} /></div><p className="text-[11px] leading-5 text-muted-foreground">الأصل الموجود داخل مبنى يجب أن يرتبط بمعرف المبنى من السجل المركزي قبل الحفظ.</p></div>
          <div><Label>الدور</Label><Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} disabled={!getAssetCentralBuildingId(form)} /></div>`,
    'EditAsset central selector UI'
  );

  source = replaceOnce(
    source,
`          <div><Label>الغرفة / الموقع التفصيلي</Label><Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} /></div>`,
`          <div><Label>الغرفة / الموقع التفصيلي</Label><Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} disabled={!getAssetCentralBuildingId(form)} /></div>`,
    'EditAsset room lock'
  );

  write(files.editAsset, source);
}

function patchAccounting() {
  let source = read(files.accounting);

  source = replaceOnce(
    source,
`    } else {
      if (!String(payload.B || '').trim() || !String(payload.C || '').trim()) return toast.error('اسم الجهة ورمز الجهة مطلوبان');
      if (!String(payload.G || '').trim()) return toast.error('وصف الأصل مطلوب');
    }
    setSaving(true);`,
`    } else {
      if (!String(payload.B || '').trim() || !String(payload.C || '').trim()) return toast.error('اسم الجهة ورمز الجهة مطلوبان');
      if (!String(payload.G || '').trim()) return toast.error('وصف الأصل مطلوب');
    }
    if (recordType === 'building' && !getCentralBuildingIdFromPayload(payload)) {
      return toast.error('سجل المبنى يجب ربطه بمبنى معتمد من السجل المركزي للمباني قبل الحفظ.');
    }
    setSaving(true);`,
    'Accounting building validation'
  );

  source = replaceOnce(
    source,
`                <Label>المبنى المركزي</Label>
                <NativeSelect value={getCentralBuildingIdFromPayload(payload)} onChange={(e) => selectCentralBuilding(e.target.value)}>
                  <option value="">غير مرتبط بعد</option>`,
`                <Label>المبنى المركزي *</Label>
                <NativeSelect value={getCentralBuildingIdFromPayload(payload)} onChange={(e) => selectCentralBuilding(e.target.value)} required>
                  <option value="" disabled>اختر المبنى من السجل المركزي</option>`,
    'Accounting selector required'
  );

  source = replaceOnce(
    source,
`                <p className="text-[11px] leading-5 text-slate-500">يحفظ النظام معرف المبنى الثابت داخل السجل المحاسبي؛ لذلك لا ينقطع الارتباط عند تغيير اسم المبنى أو وصفه.</p>`,
`                <p className="text-[11px] leading-5 text-slate-500">الربط إلزامي لسجل المبنى المحاسبي. يحفظ النظام معرف المبنى الثابت؛ لذلك لا ينقطع الارتباط عند تغيير الاسم أو الوصف.</p>`,
    'Accounting help text'
  );

  write(files.accounting, source);
}

patchAddAsset();
patchEditAsset();
patchAccounting();
console.log('Central building link enforcement applied successfully.');
