from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "type SitePrintFontSize = 'auto' | 'small' | 'medium' | 'large';\n",
        "const SITE_PRINT_FONT_MIN = 5;\nconst SITE_PRINT_FONT_MAX = 14;\nconst SITE_PRINT_FONT_DEFAULT = 7.2;\n",
    ),
    (
        "  const [sitePrintFontSize, setSitePrintFontSize] = useState<SitePrintFontSize>('auto');\n",
        "  const [sitePrintFontSize, setSitePrintFontSize] = useState<number>(SITE_PRINT_FONT_DEFAULT);\n  const [sitePrintFontAuto, setSitePrintFontAuto] = useState(true);\n",
    ),
    (
        "    setSitePrintFontSize('auto');\n",
        "    setSitePrintFontSize(SITE_PRINT_FONT_DEFAULT);\n    setSitePrintFontAuto(true);\n",
    ),
    (
        "    const printFontNumber = sitePrintFontSize === 'small' ? 6.1 : sitePrintFontSize === 'medium' ? 7.2 : sitePrintFontSize === 'large' ? 8.4 : automaticFont;\n",
        "    const printFontNumber = sitePrintFontAuto\n      ? automaticFont\n      : Math.min(SITE_PRINT_FONT_MAX, Math.max(SITE_PRINT_FONT_MIN, sitePrintFontSize));\n",
    ),
    (
        "    const fontLabel = sitePrintFontSize === 'auto' ? 'تلقائي' : sitePrintFontSize === 'small' ? 'صغير' : sitePrintFontSize === 'medium' ? 'متوسط' : 'كبير';\n",
        "    const fontLabel = sitePrintFontAuto ? `تلقائي (${printFontNumber.toFixed(1)}px)` : `${printFontNumber.toFixed(1)}px`;\n",
    ),
    (
        "                  <div><Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">حجم الخط</Label><NativeSelect className=\"h-10 rounded-xl bg-white\" value={sitePrintFontSize} onChange={(e) => setSitePrintFontSize(e.target.value as SitePrintFontSize)}><option value=\"auto\">تلقائي حسب عدد الأعمدة</option><option value=\"small\">صغير</option><option value=\"medium\">متوسط</option><option value=\"large\">كبير</option></NativeSelect></div>\n",
        "                  <div>\n                    <Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">حجم الخط (px)</Label>\n                    <div className=\"flex items-center gap-2\">\n                      <Input type=\"number\" inputMode=\"decimal\" min={SITE_PRINT_FONT_MIN} max={SITE_PRINT_FONT_MAX} step={0.5} className=\"h-10 rounded-xl bg-white text-center font-bold\" value={sitePrintFontSize} onChange={(e) => { const next = Number(e.target.value); if (Number.isFinite(next)) { setSitePrintFontSize(Math.min(SITE_PRINT_FONT_MAX, Math.max(SITE_PRINT_FONT_MIN, next))); setSitePrintFontAuto(false); } }} />\n                      <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${sitePrintFontAuto ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-600'}`}>\n                        <input type=\"checkbox\" className=\"h-4 w-4 accent-sky-700\" checked={sitePrintFontAuto} onChange={(e) => setSitePrintFontAuto(e.target.checked)} />\n                        تلقائي\n                      </label>\n                    </div>\n                    <p className=\"mt-1 text-[10px] text-muted-foreground\">من {SITE_PRINT_FONT_MIN} إلى {SITE_PRINT_FONT_MAX} px — كل تعديل رقمي يلغي الوضع التلقائي.</p>\n                  </div>\n",
    ),
    (
        "<strong>التنسيق الحالي:</strong><span>الخط: {sitePrintFontSize === 'auto' ? 'تلقائي' : sitePrintFontSize === 'small' ? 'صغير' : sitePrintFontSize === 'medium' ? 'متوسط' : 'كبير'}</span>",
        "<strong>التنسيق الحالي:</strong><span>الخط: {sitePrintFontAuto ? 'تلقائي' : `${sitePrintFontSize} px`}</span>",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, found {count}: {old[:120]!r}')
    text = text.replace(old, new, 1)

if 'SitePrintFontSize' in text:
    raise SystemExit('Legacy SitePrintFontSize type/reference still present')
if "sitePrintFontSize === '" in text:
    raise SystemExit('Legacy font-size enum comparison still present')

path.write_text(text, encoding='utf-8')
