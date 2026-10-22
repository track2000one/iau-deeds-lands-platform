import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, Images, LoaderCircle, Trash2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { mosqueApi, type CentralBuildingPhoto } from '../api/mosques';

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_PHOTOS_PER_SELECTION = 8;
const MAX_PHOTOS_PER_BUILDING = 30;
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

type Props = {
  buildingId?: string | null;
  photos?: CentralBuildingPhoto[] | null;
  editable?: boolean;
  onPhotosChange?: (photos: CentralBuildingPhoto[]) => void;
  onReload?: () => Promise<void>;
};

function SecurePhotoThumbnail({ buildingId, photo }: { buildingId: string; photo: CentralBuildingPhoto }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tempUrl: string | null = null;

    mosqueApi.buildingPhotoBlob(buildingId, photo.id)
      .then((blob) => {
        tempUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(tempUrl);
        else setPreviewUrl(tempUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    };
  }, [buildingId, photo.id]);

  if (failed) {
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-1 bg-muted/40 text-xs text-muted-foreground">
        <Images className="h-6 w-6" />
        تعذر عرض المعاينة
      </div>
    );
  }

  return (
    <button
      type="button"
      className="relative flex h-28 w-full items-center justify-center overflow-hidden bg-muted/30"
      onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer'); }}
      title="فتح الصورة بالحجم الكامل"
      disabled={!previewUrl}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={photo.fileName || 'صورة المبنى'} className="h-full w-full object-cover" />
          <span className="absolute bottom-1 left-1 rounded-lg bg-slate-900/75 p-1 text-white"><Eye className="h-3.5 w-3.5" /></span>
        </>
      ) : <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />}
    </button>
  );
}

export function CentralBuildingPhotos({
  buildingId,
  photos = [],
  editable = false,
  onPhotosChange,
  onReload,
}: Props) {
  const gallery = photos || [];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const urls = pending.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [pending]);

  const choosePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const candidates = Array.from(files);
    const valid = candidates.filter((file) => PHOTO_MIMES.has(file.type) && file.size > 0 && file.size <= MAX_PHOTO_BYTES);
    if (valid.length !== candidates.length) {
      toast.error('تُقبل صور JPG وPNG وWEBP وHEIC حتى 12 ميجابايت للصورة الواحدة.');
    }
    setPending((previous) => {
      const result = [...previous];
      for (const file of valid) {
        if (result.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) continue;
        if (result.length >= MAX_PHOTOS_PER_SELECTION || result.length + gallery.length >= MAX_PHOTOS_PER_BUILDING) break;
        result.push(file);
      }
      if (result.length < previous.length + valid.length) toast.info('يمكن اختيار 8 صور في كل دفعة، وبحد إجمالي 30 صورة للمبنى.');
      return result;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const uploadSelected = async () => {
    if (!buildingId || !pending.length || busy) return;
    setBusy(true);
    setCompletedCount(0);
    let uploaded = 0;
    let latestPhotos = [...gallery];

    for (const file of pending) {
      try {
        // Upload each file separately so a weak mobile connection does not duplicate successful images on retry.
        const result = await mosqueApi.uploadBuildingPhotos(buildingId, [file]);
        latestPhotos = result.photos;
        onPhotosChange?.(latestPhotos);
        uploaded += 1;
        setCompletedCount(uploaded);
      } catch (error) {
        setPending((previous) => previous.slice(uploaded));
        toast.error(error instanceof Error ? error.message : 'تعذر رفع بعض الصور. يمكن إعادة المحاولة.');
        if (onReload) await onReload().catch(() => {});
        setBusy(false);
        return;
      }
    }

    setPending([]);
    setBusy(false);
    toast.success('تم حفظ ' + uploaded + (uploaded === 1 ? ' صورة' : ' صور') + ' في معرض المبنى');
  };

  const removePhoto = async (photo: CentralBuildingPhoto) => {
    if (!buildingId || deletingId || busy || !window.confirm('هل تريد حذف هذه الصورة من سجل المبنى نهائيًا؟')) return;
    setDeletingId(photo.id);
    try {
      const result = await mosqueApi.deleteBuildingPhoto(buildingId, photo.id);
      onPhotosChange?.(result.photos);
      toast.success('تم حذف الصورة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف الصورة');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-300 bg-muted/15 p-3 sm:p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <Images className="h-5 w-5 text-primary" /> صور المبنى
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{gallery.length} صورة محفوظة</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            الصور مرتبطة بالمبنى وتُعرض للمستخدمين المصرح لهم فقط.
          </p>
        </div>
        {editable && buildingId && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef} type="file" accept={PHOTO_ACCEPT} multiple
              className="hidden" aria-label="اختيار صور من الجهاز أو معرض الهاتف"
              onChange={(event) => choosePhotos(event.currentTarget.files)}
            />
            <input
              ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              className="hidden" aria-label="التقاط صورة بالكاميرا"
              onChange={(event) => choosePhotos(event.currentTarget.files)}
            />
            <Button type="button" size="sm" variant="outline" disabled={busy || gallery.length >= MAX_PHOTOS_PER_BUILDING}
              onClick={() => fileInputRef.current?.click()}>
              <Images className="h-4 w-4" /> من الجهاز / المعرض
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || gallery.length >= MAX_PHOTOS_PER_BUILDING}
              onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" /> كاميرا الجوال
            </Button>
          </div>
        )}
      </div>

      {editable && !buildingId && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">احفظ المبنى أولًا، ثم افتح «تعديل» لإضافة صوره.</p>
      )}

      {gallery.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-xl border bg-background shadow-sm">
              {buildingId && <SecurePhotoThumbnail buildingId={buildingId} photo={photo} />}
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="min-w-0 truncate text-[11px] text-muted-foreground" title={photo.fileName}>{photo.fileName}</span>
                {editable && buildingId && (
                  <button type="button" className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                    disabled={busy || Boolean(deletingId)} title="حذف الصورة"
                    onClick={() => void removePhoto(photo)}>
                    {deletingId === photo.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed py-5 text-center text-xs text-muted-foreground">لا توجد صور مضافة لهذا المبنى حتى الآن.</p>
      )}

      {editable && buildingId && pending.length > 0 && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
          <p className="text-sm font-bold">صور قيد الإضافة ({pending.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pending.map((file, index) => (
              <div key={file.name + '-' + file.lastModified} className="overflow-hidden rounded-lg border bg-background">
                <div className="relative h-24 bg-muted/20">
                  <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />
                  <button type="button" aria-label="إزالة من الاختيار" disabled={busy}
                    className="absolute left-1 top-1 rounded-full bg-white p-1 text-red-600 shadow"
                    onClick={() => setPending((previous) => previous.filter((_, i) => i !== index))}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="truncate px-2 py-1 text-xs" title={file.name}>{file.name}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {busy ? 'تم رفع ' + completedCount + ' من ' + pending.length : 'الصور تُحفظ فور الضغط على «رفع الصور»، بشكل مستقل عن تعديل بيانات المبنى.'}
            </p>
            <Button type="button" disabled={busy} onClick={() => void uploadSelected()}
              className="bg-emerald-700 text-white hover:bg-emerald-800">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy ? 'جارٍ رفع الصور...' : 'رفع الصور (' + pending.length + ')'}
            </Button>
          </div>
        </div>
      )}
      {editable && <p className="text-[11px] text-muted-foreground">الحد الأعلى: 30 صورة للمبنى، 8 صور في كل دفعة، و12 ميجابايت للصورة الواحدة. تدعم الأجهزة والجوالات.</p>}
    </section>
  );
}
