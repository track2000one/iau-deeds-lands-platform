from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')

anchor = """  const filteredTourSites = React.useMemo(() => {
    const needle = tourSearch.trim().toLowerCase();
    return sites.filter((site) => !needle || [site.name, site.campusLocation, site.city, site.district].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [sites, tourSearch]);
"""
insert = anchor + """

  const activeVisitBySite = React.useMemo(() => {
    const map = new Map<string, MosqueFieldVisit>();
    visits.forEach((visit) => {
      if (!['planned', 'in_progress', 'follow_up'].includes(visit.workflowStatus)) return;
      if (!map.has(visit.siteId)) map.set(visit.siteId, visit);
    });
    return map;
  }, [visits]);
"""
if 'const activeVisitBySite = React.useMemo' not in text:
    if anchor not in text:
        raise SystemExit('filteredTourSites anchor not found')
    text = text.replace(anchor, insert, 1)

anchor = """    if (!tourForm.title.trim() || !tourForm.scheduledDate || !teamMembers.length || !tourForm.siteIds.length) {
      toast.error('أكمل عنوان الجولة وتاريخها والفريق واختر موقعًا واحدًا على الأقل');
      return;
    }
    try {
"""
replacement = """    if (!tourForm.title.trim() || !tourForm.scheduledDate || !teamMembers.length || !tourForm.siteIds.length) {
      toast.error('أكمل عنوان الجولة وتاريخها والفريق واختر موقعًا واحدًا على الأقل');
      return;
    }
    const conflictingVisit = tourForm.siteIds.map((siteId) => activeVisitBySite.get(siteId)).find(Boolean);
    if (conflictingVisit) {
      toast.error(`يوجد إجراء ميداني قائم للموقع ${conflictingVisit.site.name} برقم ${conflictingVisit.visitNumber}. افتح الزيارة القائمة بدل إنشاء زيارة مكررة.`);
      return;
    }
    try {
"""
if 'const conflictingVisit = tourForm.siteIds.map' not in text:
    if anchor not in text:
        raise SystemExit('saveTour validation anchor not found')
    text = text.replace(anchor, replacement, 1)

anchor = """  const openNewVisit = (preset?: { siteId?: string; tourId?: string }) => {
    setEditingVisit(null);
    setVisitForm({ ...emptyVisit(template), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });
    setVisitDialog(true);
  };
"""
replacement = """  const openNewVisit = (preset?: { siteId?: string; tourId?: string }) => {
    const existingVisit = preset?.siteId ? activeVisitBySite.get(preset.siteId) : null;
    if (existingVisit) {
      toast.info(`يوجد إجراء ميداني قائم لهذا الموقع برقم ${existingVisit.visitNumber}`);
      setViewingVisit(existingVisit);
      return;
    }
    setEditingVisit(null);
    setVisitForm({ ...emptyVisit(template), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });
    setVisitDialog(true);
  };
"""
if 'const existingVisit = preset?.siteId ? activeVisitBySite.get' not in text:
    if anchor not in text:
        raise SystemExit('openNewVisit anchor not found')
    text = text.replace(anchor, replacement, 1)

anchor = """    if (!visitForm.siteId || !visitForm.visitDate || !teamMembers.length) {
      toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة وأعضاء الفريق');
      return;
    }
"""
replacement = """    if (!visitForm.siteId || !visitForm.visitDate || !teamMembers.length) {
      toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة وأعضاء الفريق');
      return;
    }
    if (!editingVisit) {
      const existingVisit = activeVisitBySite.get(visitForm.siteId);
      if (existingVisit) {
        toast.error(`يوجد إجراء ميداني قائم لهذا الموقع برقم ${existingVisit.visitNumber}. افتح الزيارة القائمة بدل إنشاء زيارة مكررة.`);
        setVisitDialog(false);
        setViewingVisit(existingVisit);
        return;
      }
    }
"""
if 'activeVisitBySite.get(visitForm.siteId)' not in text:
    if anchor not in text:
        raise SystemExit('saveVisit validation anchor not found')
    text = text.replace(anchor, replacement, 1)

old = """<Field label=\"المسجد أو المصلى *\"><NativeSelect value={visitForm.siteId} onChange={(event) => setVisitForm({ ...visitForm, siteId: event.target.value })} disabled={Boolean(editingVisit?.tourId)}><option value=\"\">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {site.campusLocation || site.city || ''}</option>)}</NativeSelect></Field>"""
new = """<Field label=\"المسجد أو المصلى *\"><NativeSelect value={visitForm.siteId} onChange={(event) => setVisitForm({ ...visitForm, siteId: event.target.value })} disabled={Boolean(editingVisit?.tourId)}><option value=\"\">اختر الموقع</option>{sites.map((site) => { const activeVisit = activeVisitBySite.get(site.id); const blocked = !editingVisit && Boolean(activeVisit); return <option key={site.id} value={site.id} disabled={blocked}>{site.name} — {site.campusLocation || site.city || ''}{blocked ? ` — زيارة قائمة ${activeVisit!.visitNumber}` : ''}</option>; })}</NativeSelect></Field>"""
if '— زيارة قائمة ${activeVisit!.visitNumber}' not in text:
    if old not in text:
        raise SystemExit('visit site select anchor not found')
    text = text.replace(old, new, 1)

old = """<Button size=\"sm\" variant=\"outline\" onClick={() => setTourForm({ ...tourForm, siteIds: filteredTourSites.map((site) => site.id) })}>تحديد الظاهر</Button>"""
new = """<Button size=\"sm\" variant=\"outline\" onClick={() => setTourForm({ ...tourForm, siteIds: filteredTourSites.filter((site) => !activeVisitBySite.has(site.id)).map((site) => site.id) })}>تحديد المتاح</Button>"""
if 'تحديد المتاح</Button>' not in text:
    if old not in text:
        raise SystemExit('tour select visible anchor not found')
    text = text.replace(old, new, 1)

old = """<div className=\"grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2\">{filteredTourSites.map((site) => { const checked = tourForm.siteIds.includes(site.id); return <label key={site.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}><input type=\"checkbox\" className=\"mt-1 h-4 w-4 accent-emerald-700\" checked={checked} onChange={() => setTourForm((current) => ({ ...current, siteIds: checked ? current.siteIds.filter((id) => id !== site.id) : [...current.siteIds, site.id] }))} /><span><b className=\"block text-sm\">{site.name}</b><small className=\"text-slate-500\">{site.campusLocation || [site.city, site.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}</small></span></label>; })}</div>"""
new = """<div className=\"grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2\">{filteredTourSites.map((site) => { const checked = tourForm.siteIds.includes(site.id); const activeVisit = activeVisitBySite.get(site.id); const unavailable = Boolean(activeVisit); return <div key={site.id} className={`rounded-xl border p-3 ${unavailable ? 'border-amber-200 bg-amber-50/70' : checked ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}><label className={`flex items-start gap-3 ${unavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}><input type=\"checkbox\" className=\"mt-1 h-4 w-4 accent-emerald-700\" checked={checked} disabled={unavailable} onChange={() => setTourForm((current) => ({ ...current, siteIds: checked ? current.siteIds.filter((id) => id !== site.id) : [...current.siteIds, site.id] }))} /><span className=\"min-w-0 flex-1\"><b className=\"block text-sm\">{site.name}</b><small className=\"block text-slate-500\">{site.campusLocation || [site.city, site.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}</small>{activeVisit && <span className=\"mt-1 block text-[11px] font-bold text-amber-700\">زيارة قائمة: {activeVisit.visitNumber} — {visitStatusLabels[activeVisit.workflowStatus]}</span>}</span></label>{activeVisit && <Button type=\"button\" size=\"sm\" variant=\"outline\" className=\"mt-2 h-8 border-amber-300 bg-white text-xs text-amber-800\" onClick={() => setViewingVisit(activeVisit)}><Eye className=\"ml-1 h-3.5 w-3.5\" />فتح الزيارة القائمة</Button>}</div>; })}</div>"""
if 'فتح الزيارة القائمة</Button>' not in text:
    if old not in text:
        raise SystemExit('tour site grid anchor not found')
    text = text.replace(old, new, 1)

old = """> = ({ attachments, loading, onFiles, onRemove, onDescriptionChange }) => <div className=\"space-y-3\">
  <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-sky-300 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/70'}`}>
    {loading ? <Loader2 className=\"mb-2 h-6 w-6 animate-spin text-sky-700\" /> : <Upload className=\"mb-2 h-6 w-6 text-sky-700\" />}
    <b className=\"text-sm text-slate-800\">{loading ? 'جاري رفع المرفقات...' : 'رفع صور أو ملفات PDF'}</b>
    <span className=\"mt-1 text-xs text-slate-500\">يمكن اختيار عدة ملفات دفعة واحدة — وبعد الرفع اكتب وصفًا واضحًا لكل مرفق</span>
    <input type=\"file\" accept=\"image/jpeg,image/png,image/webp,image/gif,application/pdf\" multiple className=\"hidden\" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
  </label>
  <VisitAttachmentGallery label=\"المرفقات المضافة\" attachments={attachments} onRemove={onRemove} onDescriptionChange={onDescriptionChange} />
</div>;"""
new = """> = ({ attachments, loading, onFiles, onRemove, onDescriptionChange }) => <div className=\"space-y-3\">
  <div className=\"grid gap-3 sm:grid-cols-2\">
    <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-emerald-300 bg-emerald-50' : 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-500 hover:bg-emerald-50'}`}>
      {loading ? <Loader2 className=\"mb-2 h-6 w-6 animate-spin text-emerald-700\" /> : <Camera className=\"mb-2 h-7 w-7 text-emerald-700\" />}
      <b className=\"text-sm text-emerald-900\">{loading ? 'جاري رفع الصورة...' : 'تصوير مباشر من الجوال'}</b>
      <span className=\"mt-1 text-xs text-emerald-700/80\">يفتح الكاميرا الخلفية مباشرة؛ يمكنك التصوير أكثر من مرة وإضافة وصف لكل صورة</span>
      <input type=\"file\" accept=\"image/*\" capture=\"environment\" className=\"hidden\" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
    </label>
    <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-sky-300 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/70'}`}>
      {loading ? <Loader2 className=\"mb-2 h-6 w-6 animate-spin text-sky-700\" /> : <Upload className=\"mb-2 h-6 w-6 text-sky-700\" />}
      <b className=\"text-sm text-slate-800\">{loading ? 'جاري رفع المرفقات...' : 'رفع من الجهاز'}</b>
      <span className=\"mt-1 text-xs text-slate-500\">صور سابقة أو ملفات PDF — ويمكن اختيار عدة ملفات دفعة واحدة</span>
      <input type=\"file\" accept=\"image/jpeg,image/png,image/webp,image/gif,application/pdf\" multiple className=\"hidden\" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
    </label>
  </div>
  <VisitAttachmentGallery label=\"المرفقات المضافة\" attachments={attachments} onRemove={onRemove} onDescriptionChange={onDescriptionChange} />
</div>;"""
if 'تصوير مباشر من الجوال' not in text:
    if old not in text:
        raise SystemExit('VisitAttachmentField anchor not found')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Field visit camera and duplicate guard UI applied')
