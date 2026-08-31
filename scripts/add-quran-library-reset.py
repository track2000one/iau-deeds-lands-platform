from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
api_text = api_path.read_text(encoding='utf-8')

api_marker = "  reverseQuranStockMovement: (id: string, input: { reason: string }) => apiJson<{ reversedMovementId: string; reversal: MosqueQuranStockMovement }>(`/api/mosques/quran-stock/movements/${id}/reverse`, { method: 'POST', body: JSON.stringify(input) }),\n"
if api_marker not in api_text:
    raise SystemExit('Quran API marker not found')
if 'resetQuranLibrary:' not in api_text:
    api_text = api_text.replace(
        api_marker,
        api_marker + "  resetQuranLibrary: (confirmation: string) => apiJson<{ message: string; reset: { warehouses: number; movements: number; inventories: number; notifications: number } }>('/api/mosques/quran-stock/reset', { method: 'POST', body: JSON.stringify({ confirmation }) }),\n",
        1,
    )
api_path.write_text(api_text, encoding='utf-8')

page_path = Path('src/app/pages/MosquesUnitPage.tsx')
text = page_path.read_text(encoding='utf-8')

function_marker = "  const openQuranStockMovement = (movementType: string) => {"
if function_marker not in text:
    raise SystemExit('Quran stock movement function marker not found')
if 'const resetQuranLibrary = async () =>' not in text:
    reset_function = r'''  const resetQuranLibrary = async () => {
    const confirmationPhrase = 'تصفير مكتبة المصاحف';
    const entered = window.prompt(
      `عملية التصفير ستحذف نهائيًا:\n\n• مكتبة المصاحف ورصيدها\n• جميع حركات إضافة وإرجاع المصاحف\n• جميع سجلات الجرد السابقة للمساجد والمصليات\n\nلن يتم حذف المساجد أو المصليات أو بياناتها الأساسية.\n\nللتأكيد اكتب العبارة التالية كما هي:\n${confirmationPhrase}`,
      ''
    );
    if (entered === null) return;
    if (entered.trim() !== confirmationPhrase) {
      toast.error('لم يتم التصفير لأن عبارة التأكيد غير مطابقة');
      return;
    }

    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.resetQuranLibrary(confirmationPhrase);
      setQuranWarehousePreview(null);
      setQuranWarehouseDialog(false);
      setQuranStockMovementDialog(false);
      toast.success(result.message || 'تم تصفير مكتبة المصاحف ويمكن البدء من الصفر');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصفير مكتبة المصاحف');
    } finally {
      setQuranStockSaving(false);
    }
  };

'''
    text = text.replace(function_marker, reset_function + function_marker, 1)

old_delete_note = "لن يسمح النظام بالحذف إذا كانت المكتبة مرتبطة بحركات محفوظة حفاظًا على السجل."
new_delete_note = "لن يسمح النظام بالحذف إذا كانت المكتبة مرتبطة بحركات محفوظة. إذا أردت البدء من الصفر استخدم زر «تصفير المكتبة»."
text = text.replace(old_delete_note, new_delete_note)

button_marker = "                <Button variant=\"outline\" className=\"border-amber-300 text-amber-800\" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className=\"ml-1 h-4 w-4\" />إرجاع للمكتبة</Button>"
if button_marker not in text:
    raise SystemExit('Quran library header button marker not found')
reset_button = button_marker + "\n                <Button variant=\"outline\" className={`${button3d} border-red-300 bg-red-50/60 text-red-700 hover:bg-red-100 hover:text-red-800`} onClick={() => void resetQuranLibrary()} disabled={quranStockSaving || (!quranStockDashboard?.warehouses.length && !quranStockDashboard?.summary.siteSystemTotal && quranSummary.countedSites === 0)}><RefreshCw className=\"ml-1 h-4 w-4\" />تصفير المكتبة</Button>"
if 'تصفير المكتبة</Button>' not in text:
    text = text.replace(button_marker, reset_button, 1)

page_path.write_text(text, encoding='utf-8')
print('Added protected Quran library reset UI and API method.')
