from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# API typing
api_path = Path('src/app/api/mosques.ts')
api = api_path.read_text(encoding='utf-8')
api = replace_once(
    api,
    "  siteType: 'mosque' | 'jami' | 'prayer_room';\n  city?: string | null;\n",
    "  siteType: 'mosque' | 'jami' | 'prayer_room';\n  prayerRoomGender?: 'men' | 'women' | null;\n  city?: string | null;\n",
    'MosqueSite prayerRoomGender type',
)
api = replace_once(
    api,
    "export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'city' | 'district' | 'campusLocation' | 'area' | 'capacity' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;",
    "export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'area' | 'capacity' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;",
    'PublicMosqueSite prayerRoomGender type',
)
api_path.write_text(api, encoding='utf-8')

# Main unit page
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
text = page_path.read_text(encoding='utf-8')

text = replace_once(
    text,
    "const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };\n",
    "const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };\nconst prayerRoomGenderLabels: Record<string, string> = { men: 'رجال', women: 'نساء' };\nconst siteTypeDisplayLabel = (site: Pick<MosqueSite, 'siteType' | 'prayerRoomGender'>) =>\n  site.siteType === 'prayer_room' && site.prayerRoomGender\n    ? `مصلى ${prayerRoomGenderLabels[site.prayerRoomGender] || site.prayerRoomGender}`\n    : siteTypeLabels[site.siteType] || site.siteType;\n",
    'site type display helper',
)

text = replace_once(
    text,
    "  name: '', siteType: 'mosque', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',\n",
    "  name: '', siteType: 'mosque', prayerRoomGender: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',\n",
    'emptySite prayerRoomGender',
)

text = replace_once(
    text,
    "  name: site.name,\n  siteType: site.siteType,\n  city: site.city ?? null,\n",
    "  name: site.name,\n  siteType: site.siteType,\n  prayerRoomGender: site.prayerRoomGender ?? null,\n  city: site.city ?? null,\n",
    'mediaImportSitePayload prayerRoomGender',
)

text = replace_once(
    text,
    "    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');\n    setSaving(true);\n",
    "    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');\n    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');\n    setSaving(true);\n",
    'save prayer room gender validation',
)

text = replace_once(
    text,
    "      const payload = {\n        ...siteForm,\n        area: siteForm.area === '' ? null : Number(siteForm.area),\n",
    "      const payload = {\n        ...siteForm,\n        prayerRoomGender: siteForm.siteType === 'prayer_room' ? siteForm.prayerRoomGender : null,\n        area: siteForm.area === '' ? null : Number(siteForm.area),\n",
    'save payload prayerRoomGender',
)

text = replace_once(
    text,
    "      name: site.name, siteType: site.siteType, city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',\n",
    "      name: site.name, siteType: site.siteType, prayerRoomGender: site.prayerRoomGender || '', city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',\n",
    'edit form prayerRoomGender',
)

old_type_field = """                <Field label=\"النوع\"><NativeSelect className=\"h-11\" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value })}><option value=\"mosque\">مسجد</option><option value=\"jami\">جامع</option><option value=\"prayer_room\">مصلى</option></NativeSelect></Field>\n"""
new_type_field = """                <Field label=\"النوع\"><NativeSelect className=\"h-11\" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value, prayerRoomGender: e.target.value === 'prayer_room' ? siteForm.prayerRoomGender : '' })}><option value=\"mosque\">مسجد</option><option value=\"jami\">جامع</option><option value=\"prayer_room\">مصلى</option></NativeSelect></Field>\n                {siteForm.siteType === 'prayer_room' && <Field label=\"فئة المصلى *\"><NativeSelect className=\"h-11\" value={siteForm.prayerRoomGender || ''} onChange={(e) => setSiteForm({ ...siteForm, prayerRoomGender: e.target.value })}><option value=\"\">اختر الفئة</option><option value=\"men\">رجال</option><option value=\"women\">نساء</option></NativeSelect></Field>}\n"""
text = replace_once(text, old_type_field, new_type_field, 'prayer-room gender form field')

# Use the richer display label wherever a concrete site record is rendered/printed.
replacements = [
    ("if (siteSortBy === 'type') return siteTypeLabels[site.siteType] || site.siteType || '';", "if (siteSortBy === 'type') return siteTypeDisplayLabel(site);"),
    ("if (key === 'type') return siteTypeLabels[site.siteType] || site.siteType;", "if (key === 'type') return siteTypeDisplayLabel(site);"),
    ("['النوع', siteTypeLabels[site.siteType] || site.siteType],", "['النوع', siteTypeDisplayLabel(site)],"),
    ("<Info label=\"النوع\" value={siteTypeLabels[linkedSite.siteType] || linkedSite.siteType} />", "<Info label=\"النوع\" value={siteTypeDisplayLabel(linkedSite)} />"),
    ("<div>{siteTypeLabels[site.siteType]} — {siteStatusLabels[site.status]}</div>", "<div>{siteTypeDisplayLabel(site)} — {siteStatusLabels[site.status]}</div>"),
    ("<Info label=\"النوع\" value={siteTypeLabels[previewSite.siteType] || previewSite.siteType} />", "<Info label=\"النوع\" value={siteTypeDisplayLabel(previewSite)} />"),
    ("<Info label=\"النوع\" value={siteTypeLabels[qrSite.siteType] || qrSite.siteType} />", "<Info label=\"النوع\" value={siteTypeDisplayLabel(qrSite)} />"),
    ("<Badge variant=\"outline\" className=\"mb-2\">{siteTypeLabels[site.siteType]}</Badge>", "<Badge variant=\"outline\" className=\"mb-2\">{siteTypeDisplayLabel(site)}</Badge>"),
]
for old, new in replacements:
    if old in text:
        text = text.replace(old, new)

# Guardrails
required_markers = [
    "فئة المصلى *",
    "prayerRoomGender: siteForm.siteType === 'prayer_room'",
    "siteTypeDisplayLabel",
    "حدد فئة المصلى: رجال أو نساء",
]
for marker in required_markers:
    if marker not in text:
        raise SystemExit(f'missing expected marker after patch: {marker}')

page_path.write_text(text, encoding='utf-8')
print('Prayer-room gender frontend patch applied successfully.')
