from pathlib import Path

FOLLOW = Path('src/app/config/accountingPropertyEvidenceFollowUp.ts')
DASH = Path('src/app/pages/AccountingPropertyEvidenceDashboardPage.tsx')
MAIN = Path('src/app/pages/AccountingTransformationDashboardPage.tsx')
CONTROL = Path('src/app/pages/AccountingPropertyControlIndicatorsPage.tsx')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Pattern not found: {label}')
    if text.count(old) != 1:
        raise RuntimeError(f'Pattern count != 1 for {label}: {text.count(old)}')
    return text.replace(old, new, 1)

# 1) Escalation helper/config
text = FOLLOW.read_text(encoding='utf-8')
text = replace_once(text,
"export type EvidenceFollowUpStatus = 'not_started' | 'in_progress' | 'waiting_external' | 'completed';\n",
"export type EvidenceFollowUpStatus = 'not_started' | 'in_progress' | 'waiting_external' | 'completed';\nexport type EvidenceEscalationLevel = 'normal' | 'due_soon' | 'overdue' | 'critical';\n\nexport const EVIDENCE_ESCALATION_CONFIG = {\n  dueSoonDays: 7,\n  criticalAfterDays: 14,\n} as const;\n\nexport const EVIDENCE_ESCALATION_LABELS: Record<EvidenceEscalationLevel, string> = {\n  normal: 'ضمن المدة',\n  due_soon: 'قريب الاستحقاق',\n  overdue: 'متأخر',\n  critical: 'حرج',\n};\n",
'followup escalation types')
text += "\nexport const getEvidenceEscalationLevel = (\n  evidenceStatus: PropertyEvidenceStatus,\n  dueDate?: string,\n  followUpStatus?: EvidenceFollowUpStatus,\n  now: Date = new Date()\n): EvidenceEscalationLevel => {\n  if (!isEvidenceTaskOpen(evidenceStatus, followUpStatus)) return 'normal';\n  const overdue = isEvidenceTaskOverdue(evidenceStatus, dueDate, followUpStatus, now);\n  if (overdue) {\n    return evidenceDaysPastDue(dueDate, now) >= EVIDENCE_ESCALATION_CONFIG.criticalAfterDays\n      ? 'critical'\n      : 'overdue';\n  }\n  if (evidenceDueSoon(evidenceStatus, dueDate, followUpStatus, EVIDENCE_ESCALATION_CONFIG.dueSoonDays, now)) {\n    return 'due_soon';\n  }\n  return 'normal';\n};\n"
FOLLOW.write_text(text, encoding='utf-8')

# 2) Central evidence dashboard: escalation + print report
text = DASH.read_text(encoding='utf-8')
text = replace_once(text,
"  RefreshCcw,\n  Search,\n  ShieldCheck,\n} from 'lucide-react';",
"  RefreshCcw,\n  Search,\n  ShieldCheck,\n  Printer,\n  Siren,\n} from 'lucide-react';",
'dashboard icons')
text = replace_once(text,
"  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,\n  defaultFollowUpStatus,\n  evidenceDaysPastDue,\n  evidenceDueSoon,\n  isEvidenceTaskOpen,\n  isEvidenceTaskOverdue,\n  type EvidenceFollowUpPriority,\n  type EvidenceFollowUpStatus,\n} from '../config/accountingPropertyEvidenceFollowUp';",
"  EVIDENCE_ESCALATION_CONFIG,\n  EVIDENCE_ESCALATION_LABELS,\n  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,\n  defaultFollowUpStatus,\n  evidenceDaysPastDue,\n  evidenceDueSoon,\n  getEvidenceEscalationLevel,\n  isEvidenceTaskOpen,\n  isEvidenceTaskOverdue,\n  type EvidenceEscalationLevel,\n  type EvidenceFollowUpPriority,\n  type EvidenceFollowUpStatus,\n} from '../config/accountingPropertyEvidenceFollowUp';",
'dashboard escalation imports')
text = replace_once(text,
"type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete' | 'open' | 'overdue' | 'high_priority';",
"type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete' | 'open' | 'overdue' | 'critical' | 'high_priority';",
'dashboard filter type')
text = replace_once(text,
"  dueSoon: boolean;\n};",
"  dueSoon: boolean;\n  escalation: EvidenceEscalationLevel;\n};",
'dashboard task escalation field')
text = replace_once(text,
"  overdueTasks: number;\n  highPriorityOpen: number;",
"  overdueTasks: number;\n  criticalTasks: number;\n  highPriorityOpen: number;",
'dashboard row critical field')
text = replace_once(text,
"        dueSoon: evidenceDueSoon(status, savedEntry?.dueDate, followUpStatus),\n      });",
"        dueSoon: evidenceDueSoon(status, savedEntry?.dueDate, followUpStatus),\n        escalation: getEvidenceEscalationLevel(status, savedEntry?.dueDate, followUpStatus),\n      });",
'dashboard build escalation')
text = replace_once(text,
"  const overdueTasks = tasks.filter((task) => task.overdue).length;\n  const highPriorityOpen",
"  const overdueTasks = tasks.filter((task) => task.overdue).length;\n  const criticalTasks = tasks.filter((task) => task.escalation === 'critical').length;\n  const highPriorityOpen",
'dashboard critical count')
text = replace_once(text,
"    overdueTasks,\n    highPriorityOpen,",
"    overdueTasks,\n    criticalTasks,\n    highPriorityOpen,",
'dashboard return critical count')
text = replace_once(text,
"      if (filter === 'overdue' && row.overdueTasks === 0) return false;\n      if (filter === 'high_priority'",
"      if (filter === 'overdue' && row.overdueTasks === 0) return false;\n      if (filter === 'critical' && row.criticalTasks === 0) return false;\n      if (filter === 'high_priority'",
'dashboard row critical filter')
text = replace_once(text,
"  const totalOverdueTasks = rows.reduce((sum, row) => sum + row.overdueTasks, 0);\n  const totalHighPriorityOpen",
"  const totalOverdueTasks = rows.reduce((sum, row) => sum + row.overdueTasks, 0);\n  const totalCriticalTasks = rows.reduce((sum, row) => sum + row.criticalTasks, 0);\n  const totalHighPriorityOpen",
'dashboard total critical')
text = replace_once(text,
"    if (filter === 'overdue' && !task.overdue) return false;\n    if (filter === 'high_priority'",
"    if (filter === 'overdue' && !task.overdue) return false;\n    if (filter === 'critical' && task.escalation !== 'critical') return false;\n    if (filter === 'high_priority'",
'dashboard task critical filter')

needle = "  const overallPercentage = totalRequirements\n    ? Math.round(((totalAvailable + totalNeedsUpdate * 0.5) / totalRequirements) * 100)\n    : 0;\n\n  return ("
insert = "  const overallPercentage = totalRequirements\n    ? Math.round(((totalAvailable + totalNeedsUpdate * 0.5) / totalRequirements) * 100)\n    : 0;\n\n  const escapeHtml = (value: unknown) => String(value ?? '-')\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/\\\"/g, '&quot;')\n    .replace(/'/g, '&#039;');\n\n  const printEvidenceReport = () => {\n    const printable = filteredTaskRows.length ? filteredTaskRows : taskRows;\n    const popup = window.open('', '_blank', 'width=1200,height=850');\n    if (!popup) { toast.error('تعذر فتح نافذة الطباعة. تحقق من السماح بالنوافذ المنبثقة.'); return; }\n    const rowsHtml = printable.map(({ row, task }) => `\n      <tr class=\"${task.escalation}\">\n        <td>${escapeHtml(row.profile.title)}</td>\n        <td>${escapeHtml(task.label)}</td>\n        <td>${escapeHtml(task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث')}</td>\n        <td>${escapeHtml(EVIDENCE_ESCALATION_LABELS[task.escalation])}</td>\n        <td>${escapeHtml(task.responsible)}</td>\n        <td>${escapeHtml(EVIDENCE_PRIORITY_LABELS[task.priority])}</td>\n        <td>${escapeHtml(task.dueDate || '-')}</td>\n        <td>${task.daysPastDue ? escapeHtml(`${task.daysPastDue} يوم`) : '-'}</td>\n        <td>${escapeHtml(EVIDENCE_FOLLOW_UP_STATUS_LABELS[task.followUpStatus])}</td>\n        <td>${escapeHtml(task.lastAction || '-')}</td>\n      </tr>`).join('');\n    const generatedAt = new Date().toLocaleString('ar-SA');\n    popup.document.write(`<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><title>تقرير متابعة مستندات الإثبات</title><style>\n      @page{size:A4 landscape;margin:12mm} body{font-family:Arial,Tahoma,sans-serif;color:#111827;margin:0} h1{font-size:22px;margin:0 0 6px} .meta{font-size:11px;color:#475569;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 16px}.box{border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center}.box b{display:block;font-size:18px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top}th{background:#f1f5f9}.due_soon{background:#fffbeb}.overdue{background:#fef2f2}.critical{background:#fee2e2;font-weight:700}.legend{font-size:10px;margin-top:10px;color:#475569}@media print{button{display:none}}\n    </style></head><body><h1>تقرير متابعة مستندات الإثبات</h1><div class=\"meta\">جامعة الإمام عبدالرحمن بن فيصل — لجنة متابعة متطلبات التحول المحاسبي<br>تاريخ إعداد التقرير: ${escapeHtml(generatedAt)} — معيار الحالة الحرجة: ${EVIDENCE_ESCALATION_CONFIG.criticalAfterDays} يومًا بعد الاستحقاق</div>\n    <div class=\"summary\"><div class=\"box\">المهام المفتوحة<b>${totalOpenTasks}</b></div><div class=\"box\">المتأخرة<b>${totalOverdueTasks}</b></div><div class=\"box\">الحرجة<b>${totalCriticalTasks}</b></div><div class=\"box\">أولوية عالية<b>${totalHighPriorityOpen}</b></div></div>\n    <table><thead><tr><th>العقار</th><th>المستند</th><th>حالة المستند</th><th>التصعيد</th><th>المسؤول</th><th>الأولوية</th><th>الاستحقاق</th><th>مدة التأخير</th><th>حالة المتابعة</th><th>آخر إجراء</th></tr></thead><tbody>${rowsHtml}</tbody></table>\n    <div class=\"legend\">قريب الاستحقاق: خلال ${EVIDENCE_ESCALATION_CONFIG.dueSoonDays} أيام — متأخر: بعد تاريخ الاستحقاق — حرج: بعد ${EVIDENCE_ESCALATION_CONFIG.criticalAfterDays} يومًا من التأخير.</div></body></html>`);\n    popup.document.close();\n    popup.focus();\n    window.setTimeout(() => popup.print(), 250);\n  };\n\n  return ("
text = replace_once(text, needle, insert, 'dashboard print helper')
text = replace_once(text,
"            <Button variant=\"outline\" className=\"border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => void load()} disabled={loading}>",
"            <Button variant=\"outline\" className=\"border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={printEvidenceReport}>\n              <Printer className=\"ml-2 h-4 w-4\" />طباعة تقرير المتابعة\n            </Button>\n            <Button variant=\"outline\" className=\"border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => void load()} disabled={loading}>",
'dashboard print button')
text = replace_once(text,
"      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-6\">",
"      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-7\">",
'dashboard metrics columns')
text = replace_once(text,
"          ['مهام متأخرة', totalOverdueTasks, AlertTriangle, 'text-rose-700'],",
"          ['مهام متأخرة', totalOverdueTasks, AlertTriangle, 'text-rose-700'],\n          ['مهام حرجة', totalCriticalTasks, Siren, 'text-red-900'],",
'dashboard critical metric')
text = replace_once(text,
"                <option value=\"overdue\">مهام متأخرة</option>\n                <option value=\"high_priority\">أولوية عالية</option>",
"                <option value=\"overdue\">مهام متأخرة</option>\n                <option value=\"critical\">مهام حرجة</option>\n                <option value=\"high_priority\">أولوية عالية</option>",
'dashboard critical option')
text = replace_once(text,
"            <Button type=\"button\" variant={filter === 'overdue' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>\n              <AlertTriangle className=\"ml-2 h-4 w-4\" />المتأخر فقط\n            </Button>",
"            <Button type=\"button\" variant={filter === 'overdue' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>\n              <AlertTriangle className=\"ml-2 h-4 w-4\" />المتأخر فقط\n            </Button>\n            <Button type=\"button\" variant={filter === 'critical' ? 'destructive' : 'outline'} onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}>\n              <Siren className=\"ml-2 h-4 w-4\" />الحرج فقط\n            </Button>",
'dashboard critical button')
text = replace_once(text,
"              <Badge variant=\"outline\" className=\"border-red-200 bg-red-50 text-red-800\">متأخرة: {totalOverdueTasks}</Badge>\n              <Badge variant=\"outline\" className=\"border-rose-200 bg-rose-50 text-rose-800\">أولوية عالية: {totalHighPriorityOpen}</Badge>",
"              <Badge variant=\"outline\" className=\"border-red-200 bg-red-50 text-red-800\">متأخرة: {totalOverdueTasks}</Badge>\n              <Badge variant=\"outline\" className=\"border-red-400 bg-red-100 text-red-950\">حرجة: {totalCriticalTasks}</Badge>\n              <Badge variant=\"outline\" className=\"border-rose-200 bg-rose-50 text-rose-800\">أولوية عالية: {totalHighPriorityOpen}</Badge>",
'dashboard task badges')
text = replace_once(text,
"<th className=\"px-4 py-3\">العقار</th><th className=\"px-4 py-3\">المستند</th><th className=\"px-4 py-3\">حالة المستند</th><th className=\"px-4 py-3\">المسؤول</th>",
"<th className=\"px-4 py-3\">العقار</th><th className=\"px-4 py-3\">المستند</th><th className=\"px-4 py-3\">حالة المستند</th><th className=\"px-4 py-3\">التصعيد</th><th className=\"px-4 py-3\">المسؤول</th>",
'dashboard task escalation heading')
text = replace_once(text,
"                    <tr key={`${row.profile.id}-${task.key}`} className={task.overdue ? 'bg-red-50/45 align-top' : 'align-top hover:bg-slate-50/70'}>",
"                    <tr key={`${row.profile.id}-${task.key}`} className={task.escalation === 'critical' ? 'bg-red-100/70 align-top' : task.escalation === 'overdue' ? 'bg-red-50/45 align-top' : task.escalation === 'due_soon' ? 'bg-amber-50/55 align-top' : 'align-top hover:bg-slate-50/70'}>",
'dashboard task row tone')
text = replace_once(text,
"                      <td className=\"px-4 py-4\"><Badge variant=\"outline\" className={task.status === 'missing' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث'}</Badge></td>\n                      <td className=\"max-w-[220px]",
"                      <td className=\"px-4 py-4\"><Badge variant=\"outline\" className={task.status === 'missing' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث'}</Badge></td>\n                      <td className=\"px-4 py-4\"><Badge variant=\"outline\" className={task.escalation === 'critical' ? 'border-red-500 bg-red-100 text-red-950' : task.escalation === 'overdue' ? 'border-red-200 bg-red-50 text-red-800' : task.escalation === 'due_soon' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{EVIDENCE_ESCALATION_LABELS[task.escalation]}</Badge></td>\n                      <td className=\"max-w-[220px]",
'dashboard task escalation cell')
DASH.write_text(text, encoding='utf-8')

# 3) Control-indicators: escalation badge
text = CONTROL.read_text(encoding='utf-8')
text = replace_once(text,
"  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,",
"  EVIDENCE_ESCALATION_LABELS,\n  EVIDENCE_FOLLOW_UP_STATUS_LABELS,\n  EVIDENCE_PRIORITY_LABELS,",
'control escalation labels import')
text = replace_once(text,
"  evidenceDueSoon,\n  isEvidenceTaskOverdue,",
"  evidenceDueSoon,\n  getEvidenceEscalationLevel,\n  isEvidenceTaskOverdue,",
'control escalation helper import')
text = replace_once(text,
"    const dueSoon = evidenceDueSoon(status, saved?.dueDate, followUpStatus);\n    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon };",
"    const dueSoon = evidenceDueSoon(status, saved?.dueDate, followUpStatus);\n    const escalation = getEvidenceEscalationLevel(status, saved?.dueDate, followUpStatus);\n    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon, escalation };",
'control evidence escalation')
text = replace_once(text,
"                          <p className=\"font-black text-slate-900\">{requirement.label}</p>",
"                          <div className=\"flex flex-wrap items-center gap-2\"><p className=\"font-black text-slate-900\">{requirement.label}</p>{status !== 'available' && <Badge variant=\"outline\" className={escalation === 'critical' ? 'border-red-500 bg-red-100 text-red-950' : escalation === 'overdue' ? 'border-red-200 bg-red-50 text-red-800' : escalation === 'due_soon' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{EVIDENCE_ESCALATION_LABELS[escalation]}</Badge>}</div>",
'control escalation badge')
CONTROL.write_text(text, encoding='utf-8')

# 4) Main transformation dashboard: tri-level alert
text = MAIN.read_text(encoding='utf-8')
text = replace_once(text,
"import { isEvidenceTaskOverdue, type EvidenceFollowUpStatus } from '../config/accountingPropertyEvidenceFollowUp';",
"import { getEvidenceEscalationLevel, type EvidenceFollowUpStatus } from '../config/accountingPropertyEvidenceFollowUp';",
'main escalation import')
text = replace_once(text,
"const countOverdueEvidenceTasks = (records: AccountingTransformationRecord[]) => {",
"const summarizeEvidenceEscalations = (records: AccountingTransformationRecord[]) => {",
'main summary function name')
text = replace_once(text,
"  return Array.from(latestByTask.values()).filter((task) => isEvidenceTaskOverdue(task.status, task.dueDate, task.followUpStatus)).length;\n};",
"  const summary = { dueSoon: 0, overdue: 0, critical: 0 };\n  Array.from(latestByTask.values()).forEach((task) => {\n    const level = getEvidenceEscalationLevel(task.status, task.dueDate, task.followUpStatus);\n    if (level === 'due_soon') summary.dueSoon += 1;\n    if (level === 'overdue') summary.overdue += 1;\n    if (level === 'critical') { summary.critical += 1; summary.overdue += 1; }\n  });\n  return summary;\n};",
'main summary return')
text = replace_once(text,
"  const [overdueEvidenceTasks, setOverdueEvidenceTasks] = useState(0);",
"  const [evidenceEscalations, setEvidenceEscalations] = useState({ dueSoon: 0, overdue: 0, critical: 0 });",
'main escalation state')
text = replace_once(text,
"        setOverdueEvidenceTasks(countOverdueEvidenceTasks([...(buildings.items || []), ...(lands.items || [])]));",
"        setEvidenceEscalations(summarizeEvidenceEscalations([...(buildings.items || []), ...(lands.items || [])]));",
'main escalation setter')
text = replace_once(text,
"      .catch(() => { if (active) setOverdueEvidenceTasks(0); });",
"      .catch(() => { if (active) setEvidenceEscalations({ dueSoon: 0, overdue: 0, critical: 0 }); });",
'main escalation catch')
old_alert = "          {overdueEvidenceTasks > 0 && <section className=\"grid gap-3 rounded-[24px] border border-red-300/25 bg-red-400/10 p-4 md:grid-cols-[1fr_auto] md:items-center\"><div><p className=\"text-xs font-bold text-red-100\">تنبيه مستندات الإثبات</p><p className=\"mt-1 font-black text-white\">يوجد {overdueEvidenceTasks.toLocaleString('ar-SA')} مهمة متابعة متأخرة عن تاريخ الاستحقاق</p><p className=\"mt-1 text-xs text-red-100/80\">راجع الجهة المسؤولة وآخر إجراء واتخذ اللازم لتحديث المستند أو استكماله.</p></div><Button variant=\"outline\" className=\"border-red-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><TriangleAlert className=\"ml-2 h-4 w-4\" />عرض المتأخرات</Button></section>}"
new_alert = "          {evidenceEscalations.critical > 0 ? <section className=\"grid gap-3 rounded-[24px] border border-red-300/35 bg-red-600/20 p-4 md:grid-cols-[1fr_auto] md:items-center\"><div><p className=\"text-xs font-bold text-red-100\">تصعيد حرج — مستندات الإثبات</p><p className=\"mt-1 font-black text-white\">يوجد {evidenceEscalations.critical.toLocaleString('ar-SA')} مهمة حرجة تجاوز تأخرها 14 يومًا</p><p className=\"mt-1 text-xs text-red-100/80\">تحتاج إلى تدخل ومتابعة عاجلة مع الجهة المسؤولة وتوثيق آخر إجراء.</p></div><Button variant=\"outline\" className=\"border-red-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><TriangleAlert className=\"ml-2 h-4 w-4\" />عرض الحالات الحرجة</Button></section> : evidenceEscalations.overdue > 0 ? <section className=\"grid gap-3 rounded-[24px] border border-red-300/25 bg-red-400/10 p-4 md:grid-cols-[1fr_auto] md:items-center\"><div><p className=\"text-xs font-bold text-red-100\">تنبيه مستندات الإثبات</p><p className=\"mt-1 font-black text-white\">يوجد {evidenceEscalations.overdue.toLocaleString('ar-SA')} مهمة متابعة متأخرة عن تاريخ الاستحقاق</p><p className=\"mt-1 text-xs text-red-100/80\">راجع الجهة المسؤولة وآخر إجراء واتخذ اللازم لتحديث المستند أو استكماله.</p></div><Button variant=\"outline\" className=\"border-red-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><TriangleAlert className=\"ml-2 h-4 w-4\" />عرض المتأخرات</Button></section> : evidenceEscalations.dueSoon > 0 ? <section className=\"grid gap-3 rounded-[24px] border border-amber-300/25 bg-amber-300/10 p-4 md:grid-cols-[1fr_auto] md:items-center\"><div><p className=\"text-xs font-bold text-amber-100\">استحقاقات قريبة — مستندات الإثبات</p><p className=\"mt-1 font-black text-white\">يوجد {evidenceEscalations.dueSoon.toLocaleString('ar-SA')} مهمة تستحق خلال 7 أيام</p><p className=\"mt-1 text-xs text-amber-100/80\">يفضل استكمال المتابعة قبل تحولها إلى حالة متأخرة.</p></div><Button variant=\"outline\" className=\"border-amber-200/30 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><TriangleAlert className=\"ml-2 h-4 w-4\" />عرض الاستحقاقات</Button></section> : null}"
text = replace_once(text, old_alert, new_alert, 'main tri-level alert')
MAIN.write_text(text, encoding='utf-8')

print('Escalation and print-report patch applied successfully')
