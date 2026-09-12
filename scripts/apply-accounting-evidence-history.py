from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)

# Keep manually-added timeline events when save-time audit events are appended.
history_path = Path('src/app/config/accountingPropertyEvidenceHistory.ts')
history_text = history_path.read_text(encoding='utf-8')
history_text = replace_once(
    history_text,
    "  const history = [...(previous?.history || next.history || [])];",
    "  const history = [...(next.history || previous?.history || [])];",
    'history precedence',
)
history_text = replace_once(
    history_text,
    "  if (!entry.dueDate || entry.status === 'available' || entry.followUpStatus === 'completed') return [];\n  const due = new Date(`${entry.dueDate}T00:00:00`);\n  if (Number.isNaN(due.getTime())) return [];\n  const events: EvidenceHistoryEvent[] = [];",
    "  if (!entry.dueDate) return [];\n  const due = new Date(`${entry.dueDate}T00:00:00`);\n  if (Number.isNaN(due.getTime())) return [];\n  const closedEvent = [...(entry.history || [])]\n    .filter((event) => event.type === 'closed')\n    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];\n  const effectiveEnd = closedEvent ? new Date(closedEvent.at) : now;\n  const events: EvidenceHistoryEvent[] = [];",
    'derived milestones effective end',
)
history_text = history_text.replace('if (dueSoonAt <= now) {', 'if (dueSoonAt <= effectiveEnd) {', 1)
history_text = history_text.replace('if (overdueAt <= now) {', 'if (overdueAt <= effectiveEnd) {', 1)
history_text = replace_once(
    history_text,
    "  const escalation: EvidenceEscalationLevel = getEvidenceEscalationLevel(entry.status || 'missing', entry.dueDate, entry.followUpStatus, now);\n  if (escalation === 'critical') {\n    const criticalAt = new Date(due);\n    criticalAt.setDate(criticalAt.getDate() + 14);\n    events.push({",
    "  const criticalAt = new Date(due);\n  criticalAt.setDate(criticalAt.getDate() + 14);\n  const escalation: EvidenceEscalationLevel = getEvidenceEscalationLevel(entry.status || 'missing', entry.dueDate, entry.followUpStatus, effectiveEnd);\n  if (criticalAt <= effectiveEnd && escalation === 'critical') {\n    events.push({",
    'critical milestone persistence',
)
history_path.write_text(history_text, encoding='utf-8')

# Control indicators page: persist audit trail + timeline UI.
control_path = Path('src/app/pages/AccountingPropertyControlIndicatorsPage.tsx')
control = control_path.read_text(encoding='utf-8')
control = replace_once(
    control,
    "  ExternalLink,\n} from 'lucide-react';",
    "  ExternalLink,\n  History,\n  PlusCircle,\n} from 'lucide-react';",
    'control lucide imports',
)
control = replace_once(
    control,
    "} from '../config/accountingPropertyEvidenceFollowUp';\n\nconst CONTROL_KEY",
    "} from '../config/accountingPropertyEvidenceFollowUp';\nimport {\n  appendEvidenceHistoryFromChanges,\n  createEvidenceHistoryEvent,\n  mergeEvidenceHistory,\n  type EvidenceHistoryEvent,\n} from '../config/accountingPropertyEvidenceHistory';\n\nconst CONTROL_KEY",
    'control history import',
)
control = replace_once(
    control,
    "  lastAction?: string;\n  lastActionAt?: string;\n};",
    "  lastAction?: string;\n  lastActionAt?: string;\n  history?: EvidenceHistoryEvent[];\n};",
    'control evidence history type',
)
control = replace_once(
    control,
    "  const [uploadingEvidenceKey, setUploadingEvidenceKey] = useState('');",
    "  const [uploadingEvidenceKey, setUploadingEvidenceKey] = useState('');\n  const [expandedHistoryKey, setExpandedHistoryKey] = useState('');\n  const [historyNoteDrafts, setHistoryNoteDrafts] = useState<Record<string, string>>({});",
    'control history state',
)
control = replace_once(
    control,
    "    const escalation = getEvidenceEscalationLevel(status, saved?.dueDate, followUpStatus);\n    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon, escalation };",
    "    const escalation = getEvidenceEscalationLevel(status, saved?.dueDate, followUpStatus);\n    const historyEvents = mergeEvidenceHistory({ ...(saved || {}), status, followUpStatus });\n    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon, escalation, historyEvents };",
    'control evidence rows history',
)
control = replace_once(
    control,
    "  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {",
    "  const addEvidenceHistoryNote = (key: string) => {\n    const summary = (historyNoteDrafts[key] || '').trim();\n    if (!summary) { toast.error('اكتب تفاصيل المتابعة أولًا'); return; }\n    setAnalysis((prev) => {\n      const current = prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus };\n      return {\n        ...prev,\n        evidenceChecklist: {\n          ...(prev.evidenceChecklist || {}),\n          [key]: {\n            ...current,\n            history: [...(current.history || []), createEvidenceHistoryEvent('note', summary)],\n          },\n        },\n      };\n    });\n    setHistoryNoteDrafts((prev) => ({ ...prev, [key]: '' }));\n    toast.success('تمت إضافة المتابعة إلى السجل الزمني؛ احفظ التحليل لتثبيتها');\n  };\n\n  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {",
    'control manual history note',
)
control = replace_once(
    control,
    "      const nextAnalysis: ControlAnalysis = {\n        ...analysis,\n        documentCompleteness: computedDocumentCompleteness,\n        evidenceCompletionPercent,\n        updatedAt: new Date().toISOString(),\n      };",
    "      const savedAnalysis = readAnalysis(selected);\n      const historyAt = new Date().toISOString();\n      const nextEvidenceChecklist = Object.fromEntries(\n        Object.entries(analysis.evidenceChecklist || {}).map(([key, entry]) => [\n          key,\n          appendEvidenceHistoryFromChanges(savedAnalysis.evidenceChecklist?.[key], entry, historyAt),\n        ])\n      );\n      const nextAnalysis: ControlAnalysis = {\n        ...analysis,\n        evidenceChecklist: nextEvidenceChecklist,\n        documentCompleteness: computedDocumentCompleteness,\n        evidenceCompletionPercent,\n        updatedAt: historyAt,\n      };",
    'control save history audit',
)
control = replace_once(
    control,
    "                  {evidenceRows.map(({ requirement, attachment, status, saved, followUpStatus, overdue, daysPastDue, dueSoon }) => (",
    "                  {evidenceRows.map(({ requirement, attachment, status, saved, followUpStatus, overdue, daysPastDue, dueSoon, escalation, historyEvents }) => (",
    'control map history destructure',
)
control = replace_once(
    control,
    "                      {(overdue || dueSoon) && (\n                        <div className=\"mt-3 flex flex-wrap gap-2\">\n                          {overdue && <Badge variant=\"outline\" className=\"border-red-300 bg-red-50 text-red-800\">متأخر {daysPastDue.toLocaleString('ar-SA')} يوم</Badge>}\n                          {!overdue && dueSoon && <Badge variant=\"outline\" className=\"border-amber-300 bg-amber-50 text-amber-800\">موعد الاستحقاق خلال 7 أيام</Badge>}\n                        </div>\n                      )}\n                    </div>",
    "                      {(overdue || dueSoon) && (\n                        <div className=\"mt-3 flex flex-wrap gap-2\">\n                          {overdue && <Badge variant=\"outline\" className=\"border-red-300 bg-red-50 text-red-800\">متأخر {daysPastDue.toLocaleString('ar-SA')} يوم</Badge>}\n                          {!overdue && dueSoon && <Badge variant=\"outline\" className=\"border-amber-300 bg-amber-50 text-amber-800\">موعد الاستحقاق خلال 7 أيام</Badge>}\n                        </div>\n                      )}\n\n                      <div className=\"mt-4 border-t border-slate-100 pt-4\">\n                        <Button type=\"button\" size=\"sm\" variant=\"ghost\" onClick={() => setExpandedHistoryKey(expandedHistoryKey === requirement.key ? '' : requirement.key)}>\n                          <History className=\"ml-1 h-4 w-4\" />سجل المتابعة ({historyEvents.length.toLocaleString('ar-SA')})\n                        </Button>\n                        {expandedHistoryKey === requirement.key && (\n                          <div className=\"mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3\">\n                            <div className=\"grid gap-2 sm:grid-cols-[1fr_auto]\">\n                              <Input\n                                value={historyNoteDrafts[requirement.key] || ''}\n                                onChange={(event) => setHistoryNoteDrafts((prev) => ({ ...prev, [requirement.key]: event.target.value }))}\n                                placeholder=\"إضافة متابعة جديدة، مثل: تمت مخاطبة الجهة واستلام إفادة أولية...\"\n                              />\n                              <Button type=\"button\" size=\"sm\" onClick={() => addEvidenceHistoryNote(requirement.key)}>\n                                <PlusCircle className=\"ml-1 h-4 w-4\" />إضافة للسجل\n                              </Button>\n                            </div>\n                            {!historyEvents.length ? (\n                              <p className=\"py-5 text-center text-xs text-slate-500\">لا توجد أحداث متابعة مسجلة حتى الآن.</p>\n                            ) : (\n                              <div className=\"mt-3 space-y-2\">\n                                {historyEvents.map((event) => (\n                                  <div key={event.id} className=\"relative rounded-xl border bg-white p-3 pr-5\">\n                                    <span className=\"absolute right-2 top-4 h-2 w-2 rounded-full bg-slate-400\" />\n                                    <p className=\"text-xs font-bold leading-6 text-slate-800\">{event.summary}</p>\n                                    <p className=\"mt-1 text-[10px] text-slate-500\">{new Date(event.at).toLocaleString('ar-SA')} · {event.actor || 'مستخدم المنصة'}</p>\n                                  </div>\n                                ))}\n                              </div>\n                            )}\n                          </div>\n                        )}\n                      </div>\n                    </div>",
    'control timeline UI',
)
control_path.write_text(control, encoding='utf-8')

# Central evidence dashboard: surface history counts/latest event and include them in print.
dash_path = Path('src/app/pages/AccountingPropertyEvidenceDashboardPage.tsx')
dash = dash_path.read_text(encoding='utf-8')
dash = replace_once(
    dash,
    "  Siren,\n} from 'lucide-react';",
    "  Siren,\n  History,\n} from 'lucide-react';",
    'dashboard history icon',
)
dash = replace_once(
    dash,
    "} from '../config/accountingPropertyEvidenceFollowUp';\nimport type {",
    "} from '../config/accountingPropertyEvidenceFollowUp';\nimport { mergeEvidenceHistory, type EvidenceHistoryEvent } from '../config/accountingPropertyEvidenceHistory';\nimport type {",
    'dashboard history import',
)
dash = replace_once(
    dash,
    "  lastAction?: string;\n  lastActionAt?: string;\n};",
    "  lastAction?: string;\n  lastActionAt?: string;\n  history?: EvidenceHistoryEvent[];\n};",
    'dashboard entry history type',
)
dash = replace_once(
    dash,
    "  dueSoon: boolean;\n  escalation: EvidenceEscalationLevel;\n};",
    "  dueSoon: boolean;\n  escalation: EvidenceEscalationLevel;\n  historyCount: number;\n  latestHistory?: EvidenceHistoryEvent;\n};",
    'dashboard task history fields',
)
dash = replace_once(
    dash,
    "      const overdue = isEvidenceTaskOverdue(status, savedEntry?.dueDate, followUpStatus);\n      tasks.push({",
    "      const overdue = isEvidenceTaskOverdue(status, savedEntry?.dueDate, followUpStatus);\n      const historyEvents = mergeEvidenceHistory({ ...(savedEntry || {}), status, followUpStatus });\n      tasks.push({",
    'dashboard history events compute',
)
dash = replace_once(
    dash,
    "        escalation: getEvidenceEscalationLevel(status, savedEntry?.dueDate, followUpStatus),\n      });",
    "        escalation: getEvidenceEscalationLevel(status, savedEntry?.dueDate, followUpStatus),\n        historyCount: historyEvents.length,\n        latestHistory: historyEvents[0],\n      });",
    'dashboard history task assignment',
)
dash = replace_once(
    dash,
    "        ...row.tasks.flatMap((task) => [task.label, task.responsible, task.lastAction]),",
    "        ...row.tasks.flatMap((task) => [task.label, task.responsible, task.lastAction, task.latestHistory?.summary]),",
    'dashboard row search history',
)
dash = replace_once(
    dash,
    "    return normalize([row.profile.title, task.label, task.responsible, task.lastAction].filter(Boolean).join(' ')).includes(needle);",
    "    return normalize([row.profile.title, task.label, task.responsible, task.lastAction, task.latestHistory?.summary].filter(Boolean).join(' ')).includes(needle);",
    'dashboard task search history',
)
dash = replace_once(
    dash,
    "        <td>${escapeHtml(task.lastAction || '-')}</td>\n      </tr>`).join('');",
    "        <td>${escapeHtml(task.lastAction || '-')}</td>\n        <td>${escapeHtml(`${task.historyCount} حدث — ${task.latestHistory?.summary || 'لا يوجد سجل محفوظ'}`)}</td>\n      </tr>`).join('');",
    'dashboard print history cell',
)
dash = replace_once(
    dash,
    "<th>آخر إجراء</th></tr></thead><tbody>${rowsHtml}</tbody></table>",
    "<th>آخر إجراء</th><th>السجل الزمني</th></tr></thead><tbody>${rowsHtml}</tbody></table>",
    'dashboard print history header',
)
dash = replace_once(
    dash,
    "<th className=\"px-4 py-3\">حالة المتابعة</th><th className=\"px-4 py-3\">آخر إجراء</th><th className=\"px-4 py-3\">فتح</th>",
    "<th className=\"px-4 py-3\">حالة المتابعة</th><th className=\"px-4 py-3\">آخر إجراء</th><th className=\"px-4 py-3\">السجل الزمني</th><th className=\"px-4 py-3\">فتح</th>",
    'dashboard table history header',
)
dash = replace_once(
    dash,
    "                      <td className=\"max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700\">{task.lastAction || '-'}{task.lastActionAt && <p className=\"mt-1 text-[10px] text-slate-400\">{task.lastActionAt}</p>}</td>\n                      <td className=\"px-4 py-4\">{row.representative ? <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/control-indicators`)}>متابعة</Button> : <span className=\"text-[11px] text-red-600\">غير مرتبط</span>}</td>",
    "                      <td className=\"max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700\">{task.lastAction || '-'}{task.lastActionAt && <p className=\"mt-1 text-[10px] text-slate-400\">{task.lastActionAt}</p>}</td>\n                      <td className=\"max-w-[300px] px-4 py-4 text-xs leading-6 text-slate-700\"><div className=\"flex items-center gap-1 font-black text-slate-800\"><History className=\"h-3.5 w-3.5\" />{task.historyCount.toLocaleString('ar-SA')} حدث</div><p className=\"mt-1 text-[10px] text-slate-500\">{task.latestHistory?.summary || 'لا يوجد سجل محفوظ'}</p></td>\n                      <td className=\"px-4 py-4\">{row.representative ? <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/control-indicators`)}>متابعة</Button> : <span className=\"text-[11px] text-red-600\">غير مرتبط</span>}</td>",
    'dashboard history table cell',
)
dash_path.write_text(dash, encoding='utf-8')

# Documentation.
doc = Path('docs/accounting-evidence-history.md')
doc.write_text('''# سجل تاريخ متابعة مستندات الإثبات\n\nتمت إضافة سجل زمني داخل كل عنصر من `evidenceChecklist` في `__propertyControlAnalysis`.\n\n## ما يسجله النظام\n- إنشاء مهمة متابعة لأول مرة.\n- تغيير حالة المستند.\n- تغيير الجهة أو المسؤول.\n- تغيير تاريخ الاستحقاق.\n- تغيير الأولوية.\n- تغيير حالة المتابعة.\n- تسجيل آخر إجراء.\n- رفع أو ربط مستند.\n- إقفال المهمة.\n- ملاحظات متابعة يضيفها المستخدم يدويًا.\n\n## أحداث النظام المشتقة\nيعرض الخط الزمني كذلك نقاطًا زمنية مشتقة من تاريخ الاستحقاق: دخول نطاق 7 أيام، بدء التأخير، والانتقال إلى المستوى الحرج. وتظل هذه النقاط قابلة للاستنتاج حتى بعد إقفال المهمة، استنادًا إلى تاريخ الإقفال المحفوظ.\n\n## العرض\n- صفحة مؤشرات السيطرة تعرض خطًا زمنيًا لكل مستند مع إضافة ملاحظات متابعة جديدة.\n- لوحة متابعة مستندات الإثبات تعرض عدد أحداث كل مهمة وآخر حدث.\n- تقرير الطباعة يتضمن ملخص السجل الزمني لكل مهمة.\n''', encoding='utf-8')

print('Accounting evidence history integration applied successfully.')
