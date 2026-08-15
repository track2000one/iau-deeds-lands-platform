import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Barcode,
  Boxes,
  CalendarDays,
  FileText,
  MapPin,
  Pencil,
  Printer,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import { deleteAsset, getAsset } from '../api/assets';
import type { AssetRecord } from '../../types/asset';
import { ASSET_STATUS_LABELS } from '../../types/asset';

const CATEGORY_LABELS: Record<string, string> = {
  it: 'تقنية معلومات',
  furniture: 'أثاث',
  equipment: 'أجهزة ومعدات',
  vehicle: 'مركبات',
  other: 'أخرى',
};

const ATTACHMENT_LABELS: Record<string, string> = {
  asset_images: 'صور الأصل',
  purchase_documents: 'الفاتورة ومستندات الشراء',
  warranty_documents: 'الضمان والكتيبات الفنية',
  custody_documents: 'مستندات العهدة والاستلام',
  other_documents: 'مرفقات أخرى',
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const escapeHtml = (value: unknown) =>
  displayValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const ViewAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams();
  const { isAdmin, hasPermission } = usePermissions();
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = isAdmin || hasPermission('assets', 'canEdit');
  const canDelete = isAdmin || hasPermission('assets', 'canDelete');
  const canPrint = isAdmin || hasPermission('assets', 'canPrint');
  const assetGroupKey = String((location.state as { assetGroupKey?: string } | null)?.assetGroupKey || '').trim();

  const returnToAssetList = (replace = false) => {
    navigate('/assets/list', {
      replace,
      state: assetGroupKey ? { assetGroupKey } : undefined,
    });
  };

  useEffect(() => {
    let cancelled = false;

    if (!assetId) {
      setError('تعذر تحديد الأصل المطلوب.');
      setLoading(false);
      return;
    }

    getAsset(assetId)
      .then((record) => {
        if (!cancelled) setAsset(record);
      })
      .catch((loadError: any) => {
        if (!cancelled) setError(loadError?.message || 'تعذر تحميل بيانات الأصل.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const handleDelete = async () => {
    if (!asset || !canDelete) return;

    const confirmed = window.confirm(
      `هل تريد حذف الأصل ${asset.assetNumber} - ${asset.name}؟\nلا يمكن التراجع عن هذه العملية.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteAsset(asset.id);
      returnToAssetList(true);
    } catch (deleteError: any) {
      setError(deleteError?.message || 'تعذر حذف الأصل.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    if (!asset || !canPrint) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      setError('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.');
      return;
    }

    printWindow.opener = null;
    const attachments = asset.attachments || [];
    const purchaseDate = asset.purchaseDate
      ? new Date(asset.purchaseDate).toLocaleDateString('ar-SA')
      : '-';
    const purchaseValue = asset.purchaseValue != null
      ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س`
      : '-';
    const printedAt = new Date().toLocaleString('ar-SA');

    const printRows = (items: Array<[string, unknown]>) =>
      items
        .map(
          ([label, value]) => `
            <div class="field">
              <div class="label">${escapeHtml(label)}</div>
              <div class="value">${escapeHtml(value)}</div>
            </div>`
        )
        .join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>بطاقة معلومات الأصل - ${escapeHtml(asset.assetNumber)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 9mm 10mm 10mm;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: Tahoma, Arial, sans-serif;
    color: #18324a;
    font-size: 10.5px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 190mm;
    max-width: 100%;
    margin: 0 auto;
  }
  .official-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 8px;
    min-height: 22mm;
    padding: 4mm 5mm;
    border: 1.4px solid #153f69;
    border-radius: 4mm;
    background: linear-gradient(180deg, #f8fbfe 0%, #eef5fa 100%);
    break-inside: avoid;
  }
  .university {
    font-size: 11px;
    font-weight: 800;
    color: #153f69;
  }
  .unit {
    margin-top: 2px;
    color: #5e7487;
    font-size: 9px;
    font-weight: 700;
  }
  .document-title {
    text-align: center;
    min-width: 58mm;
  }
  .document-title h1 {
    margin: 0;
    color: #123d73;
    font-size: 18px;
    line-height: 1.2;
  }
  .document-title p {
    margin: 3px 0 0;
    font-size: 8.5px;
    color: #75889a;
  }
  .print-meta {
    text-align: left;
    direction: rtl;
    color: #667d90;
    font-size: 8px;
    line-height: 1.65;
  }
  .identity {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    margin-top: 3mm;
    padding: 3mm 4mm;
    border: 1px solid #b8cbdc;
    border-radius: 3mm;
    background: #fff;
    break-inside: avoid;
  }
  .asset-name {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    color: #102f50;
  }
  .asset-number {
    margin-top: 2px;
    color: #667b8f;
    font-size: 8.5px;
    direction: ltr;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2mm 3mm;
    border: 1px solid #9eb5c9;
    border-radius: 99px;
    background: #f4f8fb;
    color: #244a6a;
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
  }
  .section {
    margin-top: 3mm;
    border: 1px solid #bfd0df;
    border-radius: 3mm;
    overflow: hidden;
    background: #fff;
  }
  .section.keep { break-inside: avoid; page-break-inside: avoid; }
  .section-title {
    padding: 2.4mm 3.5mm;
    border-bottom: 1px solid #bfd0df;
    background: #edf4f9;
    color: #173f66;
    font-size: 11px;
    font-weight: 900;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .field {
    min-height: 14mm;
    padding: 2.6mm 3mm;
    border-left: 1px solid #e0e8ef;
    border-bottom: 1px solid #e0e8ef;
    break-inside: avoid;
  }
  .field:nth-child(3n) { border-left: 0; }
  .field:nth-last-child(-n + 3) { border-bottom: 0; }
  .label {
    color: #73889b;
    font-size: 8px;
    margin-bottom: 1mm;
    font-weight: 700;
  }
  .value {
    color: #142f49;
    font-size: 10px;
    font-weight: 800;
    line-height: 1.55;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .additional-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .additional-grid .field:nth-child(2n) { border-left: 0; }
  .notes-row {
    padding: 2.8mm 3.5mm;
    border-top: 1px solid #e0e8ef;
    min-height: 14mm;
    color: #243e55;
    font-size: 9.5px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .attachments-summary {
    padding: 2.5mm 3.5mm;
    color: #526d84;
    font-size: 8.5px;
    background: #fbfdff;
    border-bottom: 1px solid #e0e8ef;
  }
  .attachments {
    margin: 0;
    padding: 2.5mm 7mm 3mm 3mm;
    font-size: 8.5px;
    line-height: 1.55;
  }
  .attachments li {
    margin-bottom: 1mm;
    padding-right: 1mm;
    break-inside: avoid;
    page-break-inside: avoid;
    overflow-wrap: anywhere;
  }
  .empty { padding: 3mm 3.5mm; color: #74889a; font-size: 9px; }
  .footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 3mm;
    padding-top: 2mm;
    border-top: 1px solid #ccd9e4;
    color: #7b8d9d;
    font-size: 7.5px;
    break-inside: avoid;
  }
  .no-break { break-inside: avoid; page-break-inside: avoid; }
  @media screen {
    body { background: #edf2f6; padding: 18px 0; }
    .sheet { background: #fff; padding: 10mm; box-shadow: 0 12px 40px rgba(15, 23, 42, .12); }
  }
  @media print {
    html, body { width: 210mm; }
    body { background: #fff; }
    .sheet {
      width: 190mm;
      max-width: 190mm;
      margin: 0 auto;
      padding-top: 7mm;
    }
    .section, .identity, .official-header { box-shadow: none; }
  }
</style>
        </head>
        <body>
<main class="sheet">
  <header class="official-header">
    <div>
      <div class="university">جامعة الإمام عبدالرحمن بن فيصل</div>
      <div class="unit">وحدة الأصول</div>
    </div>
    <div class="document-title">
      <h1>بطاقة معلومات الأصل</h1>
      <p>نسخة مخصصة للطباعة والحفظ ضمن ملف الأصل</p>
    </div>
    <div class="print-meta">
      <div>تاريخ الطباعة</div>
      <strong>${escapeHtml(printedAt)}</strong>
    </div>
  </header>

  <section class="identity">
    <div>
      <h2 class="asset-name">${escapeHtml(asset.name)}</h2>
      <div class="asset-number">${escapeHtml(asset.assetNumber)}</div>
    </div>
    <span class="badge">الحالة: ${escapeHtml(ASSET_STATUS_LABELS[asset.status] || asset.status)}</span>
  </section>

  <section class="section keep">
    <div class="section-title">البيانات الأساسية</div>
    <div class="grid">${printRows([
      ['رقم الأصل', asset.assetNumber],
      ['الباركود', asset.barcode],
      ['التصنيف', CATEGORY_LABELS[asset.category] || asset.category],
      ['الماركة', asset.brand],
      ['الموديل', asset.model],
      ['الرقم التسلسلي', asset.serialNumber],
    ])}</div>
  </section>

  <section class="section keep">
    <div class="section-title">الموقع والعهدة</div>
    <div class="grid">${printRows([
      ['الجهة / الإدارة', asset.department],
      ['المبنى', asset.building],
      ['الدور', asset.floor],
      ['الغرفة / الموقع', asset.room],
      ['صاحب العهدة', asset.custodian],
      ['حالة الأصل', ASSET_STATUS_LABELS[asset.status] || asset.status],
    ])}</div>
  </section>

  <section class="section keep">
    <div class="section-title">بيانات إضافية</div>
    <div class="additional-grid">${printRows([
      ['تاريخ الشراء', purchaseDate],
      ['قيمة الشراء', purchaseValue],
    ])}</div>
    <div class="notes-row"><strong>الملاحظات:</strong> ${escapeHtml(asset.notes)}</div>
  </section>

  <section class="section">
    <div class="section-title">المرفقات والوثائق</div>
    <div class="attachments-summary">إجمالي المرفقات المرتبطة بالأصل: <strong>${attachments.length.toLocaleString('ar-SA')}</strong></div>
    ${attachments.length
      ? `<ol class="attachments">${attachments
          .map(
            (attachment, index) =>
              `<li><strong>${index + 1}.</strong> ${escapeHtml(attachment.title)} — ${escapeHtml(
                ATTACHMENT_LABELS[String(attachment.notes || '')] || 'مرفق'
              )}</li>`
          )
          .join('')}</ol>`
      : '<div class="empty">لا توجد مرفقات مرتبطة بهذا الأصل.</div>'}
  </section>

  <footer class="footer">
    <span>منصة إدارة الصكوك والأراضي — وحدة الأصول</span>
    <span>رقم الأصل: ${escapeHtml(asset.assetNumber)}</span>
  </footer>
</main>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      window.focus();
      window.print();
    }, 300);
  });
</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-[1500px] items-center justify-center text-sm text-muted-foreground">
        جارٍ تحميل بيانات الأصل...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Card className="rounded-[28px]">
          <CardContent className="p-8 text-center">
            <p className="font-semibold text-red-600">{error || 'الأصل غير موجود.'}</p>
            <Button className="mt-5" variant="outline" onClick={() => returnToAssetList()}>
              العودة إلى سجل الأصول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attachments = asset.attachments || [];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-white/55 bg-white/72 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Boxes className="h-4 w-4" />
            وحدة الأصول
          </div>
          <p className="text-xs text-muted-foreground">{asset.assetNumber}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black sm:text-3xl">{asset.name}</h1>
            <Badge variant="outline">{ASSET_STATUS_LABELS[asset.status] || asset.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            عرض بيانات الأصل وموقعه وعهدته والمرفقات المرتبطة به.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => returnToAssetList()}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Button>
          {canPrint && (
            <Button variant="outline" onClick={handlePrint} title="طباعة بطاقة معلومات الأصل">
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}/edit`, { state: assetGroupKey ? { assetGroupKey } : undefined })}>
              <Pencil className="ml-2 h-4 w-4" />
              تعديل
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={handleDelete}
              className="platform-record-danger border-red-500 bg-gradient-to-b from-white via-red-50 to-red-100 font-extrabold text-red-600 shadow-[0_5px_0_#fca5a5,0_9px_18px_rgba(220,38,38,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-red-600 hover:bg-gradient-to-b hover:from-red-50 hover:via-red-100 hover:to-red-200 hover:text-red-700 active:translate-y-[3px] active:shadow-[0_2px_0_#fca5a5,0_4px_8px_rgba(220,38,38,0.16)] disabled:opacity-60"
            >
              <Trash2 className="ml-2 h-4 w-4" />
              {deleting ? 'جارٍ الحذف...' : 'حذف الأصل'}
            </Button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Barcode className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {[
            ['رقم الأصل', asset.assetNumber],
            ['الباركود', asset.barcode],
            ['التصنيف', CATEGORY_LABELS[asset.category] || asset.category],
            ['الماركة', asset.brand],
            ['الموديل', asset.model],
            ['الرقم التسلسلي', asset.serialNumber],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-bold">{displayValue(value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            الموقع والعهدة
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {[
            ['الجهة / الإدارة', asset.department],
            ['المبنى', asset.building],
            ['الدور', asset.floor],
            ['الغرفة / الموقع', asset.room],
            ['صاحب العهدة', asset.custodian],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-bold">{displayValue(value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            بيانات إضافية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <div className="rounded-2xl border bg-background/60 p-4">
            <p className="text-xs text-muted-foreground">تاريخ الشراء</p>
            <p className="mt-1 font-bold">
              {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('ar-SA') : '-'}
            </p>
          </div>
          <div className="rounded-2xl border bg-background/60 p-4">
            <p className="text-xs text-muted-foreground">قيمة الشراء</p>
            <p className="mt-1 font-bold">
              {asset.purchaseValue != null ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س` : '-'}
            </p>
          </div>
          <div className="rounded-2xl border bg-background/60 p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">الملاحظات</p>
            <p className="mt-1 whitespace-pre-wrap leading-7">{displayValue(asset.notes)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            المرفقات والوثائق ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {attachments.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              لا توجد مرفقات مرتبطة بهذا الأصل.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {attachments.map((attachment, index) => (
                <a
                  key={attachment.id || `${attachment.driveUrl}-${index}`}
                  href={attachment.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border bg-background/65 p-4 transition hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <p className="text-xs text-muted-foreground">
                    {ATTACHMENT_LABELS[String(attachment.notes || '')] || 'مرفق'}
                  </p>
                  <p className="mt-1 truncate font-bold">{attachment.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">فتح الملف في Google Drive</p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
