from pathlib import Path

form_path = Path('src/app/pages/AccountingTransformationFormPage.tsx')
form = form_path.read_text(encoding='utf-8')

import_anchor = "} from '../../types/accountingTransformation';\n"
helper_import = "} from '../../types/accountingTransformation';\nimport {\n  ACCOUNTING_ATTACHMENT_PURPOSE_OPTIONS,\n  ACCOUNTING_DOCUMENT_TYPE_SUGGESTIONS,\n  inferAccountingAttachmentMeta,\n} from '../../utils/accountingSupportingDocuments';\n"
if "inferAccountingAttachmentMeta" not in form:
    if import_anchor not in form:
        raise SystemExit('Form import anchor not found')
    form = form.replace(import_anchor, helper_import, 1)

old_upload = "      for (const file of Array.from(files)) uploaded.push(await uploadAccountingTransformationFile(file));"
new_upload = "      for (const file of Array.from(files)) uploaded.push(inferAccountingAttachmentMeta(await uploadAccountingTransformationFile(file)));"
if old_upload in form:
    form = form.replace(old_upload, new_upload, 1)
elif new_upload not in form:
    raise SystemExit('Upload loop anchor not found')

update_anchor = "  const save = async (event: React.FormEvent) => {"
update_fn = "  const updateAttachment = (index: number, patch: Partial<AccountingTransformationAttachment>) =>\n    setAttachments((current) => current.map((attachment, itemIndex) => itemIndex === index ? { ...attachment, ...patch } : attachment));\n\n  const save = async (event: React.FormEvent) => {"
if "const updateAttachment =" not in form:
    if update_anchor not in form:
        raise SystemExit('Save anchor not found')
    form = form.replace(update_anchor, update_fn, 1)

old_card = '''          <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4" />المرفقات</CardTitle></CardHeader><CardContent className="space-y-3"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? 'جاري الرفع...' : 'رفع صور أو مستندات'}<input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} /></label>{attachments.length ? <div className="space-y-2">{attachments.map((attachment, index) => <div key={`${attachment.driveUrl}-${index}`} className="flex items-center gap-2 rounded-xl border bg-white p-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-sky-600" /><a href={attachment.driveUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-bold text-sky-700">{attachment.title}</a><button type="button" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-red-50"><X className="h-3.5 w-3.5 text-red-600" /></button></div>)}</div> : <p className="text-xs text-slate-400">لا توجد مرفقات.</p>}</CardContent></Card>'''
new_card = '''          <Card className="rounded-[24px]">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4" />المرفقات المصنفة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? 'جاري الرفع...' : 'رفع صور أو مستندات'}<input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} /></label>
              <p className="rounded-xl border border-sky-100 bg-sky-50/70 p-2.5 text-[10px] leading-5 text-sky-800">صنّف المرفق مرة واحدة. عند إنشاء ملف Excel تستخدم المنصة مرفقات «إثبات الملكية / الاقتناء» لتعبئة نوع الوثيقة تلقائيًا في <strong>AU للمباني</strong> و<strong>AI للأراضي</strong>. إذا لم توجد وثيقة مناسبة تُكتب <strong>Not Available</strong> بدل الشرطة.</p>
              <datalist id="accounting-document-types">{ACCOUNTING_DOCUMENT_TYPE_SUGGESTIONS.map((option) => <option key={option} value={option} />)}</datalist>
              {attachments.length ? <div className="space-y-3">{attachments.map((attachment, index) => <div key={`${attachment.driveUrl}-${index}`} className="space-y-2 rounded-2xl border bg-white p-3 text-xs">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-sky-600" /><a href={attachment.driveUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-bold text-sky-700">{attachment.title}</a><button type="button" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-red-50"><X className="h-3.5 w-3.5 text-red-600" /></button></div>
                <div className="space-y-1"><Label className="text-[10px]">تصنيف المرفق</Label><NativeSelect value={attachment.documentPurpose || 'other'} onChange={(e) => updateAttachment(index, { documentPurpose: e.target.value as AccountingTransformationAttachment['documentPurpose'] })}>{ACCOUNTING_ATTACHMENT_PURPOSE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
                <div className="space-y-1"><Label className="text-[10px]">نوع الوثيقة</Label><Input list="accounting-document-types" value={attachment.documentType || ''} onChange={(e) => updateAttachment(index, { documentType: e.target.value || null })} placeholder="مثال: صك ملكية" /></div>
                <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[10px]">رقم الوثيقة</Label><Input value={attachment.documentNumber || ''} onChange={(e) => updateAttachment(index, { documentNumber: e.target.value || null })} /></div><div className="space-y-1"><Label className="text-[10px]">رقم الأرشفة</Label><Input value={attachment.archiveNumber || ''} onChange={(e) => updateAttachment(index, { archiveNumber: e.target.value || null })} /></div></div>
              </div>)}</div> : <p className="text-xs text-slate-400">لا توجد مرفقات.</p>}
            </CardContent>
          </Card>'''
if old_card in form:
    form = form.replace(old_card, new_card, 1)
elif 'المرفقات المصنفة' not in form:
    raise SystemExit('Attachment card anchor not found')

form_path.write_text(form, encoding='utf-8')

excel_path = Path('src/utils/officialAccountingTransformationExcel.ts')
excel = excel_path.read_text(encoding='utf-8')
excel_import_anchor = "import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME } from '../app/config/fixedAssetModelB';\n"
excel_import = "import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME } from '../app/config/fixedAssetModelB';\nimport { resolveOwnershipSupportingArchiveNumber, resolveOwnershipSupportingDocumentType } from './accountingSupportingDocuments';\n"
if 'resolveOwnershipSupportingDocumentType' not in excel:
    if excel_import_anchor not in excel:
        raise SystemExit('Excel import anchor not found')
    excel = excel.replace(excel_import_anchor, excel_import, 1)

old_fill = "    ACCOUNTING_FIELDS[type].forEach((field) => setInline(doc, ensureCell(doc, row, field.c, rowNumber), text(item.payload?.[field.c])));"
new_fill = """    ACCOUNTING_FIELDS[type].forEach((field) => {\n      let value = item.payload?.[field.c];\n      const ownershipTypeColumn = (type === 'building' && field.c === 'AU') || (type === 'land' && field.c === 'AI');\n      const ownershipArchiveColumn = (type === 'building' && field.c === 'AV') || (type === 'land' && field.c === 'AJ');\n      if (ownershipTypeColumn) value = resolveOwnershipSupportingDocumentType(item, value);\n      if (ownershipArchiveColumn) value = resolveOwnershipSupportingArchiveNumber(item, value);\n      setInline(doc, ensureCell(doc, row, field.c, rowNumber), text(value));\n    });"""
if old_fill in excel:
    excel = excel.replace(old_fill, new_fill, 1)
elif 'ownershipTypeColumn' not in excel:
    raise SystemExit('Legacy fill anchor not found')

excel_path.write_text(excel, encoding='utf-8')
print('Frontend supporting-document patch applied.')
