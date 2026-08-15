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
          <title>بطاقة أصل - ${escapeHtml(asset.assetNumber)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Tahoma, Arial, sans-serif; color: #102a43; background: #fff; }
            .sheet { width: 100%; }
            .header { border: 1.5px solid #173f6b; border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; }
            .eyebrow { font-size: 12px; font-weight: 700; color: #426786; margin-bottom: 6px; }
            h1 { margin: 0; font-size: 24px; color: #123d73; }
            .asset-no { margin-top: 7px; font-size: 12px; color: #526b7f; direction: ltr; text-align: right; }
            .meta { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
            .badge { border: 1px solid #b8c9d8; border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; background: #f6f9fc; }
            .section { border: 1px solid #c8d5e0; border-radius: 14px; margin: 0 0 12px; overflow: hidden; page-break-inside: avoid; }
            .section-title { padding: 10px 14px; font-size: 15px; font-weight: 800; background: #f3f7fb; border-bottom: 1px solid #c8d5e0; color: #173f6b; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); }
            .field { padding: 11px 13px; min-height: 62px; border-bottom: 1px solid #e3ebf1; border-left: 1px solid #e3ebf1; }
            .field:nth-child(3n) { border-left: 0; }
            .label { font-size: 10px; color: #6c8193; margin-bottom: 5px; }
            .value { font-size: 12px; font-weight: 700; line-height: 1.7; overflow-wrap: anywhere; white-space: pre-wrap; }
            .notes { padding: 12px 14px; min-height: 66px; font-size: 12px; line-height: 1.9; white-space: pre-wrap; }
            .attachments { margin: 0; padding: 10px 28px 12px 10px; font-size: 11px; line-height: 1.9; }
            .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #d9e2ea; display: flex; justify-content: space-between; gap: 12px; color: #7a8b99; font-size: 9px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="eyebrow">جامعة الإمام عبدالرحمن بن فيصل — وحدة الأصول</div>
              <h1>بطاقة معلومات الأصل</h1>
              <div class="asset-no">${escapeHtml(asset.assetNumber)}</div>
              <div class="meta">
                <span class="badge">${escapeHtml(asset.name)}</span>
                <span class="badge">الحالة: ${escapeHtml(ASSET_STATUS_LABELS[asset.status] || asset.status)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">البيانات الأساسية</div>
              <div class="grid">${printRows([
                ['رقم الأصل', asset.assetNumber],
                ['الباركود', asset.barcode],
                ['التصنيف', CATEGORY_LABELS[asset.category] || asset.category],
                ['الماركة', asset.brand],
                ['الموديل', asset.model],
                ['الرقم التسلسلي', asset.serialNumber],
              ])}</div>
            </div>

            <div class="section">
              <div class="section-title">الموقع والعهدة</div>
              <div class="grid">${printRows([
                ['الجهة / الإدارة', asset.department],
                ['المبنى', asset.building],
                ['الدور', asset.floor],
                ['الغرفة / الموقع', asset.room],
                ['صاحب العهدة', asset.custodian],
              ])}</div>
            </div>

            <div class="section">
              <div class="section-title">بيانات إضافية</div>
              <div class="grid">${printRows([
                ['تاريخ الشراء', purchaseDate],
                ['قيمة الشراء', purchaseValue],
              ])}</div>
              <div class="notes"><strong>الملاحظات:</strong><br />${escapeHtml(asset.notes)}</div>
            </div>

            <div class="section">
              <div class="section-title">المرفقات والوثائق (${attachments.length.toLocaleString('ar-SA')})</div>
              ${attachments.length
                ? `<ol class="attachments">${attachments
                    .map(
                      (attachment) =>
                        `<li>${escapeHtml(attachment.title)} — ${escapeHtml(
                          ATTACHMENT_LABELS[String(attachment.notes || '')] || 'مرفق'
                        )}</li>`
                    )
                    .join('')}</ol>`
                : '<div class="notes">لا توجد مرفقات مرتبطة بهذا الأصل.</div>'}
            </div>

            <div class="footer">
              <span>طُبعت من منصة إدارة الصكوك والأراضي — وحدة الأصول</span>
              <span>${escapeHtml(printedAt)}</span>
            </div>
          </div>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () { window.print(); }, 250);
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
