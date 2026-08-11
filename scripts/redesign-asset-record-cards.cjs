const fs = require('fs');

const path = 'src/app/pages/AssetsPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const startMarker = 'const AssetCard: React.FC<{';
const endMarker = 'export const AssetsPage: React.FC = () => {';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('AssetCard block markers were not found');
}

const replacement = `const getAssetStatusTone = (status: AssetRecord['status']) => {
  const key = String(status || '').toLowerCase();
  if (key === 'available') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (key === 'in_use' || key === 'inuse') return 'border-sky-300 bg-sky-50 text-sky-800';
  if (key === 'maintenance') return 'border-amber-300 bg-amber-50 text-amber-800';
  if (key === 'lost') return 'border-red-300 bg-red-50 text-red-700';
  if (key === 'disposed' || key === 'excluded') return 'border-slate-300 bg-slate-50 text-slate-700';
  return 'border-slate-300 bg-white text-slate-700';
};

const AssetCard: React.FC<{
  asset: CompactAsset;
  canEdit: boolean;
  canDelete: boolean;
  deletingId: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ asset, canEdit, canDelete, deletingId, onView, onEdit, onDelete }) => {
  const statusLabel = ASSET_STATUS_LABELS[asset.status] || asset.status || 'غير محدد';
  const department = asset.responsibleDepartment || asset.department || asset.entityName || '-';
  const location = [asset.building, asset.floor, asset.room].filter(Boolean).join(' / ') || '-';

  return (
    <article className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-[18px] border-[1.5px] border-[#17395f]/90 bg-white shadow-[0_8px_22px_rgba(15,42,70,0.08),0_2px_5px_rgba(15,42,70,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f3158] hover:shadow-[0_14px_30px_rgba(15,42,70,0.13),0_4px_9px_rgba(15,42,70,0.06)]">
      <div className="h-1 w-full bg-gradient-to-l from-[#17395f] via-[#7aaace] to-[#d9b66f] opacity-90" />

      <div className="flex flex-1 flex-col p-4 md:p-[18px]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-[11px] font-medium text-slate-500">
              رقم الصنف: <span dir="ltr" className="font-semibold text-slate-600">{asset.itemNumber || asset.assetNumber || '-'}</span>
            </p>
            <h3 className="mt-1.5 line-clamp-2 min-h-[48px] text-[17px] font-black leading-6 text-[#17395f] md:text-[18px]">
              {asset.name || 'أصل بدون اسم'}
            </h3>
          </div>

          <span className={\`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-sm \${getAssetStatusTone(asset.status)}\`}>
            {statusLabel}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-right">
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">التصنيف</dt>
            <dd className="mt-0.5 truncate text-[13px] font-bold text-slate-700">{CATEGORY_LABELS[asset.category] || asset.category || '-'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">رقم البطاقة</dt>
            <dd dir="ltr" className="mt-0.5 truncate text-right text-[13px] font-semibold text-slate-700">{asset.cardNumber || '-'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">الباركود</dt>
            <dd dir="ltr" className="mt-0.5 truncate text-right text-[12px] font-semibold text-[#254d73]" title={asset.barcode || '-'}>{asset.barcode || '-'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">الحالة الفنية</dt>
            <dd className="mt-0.5 truncate text-[13px] font-bold text-slate-700">{asset.technicalCondition || '-'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">الجهة / الإدارة</dt>
            <dd className="mt-0.5 line-clamp-2 min-h-[38px] text-[13px] font-bold leading-[19px] text-slate-700" title={department}>{department}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">الموقع</dt>
            <dd className="mt-0.5 line-clamp-2 min-h-[38px] text-[13px] font-semibold leading-[19px] text-slate-700" title={location}>{location}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">الكمية</dt>
            <dd className="mt-0.5 text-[13px] font-black text-[#17395f]">{Number(asset.quantity ?? 1).toLocaleString('ar-SA')}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-400">المرفقات</dt>
            <dd className="mt-0.5 text-[13px] font-black text-[#17395f]">{Number(asset.attachmentsCount ?? 0).toLocaleString('ar-SA')}</dd>
          </div>
        </dl>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="h-9 rounded-lg border-[#17395f] bg-white font-bold text-[#17395f] shadow-[0_1px_2px_rgba(15,42,70,0.05)] hover:bg-[#f4f8fc] hover:text-[#102f52]"
          >
            <Eye className="ml-1.5 h-3.5 w-3.5" />
            عرض
          </Button>

          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-9 rounded-lg border-[#557896] bg-white font-bold text-[#244967] shadow-[0_1px_2px_rgba(15,42,70,0.05)] hover:bg-[#f2f7fb] hover:text-[#17395f]"
            >
              <Pencil className="ml-1.5 h-3.5 w-3.5" />
              تعديل
            </Button>
          ) : <span />}

          {canDelete ? (
            <Button
              variant="outline"
              size="sm"
              disabled={deletingId === asset.id}
              onClick={onDelete}
              className="h-9 rounded-lg border-red-400 bg-red-50/70 font-bold text-red-600 shadow-[0_1px_2px_rgba(185,28,28,0.04)] hover:border-red-500 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="ml-1.5 h-3.5 w-3.5" />
              {deletingId === asset.id ? '...' : 'حذف'}
            </Button>
          ) : <span />}
        </div>
      </div>
    </article>
  );
};

`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, source);
console.log('Redesigned AssetCard in AssetsPage.tsx');
