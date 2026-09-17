import fs from 'node:fs';

const target = 'src/app/pages/ArchivePage.tsx';
let source = fs.readFileSync(target, 'utf8');

const marker = 'IAU_ARCHIVE_VIEW_TOGGLE_V1';
if (source.includes(marker)) {
  console.log('Archive view toggle already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`  FileSpreadsheet,\n  ShieldCheck,`,
`  FileSpreadsheet,\n  LayoutGrid,\n  Table2,\n  ShieldCheck,`,
'view icons import'
);

replaceOnce(
`  const [filterConfidentiality, setFilterConfidentiality] = useState('');\n\n  const [formOpen, setFormOpen] = useState(false);`,
`  const [filterConfidentiality, setFilterConfidentiality] = useState('');\n  // ${marker}\n  const [archiveViewMode, setArchiveViewMode] = useState<'cards' | 'table'>(() => {\n    try {\n      return localStorage.getItem('iau_archive_view_mode') === 'table' ? 'table' : 'cards';\n    } catch {\n      return 'cards';\n    }\n  });\n\n  const [formOpen, setFormOpen] = useState(false);`,
'view mode state'
);

replaceOnce(
`  const clearFilters = () => {\n    setSearchQuery('');\n    setFilterCategory('');\n    setFilterConfidentiality('');\n  };`,
`  const changeArchiveViewMode = (mode: 'cards' | 'table') => {\n    setArchiveViewMode(mode);\n    try {\n      localStorage.setItem('iau_archive_view_mode', mode);\n    } catch {\n      // Ignore storage restrictions; the selected view still works for the current session.\n    }\n  };\n\n  const clearFilters = () => {\n    setSearchQuery('');\n    setFilterCategory('');\n    setFilterConfidentiality('');\n  };`,
'view mode handler'
);

replaceOnce(
`            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">\n              عرض الملفات كبطاقات واضحة مع بياناتها وإجراءاتها الرئيسية.\n            </p>\n          </div>\n          <Badge variant="outline" className="w-fit border-slate-300 bg-white/90 px-3 py-1 font-bold text-slate-700 shadow-sm">\n            {filteredDocuments.length} ملف\n          </Badge>`,
`            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">\n              اختر طريقة العرض المناسبة: بطاقات مرئية أو جدول تفصيلي مضغوط.\n            </p>\n          </div>\n          <div className="flex flex-wrap items-center gap-2">\n            <div className="inline-flex rounded-xl border border-slate-300 bg-white/95 p-1 shadow-sm" role="group" aria-label="طريقة عرض ملفات الأرشفة">\n              <Button\n                type="button"\n                size="sm"\n                variant={archiveViewMode === 'cards' ? 'default' : 'ghost'}\n                onClick={() => changeArchiveViewMode('cards')}\n                className="h-9 rounded-lg px-3 font-bold"\n                aria-pressed={archiveViewMode === 'cards'}\n              >\n                <LayoutGrid className="ml-2 h-4 w-4" />\n                بطاقات\n              </Button>\n              <Button\n                type="button"\n                size="sm"\n                variant={archiveViewMode === 'table' ? 'default' : 'ghost'}\n                onClick={() => changeArchiveViewMode('table')}\n                className="h-9 rounded-lg px-3 font-bold"\n                aria-pressed={archiveViewMode === 'table'}\n              >\n                <Table2 className="ml-2 h-4 w-4" />\n                جدول\n              </Button>\n            </div>\n            <Badge variant="outline" className="w-fit border-slate-300 bg-white/90 px-3 py-1 font-bold text-slate-700 shadow-sm">\n              {filteredDocuments.length} ملف\n            </Badge>\n          </div>`,
'header view toggle'
);

replaceOnce(
`          ) : (\n            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">`,
`          ) : archiveViewMode === 'cards' ? (\n            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">`,
'cards conditional'
);

const dialogAnchor = '\n      <ArchiveExcelImportDialog';
const dialogIndex = source.indexOf(dialogAnchor);
if (dialogIndex < 0) throw new Error('Missing ArchiveExcelImportDialog anchor');

const sectionTail = `            </div>\n          )}\n        </div>\n      </section>`;
const tailIndex = source.lastIndexOf(sectionTail, dialogIndex);
if (tailIndex < 0) throw new Error('Missing archive section tail');

const tableView = `            </div>\n          ) : (\n            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">\n              <div className="overflow-x-auto">\n                <table className="w-full min-w-[1180px] border-collapse text-right text-sm">\n                  <thead className="bg-gradient-to-l from-slate-100 via-sky-50 to-slate-50 text-slate-700">\n                    <tr className="border-b border-slate-200">\n                      <th className="px-4 py-3 font-black">العنوان / الملف</th>\n                      <th className="px-4 py-3 font-black">التصنيف</th>\n                      <th className="px-4 py-3 font-black">رقم المستند</th>\n                      <th className="px-4 py-3 font-black">تاريخ المستند</th>\n                      <th className="px-4 py-3 font-black">الجهة / المصدر</th>\n                      <th className="px-4 py-3 font-black">السرية</th>\n                      <th className="px-4 py-3 font-black">النوع</th>\n                      <th className="px-4 py-3 font-black">الحجم</th>\n                      <th className="px-4 py-3 text-center font-black">الإجراءات</th>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    {filteredDocuments.map((doc, index) => (\n                      <tr\n                        key={doc.id}\n                        className={\`border-b border-slate-100 transition-colors hover:bg-sky-50/70 \${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/55'}\`}\n                      >\n                        <td className="max-w-[280px] px-4 py-3 align-top">\n                          <button type="button" onClick={() => openDetails(doc)} className="block w-full text-right">\n                            <span className="line-clamp-2 font-black text-slate-800 hover:text-sky-700">{doc.title}</span>\n                            <span className="mt-1 block truncate text-xs text-slate-500" dir="auto">{doc.originalName || doc.fileName}</span>\n                          </button>\n                          <div className="mt-2 flex flex-wrap gap-1">\n                            {getArchiveMissingMetadata(doc).length > 0 && (\n                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">\n                                ناقص {getArchiveMissingMetadata(doc).length}\n                              </Badge>\n                            )}\n                            {archiveQuality.duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase()) && (\n                              <Badge variant="outline" className="border-violet-300 bg-violet-50 text-[10px] text-violet-800">مكرر</Badge>\n                            )}\n                          </div>\n                        </td>\n                        <td className="px-4 py-3 align-top font-semibold text-slate-700">{doc.category || 'غير مصنف'}</td>\n                        <td className="px-4 py-3 align-top font-bold text-slate-700">{doc.documentNumber || '-'}</td>\n                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">{formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}</td>\n                        <td className="max-w-[220px] px-4 py-3 align-top text-slate-700"><span className="line-clamp-2">{doc.issuingAuthority || '-'}</span></td>\n                        <td className="px-4 py-3 align-top">\n                          <Badge variant="outline" className={\`text-[10px] font-black \${getArchiveConfidentialityClassName(doc.confidentiality)}\`}>\n                            {getConfidentialityLabel(doc.confidentiality)}\n                          </Badge>\n                        </td>\n                        <td className="px-4 py-3 align-top font-black text-slate-700">{getArchiveFileTypeLabel(doc)}</td>\n                        <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">{formatFileSize(doc.fileSize)}</td>\n                        <td className="px-4 py-3 align-top">\n                          <div className="flex min-w-max items-center justify-center gap-1.5">\n                            <Button type="button" variant="outline" size="sm" onClick={() => openDetails(doc)} title="عرض التفاصيل" className="h-8 px-2.5">\n                              <Eye className="h-4 w-4" />\n                            </Button>\n                            <Button type="button" variant="outline" size="sm" onClick={() => openFile(doc)} title="فتح الملف" className="h-8 px-2.5 text-sky-700">\n                              <ExternalLink className="h-4 w-4" />\n                            </Button>\n                            <Button type="button" variant="outline" size="sm" onClick={() => downloadFile(doc)} title="تنزيل الملف" className="h-8 px-2.5 text-indigo-700">\n                              <Download className="h-4 w-4" />\n                            </Button>\n                            {canEdit && (\n                              <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(doc)} title="تعديل" className="h-8 px-2.5 text-amber-700">\n                                <Edit className="h-4 w-4" />\n                              </Button>\n                            )}\n                            {canDelete && (\n                              <Button type="button" variant="outline" size="sm" onClick={() => requestDelete(doc)} title="حذف" className="h-8 px-2.5 text-red-600">\n                                <Trash2 className="h-4 w-4" />\n                              </Button>\n                            )}\n                          </div>\n                        </td>\n                      </tr>\n                    ))}\n                  </tbody>\n                </table>\n              </div>\n              <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">\n                يعرض الجدول {filteredDocuments.length} ملفًا. استخدم البحث والتصفية لتقليل النتائج، ويمكن التمرير أفقيًا على الشاشات الصغيرة.\n              </div>\n            </div>\n          )}\n        </div>\n      </section>`;

source = source.slice(0, tailIndex) + tableView + source.slice(tailIndex + sectionTail.length);

fs.writeFileSync(target, source, 'utf8');
console.log('Archive cards/table view toggle applied.');
