import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  source = source.replace(before, after);
};

replaceOnce(
  "  const [siteFilterType, setSiteFilterType] = useState('all');\n  const [siteFilterStatus, setSiteFilterStatus] = useState('all');",
  "  const [siteFilterType, setSiteFilterType] = useState('all');\n  const [siteFilterPrayerRoomGender, setSiteFilterPrayerRoomGender] = useState<'all' | 'men' | 'women'>('all');\n  const [siteFilterStatus, setSiteFilterStatus] = useState('all');",
  'filter state',
);

replaceOnce(
  "    if (siteFilterCity) result = result.filter((site) => site.city === siteFilterCity);\n    if (siteFilterType !== 'all') result = result.filter((site) => site.siteType === siteFilterType);\n    if (siteFilterStatus !== 'all') result = result.filter((site) => site.status === siteFilterStatus);",
  "    if (siteFilterCity) result = result.filter((site) => site.city === siteFilterCity);\n    if (siteFilterType !== 'all') result = result.filter((site) => site.siteType === siteFilterType);\n    if (siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all') {\n      result = result.filter((site) => site.prayerRoomGender === siteFilterPrayerRoomGender);\n    }\n    if (siteFilterStatus !== 'all') result = result.filter((site) => site.status === siteFilterStatus);",
  'filter logic',
);

replaceOnce(
  "  }, [sites, search, role, linkedSiteId, siteFilterCity, siteFilterType, siteFilterStatus, siteSortBy, siteSortDirection]);",
  "  }, [sites, search, role, linkedSiteId, siteFilterCity, siteFilterType, siteFilterPrayerRoomGender, siteFilterStatus, siteSortBy, siteSortDirection]);",
  'filter dependencies',
);

replaceOnce(
  "    setSiteFilterCity('');\n    setSiteFilterType('all');\n    setSiteFilterStatus('all');",
  "    setSiteFilterCity('');\n    setSiteFilterType('all');\n    setSiteFilterPrayerRoomGender('all');\n    setSiteFilterStatus('all');",
  'filter reset',
);

replaceOnce(
  "      siteFilterCity ? `المدينة: ${siteFilterCity}` : null,\n      siteFilterType !== 'all' ? `النوع: ${siteTypeLabels[siteFilterType] || siteFilterType}` : null,\n      siteFilterStatus !== 'all' ? `الحالة: ${siteStatusLabels[siteFilterStatus] || siteFilterStatus}` : null,",
  "      siteFilterCity ? `المدينة: ${siteFilterCity}` : null,\n      siteFilterType !== 'all' ? `النوع: ${siteTypeLabels[siteFilterType] || siteFilterType}` : null,\n      siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all'\n        ? `فئة المصلى: ${prayerRoomGenderLabels[siteFilterPrayerRoomGender] || siteFilterPrayerRoomGender}`\n        : null,\n      siteFilterStatus !== 'all' ? `الحالة: ${siteStatusLabels[siteFilterStatus] || siteFilterStatus}` : null,",
  'print filter note',
);

replaceOnce(
  '              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">',
  '              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">',
  'filter grid',
);

replaceOnce(
  "                <NativeSelect className=\"h-11 rounded-xl\" value={siteFilterType} onChange={(e) => setSiteFilterType(e.target.value)}><option value=\"all\">جميع الأنواع</option><option value=\"mosque\">مسجد</option><option value=\"jami\">جامع</option><option value=\"prayer_room\">مصلى</option></NativeSelect>\n                <NativeSelect className=\"h-11 rounded-xl\" value={siteFilterStatus}",
  "                <NativeSelect className=\"h-11 rounded-xl\" value={siteFilterType} onChange={(e) => { const nextType = e.target.value; setSiteFilterType(nextType); if (nextType !== 'prayer_room') setSiteFilterPrayerRoomGender('all'); }}><option value=\"all\">جميع الأنواع</option><option value=\"mosque\">مسجد</option><option value=\"jami\">جامع</option><option value=\"prayer_room\">مصلى</option></NativeSelect>\n                {siteFilterType === 'prayer_room' && <NativeSelect className=\"h-11 rounded-xl border-emerald-200 bg-emerald-50/40\" value={siteFilterPrayerRoomGender} onChange={(e) => setSiteFilterPrayerRoomGender(e.target.value as 'all' | 'men' | 'women')}><option value=\"all\">كل المصليات</option><option value=\"men\">مصلى رجال</option><option value=\"women\">مصلى نساء</option></NativeSelect>}\n                <NativeSelect className=\"h-11 rounded-xl\" value={siteFilterStatus}",
  'filter controls',
);

replaceOnce(
  "              {(search || siteFilterCity || siteFilterType !== 'all' || siteFilterStatus !== 'all' || siteSortBy !== 'name' || siteSortDirection !== 'asc') && <div className=\"flex flex-wrap items-center gap-2 text-xs\">",
  "              {(search || siteFilterCity || siteFilterType !== 'all' || siteFilterPrayerRoomGender !== 'all' || siteFilterStatus !== 'all' || siteSortBy !== 'name' || siteSortDirection !== 'asc') && <div className=\"flex flex-wrap items-center gap-2 text-xs\">",
  'criteria visibility',
);

replaceOnce(
  "                {siteFilterType !== 'all' && <Badge variant=\"outline\">النوع: {siteTypeLabels[siteFilterType]}</Badge>}\n                {siteFilterStatus !== 'all' && <Badge variant=\"outline\">الحالة: {siteStatusLabels[siteFilterStatus]}</Badge>}",
  "                {siteFilterType !== 'all' && <Badge variant=\"outline\">النوع: {siteTypeLabels[siteFilterType]}</Badge>}\n                {siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all' && <Badge variant=\"outline\" className=\"border-emerald-200 bg-emerald-50 text-emerald-800\">فئة المصلى: {prayerRoomGenderLabels[siteFilterPrayerRoomGender]}</Badge>}\n                {siteFilterStatus !== 'all' && <Badge variant=\"outline\">الحالة: {siteStatusLabels[siteFilterStatus]}</Badge>}",
  'criteria badge',
);

fs.writeFileSync(file, source);
console.log('Added conditional men/women prayer-room filtering to mosque site list and print output.');
