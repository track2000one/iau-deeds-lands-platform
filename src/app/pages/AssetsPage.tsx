import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AirVent,
  Archive,
  Armchair,
  BatteryCharging,
  Boxes,
  Building2,
  BusFront,
  Camera,
  CarFront,
  ChevronDown,
  ChevronUp,
  Cloud,
  Cog,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  Laptop,
  Map,
  Network,
  PackageSearch,
  Pencil,
  PlusCircle,
  Presentation,
  Printer,
  Search,
  SlidersHorizontal,
  Sofa,
  Table2,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import {
  deleteAsset,
  getAssetGroups,
  getAssetListPage,
  type AssetGroupSummary,
  type AssetListPage,
} from '../api/assets';
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

type CompactAsset = AssetRecord & { attachmentsCount?: number };

type LoadedGroup = {
  items: CompactAsset[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
};

const GROUP_VISUAL_PALETTES = [
  {
    color: '#2563eb',
    border: 'rgba(59,130,246,0.50)',
    cardBackground: 'linear-gradient(135deg, rgba(239,246,255,0.96), rgba(255,255,255,0.92) 55%, rgba(219,234,254,0.76))',
    cardShadow: '0 12px 32px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(239,246,255,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(37,99,235,0.16)',
  },
  {
    color: '#16a34a',
    border: 'rgba(34,197,94,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(240,253,244,0.96), rgba(255,255,255,0.92) 55%, rgba(220,252,231,0.78))',
    cardShadow: '0 12px 32px rgba(22,163,74,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,253,244,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(22,163,74,0.15)',
  },
  {
    color: '#d4a017',
    border: 'rgba(245,158,11,0.48)',
    cardBackground: 'linear-gradient(135deg, rgba(255,251,235,0.97), rgba(255,255,255,0.92) 55%, rgba(254,240,138,0.70))',
    cardShadow: '0 12px 32px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,251,235,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(217,119,6,0.16)',
  },
  {
    color: '#0284c7',
    border: 'rgba(56,189,248,0.48)',
    cardBackground: 'linear-gradient(135deg, rgba(240,249,255,0.96), rgba(255,255,255,0.92) 55%, rgba(224,242,254,0.80))',
    cardShadow: '0 12px 32px rgba(2,132,199,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,249,255,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(2,132,199,0.15)',
  },
  {
    color: '#65a30d',
    border: 'rgba(132,204,22,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(247,254,231,0.97), rgba(255,255,255,0.92) 55%, rgba(217,249,157,0.76))',
    cardShadow: '0 12px 32px rgba(101,163,13,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,254,231,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(101,163,13,0.15)',
  },
  {
    color: '#eab308',
    border: 'rgba(234,179,8,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(254,252,232,0.97), rgba(255,255,255,0.92) 55%, rgba(254,249,195,0.82))',
    cardShadow: '0 12px 32px rgba(234,179,8,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(254,252,232,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(234,179,8,0.15)',
  },
] as const;

const FALLBACK_GROUP_ICONS = [Boxes, Archive, Building2, Cloud, Cog, Printer] as const;

const resolveGroupVisual = (group: AssetGroupSummary) => {
  const text = String(group.label + ' ' + group.key).toLowerCase();

  if (/النقل العام|public transport|bus/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: BusFront };
  }
  if (/مركبات|سيارات|وسائل النقل|vehicle|car|transport/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: CarFront };
  }
  if (/ups|طاقة احتياطية|الطاقة الاحتياطية|بطارية|battery|power backup/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[5], icon: BatteryCharging };
  }
  if (/التكييف|التبريد|مكيف|hvac|cooling|air conditioning/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: AirVent };
  }
  if (/طبية|مخبرية|مختبر|medical|lab|laboratory/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: FlaskConical };
  }
  if (/شبكات|اتصالات|network|communication|router|switch/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Network };
  }
  if (/كاميرات|كاميرا|camera|surveillance/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Camera };
  }
  if (/طابعات|طابعة|أجهزة النسخ|اجهزة النسخ|printer|copy|copier/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Printer };
  }
  if (/الشاشات|أجهزة العرض|اجهزة العرض|العرض|presentation|projector|screen|monitor/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Presentation };
  }
  if (/الحاسب|حاسب|كمبيوتر|computer|laptop/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: Laptop };
  }
  if (/الخزائن|خزائن|الكبائن|كبائن|خزانة|cabinet|locker|safe/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: Archive };
  }
  if (/الكراسي|كراسي|كرسي|chair/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: Armchair };
  }
  if (/الطاولات|طاولات|طاولة|table/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[5], icon: Table2 };
  }
  if (/المكاتب|مكاتب|مكتب|desk|office/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Table2 };
  }
  if (/الأثاث|الاثاث|اثاث|أثاث|furniture|sofa/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: Sofa };
  }
  if (/الآلات|آلات|الات|المعدات|معدات|equipment|machinery/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Cog };
  }
  if (/غير الملموسة|غير ملموسة|intangible|software|license/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Cloud };
  }
  if (/الأراضي|الاراضي|أراضي|اراضي|land|lands/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: Map };
  }
  if (/البنية التحتية|بنية تحتية|infrastructure/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: Building2 };
  }

  const seed = Array.from(group.key || group.label || '').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = GROUP_VISUAL_PALETTES[seed % GROUP_VISUAL_PALETTES.length];
  const icon = FALLBACK_GROUP_ICONS[seed % FALLBACK_GROUP_ICONS.length];
  return { ...palette, icon };
};

const AssetCard: React.FC<{
  asset: CompactAsset;
  canEdit: boolean;
  canDelete: boolean;
  deletingId: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ asset, canEdit, canDelete, deletingId, onView, onEdit, onDelete }) => (
  <article className="rounded-[22px] border bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">رقم الصنف: {asset.itemNumber || asset.assetNumber || '-'}</p>
        <h3 className="mt-1 truncate text-base font-black">{asset.name}</h3>
      </div>
      <Badge variant="outline">{ASSET_STATUS_LABELS[asset.status] || asset.status}</Badge>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-xs text-muted-foreground">التصنيف</dt><dd className="mt-1 font-medium">{CATEGORY_LABELS[asset.category] || asset.category}</dd></div>
      <div><dt className="text-xs text-muted-foreground">رقم البطاقة</dt><dd className="mt-1 font-medium">{asset.cardNumber || '-'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">الباركود</dt><dd className="mt-1 break-all font-medium">{asset.barcode || '-'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">الحالة الفنية</dt><dd className="mt-1 font-medium">{asset.technicalCondition || '-'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">الجهة / الإدارة</dt><dd className="mt-1 font-medium">{asset.responsibleDepartment || asset.department || asset.entityName || '-'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">الموقع</dt><dd className="mt-1 font-medium">{[asset.building, asset.floor, asset.room].filter(Boolean).join(' / ') || '-'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">الكمية</dt><dd className="mt-1 font-medium">{Number(asset.quantity ?? 1).toLocaleString('ar-SA')}</dd></div>
      <div><dt className="text-xs text-muted-foreground">المرفقات</dt><dd className="mt-1 font-medium">{Number(asset.attachmentsCount ?? 0).toLocaleString('ar-SA')}</dd></div>
    </dl>
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Button variant="outline" size="sm" onClick={onView}><Eye className="ml-1 h-4 w-4" />عرض</Button>
      {canEdit && <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}
      {canDelete && <Button variant="outline" size="sm" disabled={deletingId === asset.id} onClick={onDelete} className="text-red-600 hover:text-red-700"><Trash2 className="ml-1 h-4 w-4" />{deletingId === asset.id ? '...' : 'حذف'}</Button>}
    </div>
  </article>
);

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, hasPermission } = usePermissions();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<AssetGroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loadedGroups, setLoadedGroups] = useState<Record<string, LoadedGroup>>({});
  const [searchResult, setSearchResult] = useState<AssetListPage | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchSequence = useRef(0);
  const restoredGroupRef = useRef<string | null>(null);

  const canAdd = isAdmin || hasPermission('assets', 'canAdd');
  const canEdit = isAdmin || hasPermission('assets', 'canEdit');
  const canDelete = isAdmin || hasPermission('assets', 'canDelete');

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      setError('');
      setGroups(await getAssetGroups());
    } catch (loadError: any) {
      setError(loadError?.message || 'تعذر تحميل مجموعات الأصول.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setSearchResult(null);
      setSearchLoading(false);
      return;
    }
    const sequence = ++searchSequence.current;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const result = await getAssetListPage({ search: value, page: 1, limit: 60 });
        if (sequence === searchSequence.current) setSearchResult(result);
      } catch (searchError: any) {
        if (sequence === searchSequence.current) setError(searchError?.message || 'تعذر البحث في الأصول.');
      } finally {
        if (sequence === searchSequence.current) setSearchLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const totalAssets = useMemo(() => groups.reduce((sum, group) => sum + group.count, 0), [groups]);
  const totalQuantity = useMemo(() => groups.reduce((sum, group) => sum + group.quantity, 0), [groups]);

  const loadGroupPage = async (group: AssetGroupSummary, page = 1, append = false) => {
    setLoadedGroups((current) => ({
      ...current,
      [group.key]: {
        items: append ? current[group.key]?.items || [] : [],
        page: current[group.key]?.page || 0,
        totalPages: current[group.key]?.totalPages || 0,
        total: current[group.key]?.total || group.count,
        loading: true,
      },
    }));
    try {
      const result = await getAssetListPage({ group: group.key, page, limit: 36 });
      setLoadedGroups((current) => ({
        ...current,
        [group.key]: {
          items: append ? [...(current[group.key]?.items || []), ...result.items] : result.items,
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          loading: false,
        },
      }));
    } catch (loadError: any) {
      setError(loadError?.message || `تعذر تحميل مجموعة ${group.label}.`);
      setLoadedGroups((current) => ({
        ...current,
        [group.key]: { ...(current[group.key] || { items: [], page: 0, totalPages: 0, total: group.count }), loading: false },
      }));
    }
  };

  const toggleGroup = async (group: AssetGroupSummary) => {
    const willOpen = !expandedGroups[group.key];
    setExpandedGroups((current) => ({ ...current, [group.key]: willOpen }));
    if (willOpen && !loadedGroups[group.key]) await loadGroupPage(group, 1, false);
  };

  useEffect(() => {
    const groupKey = String((location.state as { assetGroupKey?: string } | null)?.assetGroupKey || '').trim();
    if (!groupKey || loadingGroups || !groups.length || restoredGroupRef.current === groupKey) return;

    const group = groups.find((item) => item.key === groupKey);
    if (!group) return;

    restoredGroupRef.current = groupKey;
    setExpandedGroups((current) => ({ ...current, [groupKey]: true }));
    if (!loadedGroups[groupKey]) void loadGroupPage(group, 1, false);

    const timer = window.setTimeout(() => {
      document.getElementById(`asset-group-${groupKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [groups, loadingGroups, location.state]);

  const handleDelete = async (asset: CompactAsset) => {
    if (!canDelete) return;
    const identifier = asset.itemNumber || asset.assetNumber || asset.barcode || '';
    if (!window.confirm(`هل تريد حذف الأصل ${identifier} - ${asset.name}؟`)) return;
    try {
      setDeletingId(asset.id);
      await deleteAsset(asset.id);
      setLoadedGroups((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          next[key] = { ...next[key], items: next[key].items.filter((item) => item.id !== asset.id), total: Math.max(0, next[key].total - 1) };
        });
        return next;
      });
      setSearchResult((current) => current ? { ...current, items: current.items.filter((item) => item.id !== asset.id), total: Math.max(0, current.total - 1) } : current);
      loadGroups();
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
          <p className="mt-2 text-sm text-muted-foreground">تحميل سريع حسب المجموعة؛ لا يتم جلب آلاف السجلات إلا عند فتح المجموعة أو البحث.</p>
        </div>
        {canAdd && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate('/assets/import')} className="h-11 rounded-2xl px-5"><FileSpreadsheet className="ml-2 h-5 w-5 text-emerald-600" />استيراد Excel</Button><Button onClick={() => navigate('/assets/new')} className="h-11 rounded-2xl px-5"><PlusCircle className="ml-2 h-5 w-5" />إضافة أصل</Button></div>}
      </section>

      <Card className="rounded-[26px] border-white/55 bg-white/68 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40"><CardTitle className="flex items-center gap-2 text-lg"><SlidersHorizontal className="h-5 w-5 text-primary" />البحث والتصفية</CardTitle></CardHeader>
        <CardContent className="p-5 sm:p-6"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برقم الصنف، الباركود، اسم الأصل، البطاقة، الإدارة أو الرقم التسلسلي..." className="h-11 rounded-xl pr-10" /></div></CardContent>
      </Card>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {query.trim() ? (
        <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            {searchLoading ? <div className="py-16 text-center text-sm text-muted-foreground">جارٍ البحث...</div> : !searchResult?.items.length ? <div className="py-16 text-center"><PackageSearch className="mx-auto h-10 w-10 text-primary" /><div className="mt-3 font-bold">لا توجد نتائج مطابقة</div></div> : <>
              <div className="mb-4 text-sm text-muted-foreground">تم العثور على {searchResult.total.toLocaleString('ar-SA')} سجل — يتم عرض أول {searchResult.items.length.toLocaleString('ar-SA')} نتيجة.</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{searchResult.items.map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`, { state: { assetGroupKey: group.key } })} onEdit={() => navigate(`/assets/${asset.id}/edit`, { state: { assetGroupKey: group.key } })} onDelete={() => handleDelete(asset)} />)}</div>
            </>}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <CardContent className="p-4 sm:p-5">
            {loadingGroups ? <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل مجموعات الأصول...</div> : groups.length === 0 ? <div className="py-16 text-center">لا توجد أصول.</div> : <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">إجمالي الأصول</div><div className="mt-1 text-2xl font-black">{totalAssets.toLocaleString('ar-SA')}</div></div>
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">عدد المجموعات</div><div className="mt-1 text-2xl font-black">{groups.length.toLocaleString('ar-SA')}</div></div>
                <div className="rounded-2xl border bg-background/65 p-4"><div className="text-xs text-muted-foreground">إجمالي الكميات</div><div className="mt-1 text-2xl font-black">{totalQuantity.toLocaleString('ar-SA')}</div></div>
              </div>

              {groups.map((group) => {
                const expanded = Boolean(expandedGroups[group.key]);
                const loaded = loadedGroups[group.key];
                const visual = resolveGroupVisual(group);
                const GroupIcon = visual.icon;
                return <section id={`asset-group-${group.key}`} key={group.key} className="scroll-mt-24 overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[1px]" style={{ borderColor: 'rgba(148,163,184,0.28)', background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.94))', boxShadow: '0 10px 28px rgba(15,23,42,0.055), inset 0 1px 0 rgba(255,255,255,0.96)' }}>
                  <button type="button" onClick={() => toggleGroup(group)} className="group relative flex w-full items-center justify-between gap-4 overflow-hidden p-4 text-right transition hover:bg-white/30 sm:p-5">
                    <div className="flex min-w-0 items-center gap-4"><div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] border bg-white/85 transition duration-300 group-hover:scale-[1.04]" style={{ borderColor: visual.border, background: visual.iconBackground, boxShadow: visual.iconShadow, color: visual.color }}><span className="absolute inset-3 rounded-full opacity-25 blur-lg" style={{ background: visual.color }} /><GroupIcon className="relative h-7 w-7" /></div><div className="min-w-0"><h2 className="truncate text-lg font-black">مجموعة {group.label}</h2><p className="mt-1 text-xs text-muted-foreground">{group.count.toLocaleString('ar-SA')} سجل • إجمالي الكمية {group.quantity.toLocaleString('ar-SA')}</p></div></div>
                    <div className="flex shrink-0 items-center gap-2"><Badge variant="outline" className="rounded-xl px-3 py-1">{group.count.toLocaleString('ar-SA')}</Badge><div className="grid h-9 w-9 place-items-center rounded-xl border bg-background">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div></div>
                  </button>
                  {expanded && <div className="border-t bg-muted/10 p-4 sm:p-5">
                    {loaded?.loading && !loaded.items.length ? <div className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل المجموعة...</div> : <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{(loaded?.items || []).map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`)} onEdit={() => navigate(`/assets/${asset.id}/edit`)} onDelete={() => handleDelete(asset)} />)}</div>
                      {loaded && loaded.page < loaded.totalPages && <div className="mt-5 flex justify-center"><Button variant="outline" disabled={loaded.loading} onClick={() => loadGroupPage(group, loaded.page + 1, true)}>{loaded.loading ? 'جارٍ التحميل...' : 'عرض المزيد'}</Button></div>}
                    </>}
                  </div>}
                </section>;
              })}
            </div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
