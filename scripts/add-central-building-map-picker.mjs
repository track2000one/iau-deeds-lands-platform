import fs from 'node:fs';

const file = 'src/app/pages/CentralBuildingsRegistryPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    if (source.includes(to)) {
      console.log(`Already applied: ${label}`);
      return;
    }
    throw new Error(`Patch target not found: ${label}`);
  }
  source = source.replace(from, to);
  console.log(`Applied: ${label}`);
};

replaceOnce(
  "import { useNavigate } from 'react-router';\n",
  "import { useNavigate } from 'react-router';\nimport { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';\nimport 'leaflet/dist/leaflet.css';\n",
  'leaflet imports'
);

replaceOnce(
  "  Database,\n  Landmark,\n  Link2,\n  MapPin,\n",
  "  Crosshair,\n  Database,\n  Landmark,\n  Link2,\n  MapPin,\n  MapPinned,\n",
  'map icons'
);

replaceOnce(
  "const GROUP_BATCH_SIZE = 12;\n",
  `const GROUP_BATCH_SIZE = 12;\nconst DEFAULT_MAP_CENTER: [number, number] = [26.4207, 50.0888];\n\nconst parseCoordinate = (value: string): number | null => {\n  const trimmed = value.trim();\n  if (!trimmed) return null;\n  const parsed = Number(trimmed);\n  return Number.isFinite(parsed) ? parsed : null;\n};\n\nconst isValidLatitude = (value: number) => value >= -90 && value <= 90;\nconst isValidLongitude = (value: number) => value >= -180 && value <= 180;\n`,
  'map constants'
);

replaceOnce(
  "  const [formOpen, setFormOpen] = useState(false);\n",
  "  const [formOpen, setFormOpen] = useState(false);\n  const [mapPickerOpen, setMapPickerOpen] = useState(false);\n  const [locating, setLocating] = useState(false);\n",
  'map picker state'
);

replaceOnce(
  `  const openCreate = () => {\n    setEditingBuilding(null);\n    setForm(EMPTY_FORM);\n    setFormOpen(true);\n  };\n`,
  `  const openCreate = () => {\n    setEditingBuilding(null);\n    setForm(EMPTY_FORM);\n    setMapPickerOpen(false);\n    setFormOpen(true);\n  };\n`,
  'reset map on create'
);

replaceOnce(
  `    });\n    setFormOpen(true);\n  };\n\n  const saveBuilding = async () => {\n`,
  `    });\n    setMapPickerOpen(false);\n    setFormOpen(true);\n  };\n\n  const mapPosition = useMemo<[number, number] | null>(() => {\n    const latitude = parseCoordinate(form.latitude);\n    const longitude = parseCoordinate(form.longitude);\n    if (latitude == null || longitude == null) return null;\n    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;\n    return [latitude, longitude];\n  }, [form.latitude, form.longitude]);\n\n  const selectMapPosition = (latitude: number, longitude: number) => {\n    setForm((prev) => ({\n      ...prev,\n      latitude: latitude.toFixed(6),\n      longitude: longitude.toFixed(6),\n    }));\n  };\n\n  const useCurrentLocation = () => {\n    if (!navigator.geolocation) {\n      toast.error('المتصفح لا يدعم تحديد الموقع الحالي');\n      return;\n    }\n\n    setLocating(true);\n    navigator.geolocation.getCurrentPosition(\n      (position) => {\n        selectMapPosition(position.coords.latitude, position.coords.longitude);\n        setMapPickerOpen(true);\n        setLocating(false);\n        toast.success('تم تحديد موقعك الحالي على الخريطة');\n      },\n      () => {\n        setLocating(false);\n        toast.error('تعذر الحصول على الموقع الحالي. تحقق من سماح المتصفح بالوصول للموقع.');\n      },\n      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }\n    );\n  };\n\n  const saveBuilding = async () => {\n`,
  'map position helpers'
);

replaceOnce(
  `    if (!buildingNumber || !name) {\n      toast.error('رقم المبنى واسم المبنى حقول مطلوبة');\n      return;\n    }\n\n    const duplicate = buildings.find(\n`,
  `    if (!buildingNumber || !name) {\n      toast.error('رقم المبنى واسم المبنى حقول مطلوبة');\n      return;\n    }\n\n    const latitude = parseCoordinate(form.latitude);\n    const longitude = parseCoordinate(form.longitude);\n    if (form.latitude.trim() && (latitude == null || !isValidLatitude(latitude))) {\n      toast.error('خط العرض غير صحيح. يجب أن يكون بين -90 و 90.');\n      return;\n    }\n    if (form.longitude.trim() && (longitude == null || !isValidLongitude(longitude))) {\n      toast.error('خط الطول غير صحيح. يجب أن يكون بين -180 و 180.');\n      return;\n    }\n\n    const duplicate = buildings.find(\n`,
  'coordinate validation'
);

replaceOnce(
  `      latitude: safeNumber(form.latitude),\n      longitude: safeNumber(form.longitude),\n`,
  `      latitude,\n      longitude,\n`,
  'validated coordinates payload'
);

replaceOnce(
  `            <Field label="خط الطول">\n              <Input\n                dir="ltr"\n                inputMode="decimal"\n                value={form.longitude}\n                onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}\n              />\n            </Field>\n          </div>\n\n          <DialogFooter className="gap-2 sm:justify-start">\n`,
  `            <Field label="خط الطول">\n              <Input\n                dir="ltr"\n                inputMode="decimal"\n                value={form.longitude}\n                onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}\n              />\n            </Field>\n\n            <div className="md:col-span-2 rounded-2xl border bg-muted/20 p-3">\n              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n                <div>\n                  <div className="flex items-center gap-2 font-black">\n                    <MapPinned className="h-4 w-4 text-primary" />\n                    تحديد موقع المبنى من الخريطة\n                  </div>\n                  <p className="mt-1 text-xs leading-5 text-muted-foreground">\n                    افتح الخريطة ثم انقر على موقع المبنى؛ يتم تعبئة خط العرض وخط الطول تلقائيًا.\n                  </p>\n                </div>\n                <div className="flex flex-wrap gap-2">\n                  <Button\n                    type="button"\n                    variant="outline"\n                    onClick={useCurrentLocation}\n                    disabled={locating}\n                  >\n                    <Crosshair className={\`h-4 w-4 \${locating ? 'animate-pulse' : ''}\`} />\n                    {locating ? 'جاري التحديد...' : 'موقعي الحالي'}\n                  </Button>\n                  <Button\n                    type="button"\n                    variant={mapPickerOpen ? 'secondary' : 'outline'}\n                    onClick={() => setMapPickerOpen((value) => !value)}\n                  >\n                    <MapPinned className="h-4 w-4" />\n                    {mapPickerOpen ? 'إخفاء الخريطة' : 'تحديد من الخريطة'}\n                  </Button>\n                </div>\n              </div>\n\n              {mapPickerOpen && (\n                <div className="mt-3 overflow-hidden rounded-2xl border bg-background">\n                  <div className="border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">\n                    انقر على الخريطة لتثبيت موقع المبنى. يمكنك التكبير والتحريك للوصول إلى الموقع بدقة.\n                  </div>\n                  <MapContainer\n                    center={mapPosition || DEFAULT_MAP_CENTER}\n                    zoom={mapPosition ? 17 : 12}\n                    scrollWheelZoom\n                    className="h-[340px] w-full"\n                    style={{ zIndex: 0 }}\n                  >\n                    <TileLayer\n                      attribution='&copy; OpenStreetMap contributors'\n                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"\n                    />\n                    <MapClickSelector onPick={selectMapPosition} />\n                    <MapCenterSync position={mapPosition} />\n                    {mapPosition && (\n                      <CircleMarker\n                        center={mapPosition}\n                        radius={9}\n                        pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9, weight: 3 }}\n                      />\n                    )}\n                  </MapContainer>\n                  <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">\n                    <span className="text-muted-foreground">\n                      {mapPosition\n                        ? \`الموقع المحدد: \${mapPosition[0].toFixed(6)} ، \${mapPosition[1].toFixed(6)}\`\n                        : 'لم يتم تحديد موقع بعد'}\n                    </span>\n                    {mapPosition && (\n                      <Button\n                        type="button"\n                        size="sm"\n                        variant="ghost"\n                        onClick={() => setForm((prev) => ({ ...prev, latitude: '', longitude: '' }))}\n                      >\n                        مسح الموقع\n                      </Button>\n                    )}\n                  </div>\n                </div>\n              )}\n            </div>\n          </div>\n\n          <DialogFooter className="gap-2 sm:justify-start">\n`,
  'map picker UI'
);

replaceOnce(
  `const StatCard = ({\n`,
  `const MapClickSelector = ({ onPick }: { onPick: (latitude: number, longitude: number) => void }) => {\n  useMapEvents({\n    click(event) {\n      onPick(event.latlng.lat, event.latlng.lng);\n    },\n  });\n  return null;\n};\n\nconst MapCenterSync = ({ position }: { position: [number, number] | null }) => {\n  const map = useMap();\n  useEffect(() => {\n    if (position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true });\n  }, [map, position]);\n  return null;\n};\n\nconst StatCard = ({\n`,
  'map helper components'
);

fs.writeFileSync(file, source);
console.log('Central building map picker patch completed.');
