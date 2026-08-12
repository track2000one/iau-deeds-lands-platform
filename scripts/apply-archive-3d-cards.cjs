const fs = require('fs');

const path = 'src/app/pages/ArchivePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const tableImport = `import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
`;
content = content.replace(tableImport, '');

const helperAnchor = `const getConfidentialityVariant = (value: ArchiveDocument['confidentiality']) => {
  if (value === 'confidential') return 'destructive';
  if (value === 'public') return 'secondary';
  return 'outline';
};
`;

const helperAddition = `${helperAnchor}

const getArchiveConfidentialityClassName = (value: ArchiveDocument['confidentiality']) => {
  if (value === 'confidential') {
    return 'border-red-300/90 bg-gradient-to-b from-red-50 to-red-100 text-red-700 shadow-[0_3px_0_rgba(185,28,28,0.16),0_7px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
  }

  if (value === 'public') {
    return 'border-emerald-300/90 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-700 shadow-[0_3px_0_rgba(5,150,105,0.16),0_7px_14px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
  }

  return 'border-sky-300/90 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-700 shadow-[0_3px_0_rgba(2,132,199,0.16),0_7px_14px_rgba(14,165,233,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
};

const getArchiveFileTypeLabel = (doc: ArchiveDocument) => {
  const extension = String(doc.originalName || doc.fileName || '')
    .split('.')
    .pop()
    ?.trim()
    .toUpperCase();

  if (extension && extension.length <= 8) return extension;

  const mimeType = String(doc.mimeType || '');
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word')) return 'WORD';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'EXCEL';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.startsWith('image/')) return 'صورة';
  return 'ملف';
};
`;

if (!content.includes(helperAnchor)) {
  throw new Error('Archive helper anchor was not found');
}
content = content.replace(helperAnchor, helperAddition);

const headingIndex = content.indexOf('ملفات الأرشفة ({filteredDocuments.length})');
if (headingIndex < 0) {
  throw new Error('Archive list heading was not found');
}

const listStart = content.lastIndexOf('      <Card>', headingIndex);
const listEnd = content.indexOf('      <AlertDialog open={deleteDialogOpen}', headingIndex);

if (listStart < 0 || listEnd < 0 || listEnd <= listStart) {
  throw new Error('Archive list block boundaries were not found');
}

const newBlock = `      <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/45 to-slate-50/80 shadow-[0_9px_0_rgba(100,116,139,0.12),0_22px_48px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-gradient-to-l from-sky-50/95 via-white to-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-800 sm:text-xl">
              <Archive className="h-5 w-5 text-sky-700" />
              ملفات الأرشفة (\${filteredDocuments.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              عرض الملفات كبطاقات واضحة مع بياناتها وإجراءاتها الرئيسية.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-slate-300 bg-white/90 px-3 py-1 font-bold text-slate-700 shadow-sm">
            \${filteredDocuments.length} ملف
          </Badge>
        </div>

        <div className="p-4 sm:p-5">
          {filteredDocuments.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
              <Archive className="mx-auto mb-3 h-12 w-12 opacity-30" />
              لا توجد ملفات مؤرشفة مطابقة للبحث.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <article
                  key={doc.id}
                  className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[22px] border border-slate-300/90 bg-gradient-to-b from-white via-white to-sky-50/45 shadow-[0_6px_0_rgba(51,65,85,0.16),0_13px_28px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/80 hover:shadow-[0_9px_0_rgba(37,99,235,0.16),0_20px_34px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,1)]"
                >
                  <div className="h-1.5 w-full bg-gradient-to-l from-sky-400 via-blue-700 to-slate-800 shadow-[0_2px_5px_rgba(30,64,175,0.20)]" />

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-slate-300 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                            \${doc.category || 'غير مصنف'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={\`px-2.5 py-1 text-[11px] font-black \${getArchiveConfidentialityClassName(doc.confidentiality)}\`}
                          >
                            \${getConfidentialityLabel(doc.confidentiality)}
                          </Badge>
                        </div>

                        <h3 className="line-clamp-2 text-base font-black leading-7 text-slate-800 sm:text-lg">
                          \${doc.title}
                        </h3>
                        <p className="mt-1 truncate text-xs text-slate-500" dir="auto">
                          \${doc.originalName || doc.fileName}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-sky-100 text-sky-700 shadow-[0_4px_0_rgba(14,116,144,0.14),0_9px_18px_rgba(14,165,233,0.13),inset_0_1px_0_rgba(255,255,255,1)]">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    <div className="rounded-[18px] border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_12px_rgba(15,23,42,0.045)]">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">رقم المستند</p>
                          <p className="mt-1 break-words font-bold text-slate-700">\${doc.documentNumber || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">تاريخ المستند</p>
                          <p className="mt-1 flex items-center gap-1 font-bold text-slate-700">
                            <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                            \${formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-medium text-slate-400">الجهة / المصدر</p>
                          <p className="mt-1 line-clamp-2 font-bold text-slate-700">\${doc.issuingAuthority || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">نوع الملف</p>
                          <p className="mt-1 font-black text-slate-700">\${getArchiveFileTypeLabel(doc)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">الحجم</p>
                          <p className="mt-1 font-black text-slate-700">\${formatFileSize(doc.fileSize)}</p>
                        </div>
                      </div>
                    </div>

                    {doc.tags ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doc.tags
                          .split(/[,،]/)
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((tag) => (
                            <span key={tag} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                              #\${tag}
                            </span>
                          ))}
                      </div>
                    ) : null}

                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-4 sm:grid-cols-3">
                      <Button
                        variant="outline"
                        onClick={() => openDetails(doc)}
                        className="border-slate-300 bg-gradient-to-b from-white to-slate-50 font-bold text-slate-700 shadow-[0_4px_0_rgba(71,85,105,0.16),0_7px_12px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-white active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.14)]"
                      >
                        <Eye className="ml-2 h-4 w-4" />
                        عرض
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => openFile(doc)}
                        className="border-sky-300 bg-gradient-to-b from-white to-sky-50 font-bold text-sky-800 shadow-[0_4px_0_rgba(2,132,199,0.16),0_7px_12px_rgba(14,165,233,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-sky-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,132,199,0.14)]"
                      >
                        <ExternalLink className="ml-2 h-4 w-4" />
                        فتح
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => downloadFile(doc)}
                        className="border-indigo-300 bg-gradient-to-b from-white to-indigo-50 font-bold text-indigo-800 shadow-[0_4px_0_rgba(79,70,229,0.15),0_7px_12px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(79,70,229,0.14)]"
                      >
                        <Download className="ml-2 h-4 w-4" />
                        تنزيل
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => openEditForm(doc)}
                            className="border-amber-300 bg-gradient-to-b from-white to-amber-50 font-bold text-amber-800 shadow-[0_4px_0_rgba(180,83,9,0.15),0_7px_12px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,83,9,0.14)]"
                          >
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => requestDelete(doc)}
                            className="border-red-400/90 bg-gradient-to-b from-red-50 to-red-100 font-bold text-red-600 shadow-[0_4px_0_rgba(185,28,28,0.20),0_8px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:border-red-500 hover:text-red-700 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(185,28,28,0.18)]"
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

`;

content = content.slice(0, listStart) + newBlock + content.slice(listEnd);
fs.writeFileSync(path, content, 'utf8');
console.log('Archive list converted to professional Soft 3D cards.');
