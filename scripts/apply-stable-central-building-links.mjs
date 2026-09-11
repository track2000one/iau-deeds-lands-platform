import fs from 'node:fs';

const replaceOnce = (source, search, replacement, label) => {
  if (!source.includes(search)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  return source.replace(search, replacement);
};

const patchFile = (path, patcher) => {
  const current = fs.readFileSync(path, 'utf8');
  const next = patcher(current);
  if (next !== current) fs.writeFileSync(path, next);
};

// Keep the legacy accounting matcher deliberately conservative: only explicit asset IDs
// and the historical D/E identity columns are eligible for automatic migration.
patchFile('src/app/utils/centralBuildingLink.ts', (source) =>
  source.replace(
    "      record.entityAssetNumber,\n      record.recordNumber,\n      record.payload?.D,",
    "      record.entityAssetNumber,\n      record.payload?.D,"
  )
);

patchFile('src/app/pages/AddAssetPage.tsx', (source) => {
  if (source.includes('const [centralBuildings, setCentralBuildings]')) return source;

  source = replaceOnce(
    source,
    "import { createAsset, extractAssetData, uploadAssetFile } from '../api/assets';\nimport type { AssetSmartExtraction, AssetSmartExtractionFields } from '../api/assets';",
    "import { createAsset, extractAssetData, uploadAssetFile } from '../api/assets';\nimport type { AssetSmartExtraction, AssetSmartExtractionFields } from '../api/assets';\nimport { mosqueApi, type MosqueBuilding } from '../api/mosques';\nimport { getAssetCentralBuildingId, withCentralBuildingId } from '../utils/centralBuildingLink';",
    'AddAsset imports'
  );

  source = replaceOnce(
    source,
    "  const [smartExtractionMessage, setSmartExtractionMessage] = useState('');\n\n  const totalAttachments = useMemo(",
    `  const [smartExtractionMessage, setSmartExtractionMessage] = useState('');\n  const [centralBuildings, setCentralBuildings] = useState<MosqueBuilding[]>([]);\n\n  useEffect(() => {\n    let active = true;\n    mosqueApi.buildings()\n      .then((items) => { if (active) setCentralBuildings(items || []); })\n      .catch(() => { if (active) setCentralBuildings([]); });\n    return () => { active = false; };\n  }, []);\n\n  const totalAttachments = useMemo(`,
    'AddAsset building state'
  );

  source = replaceOnce(
    source,
    "  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {\n    setForm((current) => ({ ...current, [key]: value }));\n  };\n",
    `  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {\n    setForm((current) => ({ ...current, [key]: value }));\n  };\n\n  const selectCentralBuilding = (buildingId: string) => {\n    if (buildingId === '__manual__') {\n      setForm((current) => ({\n        ...current,\n        excelPayload: withCentralBuildingId(current.excelPayload, null),\n      }));\n      return;\n    }\n\n    const building = centralBuildings.find((item) => item.id === buildingId);\n    if (!building) return;\n    const coordinates =\n      building.latitude != null && building.longitude != null\n        ? \`${'${building.latitude},${building.longitude}'}\`\n        : undefined;\n\n    setForm((current) => ({\n      ...current,\n      building: building.name || building.buildingNumber,\n      buildingNumber: building.buildingNumber,\n      city: building.city || current.city || '',\n      coordinates: coordinates || current.coordinates || '',\n      excelPayload: withCentralBuildingId(current.excelPayload, building.id),\n    }));\n  };\n`,
    'AddAsset selector handler'
  );

  source = replaceOnce(
    source,
    `          <div className="space-y-2">\n            <Label>المبنى</Label>\n            <div className="relative">\n              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />\n              <Input value={form.building || ''} onChange={(e) => setField('building', e.target.value)} className="pr-9" placeholder="اسم أو رقم المبنى" />\n            </div>\n          </div>`,
    `          <div className="space-y-2">\n            <Label>المبنى — السجل المركزي</Label>\n            <Select\n              value={getAssetCentralBuildingId(form) || '__manual__'}\n              onValueChange={selectCentralBuilding}\n            >\n              <SelectTrigger>\n                <SelectValue placeholder="اختر المبنى من السجل المركزي" />\n              </SelectTrigger>\n              <SelectContent>\n                <SelectItem value="__manual__">بدون ربط مركزي / إدخال يدوي</SelectItem>\n                {centralBuildings.map((building) => (\n                  <SelectItem key={building.id} value={building.id}>\n                    {building.buildingNumber} — {building.name || 'بدون مسمى'}\n                  </SelectItem>\n                ))}\n              </SelectContent>\n            </Select>\n            <div className="relative">\n              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />\n              <Input\n                value={form.building || ''}\n                onChange={(e) => setField('building', e.target.value)}\n                className="pr-9"\n                placeholder="الوصف التشغيلي للمبنى"\n              />\n            </div>\n            <p className="text-[11px] leading-5 text-muted-foreground">\n              اختيار مبنى من السجل المركزي يحفظ معرفًا ثابتًا مع الأصل، ويبقى اسم/رقم المبنى للعرض والتوافق مع السجلات السابقة.\n            </p>\n          </div>`,
    'AddAsset building field'
  );

  return source;
});

patchFile('src/app/pages/EditAssetPage.tsx', (source) => {
  if (source.includes('const [centralBuildings, setCentralBuildings]')) return source;

  source = replaceOnce(
    source,
    "import { getAsset, updateAsset, uploadAssetFile } from '../api/assets';\nimport type { AssetAttachment, AssetInput, AssetStatus } from '../../types/asset';",
    "import { getAsset, updateAsset, uploadAssetFile } from '../api/assets';\nimport { mosqueApi, type MosqueBuilding } from '../api/mosques';\nimport { getAssetCentralBuildingId, withCentralBuildingId } from '../utils/centralBuildingLink';\nimport type { AssetAttachment, AssetInput, AssetStatus } from '../../types/asset';",
    'EditAsset imports'
  );

  source = replaceOnce(
    source,
    "  const [progress, setProgress] = useState('');\n\n  useEffect(() => {",
    `  const [progress, setProgress] = useState('');\n  const [centralBuildings, setCentralBuildings] = useState<MosqueBuilding[]>([]);\n\n  useEffect(() => {\n    let active = true;\n    mosqueApi.buildings()\n      .then((items) => { if (active) setCentralBuildings(items || []); })\n      .catch(() => { if (active) setCentralBuildings([]); });\n    return () => { active = false; };\n  }, []);\n\n  useEffect(() => {`,
    'EditAsset building state'
  );

  source = replaceOnce(
    source,
    "  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => setForm((current) => ({ ...current, [key]: value }));\n\n  const handleSave = async () => {",
    `  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => setForm((current) => ({ ...current, [key]: value }));\n\n  const selectCentralBuilding = (buildingId: string) => {\n    if (buildingId === '__manual__') {\n      setForm((current) => ({ ...current, excelPayload: withCentralBuildingId(current.excelPayload, null) }));\n      return;\n    }\n    const building = centralBuildings.find((item) => item.id === buildingId);\n    if (!building) return;\n    const coordinates = building.latitude != null && building.longitude != null\n      ? \`${'${building.latitude},${building.longitude}'}\`\n      : undefined;\n    setForm((current) => ({\n      ...current,\n      building: building.name || building.buildingNumber,\n      buildingNumber: building.buildingNumber,\n      city: building.city || current.city || '',\n      coordinates: coordinates || current.coordinates || '',\n      excelPayload: withCentralBuildingId(current.excelPayload, building.id),\n    }));\n  };\n\n  const handleSave = async () => {`,
    'EditAsset selector handler'
  );

  source = replaceOnce(
    source,
    `          <div><Label>المبنى</Label><div className="relative"><Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.building || ''} onChange={(e) => setField('building', e.target.value)} /></div></div>`,
    `          <div className="space-y-2"><Label>المبنى — السجل المركزي</Label><Select value={getAssetCentralBuildingId(form) || '__manual__'} onValueChange={selectCentralBuilding}><SelectTrigger><SelectValue placeholder="اختر المبنى من السجل المركزي" /></SelectTrigger><SelectContent><SelectItem value="__manual__">بدون ربط مركزي / إدخال يدوي</SelectItem>{centralBuildings.map((building) => <SelectItem key={building.id} value={building.id}>{building.buildingNumber} — {building.name || 'بدون مسمى'}</SelectItem>)}</SelectContent></Select><div className="relative"><Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={form.building || ''} onChange={(e) => setField('building', e.target.value)} placeholder="الوصف التشغيلي للمبنى" /></div><p className="text-[11px] leading-5 text-muted-foreground">الرابط المركزي ثابت حتى عند تعديل اسم المبنى لاحقًا.</p></div>`,
    'EditAsset building field'
  );

  return source;
});

patchFile('src/app/pages/AccountingTransformationFormPage.tsx', (source) => {
  if (source.includes('const [centralBuildings, setCentralBuildings]')) return source;

  source = replaceOnce(
    source,
    "import { ArrowRight, FileText, Paperclip, Save, Upload, X } from 'lucide-react';",
    "import { ArrowRight, Building2, FileText, Paperclip, Save, Upload, X } from 'lucide-react';",
    'Accounting icon import'
  );

  source = replaceOnce(
    source,
    "} from '../api/accountingTransformation';\nimport { getOrganizationUnits } from '../api/organization';",
    "} from '../api/accountingTransformation';\nimport { mosqueApi, type MosqueBuilding } from '../api/mosques';\nimport { getCentralBuildingIdFromPayload, withCentralBuildingId } from '../utils/centralBuildingLink';\nimport { getOrganizationUnits } from '../api/organization';",
    'Accounting central imports'
  );

  source = replaceOnce(
    source,
    "  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);\n  const [linkedAssetCheck, setLinkedAssetCheck] = useState<{",
    `  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);\n  const [centralBuildings, setCentralBuildings] = useState<MosqueBuilding[]>([]);\n  const [linkedAssetCheck, setLinkedAssetCheck] = useState<{`,
    'Accounting central state'
  );

  source = replaceOnce(
    source,
    "  useEffect(() => {\n    let active = true;\n    getOrganizationUnits()",
    `  useEffect(() => {\n    let active = true;\n    mosqueApi.buildings()\n      .then((items) => { if (active) setCentralBuildings(items || []); })\n      .catch(() => { if (active) setCentralBuildings([]); });\n    return () => { active = false; };\n  }, []);\n\n  useEffect(() => {\n    let active = true;\n    getOrganizationUnits()`,
    'Accounting building lookup effect'
  );

  source = replaceOnce(
    source,
    "  const setField = (column: string, value: unknown) => setPayload((current) => ({ ...current, [column]: value }));\n  const changeType = (type: AccountingRecordType) => {",
    `  const setField = (column: string, value: unknown) => setPayload((current) => ({ ...current, [column]: value }));\n  const selectCentralBuilding = (buildingId: string) => {\n    if (!buildingId) {\n      setPayload((current) => withCentralBuildingId(current, null));\n      return;\n    }\n    const building = centralBuildings.find((item) => item.id === buildingId);\n    if (!building) return;\n    setPayload((current) => withCentralBuildingId(current, building.id));\n  };\n  const changeType = (type: AccountingRecordType) => {`,
    'Accounting selector handler'
  );

  source = replaceOnce(
    source,
    `          <Card className="rounded-[24px]"><CardHeader><CardTitle>إعداد السجل</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">\n            <div className="space-y-2"><Label>نوع السجل</Label><NativeSelect value={recordType} disabled={editing} onChange={(e) => changeType(e.target.value as AccountingRecordType)}><option value="fixed_asset">سجل الأصول الثابتة — نموذج ب</option><option value="land">Legacy — الأراضي</option><option value="building">Legacy — المباني</option></NativeSelect></div>\n            <div className="space-y-2"><Label>نوع الملكية</Label><NativeSelect value={ownershipMode} onChange={(e) => setOwnershipMode(e.target.value as AccountingOwnershipMode)}><option value="owned">مملوك</option><option value="leased">مستأجر</option><option value="other">أخرى</option></NativeSelect></div>\n            <div className="space-y-2"><Label>حالة متابعة اللجنة</Label><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value as AccountingCommitteeStatus)}>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>\n          </CardContent></Card>\n\n          {displayGroups.map(`,
    `          <Card className="rounded-[24px]"><CardHeader><CardTitle>إعداد السجل</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">\n            <div className="space-y-2"><Label>نوع السجل</Label><NativeSelect value={recordType} disabled={editing} onChange={(e) => changeType(e.target.value as AccountingRecordType)}><option value="fixed_asset">سجل الأصول الثابتة — نموذج ب</option><option value="land">Legacy — الأراضي</option><option value="building">Legacy — المباني</option></NativeSelect></div>\n            <div className="space-y-2"><Label>نوع الملكية</Label><NativeSelect value={ownershipMode} onChange={(e) => setOwnershipMode(e.target.value as AccountingOwnershipMode)}><option value="owned">مملوك</option><option value="leased">مستأجر</option><option value="other">أخرى</option></NativeSelect></div>\n            <div className="space-y-2"><Label>حالة متابعة اللجنة</Label><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value as AccountingCommitteeStatus)}>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>\n          </CardContent></Card>\n\n          {recordType === 'building' && (\n            <Card className="rounded-[24px] border-cyan-200/80 bg-cyan-50/30">\n              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-cyan-700" />الربط بالسجل المركزي للمباني</CardTitle></CardHeader>\n              <CardContent className="space-y-2">\n                <Label>المبنى المركزي</Label>\n                <NativeSelect value={getCentralBuildingIdFromPayload(payload)} onChange={(e) => selectCentralBuilding(e.target.value)}>\n                  <option value="">غير مرتبط بعد</option>\n                  {centralBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber} — {building.name || 'بدون مسمى'}</option>)}\n                </NativeSelect>\n                <p className="text-[11px] leading-5 text-slate-500">يحفظ النظام معرف المبنى الثابت داخل السجل المحاسبي؛ لذلك لا ينقطع الارتباط عند تغيير اسم المبنى أو وصفه.</p>\n              </CardContent>\n            </Card>\n          )}\n\n          {displayGroups.map(`,
    'Accounting central selector card'
  );

  return source;
});

patchFile('src/app/pages/CentralBuildingsRegistryPage.tsx', (source) => {
  if (source.includes('const migrateLegacyLinks = async ()')) return source;

  source = replaceOnce(
    source,
    "  Landmark,\n  MapPin,",
    "  Landmark,\n  Link2,\n  MapPin,",
    'Central Link2 icon'
  );
  source = replaceOnce(
    source,
    "import { getAssets } from '../api/assets';\nimport { getAccountingTransformationRecords } from '../api/accountingTransformation';\nimport type { AssetRecord } from '../../types/asset';",
    "import { getAsset, getAssets, updateAsset } from '../api/assets';\nimport { getAccountingTransformationRecords, updateAccountingTransformationRecord } from '../api/accountingTransformation';\nimport {\n  getAccountingCentralBuildingId,\n  getAssetCentralBuildingId,\n  isAccountingLinkedToCentralBuilding,\n  isAssetLinkedToCentralBuilding,\n  normalizeCentralBuildingKey,\n  resolveUniqueLegacyBuildingForAccounting,\n  resolveUniqueLegacyBuildingForAsset,\n  withCentralBuildingId,\n} from '../utils/centralBuildingLink';\nimport type { AssetInput, AssetRecord } from '../../types/asset';",
    'Central imports'
  );

  const helpersStart = source.indexOf("const normalizeKey = (value: unknown) =>");
  const helpersEnd = source.indexOf("const linkedPrayerSiteCount =", helpersStart);
  if (helpersStart < 0 || helpersEnd < 0) throw new Error('Patch anchor not found: Central legacy helpers');
  source =
    source.slice(0, helpersStart) +
    `const normalizeKey = normalizeCentralBuildingKey;\n\nconst buildingMatchesAsset = (building: MosqueBuilding, asset: AssetRecord, allBuildings: MosqueBuilding[]) =>\n  isAssetLinkedToCentralBuilding(building, asset, allBuildings);\n\nconst buildingMatchesAccounting = (building: MosqueBuilding, record: AccountingTransformationRecord, allBuildings: MosqueBuilding[]) =>\n  isAccountingLinkedToCentralBuilding(building, record, allBuildings);\n\n` +
    source.slice(helpersEnd);

  source = replaceOnce(
    source,
    "  const [saving, setSaving] = useState(false);\n  const [search, setSearch] = useState('');",
    "  const [saving, setSaving] = useState(false);\n  const [migrating, setMigrating] = useState(false);\n  const [search, setSearch] = useState('');",
    'Central migration state'
  );

  source = replaceOnce(
    source,
    "        assets: assets.filter((asset) => buildingMatchesAsset(building, asset)).length,\n        accounting: accountingRecords.filter((record) =>\n          buildingMatchesAccounting(building, record)\n        ).length,",
    "        assets: assets.filter((asset) => buildingMatchesAsset(building, asset, buildings)).length,\n        accounting: accountingRecords.filter((record) =>\n          buildingMatchesAccounting(building, record, buildings)\n        ).length,",
    'Central explicit usage counting'
  );

  source = replaceOnce(
    source,
    "  const confirmDelete = async () => {",
    `  const migrateLegacyLinks = async () => {\n    if (migrating) return;\n\n    let linkedAssets = 0;\n    let linkedAccounting = 0;\n    let skippedAssets = 0;\n    let skippedAccounting = 0;\n    let failures = 0;\n\n    try {\n      setMigrating(true);\n\n      if (canViewAssets) {\n        for (const asset of assets) {\n          if (getAssetCentralBuildingId(asset)) continue;\n          const matched = resolveUniqueLegacyBuildingForAsset(buildings, asset);\n          if (!matched) { skippedAssets += 1; continue; }\n\n          try {\n            const fullAsset = await getAsset(asset.id);\n            if (getAssetCentralBuildingId(fullAsset)) continue;\n            const confirmed = resolveUniqueLegacyBuildingForAsset(buildings, fullAsset);\n            if (!confirmed || confirmed.id !== matched.id) { skippedAssets += 1; continue; }\n\n            const editable = { ...fullAsset } as unknown as Record<string, unknown>;\n            for (const key of ['id', 'assetNumber', 'custodian', 'createdBy', 'createdAt', 'updatedAt', 'movements', 'inventoryEvents', 'lossCases']) delete editable[key];\n            const input = {\n              ...editable,\n              itemNumber: String(fullAsset.itemNumber || fullAsset.assetNumber || '').trim(),\n              name: fullAsset.name,\n              category: fullAsset.category,\n              excelPayload: withCentralBuildingId(fullAsset.excelPayload, matched.id),\n              attachments: fullAsset.attachments || [],\n            } as AssetInput;\n            if (!input.itemNumber || !input.name || !input.category) { skippedAssets += 1; continue; }\n            await updateAsset(fullAsset.id, input);\n            linkedAssets += 1;\n          } catch {\n            failures += 1;\n          }\n        }\n      }\n\n      if (canViewAccounting) {\n        for (const record of accountingRecords) {\n          if (getAccountingCentralBuildingId(record)) continue;\n          const matched = resolveUniqueLegacyBuildingForAccounting(buildings, record);\n          if (!matched) { skippedAccounting += 1; continue; }\n          try {\n            await updateAccountingTransformationRecord(record.id, {\n              recordType: record.recordType,\n              ownershipMode: record.ownershipMode,\n              committeeStatus: record.committeeStatus,\n              payload: withCentralBuildingId(record.payload, matched.id),\n              attachments: Array.isArray(record.attachments) ? record.attachments : [],\n              notes: record.notes || null,\n            });\n            linkedAccounting += 1;\n          } catch {\n            failures += 1;\n          }\n        }\n      }\n\n      toast.success(\n        \`اكتمل ربط السجلات القديمة: ${'${linkedAssets}'} أصل، ${'${linkedAccounting}'} سجل محاسبي. تم تجاوز ${'${skippedAssets + skippedAccounting}'} سجل غير واضح المطابقة.\`\n      );\n      if (failures) toast.warning(\`تعذر تحديث ${'${failures}'} سجل، ولم يتم تعديل بياناته.\`);\n      await loadData();\n    } finally {\n      setMigrating(false);\n    }\n  };\n\n  const confirmDelete = async () => {`,
    'Central migration function'
  );

  source = replaceOnce(
    source,
    `            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>\n              <RefreshCw className={\`h-4 w-4 ${'${loading ? \'animate-spin\' : \'\'}'}\`} />\n              تحديث\n            </Button>`,
    `            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>\n              <RefreshCw className={\`h-4 w-4 ${'${loading ? \'animate-spin\' : \'\'}'}\`} />\n              تحديث\n            </Button>\n            {canEdit && (canViewAssets || canViewAccounting) && (\n              <Button variant="outline" onClick={() => void migrateLegacyLinks()} disabled={migrating || loading}>\n                <Link2 className={\`h-4 w-4 ${'${migrating ? \'animate-pulse\' : \'\'}'}\`} />\n                {migrating ? 'جاري ربط السجلات...' : 'ربط السجلات القديمة'}\n              </Button>\n            )}`,
    'Central migration button'
  );

  source = replaceOnce(
    source,
    "              متطلبات التحول المحاسبي دون تكرار تعريف المبنى.\n            </p>",
    "              متطلبات التحول المحاسبي دون تكرار تعريف المبنى. الروابط الجديدة تحفظ بمعرف ثابت، ويمكن ترحيل السجلات القديمة ذات المطابقة الواضحة من زر الربط.\n            </p>",
    'Central migration explanation'
  );

  return source;
});

console.log('Stable central-building links patch applied.');
