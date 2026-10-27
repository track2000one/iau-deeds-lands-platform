import React from 'react';
import { Link as RouterLink } from 'react-router';
import { apiJson } from '../../lib/http';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

type LinkedSite = {
  id: string;
  code: string;
  name: string;
  areas: Array<{
    id: string;
    areaCode: string;
    name?: string | null;
    occupancyStatus: string;
    opportunities: Array<{ id: string; opportunityNumber: string; title: string; status: string }>;
  }>;
};
type RelationResponse = {
  deed: { id: string; deedNumber: string; propertyDescription: string };
  permissions: { buildingsVisible: boolean; investmentsVisible: boolean };
  buildings: Array<{ id: string; buildingNumber: string; name: string | null; campusLocation: string | null; operationalStatus: string }>;
  investmentSites: LinkedSite[];
};

export function VacantLandRelationsDialog({
  deedId, code, open, onOpenChange,
}: {
  deedId: string;
  code: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [data, setData] = React.useState<RelationResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    if (!open || !deedId) return;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    apiJson<RelationResponse>('/api/vacant-lands/deed-relations/' + encodeURIComponent(deedId))
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'تعذر تحميل الروابط'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, deedId]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
      <DialogHeader><DialogTitle>الروابط العقارية للموقع {code}</DialogTitle></DialogHeader>
      {loading && <p className="p-5 text-sm">جارٍ مطابقة رقم الصك مع السجلات المرتبطة...</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive p-3 text-destructive">{error}</p>}
      {data && <div className="space-y-4 text-sm">
        <section className="rounded-xl border bg-muted/30 p-4">
          <h3 className="font-bold">سجل الصك العقاري الموحد</h3>
          <p className="my-1">رقم الصك: <strong>{data.deed.deedNumber}</strong></p>
          <p className="text-muted-foreground">{data.deed.propertyDescription}</p>
          <Button type="button" size="sm" variant="outline" asChild className="mt-2">
            <RouterLink to={'/deeds/' + encodeURIComponent(data.deed.id)}>عرض الصك في سجل الصكوك</RouterLink>
          </Button>
        </section>
        <section className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">السجل المركزي للمباني</h3>
            {data.permissions.buildingsVisible && <Button size="sm" variant="outline" asChild><RouterLink to="/buildings/registry">فتح سجل المباني</RouterLink></Button>}
          </div>
          {!data.permissions.buildingsVisible
            ? <p className="mt-2 text-muted-foreground">تفاصيل المباني تتطلب صلاحية السجل المركزي للمباني.</p>
            : data.buildings.length === 0
              ? <p className="mt-2 text-muted-foreground">لا توجد مبانٍ مرتبطة مباشرة بهذا الصك في السجل.</p>
              : <div className="mt-3 space-y-2">{data.buildings.map((x) => <div key={x.id} className="rounded-lg border bg-muted/20 p-3">
                  <strong>{x.buildingNumber} — {x.name || 'مبنى بدون اسم'}</strong>
                  <p className="text-muted-foreground">{x.campusLocation || ''} · الحالة: {x.operationalStatus}</p>
                </div>)}</div>}
        </section>
        <section className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">المساحات والفرص الاستثمارية</h3>
            {data.permissions.investmentsVisible && <Button size="sm" variant="outline" asChild><RouterLink to="/investments/sites">فتح المواقع الاستثمارية</RouterLink></Button>}
          </div>
          {!data.permissions.investmentsVisible
            ? <p className="mt-2 text-muted-foreground">تفاصيل المواقع والفرص الاستثمارية تتطلب صلاحية الوحدة المختصة.</p>
            : data.investmentSites.length === 0
              ? <p className="mt-2 text-muted-foreground">لا توجد مواقع استثمارية مرتبطة بهذا الصك في النظام.</p>
              : <div className="mt-3 space-y-3">{data.investmentSites.map((site) => <div key={site.id} className="rounded-xl border bg-muted/20 p-3">
                <strong>{site.code} — {site.name}</strong>
                {site.areas.length === 0 && <p className="text-muted-foreground">لا توجد مساحات مسجلة لهذا الموقع.</p>}
                {site.areas.map((area) => <div key={area.id} className="mt-2 rounded-lg border p-3">
                  <RouterLink className="font-semibold text-primary underline-offset-4 hover:underline" to={'/investments/areas/' + encodeURIComponent(area.id)}>
                    {area.areaCode} — {area.name || 'مساحة بدون اسم'}
                  </RouterLink>
                  <p className="mt-1 text-xs text-muted-foreground">حالة الإشغال الاستثمارية: {area.occupancyStatus} · لا تُغيّر حالة شغور الأرض تلقائيًا</p>
                  {area.opportunities.map((opportunity) => <p key={opportunity.id} className="mt-1">
                    <RouterLink className="text-primary underline-offset-4 hover:underline" to={'/investments/opportunities/' + encodeURIComponent(opportunity.id)}>
                      {opportunity.opportunityNumber} — {opportunity.title}
                    </RouterLink> · {opportunity.status}
                  </p>)}
                </div>)}
              </div>)}</div>}
        </section>
        <p className="text-xs text-muted-foreground">
          تتم المطابقة عبر معرّف الصك المناظر لرقم الصك في السجل الموحد، وتشمل صكوك المواقع الاستثمارية الأساسية والإضافية. هذا العرض مرجعي فقط ولا ينشئ أو يعتمد فرصة استثمارية.
        </p>
      </div>}
    </DialogContent>
  </Dialog>;
}
