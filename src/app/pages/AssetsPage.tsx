import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  Layers3,
  PackageSearch,
  Pencil,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
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
  furniture: 'الأثاث',
  equipment: 'الآلات والمعدات',
  vehicle: 'أصول النقل العام',
  infrastructure: 'البنية التحتية',
  intangible: 'الأصول غير الملموسة',
  land: 'الأراضي',
  other: 'أخرى',
};

const normalizeAssetText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

type AssetGroupRule = {
  label: string;
  patterns: RegExp[];
};

/*
 * مهم: قواعد التجميع تعمل أولاً على اسم/وصف الأصل نفسه فقط.
 * لا نستخدم مستويات التصنيف في القرار الأول لأنها عامة وقد تحتوي كلمات
 * مثل "مكتبي" أو "أجهزة" وتسبب خلط الطاولات بالطابعات أو أجهزة UPS.
 */
const PRIMARY_ASSET_GROUP_RULES: AssetGroupRule[] = [
  { label: 'أجهزة UPS والطاقة الاحتياطية', patterns: [/\bups\b/i, /uninterruptible/, /مزود طاقه غير منقطع/, /طاقه احتياطيه/] },
  { label: 'الطابعات وأجهزة النسخ', patterns: [/طابع/, /برنتر/, /ناسخ/, /ماكينه تصوير/, /اله تصوير/, /printer/, /copier/, /plotter/] },
  { label: 'الكراسي', patterns: [/كرسي/, /كراسي/, /chair/, /stool/] },
  { label: 'الطاولات', patterns: [/طاول/, /طاوله/, /ترابيز/, /table/] },
  { label: 'المكاتب', patterns: [/مكتب اداري/, /مكتب خشب/, /مكتب موظف/, /desk/] },
  { label: 'الخزائن والكبائن', patterns: [/خزان/, /خزانه/, /كبين/, /كابينه/, /cabinet/, /locker/, /cupboard/] },
  { label: 'أجهزة الحاسب', patterns: [/حاسب/, /كمبيوتر/, /computer/, /desktop/, /laptop/, /workstation/] },
  { label: 'الشاشات وأجهزة العرض', patterns: [/شاشه/, /بروجكتر/, /جهاز عرض/, /monitor/, /projector/, /display/] },
  { label: 'أجهزة الشبكات والاتصالات', patterns: [/سويتش/, /راوتر/, /نقطه وصول/, /هاتف/, /سنترال/, /router/, /switch/, /access point/, /telephone/, /network/] },
  { label: 'أجهزة التكييف والتبريد', patterns: [/تكييف/, /مكيف/, /تبريد/, /ثلاج/, /air condition/, /refriger/] },
  { label: 'المولدات والطاقة', patterns: [/مولد/, /generator/, /محول كهرب/, /transformer/] },
  { label: 'الأجهزة الطبية والمخبرية', patterns: [/جهاز طبي/, /مختبر/, /معمل/, /microscope/, /analyzer/, /centrifuge/] },
  { label: 'المركبات ووسائل النقل', patterns: [/سيار/, /مركب/, /حافل/, /شاحن/, /vehicle/, /car/, /bus/, /truck/] },
  { label: 'الأراضي', patterns: [/\bارض\b/, /اراضي/, /land/] },
  { label: 'الأصول غير الملموسة', patterns: [/برنامج/, /رخصه/, /software/, /license/, /intangible/] },
  { label: 'البنية التحتية', patterns: [/بنيه تحتيه/, /شبكه مياه/, /شبكه صرف/, /طريق/, /رصيف/, /infrastructure/] },
];

const getPrimaryAssetText = (asset: AssetRecord) =>
  normalizeAssetText(
    [asset.name, asset.assetDescription, asset.brand, asset.model]
      .filter(Boolean)
      .join(' ')
  );

const getAssetGroupLabel = (asset: AssetRecord) => {
  const primaryText = getPrimaryAssetText(asset);

  for (const rule of PRIMARY_ASSET_GROUP_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(primaryText))) return rule.label;
  }

  // عند عدم وجود تطابق صريح نرجع للتصنيف الرئيسي فقط، بدون تحليل
  // مستويات التصنيف العامة حتى لا تختلط أنواع مختلفة في مجموعة واحدة.
  return CATEGORY_LABELS[asset.category] || asset.category || 'أصول أخرى';
};

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
    const value = normalizeAssetText(query);
    if (!value) return assets;

    return assets.filter((asset) =>
      [
        asset.itemNumber,
        asset.assetNumber,
        asset.barcode,
        asset.name,
        asset.category,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.department,
        asset.responsibleDepartment,
        asset.entityName,
        asset.building,
        asset.floor,
        asset.room,
        asset.cardNumber,
        asset.assetCode,
        getAssetGroupLabel(asset),
      ]
        .filter(Boolean)
        .some((item) => normalizeAssetText(item).includes(value))
    );
  }, [assets, query]);

  const groupedAssets = useMemo(() => {
    const groups = new Map<string, AssetRecord[]>();

    filteredAssets.forEach((asset) => {
      const label = getAssetGroupLabel(asset);
      const current = groups.get(label) || [];
      current.push(asset);
      groups.set(label, current);
    });

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items,
        quantity: items.reduce((sum, asset) => {
          const quantity = Number(asset.quantity);
          return sum + (Number.isFinite(quantity) ? quantity : 1);
        }, 0),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label, 'ar'));
  }, [filteredAssets]);

  const handleDelete = async (asset: AssetRecord) => {
    if (!canDelete) return;
    const identifier = asset.itemNumber || asset.assetNumber || asset.barcode || '';
    const confirmed = window.confirm(`هل تريد حذف الأصل ${identifier} - ${asset.name}؟`);
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

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Boxes className="h-4 w-4" />وحدة الأصول</div>
          <h1 className="text-2xl font-black sm:text-3xl">جميع الأصول</h1>
          <p className="mt-2 text-sm text-muted-foreground">عرض الأصول في مجموعات دقيقة اعتمادًا على اسم ووصف الأصل الفعلي، مع فصل الكراسي والطاولات والطابعات وأجهزة UPS وغيرها.</p>
        </div>
        {canAdd && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/assets/import')} className="h-11 rounded-2xl px-5"><FileSpreadsheet className="ml-2 h-5 w-5 text-emerald-600" />استيراد Excel</Button>
            <Button onClick={() => navigate('/assets/new')} className="h-11 rounded-2xl px-5"><PlusCircle className="ml-2 h-5 w-5" />إضافة أصل</Button>
          </div>
        )}
      </section>

      <Card className="rounded-[26px] border-white/55 bg-white/68 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40"><CardTitle className="flex items-center gap-2 text-lg"><SlidersHorizontal className="h-5 w-5 text-primary" />البحث والتصفية</CardTitle></CardHeader>
        <CardContent className="p-5 sm:p-6"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المجموعة، رقم الصنف، الباركود، اسم الأصل، البطاقة، التصنيف، الإدارة أو الرقم التسلسلي..." className="h-11 rounded-xl pr-10" /></div></CardContent>
      </Card>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل الأصول...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center"><div className="grid h-20 w-20 place-items-center rounded-[28px] border bg-background/80 shadow-inner"><PackageSearch className="h-10 w-10 text-primary" /></div><h2 className="mt-5 text-xl font-black">لا توجد أصول مطابقة</h2><p className="mt-2 text-sm text-muted-foreground">{query ? 'غيّر كلمة البحث أو امسح التصفية.' : 'ابدأ بإضافة أصل أو استيراد بيانات Excel المعتمدة.'}</p></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">إجمالي الأصول الظاهرة</div><div className="mt-1 text-2xl font-black">{filteredAssets.length.toLocaleString('ar-SA')}</div></div>
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">عدد المجموعات</div><div className="mt-1 text-2xl font-black">{groupedAssets.length.toLocaleString('ar-SA')}</div></div>
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">إجمالي الكميات</div><div className="mt-1 text-2xl font-black">{groupedAssets.reduce((sum, group) => sum + group.quantity, 0).toLocaleString('ar-SA')}</div></div>
              </div>

              {groupedAssets.map((group) => {
                const expanded = Boolean(expandedGroups[group.label]);
                return (
                  <section key={group.label} className="overflow-hidden rounded-[24px] border bg-white/78 shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-muted/35 sm:p-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border bg-primary/5 text-primary"><Layers3 className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-black">مجموعة {group.label}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{group.items.length.toLocaleString('ar-SA')} سجل • إجمالي الكمية {group.quantity.toLocaleString('ar-SA')}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="rounded-xl px-3 py-1">{group.items.length.toLocaleString('ar-SA')}</Badge>
                        <div className="grid h-9 w-9 place-items-center rounded-xl border bg-background">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t bg-muted/10 p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {group.items.map((asset) => (
                            <article key={asset.id} className="rounded-[22px] border bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">رقم الصنف: {asset.itemNumber || asset.assetNumber || '-'}</p><h3 className="mt-1 truncate text-base font-black">{asset.name}</h3></div><Badge variant="outline">{ASSET_STATUS_LABELS[asset.status] || asset.status}</Badge></div>
                              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div><dt className="text-xs text-muted-foreground">التصنيف</dt><dd className="mt-1 font-medium">{CATEGORY_LABELS[asset.category] || asset.category}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">رقم البطاقة</dt><dd className="mt-1 font-medium">{asset.cardNumber || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">الباركود</dt><dd className="mt-1 font-medium">{asset.barcode || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">الحالة الفنية</dt><dd className="mt-1 font-medium">{asset.technicalCondition || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">الجهة / الإدارة</dt><dd className="mt-1 font-medium">{asset.responsibleDepartment || asset.department || asset.entityName || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">الموقع</dt><dd className="mt-1 font-medium">{[asset.building, asset.floor, asset.room].filter(Boolean).join(' / ') || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">رمز الأصل المحاسبي</dt><dd className="mt-1 font-medium">{asset.assetCode || '-'}</dd></div>
                                <div><dt className="text-xs text-muted-foreground">الكمية</dt><dd className="mt-1 font-medium">{Number.isFinite(Number(asset.quantity)) ? Number(asset.quantity).toLocaleString('ar-SA') : '1'}</dd></div>
                              </dl>
                              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${asset.id}`)}><Eye className="ml-1 h-4 w-4" />عرض</Button>
                                {canEdit && <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${asset.id}/edit`)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}
                                {canDelete && <Button variant="outline" size="sm" disabled={deletingId === asset.id} onClick={() => handleDelete(asset)} className="text-red-600 hover:text-red-700"><Trash2 className="ml-1 h-4 w-4" />{deletingId === asset.id ? '...' : 'حذف'}</Button>}
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
