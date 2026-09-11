import fs from 'node:fs';

const path = 'src/app/pages/CentralBuildingsRegistryPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceBetween = (startMarker, endMarker, replacement) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
};

source = source.replace(
  "  Boxes,\n  Building2,\n  Database,",
  "  Boxes,\n  Building2,\n  ChevronDown,\n  ChevronUp,\n  Database,"
);

source = source.replace(
  "const linkedPrayerSiteCount = (building: MosqueBuilding) =>\n  building._count?.sites ?? building.sites?.length ?? 0;\n",
  "const linkedPrayerSiteCount = (building: MosqueBuilding) =>\n  building._count?.sites ?? building.sites?.length ?? 0;\n\nconst GROUP_BATCH_SIZE = 12;\n"
);

source = source.replace(
  "  const [loading, setLoading] = useState(true);\n  const [saving, setSaving] = useState(false);",
  "  const [loading, setLoading] = useState(true);\n  const [usageLoading, setUsageLoading] = useState(true);\n  const [saving, setSaving] = useState(false);"
);

source = source.replace(
  "  const [deleteTarget, setDeleteTarget] = useState<MosqueBuilding | null>(null);",
  "  const [deleteTarget, setDeleteTarget] = useState<MosqueBuilding | null>(null);\n  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());\n  const [visibleGroupCounts, setVisibleGroupCounts] = useState<Record<string, number>>({});"
);

replaceBetween(
  "  const loadData = async () => {",
  "  useEffect(() => {\n    if (canView) void loadData();",
`  const loadData = async () => {
    const shouldShowFullLoader = buildings.length === 0;
    if (shouldShowFullLoader) setLoading(true);
    setUsageLoading(true);

    let buildingLoadSucceeded = false;
    try {
      const buildingResult = await mosqueApi.buildings();
      setBuildings(buildingResult || []);
      buildingLoadSucceeded = true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل السجل المركزي للمباني'
      );
    } finally {
      setLoading(false);
    }

    if (!buildingLoadSucceeded) {
      setUsageLoading(false);
      return;
    }

    try {
      const [assetResult, accountingResult] = await Promise.allSettled([
        canViewAssets ? getAssets() : Promise.resolve([] as AssetRecord[]),
        canViewAccounting
          ? getAccountingTransformationRecords({
              recordType: 'building',
              all: true,
              limit: 5000,
            })
          : Promise.resolve({ items: [] as AccountingTransformationRecord[] }),
      ]);

      setAssets(assetResult.status === 'fulfilled' ? assetResult.value || [] : []);
      setAccountingRecords(
        accountingResult.status === 'fulfilled'
          ? accountingResult.value.items || []
          : []
      );
    } finally {
      setUsageLoading(false);
    }
  };

`
);

replaceBetween(
  "  const usage = useMemo(() => {",
  "  const filteredBuildings = useMemo(() => {",
`  const usage = useMemo(() => {
    const output = new Map<
      string,
      { mosqueSites: number; mosqueProfile: boolean; assets: number; accounting: number }
    >();
    const assetCounts = new Map<string, number>();
    const accountingCounts = new Map<string, number>();

    assets.forEach((asset) => {
      const explicitId = getAssetCentralBuildingId(asset);
      const matchedId = explicitId || resolveUniqueLegacyBuildingForAsset(buildings, asset)?.id || '';
      if (matchedId) assetCounts.set(matchedId, (assetCounts.get(matchedId) || 0) + 1);
    });

    accountingRecords.forEach((record) => {
      const explicitId = getAccountingCentralBuildingId(record);
      const matchedId = explicitId || resolveUniqueLegacyBuildingForAccounting(buildings, record)?.id || '';
      if (matchedId) accountingCounts.set(matchedId, (accountingCounts.get(matchedId) || 0) + 1);
    });

    buildings.forEach((building) => {
      const mosqueSites = linkedPrayerSiteCount(building);
      output.set(building.id, {
        mosqueSites,
        mosqueProfile:
          mosqueSites > 0 ||
          building.coverageStatus !== 'unassessed' ||
          building.expectedUsers != null,
        assets: assetCounts.get(building.id) || 0,
        accounting: accountingCounts.get(building.id) || 0,
      });
    });

    return output;
  }, [accountingRecords, assets, buildings]);

`
);

source = source.replace(
  "  }, [buildings, search]);\n\n  const totals = useMemo(() => {",
`  }, [buildings, search]);

  const buildingGroups = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; title: string; subtitle: string; buildings: MosqueBuilding[] }
    >();

    filteredBuildings.forEach((building) => {
      const campus = String(building.campusLocation || '').trim();
      const city = String(building.city || '').trim();
      const district = String(building.district || '').trim();
      const title = campus || district || city || 'موقع غير محدد';
      const subtitleParts = [city, district].filter(
        (value, index, values) => value && value !== title && values.indexOf(value) === index
      );
      const subtitle = subtitleParts.join(' — ') || 'لم تحدد بيانات الموقع التفصيلية';
      const key = normalizeKey([campus || '__no_campus__', city || '__no_city__'].join('|')) || 'unassigned';
      const current = groups.get(key) || { key, title, subtitle, buildings: [] };
      current.buildings.push(building);
      groups.set(key, current);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        buildings: group.buildings.sort((a, b) =>
          String(a.buildingNumber || '').localeCompare(String(b.buildingNumber || ''), 'ar', { numeric: true })
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  }, [filteredBuildings]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showMoreInGroup = (key: string) => {
    setVisibleGroupCounts((current) => ({
      ...current,
      [key]: (current[key] || GROUP_BATCH_SIZE) + GROUP_BATCH_SIZE,
    }));
  };

  const totals = useMemo(() => {`
);

source = source.replace(
  "        <StatCard icon={Landmark} label=\"العناية بالمساجد\" value={totals.mosque} />\n        <StatCard icon={Boxes} label=\"وحدة الأصول\" value={totals.asset} />\n        <StatCard icon={ShieldCheck} label=\"التحول المحاسبي\" value={totals.accounting} />",
  "        <StatCard icon={Landmark} label=\"العناية بالمساجد\" value={usageLoading ? '…' : totals.mosque} />\n        <StatCard icon={Boxes} label=\"وحدة الأصول\" value={usageLoading ? '…' : totals.asset} />\n        <StatCard icon={ShieldCheck} label=\"التحول المحاسبي\" value={usageLoading ? '…' : totals.accounting} />"
);

source = source.replace(
  "            <CardDescription>\n              البحث بالرقم أو الاسم أو الحرم أو المدينة أو الحي.\n            </CardDescription>",
  "            <CardDescription>\n              المباني مجمعة حسب الحرم / الموقع الجامعي، ولا يتم إنشاء بطاقات المجموعة إلا عند فتحها. البحث يفتح النتائج المطابقة مباشرة.\n            </CardDescription>"
);

replaceBetween(
  "        <CardContent>\n          {loading ? (",
  "        </CardContent>\n      </Card>\n\n      <Dialog open={formOpen}",
`        <CardContent>
          {usageLoading && !loading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200/70 bg-sky-50/60 px-3 py-2 text-xs font-semibold text-sky-800">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ظهرت بيانات المباني، وجارٍ تحميل مؤشرات الأصول والتحول المحاسبي في الخلفية دون تعطيل الصفحة.
            </div>
          )}
          {loading ? (
            <div className="py-14 text-center text-muted-foreground">
              جارٍ تحميل السجل المركزي...
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              لا توجد مبانٍ مطابقة للبحث.
            </div>
          ) : (
            <div className="space-y-3">
              {buildingGroups.map((group) => {
                const searchActive = Boolean(search.trim());
                const expanded = searchActive || expandedGroups.has(group.key);
                const visibleCount = searchActive
                  ? group.buildings.length
                  : visibleGroupCounts[group.key] || GROUP_BATCH_SIZE;
                const visibleBuildings = group.buildings.slice(0, visibleCount);

                return (
                  <section key={group.key} className="overflow-hidden rounded-2xl border bg-background/45 shadow-sm">
                    <button
                      type="button"
                      onClick={() => !searchActive && toggleGroup(group.key)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-foreground">{group.title}</span>
                          <Badge variant="secondary">{group.buildings.length} مبنى</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{group.subtitle}</p>
                      </div>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-background/70">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t p-4">
                        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                          {visibleBuildings.map((building) => {
                            const item = usage.get(building.id);
                            const references =
                              (item?.mosqueSites || 0) +
                              (item?.assets || 0) +
                              (item?.accounting || 0);
                            return (
                              <article
                                key={building.id}
                                className="rounded-2xl border bg-background/60 p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">مبنى {building.buildingNumber}</Badge>
                                      <Badge variant="secondary">سجل مركزي</Badge>
                                    </div>
                                    <h3 className="mt-3 truncate text-lg font-black">
                                      {building.name || 'بدون مسمى'}
                                    </h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      {[building.campusLocation, building.city, building.district]
                                        .filter(Boolean)
                                        .join(' — ') || 'الموقع غير مكتمل'}
                                    </p>
                                  </div>

                                  <div className="flex gap-1">
                                    {canEdit && (
                                      <Button size="icon" variant="outline" onClick={() => openEdit(building)} title="تعديل البيانات الأساسية">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={references > 0}
                                        onClick={() => setDeleteTarget(building)}
                                        title={references > 0 ? 'المبنى مرتبط بسجلات ولا يمكن حذفه' : 'حذف المبنى'}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                  <UsageBox
                                    label="العناية"
                                    value={item?.mosqueProfile ? Math.max(item.mosqueSites, 1) : 0}
                                    hint={item?.mosqueProfile ? coverageLabels[building.coverageStatus] || 'مرتبط' : 'غير مستخدم'}
                                  />
                                  <UsageBox label="الأصول" value={item?.assets || 0} hint={usageLoading ? 'جاري التحقق...' : 'أصل مرتبط'} />
                                  <UsageBox label="المحاسبي" value={item?.accounting || 0} hint={usageLoading ? 'جاري التحقق...' : 'سجل مرتبط'} />
                                </div>

                                {(building.latitude != null || building.longitude != null) && (
                                  <div className="mt-3 rounded-xl border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                                    الإحداثيات: {building.latitude ?? '—'} ، {building.longitude ?? '—'}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>

                        {!searchActive && visibleCount < group.buildings.length && (
                          <div className="mt-4 flex justify-center">
                            <Button variant="outline" onClick={() => showMoreInGroup(group.key)}>
                              عرض المزيد — متبقي {group.buildings.length - visibleCount} مبنى
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
`
);

source = source.replace(
  "  value: number;\n}) => (",
  "  value: React.ReactNode;\n}) => ("
);

fs.writeFileSync(path, source);
console.log('Optimized central buildings loading and grouped rendering.');
