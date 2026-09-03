import fs from 'node:fs';

const file = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(before, after);
};

replaceOnce(
  "const freshItems = (items: MosqueFieldVisitItem[]) => normalizeQuranChecklistItems(items).map((item) => ({\n  ...item,\n  id: undefined,\n  note: item.note || '',\n  responsibleEntity: item.responsibleEntity || '',\n  dueDate: dateOnly(item.dueDate),\n  resolutionNote: item.resolutionNote || '',\n  details: item.details ? JSON.parse(JSON.stringify(item.details)) : null,\n  beforeImages: [...(item.beforeImages || [])],\n  afterImages: [...(item.afterImages || [])],\n}));",
  "const freshItems = (items: MosqueFieldVisitItem[]) => normalizeQuranChecklistItems(items).map((item) => ({\n  ...item,\n  id: undefined,\n  note: item.note || '',\n  responsibleEntity: item.responsibleEntity || '',\n  dueDate: dateOnly(item.dueDate),\n  resolutionNote: item.resolutionNote || '',\n  details: item.details ? JSON.parse(JSON.stringify(item.details)) : null,\n  beforeImages: [...(item.beforeImages || [])],\n  afterImages: [...(item.afterImages || [])],\n}));\n\nconst MANUAL_FIELD_VISIT_ITEM_KEY = 'manualFieldItem';\nconst isManualFieldVisitItem = (item: MosqueFieldVisitItem) => item.details?.[MANUAL_FIELD_VISIT_ITEM_KEY] === true;\nconst createManualFieldVisitItem = (): MosqueFieldVisitItem => ({\n  category: 'بند إضافي',\n  title: '',\n  status: 'not_checked',\n  note: '',\n  priority: 'normal',\n  responsibleEntity: '',\n  dueDate: '',\n  resolutionStatus: 'new',\n  resolutionNote: '',\n  details: { [MANUAL_FIELD_VISIT_ITEM_KEY]: true },\n  beforeImages: [],\n  afterImages: [],\n});",
  'manual item helpers',
);

replaceOnce(
  "  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {\n    setVisitForm((current) => ({\n      ...current,\n      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),\n    }));\n  };",
  "  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {\n    setVisitForm((current) => ({\n      ...current,\n      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),\n    }));\n  };\n\n  const addManualVisitItem = () => {\n    setVisitForm((current) => ({ ...current, items: [...current.items, createManualFieldVisitItem()] }));\n    window.setTimeout(() => document.getElementById('manual-field-visit-item-last')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);\n  };\n\n  const removeManualVisitItem = (index: number) => {\n    setVisitForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));\n  };",
  'manual item actions',
);

replaceOnce(
  "    const needsNote = visitForm.items.find((item) => item.status === 'needs_action' && !String(item.note || '').trim());",
  "    const unnamedManualItem = visitForm.items.find((item) => isManualFieldVisitItem(item) && !String(item.title || '').trim());\n    if (unnamedManualItem) {\n      toast.error('اكتب اسم البند الميداني الإضافي قبل حفظ الزيارة');\n      return;\n    }\n    const needsNote = visitForm.items.find((item) => item.status === 'needs_action' && !String(item.note || '').trim());",
  'manual item validation',
);

replaceOnce(
  "        items: visitForm.items.map((item) => ({ ...item, id: undefined, dueDate: item.dueDate || null })),",
  "        items: visitForm.items.map((item) => ({\n          ...item,\n          category: isManualFieldVisitItem(item) ? (String(item.category || '').trim() || 'بند إضافي') : item.category,\n          title: isManualFieldVisitItem(item) ? String(item.title || '').trim() : item.title,\n          id: undefined,\n          dueDate: item.dueDate || null,\n        })),",
  'manual item payload normalization',
);

replaceOnce(
  '<div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-black">قائمة الفحص الميداني</h3><p className="text-xs text-slate-500">تتغير خيارات النتيجة تلقائيًا حسب نوع بند الفحص، وأكمل جميع البنود قبل اعتماد الزيارة كمكتملة.</p></div><Badge variant="outline">{visitForm.items.filter((item) => item.status !== \'not_checked\').length} / {visitForm.items.length}</Badge></div>{visitForm.items.map((item, index) => <Card key={`${item.category}-${item.title}-${index}`}',
  '<div className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">قائمة الفحص الميداني</h3><p className="text-xs text-slate-500">تتغير خيارات النتيجة تلقائيًا حسب نوع بند الفحص، ويمكن إضافة بنود ميدانية غير موجودة في القائمة الأساسية لتدخل في نفس مسار الاعتماد والمتابعة.</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100" onClick={addManualVisitItem}><Plus className="ml-1 h-4 w-4" />إضافة بند ميداني</Button><Badge variant="outline">{visitForm.items.filter((item) => item.status !== \'not_checked\').length} / {visitForm.items.length}</Badge></div></div>{visitForm.items.map((item, index) => <Card id={isManualFieldVisitItem(item) && index === visitForm.items.length - 1 ? \'manual-field-visit-item-last\' : undefined} key={item.id || `visit-item-${index}`}',
  'checklist header and stable key',
);

replaceOnce(
  '<div className="min-w-0 flex-1"><Badge variant="outline" className="mb-1">{item.category}</Badge><p className="font-bold text-slate-800">{item.title}</p></div><NativeSelect className="lg:w-64"',
  "{isManualFieldVisitItem(item) ? <div className=\"min-w-0 flex-1 rounded-xl border border-sky-200 bg-sky-50/60 p-3\"><div className=\"mb-2 flex items-center justify-between gap-2\"><Badge variant=\"outline\" className=\"border-sky-300 bg-white text-sky-800\">بند مضاف يدويًا</Badge><Button type=\"button\" size=\"sm\" variant=\"ghost\" className=\"h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700\" onClick={() => removeManualVisitItem(index)}><Trash2 className=\"ml-1 h-4 w-4\" />حذف</Button></div><div className=\"grid gap-2 md:grid-cols-[180px_1fr]\"><Input value={item.category || ''} onChange={(event) => setVisitItem(index, { category: event.target.value })} maxLength={120} placeholder=\"التصنيف — مثال: السلامة\" /><Input value={item.title || ''} onChange={(event) => setVisitItem(index, { title: event.target.value })} maxLength={300} placeholder=\"اكتب البند الذي تريد فحصه *\" /></div></div> : <div className=\"min-w-0 flex-1\"><Badge variant=\"outline\" className=\"mb-1\">{item.category}</Badge><p className=\"font-bold text-slate-800\">{item.title}</p></div>}<NativeSelect className=\"lg:w-64\"",
  'manual item editor',
);

fs.writeFileSync(file, source);
console.log('Added flexible manual field-visit checklist items with standard approval and follow-up workflow.');
