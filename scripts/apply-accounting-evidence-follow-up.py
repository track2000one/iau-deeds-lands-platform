from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f'Anchor not found for {label} in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


control = 'src/app/pages/AccountingPropertyControlIndicatorsPage.tsx'
evidence = 'src/app/pages/AccountingPropertyEvidenceDashboardPage.tsx'
dashboard = 'src/app/pages/AccountingTransformationDashboardPage.tsx'

replace_once(
    control,
    """import {\n  findMatchingPropertyEvidenceAttachment,\n  getPropertyEvidenceRequirements,\n  type PropertyEvidenceStatus,\n} from '../config/accountingPropertyEvidenceRequirements';""",
    """import {\n  findMatchingPropertyEvidenceAttachment,\n  getPropertyEvidenceRequirements,\n  type PropertyEvidenceStatus,\n} from '../config/accountingPropertyEvidenceRequirements';\nimport {\n  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,\n  defaultFollowUpStatus,\n  evidenceDaysPastDue,\n  evidenceDueSoon,\n  isEvidenceTaskOverdue,\n  type EvidenceFollowUpPriority,\n  type EvidenceFollowUpStatus,\n} from '../config/accountingPropertyEvidenceFollowUp';""",
    'control follow-up imports'
)

replace_once(
    control,
    """type EvidenceChecklistEntry = {\n  status: PropertyEvidenceStatus;\n  attachmentKey?: string;\n  notes?: string;\n};""",
    """type EvidenceChecklistEntry = {\n  status: PropertyEvidenceStatus;\n  attachmentKey?: string;\n  notes?: string;\n  responsibleParty?: string;\n  dueDate?: string;\n  priority?: EvidenceFollowUpPriority;\n  followUpStatus?: EvidenceFollowUpStatus;\n  lastAction?: string;\n  lastActionAt?: string;\n};""",
    'control evidence entry fields'
)

old_rows = """  const evidenceRows = useMemo(() => evidenceRequirements.map((requirement) => {\n    const saved = analysis.evidenceChecklist?.[requirement.key];\n    const autoAttachment = findMatchingPropertyEvidenceAttachment(requirement, attachments);\n    const linkedAttachment = saved?.attachmentKey\n      ? attachments.find((attachment) => (attachment.driveFileId || attachment.driveUrl) === saved.attachmentKey) || autoAttachment\n      : autoAttachment;\n    const status: PropertyEvidenceStatus = saved?.status || (linkedAttachment ? 'available' : 'missing');\n    return { requirement, saved, attachment: linkedAttachment, status };\n  }), [analysis.evidenceChecklist, attachments, evidenceRequirements]);"""
new_rows = """  const evidenceRows = useMemo(() => evidenceRequirements.map((requirement) => {\n    const saved = analysis.evidenceChecklist?.[requirement.key];\n    const autoAttachment = findMatchingPropertyEvidenceAttachment(requirement, attachments);\n    const linkedAttachment = saved?.attachmentKey\n      ? attachments.find((attachment) => (attachment.driveFileId || attachment.driveUrl) === saved.attachmentKey) || autoAttachment\n      : autoAttachment;\n    const status: PropertyEvidenceStatus = saved?.status || (linkedAttachment ? 'available' : 'missing');\n    const followUpStatus = saved?.followUpStatus || defaultFollowUpStatus(status);\n    const overdue = isEvidenceTaskOverdue(status, saved?.dueDate, followUpStatus);\n    const daysPastDue = overdue ? evidenceDaysPastDue(saved?.dueDate) : 0;\n    const dueSoon = evidenceDueSoon(status, saved?.dueDate, followUpStatus);\n    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon };\n  }), [analysis.evidenceChecklist, attachments, evidenceRequirements]);"""
replace_once(control, old_rows, new_rows, 'control evidence row calculations')

old_status = """  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {\n    setAnalysis((prev) => ({\n      ...prev,\n      evidenceChecklist: {\n        ...(prev.evidenceChecklist || {}),\n        [key]: { ...(prev.evidenceChecklist?.[key] || {}), status },\n      },\n    }));\n  };"""
new_status = """  const setEvidenceEntry = (key: string, patch: Partial<EvidenceChecklistEntry>) => {\n    setAnalysis((prev) => ({\n      ...prev,\n      evidenceChecklist: {\n        ...(prev.evidenceChecklist || {}),\n        [key]: { ...(prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus }), ...patch },\n      },\n    }));\n  };\n\n  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {\n    setAnalysis((prev) => {\n      const current = prev.evidenceChecklist?.[key];\n      const followUpStatus: EvidenceFollowUpStatus = status === 'available'\n        ? 'completed'\n        : current?.followUpStatus === 'completed'\n          ? 'not_started'\n          : current?.followUpStatus || 'not_started';\n      return {\n        ...prev,\n        evidenceChecklist: {\n          ...(prev.evidenceChecklist || {}),\n          [key]: { ...(current || {}), status, followUpStatus },\n        },\n      };\n    });\n  };"""
replace_once(control, old_status, new_status, 'control evidence setter')

replace_once(
    control,
    """[key]: { ...(prev.evidenceChecklist?.[key] || {}), status: 'available', attachmentKey },""",
    """[key]: {\n            ...(prev.evidenceChecklist?.[key] || {}),\n            status: 'available',\n            attachmentKey,\n            followUpStatus: 'completed',\n            lastAction: `تم رفع المستند: ${label}`,\n            lastActionAt: new Date().toISOString().slice(0, 10),\n          },""",
    'control upload closes follow-up'
)

old_map_start = """                  {evidenceRows.map(({ requirement, attachment, status }) => ("""
new_map_start = """                  {evidenceRows.map(({ requirement, attachment, status, saved, followUpStatus, overdue, daysPastDue, dueSoon }) => ("""
replace_once(control, old_map_start, new_map_start, 'control evidence map args')

old_map_end = """                        </div>\n                      </div>\n                    </div>\n                  ))}"""
new_map_end = """                        </div>\n                      </div>\n\n                      <div className=\"mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-4\">\n                        <div>\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">الجهة / المسؤول عن المتابعة</p>\n                          <Input\n                            value={saved?.responsibleParty ?? analysis.responsible}\n                            onChange={(event) => setEvidenceEntry(requirement.key, { responsibleParty: event.target.value })}\n                            placeholder=\"الجهة أو الموظف المسؤول\"\n                          />\n                        </div>\n                        <div>\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">تاريخ الاستحقاق</p>\n                          <Input type=\"date\" value={saved?.dueDate || ''} onChange={(event) => setEvidenceEntry(requirement.key, { dueDate: event.target.value })} />\n                        </div>\n                        <div>\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">الأولوية</p>\n                          <NativeSelect value={saved?.priority || 'medium'} onChange={(event) => setEvidenceEntry(requirement.key, { priority: event.target.value as EvidenceFollowUpPriority })}>\n                            {Object.entries(EVIDENCE_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}\n                          </NativeSelect>\n                        </div>\n                        <div>\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">حالة المتابعة</p>\n                          <NativeSelect value={followUpStatus} onChange={(event) => setEvidenceEntry(requirement.key, { followUpStatus: event.target.value as EvidenceFollowUpStatus })}>\n                            {Object.entries(EVIDENCE_FOLLOW_UP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}\n                          </NativeSelect>\n                        </div>\n                        <div className=\"md:col-span-2 xl:col-span-3\">\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">آخر إجراء / متابعة</p>\n                          <Input\n                            value={saved?.lastAction || ''}\n                            onChange={(event) => setEvidenceEntry(requirement.key, {\n                              lastAction: event.target.value,\n                              lastActionAt: saved?.lastActionAt || new Date().toISOString().slice(0, 10),\n                            })}\n                            placeholder=\"مثال: تمت مخاطبة الجهة المالكة لطلب نسخة محدثة من المستند\"\n                          />\n                        </div>\n                        <div>\n                          <p className=\"mb-2 text-[11px] font-bold text-slate-600\">تاريخ آخر إجراء</p>\n                          <Input type=\"date\" value={saved?.lastActionAt || ''} onChange={(event) => setEvidenceEntry(requirement.key, { lastActionAt: event.target.value })} />\n                        </div>\n                      </div>\n\n                      {(overdue || dueSoon) && (\n                        <div className=\"mt-3 flex flex-wrap gap-2\">\n                          {overdue && <Badge variant=\"outline\" className=\"border-red-300 bg-red-50 text-red-800\">متأخر {daysPastDue.toLocaleString('ar-SA')} يوم</Badge>}\n                          {!overdue && dueSoon && <Badge variant=\"outline\" className=\"border-amber-300 bg-amber-50 text-amber-800\">موعد الاستحقاق خلال 7 أيام</Badge>}\n                        </div>\n                      )}\n                    </div>\n                  ))}"""
replace_once(control, old_map_end, new_map_end, 'control follow-up fields UI')

# Evidence dashboard imports and types.
replace_once(
    evidence,
    """import {\n  findMatchingPropertyEvidenceAttachment,\n  getPropertyEvidenceRequirements,\n  type PropertyEvidenceStatus,\n} from '../config/accountingPropertyEvidenceRequirements';""",
    """import {\n  findMatchingPropertyEvidenceAttachment,\n  getPropertyEvidenceRequirements,\n  type PropertyEvidenceStatus,\n} from '../config/accountingPropertyEvidenceRequirements';\nimport {\n  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,\n  defaultFollowUpStatus,\n  evidenceDaysPastDue,\n  evidenceDueSoon,\n  isEvidenceTaskOpen,\n  isEvidenceTaskOverdue,\n  type EvidenceFollowUpPriority,\n  type EvidenceFollowUpStatus,\n} from '../config/accountingPropertyEvidenceFollowUp';""",
    'evidence dashboard follow-up imports'
)

replace_once(
    evidence,
    """type EvidenceChecklistEntry = {\n  status?: PropertyEvidenceStatus;\n  attachmentKey?: string;\n  notes?: string;\n};""",
    """type EvidenceChecklistEntry = {\n  status?: PropertyEvidenceStatus;\n  attachmentKey?: string;\n  notes?: string;\n  responsibleParty?: string;\n  dueDate?: string;\n  priority?: EvidenceFollowUpPriority;\n  followUpStatus?: EvidenceFollowUpStatus;\n  lastAction?: string;\n  lastActionAt?: string;\n};""",
    'evidence dashboard entry fields'
)

replace_once(
    evidence,
    """type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete';\n\ntype DashboardRow = {""",
    """type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete' | 'open' | 'overdue' | 'high_priority';\n\ntype DashboardTask = {\n  key: string;\n  label: string;\n  status: PropertyEvidenceStatus;\n  responsible: string;\n  dueDate?: string;\n  priority: EvidenceFollowUpPriority;\n  followUpStatus: EvidenceFollowUpStatus;\n  lastAction?: string;\n  lastActionAt?: string;\n  open: boolean;\n  overdue: boolean;\n  daysPastDue: number;\n  dueSoon: boolean;\n};\n\ntype DashboardRow = {""",
    'evidence dashboard task type'
)

replace_once(
    evidence,
    """  totalRequirements: number;\n  responsible: string;\n  nextAction: string;\n  updatedAt?: string;""",
    """  totalRequirements: number;\n  tasks: DashboardTask[];\n  openTasks: number;\n  overdueTasks: number;\n  highPriorityOpen: number;\n  dueSoonTasks: number;\n  nearestDueDate?: string;\n  responsible: string;\n  nextAction: string;\n  updatedAt?: string;""",
    'evidence dashboard row task fields'
)

start = "const buildRow = (profile: PropertyControlMemoProfile, records: AccountingTransformationRecord[]): DashboardRow => {"
end = "\n};\n\nconst completionTone"
p = Path(evidence)
text = p.read_text(encoding='utf-8')
start_index = text.find(start)
end_index = text.find(end, start_index)
if start_index < 0 or end_index < 0:
    raise RuntimeError('Could not locate buildRow function')
new_build = """const buildRow = (profile: PropertyControlMemoProfile, records: AccountingTransformationRecord[]): DashboardRow => {\n  const profileRecords = records.filter((record) => findPropertyControlMemoProfile(record)?.id === profile.id);\n  const latest = latestAnalysisRecord(profileRecords);\n  const representative = latest?.record || profileRecords[0] || null;\n  const attachments = uniqueAttachments(profileRecords);\n  const seed = memoProfileToAnalysisSeed(profile) as SavedControlAnalysis;\n  const saved = latest?.analysis || null;\n  const analysis = { ...seed, ...(saved || {}) };\n  const requirements = getPropertyEvidenceRequirements(profile.id);\n\n  let available = 0;\n  let missing = 0;\n  let needsUpdate = 0;\n  const tasks: DashboardTask[] = [];\n\n  requirements.forEach((requirement) => {\n    const savedEntry = analysis.evidenceChecklist?.[requirement.key];\n    const linkedAttachment = savedEntry?.attachmentKey\n      ? attachments.find((attachment) => attachmentIdentity(attachment) === savedEntry.attachmentKey)\n        || findMatchingPropertyEvidenceAttachment(requirement, attachments)\n      : findMatchingPropertyEvidenceAttachment(requirement, attachments);\n    const status: PropertyEvidenceStatus = savedEntry?.status || (linkedAttachment ? 'available' : 'missing');\n    if (status === 'available') available += 1;\n    else if (status === 'needs_update') needsUpdate += 1;\n    else missing += 1;\n\n    if (status !== 'available') {\n      const followUpStatus = savedEntry?.followUpStatus || defaultFollowUpStatus(status);\n      const open = isEvidenceTaskOpen(status, followUpStatus);\n      const overdue = isEvidenceTaskOverdue(status, savedEntry?.dueDate, followUpStatus);\n      tasks.push({\n        key: requirement.key,\n        label: requirement.label,\n        status,\n        responsible: String(savedEntry?.responsibleParty || analysis.responsible || profile.responsible || 'غير محدد'),\n        dueDate: savedEntry?.dueDate,\n        priority: savedEntry?.priority || 'medium',\n        followUpStatus,\n        lastAction: savedEntry?.lastAction,\n        lastActionAt: savedEntry?.lastActionAt,\n        open,\n        overdue,\n        daysPastDue: overdue ? evidenceDaysPastDue(savedEntry?.dueDate) : 0,\n        dueSoon: evidenceDueSoon(status, savedEntry?.dueDate, followUpStatus),\n      });\n    }\n  });\n\n  const totalRequirements = requirements.length;\n  const percentage = totalRequirements\n    ? Math.round(((available + needsUpdate * 0.5) / totalRequirements) * 100)\n    : 0;\n  const openTasks = tasks.filter((task) => task.open).length;\n  const overdueTasks = tasks.filter((task) => task.overdue).length;\n  const highPriorityOpen = tasks.filter((task) => task.open && task.priority === 'high').length;\n  const dueSoonTasks = tasks.filter((task) => task.dueSoon && !task.overdue).length;\n  const nearestDueDate = tasks\n    .filter((task) => task.open && task.dueDate)\n    .map((task) => task.dueDate as string)\n    .sort()[0];\n\n  return {\n    profile,\n    records: profileRecords,\n    representative,\n    attachments,\n    percentage,\n    available,\n    missing,\n    needsUpdate,\n    totalRequirements,\n    tasks,\n    openTasks,\n    overdueTasks,\n    highPriorityOpen,\n    dueSoonTasks,\n    nearestDueDate,\n    responsible: String(analysis.responsible || profile.responsible || 'غير محدد'),\n    nextAction: String(analysis.nextAction || profile.nextAction || 'غير محدد'),\n    updatedAt: saved?.updatedAt,\n  };\n}"""
text = text[:start_index] + new_build + text[end_index+3:]
p.write_text(text, encoding='utf-8')

replace_once(
    evidence,
    """      if (filter === 'missing' && row.missing === 0) return false;\n      if (filter === 'needs_update' && row.needsUpdate === 0) return false;\n      if (filter === 'complete' && row.percentage < 100) return false;""",
    """      if (filter === 'missing' && row.missing === 0) return false;\n      if (filter === 'needs_update' && row.needsUpdate === 0) return false;\n      if (filter === 'complete' && row.percentage < 100) return false;\n      if (filter === 'open' && row.openTasks === 0) return false;\n      if (filter === 'overdue' && row.overdueTasks === 0) return false;\n      if (filter === 'high_priority' && row.highPriorityOpen === 0) return false;""",
    'evidence dashboard row filters'
)

replace_once(
    evidence,
    """        row.representative?.assetDescription,\n        row.representative?.city,""",
    """        row.representative?.assetDescription,\n        row.representative?.city,\n        ...row.tasks.flatMap((task) => [task.label, task.responsible, task.lastAction]),""",
    'evidence dashboard search task fields'
)

replace_once(
    evidence,
    """  const totalNeedsUpdate = rows.reduce((sum, row) => sum + row.needsUpdate, 0);\n  const overallPercentage = totalRequirements""",
    """  const totalNeedsUpdate = rows.reduce((sum, row) => sum + row.needsUpdate, 0);\n  const totalOpenTasks = rows.reduce((sum, row) => sum + row.openTasks, 0);\n  const totalOverdueTasks = rows.reduce((sum, row) => sum + row.overdueTasks, 0);\n  const totalHighPriorityOpen = rows.reduce((sum, row) => sum + row.highPriorityOpen, 0);\n  const taskRows = rows.flatMap((row) => row.tasks.map((task) => ({ row, task })));\n  const filteredTaskRows = taskRows.filter(({ row, task }) => {\n    if (filter === 'missing' && task.status !== 'missing') return false;\n    if (filter === 'needs_update' && task.status !== 'needs_update') return false;\n    if (filter === 'open' && !task.open) return false;\n    if (filter === 'overdue' && !task.overdue) return false;\n    if (filter === 'high_priority' && !(task.open && task.priority === 'high')) return false;\n    if (filter === 'complete') return false;\n    const needle = normalize(query);\n    if (!needle) return true;\n    return normalize([row.profile.title, task.label, task.responsible, task.lastAction].filter(Boolean).join(' ')).includes(needle);\n  });\n  const overallPercentage = totalRequirements""",
    'evidence dashboard totals and task rows'
)

replace_once(
    evidence,
    """      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-5\">\n        {[\n          ['الحالات', rows.length, FolderOpen, 'text-blue-700'],\n          ['نسبة الاكتمال', `${overallPercentage}%`, FileCheck2, 'text-emerald-700'],\n          ['متطلبات متوفرة', totalAvailable, CheckCircle2, 'text-teal-700'],\n          ['تحتاج تحديث', totalNeedsUpdate, FileWarning, 'text-amber-700'],\n          ['مستندات ناقصة', totalMissing, AlertTriangle, 'text-red-700'],""",
    """      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-6\">\n        {[\n          ['الحالات', rows.length, FolderOpen, 'text-blue-700'],\n          ['نسبة الاكتمال', `${overallPercentage}%`, FileCheck2, 'text-emerald-700'],\n          ['مستندات ناقصة', totalMissing, AlertTriangle, 'text-red-700'],\n          ['تحتاج تحديث', totalNeedsUpdate, FileWarning, 'text-amber-700'],\n          ['مهام متابعة مفتوحة', totalOpenTasks, FolderOpen, 'text-sky-700'],\n          ['مهام متأخرة', totalOverdueTasks, AlertTriangle, 'text-rose-700'],""",
    'evidence dashboard metric cards'
)

replace_once(
    evidence,
    """          <div className=\"grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end\">""",
    """          <div className=\"grid gap-3 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end\">""",
    'evidence dashboard filter layout'
)

replace_once(
    evidence,
    """                <option value=\"complete\">مكتمل 100%</option>\n              </NativeSelect>""",
    """                <option value=\"complete\">مكتمل 100%</option>\n                <option value=\"open\">مهام متابعة مفتوحة</option>\n                <option value=\"overdue\">مهام متأخرة</option>\n                <option value=\"high_priority\">أولوية عالية</option>\n              </NativeSelect>""",
    'evidence dashboard filter options'
)

replace_once(
    evidence,
    """            <Button type=\"button\" variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'missing' ? 'all' : 'missing')}>\n              <AlertTriangle className=\"ml-2 h-4 w-4\" />الناقص فقط\n            </Button>""",
    """            <Button type=\"button\" variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'missing' ? 'all' : 'missing')}>\n              <AlertTriangle className=\"ml-2 h-4 w-4\" />الناقص فقط\n            </Button>\n            <Button type=\"button\" variant={filter === 'overdue' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>\n              <AlertTriangle className=\"ml-2 h-4 w-4\" />المتأخر فقط\n            </Button>""",
    'evidence dashboard overdue button'
)

replace_once(
    evidence,
    """              <table className=\"w-full min-w-[1180px] text-right text-sm\">""",
    """              <table className=\"w-full min-w-[1460px] text-right text-sm\">""",
    'evidence dashboard table width'
)

replace_once(
    evidence,
    """                    <th className=\"px-4 py-3\">ناقص</th>\n                    <th className=\"px-4 py-3\">المسؤول</th>""",
    """                    <th className=\"px-4 py-3\">ناقص</th>\n                    <th className=\"px-4 py-3\">مهام مفتوحة</th>\n                    <th className=\"px-4 py-3\">متأخرة</th>\n                    <th className=\"px-4 py-3\">أقرب استحقاق</th>\n                    <th className=\"px-4 py-3\">المسؤول</th>""",
    'evidence dashboard aggregate task headers'
)

replace_once(
    evidence,
    """                      <td className=\"px-4 py-4 font-black text-red-700\">{row.missing}</td>\n                      <td className=\"max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700\">{row.responsible}</td>""",
    """                      <td className=\"px-4 py-4 font-black text-red-700\">{row.missing}</td>\n                      <td className=\"px-4 py-4 font-black text-sky-700\">{row.openTasks}</td>\n                      <td className=\"px-4 py-4 font-black text-rose-700\">{row.overdueTasks}</td>\n                      <td className=\"px-4 py-4 text-xs text-slate-700\">{row.nearestDueDate || '-'}</td>\n                      <td className=\"max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700\">{row.responsible}</td>""",
    'evidence dashboard aggregate task cells'
)

# Add detailed task table before footer note.
replace_once(
    evidence,
    """      <p className=\"rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600\">ملاحظة: النسبة في هذه اللوحة تجمع المرفقات الموجودة في جميع السجلات المطابقة لكل حالة.""",
    """      <Card className=\"rounded-[26px]\">\n        <CardHeader className=\"border-b bg-slate-50/70\">\n          <div className=\"flex flex-wrap items-center justify-between gap-3\">\n            <div><CardTitle className=\"text-base\">مهام متابعة المستندات</CardTitle><p className=\"mt-1 text-xs text-slate-500\">تفاصيل كل مستند ناقص أو يحتاج تحديثًا، مع المسؤول والاستحقاق والأولوية وآخر إجراء.</p></div>\n            <div className=\"flex flex-wrap gap-2\">\n              <Badge variant=\"outline\" className=\"border-sky-200 bg-sky-50 text-sky-800\">مفتوحة: {totalOpenTasks}</Badge>\n              <Badge variant=\"outline\" className=\"border-red-200 bg-red-50 text-red-800\">متأخرة: {totalOverdueTasks}</Badge>\n              <Badge variant=\"outline\" className=\"border-rose-200 bg-rose-50 text-rose-800\">أولوية عالية: {totalHighPriorityOpen}</Badge>\n            </div>\n          </div>\n        </CardHeader>\n        <CardContent className=\"p-0\">\n          {!filteredTaskRows.length ? <div className=\"py-12 text-center text-sm text-slate-500\">لا توجد مهام متابعة مطابقة للفلتر الحالي.</div> : (\n            <div className=\"overflow-x-auto\">\n              <table className=\"w-full min-w-[1500px] text-right text-sm\">\n                <thead className=\"bg-slate-50 text-xs text-slate-600\"><tr>\n                  <th className=\"px-4 py-3\">العقار</th><th className=\"px-4 py-3\">المستند</th><th className=\"px-4 py-3\">حالة المستند</th><th className=\"px-4 py-3\">المسؤول</th><th className=\"px-4 py-3\">الأولوية</th><th className=\"px-4 py-3\">الاستحقاق</th><th className=\"px-4 py-3\">حالة المتابعة</th><th className=\"px-4 py-3\">آخر إجراء</th><th className=\"px-4 py-3\">فتح</th>\n                </tr></thead>\n                <tbody className=\"divide-y\">\n                  {filteredTaskRows.map(({ row, task }) => (\n                    <tr key={`${row.profile.id}-${task.key}`} className={task.overdue ? 'bg-red-50/45 align-top' : 'align-top hover:bg-slate-50/70'}>\n                      <td className=\"px-4 py-4 font-black text-slate-900\">{row.profile.title}</td>\n                      <td className=\"max-w-[260px] px-4 py-4 text-xs leading-6 text-slate-700\">{task.label}</td>\n                      <td className=\"px-4 py-4\"><Badge variant=\"outline\" className={task.status === 'missing' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث'}</Badge></td>\n                      <td className=\"max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700\">{task.responsible}</td>\n                      <td className=\"px-4 py-4\"><Badge variant=\"outline\">{EVIDENCE_PRIORITY_LABELS[task.priority]}</Badge></td>\n                      <td className=\"px-4 py-4 text-xs\">{task.dueDate || '-'}{task.overdue && <p className=\"mt-1 font-black text-red-700\">متأخر {task.daysPastDue.toLocaleString('ar-SA')} يوم</p>}{!task.overdue && task.dueSoon && <p className=\"mt-1 font-bold text-amber-700\">خلال 7 أيام</p>}</td>\n                      <td className=\"px-4 py-4 text-xs\">{EVIDENCE_FOLLOW_UP_STATUS_LABELS[task.followUpStatus]}</td>\n                      <td className=\"max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700\">{task.lastAction || '-'}{task.lastActionAt && <p className=\"mt-1 text-[10px] text-slate-400\">{task.lastActionAt}</p>}</td>\n                      <td className=\"px-4 py-4\">{row.representative ? <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/control-indicators`)}>متابعة</Button> : <span className=\"text-[11px] text-red-600\">غير مرتبط</span>}</td>\n                    </tr>\n                  ))}\n                </tbody>\n              </table>\n            </div>\n          )}\n        </CardContent>\n      </Card>\n\n      <p className=\"rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600\">ملاحظة: النسبة في هذه اللوحة تجمع المرفقات الموجودة في جميع السجلات المطابقة لكل حالة.""",
    'evidence dashboard detailed task table'
)

# Main accounting dashboard: load overdue follow-up count and show alert.
replace_once(
    dashboard,
    """import { getAccountingTransformationCycles, getAccountingTransformationStats } from '../api/accountingTransformation';\nimport type { AccountingTransformationCycle, AccountingTransformationStats } from '../../types/accountingTransformation';""",
    """import { getAccountingTransformationCycles, getAccountingTransformationRecords, getAccountingTransformationStats } from '../api/accountingTransformation';\nimport type { AccountingTransformationCycle, AccountingTransformationRecord, AccountingTransformationStats } from '../../types/accountingTransformation';\nimport { isEvidenceTaskOverdue, type EvidenceFollowUpStatus } from '../config/accountingPropertyEvidenceFollowUp';\nimport type { PropertyEvidenceStatus } from '../config/accountingPropertyEvidenceRequirements';""",
    'main dashboard evidence imports'
)

replace_once(
    dashboard,
    """const EMPTY: AccountingTransformationStats = {""",
    """const CONTROL_KEY = '__propertyControlAnalysis';\n\nconst countOverdueEvidenceTasks = (records: AccountingTransformationRecord[]) => {\n  const latestByTask = new Map<string, { updatedAt: number; status: PropertyEvidenceStatus; dueDate?: string; followUpStatus?: EvidenceFollowUpStatus }>();\n  records.forEach((record) => {\n    const raw = record.payload?.[CONTROL_KEY];\n    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;\n    const analysis = raw as Record<string, unknown>;\n    const profileId = String(analysis.memoProfileId || record.id);\n    const updatedAt = analysis.updatedAt ? Date.parse(String(analysis.updatedAt)) || 0 : 0;\n    const checklist = analysis.evidenceChecklist;\n    if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist)) return;\n    Object.entries(checklist as Record<string, unknown>).forEach(([key, value]) => {\n      if (!value || typeof value !== 'object' || Array.isArray(value)) return;\n      const entry = value as Record<string, unknown>;\n      const taskKey = `${profileId}:${key}`;\n      const existing = latestByTask.get(taskKey);\n      if (existing && existing.updatedAt > updatedAt) return;\n      latestByTask.set(taskKey, {\n        updatedAt,\n        status: (entry.status as PropertyEvidenceStatus) || 'missing',\n        dueDate: entry.dueDate ? String(entry.dueDate) : undefined,\n        followUpStatus: entry.followUpStatus as EvidenceFollowUpStatus | undefined,\n      });\n    });\n  });\n  return Array.from(latestByTask.values()).filter((task) => isEvidenceTaskOverdue(task.status, task.dueDate, task.followUpStatus)).length;\n};\n\nconst EMPTY: AccountingTransformationStats = {""",
    'main dashboard overdue helper'
)

replace_once(
    dashboard,
    """  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);\n  const canAdd =""",
    """  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);\n  const [overdueEvidenceTasks, setOverdueEvidenceTasks] = useState(0);\n  const canAdd =""",
    'main dashboard overdue state'
)

replace_once(
    dashboard,
    """  }, []);\n\n  const currentCycle =""",
    """  }, []);\n\n  useEffect(() => {\n    let active = true;\n    Promise.all([\n      getAccountingTransformationRecords({ recordType: 'building', all: true }),\n      getAccountingTransformationRecords({ recordType: 'land', all: true }),\n    ])\n      .then(([buildings, lands]) => {\n        if (!active) return;\n        setOverdueEvidenceTasks(countOverdueEvidenceTasks([...(buildings.items || []), ...(lands.items || [])]));\n      })\n      .catch(() => { if (active) setOverdueEvidenceTasks(0); });\n    return () => { active = false; };\n  }, []);\n\n  const currentCycle =""",
    'main dashboard overdue load'
)

replace_once(
    dashboard,
    """          {(currentCycle || openCycle) && <section""",
    """          {overdueEvidenceTasks > 0 && <section className=\"grid gap-3 rounded-[24px] border border-red-300/25 bg-red-400/10 p-4 md:grid-cols-[1fr_auto] md:items-center\"><div><p className=\"text-xs font-bold text-red-100\">تنبيه مستندات الإثبات</p><p className=\"mt-1 font-black text-white\">يوجد {overdueEvidenceTasks.toLocaleString('ar-SA')} مهمة متابعة متأخرة عن تاريخ الاستحقاق</p><p className=\"mt-1 text-xs text-red-100/80\">راجع الجهة المسؤولة وآخر إجراء واتخذ اللازم لتحديث المستند أو استكماله.</p></div><Button variant=\"outline\" className=\"border-red-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><TriangleAlert className=\"ml-2 h-4 w-4\" />عرض المتأخرات</Button></section>}\n\n          {(currentCycle || openCycle) && <section""",
    'main dashboard overdue alert'
)

replace_once(
    dashboard,
    """{ label: 'متابعة مستندات الإثبات', description: 'لوحة مركزية للحالات الأربع تعرض نسبة اكتمال ملف الإثبات والمستندات الناقصة وما يحتاج تحديثًا والمسؤول والإجراء التالي.'""",
    """{ label: 'متابعة مستندات الإثبات', description: 'لوحة مركزية للحالات الأربع تعرض الاكتمال والمهام المفتوحة والمتأخرات والأولوية والمسؤول وآخر إجراء.'""",
    'main dashboard quick action description'
)

print('Evidence follow-up task management integrated successfully.')
