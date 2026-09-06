import fs from 'node:fs';

const apiPath = 'src/app/api/mosques.ts';
const panelPath = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let api = fs.readFileSync(apiPath, 'utf8');
let panel = fs.readFileSync(panelPath, 'utf8');

const replaceIn = (text, from, to, label) => {
  const index = text.indexOf(from);
  if (index < 0) throw new Error(`Patch target not found: ${label}`);
  return text.slice(0, index) + to + text.slice(index + from.length);
};

api = replaceIn(api,
`  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  site: Pick<MosqueSite, 'id' | 'publicToken' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
`,
`  createdBy?: string | null;
  isOwner?: boolean;
  hasStarted?: boolean;
  canDelete?: boolean;
  createdAt: string;
  updatedAt: string;
  site: Pick<MosqueSite, 'id' | 'publicToken' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
`,
'field visit ownership flags');

api = replaceIn(api,
`  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  visits?: Array<Pick<MosqueFieldVisit, 'id' | 'visitNumber' | 'siteId' | 'visitDate' | 'workflowStatus' | 'overallStatus' | 'priority' | 'site'>>;
`,
`  notes?: string | null;
  createdBy?: string | null;
  isOwner?: boolean;
  hasStarted?: boolean;
  canDelete?: boolean;
  canCancel?: boolean;
  createdAt: string;
  updatedAt: string;
  visits?: Array<Pick<MosqueFieldVisit, 'id' | 'visitNumber' | 'siteId' | 'visitDate' | 'workflowStatus' | 'overallStatus' | 'priority' | 'site'>>;
`,
'tour ownership flags');

api = replaceIn(api,
`  createFieldTour: (input: Record<string, unknown>) => apiJson<MosqueFieldTour>('/api/mosques/field-tours', { method: 'POST', body: JSON.stringify(input) }),
  updateFieldTour: (id: string, input: Record<string, unknown>) => apiJson<MosqueFieldTour>(\`/api/mosques/field-tours/\${id}\`, { method: 'PATCH', body: JSON.stringify(input) }),
  fieldVisits:`,
`  createFieldTour: (input: Record<string, unknown>) => apiJson<MosqueFieldTour>('/api/mosques/field-tours', { method: 'POST', body: JSON.stringify(input) }),
  updateFieldTour: (id: string, input: Record<string, unknown>) => apiJson<MosqueFieldTour>(\`/api/mosques/field-tours/\${id}\`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFieldTour: (id: string) => apiJson<void>(\`/api/mosques/field-tours/\${id}\`, { method: 'DELETE' }),
  fieldVisits:`,
'tour delete API');

panel = replaceIn(panel,
`  const [deletingVisit, setDeletingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deleting, setDeleting] = React.useState(false);
`,
`  const [deletingVisit, setDeletingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [tourAction, setTourAction] = React.useState<{ tour: MosqueFieldTour; action: 'delete' | 'cancel' } | null>(null);
  const [tourActionSaving, setTourActionSaving] = React.useState(false);
`,
'tour action state');

panel = replaceIn(panel,
`  const updateTourStatus = async (tour: MosqueFieldTour, status: MosqueFieldTour['status']) => {
    try {
      await mosqueApi.updateFieldTour(tour.id, { status, notes: tour.notes || null });
      setTours((current) => current.map((item) => item.id === tour.id ? { ...item, status } : item));
      toast.success('تم تحديث حالة الجولة');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الجولة'); }
  };

  const openNewVisit`,
`  const updateTourStatus = async (tour: MosqueFieldTour, status: MosqueFieldTour['status']) => {
    try {
      const updated = await mosqueApi.updateFieldTour(tour.id, { status, notes: tour.notes || null });
      setTours((current) => current.map((item) => item.id === tour.id ? { ...item, ...updated } : item));
      toast.success('تم تحديث حالة الجولة');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الجولة'); }
  };

  const runTourAction = async () => {
    if (!tourAction) return;
    try {
      setTourActionSaving(true);
      if (tourAction.action === 'delete') {
        await mosqueApi.deleteFieldTour(tourAction.tour.id);
        toast.success(\`تم حذف الجولة \${tourAction.tour.tourNumber}\`);
      } else {
        await mosqueApi.updateFieldTour(tourAction.tour.id, { status: 'cancelled', notes: tourAction.tour.notes || null });
        toast.success(\`تم إلغاء الجولة \${tourAction.tour.tourNumber} مع الاحتفاظ بسجلها التاريخي\`);
      }
      setTourAction(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tourAction.action === 'delete' ? 'تعذر حذف الجولة' : 'تعذر إلغاء الجولة');
    } finally {
      setTourActionSaving(false);
    }
  };

  const openNewVisit`,
'tour destructive action handler');

panel = replaceIn(panel,
`            {canDelete && <Button size="sm" variant="destructive" className="!border-red-700 !bg-red-600 !text-white shadow-sm hover:!bg-red-700 hover:!text-white" onClick={() => setDeletingVisit(visit)}><Trash2 className="ml-1 h-4 w-4 text-white" />حذف</Button>}
`,
`            {visit.canDelete === true && <Button size="sm" variant="destructive" className="!border-red-700 !bg-red-600 !text-white shadow-sm hover:!bg-red-700 hover:!text-white" onClick={() => setDeletingVisit(visit)}><Trash2 className="ml-1 h-4 w-4 text-white" />حذف</Button>}
`,
'visit delete ownership UI');

panel = replaceIn(panel,
`{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}{canPrint && <div className="grid gap-2 sm:grid-cols-2"><Button size="sm" className="w-full border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" onClick={() => exportTourTreatmentExcel(tour)}><FileSpreadsheet className="ml-2 h-4 w-4 text-white" />Excel + الصور</Button><Button size="sm" variant="outline" className="w-full border-emerald-200 text-emerald-800" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className="ml-2 h-4 w-4" />تقرير المعالجة المصور قبل / بعد</Button></div>}</CardContent>`,
`{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).filter(([value]) => value !== 'cancelled' || tour.canCancel === true || tour.status === 'cancelled').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}{canPrint && <div className="grid gap-2 sm:grid-cols-2"><Button size="sm" className="w-full border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" onClick={() => exportTourTreatmentExcel(tour)}><FileSpreadsheet className="ml-2 h-4 w-4 text-white" />Excel + الصور</Button><Button size="sm" variant="outline" className="w-full border-emerald-200 text-emerald-800" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className="ml-2 h-4 w-4" />تقرير المعالجة المصور قبل / بعد</Button></div>}{tour.canDelete === true && <Button size="sm" variant="destructive" className="w-full !border-red-700 !bg-red-600 !text-white hover:!bg-red-700 hover:!text-white" onClick={() => setTourAction({ tour, action: 'delete' })}><Trash2 className="ml-2 h-4 w-4 text-white" />حذف الجولة</Button>}{tour.canDelete !== true && tour.canCancel === true && tour.status !== 'cancelled' && <Button size="sm" variant="destructive" className="w-full !border-red-700 !bg-red-600 !text-white hover:!bg-red-700 hover:!text-white" onClick={() => setTourAction({ tour, action: 'cancel' })}><X className="ml-2 h-4 w-4 text-white" />إلغاء الجولة</Button>}</CardContent>`,
'tour card ownership actions');

panel = replaceIn(panel,
`    <Dialog open={Boolean(deletingVisit)} onOpenChange={(open) => { if (!open && !deleting) setDeletingVisit(null); }}>
`,
`    <Dialog open={Boolean(tourAction)} onOpenChange={(open) => { if (!open && !tourActionSaving) setTourAction(null); }}>
      <DialogContent className="sm:max-w-[540px]" dir="rtl">
        {tourAction && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-red-700">{tourAction.action === 'delete' ? <Trash2 className="h-5 w-5" /> : <X className="h-5 w-5" />}{tourAction.action === 'delete' ? 'حذف الجولة الميدانية' : 'إلغاء الجولة الميدانية'}</DialogTitle>
            <DialogDescription>{tourAction.action === 'delete' ? \`سيتم حذف الجولة \${tourAction.tour.tourNumber} والزيارات المجدولة التابعة لها. الحذف متاح لمنشئ الجولة قبل بدء التنفيذ، أو لمسؤول المنصة عند الضرورة.\` : \`سيتم إلغاء الجولة \${tourAction.tour.tourNumber} مع الاحتفاظ بسجل الجولة والزيارات المرتبطة بها لأغراض التوثيق والمراجعة.\`}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{tourAction.action === 'delete' ? 'هذا الإجراء نهائي ولا يمكن التراجع عنه.' : 'الإلغاء يحفظ السجل التاريخي ولا يحذف البيانات السابقة.'}</div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setTourAction(null)} disabled={tourActionSaving}>إلغاء</Button><Button variant="destructive" className="!border-red-700 !bg-red-600 !text-white hover:!bg-red-700 hover:!text-white" onClick={() => void runTourAction()} disabled={tourActionSaving}>{tourActionSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin text-white" /> : tourAction.action === 'delete' ? <Trash2 className="ml-2 h-4 w-4 text-white" /> : <X className="ml-2 h-4 w-4 text-white" />}{tourAction.action === 'delete' ? 'تأكيد الحذف' : 'تأكيد الإلغاء'}</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(deletingVisit)} onOpenChange={(open) => { if (!open && !deleting) setDeletingVisit(null); }}>
`,
'tour confirmation dialog');

fs.writeFileSync(apiPath, api);
fs.writeFileSync(panelPath, panel);
console.log('Applied mosque tour ownership controls in frontend.');
