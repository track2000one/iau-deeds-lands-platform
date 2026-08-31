from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

old = 'سجل محاسبي غير قابل للمحو. التراجع عن الصرف ينشئ حركة إرجاع عكسية ويحافظ على الحركة الأصلية للتدقيق.'
new = 'سجل حركات غير قابل للمحو. التراجع عن إضافة المصاحف ينشئ حركة إرجاع عكسية ويحافظ على الحركة الأصلية للتدقيق.'
if old not in text:
    raise SystemExit('Expected visible reversal description not found')
text = text.replace(old, new, 1)
text = text.replace('لا توجد حركات مخزون مسجلة حتى الآن.', 'لا توجد حركات مصاحف مسجلة حتى الآن.')
text = text.replace("const stockStatus = warehouse.lowStock ? 'مخزون منخفض' : 'الرصيد آمن';", "const stockStatus = warehouse.lowStock ? 'رصيد منخفض' : 'الرصيد آمن';")
text = text.replace('تنبيه مخزون منخفض', 'تنبيه رصيد منخفض')
text = text.replace('>مخزون منخفض</Badge>', '>رصيد منخفض</Badge>')
text = text.replace('حدود التنبيه للمخزون', 'حدود التنبيه للرصيد')

old_metrics = '''                <ReportMetric label="إجمالي المصاحف" value={quranSummary.total} />
                <ReportMetric label="المصاحف الكبيرة" value={quranSummary.large} />
                <ReportMetric label="المصاحف المتوسطة" value={quranSummary.medium} />
                <ReportMetric label="المصاحف الصغيرة" value={quranSummary.small} />'''
new_metrics = '''                <ReportMetric label="إجمالي المصاحف" value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total} />
                <ReportMetric label="المصاحف الكبيرة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.largeCount, 0) ?? quranSummary.large} />
                <ReportMetric label="المصاحف المتوسطة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.mediumCount, 0) ?? quranSummary.medium} />
                <ReportMetric label="المصاحف الصغيرة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.smallCount, 0) ?? quranSummary.small} />'''
if old_metrics not in text:
    raise SystemExit('Quran inventory summary metric block not found')
text = text.replace(old_metrics, new_metrics, 1)

# Keep legacy persisted-note matching only; no old visible stock/distribution labels should remain.
if "movement.notes?.startsWith('تراجع عن حركة الصرف')" not in text:
    raise SystemExit('Legacy reversal-note compatibility missing')
for forbidden in ['التراجع عن الصرف ينشئ', 'حركات مخزون مسجلة', 'تنبيه مخزون منخفض', '>مخزون منخفض</Badge>']:
    if forbidden in text:
        raise SystemExit(f'Old visible wording remains: {forbidden}')

path.write_text(text, encoding='utf-8')
print('Polished Quran library labels and synchronized current site-stock metrics.')
