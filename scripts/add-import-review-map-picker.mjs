import fs from 'node:fs';

const file = 'src/app/components/BuildingExcelImportManager.tsx';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('const ReviewMapClickSelector')) {
  console.log('Imported-building review map picker already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  source = source.replace(from, to);
};

replaceOnce(
  "import React, { useMemo, useRef, useState } from 'react';\nimport * as XLSX from 'xlsx';",
  "import React, { useEffect, useMemo, useRef, useState } from 'react';\nimport * as XLSX from 'xlsx';\nimport { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';\nimport 'leaflet/dist/leaflet.css';",
  'React and Leaflet imports',
);

replaceOnce(
  "  ClipboardList,\n  FileSpreadsheet,",
  "  ClipboardList,\n  Crosshair,\n  FileSpreadsheet,",
  'Crosshair icon import',
);

replaceOnce(
  "  FileSpreadsheet,\n  Pencil,",
  "  FileSpreadsheet,\n  MapPinned,\n  Pencil,",
  'MapPinned icon import',
);

replaceOnce(
  "const button3d = 'shadow-[0_4px_0_rgba(71,85,105,0.13),0_7px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.12)]';\n",
  "const button3d = 'shadow-[0_4px_0_rgba(71,85,105,0.13),0_7px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.12)]';\nconst DEFAULT_REVIEW_MAP_CENTER: [number, number] = [26.4207, 50.0888];\n\nconst parseCoordinate = (value: string): number | null => {\n  const trimmed = value.trim();\n  if (!trimmed) return null;\n  const parsed = Number(trimmed);\n  return Number.isFinite(parsed) ? parsed : null;\n};\n\nconst isValidLatitude = (value: number) => value >= -90 && value <= 90;\nconst isValidLongitude = (value: number) => value >= -180 && value <= 180;\n",
  'map coordinate helpers',
);

replaceOnce(
  "  const [reviewDraft, setReviewDraft] = useState<BuildingImportDraft | null>(null);\n  const [savingReview, setSavingReview] = useState(false);",
  "  const [reviewDraft, setReviewDraft] = useState<BuildingImportDraft | null>(null);\n  const [savingReview, setSavingReview] = useState(false);\n  const [reviewMapOpen, setReviewMapOpen] = useState(false);\n  const [locatingReview, setLocatingReview] = useState(false);",
  'review map state',
);

replaceOnce(
  "  const openReview = (item: PendingItem) => {\n    setReviewItem(item);\n    setReviewDraft({ ...item.envelope.draft });\n  };\n\n  const updateDraft = (field: keyof BuildingImportDraft, value: string) => {\n    setReviewDraft((previous) => previous ? { ...previous, [field]: value } : previous);\n  };",
  "  const openReview = (item: PendingItem) => {\n    setReviewItem(item);\n    setReviewDraft({ ...item.envelope.draft });\n    setReviewMapOpen(false);\n    setLocatingReview(false);\n  };\n\n  const updateDraft = (field: keyof BuildingImportDraft, value: string) => {\n    setReviewDraft((previous) => previous ? { ...previous, [field]: value } : previous);\n  };\n\n  const reviewMapPosition = useMemo<[number, number] | null>(() => {\n    if (!reviewDraft) return null;\n    const latitude = parseCoordinate(reviewDraft.latitude);\n    const longitude = parseCoordinate(reviewDraft.longitude);\n    if (latitude == null || longitude == null) return null;\n    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;\n    return [latitude, longitude];\n  }, [reviewDraft?.latitude, reviewDraft?.longitude]);\n\n  const selectReviewMapPosition = (latitude: number, longitude: number) => {\n    setReviewDraft((previous) => previous ? {\n      ...previous,\n      latitude: latitude.toFixed(6),\n      longitude: longitude.toFixed(6),\n    } : previous);\n  };\n\n  const useCurrentReviewLocation = () => {\n    if (!navigator.geolocation) {\n      toast.error('المتصفح لا يدعم تحديد الموقع الحالي');\n      return;\n    }\n\n    setLocatingReview(true);\n    navigator.geolocation.getCurrentPosition(\n      (position) => {\n        selectReviewMapPosition(position.coords.latitude, position.coords.longitude);\n        setReviewMapOpen(true);\n        setLocatingReview(false);\n        toast.success('تم تحديد الموقع الحالي وتعبئة الإحداثيات');\n      },\n      () => {\n        setLocatingReview(false);\n        toast.error('تعذر الحصول على الموقع الحالي. تحقق من سماح المتصفح بالوصول للموقع.');\n      },\n      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },\n    );\n  };",
  'review map handlers',
);

replaceOnce(
  "                <Field label=\"خط العرض\"><Input dir=\"ltr\" value={reviewDraft.latitude} onChange={(e) => updateDraft('latitude', e.target.value)} /></Field>\n                <Field label=\"خط الطول\"><Input dir=\"ltr\" value={reviewDraft.longitude} onChange={(e) => updateDraft('longitude', e.target.value)} /></Field>\n                <Field label=\"حالة التغطية\">",
  "                <Field label=\"خط العرض\"><Input dir=\"ltr\" inputMode=\"decimal\" value={reviewDraft.latitude} onChange={(e) => updateDraft('latitude', e.target.value)} /></Field>\n                <Field label=\"خط الطول\"><Input dir=\"ltr\" inputMode=\"decimal\" value={reviewDraft.longitude} onChange={(e) => updateDraft('longitude', e.target.value)} /></Field>\n\n                <div className=\"md:col-span-2 rounded-2xl border border-sky-200 bg-gradient-to-l from-sky-50/80 via-white to-emerald-50/60 p-3\">\n                  <div className=\"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between\">\n                    <div>\n                      <div className=\"flex items-center gap-2 font-bold text-slate-800\">\n                        <MapPinned className=\"h-4 w-4 text-sky-700\" />\n                        تحديد موقع المبنى والإحداثيات من الخريطة\n                      </div>\n                      <p className=\"mt-1 text-xs leading-5 text-slate-600\">\n                        افتح الخريطة ثم انقر على موقع المبنى، وسيتم تعبئة خط العرض وخط الطول تلقائيًا ويمكن تعديلهما يدويًا بعد ذلك.\n                      </p>\n                    </div>\n                    <div className=\"flex flex-wrap gap-2\">\n                      <Button type=\"button\" variant=\"outline\" onClick={useCurrentReviewLocation} disabled={locatingReview}>\n                        <Crosshair className={`h-4 w-4 ${locatingReview ? 'animate-pulse' : ''}`} />\n                        {locatingReview ? 'جاري التحديد...' : 'موقعي الحالي'}\n                      </Button>\n                      <Button\n                        type=\"button\"\n                        variant={reviewMapOpen ? 'secondary' : 'outline'}\n                        onClick={() => setReviewMapOpen((value) => !value)}\n                      >\n                        <MapPinned className=\"h-4 w-4\" />\n                        {reviewMapOpen ? 'إخفاء الخريطة' : 'تحديد من الخريطة'}\n                      </Button>\n                    </div>\n                  </div>\n\n                  {reviewMapOpen && (\n                    <div className=\"mt-3 overflow-hidden rounded-2xl border bg-white\">\n                      <div className=\"border-b bg-slate-50 px-3 py-2 text-xs text-slate-600\">\n                        انقر على الخريطة لتثبيت موقع المبنى بدقة. يمكنك التكبير والتحريك، وستظهر الإحداثيات المختارة مباشرة في الحقول أعلاه.\n                      </div>\n                      <MapContainer\n                        center={reviewMapPosition || DEFAULT_REVIEW_MAP_CENTER}\n                        zoom={reviewMapPosition ? 17 : 12}\n                        scrollWheelZoom\n                        className=\"h-[320px] w-full\"\n                        style={{ zIndex: 0 }}\n                      >\n                        <TileLayer\n                          attribution='&copy; OpenStreetMap contributors'\n                          url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"\n                        />\n                        <ReviewMapClickSelector onPick={selectReviewMapPosition} />\n                        <ReviewMapCenterSync position={reviewMapPosition} />\n                        {reviewMapPosition && (\n                          <CircleMarker\n                            center={reviewMapPosition}\n                            radius={9}\n                            pathOptions={{ color: '#0369a1', fillColor: '#0ea5e9', fillOpacity: 0.9, weight: 3 }}\n                          />\n                        )}\n                      </MapContainer>\n                      <div className=\"flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs\">\n                        <span className=\"text-slate-600\">\n                          {reviewMapPosition\n                            ? `الموقع المحدد: ${reviewMapPosition[0].toFixed(6)} ، ${reviewMapPosition[1].toFixed(6)}`\n                            : 'لم يتم تحديد موقع بعد'}\n                        </span>\n                        {reviewMapPosition && (\n                          <Button\n                            type=\"button\"\n                            size=\"sm\"\n                            variant=\"ghost\"\n                            onClick={() => setReviewDraft((previous) => previous ? { ...previous, latitude: '', longitude: '' } : previous)}\n                          >\n                            مسح الموقع\n                          </Button>\n                        )}\n                      </div>\n                    </div>\n                  )}\n                </div>\n\n                <Field label=\"حالة التغطية\">",
  'review map UI',
);

replaceOnce(
  "const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (\n  <div className=\"space-y-1.5\">",
  "const ReviewMapClickSelector = ({ onPick }: { onPick: (latitude: number, longitude: number) => void }) => {\n  useMapEvents({\n    click(event) {\n      onPick(event.latlng.lat, event.latlng.lng);\n    },\n  });\n  return null;\n};\n\nconst ReviewMapCenterSync = ({ position }: { position: [number, number] | null }) => {\n  const map = useMap();\n\n  useEffect(() => {\n    const timer = window.setTimeout(() => map.invalidateSize(), 120);\n    if (position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true });\n    return () => window.clearTimeout(timer);\n  }, [map, position]);\n\n  return null;\n};\n\nconst Field = ({ label, children }: { label: string; children: React.ReactNode }) => (\n  <div className=\"space-y-1.5\">",
  'map helper components',
);

fs.writeFileSync(file, source);
console.log('Added interactive location map to imported-building review dialog.');
