import React from 'react';
import { useNavigate } from 'react-router';
import { Boxes, PackageSearch, PlusCircle, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { usePermissions } from '../../context/PermissionsContext';

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [query, setQuery] = React.useState('');

  const canAdd = isAdmin || hasPermission('assets', 'canAdd');

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Boxes className="h-4 w-4" />
            وحدة الأصول
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">جميع الأصول</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سجل موحد للأصول والباركود والمواقع والعهد والحالة التشغيلية.
          </p>
        </div>

        {canAdd && (
          <Button onClick={() => navigate('/assets/new')} className="h-11 rounded-2xl px-5">
            <PlusCircle className="ml-2 h-5 w-5" />
            إضافة أصل
          </Button>
        )}
      </section>

      <Card className="rounded-[26px] border-white/55 bg-white/68 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث برقم الأصل، الباركود، اسم الأصل، الرقم التسلسلي أو صاحب العهدة..."
              className="h-11 rounded-xl pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-[28px] border bg-background/80 shadow-inner">
            <PackageSearch className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-black">سجل الأصول جاهز للربط</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            لا توجد بيانات أصول مرتبطة بقاعدة البيانات حتى الآن. في المرحلة التالية سيتم إنشاء جداول الأصول وواجهات API ثم ستظهر السجلات هنا مباشرة.
          </p>
          {query && (
            <p className="mt-3 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              البحث الحالي: {query}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
