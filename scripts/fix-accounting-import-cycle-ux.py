from pathlib import Path

p = Path('src/app/pages/AccountingTransformationImportPage.tsx')
s = p.read_text()

# Imports
marker = "import { NativeSelect } from '../components/ui/native-select';\n"
if "components/ui/input" not in s:
    if marker not in s:
        raise SystemExit('Input import marker not found')
    s = s.replace(marker, marker + "import { Input } from '../components/ui/input';\n", 1)

marker = "  getAccountingTransformationCycles,\n  importAccountingTransformationCycleRecords,\n"
if "createAccountingTransformationCycle" not in s:
    if marker not in s:
        raise SystemExit('API import marker not found')
    s = s.replace(marker, "  createAccountingTransformationCycle,\n" + marker, 1)

# State
marker = "  const [cyclesLoading, setCyclesLoading] = useState(true);\n"
if "const [cycleName" not in s:
    if marker not in s:
        raise SystemExit('state marker not found')
    s = s.replace(
        marker,
        marker
        + "  const [cycleName, setCycleName] = useState('');\n"
        + "  const [cycleDescription, setCycleDescription] = useState('');\n"
        + "  const [creatingCycle, setCreatingCycle] = useState(false);\n",
        1,
    )

# Inline draft-cycle creation
marker = "  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);\n"
if "const createDraftCycle" not in s:
    if marker not in s:
        raise SystemExit('selectedCycle marker not found')
    handler = """  const createDraftCycle = async () => {
    const name = cycleName.trim();
    if (!name) return toast.error('أدخل اسم دورة التحديث أولًا');
    setCreatingCycle(true);
    try {
      const created = await createAccountingTransformationCycle({
        name,
        description: cycleDescription.trim() || null,
      });
      setCycles([created]);
      setSelectedCycleId(created.id);
      setCycleName('');
      setCycleDescription('');
      setItems([]);
      setScan(null);
      setResult(null);
      setFileName('');
      setMessage('');
      toast.success(`تم إنشاء دورة #${created.cycleNumber} — ${created.name}. يمكنك الآن اختيار ملف Excel.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally {
      setCreatingCycle(false);
    }
  };

"""
    s = s.replace(marker, handler + marker, 1)

# Target cycle panel
start_marker = '      <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/50">'
end_marker = '      <Card className="rounded-[28px] border-dashed border-sky-300'
start = s.find(start_marker)
end = s.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit('cycle panel markers not found')
new_panel = '''      <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/50">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="text-xs font-bold text-slate-600">دورة التحديث المستهدفة
              <NativeSelect value={selectedCycleId} disabled={cyclesLoading || !cycles.length} onChange={(e) => { setSelectedCycleId(e.target.value); setItems([]); setScan(null); setResult(null); setFileName(''); setMessage(''); }} className="mt-1 h-11 rounded-xl bg-white">
                {cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value="">لا توجد دورة مسودة قابلة للاستيراد</option>}
              </NativeSelect>
            </label>
            <Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className="ml-2 h-4 w-4" />{cycles.length ? 'إدارة الدورات' : 'سجل الدورات'}</Button>
          </div>
          {selectedCycle && <p className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-xs text-slate-600">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. لن تصبح هذه البيانات رسمية حتى اعتماد الدورة.</p>}
          {!cyclesLoading && !cycles.length && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="mb-3"><p className="font-black text-amber-950">يلزم إنشاء دورة تحديث قبل اختيار ملف Excel</p><p className="mt-1 text-xs leading-6 text-amber-800">أنشئ الدورة هنا مرة واحدة، وبعدها سيتفعّل اختيار الملف تلقائيًا دون مغادرة الصفحة.</p></div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-xs font-bold text-slate-700">اسم الدورة
                <Input id="accounting-cycle-name" value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="مثال: تحديث بيانات أغسطس 2026" className="mt-1 h-11 rounded-xl bg-white" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createDraftCycle(); } }} />
              </label>
              <label className="text-xs font-bold text-slate-700">وصف مختصر
                <Input value={cycleDescription} onChange={(e) => setCycleDescription(e.target.value)} placeholder="مصدر البيانات أو سبب التحديث" className="mt-1 h-11 rounded-xl bg-white" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createDraftCycle(); } }} />
              </label>
              <Button type="button" className="h-11 rounded-xl px-5" onClick={createDraftCycle} disabled={creatingCycle || !cycleName.trim()}>{creatingCycle ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}{creatingCycle ? 'جاري الإنشاء...' : 'إنشاء الدورة والمتابعة'}</Button>
            </div>
          </div>}
        </CardContent>
      </Card>

'''
s = s[:start] + new_panel + s[end:]

# File chooser: never look clickable while unavailable, and allow selecting same file twice.
start_marker = '          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80'
start = s.find(start_marker)
if start == -1:
    raise SystemExit('file chooser start marker not found')
end = s.find('          </label>', start)
if end == -1:
    raise SystemExit('file chooser end marker not found')
end += len('          </label>')
new_chooser = '''          {selectedCycleId ? <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-10 text-center transition hover:bg-sky-50/80">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm"><FileSpreadsheet className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">اختر ملفًا واحدًا بصيغة XLSX أو XLS</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">سيتم التعرف تلقائيًا على ورقتي <strong>الأراضي - Land</strong> و<strong>Building - المباني</strong>، ثم فحص السجلات قبل إدخال أي بيانات.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري تحليل الملف...' : fileName || 'اضغط لاختيار XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} />
          </label> : <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-slate-200 bg-white text-slate-400 shadow-sm"><FileSpreadsheet className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-700">اختيار الملف سيتفعّل بعد إنشاء دورة التحديث</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">لن يرفع النظام الملف دون دورة مرتبطة به حتى تبقى كل نسخة من البيانات محفوظة ومؤرخة بشكل صحيح.</p>
            <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => document.getElementById('accounting-cycle-name')?.focus()}><PlusCircle className="ml-2 h-4 w-4" />إنشاء دورة أولًا</Button>
          </div>}'''
s = s[:start] + new_chooser + s[end:]

p.write_text(s)
