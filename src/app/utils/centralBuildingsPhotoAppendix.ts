import { mosqueApi, type MosqueBuilding, type CentralBuildingPhoto } from '../api/mosques';

export type BuildingReportPhotoMode = 'none' | 'primary' | 'all';

// A print job containing very large galleries can exhaust browser memory.
// Never silently omit photos: ask the user to narrow the report instead.
export const MAX_PRINT_PHOTOS = 80;
const LOAD_BATCH_SIZE = 3;

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const photoSelectionForReport = (buildings: MosqueBuilding[], mode: BuildingReportPhotoMode) => {
  if (mode === 'none') return [];
  return buildings.map((building) => {
    const ordered = [...(building.photos || [])].sort((a, b) =>
      Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))
    );
    const photos = mode === 'primary' ? ordered.slice(0, 1) : ordered;
    return { building, photos };
  }).filter((entry) => entry.photos.length > 0);
};

export const buildCentralBuildingsPhotoAppendix = async (
  groups: Array<{ building: MosqueBuilding; photos: CentralBuildingPhoto[] }>,
): Promise<{ html: string; urls: string[]; imageCount: number; failedCount: number }> => {
  const urls: string[] = [];
  let failedCount = 0;
  try {
    const queue = groups.flatMap((group) =>
      group.photos.map((photo) => ({ building: group.building, photo }))
    );
    const results = new Map<string, string | null>();

    // Fetch secured images with the existing authenticated media endpoint.
    for (let start = 0; start < queue.length; start += LOAD_BATCH_SIZE) {
      const batch = queue.slice(start, start + LOAD_BATCH_SIZE);
      await Promise.all(batch.map(async ({ building, photo }) => {
        const key = `${building.id}:${photo.id}`;
        try {
          const blob = await mosqueApi.buildingPhotoBlob(building.id, photo.id);
          const image = blob.type.startsWith('image/')
            ? blob
            : new Blob([blob], { type: photo.mimeType || 'image/jpeg' });
          const src = URL.createObjectURL(image);
          urls.push(src);
          results.set(key, src);
        } catch {
          failedCount += 1;
          results.set(key, null);
        }
      }));
    }

    const sections = groups.map(({ building, photos }) => {
      const heading = building.name || building.buildingNumber || 'مبنى بدون اسم';
      const deed = building.deed?.deedNumber || (building.deedId ? 'رقم الصك غير متاح' : 'غير مرتبط بصك');
      const captions = photos.map((photo, index) => {
        const src = results.get(`${building.id}:${photo.id}`);
        const primary = photo.isPrimary ? ' — الصورة الرئيسية' : '';
        const uploader = photo.uploadedByName ? ' — أرفقها: ' + photo.uploadedByName : '';
        const date = photo.uploadedAt
          ? new Date(photo.uploadedAt).toLocaleDateString('ar-SA-u-ca-gregory', { timeZone: 'Asia/Riyadh' })
          : '';
        const dateLabel = date ? ' — ' + date : '';
        return `<figure class="building-photo-card">${src
          ? `<img loading="eager" src="${escapeHtml(src)}" alt="${escapeHtml(photo.fileName || 'صورة المبنى')}" />`
          : '<div class="image-unavailable">تعذر جلب الصورة من المخزن</div>'
        }<figcaption><b>صورة ${index + 1}</b> — ${escapeHtml(photo.fileName || 'صورة المبنى')}${escapeHtml(primary + uploader + dateLabel)}</figcaption></figure>`;
      }).join('');
      return `<section class="building-photos-group">
        <h3>${escapeHtml(heading)} <small>رقم المبنى: ${escapeHtml(building.buildingNumber || '—')}</small></h3>
        <p class="building-photo-meta">الموقع: ${escapeHtml([building.campusLocation, building.city, building.district].filter(Boolean).join(' — ') || 'غير محدد')}
        &nbsp; | &nbsp; الصك: ${escapeHtml(deed)}
        &nbsp; | &nbsp; الصور: ${photos.length}</p>
        <div class="building-photos-grid">${captions}</div>
      </section>`;
    }).join('');

    return {
      html: `<div class="photo-appendix">
        <div class="photo-appendix-head">
          <h2>ملحق التوثيق المصور للمباني</h2>
          <p>صور المباني المشمولة ضمن نتائج فرز وتصفية هذا التقرير فقط — ${groups.length} مبنى، ${queue.length} صورة</p>
        </div>
        ${sections}
      </div>`,
      urls,
      imageCount: queue.length,
      failedCount,
    };
  } catch (error) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
};

export const centralBuildingsPhotoPrintCss = `
.photo-appendix { margin-top:22px; break-before:page; page-break-before:always; }
.photo-appendix-head { border-bottom:3px solid #137b86; margin-bottom:14px; padding-bottom:10px; }
.photo-appendix-head h2 { color:#103c53; margin:0 0 4px; font-size:21px; }
.photo-appendix-head p { margin:0; font-size:11px; color:#526579; }
.building-photos-group { margin:15px 0 22px; }
.building-photos-group h3 { font-size:15px; color:#133d57; background:#ebf6f7; padding:9px 12px; margin:0; border:1px solid #d2e4e9; }
.building-photos-group h3 small { font-size:11px; font-weight:500; margin-right:9px; }
.building-photo-meta { margin:8px 0 10px; color:#526579; font-size:10px; }
.building-photos-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.building-photo-card { margin:0; padding:8px; border:1px solid #d3dfe8; border-radius:9px; background:white; break-inside:avoid; page-break-inside:avoid; }
.building-photo-card img { display:block; height:225px; width:100%; object-fit:contain; background:#f3f6f8; border-radius:6px; }
.image-unavailable { height:225px; padding:14px; display:flex; align-items:center; justify-content:center; text-align:center; color:#a43e16; background:#fff7ed; border-radius:6px; }
.building-photo-card figcaption { margin-top:6px; font-size:10px; line-height:1.65; overflow-wrap:anywhere; color:#425c70; }
@media print {
  .photo-appendix { break-before:page; page-break-before:always; }
  .building-photo-card, .building-photos-group h3 { box-shadow:none; }
}
`;
