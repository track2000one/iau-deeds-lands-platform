from pathlib import Path

PATH = Path('src/app/pages/AccountingPropertyControlIndicatorsPage.tsx')
text = PATH.read_text(encoding='utf-8')

def replace_once(old: str, new: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, got {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)

replace_once(
"import type { AccountingTransformationAttachment, AccountingTransformationRecord } from '../../types/accountingTransformation';\n",
"import type { AccountingTransformationAttachment, AccountingTransformationRecord } from '../../types/accountingTransformation';\nimport { usePermissions } from '../../context/PermissionsContext';\nimport { MODULE_LABELS } from '../../types/permissions';\n"
)

replace_once(
"  appendEvidenceHistoryFromChanges,\n  createEvidenceHistoryEvent,\n  mergeEvidenceHistory,\n  type EvidenceHistoryEvent,\n",
"  appendEvidenceHistoryEvent,\n  appendEvidenceHistoryFromChanges,\n  createEvidenceHistoryEvent,\n  mergeEvidenceHistory,\n  type EvidenceAuditActor,\n  type EvidenceHistoryEvent,\n"
)

replace_once(
"export const AccountingPropertyControlIndicatorsPage: React.FC = () => {\n  const navigate = useNavigate();\n",
"export const AccountingPropertyControlIndicatorsPage: React.FC = () => {\n  const navigate = useNavigate();\n  const { isAdmin, hasPermission, userProfile } = usePermissions();\n  const canEdit = isAdmin || hasPermission('accounting_transformation', 'canEdit');\n  const auditActor = useMemo<EvidenceAuditActor>(() => ({\n    userId: userProfile?.uid,\n    username: userProfile?.username || userProfile?.email || 'مستخدم المنصة',\n    email: userProfile?.email,\n    role: userProfile?.role,\n    roleLabel: userProfile?.role === 'admin' ? 'مدير النظام' : userProfile?.role === 'employee' ? 'موظف' : 'غير محدد',\n    contextLabel: MODULE_LABELS.accounting_transformation,\n  }), [userProfile]);\n"
)

replace_once(
"  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {\n    setAnalysis((prev) => ({ ...prev, [key]: value }));\n  };\n\n  const setEvidenceEntry = (key: string, patch: Partial<EvidenceChecklistEntry>) => {\n    setAnalysis((prev) => ({\n",
"  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {\n    if (!canEdit) return;\n    setAnalysis((prev) => ({ ...prev, [key]: value }));\n  };\n\n  const setEvidenceEntry = (key: string, patch: Partial<EvidenceChecklistEntry>) => {\n    if (!canEdit) return;\n    setAnalysis((prev) => ({\n"
)

replace_once(
"  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {\n    setAnalysis((prev) => {\n",
"  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {\n    if (!canEdit) return;\n    setAnalysis((prev) => {\n"
)

replace_once(
"  const addEvidenceHistoryNote = (key: string) => {\n    const summary = (historyNoteDrafts[key] || '').trim();\n    if (!summary) { toast.error('اكتب تفاصيل المتابعة أولًا'); return; }\n    setAnalysis((prev) => {\n      const current = prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus };\n      return {\n        ...prev,\n        evidenceChecklist: {\n          ...(prev.evidenceChecklist || {}),\n          [key]: {\n            ...current,\n            history: [...(current.history || []), createEvidenceHistoryEvent('note', summary)],\n          },\n        },\n      };\n    });\n",
"  const addEvidenceHistoryNote = (key: string) => {\n    if (!canEdit) { toast.error('ليس لديك صلاحية تعديل سجل التحول المحاسبي'); return; }\n    const summary = (historyNoteDrafts[key] || '').trim();\n    if (!summary) { toast.error('اكتب تفاصيل المتابعة أولًا'); return; }\n    setAnalysis((prev) => {\n      const current = prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus };\n      return {\n        ...prev,\n        evidenceChecklist: {\n          ...(prev.evidenceChecklist || {}),\n          [key]: appendEvidenceHistoryEvent(current, createEvidenceHistoryEvent('note', summary, { actor: auditActor })),\n        },\n      };\n    });\n"
)

replace_once(
"  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {\n    if (!file) return;\n",
"  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {\n    if (!canEdit) { toast.error('ليس لديك صلاحية تعديل سجل التحول المحاسبي'); return; }\n    if (!file) return;\n"
)

replace_once(
"  const save = async () => {\n    if (!selected) return;\n",
"  const save = async () => {\n    if (!canEdit) { toast.error('ليس لديك صلاحية تعديل سجل التحول المحاسبي'); return; }\n    if (!selected) return;\n"
)

replace_once(
"          appendEvidenceHistoryFromChanges(savedAnalysis.evidenceChecklist?.[key], entry, historyAt),\n",
"          appendEvidenceHistoryFromChanges(savedAnalysis.evidenceChecklist?.[key], entry, historyAt, auditActor),\n"
)

replace_once(
"              <Badge variant=\"outline\" className=\"border-amber-200/30 bg-amber-200/10 text-amber-50\">النتيجة استرشادية وليست اعتمادًا نهائيًا</Badge>\n",
"              <Badge variant=\"outline\" className=\"border-amber-200/30 bg-amber-200/10 text-amber-50\">النتيجة استرشادية وليست اعتمادًا نهائيًا</Badge>\n              <Badge variant=\"outline\" className=\"border-emerald-200/30 bg-emerald-200/10 text-emerald-50\">سجل رقابي: {auditActor.username} · {auditActor.roleLabel}</Badge>\n"
)

replace_once(
"                        <NativeSelect value={status} onChange={(event) => setEvidenceStatus(requirement.key, event.target.value as PropertyEvidenceStatus)}>\n",
"                        <NativeSelect value={status} disabled={!canEdit} onChange={(event) => setEvidenceStatus(requirement.key, event.target.value as PropertyEvidenceStatus)}>\n"
)

replace_once(
"                              disabled={Boolean(uploadingEvidenceKey)}\n",
"                              disabled={Boolean(uploadingEvidenceKey) || !canEdit}\n"
)

replace_once(
"                                value={historyNoteDrafts[requirement.key] || ''}\n                                onChange={(event) => setHistoryNoteDrafts((prev) => ({ ...prev, [requirement.key]: event.target.value }))}\n",
"                                value={historyNoteDrafts[requirement.key] || ''}\n                                disabled={!canEdit}\n                                onChange={(event) => setHistoryNoteDrafts((prev) => ({ ...prev, [requirement.key]: event.target.value }))}\n"
)

replace_once(
"                              <Button type=\"button\" size=\"sm\" onClick={() => addEvidenceHistoryNote(requirement.key)}>\n",
"                              <Button type=\"button\" size=\"sm\" disabled={!canEdit} onClick={() => addEvidenceHistoryNote(requirement.key)}>\n"
)

replace_once(
"                          <div className=\"mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3\">\n                            <div className=\"grid gap-2 sm:grid-cols-[1fr_auto]\">\n",
"                          <div className=\"mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3\">\n                            <div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\">\n                              <p className=\"text-[11px] font-bold text-slate-600\">سجل رقابي للقراءة فقط؛ الأحداث السابقة لا يمكن تعديلها أو حذفها من الواجهة.</p>\n                              <Badge variant=\"outline\" className=\"border-slate-300 bg-white text-slate-700\">{auditActor.username} · {auditActor.roleLabel}</Badge>\n                            </div>\n                            <div className=\"grid gap-2 sm:grid-cols-[1fr_auto]\">\n"
)

replace_once(
"                                    <p className=\"mt-1 text-[10px] text-slate-500\">{new Date(event.at).toLocaleString('ar-SA')} · {event.actor || 'مستخدم المنصة'}</p>\n",
"                                    <p className=\"mt-1 text-[10px] text-slate-500\">{new Date(event.at).toLocaleString('ar-SA')} · {event.actor || 'مستخدم المنصة'}{event.actorRoleLabel ? ` · ${event.actorRoleLabel}` : ''}</p>\n                                    {(event.actorEmail || event.actorContext) && <p className=\"mt-1 text-[10px] text-slate-400\">{[event.actorEmail, event.actorContext].filter(Boolean).join(' · ')}</p>}\n"
)

# The save button has one direct saving-only guard on this page.
if 'disabled={saving}' in text:
    text = text.replace('disabled={saving}', 'disabled={saving || !canEdit}', 1)
else:
    raise SystemExit('Save button disabled={saving} marker not found')

PATH.write_text(text, encoding='utf-8')

# Documentation clarifies exactly what identity data exists today.
doc = Path('docs/accounting-evidence-user-audit.md')
doc.write_text('''# سجل التدقيق لمستندات الإثبات\n\n- ترتبط أحداث المتابعة بهوية المستخدم المسجل في المنصة: `uid` واسم المستخدم والبريد الإلكتروني والدور.\n- لا يحتوي نموذج المستخدم الحالي على مسمى وظيفي أو إدارة/جهة تنظيمية؛ لذلك يسجل النظام سياق العملية التشغيلي باسم «لجنة متابعة متطلبات التحول المحاسبي» ولا يفترض بيانات موارد بشرية غير موجودة.\n- الصلاحية المطلوبة لتعديل التحليل أو مستندات الإثبات هي `accounting_transformation.canEdit`، بينما يبقى سجل الأحداث متاحًا للعرض وفق صلاحية الدخول إلى الوحدة.\n- سجل `history` أصبح append-only على مستوى مسار الواجهة/الدومين: عند وجود تاريخ سابق لا يقبل helper استبداله من `next.history`، ولا توفر الواجهة أزرار تعديل أو حذف للأحداث السابقة.\n- الأحداث الآلية (قريب الاستحقاق/متأخر/حرج) موسومة كمصدر `system`، والأحداث البشرية موسومة كمصدر `user` مع لقطة هوية المنفذ وقت الحدث.\n- هذه الحماية تمنع التعديل عبر مسار الاستخدام المعتاد. عدم القابلية للتحريف على مستوى قاعدة البيانات نفسها يتطلب فرض قاعدة append-only في API/الخادم الخاص بـ accounting-transformation عند إتاحة مصدره الخلفي ضمن المستودع.\n''', encoding='utf-8')
