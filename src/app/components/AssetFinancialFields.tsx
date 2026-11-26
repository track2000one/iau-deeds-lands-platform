import React from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { AssetInput } from '../../types/asset';

const moneyFields = [
  ['depreciationAmount', 'قسط الإهلاك'],
  ['accumulatedDepreciation', 'الإهلاك المتراكم'],
  ['residualValue', 'القيمة المتبقية في نهاية العمر'],
  ['netBookValue', 'القيمة الدفترية'],
] as const;

export const AssetFinancialFields: React.FC<{ value: AssetInput; onChange: (next: AssetInput) => void }> = ({ value, onChange }) => (
  <Card className="rounded-[28px] border-border bg-card text-card-foreground shadow-sm">
    <CardHeader className="border-b">
      <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> الموقع والبيانات المالية والمحاسبية</CardTitle>
      <p className="text-xs text-muted-foreground">حقول مستقلة اختيارية من سجل الترميز. اترك الحقل فارغًا إذا لم تتوفر قيمة معتمدة. الصفر قيمة مالية فعلية، ولا يجري احتساب الإهلاك تلقائيًا.</p>
    </CardHeader>
    <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="asset-financial-location">الموقع</Label><Input id="asset-financial-location" maxLength={500} value={value.location ?? ''} onChange={e => onChange({ ...value, location: e.target.value || null })} /></div>
      {moneyFields.map(([key,label]) => {
        const raw = value[key] == null ? '' : String(value[key]);
        const valid = raw === '' || /^-?\d{1,16}(?:\.\d{1,4})?$/.test(raw);
        return <div key={key} className="space-y-2"><Label htmlFor={`asset-financial-${key}`}>{label} (ر.س)</Label><Input id={`asset-financial-${key}`} inputMode="decimal" value={raw} aria-invalid={!valid} onChange={e => onChange({ ...value, [key]: e.target.value === '' ? null : e.target.value })} placeholder="غير معبأ" />{!valid && <p className="text-xs text-destructive">أدخل رقمًا عشريًا صحيحًا بحد أقصى أربع منازل عشرية.</p>}</div>;
      })}
    </CardContent>
  </Card>
);
