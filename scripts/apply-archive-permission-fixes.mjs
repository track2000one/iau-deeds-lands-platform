import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
};

const file = 'src/app/pages/ArchivePage.tsx';
let src = fs.readFileSync(file, 'utf8');

src = replaceOnce(src,
  "  const { isAdmin } = usePermissions();",
  "  const { isAdmin, hasPermission } = usePermissions();\n  const canAddArchive = isAdmin || hasPermission('archive', 'canAdd');\n  const canEditArchive = isAdmin || hasPermission('archive', 'canEdit');\n  const canDeleteArchive = isAdmin || hasPermission('archive', 'canDelete');",
  'archive permission flags');

src = src.replaceAll(
  "if (!isAdmin) {\n      toast.error('المستخدم العادي يملك صلاحية العرض فقط');\n      return;\n    }",
  "if (!canAddArchive) {\n      toast.error('لا تملك صلاحية إضافة ملفات إلى الأرشفة');\n      return;\n    }"
);

// Correct operation-specific guards that share the old admin-only block.
let occurrences = 0;
src = src.replace(/if \(!canAddArchive\) \{\n      toast\.error\('لا تملك صلاحية إضافة ملفات إلى الأرشفة'\);\n      return;\n    \}/g, (match) => {
  occurrences += 1;
  if (occurrences === 1) return match; // openAddForm
  if (occurrences === 2) return "if (!canEditArchive) {\n      toast.error('لا تملك صلاحية تعديل ملفات الأرشفة');\n      return;\n    }"; // openEditForm
  if (occurrences === 3 || occurrences === 4) return "if (!canDeleteArchive) {\n      toast.error('لا تملك صلاحية حذف ملفات الأرشفة');\n      return;\n    }"; // request + confirm
  if (occurrences === 5) return "if (formMode === 'add' ? !canAddArchive : !canEditArchive) {\n      toast.error(formMode === 'add' ? 'لا تملك صلاحية إضافة ملفات إلى الأرشفة' : 'لا تملك صلاحية تعديل ملفات الأرشفة');\n      return;\n    }"; // submit
  return match;
});
if (occurrences !== 5) throw new Error(`archive admin guards: expected 5, found ${occurrences}`);

src = replaceOnce(src,
  "      method: 'POST',\n      body: formData,",
  "      method: 'POST',\n      headers: { 'x-upload-module': 'archive' },\n      body: formData,",
  'archive upload permission header');

src = replaceOnce(src,
  "        {isAdmin && (\n          <Button onClick={openAddForm} className=\"w-full lg:w-auto\">",
  "        {canAddArchive && (\n          <Button onClick={openAddForm} className=\"w-full lg:w-auto\">",
  'archive add button permission');

src = replaceOnce(src,
  "                <CardDescription>يدعم رفع أكثر من ملف دفعة واحدة: صور و PDF و Word و Excel و PowerPoint والملفات النصية والمضغوطة ومعظم الصيغ.</CardDescription>",
  "                <CardDescription>يدعم رفع أكثر من ملف دفعة واحدة: JPG وPNG وWEBP وGIF وPDF وWord وExcel وPowerPoint وMP4، بحد أقصى 20MB لكل ملف.</CardDescription>",
  'archive upload description');

src = replaceOnce(src,
  "                      : 'PDF، Word، Excel، PowerPoint، صور، ملفات مضغوطة، وجميع الصيغ تقريبًا'}",
  "                      : 'JPG، PNG، WEBP، GIF، PDF، Word، Excel، PowerPoint وMP4'}",
  'archive upload helper text');

src = replaceOnce(src,
  "                    accept=\"*/*\"",
  "                    accept=\"image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/mp4\"",
  'archive file accept list');

src = replaceOnce(src,
  "            {isAdmin && (\n              <div className=\"flex flex-col md:flex-row justify-end gap-2\">\n                <Button variant=\"outline\" onClick={() => openEditForm(selectedDocument)}>\n                  <Edit className=\"ml-2 h-4 w-4\" />\n                  تعديل البيانات\n                </Button>\n                <Button variant=\"destructive\" onClick={() => requestDelete(selectedDocument)}>\n                  <Trash2 className=\"ml-2 h-4 w-4\" />\n                  حذف\n                </Button>\n              </div>\n            )}",
  "            {(canEditArchive || canDeleteArchive) && (\n              <div className=\"flex flex-col md:flex-row justify-end gap-2\">\n                {canEditArchive && (\n                  <Button variant=\"outline\" onClick={() => openEditForm(selectedDocument)}>\n                    <Edit className=\"ml-2 h-4 w-4\" />\n                    تعديل البيانات\n                  </Button>\n                )}\n                {canDeleteArchive && (\n                  <Button variant=\"destructive\" onClick={() => requestDelete(selectedDocument)}>\n                    <Trash2 className=\"ml-2 h-4 w-4\" />\n                    حذف\n                  </Button>\n                )}\n              </div>\n            )}",
  'archive detail action permissions');

fs.writeFileSync(file, src);
console.log('Archive frontend permission and upload fixes applied.');
