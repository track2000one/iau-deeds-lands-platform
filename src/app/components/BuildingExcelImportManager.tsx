import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { mosqueApi, type MosqueBuilding, type MosqueModuleRole } from '../api/mosques';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';

const PENDING_MARKER = '[[IAU_BUILDING_IMPORT_PENDING_V1]]';
const PENDING_END = '[[/IAU_BUILDING_IMPORT_PENDING_V1]]';

const coverageStatusLabels: Record<MosqueBuilding['coverageStatus'], string> = {
  unassessed: 'لم يتم التقييم',
  covered: 'مغطى بخدمة الصلاة',
  needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إمكانية الإنشاء',
  not_feasible_alternative: 'تعذر الإنشاء / بديل معتمد',
  under_implementation: 'مصلى تحت التنفيذ',
};

const feasibilityLabels: Record<MosqueBuilding['creationFeasibility'], string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};

export type BuildingImportDraft = {
  buildingNumber: string;
  name: string;
  campusLocation: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  expectedUsers: string;
  coverageStatus: MosqueBuilding['coverageStatus'];
  creationFeasibility: MosqueBuilding['creationFeasibility'];
  unavailableReason: string;
  approvedAlternative: string;
  notes: string;
};

export type BuildingImportEnvelope = {
  sourceFile: string;
  sheetName: string;
  rowNumber: number;
  importedAt: string;
  draft: BuildingImportDraft;
  raw: Record<string, string>;
};

type PendingItem = {
  building: MosqueBuilding;
  envelope: BuildingImportEnvelope;
};

type Props = {
  buildings: MosqueBuilding[];
  role: MosqueModuleRole;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReload: () => Promise<void> | void;
};

const button3d = 'shadow-[0_4px_0_rgba(71,85,105,0.13),0_7px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.12)]';

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\s_\-./\\()[\]{}:]+/g, '');

const text = (value: unknown) => String(value ?? '').trim();

const readCell = (row: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) return text(value);
  }
  return '';
};

const normalizeCoverageStatus = (value: string): MosqueBuilding['coverageStatus'] => {
  const normalized = normalizeHeader(value);
  if (normalized === 'covered' || normalized.includes('مغط')) return 'covered';
  if (normalized === 'needsprayerroom' || normalized.includes('يحتاج') || normalized.includes('بحاجه')) return 'needs_prayer_room';
  if (normalized === 'underimplementation' || normalized.includes('تنفيذ')) return 'under_implementation';
  if (normalized === 'notfeasiblealternative' || normalized.includes('تعذر') || normalized.includes('بديل')) return 'not_feasible_alternative';
  if (normalized === 'underfeasibilitystudy' || normalized.includes('دراس')) return 'under_feasibility_study';
  return 'unassessed';
};

const normalizeFeasibility = (value: string): MosqueBuilding['creationFeasibility'] => {
  const normalized = normalizeHeader(value);
  if (normalized === 'unavailable' || normalized.includes('غيرمتاح') || normalized.includes('تعذر')) return 'unavailable';
  if (normalized === 'available' || (normalized.includes('متاح') && !normalized.includes('غيرمتاح'))) return 'available';
  return 'under_study';
};

const rowToDraft = (row: Record<string, unknown>): BuildingImportDraft => ({
  buildingNumber: readCell(row, ['رقم المبنى', 'رقم مبنى', 'building number', 'building no', 'building_number', 'buildingnumber']),
  name: readCell(row, ['اسم المبنى', 'اسم المنشأة', 'اسم المنشاه', 'المبنى', 'building name', 'name']),
  campusLocation: readCell(row, ['الحرم', 'الموقع داخل الجامعة', 'الموقع داخل الجامعه', 'الموقع', 'campus', 'campus location', 'campus_location']),
  city: readCell(row, ['المدينة', 'المدينه', 'city']),
  district: readCell(row, ['الحي', 'district']),
  latitude: readCell(row, ['خط العرض', 'latitude', 'lat']),
  longitude: readCell(row, ['خط الطول', 'longitude', 'lng', 'lon', 'long']),
  expectedUsers: readCell(row, ['عدد المستفيدين', 'المستفيدون المتوقعون', 'عدد المستخدمين', 'expected users', 'expected_users', 'users']),
  coverageStatus: normalizeCoverageStatus(readCell(row, ['حالة التغطية', 'حاله التغطيه', 'التغطية', 'التغطيه', 'coverage status', 'coverage_status'])),
  creationFeasibility: normalizeFeasibility(readCell(row, ['إمكانية إنشاء مصلى', 'امكانية انشاء مصلى', 'امكانيه انشاء مصلى', 'feasibility', 'creation feasibility', 'creation_feasibility'])),
  unavailableReason: readCell(row, ['سبب عدم الإمكانية', 'سبب عدم الامكانية', 'سبب تعذر الإنشاء', 'سبب تعذر الانشاء', 'unavailable reason', 'unavailable_reason']),
  approvedAlternative: readCell(row, ['البديل المعتمد', 'approved alternative', 'approved_alternative']),
  notes: readCell(row, ['ملاحظات', 'الملاحظات', 'notes']),
});

const serializeEnvelope = (envelope: BuildingImportEnvelope) =>
  `${PENDING_MARKER}\n${JSON.stringify(envelope)}\n${PENDING_END}`;

export const getPendingBuildingImport = (building?: MosqueBuilding | null): BuildingImportEnvelope | null => {
  const notes = String(building?.notes || '');
  const start = notes.indexOf(PENDING_MARKER);
  const end = notes.indexOf(PENDING_END);
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(notes.slice(start + PENDING_MARKER.length, end).trim()) as BuildingImportEnvelope;
    if (!parsed?.draft || !parsed?.sourceFile) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const isPendingImportedBuilding = (building?: MosqueBuilding | null) => Boolean(getPendingBuildingImport(building));

const reviewNotes = (draft: BuildingImportDraft) => {
  const notes: string[] = [];
  if (!draft.buildingNumber) notes.push('رقم المبنى غير مدخل');
  if (!draft.name) notes.push('اسم المبنى غير مدخل');
  if (!draft.campusLocation) notes.push('الموقع داخل الجامعة غير مدخل');
  if (!draft.city) notes.push('المدينة غير مدخلة');
  if (!draft.district) notes.push('الحي غير مدخل');
  if (draft.creationFeasibility === 'unavailable' && !draft.unavailableReason) notes.push('سبب تعذر إنشاء المصلى غير مدخل');

  const hasLat = draft.latitude !== '';
  const hasLng = draft.longitude !== '';
  if (hasLat !== hasLng) notes.push('الإحداثيات غير مكتملة');
  if (hasLat && (!Number.isFinite(Number(draft.latitude)) || Number(draft.latitude) < -90 || Number(draft.latitude) > 90)) notes.push('خط العرض يحتاج مراجعة');
  if (hasLng && (!Number.isFinite(Number(draft.longitude)) || Number(draft.longitude) < -180 || Number(draft.longitude) > 180)) notes.push('خط الطول يحتاج مراجعة');
  if (draft.expectedUsers && (!Number.isFinite(Number(draft.expectedUsers)) || Number(draft.expectedUsers) < 0)) notes.push('عدد المستفيدين يحتاج مراجعة');
  return notes;
};

const approvalBlockers = (draft: BuildingImportDraft) => {
  const blockers: string[] = [];
  if (!draft.buildingNumber) blockers.push('رقم المبنى');
  if (draft.creationFeasibility === 'unavailable' && !draft.unavailableReason) blockers.push('سبب تعذر إنشاء المصلى');

  const hasLat = draft.latitude !== '';
  const hasLng = draft.longitude !== '';
  if (hasLat !== hasLng) blockers.push('استكمال خط العرض وخط الطول معًا');
  if (hasLat && (!Number.isFinite(Number(draft.latitude)) || Number(draft.latitude) < -90 || Number(draft.latitude) > 90)) blockers.push('خط العرض الصحيح');
  if (hasLng && (!Number.isFinite(Number(draft.longitude)) || Number(draft.longitude) < -180 || Number(draft.longitude) > 180)) blockers.push('خط الطول الصحيح');
  if (draft.expectedUsers && (!Number.isFinite(Number(draft.expectedUsers)) || Number(draft.expectedUsers) < 0)) blockers.push('عدد المستفيدين الصحيح');
  return blockers;
};

const finalPayload = (draft: BuildingImportDraft) => ({
  buildingNumber: draft.buildingNumber.trim(),
  name: draft.name.trim() || null,
  campusLocation: draft.campusLocation.trim() || null,
  city: draft.city.trim() || null,
  district: draft.district.trim() || null,
  latitude: draft.latitude === '' ? null : Number(draft.latitude),
  longitude: draft.longitude === '' ? null : Number(draft.longitude),
  expectedUsers: draft.expectedUsers === '' ? null : Number(draft.expectedUsers),
  coverageStatus: draft.coverageStatus,
  creationFeasibility: draft.creationFeasibility,
  unavailableReason: draft.creationFeasibility === 'unavailable' ? (draft.unavailableReason.trim() || null) : null,
  approvedAlternative: draft.approvedAlternative.trim() || null,
  notes: draft.notes.trim() || null,
});

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

export const BuildingExcelImportManager: React.FC<Props> = ({ buildings, role, canAdd, canEdit, canDelete, onReload }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<BuildingImportEnvelope[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [reviewItem, setReviewItem] = useState<PendingItem | null>(null);
  const [reviewDraft, setReviewDraft] = useState<BuildingImportDraft | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  const pendingItems = useMemo<PendingItem[]>(
    () => buildings.flatMap((building) => {
      const envelope = getPendingBuildingImport(building);
      return envelope ? [{ building, envelope }] : [];
    }),
    [buildings],
  );

  const officialBuildings = useMemo(() => buildings.filter((building) => !isPendingImportedBuilding(building)), [buildings]);

  const openReview = (item: PendingItem) => {
    setReviewItem(item);
    setReviewDraft({ ...item.envelope.draft });
  };

  const updateDraft = (field: keyof BuildingImportDraft, value: string) => {
    setReviewDraft((previous) => previous ? { ...previous, [field]: value } : previous);
  };

  const handleExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const importedAt = new Date().toISOString();
      const rows: BuildingImportEnvelope[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
          defval: '',
          raw: false,
        });

        sheetRows.forEach((rawRow, index) => {
          const raw = Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [key, text(value)]));
          rows.push({
            sourceFile: file.name,
            sheetName,
            rowNumber: index + 2,
            importedAt,
            draft: rowToDraft(rawRow),
            raw,
          });
        });
      });

      if (!rows.length) {
        toast.error('لم يتم العثور على صفوف بيانات داخل ملف Excel');
        return;
      }

      setFileName(file.name);
      setImportRows(rows);
      setImportDialogOpen(true);
    } catch (error) {
      console.error('Building Excel read error:', error);
      toast.error('تعذر قراءة ملف Excel. تأكد من أن الملف بصيغة XLSX أو XLS.');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'رقم المبنى',
      'اسم المبنى',
      'الموقع داخل الجامعة',
      'المدينة',
      'الحي',
      'خط العرض',
      'خط الطول',
      'عدد المستفيدين',
      'حالة التغطية',
      'إمكانية إنشاء مصلى',
      'سبب تعذر الإنشاء',
      'البديل المعتمد',
      'ملاحظات',
    ];
    const example = ['A101', 'كلية مثال', 'الحرم الشرقي', 'الدمام', '', '26.392700', '50.043800', '250', 'يحتاج مصلى', 'قيد الدراسة', '', '', ''];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, header.length + 5) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تغطية المباني');
    XLSX.writeFile(workbook, 'قالب-استيراد-تغطية-المباني.xlsx');
  };

  const savePendingRows = async () => {
    if (!importRows.length) return;
    setImporting(true);
    const failed: BuildingImportEnvelope[] = [];
    let importedCount = 0;
    const session = Date.now().toString(36).toUpperCase();

    for (let index = 0; index < importRows.length; index += 1) {
      const envelope = importRows[index];
      try {
        await mosqueApi.createBuilding({
          buildingNumber: `IMP-${session}-${index + 1}`,
          name: envelope.draft.name || 'سجل مستورد بانتظار المراجعة',
          campusLocation: envelope.draft.campusLocation || null,
          city: envelope.draft.city || null,
          district: envelope.draft.district || null,
          coverageStatus: 'unassessed',
          creationFeasibility: 'under_study',
          notes: serializeEnvelope(envelope),
        });
        importedCount += 1;
      } catch (error) {
        console.error('Pending building import save error:', error);
        failed.push(envelope);
      }
    }

    setImporting(false);
    if (importedCount) await onReload();

    if (!failed.length) {
      setImportDialogOpen(false);
      setImportRows([]);
      toast.success(`تم استيراد ${importedCount} سجلًا وحفظها جميعًا بحالة «معلق للمراجعة» دون رفض الصفوف الناقصة.`);
    } else {
      setImportRows(failed);
      toast.error(`تم حفظ ${importedCount} سجلًا، وتعذر حفظ ${failed.length} سجل تقنيًا. بقيت الصفوف غير المحفوظة لإعادة المحاولة.`);
    }
  };

  const saveCorrections = async () => {
    if (!reviewItem || !reviewDraft) return;
    setSavingReview(true);
    try {
      const envelope: BuildingImportEnvelope = { ...reviewItem.envelope, draft: { ...reviewDraft } };
      await mosqueApi.updateBuilding(reviewItem.building.id, {
        name: reviewDraft.name || 'سجل مستورد بانتظار المراجعة',
        campusLocation: reviewDraft.campusLocation || null,
        city: reviewDraft.city || null,
        district: reviewDraft.district || null,
        notes: serializeEnvelope(envelope),
      });
      toast.success('تم حفظ التصحيحات وسيبقى السجل معلقًا حتى الاعتماد.');
      setReviewItem(null);
      setReviewDraft(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ التصحيحات');
    } finally {
      setSavingReview(false);
    }
  };

  const approveReview = async () => {
    if (!reviewItem || !reviewDraft) return;
    const blockers = approvalBlockers(reviewDraft);
    if (blockers.length) {
      toast.error(`لا يمكن الاعتماد قبل استكمال: ${blockers.join('، ')}`);
      return;
    }

    const duplicate = officialBuildings.find(
      (item) => String(item.buildingNumber || '').trim().toLowerCase() === reviewDraft.buildingNumber.trim().toLowerCase(),
    );
    if (duplicate) {
      toast.error(`رقم المبنى ${reviewDraft.buildingNumber} مستخدم في سجل معتمد. صحح الرقم قبل الاعتماد.`);
      return;
    }

    if (!window.confirm(`اعتماد السجل للمبنى ${reviewDraft.buildingNumber} ونقله إلى سجل المباني الرسمي؟`)) return;

    setSavingReview(true);
    try {
      await mosqueApi.updateBuilding(reviewItem.building.id, finalPayload(reviewDraft));
      toast.success('تم اعتماد السجل ونقله إلى سجل تغطية المباني الرسمي.');
      setReviewItem(null);
      setReviewDraft(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر اعتماد السجل');
    } finally {
      setSavingReview(false);
    }
  };

  const deletePending = async (item: PendingItem) => {
    if (!window.confirm('حذف هذا السجل المعلق نهائيًا؟')) return;
    try {
      await mosqueApi.deleteBuilding(item.building.id);
      toast.success('تم حذف السجل المعلق');
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف السجل المعلق');
    }
  };

  return (
    <div className="space-y-4">
      {role === 'head' && canAdd && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50/80 via-white to-sky-50/70 p-3">
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
          <Button type="button" variant="outline" className={button3d} onClick={downloadTemplate}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            تحميل قالب Excel
          </Button>
          <Button type="button" className={button3d} onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            استيراد Excel
          </Button>
          <div className="mr-auto text-xs text-slate-600">
            جميع الصفوف المستوردة تحفظ أولًا <b>كمعلقة للمراجعة</b> ولا تعتمد تلقائيًا.
          </div>
        </div>
      )}

      {pendingItems.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-b from-amber-50/90 to-white shadow-[0_6px_0_rgba(180,83,9,0.10),0_13px_26px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <ClipboardList className="h-5 w-5" />
                  سجلات مستوردة بانتظار المراجعة والاعتماد
                </CardTitle>
                <CardDescription className="mt-1">
                  النقص أو عدم تطابق البيانات لا يرفض السجل. يبقى معلقًا، ويقوم المسؤول بتصحيحه ثم اعتماده.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                {pendingItems.length} معلق
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {pendingItems.map((item) => {
                const notes = reviewNotes(item.envelope.draft);
                return (
                  <div key={item.building.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800">{item.envelope.draft.name || 'اسم المبنى غير مدخل'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          رقم المبنى: <b>{item.envelope.draft.buildingNumber || 'غير مدخل'}</b>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-100 text-amber-800">
                        معلق — غير معتمد
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                      المصدر: <b>{item.envelope.sourceFile}</b> · الورقة: <b>{item.envelope.sheetName}</b> · الصف: <b>{item.envelope.rowNumber}</b>
                    </div>

                    <div className="mt-3 text-xs">
                      {notes.length ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-900">
                          <AlertTriangle className="ml-1 inline h-4 w-4" />
                          <b>ملاحظات للمراجعة ({notes.length}):</b> {notes.slice(0, 4).join('، ')}{notes.length > 4 ? '…' : ''}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                          <CheckCircle2 className="ml-1 inline h-4 w-4" />
                          البيانات المقروءة لا تحتوي ملاحظات ظاهرة، وما زالت تحتاج مراجعة واعتماد المسؤول.
                        </div>
                      )}
                    </div>

                    {role === 'head' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canEdit && (
                          <Button size="sm" variant="outline" className={button3d} onClick={() => openReview(item)}>
                            <Pencil className="ml-1 h-4 w-4" />
                            مراجعة وتصحيح
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => deletePending(item)}>
                            <Trash2 className="ml-1 h-4 w-4" />
                            حذف المسودة
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={importDialogOpen} onOpenChange={(open) => !importing && setImportDialogOpen(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
              استيراد بيانات تغطية المباني من Excel
            </DialogTitle>
            <DialogDescription>
              ستُحفظ جميع الصفوف بحالة «معلق للمراجعة» حتى لو كانت ناقصة أو تحتاج تصحيحًا، ولن تدخل ضمن المباني الرسمية قبل اعتماد المسؤول.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <b>المسار:</b> استيراد الملف ← حفظ الصفوف كمعلقة ← مراجعة وتصحيح المسؤول ← اعتماد ← انتقال إلى سجل المباني الرسمي.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-slate-50 p-3 text-sm">
            <span>الملف: <b>{fileName}</b></span>
            <Badge variant="outline">إجمالي الصفوف: {importRows.length}</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[850px] text-right text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">رقم المبنى</th>
                  <th className="p-2">اسم المبنى</th>
                  <th className="p-2">الموقع</th>
                  <th className="p-2">المدينة</th>
                  <th className="p-2">ملاحظات القراءة</th>
                  <th className="p-2">الحالة بعد الاستيراد</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 30).map((row, index) => {
                  const notes = reviewNotes(row.draft);
                  return (
                    <tr key={`${row.sheetName}-${row.rowNumber}-${index}`} className="border-t">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-medium">{row.draft.buildingNumber || '—'}</td>
                      <td className="p-2">{row.draft.name || '—'}</td>
                      <td className="p-2">{row.draft.campusLocation || '—'}</td>
                      <td className="p-2">{row.draft.city || '—'}</td>
                      <td className="p-2">
                        {notes.length ? <span className="text-amber-700">{notes.length} ملاحظة للمراجعة</span> : <span className="text-emerald-700">لا توجد ملاحظات ظاهرة</span>}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">معلق للمراجعة</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {importRows.length > 30 && (
            <p className="text-xs text-slate-500">تظهر أول 30 صفًا للمعاينة فقط، وسيتم استيراد جميع الصفوف وعددها {importRows.length}.</p>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={importing} onClick={() => setImportDialogOpen(false)}>إلغاء</Button>
            <Button className={button3d} disabled={importing || !importRows.length} onClick={savePendingRows}>
              {importing ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
              {importing ? 'جاري حفظ السجلات المعلقة...' : `استيراد وإرسال للمراجعة (${importRows.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewItem && reviewDraft)} onOpenChange={(open) => !savingReview && !open && (setReviewItem(null), setReviewDraft(null))}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>مراجعة وتصحيح سجل مستورد</DialogTitle>
            <DialogDescription>
              يمكن حفظ التصحيحات مع بقاء السجل معلقًا، أو اعتماده بعد التحقق من البيانات.
            </DialogDescription>
          </DialogHeader>

          {reviewItem && reviewDraft && (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="font-bold text-amber-900">السجل معلق وغير معتمد</div>
                <div className="mt-1 text-xs text-amber-800">
                  المصدر: {reviewItem.envelope.sourceFile} · الورقة: {reviewItem.envelope.sheetName} · الصف: {reviewItem.envelope.rowNumber}
                </div>
                <details className="mt-2 rounded-xl border border-amber-200 bg-white p-2">
                  <summary className="cursor-pointer font-medium">عرض بيانات الصف الأصلية من Excel</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {Object.entries(reviewItem.envelope.raw || {}).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-50 p-2 text-xs"><b>{key}:</b> {value || '—'}</div>
                    ))}
                  </div>
                </details>
              </div>

              <div className="grid gap-4 py-2 md:grid-cols-2">
                <Field label="رقم المبنى"><Input value={reviewDraft.buildingNumber} onChange={(e) => updateDraft('buildingNumber', e.target.value)} /></Field>
                <Field label="اسم المبنى"><Input value={reviewDraft.name} onChange={(e) => updateDraft('name', e.target.value)} /></Field>
                <Field label="الموقع داخل الجامعة"><Input value={reviewDraft.campusLocation} onChange={(e) => updateDraft('campusLocation', e.target.value)} /></Field>
                <Field label="المدينة"><Input value={reviewDraft.city} onChange={(e) => updateDraft('city', e.target.value)} /></Field>
                <Field label="الحي"><Input value={reviewDraft.district} onChange={(e) => updateDraft('district', e.target.value)} /></Field>
                <Field label="عدد المستفيدين المتوقع"><Input inputMode="numeric" value={reviewDraft.expectedUsers} onChange={(e) => updateDraft('expectedUsers', e.target.value)} /></Field>
                <Field label="خط العرض"><Input dir="ltr" value={reviewDraft.latitude} onChange={(e) => updateDraft('latitude', e.target.value)} /></Field>
                <Field label="خط الطول"><Input dir="ltr" value={reviewDraft.longitude} onChange={(e) => updateDraft('longitude', e.target.value)} /></Field>
                <Field label="حالة التغطية">
                  <NativeSelect value={reviewDraft.coverageStatus} onChange={(e) => updateDraft('coverageStatus', e.target.value)}>
                    {Object.entries(coverageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="إمكانية إنشاء مصلى">
                  <NativeSelect value={reviewDraft.creationFeasibility} onChange={(e) => updateDraft('creationFeasibility', e.target.value)}>
                    {Object.entries(feasibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </NativeSelect>
                </Field>
                {reviewDraft.creationFeasibility === 'unavailable' && (
                  <Field label="سبب تعذر إنشاء المصلى"><Textarea rows={3} value={reviewDraft.unavailableReason} onChange={(e) => updateDraft('unavailableReason', e.target.value)} /></Field>
                )}
                <Field label="البديل المعتمد"><Textarea rows={3} value={reviewDraft.approvedAlternative} onChange={(e) => updateDraft('approvedAlternative', e.target.value)} /></Field>
                <div className="md:col-span-2"><Field label="ملاحظات"><Textarea rows={3} value={reviewDraft.notes} onChange={(e) => updateDraft('notes', e.target.value)} /></Field></div>
              </div>

              {reviewNotes(reviewDraft).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <b>ملاحظات للمراجعة:</b> {reviewNotes(reviewDraft).join('، ')}
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={savingReview} onClick={() => { setReviewItem(null); setReviewDraft(null); }}>إلغاء</Button>
            <Button variant="outline" className={button3d} disabled={savingReview} onClick={saveCorrections}>
              {savingReview ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
              حفظ التصحيحات — يبقى معلقًا
            </Button>
            <Button className={button3d} disabled={savingReview} onClick={approveReview}>
              <CheckCircle2 className="ml-2 h-4 w-4" />
              اعتماد ونقل للسجل الرسمي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
