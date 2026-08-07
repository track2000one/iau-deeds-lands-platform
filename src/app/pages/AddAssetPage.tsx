import React from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Barcode,
  Building2,
  MapPin,
  PackagePlus,
  Save,
  UserRound,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export const AddAssetPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <PackagePlus className="h-4 w-4" />
            وحدة الأصول
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">إضافة أصل جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            تسجيل البيانات الأساسية للأصل وموقعه وعهدته تمهيدًا لربطه بالباركود والجرد.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate('/assets/list')} className="h-11 rounded-2xl">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لسجل الأصول
        </Button>
      </section>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Barcode className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>رقم الأصل الداخلي</Label>
            <Input placeholder="يُنشأ تلقائيًا مثل AST-2026-000001" disabled />
          </div>
          <div className="space-y-2">
            <Label>رقم الباركود / ملصق الأصل</Label>
            <Input placeholder="امسح الباركود أو أدخل الرقم يدويًا" />
          </div>
          <div className="space-y-2">
            <Label>اسم الأصل *</Label>
            <Input placeholder="مثال: جهاز حاسب مكتبي" />
          </div>
          <div className="space-y-2">
            <Label>التصنيف *</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="it">تقنية معلومات</SelectItem>
                <SelectItem value="furniture">أثاث</SelectItem>
                <SelectItem value="equipment">أجهزة ومعدات</SelectItem>
                <SelectItem value="vehicle">مركبات</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الماركة</Label>
            <Input placeholder="مثال: Dell" />
          </div>
          <div className="space-y-2">
            <Label>الموديل</Label>
            <Input placeholder="الموديل" />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label>الرقم التسلسلي</Label>
            <Input placeholder="Serial Number" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            الموقع والعهدة
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>الجهة / الإدارة</Label>
            <Input placeholder="اسم الجهة" />
          </div>
          <div className="space-y-2">
            <Label>المبنى</Label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" placeholder="اسم أو رقم المبنى" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Input placeholder="الدور" />
          </div>
          <div className="space-y-2">
            <Label>الغرفة / الموقع التفصيلي</Label>
            <Input placeholder="رقم الغرفة أو وصف الموقع" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>صاحب العهدة</Label>
            <div className="relative">
              <UserRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" placeholder="اسم الموظف أو الرقم الوظيفي" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="text-lg">بيانات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>تاريخ الشراء</Label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <Label>قيمة الشراء</Label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea rows={4} placeholder="أي معلومات إضافية عن الأصل..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          واجهة التسجيل جاهزة. سيتم تفعيل الحفظ الفعلي بعد إنشاء Backend وقاعدة بيانات الأصول.
        </p>
        <Button disabled className="h-11 rounded-2xl px-6">
          <Save className="ml-2 h-4 w-4" />
          حفظ الأصل
        </Button>
      </div>
    </div>
  );
};
