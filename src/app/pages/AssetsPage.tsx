import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Boxes, Eye, PackageSearch, Pencil, PlusCircle, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import { deleteAsset, getAssets } from '../api/assets';
import type { AssetRecord } from '../../types/asset';
import { ASSET_STATUS_LABELS } from '../../types/asset';

const CATEGORY_LABELS: Record<string, string> = {
  it: 'تقنية معلومات',
  furniture: 'أثاث',
  equipment: 'أجهزة ومعدات',
  vehicle: 'مركبات',
  other: 'أخرى',
};

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAdd = isAdmin || hasPermission('assets', 'canAdd');
  const canEdit = isAdmin || hasPermission('assets', 'canEdit');
  const canDelete = isAdmin || hasPermission('assets', 'canDelete');

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getAssets();
      setAssets(Array.isArray(result) ? result : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'تعذر تحميل سجل الأصول.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return assets;

    return assets.filter((asset) =>
      [asset.assetNumber, asset.barcode, asset.name, asset.category, asset.brand, asset.model, asset.serialNumber, asset.department, asset.building, asset.floor, asset.room, asset.custodian]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(value))
    );
  }, [assets, query]);

  const handleDelete = async (asset: AssetRecord) => {
    if (!canDelete) return;
    const confirmed = window.confirm(`هل تريد حذف الأصل ${asset.assetNumber} - ${asset.name}؟`);
    if (!confirmed) return;

    try {
      setDeletingId(asset.id);
      await deleteAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (deleteError: any) {
      setError(deleteError?.message || 'تعذر حذف الأصل.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Boxes className="h-4 w-4" />وحدة الأصول</div>
          <h1 className="text-2xl font-black sm:text-3xl">جميع الأصول</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجل موحد للأصول والباركود والمواقع والعهد والحالة التشغيلية.</p>
        </div>
        {canAdd && <Button onClick={() => navigate('/assets/new')} className="h-11 rounded-2xl px-5"><PlusCircle className="ml-2 h-5 w-5" />إضافة أصل</Button>}
      </section>

      <Card className="rounded-[26px] border-white/55 bg-white/68 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40"><CardTitle className="flex items-center gap-2 text-lg"><SlidersHorizontal className="h-5 w-5 text-primary" />البحث والتصفية</CardTitle></CardHeader>
        <CardContent className="p-5 sm:p-6"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برقم الأصل، الباركود، اسم الأصل، الرقم التسلسلي أو صاحب العهدة..." className="h-11 rounded-xl pr-10" /></div></CardContent>
      </Card>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل الأصول...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center"><div className="grid h-20 w-20 place-items-center rounded-[28px] border bg-background/80 shadow-inner"><PackageSearch className="h-10 w-10 text-primary" /></div><h2 className="mt-5 text-xl font-black">لا توجد أصول مطابقة</h2><p className="mt-2 text-sm text-muted-foreground">{query ? 'غيّر كلمة البحث أو امسح التصفية.' : 'ابدأ بإضافة أول أصل إلى سجل الوحدة.'}</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <article key={asset.id} className="rounded-[24px] border bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{asset.assetNumber}</p><h2 className="mt-1 truncate text-lg font-black">{asset.name}</h2></div><Badge variant="outline">{ASSET_STATUS_LABELS[asset.status] || asset.status}</Badge></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">التصنيف</dt><dd className="mt-1 font-medium">{CATEGORY_LABELS[asset.category] || asset.category}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">الباركود</dt><dd className="mt-1 font-medium">{asset.barcode || '-'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">الجهة</dt><dd className="mt-1 font-medium">{asset.department || '-'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">المبنى</dt><dd className="mt-1 font-medium">{asset.building || '-'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">العهدة</dt><dd className="mt-1 font-medium">{asset.custodian || '-'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">المرفقات</dt><dd className="mt-1 font-medium">{asset.attachments?.length || 0}</dd></div>
                  </dl>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${asset.id}`)}><Eye className="ml-1 h-4 w-4" />عرض</Button>
                    {canEdit && <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${asset.id}/edit`)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}
                    {canDelete && <Button variant="outline" size="sm" disabled={deletingId === asset.id} onClick={() => handleDelete(asset)} className="text-red-600 hover:text-red-700"><Trash2 className="ml-1 h-4 w-4" />{deletingId === asset.id ? '...' : 'حذف'}</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
