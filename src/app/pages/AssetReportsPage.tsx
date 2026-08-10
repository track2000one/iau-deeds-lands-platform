import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  FileSpreadsheet,
  Image as ImageIcon,
  Printer,
  Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import {
  getAttachmentPreviewUrl,
  isImageAttachmentPreview,
} from '../components/AttachmentPreview';
import { usePermissions } from '../../context/PermissionsContext';
import { getAssets } from '../api/assets';
import type { AssetAttachment, AssetRecord } from '../../types/asset';
import { ASSET_STATUS_LABELS } from '../../types/asset';

const CATEGORY_LABELS: Record<string, string> = {
  it: 'تقنية معلومات',
  furniture: 'أثاث',
  equipment: 'أجهزة ومعدات',
  vehicle: 'مركبات',
  other: 'أخرى',
};

const printableFields = [
  ['assetNumber', 'رقم الأصل'],
  ['barcode', 'الباركود'],
  ['name', 'اسم الأصل'],
  ['category', 'التصنيف'],
  ['brand', 'الماركة'],
  ['model', 'الموديل'],
  ['serialNumber', 'الرقم التسلسلي'],
  ['status', 'الحالة'],
  ['department', 'الجهة'],
  ['building', 'المبنى'],
  ['floor', 'الدور'],
  ['room', 'الغرفة / الموقع'],
  ['custodian', 'صاحب العهدة'],
  ['purchaseDate', 'تاريخ الشراء'],
  ['purchaseValue', 'قيمة الشراء'],
  ['attachments', 'عدد المرفقات'],
] as const;

type FieldKey = (typeof printableFields)[number][0];

const valueFor = (asset: AssetRecord, key: FieldKey) => {
  if (key === 'category') return CATEGORY_LABELS[asset.category] || asset.category;
  if (key === 'status') return ASSET_STATUS_LABELS[asset.status] || asset.status;
  if (key === 'purchaseDate') {
    return asset.purchaseDate
      ? new Date(asset.purchaseDate).toLocaleDateString('ar-SA')
      : '-';
  }
  if (key === 'purchaseValue') {
    return asset.purchaseValue != null
      ? Number(asset.purchaseValue).toLocaleString('ar-SA')
      : '-';
  }
  if (key === 'attachments') return asset.attachments?.length || 0;
  const value = asset[key as keyof AssetRecord];
  return value === null || value === undefined || value === '' ? '-' : String(value);
};

const escapeHtml = (value: unknown) =>
  String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getAssetImages = (asset: AssetRecord): AssetAttachment[] => {
  const attachments = Array.isArray(asset.attachments) ? asset.attachments : [];
  const explicitAssetImages = attachments.filter(
    (attachment) =>
      attachment.notes === 'asset_images' &&
      isImageAttachmentPreview(attachment)
  );

  if (explicitAssetImages.length > 0) return explicitAssetImages;

  return attachments.filter((attachment) => isImageAttachmentPreview(attachment));
};

const getImageHtml = (attachment: AssetAttachment, index: number) => {
  const previewUrl = getAttachmentPreviewUrl(attachment);
  if (!previewUrl) return '';

  return `
    <figure class="asset-photo">
      <div class="photo-frame">
        <img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(
          attachment.title || `صورة الأصل ${index + 1}`
        )}" />
      </div>
      <figcaption>${escapeHtml(
        attachment.title || `صورة الأصل ${index + 1}`
      )}</figcaption>
    </figure>
  `;
};

const buildAssetReportPage = (asset: AssetRecord, index: number) => {
  const images = getAssetImages(asset);
  const details: Array<[string, unknown]> = [
    ['رقم الأصل', asset.assetNumber],
    ['الباركود', asset.barcode],
    ['اسم الأصل', asset.name],
    ['التصنيف', CATEGORY_LABELS[asset.category] || asset.category],
    ['الماركة', asset.brand],
    ['الموديل', asset.model],
    ['الرقم التسلسلي', asset.serialNumber],
    ['الحالة', ASSET_STATUS_LABELS[asset.status] || asset.status],
    ['الجهة / الإدارة', asset.department],
    ['المبنى', asset.building],
    ['الدور', asset.floor],
    ['الغرفة / الموقع', asset.room],
    ['صاحب العهدة', asset.custodian],
    [
      'تاريخ الشراء',
      asset.purchaseDate
        ? new Date(asset.purchaseDate).toLocaleDateString('ar-SA')
        : '-',
    ],
    [
      'قيمة الشراء',
      asset.purchaseValue != null
        ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س`
        : '-',
    ],
  ];

  const detailCards = details
    .map(
      ([label, value]) => `
        <div class="detail-card">
          <div class="detail-label">${escapeHtml(label)}</div>
          <div class="detail-value">${escapeHtml(
            value === null || value === undefined || value === '' ? '-' : value
          )}</div>
        </div>
      `
    )
    .join('');

  const imageGallery = images.length
    ? images.map(getImageHtml).join('')
    : `
      <div class="no-photos">
        لا توجد صور أصل مرفقة بهذا السجل.
      </div>
    `;

  return `
    <section class="asset-report-page${index === 0 ? ' first-page' : ''}">
      <header class="asset-header">
        <div class="university">جامعة الإمام عبدالرحمن بن فيصل</div>
        <div class="administration">الإدارة العامة للأصول والأملاك والأوقاف الجامعية</div>
        <div class="report-title">تقرير أصل مستقل</div>
        <div class="asset-heading">
          <strong>${escapeHtml(asset.name)}</strong>
          <span>${escapeHtml(asset.assetNumber)}</span>
        </div>
      </header>

      <div class="details-grid">${detailCards}</div>

      <section class="photo-section">
        <div class="section-title">صور الأصل / الأثاث (${images.length})</div>
        <div class="photo-grid">${imageGallery}</div>
      </section>

      ${
        asset.notes
          ? `<section class="notes-section">
              <div class="section-title">الملاحظات</div>
              <div class="notes-box">${escapeHtml(asset.notes).replaceAll('\n', '<br />')}</div>
            </section>`
          : ''
      }

      <footer class="asset-footer">
        <span>رقم الأصل: ${escapeHtml(asset.assetNumber)}</span>
        <span>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</span>
        <span>وحدة الأصول</span>
      </footer>
    </section>
  `;
};

const buildIndividualReportsHtml = (assets: AssetRecord[]) => {
  const pages = assets.map((asset, index) => buildAssetReportPage(asset, index)).join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>تقارير الأصول الفردية بالصور</title>
<style>
@page { size: A4 portrait; margin: 9mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #172033; }
body { font-family: Tahoma, Arial, sans-serif; }
.asset-report-page {
  width: 100%;
  min-height: 277mm;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  break-after: page;
}
.asset-report-page:last-child { page-break-after: auto; break-after: auto; }
.asset-header {
  text-align: center;
  border: 1px solid #d8e0e8;
  border-top: 4px solid #1f4e79;
  border-radius: 14px;
  padding: 11px 14px 10px;
  background: linear-gradient(135deg, #fff, #f7fafc);
}
.university { font-size: 20px; font-weight: 800; color: #0f2742; }
.administration { margin-top: 3px; color: #64748b; font-size: 10.5px; }
.report-title {
  display: inline-block;
  margin-top: 7px;
  padding: 4px 18px;
  border-radius: 999px;
  border: 1px solid #cbd8e5;
  color: #1f4e79;
  font-size: 14px;
  font-weight: 800;
  background: #fff;
}
.asset-heading { margin-top: 8px; display: flex; align-items: baseline; justify-content: center; gap: 12px; }
.asset-heading strong { font-size: 16px; }
.asset-heading span { color: #64748b; font-size: 10px; direction: ltr; }
.details-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 9px;
}
.detail-card {
  min-height: 47px;
  border: 1px solid #dbe3ec;
  border-radius: 9px;
  padding: 6px 8px;
  background: #fbfdff;
}
.detail-label { font-size: 8.5px; color: #64748b; margin-bottom: 3px; }
.detail-value { font-size: 10px; font-weight: 700; overflow-wrap: anywhere; }
.photo-section, .notes-section { margin-top: 10px; }
.section-title {
  border-right: 4px solid #1f4e79;
  padding: 4px 8px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 800;
  color: #183b5d;
  background: #f7fafc;
  border-radius: 7px;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.asset-photo {
  margin: 0;
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  padding: 5px;
  background: #fff;
  break-inside: avoid;
  page-break-inside: avoid;
}
.photo-frame {
  width: 100%;
  height: 76mm;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f8fafc;
  border-radius: 7px;
}
.asset-photo img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}
.asset-photo figcaption {
  margin-top: 4px;
  min-height: 14px;
  text-align: center;
  color: #64748b;
  font-size: 8px;
  overflow-wrap: anywhere;
}
.no-photos {
  grid-column: 1 / -1;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  color: #64748b;
  font-size: 10px;
}
.notes-box {
  border: 1px solid #dbe3ec;
  border-radius: 9px;
  padding: 8px 10px;
  background: #fff;
  font-size: 9.5px;
  line-height: 1.65;
  white-space: normal;
}
.asset-footer {
  margin-top: auto;
  padding-top: 7px;
  border-top: 1px solid #d7e0ea;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: 7.5px;
}
@media print {
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .asset-report-page { min-height: 277mm; }
  .asset-header, .detail-card, .asset-photo, .notes-section { break-inside: avoid; page-break-inside: avoid; }
}
</style>
</head>
<body>
${pages}
<script>
(function () {
  function waitForImages() {
    var images = Array.from(document.images || []);
    if (!images.length) return Promise.resolve();
    return Promise.all(images.map(function (image) {
      if (image.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  window.addEventListener('load', function () {
    Promise.race([
      waitForImages(),
      new Promise(function (resolve) { setTimeout(resolve, 5000); })
    ]).then(function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
  });
})();
</script>
</body>
</html>`;
};

const openPrintHtml = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  return true;
};

export const AssetReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('assets', 'canPrint');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortKey, setSortKey] = useState<FieldKey>('assetNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(
    printableFields.map(([key]) => key)
  );

  useEffect(() => {
    let cancelled = false;
    getAssets()
      .then((items) => {
        if (!cancelled) setAssets(Array.isArray(items) ? items : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const result = assets.filter((asset) => {
      const matchesStatus = status === 'all' || asset.status === status;
      const matchesCategory = category === 'all' || asset.category === category;
      const matchesKeyword =
        !keyword ||
        [
          asset.assetNumber,
          asset.barcode,
          asset.name,
          asset.brand,
          asset.model,
          asset.serialNumber,
          asset.department,
          asset.building,
          asset.room,
          asset.custodian,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesStatus && matchesCategory && matchesKeyword;
    });

    result.sort((a, b) => {
      const av = String(valueFor(a, sortKey));
      const bv = String(valueFor(b, sortKey));
      const compared = av.localeCompare(bv, 'ar', {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? compared : -compared;
    });

    return result;
  }, [assets, query, status, category, sortKey, sortDirection]);

  const toggleField = (key: FieldKey) => {
    setSelectedFields((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const exportExcel = () => {
    const data = rows.map((asset, index) => {
      const row: Record<string, unknown> = { '#': index + 1 };
      printableFields.forEach(([key, label]) => {
        if (selectedFields.includes(key)) row[label] = valueFor(asset, key);
      });
      return row;
    });

    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'الأصول');
    XLSX.writeFile(book, 'assets-report.xlsx');
  };

  const printReport = () => {
    if (!canPrint) return;

    const headers = selectedFields
      .map((key) => printableFields.find(([field]) => field === key)?.[1] || key)
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join('');

    const body = rows
      .map(
        (asset, index) => `
          <tr>
            <td>${index + 1}</td>
            ${selectedFields
              .map((key) => `<td>${escapeHtml(valueFor(asset, key))}</td>`)
              .join('')}
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>تقرير الأصول</title>
<style>
@page { size: A4 landscape; margin: 9mm; }
* { box-sizing: border-box; }
body { font-family: Tahoma, Arial, sans-serif; color: #172033; margin: 0; background: #fff; }
.header { text-align:center; border-bottom:2px solid #1f4e79; padding:0 0 9px; margin:0 0 10px; }
h1 { margin:0; font-size:20px; line-height:1.25; }
.sub { color:#64748b; font-size:10px; margin-top:3px; line-height:1.35; }
.report-content { width:95%; margin:0 auto; }
.summary { display:flex; gap:8px; margin:0 auto 8px; }
.summary div { flex:1; border:1px solid #dbe3ec; border-radius:8px; padding:5px 7px; text-align:center; line-height:1.35; }
.summary strong { font-size:14px; }
.table-shell { width:100%; margin:0 auto; overflow:hidden; border-radius:5px; }
table { width:100%; border-collapse:collapse; border-spacing:0; font-size:8.7px; line-height:1.2; }
th { background:#1f4e79; color:white; padding:4px 3px; border:1px solid #d5dee8; font-weight:700; white-space:normal; vertical-align:middle; }
td { padding:4px 3px; border:1px solid #dbe3ec; text-align:center; white-space:normal; vertical-align:middle; }
tbody tr:nth-child(even) { background:#f8fafc; }
.footer { width:95%; margin:9px auto 0; font-size:8px; color:#64748b; display:flex; justify-content:space-between; }
@media print {
  .report-content, .footer { break-inside:auto; }
  thead { display:table-header-group; }
  tr { break-inside:avoid; }
}
</style>
</head>
<body>
<div class="header">
  <h1>جامعة الإمام عبدالرحمن بن فيصل</h1>
  <div class="sub">الإدارة العامة للأصول والأملاك والأوقاف الجامعية</div>
  <div class="sub">تقرير الأصول</div>
</div>
<div class="report-content">
  <div class="summary">
    <div>إجمالي الأصول<br><strong>${rows.length}</strong></div>
    <div>إجمالي قيمة الشراء<br><strong>${rows
      .reduce((sum, asset) => sum + Number(asset.purchaseValue || 0), 0)
      .toLocaleString('ar-SA')} ر.س</strong></div>
  </div>
  <div class="table-shell">
    <table><thead><tr><th>#</th>${headers}</tr></thead><tbody>${body}</tbody></table>
  </div>
</div>
<div class="footer"><span>تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}</span><span>وحدة الأصول</span></div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    openPrintHtml(html);
  };

  const printSingleAsset = (asset: AssetRecord) => {
    if (!canPrint) return;
    openPrintHtml(buildIndividualReportsHtml([asset]));
  };

  const printAllIndividualAssets = () => {
    if (!canPrint || rows.length === 0) return;
    openPrintHtml(buildIndividualReportsHtml(rows));
  };

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-white/55 bg-white/72 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">وحدة الأصول</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">تقارير الأصول</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            تصفية بيانات الأصول واختيار الأعمدة، مع إمكانية إنشاء تقرير مستقل لكل أصل يتضمن صور الأصل أو الأثاث.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/assets')}>
          <ArrowRight className="ml-2 h-4 w-4" />
          لوحة الأصول
        </Button>
      </section>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-5 sm:p-6">
          <div className="relative xl:col-span-2">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pr-10"
              placeholder="بحث برقم الأصل أو الباركود أو الاسم أو الموقع أو العهدة..."
            />
          </div>
          <NativeSelect value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">جميع التصنيفات</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">جميع الحالات</option>
            {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <div className="grid grid-cols-2 gap-2">
            <NativeSelect
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as FieldKey)}
            >
              {printableFields.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as 'asc' | 'desc')
              }
            >
              <option value="asc">تصاعدي</option>
              <option value="desc">تنازلي</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle>اختيار أعمدة التقرير</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 p-5 md:grid-cols-4 xl:grid-cols-6 sm:p-6">
          {printableFields.map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-xl border bg-background/60 p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedFields.includes(key)}
                onChange={() => toggleField(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={exportExcel}
          disabled={loading || rows.length === 0}
        >
          <FileSpreadsheet className="ml-2 h-4 w-4" /> Excel
        </Button>
        {canPrint && (
          <>
            <Button
              variant="outline"
              onClick={printReport}
              disabled={loading || rows.length === 0 || selectedFields.length === 0}
            >
              <Printer className="ml-2 h-4 w-4" /> التقرير الجدولي / PDF
            </Button>
            <Button
              onClick={printAllIndividualAssets}
              disabled={loading || rows.length === 0}
            >
              <ImageIcon className="ml-2 h-4 w-4" /> تقارير فردية بالصور
            </Button>
          </>
        )}
        <span className="rounded-full border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          {rows.length} سجل
        </span>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto px-3 pb-3 sm:px-4 sm:pb-4">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="px-2 py-2.5">#</th>
                  {selectedFields.map((key) => (
                    <th key={key} className="px-2 py-2.5">
                      {printableFields.find(([field]) => field === key)?.[1]}
                    </th>
                  ))}
                  {canPrint && <th className="px-2 py-2.5">التقرير</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((asset, index) => (
                  <tr
                    key={asset.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-2 py-2 text-center">{index + 1}</td>
                    {selectedFields.map((key) => (
                      <td key={key} className="px-2 py-2 text-center">
                        {String(valueFor(asset, key))}
                      </td>
                    ))}
                    {canPrint && (
                      <td className="px-2 py-2 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => printSingleAsset(asset)}
                          title="طباعة تقرير مستقل للأصل مع الصور"
                        >
                          <Printer className="ml-2 h-4 w-4" />
                          تقرير الأصل
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
