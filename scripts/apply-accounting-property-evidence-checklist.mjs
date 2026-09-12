import fs from 'node:fs';

const pagePath = 'src/app/pages/AccountingPropertyControlIndicatorsPage.tsx';
const before = fs.readFileSync(pagePath, 'utf8');
let next = before;

const replaceOnce = (from, to, label) => {
  if (next.includes(to)) return;
  if (!next.includes(from)) throw new Error(`Anchor not found: ${label}`);
  next = next.replace(from, to);
};

replaceOnce(
  "  Save,\n  Scale,\n  ShieldCheck,",
  "  Save,\n  Scale,\n  ShieldCheck,\n  Upload,\n  ExternalLink,",
  'icons'
);

replaceOnce(
  "  getAccountingTransformationRecords,\n  updateAccountingTransformationRecord,",
  "  getAccountingTransformationRecords,\n  updateAccountingTransformationRecord,\n  uploadAccountingTransformationFile,",
  'api upload import'
);

replaceOnce(
  "import type { AccountingTransformationRecord } from '../../types/accountingTransformation';",
  "import type { AccountingTransformationAttachment, AccountingTransformationRecord } from '../../types/accountingTransformation';",
  'attachment type import'
);

replaceOnce(
  "import { findPropertyControlMemoProfile, memoProfileToAnalysisSeed } from '../config/accountingPropertyControlMemoProfiles';",
  "import { findPropertyControlMemoProfile, memoProfileToAnalysisSeed } from '../config/accountingPropertyControlMemoProfiles';\nimport {\n  findMatchingPropertyEvidenceAttachment,\n  getPropertyEvidenceRequirements,\n  type PropertyEvidenceStatus,\n} from '../config/accountingPropertyEvidenceRequirements';",
  'evidence helper import'
);

replaceOnce(
  "type AnalysisLevel = 'strong_needs_approval' | 'needs_more_study' | 'insufficient' | 'undetermined';\n\ntype ControlAnalysis = {",
  "type AnalysisLevel = 'strong_needs_approval' | 'needs_more_study' | 'insufficient' | 'undetermined';\ntype EvidenceChecklistEntry = {\n  status: PropertyEvidenceStatus;\n  attachmentKey?: string;\n  notes?: string;\n};\n\ntype ControlAnalysis = {",
  'evidence type'
);

replaceOnce(
  "  memoReferenceScore?: number;\n};",
  "  memoReferenceScore?: number;\n  evidenceChecklist?: Record<string, EvidenceChecklistEntry>;\n  evidenceCompletionPercent?: number;\n};",
  'control analysis evidence fields'
);

replaceOnce(
  "  const [query, setQuery] = useState('');",
  "  const [query, setQuery] = useState('');\n  const [attachments, setAttachments] = useState<AccountingTransformationAttachment[]>([]);\n  const [uploadingEvidenceKey, setUploadingEvidenceKey] = useState('');",
  'evidence state'
);

replaceOnce(
  "  useEffect(() => { setAnalysis(readAnalysis(selected)); }, [selected?.id]);",
  "  useEffect(() => {\n    setAnalysis(readAnalysis(selected));\n    setAttachments(Array.isArray(selected?.attachments) ? selected.attachments : []);\n  }, [selected?.id]);",
  'selected sync'
);

replaceOnce(
  "  const score = scoreAnalysis(analysis);\n  const memoReferenceScore = analysis.memoReferenceScore;",
  "  const score = scoreAnalysis(analysis);\n  const memoReferenceScore = analysis.memoReferenceScore;\n  const evidenceRequirements = useMemo(\n    () => getPropertyEvidenceRequirements(selectedMemoProfile?.id),\n    [selectedMemoProfile?.id]\n  );\n  const evidenceRows = useMemo(() => evidenceRequirements.map((requirement) => {\n    const saved = analysis.evidenceChecklist?.[requirement.key];\n    const autoAttachment = findMatchingPropertyEvidenceAttachment(requirement, attachments);\n    const linkedAttachment = saved?.attachmentKey\n      ? attachments.find((attachment) => (attachment.driveFileId || attachment.driveUrl) === saved.attachmentKey) || autoAttachment\n      : autoAttachment;\n    const status: PropertyEvidenceStatus = saved?.status || (linkedAttachment ? 'available' : 'missing');\n    return { requirement, saved, attachment: linkedAttachment, status };\n  }), [analysis.evidenceChecklist, attachments, evidenceRequirements]);\n  const evidenceCompletionPercent = evidenceRows.length\n    ? Math.round(evidenceRows.reduce((sum, row) => sum + (row.status === 'available' ? 1 : row.status === 'needs_update' ? 0.5 : 0), 0) / evidenceRows.length * 100)\n    : 0;",
  'evidence calculations'
);

replaceOnce(
  "  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {\n    setAnalysis((prev) => ({ ...prev, [key]: value }));\n  };\n\n  const save = async () => {",
  "  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {\n    setAnalysis((prev) => ({ ...prev, [key]: value }));\n  };\n\n  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {\n    setAnalysis((prev) => ({\n      ...prev,\n      evidenceChecklist: {\n        ...(prev.evidenceChecklist || {}),\n        [key]: { ...(prev.evidenceChecklist?.[key] || {}), status },\n      },\n    }));\n  };\n\n  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {\n    if (!file) return;\n    setUploadingEvidenceKey(key);\n    try {\n      const uploaded = await uploadAccountingTransformationFile(file);\n      const attachment: AccountingTransformationAttachment = {\n        ...uploaded,\n        title: uploaded.title || file.name,\n        documentPurpose: 'ownership_acquisition',\n        documentType: label,\n        notes: `مؤشرات السيطرة - ${label}`,\n      };\n      const attachmentKey = attachment.driveFileId || attachment.driveUrl;\n      setAttachments((current) => [...current, attachment]);\n      setAnalysis((prev) => ({\n        ...prev,\n        evidenceChecklist: {\n          ...(prev.evidenceChecklist || {}),\n          [key]: { ...(prev.evidenceChecklist?.[key] || {}), status: 'available', attachmentKey },\n        },\n      }));\n      toast.success(`تم رفع مستند: ${label}`);\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : 'تعذر رفع مستند الإثبات');\n    } finally {\n      setUploadingEvidenceKey('');\n    }\n  };\n\n  const save = async () => {",
  'evidence handlers'
);

replaceOnce(
  "      const nextAnalysis: ControlAnalysis = { ...analysis, updatedAt: new Date().toISOString() };",
  "      const computedDocumentCompleteness: DocumentCompleteness = evidenceRequirements.length\n        ? evidenceCompletionPercent >= 100\n          ? 'complete'\n          : evidenceCompletionPercent <= 0\n            ? 'missing'\n            : 'partial'\n        : analysis.documentCompleteness;\n      const nextAnalysis: ControlAnalysis = {\n        ...analysis,\n        documentCompleteness: computedDocumentCompleteness,\n        evidenceCompletionPercent,\n        updatedAt: new Date().toISOString(),\n      };",
  'save completeness'
);

replaceOnce(
  "        attachments: selected.attachments || [],",
  "        attachments,",
  'save attachments'
);

const memoCardEnd = `              </Card>\n\n            <Card className="rounded-[26px]">`;
const evidenceCard = `              </Card>\n\n            {selectedMemoProfile && (\n              <Card className="rounded-[26px] border-indigo-200 bg-indigo-50/35">\n                <CardHeader className="border-b border-indigo-100">\n                  <div className="flex flex-wrap items-center justify-between gap-3">\n                    <div>\n                      <CardTitle className="text-base">ملف مستندات الإثبات</CardTitle>\n                      <p className="mt-1 text-xs leading-6 text-slate-500">المتطلبات أدناه مستمدة من فجوات المستندات والإجراءات الواردة في مذكرة مؤشرات السيطرة. يمكن ربط مرفق موجود أو رفع مستند جديد ثم حفظ التحليل.</p>\n                    </div>\n                    <div className="min-w-[150px] rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-center">\n                      <p className="text-[10px] font-bold text-slate-500">نسبة اكتمال ملف الإثبات</p>\n                      <p className="mt-1 text-2xl font-black text-indigo-800">{evidenceCompletionPercent}%</p>\n                    </div>\n                  </div>\n                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-100">\n                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${evidenceCompletionPercent}%` }} />\n                  </div>\n                </CardHeader>\n                <CardContent className="space-y-3 p-4">\n                  {evidenceRows.map(({ requirement, attachment, status }) => (\n                    <div key={requirement.key} className="rounded-2xl border bg-white p-4 shadow-sm">\n                      <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-center">\n                        <div>\n                          <p className="font-black text-slate-900">{requirement.label}</p>\n                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{requirement.description}</p>\n                          {attachment && <p className="mt-2 text-[11px] font-bold text-emerald-700">المرفق المرتبط: {attachment.title}</p>}\n                          {!attachment && status === 'available' && <p className="mt-2 text-[11px] font-bold text-amber-700">الحالة «متوفر» ولكن لا يوجد ملف مرفوع مرتبط بهذه الخانة.</p>}\n                        </div>\n                        <NativeSelect value={status} onChange={(event) => setEvidenceStatus(requirement.key, event.target.value as PropertyEvidenceStatus)}>\n                          <option value="available">متوفر</option>\n                          <option value="needs_update">يحتاج تحديث</option>\n                          <option value="missing">ناقص</option>\n                        </NativeSelect>\n                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">\n                          {attachment?.driveUrl && (\n                            <Button type="button" size="sm" variant="outline" asChild>\n                              <a href={attachment.driveUrl} target="_blank" rel="noreferrer"><ExternalLink className="ml-1 h-4 w-4" />فتح</a>\n                            </Button>\n                          )}\n                          <label className="inline-flex cursor-pointer items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">\n                            <Upload className="ml-1 h-4 w-4" />\n                            {uploadingEvidenceKey === requirement.key ? 'جارٍ الرفع...' : attachment ? 'استبدال / إضافة' : 'رفع المستند'}\n                            <input\n                              type="file"\n                              className="hidden"\n                              disabled={Boolean(uploadingEvidenceKey)}\n                              onChange={(event) => {\n                                const file = event.target.files?.[0];\n                                void handleEvidenceUpload(requirement.key, requirement.label, file);\n                                event.currentTarget.value = '';\n                              }}\n                            />\n                          </label>\n                        </div>\n                      </div>\n                    </div>\n                  ))}\n                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-6 text-slate-600">طريقة الاحتساب: «متوفر» = 100% من وزن المتطلب، «يحتاج تحديث» = 50%، «ناقص» = 0%. وتتحول حالة اكتمال المستندات في التحليل تلقائيًا إلى مكتملة أو جزئية أو مفقودة عند الحفظ.</p>\n                </CardContent>\n              </Card>\n            )}\n\n            <Card className="rounded-[26px]">`;
replaceOnce(memoCardEnd, evidenceCard, 'evidence card insertion');

fs.writeFileSync(pagePath, next);
console.log('Property evidence checklist integrated.');
