from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Patch marker not found: {label}')
    return text.replace(old, new, 1)

page_path = Path('src/app/pages/MosquesUnitPage.tsx')
field_path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
page = page_path.read_text(encoding='utf-8')
field = field_path.read_text(encoding='utf-8')

# -----------------------------------------------------------------------------
# MosquesUnitPage: imports
# -----------------------------------------------------------------------------
page = replace_once(
    page,
    "  Eye,\n  FileText,\n  Filter,",
    "  Eye,\n  FileSpreadsheet,\n  FileText,\n  Filter,",
    'page FileSpreadsheet import',
)
page = replace_once(
    page,
    "import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';\n",
    "import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';\nimport { appendExcelReportSheet, excelReportDateStamp } from '../utils/excelReport';\n",
    'page excel helper import',
)

# -----------------------------------------------------------------------------
# MosquesUnitPage: warehouse Excel report
# -----------------------------------------------------------------------------
warehouse_marker = "  const printQuranWarehouse = (warehouse: MosqueQuranWarehouse) => {\n"
warehouse_export = r'''  const exportQuranWarehouseExcel = (warehouse: MosqueQuranWarehouse) => {
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص المكتبة', [{
      'رمز المكتبة': warehouse.code || '-',
      'اسم المكتبة': warehouse.name,
      'الموقع': warehouse.location || '-',
      'الحالة': warehouse.active ? 'مفعّلة' : 'غير مفعّلة',
      'حالة الرصيد': warehouse.lowStock ? 'رصيد منخفض' : 'الرصيد آمن',
      'إجمالي الرصيد': warehouse.balance.totalCount,
      'الكبيرة': warehouse.balance.largeCount,
      'المتوسطة': warehouse.balance.mediumCount,
      'الصغيرة': warehouse.balance.smallCount,
      'الحد الأدنى - كبيرة': warehouse.minLargeCount,
      'الحد الأدنى - متوسطة': warehouse.minMediumCount,
      'الحد الأدنى - صغيرة': warehouse.minSmallCount,
      'النقص - كبيرة': warehouse.shortage.largeCount,
      'النقص - متوسطة': warehouse.shortage.mediumCount,
      'النقص - صغيرة': warehouse.shortage.smallCount,
      'الملاحظات': warehouse.notes || '-',
      'تاريخ التصدير': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    const movements = (quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === warehouse.id);
    appendExcelReportSheet(workbook, 'حركات المكتبة', movements.map((movement, index) => ({
      'م': index + 1,
      'رقم الحركة': movement.movementNumber,
      'نوع الحركة': quranStockMovementDisplayLabel(movement),
      'الموقع المستفيد': movement.site?.name || '-',
      'كبيرة': movement.largeCount,
      'متوسطة': movement.mediumCount,
      'صغيرة': movement.smallCount,
      'الإجمالي': movement.totalCount,
      'التاريخ': new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'),
    })), 'لا توجد حركات مصاحف ظاهرة لهذه المكتبة');
    XLSX.writeFile(workbook, `quran-warehouse-${warehouse.code || warehouse.id}-${excelReportDateStamp()}.xlsx`);
    toast.success('تم تجهيز ملف Excel للمكتبة');
  };

'''
page = replace_once(page, warehouse_marker, warehouse_export + warehouse_marker, 'warehouse export function')

# -----------------------------------------------------------------------------
# MosquesUnitPage: site/media Excel helpers and filtered site report
# -----------------------------------------------------------------------------
site_marker = "  const printSitesTable = (rows: MosqueSite[], mode: 'print' | 'preview' = 'print') => {\n"
site_export = r'''  const siteExcelValue = (site: MosqueSite, key: SitePrintColumnKey) => {
    const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
    const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
    if (key === 'name') return site.name;
    if (key === 'type') return siteTypeDisplayLabel(site);
    if (key === 'building') return buildingCode;
    if (key === 'location') return site.campusLocation || '-';
    if (key === 'cityDistrict') return cityDistrict;
    if (key === 'area') return site.area ?? '-';
    if (key === 'capacity') return site.capacity ?? '-';
    if (key === 'imam') return site.imamName || '-';
    if (key === 'muezzin') return site.muezzinName || '-';
    if (key === 'khateeb') return site.khateebName || '-';
    if (key === 'coordinatorName') return site.coordinatorName || '-';
    if (key === 'contactPhone') return site.contactPhone || '-';
    if (key === 'coordinates') return site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
    if (key === 'status') return siteStatusLabels[site.status] || site.status;
    if (key === 'notes') return site.notes || '-';
    return '-';
  };

  const siteMediaExcelRows = (rows: MosqueSite[]) => rows.flatMap((site) => {
    const media = normalizeSiteMedia(site.images || null);
    return [
      ...media.photos.map((item, index) => ({
        'المسجد / المصلى': site.name,
        'نوع الموقع': siteTypeDisplayLabel(site),
        'نوع المرفق': 'صورة',
        'التصنيف': item.category === 'site_image' ? 'صورة الموقع / المبنى' : 'صورة المسجد / المصلى',
        'الترتيب': index + 1,
        'اسم الملف': item.fileName || `صورة ${index + 1}`,
        'الوصف': item.description || '-',
        'نوع الملف': item.mimeType || '-',
        'الرابط': item.url || '-',
        'معرف الملف': item.fileId || '-',
      })),
      ...media.documents.map((item, index) => ({
        'المسجد / المصلى': site.name,
        'نوع الموقع': siteTypeDisplayLabel(site),
        'نوع المرفق': 'مستند',
        'التصنيف': 'مستند / ملف',
        'الترتيب': index + 1,
        'اسم الملف': item.fileName || `مستند ${index + 1}`,
        'الوصف': '-',
        'نوع الملف': item.mimeType || '-',
        'الرابط': item.url || '-',
        'معرف الملف': item.fileId || '-',
      })),
    ];
  });

  const exportSitesExcel = (rows: MosqueSite[], filePrefix = 'mosques-sites-report') => {
    if (!rows.length) return toast.info('لا توجد مساجد أو مصليات لتصديرها');
    const selectedColumns = SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key));
    if (!selectedColumns.length) return toast.info('حدد عمودًا واحدًا على الأقل للتقرير');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'المساجد والمصليات', rows.map((site, index) => Object.fromEntries([
      ['م', index + 1],
      ...selectedColumns.map((column) => [column.label, siteExcelValue(site, column.key)]),
    ])));
    appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(rows), 'لا توجد صور أو مرفقات للمواقع المحددة');
    XLSX.writeFile(workbook, `${filePrefix}-${excelReportDateStamp()}.xlsx`);
    toast.success(`تم تجهيز Excel ويشمل ${rows.length} موقعًا وورقة مستقلة للصور والمرفقات`);
  };

'''
page = replace_once(page, site_marker, site_export + site_marker, 'site Excel helpers')

# -----------------------------------------------------------------------------
# MosquesUnitPage: Quran inventory Excel report using same report filters/sort
# -----------------------------------------------------------------------------
quran_print_marker = "  const printQuranInventory = () => {\n"
quran_export = r'''  const exportQuranInventoryExcel = () => {
    if (!quranPrintRows.length) return toast.info('لا توجد بيانات مصاحف مطابقة لمعايير التقرير');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'حصر المصاحف', quranPrintRows.map((row, index) => ({
      'م': index + 1,
      'المسجد / المصلى': row.site.name,
      'النوع': siteTypeDisplayLabel(row.site),
      'الموقع': [row.site.campusLocation, row.site.city, row.site.district].filter(Boolean).join(' — ') || '-',
      'كبيرة': row.large,
      'متوسطة': row.medium,
      'صغيرة': row.small,
      'الإجمالي': row.total,
      'المسحوبة': row.damaged,
      'المستهدف': row.target || 0,
      'التغطية %': row.coverage ?? '-',
      'الاحتياج': row.needed,
      'آخر جرد': row.latest ? new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد',
    })));
    appendExcelReportSheet(workbook, 'ملخص التقرير', [{
      'عدد المواقع': quranPrintStats.sites,
      'إجمالي المصاحف': quranPrintStats.total,
      'الكبيرة': quranPrintStats.large,
      'المتوسطة': quranPrintStats.medium,
      'الصغيرة': quranPrintStats.small,
      'المسحوبة': quranPrintStats.damaged,
      'الاحتياج': quranPrintStats.needed,
      'تاريخ التصدير': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(quranPrintRows.map((row) => row.site)), 'لا توجد صور أو مرفقات للمواقع الظاهرة في التقرير');
    XLSX.writeFile(workbook, `quran-inventory-report-${excelReportDateStamp()}.xlsx`);
    toast.success('تم تجهيز تقرير المصاحف بصيغة Excel مع ورقة الصور والمرفقات');
  };

'''
page = replace_once(page, quran_print_marker, quran_export + quran_print_marker, 'quran inventory export function')

# -----------------------------------------------------------------------------
# MosquesUnitPage: improve general report export with media sheet
# -----------------------------------------------------------------------------
old_general = """      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(quranInventoryItems.map((item) => ({ الموقع: item.site.name, النوع: siteTypeDisplayLabel(item.site as MosqueSite), كبير: item.latest?.largeCount || 0, متوسط: item.latest?.mediumCount || 0, صغير: item.latest?.smallCount || 0, الإجمالي: item.latest?.totalCount || 0, المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0, المستهدف: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.targetCount || 0, التغطية: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent != null ? `${quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent}%` : '-', الاحتياج: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0, 'آخر جرد': item.latest?.countedAt ? new Date(item.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد' }))), 'حصر المصاحف');
      XLSX.writeFile(workbook, `mosques-unit-report-${new Date().toISOString().slice(0, 10)}.xlsx`);"""
new_general = """      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(quranInventoryItems.map((item) => ({ الموقع: item.site.name, النوع: siteTypeDisplayLabel(item.site as MosqueSite), كبير: item.latest?.largeCount || 0, متوسط: item.latest?.mediumCount || 0, صغير: item.latest?.smallCount || 0, الإجمالي: item.latest?.totalCount || 0, المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0, المستهدف: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.targetCount || 0, التغطية: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent != null ? `${quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent}%` : '-', الاحتياج: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0, 'آخر جرد': item.latest?.countedAt ? new Date(item.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد' }))), 'حصر المصاحف');
      appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(sites), 'لا توجد صور أو مرفقات مسجلة');
      XLSX.writeFile(workbook, `mosques-unit-report-${excelReportDateStamp()}.xlsx`);"""
page = replace_once(page, old_general, new_general, 'general report media sheet')

# -----------------------------------------------------------------------------
# MosquesUnitPage: buttons
# -----------------------------------------------------------------------------
site_buttons_old = """                  {canPrint && visibleSites.length > 0 && <Button variant=\"outline\" className={button3d} onClick={() => printSitesTable(visibleSites, 'preview')}><Eye className=\"ml-2 h-4 w-4\" />معاينة التقرير</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites, 'print')}><Printer className=\"ml-2 h-4 w-4\" />طباعة / PDF كجدول ({visibleSites.length})</Button>}"""
site_buttons_new = """                  {canPrint && visibleSites.length > 0 && <Button variant=\"outline\" className={button3d} onClick={() => printSitesTable(visibleSites, 'preview')}><Eye className=\"ml-2 h-4 w-4\" />معاينة التقرير</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={() => exportSitesExcel(visibleSites)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel ({visibleSites.length})</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites, 'print')}><Printer className=\"ml-2 h-4 w-4\" />طباعة / PDF كجدول ({visibleSites.length})</Button>}"""
page = replace_once(page, site_buttons_old, site_buttons_new, 'site report Excel button')

# SiteCard prop + usage
page = replace_once(
    page,
    "<SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} canPrint={canPrint} onPreview={() => setPreviewSite(site)} onPrint={() => void printSiteCard(site)} onEdit={() => openSiteDialog(site)}",
    "<SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} canPrint={canPrint} onPreview={() => setPreviewSite(site)} onPrint={() => void printSiteCard(site)} onExcel={() => exportSitesExcel([site], `mosque-${site.publicToken || site.id}`)} onEdit={() => openSiteDialog(site)}",
    'SiteCard Excel callback usage',
)
page = replace_once(
    page,
    "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null })",
    "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onExcel, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onExcel: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null })",
    'SiteCard Excel prop',
)
page = replace_once(
    page,
    "{canPrint && <Button variant=\"outline\" className={siteActionButton} onClick={onPrint}><Printer className=\"h-4 w-4 shrink-0\" />طباعة / PDF</Button>}",
    "{canPrint && <Button className={`${siteActionButton} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={onExcel}><FileSpreadsheet className=\"h-4 w-4 shrink-0 text-white\" />Excel</Button>}{canPrint && <Button variant=\"outline\" className={siteActionButton} onClick={onPrint}><Printer className=\"h-4 w-4 shrink-0\" />طباعة / PDF</Button>}",
    'SiteCard Excel button',
)

# Preview site Excel button
page = replace_once(
    page,
    "{canPrint && <Button variant=\"outline\" className={button3d} onClick={() => void printSiteCard(previewSite)} disabled={printingSiteCard}>",
    "{canPrint && <Button className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={() => exportSitesExcel([previewSite], `mosque-${previewSite.publicToken || previewSite.id}`)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button>}{canPrint && <Button variant=\"outline\" className={button3d} onClick={() => void printSiteCard(previewSite)} disabled={printingSiteCard}>",
    'preview site Excel button',
)

# Quran report dialog Excel button
page = replace_once(
    page,
    "            <Button className={`min-w-44 ${button3d} bg-sky-700 hover:bg-sky-600`} onClick={printQuranInventory} disabled={!quranPrintRows.length}><Printer className=\"ml-2 h-4 w-4\" />طباعة / حفظ PDF</Button>",
    "            <Button className={`min-w-36 ${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={exportQuranInventoryExcel} disabled={!quranPrintRows.length}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button>\n            <Button className={`min-w-44 ${button3d} bg-sky-700 hover:bg-sky-600`} onClick={printQuranInventory} disabled={!quranPrintRows.length}><Printer className=\"ml-2 h-4 w-4\" />طباعة / حفظ PDF</Button>",
    'quran report Excel button',
)

# Warehouse card Excel button
page = replace_once(
    page,
    "                      <Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => printQuranWarehouse(warehouse)}><Printer className=\"ml-1 h-4 w-4\" />طباعة</Button>",
    "                      <Button size=\"sm\" className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={() => exportQuranWarehouseExcel(warehouse)}><FileSpreadsheet className=\"ml-1 h-4 w-4 text-white\" />Excel</Button>\n                      <Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => printQuranWarehouse(warehouse)}><Printer className=\"ml-1 h-4 w-4\" />طباعة</Button>",
    'warehouse card Excel button',
)
page = replace_once(
    page,
    "<DialogFooter className=\"border-t bg-white p-4 md:px-6\"><Button variant=\"outline\" onClick={() => setQuranWarehousePreview(null)}>إغلاق</Button><Button variant=\"outline\" onClick={() => printQuranWarehouse(quranWarehousePreview)}><Printer className=\"ml-2 h-4 w-4\" />طباعة</Button>",
    "<DialogFooter className=\"border-t bg-white p-4 md:px-6\"><Button variant=\"outline\" onClick={() => setQuranWarehousePreview(null)}>إغلاق</Button><Button className=\"border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={() => exportQuranWarehouseExcel(quranWarehousePreview)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel</Button><Button variant=\"outline\" onClick={() => printQuranWarehouse(quranWarehousePreview)}><Printer className=\"ml-2 h-4 w-4\" />طباعة</Button>",
    'warehouse preview Excel button',
)

# General report Excel styling/label
page = replace_once(
    page,
    "<Button variant=\"outline\" className={button3d} onClick={exportReportExcel}><FileText className=\"ml-2 h-4 w-4\" />تصدير Excel</Button>",
    "<Button className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={exportReportExcel}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button>",
    'general report Excel styling',
)

# -----------------------------------------------------------------------------
# MosqueFieldVisitsPanel: imports
# -----------------------------------------------------------------------------
field = replace_once(
    field,
    "  EyeOff,\n  Image as ImageIcon,",
    "  EyeOff,\n  FileSpreadsheet,\n  Image as ImageIcon,",
    'field FileSpreadsheet import',
)
field = replace_once(
    field,
    "import { toast } from 'sonner';\n",
    "import { toast } from 'sonner';\nimport * as XLSX from 'xlsx';\n",
    'field XLSX import',
)
field = replace_once(
    field,
    "import { Textarea } from './ui/textarea';\n",
    "import { Textarea } from './ui/textarea';\nimport { appendExcelReportSheet, excelReportDateStamp } from '../utils/excelReport';\n",
    'field excel helper import',
)

# -----------------------------------------------------------------------------
# MosqueFieldVisitsPanel: Excel functions
# -----------------------------------------------------------------------------
field_export_marker = "  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {\n"
field_export = r'''  const visitMediaExcelRows = (visit: MosqueFieldVisit, selectedItems: MosqueFieldVisitItem[]) => [
    ...(visit.attachments || []).map((attachment, index) => ({
      'رقم الزيارة': visit.visitNumber,
      'المسجد / المصلى': visit.site.name,
      'المحور': 'مرفقات الزيارة',
      'بند الفحص': '-',
      'المرحلة': 'مرفق الزيارة',
      'الترتيب': index + 1,
      'اسم الملف': attachment.fileName || `مرفق ${index + 1}`,
      'نوع الملف': attachment.mimeType || '-',
      'تاريخ الالتقاط': attachment.capturedAt ? new Date(attachment.capturedAt).toLocaleString('ar-SA-u-ca-gregory') : '-',
      'الرابط': attachment.url || '-',
      'معرف الملف': attachment.fileId || '-',
    })),
    ...selectedItems.flatMap((item) => [
      ...(item.beforeImages || []).map((attachment, index) => ({
        'رقم الزيارة': visit.visitNumber,
        'المسجد / المصلى': visit.site.name,
        'المحور': item.category,
        'بند الفحص': item.title,
        'المرحلة': isActivityApprovalItem(item) ? 'مرفق اعتماد النشاط' : 'قبل المعالجة',
        'الترتيب': index + 1,
        'اسم الملف': attachment.fileName || `${isActivityApprovalItem(item) ? 'مرفق اعتماد' : 'قبل المعالجة'} ${index + 1}`,
        'نوع الملف': attachment.mimeType || '-',
        'تاريخ الالتقاط': attachment.capturedAt ? new Date(attachment.capturedAt).toLocaleString('ar-SA-u-ca-gregory') : '-',
        'الرابط': attachment.url || '-',
        'معرف الملف': attachment.fileId || '-',
      })),
      ...(item.afterImages || []).map((attachment, index) => ({
        'رقم الزيارة': visit.visitNumber,
        'المسجد / المصلى': visit.site.name,
        'المحور': item.category,
        'بند الفحص': item.title,
        'المرحلة': 'بعد المعالجة',
        'الترتيب': index + 1,
        'اسم الملف': attachment.fileName || `بعد المعالجة ${index + 1}`,
        'نوع الملف': attachment.mimeType || '-',
        'تاريخ الالتقاط': attachment.capturedAt ? new Date(attachment.capturedAt).toLocaleString('ar-SA-u-ca-gregory') : '-',
        'الرابط': attachment.url || '-',
        'معرف الملف': attachment.fileId || '-',
      })),
    ]),
  ];

  const visitExcelCellValue = (item: MosqueFieldVisitItem, column: VisitReportColumnKey) => {
    if (column === 'category') return item.category;
    if (column === 'title') return item.title;
    if (column === 'status') return getItemStatusLabel(item);
    if (column === 'priority') return priorityLabels[item.priority] || item.priority;
    if (column === 'note') {
      const census = isQuranFieldVisitItem(item) ? quranInventorySummary(item) : '';
      return [item.note, census].filter(Boolean).join(' — ') || '-';
    }
    if (column === 'responsible') return item.responsibleEntity || '-';
    if (column === 'due_date') return item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA-u-ca-gregory') : '-';
    if (column === 'resolution') return resolutionLabels[item.resolutionStatus] || item.resolutionStatus;
    if (column === 'resolution_note') return item.resolutionNote || '-';
    if (column === 'treatment_images') return isActivityApprovalItem(item)
      ? `${item.beforeImages?.length || 0} مرفق اعتماد`
      : `${item.beforeImages?.length || 0}/${item.afterImages?.length || 0}`;
    return '-';
  };

  const exportVisitExcel = (visit: MosqueFieldVisit) => {
    const configured = getConfiguredVisitItems(visit.items || []);
    const selectedItems = printTreatmentOnly
      ? configured.filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      : configured;
    if (!selectedItems.length) return toast.info('لا توجد بنود مطابقة لمعايير التقرير');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص الزيارة', [{
      'عنوان التقرير': visitPrintTitle.trim() || `تقرير زيارة ميدانية — ${visit.site.name}`,
      'رقم الزيارة': visit.visitNumber,
      'المسجد / المصلى': visit.site.name,
      'نوع الزيارة': visitTypeLabels[visit.visitType] || visit.visitType,
      'التاريخ': new Date(visit.visitDate).toLocaleString('ar-SA-u-ca-gregory'),
      'الحالة العامة': overallLabels[visit.overallStatus] || visit.overallStatus,
      'الأولوية': priorityLabels[visit.priority] || visit.priority,
      'حالة الزيارة': visitStatusLabels[visit.workflowStatus] || visit.workflowStatus,
      'فريق الزيارة': (visit.teamMembers || []).join('، ') || '-',
      'ممثل الموقع': visit.representativeName || '-',
      'الملاحظات العامة': visit.generalNotes || '-',
      'التوصيات': visit.recommendations || '-',
      'نوع التقرير': printTreatmentOnly ? 'تقرير المعالجة المصور' : 'تقرير الفحص الميداني',
    }]);

    if (printTreatmentOnly) {
      appendExcelReportSheet(workbook, 'المعالجة', selectedItems.map((item, index) => ({
        'م': index + 1,
        'المحور': item.category,
        'بند الفحص': item.title,
        'النتيجة': getItemStatusLabel(item),
        'الأولوية': priorityLabels[item.priority] || item.priority,
        'الملاحظة': item.note || '-',
        'الجهة المسؤولة': item.responsibleEntity || '-',
        'تاريخ الاستحقاق': item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA-u-ca-gregory') : '-',
        'حالة المعالجة': resolutionLabels[item.resolutionStatus] || item.resolutionStatus,
        'الإجراء / المعالجة المنفذة': item.resolutionNote || '-',
        'صور / مرفقات قبل': item.beforeImages?.length || 0,
        'صور بعد': item.afterImages?.length || 0,
      })));
    } else {
      const selectedColumns = visitReportColumns.filter((column) => visitPrintColumns.includes(column.key));
      appendExcelReportSheet(workbook, 'بنود الفحص', selectedItems.map((item, index) => Object.fromEntries([
        ['م', index + 1],
        ...selectedColumns.map((column) => [column.label, visitExcelCellValue(item, column.key)]),
      ])));
    }

    appendExcelReportSheet(workbook, 'الصور والمرفقات', visitMediaExcelRows(visit, selectedItems), 'لا توجد صور أو مرفقات مطابقة لهذا التقرير');
    XLSX.writeFile(workbook, `field-visit-${visit.visitNumber}-${excelReportDateStamp()}.xlsx`);
    toast.success('تم تجهيز Excel للزيارة مع ورقة مستقلة للصور والمرفقات');
  };

  const exportProgramExcel = () => {
    if (!filteredVisits.length) return toast.info('لا توجد زيارات مطابقة لمعايير التقرير');
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const cellValue = (visit: MosqueFieldVisit, column: ProgramReportColumnKey) => {
      if (column === 'visit_number') return visit.visitNumber;
      if (column === 'site') return visit.site.name;
      if (column === 'visit_type') return visitTypeLabels[visit.visitType] || visit.visitType;
      if (column === 'date') return new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory');
      if (column === 'tour') return visit.tour ? [visit.tour.tourNumber, visit.tour.title].filter(Boolean).join(' — ') : '-';
      if (column === 'location') return [visit.site.campusLocation, visit.site.district, visit.site.city].filter(Boolean).join(' — ') || '-';
      if (column === 'overall') return overallLabels[visit.overallStatus] || visit.overallStatus;
      if (column === 'priority') return priorityLabels[visit.priority] || visit.priority;
      if (column === 'open_items') return openCount(visit);
      if (column === 'urgent_items') return urgentCount(visit);
      if (column === 'overdue_items') return overdueCount(visit);
      if (column === 'workflow') return visitStatusLabels[visit.workflowStatus] || visit.workflowStatus;
      if (column === 'team') return (visit.teamMembers || []).join('، ') || '-';
      if (column === 'representative') return visit.representativeName || '-';
      if (column === 'attachments') return visit.attachments?.length || 0;
      if (column === 'treatment_images') {
        const before = visit.items.reduce((total, item) => total + (item.beforeImages?.length || 0), 0);
        const after = visit.items.reduce((total, item) => total + (item.afterImages?.length || 0), 0);
        return `${before}/${after}`;
      }
      return '-';
    };
    const selectedColumns = programReportColumns.filter((column) => programPrintColumns.includes(column.key));
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص التقرير', [{
      'عنوان التقرير': programReportTitle.trim() || 'تقرير البرنامج الميداني للمساجد والمصليات',
      'عدد الزيارات': filteredVisits.length,
      'عدد المواقع': new Set(filteredVisits.map((visit) => visit.siteId)).size,
      'الملاحظات المفتوحة': filteredVisits.reduce((total, visit) => total + openCount(visit), 0),
      'العاجلة': filteredVisits.reduce((total, visit) => total + urgentCount(visit), 0),
      'المتأخرة': filteredVisits.reduce((total, visit) => total + overdueCount(visit), 0),
      'تاريخ التصدير': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    appendExcelReportSheet(workbook, 'الزيارات', filteredVisits.map((visit, index) => Object.fromEntries([
      ['م', index + 1],
      ...selectedColumns.map((column) => [column.label, cellValue(visit, column.key)]),
    ])));
    appendExcelReportSheet(workbook, 'الصور والمرفقات', filteredVisits.flatMap((visit) => visitMediaExcelRows(visit, visit.items || [])), 'لا توجد صور أو مرفقات للزيارات المطابقة');
    XLSX.writeFile(workbook, `field-program-report-${excelReportDateStamp()}.xlsx`);
    toast.success('تم تجهيز تقرير البرنامج بصيغة Excel مع الصور والمرفقات كرابط قابل للفتح');
  };

  const exportTourTreatmentExcel = (tour: MosqueFieldTour) => {
    const tourVisits = (tour.visits || [])
      .map((tourVisit) => visits.find((visit) => visit.id === tourVisit.id))
      .filter((visit): visit is MosqueFieldVisit => Boolean(visit));
    if (!tourVisits.length) return toast.info('لا توجد زيارات مرتبطة بهذه الجولة');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص الجولة', [{
      'رقم الجولة': tour.tourNumber,
      'عنوان الجولة': tour.title,
      'تاريخ الجولة': new Date(tour.scheduledDate).toLocaleDateString('ar-SA-u-ca-gregory'),
      'النطاق': tour.scope || '-',
      'فريق الجولة': (tour.teamMembers || []).join('، ') || '-',
      'عدد الزيارات': tourVisits.length,
      'الحالة': tourStatusLabels[tour.status] || tour.status,
    }]);
    const treatmentItems = tourVisits.flatMap((visit) => (visit.items || [])
      .filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      .map((item) => ({ visit, item })));
    appendExcelReportSheet(workbook, 'المعالجة', treatmentItems.map(({ visit, item }, index) => ({
      'م': index + 1,
      'رقم الزيارة': visit.visitNumber,
      'المسجد / المصلى': visit.site.name,
      'المحور': item.category,
      'بند الفحص': item.title,
      'الأولوية': priorityLabels[item.priority] || item.priority,
      'الملاحظة': item.note || '-',
      'الجهة المسؤولة': item.responsibleEntity || '-',
      'حالة المعالجة': resolutionLabels[item.resolutionStatus] || item.resolutionStatus,
      'الإجراء / المعالجة المنفذة': item.resolutionNote || '-',
      'قبل': item.beforeImages?.length || 0,
      'بعد': item.afterImages?.length || 0,
    })));
    appendExcelReportSheet(workbook, 'الصور والمرفقات', tourVisits.flatMap((visit) => visitMediaExcelRows(visit, (visit.items || []).filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length))), 'لا توجد صور أو مرفقات معالجة في الجولة');
    XLSX.writeFile(workbook, `field-tour-${tour.tourNumber}-${excelReportDateStamp()}.xlsx`);
    toast.success('تم تجهيز Excel للجولة مع سجل صور قبل / بعد المعالجة');
  };

'''
field = replace_once(field, field_export_marker, field_export + field_export_marker, 'field Excel functions')

# -----------------------------------------------------------------------------
# MosqueFieldVisitsPanel: Excel buttons
# -----------------------------------------------------------------------------
field = replace_once(
    field,
    "          {canPrint && <Button variant=\"outline\" onClick={openProgramPrintDialog}><Printer className=\"ml-2 h-4 w-4\" />تقرير البرنامج</Button>}",
    "          {canPrint && <Button className=\"border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={exportProgramExcel}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel</Button>}\n          {canPrint && <Button variant=\"outline\" onClick={openProgramPrintDialog}><Printer className=\"ml-2 h-4 w-4\" />تقرير البرنامج</Button>}",
    'field header Excel button',
)

field = replace_once(
    field,
    "        <DialogFooter className=\"gap-2\"><Button variant=\"outline\" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className=\"ml-2 h-4 w-4\" />متابعة إلى الطباعة</Button></DialogFooter>",
    "        <DialogFooter className=\"gap-2\"><Button variant=\"outline\" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button className=\"border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={exportProgramExcel} disabled={!filteredVisits.length}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className=\"ml-2 h-4 w-4\" />متابعة إلى الطباعة</Button></DialogFooter>",
    'program dialog Excel button',
)

field = replace_once(
    field,
    "            <Button className=\"bg-sky-700 text-white hover:bg-sky-800\" onClick={() => void confirmVisitPrint()} disabled={preparingPrint || (!printTreatmentOnly && !configuredPrintItems.length) || (printTreatmentOnly && !printTreatmentCount)}>",
    "            <Button className=\"border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={() => printTarget && exportVisitExcel(printTarget)} disabled={preparingPrint || (!printTreatmentOnly && !configuredPrintItems.length) || (printTreatmentOnly && !printTreatmentCount)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button>\n            <Button className=\"bg-sky-700 text-white hover:bg-sky-800\" onClick={() => void confirmVisitPrint()} disabled={preparingPrint || (!printTreatmentOnly && !configuredPrintItems.length) || (printTreatmentOnly && !printTreatmentCount)}>",
    'single visit dialog Excel button',
)

field = replace_once(
    field,
    "{canPrint && <Button size=\"sm\" variant=\"outline\" className=\"w-full border-emerald-200 text-emerald-800\" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className=\"ml-2 h-4 w-4\" />تقرير المعالجة المصور قبل / بعد</Button>}",
    "{canPrint && <div className=\"grid gap-2 sm:grid-cols-2\"><Button size=\"sm\" className=\"w-full border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={() => exportTourTreatmentExcel(tour)}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button><Button size=\"sm\" variant=\"outline\" className=\"w-full border-emerald-200 text-emerald-800\" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className=\"ml-2 h-4 w-4\" />تقرير المعالجة المصور قبل / بعد</Button></div>}",
    'tour Excel button',
)

# Viewing visit footer Excel button
field = replace_once(
    field,
    "            {canPrint && <Button variant=\"outline\" onClick={() => requestVisitPrint(viewingVisit)}><Printer className=\"ml-2 h-4 w-4\" />طباعة التقرير</Button>}",
    "            {canPrint && <Button className=\"border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white\" onClick={() => { resetVisitPrintOptions(viewingVisit); exportVisitExcel(viewingVisit); }}><FileSpreadsheet className=\"ml-2 h-4 w-4 text-white\" />Excel + الصور</Button>}\n            {canPrint && <Button variant=\"outline\" onClick={() => requestVisitPrint(viewingVisit)}><Printer className=\"ml-2 h-4 w-4\" />طباعة التقرير</Button>}",
    'viewing visit Excel button',
)

page_path.write_text(page, encoding='utf-8')
field_path.write_text(field, encoding='utf-8')
print('Mosques Excel report buttons and media sheets patch applied.')
