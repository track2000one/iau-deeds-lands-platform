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
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}/edit`, { state: assetGroupKey ? { assetGroupKey } : undefined })}>
              <Pencil className="ml-2 h-4 w-4" />
              تعديل
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              <Trash2 className="ml-2 h-4 w-4" />
              {deleting ? 'جارٍ الحذف...' : 'حذف'}
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
