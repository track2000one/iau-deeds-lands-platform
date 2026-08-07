import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Barcode, Building2, FileText, MapPin, Paperclip, Save, Upload, UserRound, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getAsset, updateAsset, uploadAssetFile } from '../api/assets';
import type { AssetAttachment, AssetInput, AssetStatus } from '../../types/asset';

type UploadCategory = 'asset_images' | 'purchase_documents' | 'warranty_documents' | 'custody_documents' | 'other_documents';

const sections: Array<{ key: UploadCategory; label: string; accept: string }> = [
  { key: 'asset_images', label: 'صور الأصل', accept: 'image/*' },
  { key: 'purchase_documents', label: 'الفاتورة ومستندات الشراء', accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx' },
  { key: 'warranty_documents', label: 'الضمان والكتيبات الفنية', accept: 'image/*,.pdf,.doc,.docx' },
  { key: 'custody_documents', label: 'مستندات العهدة والاستلام', accept: 'image/*,.pdf,.doc,.docx' },
  { key: 'other_documents', label: 'مرفقات أخرى', accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt' },
];

const emptyInput: AssetInput = {
  barcode: '', name: '', category: '', brand: '', model: '', serialNumber: '', status: 'active',
  department: '', building: '', floor: '', room: '', custodian: '', purchaseDate: '', purchaseValue: null, notes: '', attachments: [],
};

export const EditAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const [form, setForm] = useState<AssetInput>(emptyInput);
  const [existingAttachments, setExistingAttachments] = useState<AssetAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<Record<UploadCategory, File[]>>({
    asset_images: [], purchase_documents: [], warranty_documents: [], custody_documents: [], other_documents: [],
  });
  const [assetNumber, setAssetNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    getAsset(assetId)
      .then((asset) => {
        if (cancelled) return;
        setAssetNumber(asset.assetNumber);
        setExistingAttachments(asset.attachments || []);
        setForm({
          barcode: asset.barcode || '', name: asset.name, category: asset.category, brand: asset.brand || '', model: asset.model || '',
          serialNumber: asset.serialNumber || '', status: asset.status, department: asset.department || '', building: asset.building || '',
          floor: asset.floor || '', room: asset.room || '', custodian: asset.custodian || '',
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : '', purchaseValue: asset.purchaseValue ?? null,
          notes: asset.notes || '', attachments: asset.attachments || [],
        });
      })
      .catch((e: any) => !cancelled && setError(e?.message || 'تعذر تحميل الأصل.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [assetId]);

  const newFilesCount = useMemo(() => Object.values(newFiles).reduce((n, files) => n + files.length, 0), [newFiles]);
  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!assetId) return;
    if (!String(form.name || '').trim() || !String(form.category || '').trim()) {
      setError('اسم الأصل والتصنيف حقول مطلوبة.');
      return;
    }

    try {
      setSaving(true); setError('');
      const uploaded: AssetAttachment[] = [];
      const queue = sections.flatMap((section) => newFiles[section.key].map((file) => ({ file, category: section.key })));
      for (let i = 0; i < queue.length; i += 1) {
        setProgress(`رفع المرفق ${i + 1} من ${queue.length}`);
        uploaded.push(await uploadAssetFile(queue[i].file, queue[i].category));
      }

      const payload: AssetInput = {
        ...form,
        barcode: String(form.barcode || '').trim() || null,
        name: String(form.name || '').trim(),
        category: String(form.category || '').trim(),
        brand: String(form.brand || '').trim() || null,
        model: String(form.model || '').trim() || null,
        serialNumber: String(form.serialNumber || '').trim() || null,
        department: String(form.department || '').trim() || null,
        building: String(form.building || '').trim() || null,
        floor: String(form.floor || '').trim() || null,
        room: String(form.room || '').trim() || null,
        custodian: String(form.custodian || '').trim() || null,
        purchaseDate: form.purchaseDate || null,
        purchaseValue: form.purchaseValue === null || form.purchaseValue === undefined ? null : Number(form.purchaseValue),
        notes: String(form.notes || '').trim() || null,
        attachments: [...existingAttachments, ...uploaded],
      };

      setProgress('حفظ التعديلات...');
      await updateAsset(assetId, payload);
      navigate(`/assets/${assetId}`, { replace: true });
    } catch (e: any) {
      setError(e?.message || 'تعذر حفظ التعديلات.');
    } finally {
      setSaving(false); setProgress('');
    }
  };

  if (loading) return <div className="mx-auto flex min-h-[420px] max-w-[1500px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل بيانات الأصل...</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-lg sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-semibold text-primary">وحدة الأصول</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">تعديل الأصل</h1><p className="mt-1 text-sm text-muted-foreground">{assetNumber}</p></div>
        <Button variant="outline" onClick={() => navigate(`/assets/${assetId}`)}><ArrowRight className="ml-2 h-4 w-4" />العودة للعرض</Button>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-md">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" />البيانات الأساسية</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <div><Label>رقم الأصل</Label><Input value={assetNumber} disabled /></div>
          <div><Label>الباركود</Label><Input value={form.barcode || ''} onChange={(e) => setField('barcode', e.target.value)} /></div>
          <div><Label>اسم الأصل *</Label><Input value={form.name} onChange={(e) => setField('name', e.target.value)} /></div>
          <div><Label>التصنيف *</Label><Select value={form.category} onValueChange={(v) => setField('category', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="it">تقنية معلومات</SelectItem><SelectItem value="furniture">أثاث</SelectItem><SelectItem value="equipment">أجهزة ومعدات</SelectItem><SelectItem value="vehicle">مركبات</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></div>
          <div><Label>الحالة</Label><Select value={form.status} onValueChange={(v) => setField('status', v as AssetStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="assigned">بعهدة</SelectItem><SelectItem value="maintenance">تحت الصيانة</SelectItem><SelectItem value="stored">بالمستودع</SelectItem><SelectItem value="disposed">مستبعد</SelectItem></SelectContent></Select></div>
          <div><Label>الماركة</Label><Input value={form.brand || ''} onChange={(e) => setField('brand', e.target.value)} /></div>
          <div><Label>الموديل</Label><Input value={form.model || ''} onChange={(e) => setField('model', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>الرقم التسلسلي</Label><Input value={form.serialNumber || ''} onChange={(e) => setField('serialNumber', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-md">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />الموقع والعهدة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <div><Label>الجهة / الإدارة</Label><Input value={form.department || ''} onChange={(e) => setField('department', e.target.value)} /></div>
          <div><Label>المبنى</Label><div className="relative"><Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.building || ''} onChange={(e) => setField('building', e.target.value)} /></div></div>
          <div><Label>الدور</Label><Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} /></div>
          <div><Label>الغرفة / الموقع التفصيلي</Label><Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>صاحب العهدة</Label><div className="relative"><UserRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.custodian || ''} onChange={(e) => setField('custodian', e.target.value)} /></div></div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-md">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />بيانات إضافية</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div><Label>تاريخ الشراء</Label><Input type="date" value={String(form.purchaseDate || '')} onChange={(e) => setField('purchaseDate', e.target.value)} /></div>
          <div><Label>قيمة الشراء</Label><Input type="number" min="0" step="0.01" value={form.purchaseValue ?? ''} onChange={(e) => setField('purchaseValue', e.target.value === '' ? null : Number(e.target.value))} /></div>
          <div className="md:col-span-2"><Label>ملاحظات</Label><Textarea rows={4} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-md">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />المرفقات والوثائق</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-5">
          {existingAttachments.length > 0 && <div><p className="mb-2 text-sm font-bold">المرفقات الحالية</p><div className="grid grid-cols-1 gap-2 md:grid-cols-2">{existingAttachments.map((a, i) => <div key={a.id || i} className="flex items-center justify-between gap-2 rounded-xl border p-3"><a href={a.driveUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-medium hover:underline">{a.title}</a><Button type="button" variant="ghost" size="icon" onClick={() => setExistingAttachments((current) => current.filter((_, index) => index !== i))}><X className="h-4 w-4" /></Button></div>)}</div></div>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{sections.map((section) => <label key={section.key} className="cursor-pointer rounded-2xl border border-dashed p-4"><div className="flex items-center gap-2 font-bold"><Upload className="h-4 w-4" />{section.label}</div><div className="mt-1 text-xs text-muted-foreground">{newFiles[section.key].length} ملف جديد</div><input type="file" multiple accept={section.accept} className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); setNewFiles((current) => ({ ...current, [section.key]: [...current[section.key], ...files] })); e.currentTarget.value = ''; }} /></label>)}</div>
          <p className="text-xs text-muted-foreground">سيتم الاحتفاظ بالمرفقات الحالية وإضافة {newFilesCount} مرفق جديد عند الحفظ.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed p-4">
        <Button disabled={saving} onClick={handleSave}><Save className="ml-2 h-4 w-4" />{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</Button>
        {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
      </div>
    </div>
  );
};
