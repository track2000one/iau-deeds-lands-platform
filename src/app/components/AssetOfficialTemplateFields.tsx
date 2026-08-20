import React, { useMemo } from 'react';
import { Calculator, FileSpreadsheet, Landmark, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AppDateField } from './AppDateField';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { AssetInput } from '../../types/asset';
import {
  MODEL_B_ISSUE_DATE,
  MODEL_B_PROCEDURES,
  MODEL_B_VALUATION_METHODS,
  MODEL_B_VERSION,
  modelBPayloadOf,
  modelBValuesFromAsset,
  setModelBPayload,
  validateModelBValues,
} from '../config/fixedAssetModelB';

const numberValue = (value: unknown) => value === null || value === undefined ? '' : String(value);

export const AssetOfficialTemplateFields: React.FC<{
  value: AssetInput;
  onChange: (next: AssetInput) => void;
}> = ({ value, onChange }) => {
  const modelB = modelBPayloadOf(value);
  const values = useMemo(() => modelBValuesFromAsset(value), [value]);
  const validation = useMemo(() => validateModelBValues(values), [values]);

  const setField = <K extends keyof AssetInput>(key: K, fieldValue: AssetInput[K]) => onChange({ ...value, [key]: fieldValue });
  const setModelB = (column: string, fieldValue: unknown) => onChange(setModelBPayload(value, { [column]: fieldValue }));
  const setNumericModelB = (column: string, raw: string) => setModelB(column, raw === '' ? '' : Number(raw));

  const derived = modelBValuesFromAsset(value);
  const missingPreview = [...validation.missingMandatory, ...validation.conditionalMissing].slice(0, 8);

  return (
    <Card className="rounded-[28px] border-violet-200/70 bg-white/76 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <CardHeader className="border-b bg-violet-50/45">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-violet-700" />
          نموذج (ب - استدامة) سجل الأصول الثابتة
          <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-bold text-violet-700">{MODEL_B_VERSION} · {MODEL_B_ISSUE_DATE}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <section className={`rounded-2xl border p-4 ${validation.complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              {validation.complete ? <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-700" /> : <TriangleAlert className="mt-0.5 h-6 w-6 text-amber-700" />}
              <div><p className="font-black">جاهزية نموذج ب: {validation.completion}%</p><p className="mt-1 text-xs leading-6 text-slate-600">الحفظ التشغيلي متاح للبيانات الحالية، لكن الاعتماد المحاسبي النهائي يتطلب استكمال الحقول الإلزامية وشروط الإجراء.</p></div>
            </div>
            <div className="text-xs font-bold text-slate-600">إلزامي ناقص: {validation.missingMandatory.length} · شرطي ناقص: {validation.conditionalMissing.length}</div>
          </div>
          {missingPreview.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{missingPreview.map((item) => <span key={`${item.column}-${item.label}`} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] text-amber-800">{item.column} — {item.label}</span>)}</div>}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><h3 className="font-black">بيانات الجهة وإجراء الاستدامة</h3></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>اسم الجهة A *</Label><Input value={value.entityName || ''} onChange={(e) => setField('entityName', e.target.value)} placeholder="جامعة الإمام عبدالرحمن بن فيصل" /></div>
            <div className="space-y-2"><Label>رمز الجهة B *</Label><Input value={value.entityCode || ''} onChange={(e) => setField('entityCode', e.target.value)} /></div>
            <div className="space-y-2"><Label>نوع الإجراء C</Label><Select value={String(modelB.C || '')} onValueChange={(next) => setModelB('C', next)}><SelectTrigger><SelectValue placeholder="إضافة / نقل / بيع / تحديث / إتلاف" /></SelectTrigger><SelectContent>{MODEL_B_PROCEDURES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-black">التصنيف والترميز D:T</h3></div>
          <p className="text-xs leading-6 text-muted-foreground">المسميات العربية تُراجع من دليل التصنيف، بينما الرموز والمسميات الإنجليزية والحسابات حقول آلية/مرجعية. لا يُستخدم رمز التصنيف كهوية فريدة للأصل.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>المستوى الأول - عربي E *</Label><Input value={value.classification1 || ''} onChange={(e) => setField('classification1', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز المستوى الأول D — آلي</Label><Input value={String(modelB.D || '')} onChange={(e) => setModelB('D', e.target.value)} /></div>
            <div className="space-y-2"><Label>المستوى الأول - إنجليزي F — آلي</Label><Input value={String(modelB.F || '')} onChange={(e) => setModelB('F', e.target.value)} /></div>
            <div className="space-y-2"><Label>المستوى الثاني - عربي H *</Label><Input value={value.classification2 || ''} onChange={(e) => setField('classification2', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز المستوى الثاني G — آلي</Label><Input value={String(modelB.G || '')} onChange={(e) => setModelB('G', e.target.value)} /></div>
            <div className="space-y-2"><Label>المستوى الثاني - إنجليزي I — آلي</Label><Input value={String(modelB.I || '')} onChange={(e) => setModelB('I', e.target.value)} /></div>
            <div className="space-y-2"><Label>المستوى الثالث - عربي K *</Label><Input value={value.classification3 || ''} onChange={(e) => setField('classification3', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز المستوى الثالث J — آلي</Label><Input value={String(modelB.J || '')} onChange={(e) => setModelB('J', e.target.value)} /></div>
            <div className="space-y-2"><Label>المستوى الثالث - إنجليزي L — آلي</Label><Input value={String(modelB.L || '')} onChange={(e) => setModelB('L', e.target.value)} /></div>
            <div className="space-y-2"><Label>المجموعة المحاسبية N *</Label><Input value={value.accountingGroup || ''} onChange={(e) => setField('accountingGroup', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز المجموعة M — آلي</Label><Input value={value.accountingGroupCode || ''} onChange={(e) => setField('accountingGroupCode', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز الأصل المحاسبي P — آلي</Label><Input value={value.assetCode || ''} onChange={(e) => setField('assetCode', e.target.value)} /></div>
            <div className="space-y-2"><Label>GL Account — S آلي</Label><Input value={String(modelB.S || '')} onChange={(e) => setModelB('S', e.target.value)} /></div>
            <div className="space-y-2"><Label>مركز التكلفة T — آلي</Label><Input value={String(modelB.T || '')} onChange={(e) => setModelB('T', e.target.value)} /></div>
            <div className="space-y-2"><Label>وصف الصيانة Q</Label><Input value={String(modelB.Q || '')} onChange={(e) => setModelB('Q', e.target.value)} /></div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-black">البيانات التعريفية U:AE</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>مالك الأصل U *</Label><Input value={String(modelB.U || '')} onChange={(e) => setModelB('U', e.target.value)} placeholder="جامعة الإمام عبدالرحمن بن فيصل" /></div>
            <div className="space-y-2"><Label>القسم / الإدارة المسؤولة V</Label><Input value={value.responsibleDepartment || value.department || ''} onChange={(e) => setField('responsibleDepartment', e.target.value)} /></div>
            <div className="space-y-2"><Label>الأصل المرتبط X</Label><Input value={String(modelB.X || '')} onChange={(e) => setModelB('X', e.target.value)} placeholder="الرقم الفريد للأصل الأب" /></div>
            <div className="space-y-2"><Label>رقم وزارة المالية Y — آلي</Label><Input value={String(modelB.Y || '')} onChange={(e) => setModelB('Y', e.target.value)} /></div>
            <div className="space-y-2"><Label>الرقم الفريد بالجهة Z — آلي</Label><Input value={String(modelB.Z || value.itemNumber || '')} onChange={(e) => setModelB('Z', e.target.value)} /></div>
            <div className="space-y-2"><Label>وصف الأصل AA *</Label><Input value={value.assetDescription || value.name || ''} onChange={(e) => setField('assetDescription', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم البطاقة AB *</Label><Input value={value.cardNumber || value.barcode || ''} onChange={(e) => setField('cardNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>وحدة القياس AC *</Label><Input value={value.unitOfMeasure || ''} onChange={(e) => setField('unitOfMeasure', e.target.value)} /></div>
            <div className="space-y-2"><Label>العدد AD *</Label><Input type="number" value={numberValue(value.quantity)} onChange={(e) => setField('quantity', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>المصنّع AE *</Label><Input value={value.manufacturer || value.brand || ''} onChange={(e) => setField('manufacturer', e.target.value)} /></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><h3 className="font-black">البيانات المحاسبية AF:AP</h3></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppDateField id="asset-modelb-service-date" label="تاريخ الدخول في الخدمة AF *" value={String(value.serviceDate || '')} dateType={value.serviceDateType || 'gregorian'} onValueChange={(date) => setField('serviceDate', date)} onDateTypeChange={(type) => setField('serviceDateType', type)} />
            <div className="space-y-2"><Label>طريقة التقييم AG *</Label><Select value={String(modelB.AG || '')} onValueChange={(next) => setModelB('AG', next)}><SelectTrigger><SelectValue placeholder="اختر طريقة التقييم" /></SelectTrigger><SelectContent>{MODEL_B_VALUATION_METHODS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>التكلفة AH *</Label><Input type="number" value={numberValue(value.acquisitionCost ?? value.purchaseValue)} onChange={(e) => setField('acquisitionCost', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>العمر الإنتاجي AO — مرجعي</Label><Input type="number" value={numberValue(value.usefulLife)} onChange={(e) => setField('usefulLife', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>العمر المتبقي AP — محسوب/مرجعي</Label><Input type="number" value={numberValue(value.remainingLife)} onChange={(e) => setField('remainingLife', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>القيمة المتبقية AM</Label><Input type="number" value={numberValue(modelB.AM)} onChange={(e) => setNumericModelB('AM', e.target.value)} /></div>
            <div className="space-y-2"><Label>مصروف الهبوط AK — عند الانطباق</Label><Input type="number" value={numberValue(modelB.AK)} onChange={(e) => setNumericModelB('AK', e.target.value)} /></div>
            <div className="space-y-2"><Label>مجمع الهبوط AL — عند الانطباق</Label><Input type="number" value={numberValue(modelB.AL)} onChange={(e) => setNumericModelB('AL', e.target.value)} /></div>
            <div className="space-y-2"><Label>قسط الاستهلاك AI — آلي</Label><Input readOnly value={numberValue(derived.AI)} className="bg-slate-50" /></div>
            <div className="space-y-2"><Label>الاستهلاك المتراكم AJ — آلي</Label><Input readOnly value={numberValue(derived.AJ)} className="bg-slate-50" /></div>
            <div className="space-y-2"><Label>القيمة الدفترية AN — آلي</Label><Input readOnly value={numberValue(derived.AN)} className="bg-slate-50" /></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h3 className="font-black">الموقع الجغرافي AQ:AX</h3></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>الدولة AQ *</Label><Input value={String(modelB.AQ || 'المملكة العربية السعودية')} onChange={(e) => setModelB('AQ', e.target.value)} /></div>
            <div className="space-y-2"><Label>المنطقة AR *</Label><Input value={value.region || ''} onChange={(e) => setField('region', e.target.value)} /></div>
            <div className="space-y-2"><Label>المدينة AS *</Label><Input value={value.city || ''} onChange={(e) => setField('city', e.target.value)} /></div>
            <div className="space-y-2"><Label>الإحداثيات AT</Label><Input value={value.coordinates || ''} onChange={(e) => setField('coordinates', e.target.value)} /></div>
            <div className="space-y-2"><Label>العنوان الوطني AU *</Label><Input value={String(modelB.AU || '')} onChange={(e) => setModelB('AU', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم المبنى AV *</Label><Input value={value.buildingNumber || value.building || ''} onChange={(e) => setField('buildingNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم الدور AW</Label><Input value={value.floor || ''} onChange={(e) => setField('floor', e.target.value)} /></div>
            <div className="space-y-2"><Label>الغرفة / المكتب AX</Label><Input value={value.room || ''} onChange={(e) => setField('room', e.target.value)} /></div>
          </div>
        </section>

        {(String(modelB.C || '') === 'بيع' || String(modelB.C || '') === 'إتلاف' || modelB.AY || modelB.BA) && <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50/35 p-4">
          <h3 className="font-black text-red-900">استبعاد الأصل AY:BB — إلزامي عند البيع أو الإتلاف</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2"><Label>تاريخ الاستبعاد AY</Label><Input type="date" value={String(modelB.AY || '')} onChange={(e) => setModelB('AY', e.target.value)} /></div>
            <div className="space-y-2"><Label>صافي القيمة الدفترية AZ</Label><Input type="number" value={numberValue(modelB.AZ)} onChange={(e) => setNumericModelB('AZ', e.target.value)} /></div>
            <div className="space-y-2"><Label>قيمة الاستبعاد BA</Label><Input type="number" value={numberValue(modelB.BA)} onChange={(e) => setNumericModelB('BA', e.target.value)} /></div>
            <div className="space-y-2"><Label>الربح / الخسارة BB — آلي</Label><Input readOnly value={numberValue(derived.BB)} className="bg-white" /></div>
          </div>
        </section>}

        <div className="rounded-2xl border border-dashed bg-background/55 p-4 text-sm leading-7 text-muted-foreground">
          البيانات الإضافية تحفظ داخل سجل الأصل تحت نسخة نموذج ب، بينما تبقى هوية الأصل ودورة حياته في سجل الأصول المركزي. ملفات الإدارات اللاحقة تُطابق على الرقم الفريد وتُعامل كتحديثات جزئية؛ الخانة غير المرسلة لا تعني حذف القيمة السابقة.
        </div>
      </CardContent>
    </Card>
  );
};
