import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Star } from 'lucide-react';
import { mosqueApi, type CentralBuildingPhoto } from '../api/mosques';

type Props = { buildingId: string; photos?: CentralBuildingPhoto[] | null };

export function CentralBuildingCover({ buildingId, photos }: Props) {
  const photo = photos?.find((item) => item.isPrimary) || photos?.[0];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!wrapperRef.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '120px' });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !photo) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    setImageUrl(null);
    mosqueApi.buildingPhotoBlob(buildingId, photo.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setImageUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, buildingId, photo?.id]);

  if (!photo) return null;
  return (
    <div ref={wrapperRef} className="relative mt-3 overflow-hidden rounded-xl border bg-slate-100">
      {imageUrl ? (
        <img src={imageUrl} alt={'الصورة الرئيسية: ' + (photo.fileName || 'المبنى')}
          loading="lazy" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center text-xs text-slate-500">
          {failed ? <><ImageOff className="ml-2 h-5 w-5" /> تعذر تحميل الصورة الرئيسية</> : 'جارٍ تحميل صورة المبنى...'}
        </div>
      )}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-800/90 px-2.5 py-1 text-xs font-bold text-white">
        <Star className="h-3.5 w-3.5" /> الصورة الرئيسية
      </span>
    </div>
  );
}
