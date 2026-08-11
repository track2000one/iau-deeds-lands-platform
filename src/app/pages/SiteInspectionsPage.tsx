import React from 'react';
import { useNavigate } from 'react-router';
import {
  ClipboardCheck,
  Eye,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import type { SiteInspection } from '../../types/siteInspection';
import {
  deleteSiteInspection,
  getSiteInspections,
} from '../api/siteInspections';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

const statusLabels: Record<string, string> = {
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  referred: 'تمت الإحالة',
  in_progress: 'جارٍ التنفيذ',
  resolved: 'تمت المعالجة',
  closed: 'مغلقة',
};

const conditionLabels: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  follow_up: 'تحتاج متابعة',
  maintenance: 'تحتاج صيانة',
  major_notes: 'ملاحظات جوهرية',
  emergency: 'حالة طارئة',
};

export const SiteInspectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const [items, setItems] = React.useState<SiteInspection[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const canAdd = isAdmin || hasPermission('site_inspections', 'canAdd');
  const canDelete = isAdmin || hasPermission('site_inspections', 'canDelete');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getSiteInspections());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل المعاينات');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [
        item.inspectionNumber,
        item.title,
        item.siteName,
        item.city,
        item.observations,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [items, search]);

  const remove = async (item: SiteInspection) => {
    if (!confirm(`هل تريد حذف المعاينة ${item.inspectionNumber}؟`)) return;

    try {
      await deleteSiteInspection(item.id);
      setItems((current) => current.filter((record) => record.id !== item.id));
      toast.success('تم حذف المعاينة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المعاينة');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">المعاينات الميدانية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            توثيق زيارات أراضي ومواقع أملاك الجامعة والملاحظات والصور والإجراءات.
          </p>
        </div>

        {canAdd && (
          <Button onClick={() => navigate('/site-inspections/new')}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة معاينة جديدة
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث برقم المعاينة أو الموقع أو المدينة..."
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-10 text-center">جاري تحميل المعاينات...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
            <ClipboardCheck className="mb-3 h-12 w-12 opacity-30" />
            <p className="font-semibold">لا توجد معاينات مسجلة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="platform-record-grid">
          {filtered.map((item) => (
            <Card key={item.id} className="platform-record-card overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{item.title}</CardTitle>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.inspectionNumber}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {statusLabels[item.workflowStatus] || item.workflowStatus}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="font-semibold">{item.siteName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[item.city, item.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">تاريخ الزيارة</p>
                    <p className="mt-1 font-medium">
                      {new Date(item.visitDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">الحالة العامة</p>
                    <p className="mt-1 font-medium">
                      {conditionLabels[item.overallStatus] || item.overallStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>{item.attachments?.length || 0} صورة</span>
                  {item.latitude != null && item.longitude != null && (
                    <MapPin className="h-4 w-4 text-primary" />
                  )}
                </div>

                <div className="platform-record-actions mt-auto">
                  <Button onClick={() => navigate(`/site-inspections/${item.id}`)}>
                    <Eye className="ml-2 h-4 w-4" />
                    عرض
                  </Button>
                  {canDelete && (
                    <Button variant="destructive" className="platform-record-danger" onClick={() => remove(item)}>
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
