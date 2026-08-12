const fs = require('fs');
const path = 'src/app/pages/MosquesUnitPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const replaceBlock = (startToken, endToken, replacement) => {
  const start = s.indexOf(startToken);
  if (start < 0) throw new Error(`Missing start token: ${startToken}`);
  const end = s.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error(`Missing end token: ${endToken}`);
  s = s.slice(0, start) + replacement + '\n\n      ' + endToken + s.slice(end + endToken.length);
};

replaceBlock(
  '      <Dialog open={siteDialog}',
  '<Dialog open={requestDialog}',
  `      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>
        <DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-violet-50/30 sm:max-w-[1180px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100/90 bg-gradient-to-l from-sky-50 via-white to-violet-50/70 p-5 text-right md:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-white text-sky-700 shadow-sm"><Building2 className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 md:text-2xl">{editingSite ? 'تعديل بيانات المسجد / المصلى' : 'إضافة مسجد / مصلى جديد'}</DialogTitle>
                <DialogDescription className="mt-1 leading-6">نموذج موحد لتسجيل البيانات الأساسية والموقع والطاقة الاستيعابية وبيانات المسؤولين الرئيسيين.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(94vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/60 pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />المعلومات الأساسية</CardTitle>
                <CardDescription>تعريف المسجد أو المصلى وحالته وموقعه الإداري داخل الجامعة.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 lg:grid-cols-3">
                <Field label="اسم المسجد / المصلى *"><Input className="h-11" autoFocus value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="مثال: مسجد الحرم الجامعي" /></Field>
                <Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value })}><option value="mosque">مسجد</option><option value="prayer_room">مصلى</option></NativeSelect></Field>
                <Field label="الحالة"><NativeSelect className="h-11" value={siteForm.status} onChange={(e) => setSiteForm({ ...siteForm, status: e.target.value })}><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect></Field>
                <Field label="المدينة"><Input className="h-11" value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} /></Field>
                <Field label="الحي"><Input className="h-11" value={siteForm.district} onChange={(e) => setSiteForm({ ...siteForm, district: e.target.value })} /></Field>
                <Field label="الموقع داخل الجامعة"><Input className="h-11" value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/60 pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><Building2 className="h-5 w-5" />السعة وبيانات التواصل</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="المساحة م²"><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={siteForm.area} onChange={(e) => setSiteForm({ ...siteForm, area: e.target.value })} /></Field>
                <Field label="الطاقة الاستيعابية"><Input className="h-11" type="number" min="0" inputMode="numeric" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} /></Field>
                <Field label="رقم التواصل"><Input className="h-11" type="tel" inputMode="tel" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder="05xxxxxxxx" /></Field>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-blue-50/60 pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle>
                <CardDescription>يمكن إدخال الإحداثيات يدويًا أو التقاط الموقع الحالي من الجهاز.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <Field label="خط العرض"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.latitude} onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })} placeholder="26.3927" /></Field>
                <Field label="خط الطول"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.longitude} onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })} placeholder="50.0438" /></Field>
                <Button type="button" variant="outline" className={`h-11 w-full md:w-auto ${button3d}`} onClick={() => navigator.geolocation?.getCurrentPosition((p) => setSiteForm({ ...siteForm, latitude: p.coords.latitude, longitude: p.coords.longitude }), () => toast.error('تعذر تحديد الموقع'))}><MapPin className="ml-2 h-4 w-4" />التقاط موقعي الحالي</Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />المسؤولون الرئيسيون</CardTitle>
                <CardDescription>هذه بيانات تعريفية مختصرة للموقع. بيانات الاتصال والصفة التشغيلية التفصيلية تُدار من تبويب «المنسوبون».</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="الإمام"><Input className="h-11" value={siteForm.imamName} onChange={(e) => setSiteForm({ ...siteForm, imamName: e.target.value })} /></Field>
                <Field label="المؤذن"><Input className="h-11" value={siteForm.muezzinName} onChange={(e) => setSiteForm({ ...siteForm, muezzinName: e.target.value })} /></Field>
                <Field label="الخطيب"><Input className="h-11" value={siteForm.khateebName} onChange={(e) => setSiteForm({ ...siteForm, khateebName: e.target.value })} /></Field>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/50 pb-4"><CardTitle className="text-base md:text-lg">ملاحظات إضافية</CardTitle></CardHeader>
              <CardContent className="pt-5"><Field label="الملاحظات"><Textarea rows={4} value={siteForm.notes} onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })} placeholder="أي معلومات تنظيمية أو تشغيلية إضافية..." /></Field></CardContent>
            </Card>
          </div>

          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6">
            <Button variant="outline" className={button3d} onClick={() => setSiteDialog(false)}>إلغاء</Button>
            <Button className={`${button3d} min-w-32`} onClick={saveSite} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : editingSite ? 'حفظ التعديلات' : 'إضافة الموقع'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`
);

replaceBlock(
  '      <Dialog open={requestDialog}',
  '<Dialog open={leaveDialog}',
  `      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Wrench className="h-5 w-5 text-sky-700" />إنشاء طلب صيانة أو احتياج</DialogTitle>
            <DialogDescription>سجل الطلب بشكل واضح مع تحديد الموقع والأولوية وإرفاق ما يدعم الطلب عند الحاجة.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/50 pb-4"><CardTitle className="text-base md:text-lg">بيانات الطلب</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2">
                <div className="md:col-span-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={requestForm.siteId} onChange={(e) => setRequestForm({ ...requestForm, siteId: e.target.value })} disabled={role === 'personnel'}>{sites.filter((s) => role !== 'personnel' || !linkedSiteId || s.id === linkedSiteId).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field></div>
                <Field label="نوع الطلب"><NativeSelect className="h-11" value={requestForm.requestType} onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value })}>{Object.entries(requestTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
                <Field label="الأولوية"><NativeSelect className="h-11" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>{Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-amber-50/40 pb-4"><CardTitle className="text-base md:text-lg">وصف الاحتياج</CardTitle><CardDescription>اكتب وصفًا محددًا يساعد على المراجعة والإسناد والتنفيذ.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5"><Field label="وصف المشكلة / الاحتياج *"><Textarea rows={6} value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} placeholder="اشرح المشكلة أو الاحتياج ومكانه داخل المسجد أو المصلى..." /></Field><Field label="ملاحظات إضافية"><Textarea rows={3} value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} /></Field></CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />المرفقات</CardTitle></CardHeader>
              <CardContent className="pt-5"><Field label="صورة أو ملف PDF"><Input className="h-11 file:ml-3" type="file" accept="image/*,application/pdf" onChange={(e) => setRequestForm({ ...requestForm, file: e.target.files?.[0] || null })} /></Field><p className="mt-2 text-xs text-muted-foreground">يفضل إرفاق صورة واضحة للمشكلة عند توفرها لتسريع المعالجة.</p></CardContent>
            </Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setRequestDialog(false)}>إلغاء</Button><Button className={`${button3d} min-w-32`} onClick={saveRequest} disabled={saving}>{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>`
);

replaceBlock(
  '      <Dialog open={leaveDialog}',
  '<Dialog open={statusDialog}',
  `      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/60 p-5 text-right md:p-6"><DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><CalendarDays className="h-5 w-5 text-sky-700" />طلب إجازة / اعتذار</DialogTitle><DialogDescription>حدد الفترة والبديل بوضوح ليتمكن النظام من فحص التعارضات ومراجعة الطلب.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">بيانات الطلب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={leaveForm.siteId} onChange={(e) => setLeaveForm({ ...leaveForm, siteId: e.target.value })} disabled={role === 'personnel'}>{sites.filter((s) => role !== 'personnel' || !linkedSiteId || s.id === linkedSiteId).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect className="h-11" value={leaveForm.requestType} onChange={(e) => setLeaveForm({ ...leaveForm, requestType: e.target.value })}>{Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="text-base md:text-lg">الفترة والبديل</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="من *"><Input className="h-11" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field><Field label="إلى *"><Input className="h-11" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></Field><div className="md:col-span-2"><Field label="اسم النائب / البديل *"><Input className="h-11" value={leaveForm.replacementName} onChange={(e) => setLeaveForm({ ...leaveForm, replacementName: e.target.value })} placeholder="الاسم الكامل للبديل" /></Field></div></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-amber-50/40 pb-4"><CardTitle className="text-base md:text-lg">سبب الطلب والملاحظات</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><Field label="السبب *"><Textarea rows={5} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></Field><Field label="ملاحظات"><Textarea rows={3} value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setLeaveDialog(false)}>إلغاء</Button><Button className={`${button3d} min-w-32`} onClick={saveLeave} disabled={saving}>{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>`
);

replaceBlock(
  '      <Dialog open={statusDialog}',
  '<Dialog open={Boolean(qrSite)}',
  `      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[760px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="text-xl font-black">تحديث حالة الإجراء</DialogTitle><DialogDescription>{statusTarget?.item?.requestNumber || statusTarget?.item?.ticketNumber || statusTarget?.item?.leaveNumber || statusTarget?.item?.applicationNumber}</DialogDescription></DialogHeader>
          <div className="space-y-5 overflow-y-auto p-5 md:p-6"><Card className="border-sky-200/70 bg-white/90"><CardContent className="space-y-4 pt-5"><Field label="الحالة الجديدة"><NativeSelect className="h-11" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>{statusTarget ? transitionsFor(statusTarget.kind, statusTarget.item.status).filter((s) => !(s === 'approved' && role !== 'head')).map((s) => <option key={s} value={s}>{statusLabels[s] || s}</option>) : null}</NativeSelect></Field><Field label={['rejected', 'returned_for_edit'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'}><Textarea rows={5} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="دوّن المبرر أو الملاحظة المرتبطة بالإجراء..." /></Field>{statusTarget?.kind === 'request' && statusValue === 'completed' && <Field label="إثبات الإنجاز *"><Input className="h-11" type="file" accept="image/*,application/pdf" onChange={(e) => setStatusEvidence(e.target.files?.[0] || null)} /></Field>}</CardContent></Card></div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setStatusDialog(false)}>إلغاء</Button><Button className={button3d} onClick={applyStatus} disabled={saving}>{saving ? 'جاري التحديث...' : 'تحديث الحالة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>`
);

replaceBlock(
  '      <Dialog open={Boolean(qrSite)}',
  '<Dialog open={personnelDialog}',
  `      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>
        <DialogContent className="p-0 gap-0 border-sky-200/80 sm:max-w-[620px]" dir="rtl"><DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/50 p-5 text-right"><DialogTitle>رمز QR — {qrSite?.name}</DialogTitle><DialogDescription>يفتح نموذج البلاغ العام مرتبطًا بهذا الموقع دون كشف معرف قاعدة البيانات.</DialogDescription></DialogHeader>{qrSite && <div className="flex flex-col items-center gap-4 p-6"><div className="rounded-[28px] border bg-white p-5 shadow-[0_8px_0_rgba(15,57,95,.06),0_18px_35px_rgba(15,23,42,.08)]"><QRCodeSVG value={publicUrlForSite(qrSite)} size={220} level="M" includeMargin /></div><p className="max-w-full break-all text-center text-xs text-muted-foreground" dir="ltr">{publicUrlForSite(qrSite)}</p><Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة الرمز</Button></div>}</DialogContent>
      </Dialog>`
);

replaceBlock(
  '      <Dialog open={personnelDialog}',
  '    </div>\n  );',
  `      <Dialog open={personnelDialog} onOpenChange={setPersonnelDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6"><DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><UserPlus className="h-5 w-5 text-sky-700" />إضافة منسوب مسجد / مصلى</DialogTitle><DialogDescription>سجل المنسوب التشغيلي وربطه بالموقع مع بيانات التواصل والصفة داخل المسجد أو المصلى.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">الارتباط والصفة</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={personnelForm.siteId} onChange={(e) => setPersonnelForm({ ...personnelForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="الصفة *"><NativeSelect className="h-11" value={personnelForm.role} onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}><option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborator">متعاون</option></NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />بيانات المنسوب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><div className="md:col-span-2"><Field label="الاسم الكامل *"><Input className="h-11" autoFocus value={personnelForm.name} onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })} placeholder="الاسم الرباعي" /></Field></div><Field label="رقم الجوال"><Input className="h-11" type="tel" inputMode="tel" value={personnelForm.mobile} onChange={(e) => setPersonnelForm({ ...personnelForm, mobile: e.target.value })} placeholder="05xxxxxxxx" /></Field><Field label="البريد الإلكتروني"><Input className="h-11" type="email" inputMode="email" value={personnelForm.email} onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })} placeholder="name@iau.edu.sa" /></Field></CardContent></Card>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700">هذا السجل هو المرجع التشغيلي للمنسوب وبيانات التواصل. أما أسماء الإمام والمؤذن والخطيب داخل سجل المسجد فهي بيانات تعريفية مختصرة للموقع.</div>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setPersonnelDialog(false)}>إلغاء</Button><Button className={`${button3d} min-w-32`} onClick={savePersonnel} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ المنسوب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>`
);

if (!s.includes('sm:max-w-[1180px]')) throw new Error('Site form redesign did not apply');
if (!s.includes('sm:max-w-[900px]')) throw new Error('Personnel form redesign did not apply');
if (!s.includes('هذا السجل هو المرجع التشغيلي للمنسوب')) throw new Error('Personnel guidance missing');
if (!s.includes('معاينة') && !s.includes('إنشاء طلب صيانة أو احتياج')) throw new Error('Unexpected mosque page structure');

fs.writeFileSync(path, s, 'utf8');
console.log('Mosques unit forms redesigned successfully.');
