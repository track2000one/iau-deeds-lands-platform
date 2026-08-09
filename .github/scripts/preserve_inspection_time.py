from pathlib import Path

p = Path('src/app/pages/SiteInspectionFormPage.tsx')
text = p.read_text(encoding='utf-8')

old = "  const [showMap, setShowMap] = React.useState(true);\n"
new = "  const [showMap, setShowMap] = React.useState(true);\n  const [visitTime, setVisitTime] = React.useState(new Date().toTimeString().slice(0, 5));\n"
if old not in text:
    raise SystemExit('state anchor not found')
text = text.replace(old, new, 1)

old = "        setForm({\n"
new = "        setVisitTime(record.visitDate?.slice(11, 16) || '09:00');\n        setForm({\n"
if old not in text:
    raise SystemExit('load anchor not found')
text = text.replace(old, new, 1)

old = "      const saved =\n        isEdit && inspectionId\n          ? await updateSiteInspection(inspectionId, form)\n          : await createSiteInspection(form);"
new = """      const visitDateWithTime = form.visitDate
        ? `${form.visitDate}${form.visitDateType === 'hijri' ? ' ' : 'T'}${visitTime || '00:00'}`
        : form.visitDate;
      const payload = { ...form, visitDate: visitDateWithTime };
      const saved =
        isEdit && inspectionId
          ? await updateSiteInspection(inspectionId, payload)
          : await createSiteInspection(payload);"""
if old not in text:
    raise SystemExit('save anchor not found')
text = text.replace(old, new, 1)

anchor = '''          </div>
          <Field label="القائم بالمعاينة">'''
replacement = '''          </div>
          <Field label="وقت الزيارة">
            <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
          </Field>
          <Field label="القائم بالمعاينة">'''
if anchor not in text:
    raise SystemExit('visit time UI anchor not found')
text = text.replace(anchor, replacement, 1)

p.write_text(text, encoding='utf-8')
