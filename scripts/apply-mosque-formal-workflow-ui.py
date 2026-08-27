from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# API client
# -----------------------------------------------------------------------------
api_path = Path('src/app/api/mosques.ts')
api = api_path.read_text(encoding='utf-8')
if 'MosqueWorkflowHistoryEntry' not in api:
    api = replace_once(
        api,
        "export type MosqueNotification = {\n  id: string;\n  title: string;\n  message: string;\n  entityType?: string | null;\n  entityId?: string | null;\n  isRead: boolean;\n  createdAt: string;\n};\n",
        "export type MosqueNotification = {\n  id: string;\n  title: string;\n  message: string;\n  entityType?: string | null;\n  entityId?: string | null;\n  isRead: boolean;\n  createdAt: string;\n};\n\nexport type MosqueWorkflowKind = 'request' | 'ticket' | 'leave' | 'job';\nexport type MosqueWorkflowHistoryEntry = {\n  id: string;\n  action: string;\n  description?: string | null;\n  details?: { kind?: string; fromStatus?: string | null; toStatus?: string | null; note?: string | null } | null;\n  username?: string | null;\n  userEmail?: string | null;\n  userRole?: string | null;\n  createdAt: string;\n};\n",
        'workflow history types',
    )

if 'workflowHistory:' not in api:
    api = replace_once(
        api,
        "  updateJobStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueJobApplication>(`/api/mosques/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),\n",
        "  updateJobStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueJobApplication>(`/api/mosques/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),\n\n  workflowHistory: (kind: MosqueWorkflowKind, id: string) => apiJson<MosqueWorkflowHistoryEntry[]>(`/api/mosques/workflow/${kind}/${id}/history`),\n  updateWorkflow: <T = any>(kind: MosqueWorkflowKind, id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),\n  workflowAction: <T = any>(kind: MosqueWorkflowKind, id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}/action`, { method: 'PATCH', body: JSON.stringify(input) }),\n  resubmitWorkflow: <T = any>(kind: 'request' | 'leave', id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}/resubmit`, { method: 'PATCH', body: JSON.stringify(input) }),\n",
        'workflow api methods',
    )
api_path.write_text(api, encoding='utf-8')

# -----------------------------------------------------------------------------
# Main page
# -----------------------------------------------------------------------------
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
text = page_path.read_text(encoding='utf-8')

# import workflow types
if 'type MosqueWorkflowHistoryEntry' not in text:
    text = replace_once(
        text,
        "  type MosqueTicket,\n} from '../api/mosques';",
        "  type MosqueTicket,\n  type MosqueWorkflowHistoryEntry,\n  type MosqueWorkflowKind,\n} from '../api/mosques';",
        'workflow type imports',
    )

# state additions
if 'workflowEditTarget' not in text:
    text = replace_once(
        text,
        "  const [statusEvidence, setStatusEvidence] = useState<File | null>(null);\n  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);",
        "  const [statusEvidence, setStatusEvidence] = useState<File | null>(null);\n  const [workflowEditTarget, setWorkflowEditTarget] = useState<{ kind: MosqueWorkflowKind; item: any } | null>(null);\n  const [workflowEditForm, setWorkflowEditForm] = useState<any>({});\n  const [workflowEditSaving, setWorkflowEditSaving] = useState(false);\n  const [editingReturnedRequest, setEditingReturnedRequest] = useState<MosqueRequest | null>(null);\n  const [editingReturnedLeave, setEditingReturnedLeave] = useState<MosqueLeave | null>(null);\n  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);",
        'workflow states',
    )

# transitions helper gains formal quick-action paths and archive
old_transitions = """  const transitionsFor = (kind: string, status: string) => {
    if (kind === 'request') return requestTransitions[status] || [];
    if (kind === 'ticket') return ticketTransitions[status] || [];
    if (kind === 'leave') return leaveTransitions[status] || [];
    return jobTransitions[status] || [];
  };
"""
new_transitions = """  const transitionsFor = (kind: string, status: string) => {
    let allowed = kind === 'request' ? [...(requestTransitions[status] || [])]
      : kind === 'ticket' ? [...(ticketTransitions[status] || [])]
        : kind === 'leave' ? [...(leaveTransitions[status] || [])]
          : [...(jobTransitions[status] || [])];
    if (kind === 'ticket' && ['new', 'under_review', 'assigned'].includes(status)) allowed.push('returned_for_edit');
    if (kind === 'ticket' && status === 'returned_for_edit') allowed.push('new');
    if (kind === 'job' && ['new', 'under_review', 'shortlisted', 'interview'].includes(status)) allowed.push('returned_for_edit');
    if (kind === 'job' && status === 'returned_for_edit') allowed.push('new');
    if (role === 'head' && status !== 'archived') allowed.push('archived');
    return [...new Set(allowed)];
  };
"""
if old_transitions in text:
    text = text.replace(old_transitions, new_transitions, 1)

# preferred status for quick action buttons
old_open_status = """  const openStatusDialog = (kind: 'request' | 'ticket' | 'leave' | 'job', item: any) => {
    const next = transitionsFor(kind, item.status);
    if (!next.length) return toast.info('لا توجد حالة تالية متاحة لهذا السجل');
    setStatusTarget({ kind, item });
    setStatusValue(next[0]);
    setStatusNote('');
"""
new_open_status = """  const openStatusDialog = (kind: 'request' | 'ticket' | 'leave' | 'job', item: any, preferredStatus?: string) => {
    const next = transitionsFor(kind, item.status).filter((s) => !(s === 'approved' && role !== 'head'));
    if (!next.length) return toast.info('لا توجد حالة تالية متاحة لهذا السجل');
    setStatusTarget({ kind, item });
    setStatusValue(preferredStatus && next.includes(preferredStatus) ? preferredStatus : next[0]);
    setStatusNote('');
"""
if old_open_status in text:
    text = text.replace(old_open_status, new_open_status, 1)

# formal action endpoint, including archive reason requirement
text = text.replace(
    "if (['rejected', 'returned_for_edit'].includes(statusValue) && !statusNote.trim()) return toast.error('اكتب سبب الرفض أو ملاحظة الإعادة');",
    "if (['rejected', 'returned_for_edit', 'archived'].includes(statusValue) && !statusNote.trim()) return toast.error(statusValue === 'archived' ? 'اكتب سبب الحذف / الأرشفة' : 'اكتب سبب الرفض أو ملاحظة الإعادة');",
)
old_api_status_calls = """      const payload = { status: statusValue, note: statusNote, rejectionReason: statusNote, returnReason: statusNote, completionEvidenceUrl: evidenceUrl };
      if (statusTarget.kind === 'request') await mosqueApi.updateRequestStatus(statusTarget.item.id, payload);
      if (statusTarget.kind === 'ticket') await mosqueApi.updateTicketStatus(statusTarget.item.id, { ...payload, resolutionNote: statusNote });
      if (statusTarget.kind === 'leave') await mosqueApi.updateLeaveStatus(statusTarget.item.id, payload);
      if (statusTarget.kind === 'job') await mosqueApi.updateJobStatus(statusTarget.item.id, payload);
"""
new_api_status_calls = """      const payload = { status: statusValue, note: statusNote, rejectionReason: statusNote, returnReason: statusNote, completionEvidenceUrl: evidenceUrl };
      await mosqueApi.workflowAction(statusTarget.kind, statusTarget.item.id, payload);
"""
if old_api_status_calls in text:
    text = text.replace(old_api_status_calls, new_api_status_calls, 1)

# returned request/leave editing and resubmission
old_open_request = """  const openRequestDialog = () => {
    setRequestForm({ ...emptyRequest, siteId: linkedSiteId || sites[0]?.id || '' });
    setRequestDialog(true);
  };
"""
new_open_request = """  const openRequestDialog = () => {
    setEditingReturnedRequest(null);
    setRequestForm({ ...emptyRequest, siteId: linkedSiteId || sites[0]?.id || '' });
    setRequestDialog(true);
  };

  const openReturnedRequestEdit = (item: MosqueRequest) => {
    setEditingReturnedRequest(item);
    setRequestForm({
      ...emptyRequest,
      siteId: item.siteId,
      requestType: item.requestType,
      priority: item.priority,
      description: item.description,
      notes: item.notes || '',
      file: null,
    });
    setRequestDialog(true);
  };
"""
if old_open_request in text:
    text = text.replace(old_open_request, new_open_request, 1)

old_create_request = """      await mosqueApi.createRequest({ ...requestForm, file: undefined, attachments });
      toast.success('تم إنشاء الطلب وإرساله للمراجعة');
      setRequestDialog(false);
"""
new_create_request = """      if (editingReturnedRequest) {
        await mosqueApi.resubmitWorkflow('request', editingReturnedRequest.id, { ...requestForm, file: undefined, attachments, resubmitNote: 'تم التعديل وإعادة الإرسال' });
        toast.success('تم تعديل الطلب وإعادة إرساله للمراجعة');
        setEditingReturnedRequest(null);
      } else {
        await mosqueApi.createRequest({ ...requestForm, file: undefined, attachments });
        toast.success('تم إنشاء الطلب وإرساله للمراجعة');
      }
      setRequestDialog(false);
"""
if old_create_request in text:
    text = text.replace(old_create_request, new_create_request, 1)

old_open_leave = """  const openLeaveDialog = () => {
    setLeaveForm({ ...emptyLeave, siteId: linkedSiteId || sites[0]?.id || '' });
    setLeaveDialog(true);
  };
"""
new_open_leave = """  const openLeaveDialog = () => {
    setEditingReturnedLeave(null);
    setLeaveForm({ ...emptyLeave, siteId: linkedSiteId || sites[0]?.id || '' });
    setLeaveDialog(true);
  };

  const openReturnedLeaveEdit = (item: MosqueLeave) => {
    setEditingReturnedLeave(item);
    setLeaveForm({
      ...emptyLeave,
      siteId: item.siteId,
      requestType: item.requestType,
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      reason: item.reason,
      replacementName: item.replacementName,
      notes: (item as any).notes || '',
    });
    setLeaveDialog(true);
  };
"""
if old_open_leave in text:
    text = text.replace(old_open_leave, new_open_leave, 1)

old_create_leave = """      await mosqueApi.createLeave(leaveForm);
      toast.success('تم إرسال طلب الإجازة/الاعتذار');
      setLeaveDialog(false);
"""
new_create_leave = """      if (editingReturnedLeave) {
        await mosqueApi.resubmitWorkflow('leave', editingReturnedLeave.id, { ...leaveForm, resubmitNote: 'تم التعديل وإعادة الإرسال' });
        toast.success('تم تعديل الطلب وإعادة إرساله للمراجعة');
        setEditingReturnedLeave(null);
      } else {
        await mosqueApi.createLeave(leaveForm);
        toast.success('تم إرسال طلب الإجازة/الاعتذار');
      }
      setLeaveDialog(false);
"""
if old_create_leave in text:
    text = text.replace(old_create_leave, new_create_leave, 1)

# administrative edit helpers and quick formal action buttons
if 'const openWorkflowEdit =' not in text:
    anchor = """  const convertTicket = async (ticket: MosqueTicket) => {
    if (!confirm(`تحويل البلاغ ${ticket.ticketNumber} إلى طلب صيانة مرتبط؟`)) return;
    try { await mosqueApi.convertTicketToRequest(ticket.id, { requestType: 'maintenance', priority: 'medium' }); toast.success('تم إنشاء طلب صيانة مرتبط بالبلاغ'); await loadAll(); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر التحويل'); }
  };
"""
    addition = anchor + r'''

  const openWorkflowEdit = (kind: MosqueWorkflowKind, item: any) => {
    setWorkflowEditTarget({ kind, item });
    if (kind === 'request') setWorkflowEditForm({ siteId: item.siteId, requestType: item.requestType, priority: item.priority, description: item.description, notes: item.notes || '', assignedTo: item.assignedTo || '', adminNote: '' });
    else if (kind === 'ticket') setWorkflowEditForm({ siteId: item.siteId, ticketType: item.ticketType, description: item.description, reporterName: item.reporterName || '', reporterPhone: item.reporterPhone || '', reporterEmail: item.reporterEmail || '', notes: item.notes || '', assignedTo: item.assignedTo || '', adminNote: '' });
    else if (kind === 'leave') setWorkflowEditForm({ siteId: item.siteId, requestType: item.requestType, startDate: String(item.startDate || '').slice(0, 10), endDate: String(item.endDate || '').slice(0, 10), reason: item.reason, replacementName: item.replacementName, notes: item.notes || '', adminNote: '' });
    else setWorkflowEditForm({ fullName: item.fullName, phone: item.phone, email: item.email, qualification: item.qualification, experience: item.experience || '', jobType: item.jobType, preferredLocation: item.preferredLocation || '', internalNotes: item.internalNotes || '', adminNote: '' });
  };

  const saveWorkflowEdit = async () => {
    if (!workflowEditTarget) return;
    setWorkflowEditSaving(true);
    try {
      await mosqueApi.updateWorkflow(workflowEditTarget.kind, workflowEditTarget.item.id, workflowEditForm);
      toast.success('تم حفظ التعديل الإداري وتسجيله في سجل الإجراءات');
      setWorkflowEditTarget(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ التعديل الإداري'); } finally { setWorkflowEditSaving(false); }
  };

  const workflowAdminActions = (kind: MosqueWorkflowKind, item: any) => {
    if (!['head', 'supervisor'].includes(role) || item.status === 'archived') return null;
    const allowed = transitionsFor(kind, item.status);
    return <>
      <Button variant="outline" size="sm" className={button3d} onClick={() => openWorkflowEdit(kind, item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل إداري</Button>
      {allowed.includes('returned_for_edit') && <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openStatusDialog(kind, item, 'returned_for_edit')}><RefreshCw className="ml-1 h-3.5 w-3.5" />إرجاع للتعديل</Button>}
      {role === 'head' && allowed.includes('approved') && <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700" onClick={() => openStatusDialog(kind, item, 'approved')}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />اعتماد</Button>}
      {allowed.includes('rejected') && <Button variant="outline" size="sm" className="border-red-300 text-red-700" onClick={() => openStatusDialog(kind, item, 'rejected')}><X className="ml-1 h-3.5 w-3.5" />رفض</Button>}
      {role === 'head' && <Button variant="outline" size="sm" className="border-red-300 bg-red-50/50 text-red-700" onClick={() => openStatusDialog(kind, item, 'archived')}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف / أرشفة</Button>}
    </>;
  };
'''
    if anchor not in text:
        raise SystemExit('convertTicket anchor not found')
    text = text.replace(anchor, addition, 1)

# WorkflowCard button label becomes formal action
text = text.replace('>تحديث الحالة</Button>}{extraAction}', '>إجراء رسمي</Button>}{extraAction}')

# card renderers: active records only + action buttons
request_old = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredRequests.map((item) => <WorkflowCard key={item.id} title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} submitterName={item.applicant?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || 'مقدم الطلب'} onView={() => setViewingWorkflow({ kind: 'request', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} />)}</div>"""
request_new = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredRequests.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} submitterName={item.applicant?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || 'مقدم الطلب'} onView={() => setViewingWorkflow({ kind: 'request', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant=\"outline\" size=\"sm\" className=\"border-amber-300 text-amber-700\" onClick={() => openReturnedRequestEdit(item)}><Pencil className=\"ml-1 h-3.5 w-3.5\" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('request', item)} />)}</div>"""
if request_old in text:
    text = text.replace(request_old, request_new, 1)

ticket_old = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredTickets.map((item) => <WorkflowCard key={item.id} title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'بدون وسيلة تواصل']} submitterName={item.reporterName || 'غير محدد'} submitterRole=\"مقدّم البلاغ\" onView={() => setViewingWorkflow({ kind: 'ticket', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant=\"outline\" size=\"sm\" className={button3d} onClick={() => convertTicket(item)}><Wrench className=\"ml-1 h-3.5 w-3.5\" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant=\"outline\">مرتبط بطلب صيانة</Badge> : null} />)}</div>"""
ticket_new = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredTickets.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'بدون وسيلة تواصل']} submitterName={item.reporterName || 'غير محدد'} submitterRole=\"مقدّم البلاغ\" onView={() => setViewingWorkflow({ kind: 'ticket', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={<>{workflowAdminActions('ticket', item)}{['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant=\"outline\" size=\"sm\" className={button3d} onClick={() => convertTicket(item)}><Wrench className=\"ml-1 h-3.5 w-3.5\" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant=\"outline\">مرتبط بطلب صيانة</Badge> : null}</>} />)}</div>"""
if ticket_old in text:
    text = text.replace(ticket_old, ticket_new, 1)

leave_old = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredLeaves.map((item) => <WorkflowCard key={item.id} title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} submitterName={item.applicant?.name || item.personnel?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || (item.personnel?.role ? personnelRoleLabels[item.personnel.role] || item.personnel.role : 'مقدم الطلب')} onView={() => setViewingWorkflow({ kind: 'leave', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} />)}</div>"""
leave_new = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{filteredLeaves.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} submitterName={item.applicant?.name || item.personnel?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || (item.personnel?.role ? personnelRoleLabels[item.personnel.role] || item.personnel.role : 'مقدم الطلب')} onView={() => setViewingWorkflow({ kind: 'leave', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant=\"outline\" size=\"sm\" className=\"border-amber-300 text-amber-700\" onClick={() => openReturnedLeaveEdit(item)}><Pencil className=\"ml-1 h-3.5 w-3.5\" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('leave', item)} />)}</div>"""
if leave_old in text:
    text = text.replace(leave_old, leave_new, 1)

job_old = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{jobs.map((item) => <WorkflowCard key={item.id} title={item.applicationNumber} subtitle={`${item.fullName} — ${item.jobType}`} description={`${item.qualification}${item.preferredLocation ? ` — ${item.preferredLocation}` : ''}`} status={item.status} meta={[item.email, item.phone]} onStatus={canEdit && role === 'head' ? () => openStatusDialog('job', item) : undefined} extraAction={item.cvUrl ? <Button variant=\"outline\" size=\"sm\" className={button3d} onClick={() => window.open(item.cvUrl!, '_blank')}><Eye className=\"ml-1 h-3.5 w-3.5\" />السيرة الذاتية</Button> : null} />)}</div>"""
job_new = """<div className=\"grid gap-4 md:grid-cols-2 2xl:grid-cols-3\">{jobs.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.applicationNumber} subtitle={`${item.fullName} — ${item.jobType}`} description={`${item.qualification}${item.preferredLocation ? ` — ${item.preferredLocation}` : ''}`} status={item.status} meta={[item.email, item.phone]} onStatus={canEdit && role === 'head' ? () => openStatusDialog('job', item) : undefined} extraAction={<>{workflowAdminActions('job', item)}{item.cvUrl ? <Button variant=\"outline\" size=\"sm\" className={button3d} onClick={() => window.open(item.cvUrl!, '_blank')}><Eye className=\"ml-1 h-3.5 w-3.5\" />السيرة الذاتية</Button> : null}</>} />)}</div>"""
if job_old in text:
    text = text.replace(job_old, job_new, 1)

# dynamic titles / save labels on returned edits
text = text.replace(
    '<DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Wrench className="h-5 w-5 text-sky-700" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</DialogTitle>',
    '<DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Wrench className="h-5 w-5 text-sky-700" />{editingReturnedRequest ? \'تعديل الطلب وإعادة الإرسال\' : \'الإبلاغ عن مشكلة / طلب صيانة أو احتياج\'}</DialogTitle>',
)
text = text.replace(
    "{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>\n        </DialogContent>\n      </Dialog>\n\n      <Dialog open={leaveDialog}",
    "{saving ? 'جاري الإرسال...' : editingReturnedRequest ? 'حفظ وإعادة الإرسال' : 'إرسال الطلب'}</Button></DialogFooter>\n        </DialogContent>\n      </Dialog>\n\n      <Dialog open={leaveDialog}",
)
# Leave header/title pattern
text = text.replace(
    '<DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><CalendarDays className="h-5 w-5 text-sky-700" />طلب إجازة / اعتذار</DialogTitle>',
    '<DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><CalendarDays className="h-5 w-5 text-sky-700" />{editingReturnedLeave ? \'تعديل الإجازة / الاعتذار وإعادة الإرسال\' : \'طلب إجازة / اعتذار\'}</DialogTitle>',
)
text = text.replace(
    "{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>\n        </DialogContent>\n      </Dialog>\n\n      <WorkflowDetailsDialog",
    "{saving ? 'جاري الإرسال...' : editingReturnedLeave ? 'حفظ وإعادة الإرسال' : 'إرسال الطلب'}</Button></DialogFooter>\n        </DialogContent>\n      </Dialog>\n\n      <WorkflowDetailsDialog",
)

# administrative edit dialog inserted before details dialog
if '<Dialog open={Boolean(workflowEditTarget)}' not in text:
    dialog = r'''
      <Dialog open={Boolean(workflowEditTarget)} onOpenChange={(open) => !open && !workflowEditSaving && setWorkflowEditTarget(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Pencil className="h-5 w-5 text-sky-700" />تعديل إداري للمعاملة</DialogTitle><DialogDescription>يتم حفظ التعديل في سجل الإجراءات دون حذف تاريخ المعاملة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-4 overflow-y-auto p-5 md:p-6">
            {workflowEditTarget?.kind === 'request' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect value={workflowEditForm.requestType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, requestType: e.target.value })}>{Object.entries(requestTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="الأولوية"><NativeSelect value={workflowEditForm.priority || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, priority: e.target.value })}>{Object.entries(priorityLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><div className="md:col-span-2"><Field label="الوصف"><Textarea rows={5} value={workflowEditForm.description || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, description: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'ticket' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع البلاغ"><NativeSelect value={workflowEditForm.ticketType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, ticketType: e.target.value })}>{Object.entries(ticketTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="اسم المبلغ"><Input value={workflowEditForm.reporterName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reporterName: e.target.value })} /></Field><Field label="الجوال"><Input value={workflowEditForm.reporterPhone || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reporterPhone: e.target.value })} /></Field><div className="md:col-span-2"><Field label="الوصف"><Textarea rows={5} value={workflowEditForm.description || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, description: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'leave' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect value={workflowEditForm.requestType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, requestType: e.target.value })}>{Object.entries(leaveTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="من"><Input type="date" value={workflowEditForm.startDate || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, startDate: e.target.value })} /></Field><Field label="إلى"><Input type="date" value={workflowEditForm.endDate || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, endDate: e.target.value })} /></Field><Field label="البديل"><Input value={workflowEditForm.replacementName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, replacementName: e.target.value })} /></Field><div className="md:col-span-2"><Field label="السبب"><Textarea rows={4} value={workflowEditForm.reason || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reason: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'job' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الاسم"><Input value={workflowEditForm.fullName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, fullName: e.target.value })} /></Field><Field label="الجوال"><Input value={workflowEditForm.phone || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, phone: e.target.value })} /></Field><Field label="البريد"><Input value={workflowEditForm.email || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, email: e.target.value })} /></Field><Field label="نوع الوظيفة"><Input value={workflowEditForm.jobType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, jobType: e.target.value })} /></Field><Field label="المؤهل"><Input value={workflowEditForm.qualification || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, qualification: e.target.value })} /></Field><Field label="الموقع المفضل"><Input value={workflowEditForm.preferredLocation || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, preferredLocation: e.target.value })} /></Field><div className="md:col-span-2"><Field label="ملاحظات داخلية"><Textarea rows={4} value={workflowEditForm.internalNotes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, internalNotes: e.target.value })} /></Field></div></CardContent></Card>}
            <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-5"><Field label="ملاحظة التعديل الإداري"><Textarea rows={3} value={workflowEditForm.adminNote || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, adminNote: e.target.value })} placeholder="مثال: تصحيح بيانات التصنيف بناءً على المستند المرفق" /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white p-4 md:px-6"><Button variant="outline" className={button3d} disabled={workflowEditSaving} onClick={() => setWorkflowEditTarget(null)}>إلغاء</Button><Button className={'min-w-36 ' + button3d} disabled={workflowEditSaving} onClick={saveWorkflowEdit}><Save className="ml-2 h-4 w-4" />{workflowEditSaving ? 'جاري الحفظ...' : 'حفظ التعديل الإداري'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

'''
    text = text.replace('      <WorkflowDetailsDialog target={viewingWorkflow}', dialog + '      <WorkflowDetailsDialog target={viewingWorkflow}', 1)

# status dialog language and reason label
text = text.replace('تحديث حالة الإجراء</DialogTitle>', 'إجراء رسمي على المعاملة</DialogTitle>')
text = text.replace("['rejected', 'returned_for_edit'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'", "['rejected', 'returned_for_edit', 'archived'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'")
text = text.replace("{saving ? 'جاري التحديث...' : 'تحديث الحالة'}</Button>", "{saving ? 'جاري التنفيذ...' : statusValue === 'archived' ? 'تأكيد الحذف / الأرشفة' : 'تنفيذ الإجراء'}</Button>")

# workflow history in details dialog
if 'سجل الإجراءات الرسمي' not in text:
    start_old = """const WorkflowDetailsDialog = ({ target, onOpenChange }: { target: { kind: 'request' | 'ticket' | 'leave'; item: any } | null; onOpenChange: (open: boolean) => void }) => {
  if (!target) return null;
"""
    start_new = """const WorkflowDetailsDialog = ({ target, onOpenChange }: { target: { kind: 'request' | 'ticket' | 'leave'; item: any } | null; onOpenChange: (open: boolean) => void }) => {
  const [history, setHistory] = useState<MosqueWorkflowHistoryEntry[]>([]);
  useEffect(() => {
    if (!target) { setHistory([]); return; }
    let cancelled = false;
    void mosqueApi.workflowHistory(target.kind, target.item.id).then((rows) => { if (!cancelled) setHistory(rows); }).catch(() => { if (!cancelled) setHistory([]); });
    return () => { cancelled = true; };
  }, [target?.kind, target?.item?.id]);
  if (!target) return null;
"""
    if start_old in text:
        text = text.replace(start_old, start_new, 1)
    attach_marker = """          {(attachmentUrls.length > 0 || item.completionEvidenceUrl) && <Card className=\"border-slate-200\"><CardHeader className=\"pb-3\"><CardTitle className=\"text-base\">المرفقات</CardTitle></CardHeader>"""
    history_card = """          <Card className=\"border-indigo-200 bg-indigo-50/30\"><CardHeader className=\"pb-3\"><CardTitle className=\"text-base\">سجل الإجراءات الرسمي</CardTitle><CardDescription>تسلسل زمني للتعديلات والقرارات المسجلة على المعاملة.</CardDescription></CardHeader><CardContent className=\"space-y-2\">{history.length ? history.map((entry) => <div key={entry.id} className=\"rounded-xl border bg-white p-3 text-sm\"><div className=\"flex flex-wrap items-center justify-between gap-2\"><strong>{entry.action === 'administrative_edit' ? 'تعديل إداري' : entry.action === 'archive' ? 'حذف / أرشفة' : entry.action === 'resubmitted_after_return' ? 'إعادة إرسال بعد التعديل' : 'تغيير حالة'}</strong><span className=\"text-xs text-muted-foreground\">{new Date(entry.createdAt).toLocaleString('ar-SA')}</span></div><p className=\"mt-1 text-xs text-muted-foreground\">{entry.username || entry.userEmail || 'النظام'}{entry.details?.fromStatus || entry.details?.toStatus ? ` — ${statusLabels[entry.details?.fromStatus || ''] || entry.details?.fromStatus || '-'} ← ${statusLabels[entry.details?.toStatus || ''] || entry.details?.toStatus || '-'}` : ''}</p>{entry.details?.note && <p className=\"mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-6\">{entry.details.note}</p>}</div>) : <p className=\"text-sm text-muted-foreground\">لا توجد إجراءات مسجلة بعد.</p>}</CardContent></Card>\n\n"""
    if attach_marker in text:
        text = text.replace(attach_marker, history_card + attach_marker, 1)

# Guardrails
required = [
    'workflowAdminActions',
    'تعديل إداري',
    'إرجاع للتعديل',
    'حذف / أرشفة',
    'workflowAction(statusTarget.kind',
    'سجل الإجراءات الرسمي',
    'resubmitWorkflow',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing required frontend marker: {marker}')

page_path.write_text(text, encoding='utf-8')
print('Formal mosque workflow frontend UI applied.')
