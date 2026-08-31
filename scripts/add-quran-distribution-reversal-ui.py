from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# API endpoint for an auditable reversal. The backend creates a compensating return movement.
if 'reverseQuranStockMovement:' not in api:
    old = "  createQuranStockMovement: (input: Record<string, unknown>) => apiJson<MosqueQuranStockMovement>('/api/mosques/quran-stock/movements', { method: 'POST', body: JSON.stringify(input) }),\n"
    new = old + "  reverseQuranStockMovement: (id: string, input: { reason: string }) => apiJson<{ reversedMovementId: string; reversal: MosqueQuranStockMovement }>(`/api/mosques/quran-stock/movements/${id}/reverse`, { method: 'POST', body: JSON.stringify(input) }),\n"
    api = replace_once(api, old, new, 'mosqueApi reversal method')

# Import movement type into page.
if 'type MosqueQuranStockMovement,' not in page:
    page = replace_once(
        page,
        "  type MosqueQuranStockDashboard,\n  type MosqueQuranWarehouse,",
        "  type MosqueQuranStockDashboard,\n  type MosqueQuranStockMovement,\n  type MosqueQuranWarehouse,",
        'movement type import',
    )

# Display reversal rows clearly.
if 'const quranStockMovementDisplayLabel' not in page:
    marker = "const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف', location: '', active: true, minLargeCount: '0', minMediumCount: '0', minSmallCount: '0', notes: '' });\n"
    helper = "const quranStockMovementDisplayLabel = (movement: MosqueQuranStockMovement) =>\n  movement.movementType === 'return' && movement.notes?.startsWith('تراجع عن حركة الصرف')\n    ? 'تراجع عن صرف'\n    : quranStockMovementTypeLabels[movement.movementType] || movement.movementType;\n"
    page = replace_once(page, marker, helper + marker, 'movement label helper')

# Detect whether a displayed distribution has already been reversed.
if 'const isQuranDistributionReversed' not in page:
    marker = "  const openQuranInventoryDialog = (site: MosqueSite) => {\n"
    helper = "  const isQuranDistributionReversed = (movementNumber: string) => Boolean(\n    quranStockDashboard?.recentMovements.some((item) => item.movementType === 'return' && item.referenceNumber === movementNumber)\n  );\n\n"
    page = replace_once(page, marker, helper + marker, 'reversed movement detector')

# Add user action that calls the compensating-entry backend endpoint.
if 'const reverseQuranStockMovement = async' not in page:
    marker = "  const openQuranHistory = async (site: MosqueSite) => {\n"
    action = """  const reverseQuranStockMovement = async (movement: MosqueQuranStockMovement) => {
    if (movement.movementType !== 'distribution') return;
    if (isQuranDistributionReversed(movement.movementNumber)) return toast.info('تم التراجع عن حركة الصرف هذه مسبقًا');
    const reason = window.prompt(`سبب التراجع عن حركة الصرف ${movement.movementNumber}:`, 'إدخال حركة الصرف بالخطأ');
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error('اكتب سببًا واضحًا للتراجع');
    if (!window.confirm(`سيتم عكس حركة الصرف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المستودع مع إبقاء الحركة الأصلية في السجل. هل تريد المتابعة؟`)) return;
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.reverseQuranStockMovement(movement.id, { reason: reason.trim() });
      toast.success(`تم التراجع عن الصرف وإعادة الكمية للمستودع بموجب ${result.reversal.movementNumber}`);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر التراجع عن حركة الصرف');
    } finally {
      setQuranStockSaving(false);
    }
  };

"""
    page = replace_once(page, marker, action + marker, 'reversal action insertion')

# Use the clearer label in warehouse print movement rows too.
page = page.replace(
    "quranStockMovementTypeLabels[movement.movementType] || movement.movementType",
    "quranStockMovementDisplayLabel(movement)",
)

# Replace the main recent-movements table with an actions column and reversal control.
old_table = '''{quranStockDashboard?.recentMovements.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">المستودع</th><th className="p-3">المسجد / المصلى</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th></tr></thead><tbody>{quranStockDashboard.recentMovements.slice(0, 20).map((movement) => <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center"><Badge variant="outline">{quranStockMovementDisplayLabel(movement)}</Badge></td><td className="p-3 text-center">{movement.warehouse?.name || '-'}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد حركات مخزون مسجلة حتى الآن.</div>}'''
new_table = '''{quranStockDashboard?.recentMovements.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">المستودع</th><th className="p-3">المسجد / المصلى</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th><th className="p-3">الإجراء</th></tr></thead><tbody>{quranStockDashboard.recentMovements.slice(0, 20).map((movement) => { const reversed = movement.movementType === 'distribution' && isQuranDistributionReversed(movement.movementNumber); return <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center"><Badge variant="outline" className={movement.notes?.startsWith('تراجع عن حركة الصرف') ? 'border-amber-300 bg-amber-50 text-amber-800' : ''}>{quranStockMovementDisplayLabel(movement)}</Badge></td><td className="p-3 text-center">{movement.warehouse?.name || '-'}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 text-center">{movement.movementType === 'distribution' ? reversed ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">تم التراجع</Badge> : role === 'head' ? <Button size="sm" variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" disabled={quranStockSaving} onClick={() => void reverseQuranStockMovement(movement)}><RefreshCw className="ml-1 h-3.5 w-3.5" />تراجع</Button> : '-' : movement.notes?.startsWith('تراجع عن حركة الصرف') ? <span className="text-xs text-muted-foreground">حركة عكسية</span> : '-'}</td></tr>; })}</tbody></table></div> : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد حركات مخزون مسجلة حتى الآن.</div>}'''
if old_table in page:
    page = replace_once(page, old_table, new_table, 'recent movements table')
elif '<th className="p-3">الإجراء</th>' not in page:
    raise SystemExit('Recent movements table shape not found')

# Clarify accounting behavior near the movement list.
page = page.replace(
    '<p className="text-xs text-muted-foreground">سجل التوريد والصرف والتوزيع والإرجاع والتسويات.</p>',
    '<p className="text-xs text-muted-foreground">سجل محاسبي غير قابل للمحو. التراجع عن الصرف ينشئ حركة إرجاع عكسية ويحافظ على الحركة الأصلية للتدقيق.</p>',
    1,
)

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Added one-click auditable reversal UI for Quran distribution movements.')
