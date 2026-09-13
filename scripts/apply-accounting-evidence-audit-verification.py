from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Anchor not found: {label}')
    return text.replace(old, new, 1)

# 1) Persisted event type: expose server timestamp stamped by the backend.
history_path = Path('src/app/config/accountingPropertyEvidenceHistory.ts')
history = history_path.read_text(encoding='utf-8')
history = replace_once(
    history,
    "  source?: 'user' | 'system';\n  summary: string;",
    "  source?: 'user' | 'system';\n  serverRecordedAt?: string;\n  summary: string;",
    'EvidenceHistoryEvent serverRecordedAt',
)
history_path.write_text(history, encoding='utf-8')

# 2) Add a least-privilege API client for the dedicated accounting evidence mirror endpoint.
api_path = Path('src/app/api/accountingTransformation.ts')
api = api_path.read_text(encoding='utf-8')
api_types = """export type AccountingEvidenceAuditMirrorItem = {
  id: string;
  userId?: string | null;
  username?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  module: string;
  entity?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  status: string;
  description?: string | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AccountingEvidenceAuditMirrorPage = {
  items: AccountingEvidenceAuditMirrorItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  truncated?: boolean;
  readOnly?: boolean;
  source?: string;
};

"""
api = replace_once(api, 'export type AccountingTransformationImportPreview = {', api_types + 'export type AccountingTransformationImportPreview = {', 'mirror API types')
api = replace_once(
    api,
    "export const getAccountingTransformationRecord = (id: string) => apiJson<AccountingTransformationRecord>(`/api/accounting-transformation/${id}`);",
    "export const getAccountingEvidenceAuditMirror = () => apiJson<AccountingEvidenceAuditMirrorPage>('/api/accounting-transformation/evidence-audit-log?all=1');\n\nexport const getAccountingTransformationRecord = (id: string) => apiJson<AccountingTransformationRecord>(`/api/accounting-transformation/${id}`);",
    'mirror API function',
)
api_path.write_text(api, encoding='utf-8')

# 3) Connect the central evidence-audit page to the backend mirror and show verification state.
page_path = Path('src/app/pages/AccountingPropertyEvidenceAuditPage.tsx')
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    "import { getAccountingTransformationRecords } from '../api/accountingTransformation';",
    "import {\n  getAccountingEvidenceAuditMirror,\n  getAccountingTransformationRecords,\n  type AccountingEvidenceAuditMirrorItem,\n} from '../api/accountingTransformation';",
    'audit page API import',
)
page = replace_once(
    page,
    "  escalation: EvidenceEscalationLevel;\n};",
    "  escalation: EvidenceEscalationLevel;\n  storedEvent: boolean;\n  verificationStatus: VerificationStatus;\n  serverRecordedAt?: string;\n  auditLogId?: string;\n};",
    'AuditRow verification fields',
)
page = replace_once(
    page,
    "type SourceFilter = 'all' | 'user' | 'system';\ntype EscalationFilter = 'all' | EvidenceEscalationLevel;",
    "type SourceFilter = 'all' | 'user' | 'system';\ntype EscalationFilter = 'all' | EvidenceEscalationLevel;\ntype VerificationStatus = 'verified' | 'missing' | 'mismatch' | 'derived' | 'unavailable';\ntype VerificationFilter = 'all' | VerificationStatus;\n\nconst verificationLabels: Record<VerificationStatus, string> = {\n  verified: 'موثّق بالخادم',\n  missing: 'لا توجد نسخة مرآة',\n  mismatch: 'اختلاف يحتاج مراجعة',\n  derived: 'حدث نظامي محسوب',\n  unavailable: 'تعذر التحقق من الخادم',\n};",
    'verification types',
)
page = replace_once(
    page,
    "const eventTone = (type: EvidenceHistoryEventType) => {\n  if (type === 'closed' || type === 'attachment_uploaded') return 'border-emerald-200 bg-emerald-50 text-emerald-800';\n  if (type === 'status_changed' || type === 'follow_up_status_changed') return 'border-sky-200 bg-sky-50 text-sky-800';\n  if (type === 'due_date_changed' || type === 'priority_changed') return 'border-amber-200 bg-amber-50 text-amber-800';\n  return 'border-slate-200 bg-white text-slate-700';\n};",
    "const eventTone = (type: EvidenceHistoryEventType) => {\n  if (type === 'closed' || type === 'attachment_uploaded') return 'border-emerald-200 bg-emerald-50 text-emerald-800';\n  if (type === 'status_changed' || type === 'follow_up_status_changed') return 'border-sky-200 bg-sky-50 text-sky-800';\n  if (type === 'due_date_changed' || type === 'priority_changed') return 'border-amber-200 bg-amber-50 text-amber-800';\n  return 'border-slate-200 bg-white text-slate-700';\n};\n\nconst verificationTone = (value: VerificationStatus) => {\n  if (value === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';\n  if (value === 'missing' || value === 'mismatch') return 'border-red-200 bg-red-50 text-red-800';\n  if (value === 'derived') return 'border-sky-200 bg-sky-50 text-sky-800';\n  return 'border-amber-200 bg-amber-50 text-amber-800';\n};\n\nconst objectValue = (value: unknown): Record<string, unknown> =>\n  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};\n\nconst mirrorMatchesEvent = (event: EvidenceHistoryEvent, requirementKey: string, mirror: AccountingEvidenceAuditMirrorItem) => {\n  const data = objectValue(mirror.newData);\n  const metadata = objectValue(mirror.metadata);\n  const mirrorRequirement = String(data.requirementKey ?? metadata.requirementKey ?? '');\n  const coreMatches = String(data.id ?? '') === event.id\n    && String(data.type ?? '') === event.type\n    && String(data.at ?? '') === event.at\n    && String(data.summary ?? '') === event.summary\n    && mirrorRequirement === requirementKey;\n  if (!coreMatches) return false;\n\n  const optionalPairs: Array<[unknown, unknown]> = [\n    [event.actorUserId, data.actorUserId],\n    [event.actorEmail, data.actorEmail],\n    [event.actorRole, data.actorRole],\n    [event.serverRecordedAt, data.serverRecordedAt ?? metadata.serverRecordedAt],\n  ];\n  return optionalPairs.every(([expected, actual]) => !expected || String(expected) === String(actual ?? ''));\n};",
    'verification helpers',
)
page = replace_once(
    page,
    "  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);\n  const [loading, setLoading] = useState(true);",
    "  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);\n  const [auditMirror, setAuditMirror] = useState<AccountingEvidenceAuditMirrorItem[]>([]);\n  const [mirrorConnected, setMirrorConnected] = useState(false);\n  const [loading, setLoading] = useState(true);",
    'mirror state',
)
page = replace_once(
    page,
    "  const [escalationFilter, setEscalationFilter] = useState<EscalationFilter>('all');\n  const [dateFrom, setDateFrom] = useState('');",
    "  const [escalationFilter, setEscalationFilter] = useState<EscalationFilter>('all');\n  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');\n  const [dateFrom, setDateFrom] = useState('');",
    'verification filter state',
)
old_load = """  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      setRecords([...(buildings.items || []), ...(lands.items || [])]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل السجل الرقابي لمستندات الإثبات');
    } finally {
      setLoading(false);
    }
  };
"""
new_load = """  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      setRecords([...(buildings.items || []), ...(lands.items || [])]);

      try {
        const mirror = await getAccountingEvidenceAuditMirror();
        setAuditMirror(mirror.items || []);
        setMirrorConnected(true);
        if (mirror.truncated) toast.warning('تم الوصول إلى الحد الأعلى لسجل الخادم؛ بعض الأحداث الأقدم قد لا تظهر في التحقق الحالي.');
      } catch (mirrorError) {
        setAuditMirror([]);
        setMirrorConnected(false);
        toast.warning(mirrorError instanceof Error ? `تم تحميل الأحداث، لكن تعذر التحقق من سجل الخادم: ${mirrorError.message}` : 'تم تحميل الأحداث، لكن تعذر التحقق من سجل الخادم.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل السجل الرقابي لمستندات الإثبات');
    } finally {
      setLoading(false);
    }
  };
"""
page = replace_once(page, old_load, new_load, 'load mirror data')
page = replace_once(
    page,
    "  useEffect(() => { void load(); }, []);\n\n  const auditRows = useMemo(() => {",
    "  useEffect(() => { void load(); }, []);\n\n  const mirrorByEntityId = useMemo(() => new Map(\n    auditMirror.filter((item) => item.entityId).map((item) => [String(item.entityId), item])\n  ), [auditMirror]);\n\n  const auditRows = useMemo(() => {",
    'mirror map',
)
old_event_loop = """      mergeEvidenceHistory({ ...task.entry, status, followUpStatus }).forEach((event) => {
        const source = event.source || (event.actor === 'النظام' ? 'system' : 'user');
        rows.push({
          ...event,
          source,
          rowKey: `${task.profileId}:${task.requirementKey}:${event.id}`,
          profileId: task.profileId,
          propertyTitle: task.propertyTitle,
          requirementKey: task.requirementKey,
          requirementLabel: task.requirementLabel,
          recordId: task.record.id,
          recordNumber: task.record.recordNumber || '-',
          assetDescription: task.record.assetDescription || task.propertyTitle,
          responsible: task.entry.responsibleParty || 'غير محدد',
          dueDate: task.entry.dueDate,
          evidenceStatus: status,
          followUpStatus,
          escalation,
        });
      });
"""
new_event_loop = """      const storedIds = new Set((task.entry.history || []).map((event) => event.id));
      mergeEvidenceHistory({ ...task.entry, status, followUpStatus }).forEach((event) => {
        const source = event.source || (event.actor === 'النظام' ? 'system' : 'user');
        const storedEvent = storedIds.has(event.id);
        const mirror = storedEvent ? mirrorByEntityId.get(`${task.record.id}:${event.id}`) : undefined;
        const mirrorData = objectValue(mirror?.newData);
        const mirrorMetadata = objectValue(mirror?.metadata);
        const verificationStatus: VerificationStatus = !storedEvent
          ? 'derived'
          : !mirrorConnected
            ? 'unavailable'
            : !mirror
              ? 'missing'
              : mirrorMatchesEvent(event, task.requirementKey, mirror)
                ? 'verified'
                : 'mismatch';
        rows.push({
          ...event,
          source,
          rowKey: `${task.profileId}:${task.requirementKey}:${event.id}`,
          profileId: task.profileId,
          propertyTitle: task.propertyTitle,
          requirementKey: task.requirementKey,
          requirementLabel: task.requirementLabel,
          recordId: task.record.id,
          recordNumber: task.record.recordNumber || '-',
          assetDescription: task.record.assetDescription || task.propertyTitle,
          responsible: task.entry.responsibleParty || 'غير محدد',
          dueDate: task.entry.dueDate,
          evidenceStatus: status,
          followUpStatus,
          escalation,
          storedEvent,
          verificationStatus,
          serverRecordedAt: event.serverRecordedAt || String(mirrorData.serverRecordedAt ?? mirrorMetadata.serverRecordedAt ?? mirror?.createdAt ?? '') || undefined,
          auditLogId: mirror?.id,
        });
      });
"""
page = replace_once(page, old_event_loop, new_event_loop, 'verification during audit row build')
page = replace_once(page, '  }, [records]);', '  }, [records, mirrorByEntityId, mirrorConnected]);', 'auditRows dependencies')
page = replace_once(
    page,
    "      if (escalationFilter !== 'all' && row.escalation !== escalationFilter) return false;\n      if (fromTime !== null && eventTime < fromTime) return false;",
    "      if (escalationFilter !== 'all' && row.escalation !== escalationFilter) return false;\n      if (verificationFilter !== 'all' && row.verificationStatus !== verificationFilter) return false;\n      if (fromTime !== null && eventTime < fromTime) return false;",
    'verification filtering',
)
page = replace_once(
    page,
    "  }, [auditRows, query, profileFilter, actorFilter, eventTypeFilter, sourceFilter, escalationFilter, dateFrom, dateTo]);",
    "  }, [auditRows, query, profileFilter, actorFilter, eventTypeFilter, sourceFilter, escalationFilter, verificationFilter, dateFrom, dateTo]);",
    'filteredRows dependencies',
)
page = replace_once(
    page,
    "  const userEvents = filteredRows.filter((row) => row.source === 'user').length;\n  const systemEvents = filteredRows.filter((row) => row.source === 'system').length;",
    "  const verifiedEvents = filteredRows.filter((row) => row.verificationStatus === 'verified').length;\n  const integrityIssues = filteredRows.filter((row) => row.verificationStatus === 'missing' || row.verificationStatus === 'mismatch').length;\n  const systemEvents = filteredRows.filter((row) => row.source === 'system').length;",
    'verification counters',
)
page = replace_once(
    page,
    "    setEscalationFilter('all');\n    setDateFrom('');",
    "    setEscalationFilter('all');\n    setVerificationFilter('all');\n    setDateFrom('');",
    'reset verification filter',
)
page = replace_once(
    page,
    "      'تاريخ الاستحقاق', 'حالة المهمة الحالية', 'رقم السجل',",
    "      'تاريخ الاستحقاق', 'حالة المهمة الحالية', 'رقم السجل', 'حالة التحقق من الخادم', 'وقت التسجيل بالخادم', 'معرف AuditLog',",
    'CSV header verification',
)
page = replace_once(
    page,
    "        EVIDENCE_ESCALATION_LABELS[row.escalation],\n        row.recordNumber,",
    "        EVIDENCE_ESCALATION_LABELS[row.escalation],\n        row.recordNumber,\n        verificationLabels[row.verificationStatus],\n        row.serverRecordedAt ? new Date(row.serverRecordedAt).toLocaleString('ar-SA') : '',\n        row.auditLogId || '',",
    'CSV verification values',
)
page = replace_once(
    page,
    "              <Badge variant=\"outline\" className=\"border-emerald-200/30 bg-emerald-200/10 text-emerald-50\">سجل للقراءة والتتبع الرقابي</Badge>",
    "              <Badge variant=\"outline\" className=\"border-emerald-200/30 bg-emerald-200/10 text-emerald-50\">سجل للقراءة والتتبع الرقابي</Badge>\n              <Badge variant=\"outline\" className={mirrorConnected ? 'border-emerald-200/30 bg-emerald-200/10 text-emerald-50' : 'border-amber-200/30 bg-amber-200/10 text-amber-50'}>{mirrorConnected ? 'متصل بنسخة AuditLog على الخادم' : 'التحقق من الخادم غير متاح'}</Badge>",
    'server connection badge',
)
page = replace_once(page, '      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">', '      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">', 'summary grid columns')
page = replace_once(
    page,
    "          ['الأحداث المطابقة', filteredRows.length, History, 'text-blue-700'],\n          ['أحداث المستخدمين', userEvents, UserRound, 'text-emerald-700'],\n          ['أحداث النظام', systemEvents, Bot, 'text-slate-700'],",
    "          ['الأحداث المطابقة', filteredRows.length, History, 'text-blue-700'],\n          ['موثقة بالخادم', verifiedEvents, ShieldCheck, 'text-emerald-700'],\n          ['تحتاج تحقق', integrityIssues, AlertTriangle, 'text-red-700'],\n          ['أحداث النظام', systemEvents, Bot, 'text-slate-700'],",
    'summary verification cards',
)
page = replace_once(
    page,
    "          <NativeSelect value={escalationFilter} onChange={(event) => setEscalationFilter(event.target.value as EscalationFilter)}><option value=\"all\">كل حالات المهمة</option><option value=\"normal\">ضمن المدة / بدون تصعيد</option><option value=\"due_soon\">قريب الاستحقاق</option><option value=\"overdue\">متأخر</option><option value=\"critical\">حرج</option></NativeSelect>",
    "          <NativeSelect value={escalationFilter} onChange={(event) => setEscalationFilter(event.target.value as EscalationFilter)}><option value=\"all\">كل حالات المهمة</option><option value=\"normal\">ضمن المدة / بدون تصعيد</option><option value=\"due_soon\">قريب الاستحقاق</option><option value=\"overdue\">متأخر</option><option value=\"critical\">حرج</option></NativeSelect>\n          <NativeSelect value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value as VerificationFilter)}><option value=\"all\">كل حالات التحقق</option><option value=\"verified\">موثّق بالخادم</option><option value=\"missing\">لا توجد نسخة مرآة</option><option value=\"mismatch\">اختلاف يحتاج مراجعة</option><option value=\"derived\">حدث نظامي محسوب</option><option value=\"unavailable\">تعذر التحقق من الخادم</option></NativeSelect>",
    'verification filter control',
)
page = replace_once(page, '<table className="w-full min-w-[1180px] text-right text-xs">', '<table className="w-full min-w-[1400px] text-right text-xs">', 'table width')
page = replace_once(
    page,
    '<thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">العقار / المتطلب</th><th className="p-3">نوع الحدث</th><th className="p-3">التفاصيل</th><th className="p-3">المنفذ</th><th className="p-3">حالة المهمة</th><th className="audit-no-print p-3">إجراء</th></tr></thead>',
    '<thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">العقار / المتطلب</th><th className="p-3">نوع الحدث</th><th className="p-3">التفاصيل</th><th className="p-3">المنفذ</th><th className="p-3">التحقق / تسجيل الخادم</th><th className="p-3">حالة المهمة</th><th className="audit-no-print p-3">إجراء</th></tr></thead>',
    'verification table header',
)
page = replace_once(
    page,
    "                      <td className=\"p-3\"><div className=\"flex items-center gap-2\"><div className=\"grid h-8 w-8 place-items-center rounded-xl border bg-white\">{row.source === 'system' ? <Bot className=\"h-4 w-4 text-slate-600\" /> : <UserRound className=\"h-4 w-4 text-blue-700\" />}</div><div><p className=\"font-bold text-slate-900\">{row.actor || (row.source === 'system' ? 'النظام' : 'مستخدم المنصة')}</p><p className=\"mt-0.5 text-[10px] text-slate-500\">{row.actorRoleLabel || row.actorEmail || (row.source === 'system' ? 'حدث آلي' : '-')}</p></div></div></td>\n                      <td className=\"p-3\"><Badge variant=\"outline\" className={escalationTone(row.escalation)}>{EVIDENCE_ESCALATION_LABELS[row.escalation]}</Badge>",
    "                      <td className=\"p-3\"><div className=\"flex items-center gap-2\"><div className=\"grid h-8 w-8 place-items-center rounded-xl border bg-white\">{row.source === 'system' ? <Bot className=\"h-4 w-4 text-slate-600\" /> : <UserRound className=\"h-4 w-4 text-blue-700\" />}</div><div><p className=\"font-bold text-slate-900\">{row.actor || (row.source === 'system' ? 'النظام' : 'مستخدم المنصة')}</p><p className=\"mt-0.5 text-[10px] text-slate-500\">{row.actorRoleLabel || row.actorEmail || (row.source === 'system' ? 'حدث آلي' : '-')}</p></div></div></td>\n                      <td className=\"p-3\"><Badge variant=\"outline\" className={verificationTone(row.verificationStatus)}>{verificationLabels[row.verificationStatus]}</Badge><p className=\"mt-2 text-[10px] leading-5 text-slate-500\">{row.serverRecordedAt ? `الخادم: ${new Date(row.serverRecordedAt).toLocaleString('ar-SA')}` : row.verificationStatus === 'derived' ? 'غير مطلوب للأحداث المحسوبة' : '-'}</p></td>\n                      <td className=\"p-3\"><Badge variant=\"outline\" className={escalationTone(row.escalation)}>{EVIDENCE_ESCALATION_LABELS[row.escalation]}</Badge>",
    'verification table cell',
)
page = replace_once(
    page,
    "            <div className=\"rounded-2xl border bg-white p-3\"><p className=\"text-[10px] font-bold text-slate-500\">UID</p><p className=\"mt-1 break-all font-mono text-xs text-slate-800\">{selected.actorUserId || '-'}</p></div>",
    "            <div className=\"rounded-2xl border bg-white p-3\"><p className=\"text-[10px] font-bold text-slate-500\">حالة التحقق من الخادم</p><Badge variant=\"outline\" className={`mt-2 ${verificationTone(selected.verificationStatus)}`}>{verificationLabels[selected.verificationStatus]}</Badge></div>\n            <div className=\"rounded-2xl border bg-white p-3\"><p className=\"text-[10px] font-bold text-slate-500\">وقت التسجيل بالخادم</p><p className=\"mt-1 font-bold text-slate-900\">{selected.serverRecordedAt ? new Date(selected.serverRecordedAt).toLocaleString('ar-SA') : '-'}</p></div>\n            <div className=\"rounded-2xl border bg-white p-3 md:col-span-2\"><p className=\"text-[10px] font-bold text-slate-500\">معرف نسخة AuditLog</p><p className=\"mt-1 break-all font-mono text-xs text-slate-800\">{selected.auditLogId || '-'}</p></div>\n            <div className=\"rounded-2xl border bg-white p-3\"><p className=\"text-[10px] font-bold text-slate-500\">UID</p><p className=\"mt-1 break-all font-mono text-xs text-slate-800\">{selected.actorUserId || '-'}</p></div>",
    'verification detail cards',
)
page = replace_once(
    page,
    "هذا السجل يجمع أحداث Audit Trail المحفوظة في سجلات مؤشرات السيطرة مع أحداث التصعيد النظامية المحسوبة. لا يقدم وظائف تعديل أو حذف للأحداث السابقة. التصدير والطباعة يطبقان الفلاتر الحالية الظاهرة في الصفحة.",
    "هذا السجل يطابق أحداث Audit Trail المحفوظة في سجلات مؤشرات السيطرة مع النسخة المرآة المحفوظة في AuditLog على الخادم. تظهر الأحداث النظامية المحسوبة كأحداث مشتقة لا تتطلب نسخة مرآة، بينما تُعلّم أي حالة فقد أو اختلاف لمراجعتها. لا تقدم الصفحة وظائف تعديل أو حذف للأحداث السابقة.",
    'footer audit explanation',
)
page_path.write_text(page, encoding='utf-8')

print('Accounting evidence audit verification integration applied.')
