import fs from 'node:fs';

const path = 'src/app/pages/ArchivePage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (name, before, after) => {
  if (source.includes(after)) {
    console.log(`${name}: already applied`);
    return;
  }
  if (!source.includes(before)) throw new Error(`${name}: target not found`);
  source = source.replace(before, after);
  console.log(`${name}: applied`);
};

replaceOnce(
  'report icon imports',
  `  CalendarDays,\n  Tags,\n} from 'lucide-react';`,
  `  CalendarDays,\n  Tags,\n  FileDown,\n  ShieldCheck,\n  AlertTriangle,\n  Copy,\n} from 'lucide-react';`,
);

replaceOnce(
  'reports component import',
  `import { AttachmentPreviewCard } from '../components/AttachmentPreview';`,
  `import { AttachmentPreviewCard } from '../components/AttachmentPreview';\nimport { ArchiveReportsDialog } from '../components/ArchiveReportsDialog';`,
);

replaceOnce(
  'archive quality helpers',
  `const getArchiveFileTypeLabel = (doc: ArchiveDocument) => {`,
  `const getArchiveReference = (doc: ArchiveDocument) =>\n  \`ARC-\${String(doc.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || '00000000'}\`;\n\nconst getArchiveMissingMetadata = (doc: ArchiveDocument) => {\n  const missing: string[] = [];\n  if (!String(doc.documentNumber || '').trim()) missing.push('رقم المستند');\n  if (!String(doc.documentDate || '').trim()) missing.push('تاريخ المستند');\n  if (!String(doc.issuingAuthority || '').trim()) missing.push('الجهة / المصدر');\n  if (!String(doc.tags || '').trim()) missing.push('الكلمات المفتاحية');\n  if (!String(doc.description || '').trim()) missing.push('الوصف');\n  if (!String(doc.driveUrl || '').trim()) missing.push('رابط الملف');\n  return missing;\n};\n\nconst getArchiveFileTypeLabel = (doc: ArchiveDocument) => {`,
);

replaceOnce(
  'permissions hook',
  `  const { isAdmin } = usePermissions();`,
  `  const { isAdmin, hasPermission } = usePermissions();\n  const canAdd = isAdmin || hasPermission('archive', 'canAdd');\n  const canEdit = isAdmin || hasPermission('archive', 'canEdit');\n  const canDelete = isAdmin || hasPermission('archive', 'canDelete');\n  const canPrint = isAdmin || hasPermission('archive', 'canPrint');`,
);

replaceOnce(
  'reports state',
  `  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);`,
  `  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);\n  const [reportsOpen, setReportsOpen] = useState(false);`,
);

replaceOnce(
  'quality metrics',
  `  const totalSize = useMemo(() => documents.reduce((sum, doc) => sum + Number(doc.fileSize || 0), 0), [documents]);\n  const availableCategories = useMemo(() => Array.from(new Set([...categories, ...documents.map((doc) => doc.category).filter(Boolean)])), [documents]);`,
  `  const totalSize = useMemo(() => documents.reduce((sum, doc) => sum + Number(doc.fileSize || 0), 0), [documents]);\n  const availableCategories = useMemo(() => Array.from(new Set([...categories, ...documents.map((doc) => doc.category).filter(Boolean)])), [documents]);\n  const archiveQuality = useMemo(() => {\n    const numberCounts = new Map<string, number>();\n    documents.forEach((doc) => {\n      const value = String(doc.documentNumber || '').trim().toLowerCase();\n      if (value) numberCounts.set(value, (numberCounts.get(value) || 0) + 1);\n    });\n    const duplicateNumbers = new Set(\n      Array.from(numberCounts.entries()).filter(([, count]) => count > 1).map(([value]) => value),\n    );\n    const incomplete = documents.filter((doc) => getArchiveMissingMetadata(doc).length > 0).length;\n    const duplicateRecords = documents.filter((doc) => duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase())).length;\n    const missingLinks = documents.filter((doc) => !String(doc.driveUrl || '').trim()).length;\n    const complete = Math.max(0, documents.length - incomplete - duplicateRecords);\n    return { incomplete, duplicateRecords, missingLinks, complete, duplicateNumbers };\n  }, [documents]);`,
);

replaceOnce(
  'add permission',
  `    if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }\n\n    setFormMode('add');`,
  `    if (!canAdd) {\n      toast.error('لا تملك صلاحية إضافة ملفات إلى الأرشفة');\n      return;\n    }\n\n    setFormMode('add');`,
);

replaceOnce(
  'edit permission',
  `  const openEditForm = (doc: ArchiveDocument) => {\n    if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }`,
  `  const openEditForm = (doc: ArchiveDocument) => {\n    if (!canEdit) {\n      toast.error('لا تملك صلاحية تعديل بيانات الأرشفة');\n      return;\n    }`,
);

replaceOnce(
  'delete request permission',
  `  const requestDelete = (doc: ArchiveDocument) => {\n    if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }`,
  `  const requestDelete = (doc: ArchiveDocument) => {\n    if (!canDelete) {\n      toast.error('لا تملك صلاحية حذف سجلات الأرشفة');\n      return;\n    }`,
);

replaceOnce(
  'delete confirmation permission',
  `  const confirmDelete = async () => {\n    if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }`,
  `  const confirmDelete = async () => {\n    if (!canDelete) {\n      toast.error('لا تملك صلاحية حذف سجلات الأرشفة');\n      return;\n    }`,
);

replaceOnce(
  'submit permissions',
  `  const handleSubmit = async () => {\n    if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }\n\n    if (!validateForm()) return;`,
  `  const handleSubmit = async () => {\n    if ((formMode === 'add' && !canAdd) || (formMode === 'edit' && !canEdit)) {\n      toast.error('لا تملك الصلاحية المطلوبة لتنفيذ عملية الأرشفة');\n      return;\n    }\n\n    if (!validateForm()) return;`,
);

replaceOnce(
  'header actions',
  `        {isAdmin && (\n          <Button onClick={openAddForm} className="w-full lg:w-auto">\n            <Plus className="ml-2 h-4 w-4" />\n            إضافة ملف للأرشفة\n          </Button>\n        )}`,
  `        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">\n          {canPrint && (\n            <Button variant="outline" onClick={() => setReportsOpen(true)} className="w-full lg:w-auto">\n              <FileDown className="ml-2 h-4 w-4" />\n              تقارير الأرشفة — طباعة / PDF / Excel\n            </Button>\n          )}\n          {canAdd && (\n            <Button onClick={openAddForm} className="w-full lg:w-auto">\n              <Plus className="ml-2 h-4 w-4" />\n              إضافة ملف للأرشفة\n            </Button>\n          )}\n        </div>`,
);

replaceOnce(
  'quality dashboard',
  `      {formOpen && (`,
  `      <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-l from-sky-50/70 via-white to-slate-50/80">\n        <CardHeader className="pb-3">\n          <CardTitle className="flex items-center gap-2 text-lg">\n            <ShieldCheck className="h-5 w-5 text-emerald-700" />\n            جودة وسلامة الأرشفة\n          </CardTitle>\n          <CardDescription>مراجعة آلية لجودة الفهرسة قبل الاعتماد على الأرشيف في التقارير والبحث.</CardDescription>\n        </CardHeader>\n        <CardContent>\n          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">\n            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">\n              <p className="text-xs text-muted-foreground">سجلات مكتملة مبدئيًا</p>\n              <p className="mt-1 text-2xl font-black text-emerald-700">{archiveQuality.complete}</p>\n            </div>\n            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">\n              <p className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> بيانات وصفية ناقصة</p>\n              <p className="mt-1 text-2xl font-black text-amber-700">{archiveQuality.incomplete}</p>\n            </div>\n            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-3">\n              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Copy className="h-3.5 w-3.5" /> أرقام مستندات مكررة</p>\n              <p className="mt-1 text-2xl font-black text-violet-700">{archiveQuality.duplicateRecords}</p>\n            </div>\n            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3">\n              <p className="text-xs text-muted-foreground">سجلات دون رابط ملف</p>\n              <p className="mt-1 text-2xl font-black text-red-700">{archiveQuality.missingLinks}</p>\n            </div>\n          </div>\n          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">\n            <b>ملاحظة إجرائية:</b> حذف سجل الأرشفة حاليًا يحذف الفهرسة من المنصة فقط؛ ملف Google Drive لا يُحذف تلقائيًا. لذلك يعرض النظام هذه المعلومة بوضوح قبل الحذف لمنع فقدان التتبع.\n          </div>\n        </CardContent>\n      </Card>\n\n      {formOpen && (`,
);

replaceOnce(
  'details reference',
  `              <InfoItem label="العنوان" value={selectedDocument.title} />`,
  `              <InfoItem label="المرجع الأرشيفي" value={getArchiveReference(selectedDocument)} />\n              <InfoItem label="العنوان" value={selectedDocument.title} />`,
);

replaceOnce(
  'details action permissions',
  `            {isAdmin && (\n              <div className="flex flex-col md:flex-row justify-end gap-2">\n                <Button variant="outline" onClick={() => openEditForm(selectedDocument)}>\n                  <Edit className="ml-2 h-4 w-4" />\n                  تعديل البيانات\n                </Button>\n                <Button variant="destructive" onClick={() => requestDelete(selectedDocument)}>\n                  <Trash2 className="ml-2 h-4 w-4" />\n                  حذف\n                </Button>\n              </div>\n            )}`,
  `            {(canEdit || canDelete) && (\n              <div className="flex flex-col md:flex-row justify-end gap-2">\n                {canEdit && (\n                  <Button variant="outline" onClick={() => openEditForm(selectedDocument)}>\n                    <Edit className="ml-2 h-4 w-4" />\n                    تعديل البيانات\n                  </Button>\n                )}\n                {canDelete && (\n                  <Button variant="destructive" onClick={() => requestDelete(selectedDocument)}>\n                    <Trash2 className="ml-2 h-4 w-4" />\n                    حذف\n                  </Button>\n                )}\n              </div>\n            )}`,
);

replaceOnce(
  'card action permissions',
  `                      {isAdmin && (\n                        <>\n                          <Button\n                            variant="outline"\n                            onClick={() => openEditForm(doc)}\n                            className="border-amber-300 bg-gradient-to-b from-white to-amber-50 font-bold text-amber-800 shadow-[0_4px_0_rgba(180,83,9,0.15),0_7px_12px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,83,9,0.14)]"\n                          >\n                            <Edit className="ml-2 h-4 w-4" />\n                            تعديل\n                          </Button>\n\n                          <Button\n                            variant="outline"\n                            onClick={() => requestDelete(doc)}\n                            className="border-red-400/90 bg-gradient-to-b from-red-50 to-red-100 font-bold text-red-600 shadow-[0_4px_0_rgba(185,28,28,0.20),0_8px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:border-red-500 hover:text-red-700 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(185,28,28,0.18)]"\n                          >\n                            <Trash2 className="ml-2 h-4 w-4" />\n                            حذف\n                          </Button>\n                        </>\n                      )}`,
  `                      {(canEdit || canDelete) && (\n                        <>\n                          {canEdit && (\n                            <Button\n                              variant="outline"\n                              onClick={() => openEditForm(doc)}\n                              className="border-amber-300 bg-gradient-to-b from-white to-amber-50 font-bold text-amber-800 shadow-[0_4px_0_rgba(180,83,9,0.15),0_7px_12px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,83,9,0.14)]"\n                            >\n                              <Edit className="ml-2 h-4 w-4" />\n                              تعديل\n                            </Button>\n                          )}\n                          {canDelete && (\n                            <Button\n                              variant="outline"\n                              onClick={() => requestDelete(doc)}\n                              className="border-red-400/90 bg-gradient-to-b from-red-50 to-red-100 font-bold text-red-600 shadow-[0_4px_0_rgba(185,28,28,0.20),0_8px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:border-red-500 hover:text-red-700 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(185,28,28,0.18)]"\n                            >\n                              <Trash2 className="ml-2 h-4 w-4" />\n                              حذف\n                            </Button>\n                          )}\n                        </>\n                      )}`,
);

replaceOnce(
  'quality badges on cards',
  `                          <Badge\n                            variant="outline"\n                            className={\`px-2.5 py-1 text-[11px] font-black \${getArchiveConfidentialityClassName(doc.confidentiality)}\`}\n                          >\n                            {getConfidentialityLabel(doc.confidentiality)}\n                          </Badge>`,
  `                          <Badge\n                            variant="outline"\n                            className={\`px-2.5 py-1 text-[11px] font-black \${getArchiveConfidentialityClassName(doc.confidentiality)}\`}\n                          >\n                            {getConfidentialityLabel(doc.confidentiality)}\n                          </Badge>\n                          {getArchiveMissingMetadata(doc).length > 0 && (\n                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">\n                              بيانات ناقصة: {getArchiveMissingMetadata(doc).length}\n                            </Badge>\n                          )}\n                          {archiveQuality.duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase()) && (\n                            <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-800">رقم مكرر</Badge>\n                          )}`,
);

replaceOnce(
  'report dialog mount',
  `      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>`,
  `      <ArchiveReportsDialog documents={documents} open={reportsOpen} onOpenChange={setReportsOpen} />\n\n      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>`,
);

fs.writeFileSync(path, source, 'utf8');
console.log('Professional archive center patch completed.');
