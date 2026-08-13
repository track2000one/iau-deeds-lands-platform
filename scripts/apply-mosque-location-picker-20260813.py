from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
s = path.read_text(encoding='utf-8')

# Reuse the same coordinate picker used by deed entry.
anchor = "import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';\n"
insert = anchor + "import { MapCoordinatePicker } from '../components/MapCoordinatePicker';\n"
if "../components/MapCoordinatePicker" not in s:
    if anchor not in s:
        raise RuntimeError('MapCoordinatePicker import anchor not found')
    s = s.replace(anchor, insert, 1)

# Map visibility and geolocation loading states for the mosque site form.
anchor = "  const [siteForm, setSiteForm] = useState<any>(emptySite);\n"
insert = anchor + "  const [showSiteMap, setShowSiteMap] = useState(false);\n  const [locatingSite, setLocatingSite] = useState(false);\n"
if "const [showSiteMap, setShowSiteMap]" not in s:
    if anchor not in s:
        raise RuntimeError('siteForm state anchor not found')
    s = s.replace(anchor, insert, 1)

# Reset map when opening a create/edit dialog.
old = """  const openSiteDialog = (site?: MosqueSite) => {\n    setEditingSite(site || null);\n"""
new = """  const openSiteDialog = (site?: MosqueSite) => {\n    setEditingSite(site || null);\n    setShowSiteMap(false);\n"""
if old not in s:
    raise RuntimeError('openSiteDialog anchor not found')
s = s.replace(old, new, 1)

# Add robust coordinate handlers before saveSite.
anchor = """  const saveSite = async () => {\n"""
handlers = """  const sitePickerCoordinates = useMemo(() => {\n    const latitude = Number(siteForm.latitude);\n    const longitude = Number(siteForm.longitude);\n    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;\n    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;\n    return { latitude, longitude };\n  }, [siteForm.latitude, siteForm.longitude]);\n\n  const updateSiteCoordinates = React.useCallback((coordinates: { latitude: number; longitude: number }) => {\n    setSiteForm((current: any) => ({\n      ...current,\n      latitude: Number(coordinates.latitude.toFixed(6)),\n      longitude: Number(coordinates.longitude.toFixed(6)),\n    }));\n  }, []);\n\n  const captureCurrentSiteLocation = React.useCallback(() => {\n    if (!navigator.geolocation) {\n      toast.error('المتصفح لا يدعم تحديد الموقع الجغرافي');\n      return;\n    }\n\n    setLocatingSite(true);\n    navigator.geolocation.getCurrentPosition(\n      (position) => {\n        updateSiteCoordinates({\n          latitude: position.coords.latitude,\n          longitude: position.coords.longitude,\n        });\n        setShowSiteMap(true);\n        setLocatingSite(false);\n        toast.success('تم تحديد الموقع وتعبئة الإحداثيات');\n      },\n      (error) => {\n        setLocatingSite(false);\n        const message = error.code === error.PERMISSION_DENIED\n          ? 'يرجى السماح للمتصفح باستخدام الموقع الجغرافي ثم إعادة المحاولة'\n          : 'تعذر تحديد الموقع الحالي. تأكد من تفعيل خدمة الموقع في الجهاز';\n        toast.error(message);\n      },\n      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }\n    );\n  }, [updateSiteCoordinates]);\n\n  const saveSite = async () => {\n"""
if "const captureCurrentSiteLocation" not in s:
    if anchor not in s:
        raise RuntimeError('saveSite anchor not found')
    s = s.replace(anchor, handlers, 1)

old_geo = """              <CardContent className=\"grid grid-cols-1 gap-4 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end\">\n                <Field label=\"خط العرض\"><Input className=\"h-11\" type=\"number\" step=\"any\" inputMode=\"decimal\" value={siteForm.latitude} onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })} placeholder=\"26.3927\" /></Field>\n                <Field label=\"خط الطول\"><Input className=\"h-11\" type=\"number\" step=\"any\" inputMode=\"decimal\" value={siteForm.longitude} onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })} placeholder=\"50.0438\" /></Field>\n                <Button type=\"button\" variant=\"outline\" className={'h-11 w-full md:w-auto ' + button3d} onClick={() => navigator.geolocation?.getCurrentPosition((p) => setSiteForm({ ...siteForm, latitude: p.coords.latitude, longitude: p.coords.longitude }), () => toast.error('تعذر تحديد الموقع'))}><MapPin className=\"ml-2 h-4 w-4\" />التقاط موقعي الحالي</Button>\n              </CardContent>\n"""
new_geo = """              <CardContent className=\"space-y-4 pt-5\">\n                <div className=\"grid grid-cols-1 gap-4 md:grid-cols-2\">\n                  <Field label=\"خط العرض\"><Input className=\"h-11\" type=\"number\" step=\"any\" inputMode=\"decimal\" value={siteForm.latitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, latitude: e.target.value }))} placeholder=\"26.3927\" /></Field>\n                  <Field label=\"خط الطول\"><Input className=\"h-11\" type=\"number\" step=\"any\" inputMode=\"decimal\" value={siteForm.longitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, longitude: e.target.value }))} placeholder=\"50.0438\" /></Field>\n                </div>\n                <div className=\"flex flex-col gap-2 sm:flex-row sm:flex-wrap\">\n                  <Button type=\"button\" variant=\"outline\" className={'h-11 ' + button3d} onClick={captureCurrentSiteLocation} disabled={locatingSite}>\n                    {locatingSite ? <RefreshCw className=\"ml-2 h-4 w-4 animate-spin\" /> : <MapPin className=\"ml-2 h-4 w-4\" />}\n                    {locatingSite ? 'جاري تحديد الموقع...' : 'تحديد موقعي الحالي'}\n                  </Button>\n                  <Button type=\"button\" variant=\"outline\" className={'h-11 ' + button3d} onClick={() => setShowSiteMap((current) => !current)}>\n                    <MapPin className=\"ml-2 h-4 w-4\" />\n                    {showSiteMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}\n                  </Button>\n                  {sitePickerCoordinates && (\n                    <div className=\"flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800\" dir=\"ltr\">\n                      {sitePickerCoordinates.latitude.toFixed(6)}, {sitePickerCoordinates.longitude.toFixed(6)}\n                    </div>\n                  )}\n                </div>\n                {showSiteMap && (\n                  <div className=\"overflow-hidden rounded-2xl border border-sky-200 bg-white p-1 shadow-sm\">\n                    <MapCoordinatePicker coordinates={sitePickerCoordinates} onChange={updateSiteCoordinates} />\n                  </div>\n                )}\n              </CardContent>\n"""
if old_geo not in s:
    raise RuntimeError('geographic form block not found')
s = s.replace(old_geo, new_geo, 1)

path.write_text(s, encoding='utf-8')
