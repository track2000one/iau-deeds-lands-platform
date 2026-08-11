const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value);
const mustReplace = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing replacement anchor: ${label}`);
  return source.replace(from, to);
};

// 1) Shared professional 3D record-card language.
{
  const path = 'src/app/components/ThemeInitializer.tsx';
  let source = read(path);
  const marker = '/* ===== Platform record cards 3D ===== */';
  if (!source.includes(marker)) {
    const anchor = '    /*\n     * Dark-theme compatibility layer';
    if (!source.includes(anchor)) throw new Error('ThemeInitializer record-card anchor missing');
    const css = String.raw`
    /* ===== Platform record cards 3D ===== */
    .platform-record-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
    }

    @media (min-width: 768px) {
      .platform-record-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (min-width: 1280px) {
      .platform-record-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card {
      position: relative;
      isolation: isolate;
      height: 100%;
      overflow: hidden;
      border: 1px solid rgba(30, 67, 102, .66) !important;
      border-radius: 19px !important;
      background: linear-gradient(145deg, #ffffff 0%, #fbfdff 50%, #f2f7fb 100%) !important;
      box-shadow:
        0 6px 0 rgba(30, 67, 102, .14),
        0 15px 28px rgba(15, 42, 70, .12),
        inset 0 2px 0 rgba(255, 255, 255, 1),
        inset 0 -2px 6px rgba(38, 76, 112, .055) !important;
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card::before {
      content: '';
      position: absolute;
      z-index: 2;
      inset-inline: 8px;
      top: 0;
      height: 4px;
      border-radius: 0 0 999px 999px;
      background: linear-gradient(90deg, #355872 0%, #5e92b8 45%, #9cd5ff 100%);
      box-shadow: 0 2px 5px rgba(41, 89, 128, .22);
      pointer-events: none;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card:hover {
      transform: translateY(-3px);
      border-color: rgba(35, 92, 139, .82) !important;
      box-shadow:
        0 9px 0 rgba(30, 67, 102, .15),
        0 22px 38px rgba(15, 42, 70, .16),
        inset 0 2px 0 rgba(255, 255, 255, 1),
        inset 0 -2px 7px rgba(38, 76, 112, .06) !important;
    }

    .platform-record-card[data-slot="card"] {
      display: flex;
      flex-direction: column;
    }

    .platform-record-card[data-slot="card"] > [data-slot="card-content"] {
      flex: 1 1 auto;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-metric {
      border: 1px solid rgba(91, 119, 145, .24) !important;
      border-radius: 13px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(239,246,251,.84)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,1),
        0 3px 0 rgba(44,79,111,.07),
        0 7px 12px rgba(15,42,70,.055) !important;
    }

    .platform-record-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(94px, 1fr));
      gap: 8px;
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid rgba(66, 96, 124, .11);
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"] {
      min-height: 40px;
      border: 1px solid rgba(38, 75, 111, .72) !important;
      border-radius: 10px !important;
      color: #17395f;
      background: linear-gradient(180deg, #ffffff 0%, #f7fbfe 58%, #e8f1f7 100%) !important;
      box-shadow:
        0 4px 0 rgba(38, 75, 111, .19),
        0 8px 12px rgba(15, 42, 70, .10),
        inset 0 1px 0 rgba(255,255,255,1) !important;
      filter: none !important;
      transform: translateY(0);
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"]:hover {
      transform: translateY(-1px);
      background: linear-gradient(180deg, #ffffff 0%, #eff8fd 58%, #dcecf6 100%) !important;
      box-shadow:
        0 5px 0 rgba(38, 75, 111, .20),
        0 10px 15px rgba(15, 42, 70, .12),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"]:active {
      transform: translateY(3px) !important;
      box-shadow:
        0 1px 0 rgba(38, 75, 111, .16),
        0 3px 5px rgba(15, 42, 70, .08),
        inset 0 1px 2px rgba(22,55,86,.06) !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions .platform-record-danger {
      border-color: rgba(239, 68, 68, .66) !important;
      color: #dc2626 !important;
      background: linear-gradient(180deg, #fffefe 0%, #fff5f5 58%, #ffe8e8 100%) !important;
      box-shadow:
        0 4px 0 rgba(220, 38, 38, .17),
        0 8px 12px rgba(185, 28, 28, .08),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    html[data-appearance-mode="dark"] .platform-record-card {
      border-color: rgba(125, 165, 201, .48) !important;
      background: linear-gradient(145deg, rgba(15,31,49,.98), rgba(20,42,64,.98)) !important;
      box-shadow: 0 6px 0 rgba(4,12,22,.55), 0 18px 34px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.07) !important;
    }

`;
    source = source.replace(anchor, css + anchor);
    write(path, source);
  }
}

// 2) All deeds already uses cards; promote them to the approved 3D language.
{
  const path = 'src/app/pages/AllDeedsPage.tsx';
  let source = read(path);
  source = source.replace(
    'className="rounded-[24px] border border-slate-300/80 bg-white/90 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md sm:p-5"',
    'className="platform-record-card flex h-full flex-col p-4 sm:p-5"'
  );
  source = source.replace('className="mt-4 rounded-2xl border bg-slate-50/65 p-3"', 'className="platform-record-metric mt-4 p-3"');
  source = source.replace('className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3"', 'className="platform-record-actions mt-5"');
  source = source.replace('className="h-10 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"', 'className="platform-record-danger h-10"');
  write(path, source);
}

// 3) Existing mobile cards in allocated/delivered lands become the canonical desktop/tablet/mobile display.
for (const config of [
  { path: 'src/app/pages/AllocatedLandsPage.tsx', key: 'land', permission: 'allocated_lands' },
  { path: 'src/app/pages/DeliveredLandsPage.tsx', key: 'land', permission: 'delivered_lands' },
]) {
  let source = read(config.path);
  source = source.replace('<Card className="hidden md:block">', '<Card className="hidden">');
  source = source.replace('<div className="space-y-3 md:hidden">', '<div className="platform-record-grid">');
  source = source.replace(
    `<Card key={${config.key}.id} className="w-full overflow-hidden">`,
    `<Card key={${config.key}.id} className="platform-record-card w-full overflow-hidden">`
  );
  source = source.replace('className="mobile-actions-grid"', 'className="platform-record-actions"');
  source = source.replace('className="text-destructive"', 'className="platform-record-danger text-destructive"');
  write(config.path, source);
}

// 4) Field inspection cards use the exact same 3D system.
{
  const path = 'src/app/pages/SiteInspectionsPage.tsx';
  let source = read(path);
  source = source.replace('className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"', 'className="platform-record-grid"');
  source = source.replace('<Card key={item.id} className="overflow-hidden">', '<Card key={item.id} className="platform-record-card overflow-hidden">');
  source = source.replace('className="grid grid-cols-2 gap-2 border-t pt-3"', 'className="platform-record-actions mt-auto"');
  source = source.replace('<Button variant="destructive" onClick={() => remove(item)}>', '<Button variant="destructive" className="platform-record-danger" onClick={() => remove(item)}>');
  write(path, source);
}

const replaceListCard = (path, titleNeedle, replacement) => {
  let source = read(path);
  const titleIndex = source.indexOf(titleNeedle);
  if (titleIndex < 0) throw new Error(`List title not found in ${path}: ${titleNeedle}`);
  const start = source.lastIndexOf('      <Card>', titleIndex);
  const end = source.indexOf('\n\n      {formOpen && (', titleIndex);
  if (start < 0 || end < 0 || end <= start) throw new Error(`List block boundaries not found in ${path}`);
  source = source.slice(0, start) + replacement + source.slice(end);
  write(path, source);
};

const landCards = ({ partyPath, partyFallback, label, permission }) => `      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <BarChart3 className="h-5 w-5" />
            بطاقات العرض
          </h2>
          <Badge variant="secondary">{filteredRecords.length} سجل</Badge>
        </div>

        {filteredRecords.length === 0 ? (
          <Card className="platform-record-card">
            <CardContent className="flex min-h-56 flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="mb-3 h-12 w-12 opacity-30" />
              لا توجد سجلات مطابقة للبحث.
            </CardContent>
          </Card>
        ) : (
          <div className="platform-record-grid">
            {filteredRecords.map((record: any) => (
              <Card key={record.id} className="platform-record-card overflow-hidden">
                <CardContent className="flex h-full flex-col space-y-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-muted-foreground">رقم العقد: {record.contractNumber || '-'}</p>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-800">{${partyPath} || '${partyFallback}'}</h3>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-sky-300 bg-sky-50 text-sky-700">${label}</Badge>
                  </div>

                  <div className="platform-record-metric grid grid-cols-2 gap-x-4 gap-y-3 p-3 text-sm">
                    <InfoItem label="القطعة" value={record.plotNumber || '-'} />
                    <InfoItem label="المخطط" value={record.planNumber || '-'} />
                    <InfoItem label="المساحة" value={\`${'${Number(record.area || 0).toLocaleString()}'} م²\`} />
                    <InfoItem label="بداية العقد" value={formatDate(record.contractStartDate, record.contractStartDateType || 'gregorian')} />
                    <InfoItem label="الإيجار" value={record.rentAmount ? \`${'${Number(record.rentAmount).toLocaleString()}'} ريال\` : '-'} />
                    <InfoItem label="المرفقات" value={getRecordAttachments(record).length} />
                  </div>

                  <div className="platform-record-actions">
                    <Button variant="outline" onClick={() => openDetails(record)}><Eye className="ml-2 h-4 w-4" />عرض</Button>
                    {hasPermission('${permission}', 'canEdit') && (
                      <Button variant="outline" onClick={() => openEditForm(record)}><Edit className="ml-2 h-4 w-4" />تعديل</Button>
                    )}
                    {record.coordinates && (
                      <Button variant="outline" onClick={() => openMap(record)}><MapPin className="ml-2 h-4 w-4" />الخريطة</Button>
                    )}
                    {hasPermission('${permission}', 'canDelete') && (
                      <Button variant="outline" className="platform-record-danger" onClick={() => requestDelete(record)}><Trash2 className="ml-2 h-4 w-4" />حذف</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>`;

const buildingCards = ({ partyPath, partyFallback, label, permission }) => `      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <BarChart3 className="h-5 w-5" />
            بطاقات العرض
          </h2>
          <Badge variant="secondary">{filteredRecords.length} سجل</Badge>
        </div>

        {filteredRecords.length === 0 ? (
          <Card className="platform-record-card">
            <CardContent className="flex min-h-56 flex-col items-center justify-center text-center text-muted-foreground">
              <Building2 className="mb-3 h-12 w-12 opacity-30" />
              لا توجد سجلات مطابقة للبحث.
            </CardContent>
          </Card>
        ) : (
          <div className="platform-record-grid">
            {filteredRecords.map((record: any) => (
              <Card key={record.id} className="platform-record-card overflow-hidden">
                <CardContent className="flex h-full flex-col space-y-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-muted-foreground">رقم العقد: {record.contractNumber || '-'}</p>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-800">{record.locationName || record.buildingNumber || ${partyPath} || '${partyFallback}'}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">${label}: {${partyPath} || '-'}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-sky-300 bg-sky-50 text-sky-700">${label}</Badge>
                  </div>

                  <div className="platform-record-metric grid grid-cols-2 gap-x-4 gap-y-3 p-3 text-sm">
                    <InfoItem label="رقم المبنى" value={record.buildingNumber || '-'} />
                    <InfoItem label="المدينة" value={record.city || '-'} />
                    <InfoItem label="المساحة" value={\`${'${Number(record.area || 0).toLocaleString()}'} م²\`} />
                    <InfoItem label="الإيجار" value={record.rentAmount ? \`${'${Number(record.rentAmount).toLocaleString()}'} ريال\` : '-'} />
                    <InfoItem label="الموقع" value={record.locationName || '-'} />
                    <InfoItem label="المرفقات" value={getRecordAttachments(record).length} />
                  </div>

                  <div className="platform-record-actions">
                    <Button variant="outline" onClick={() => openDetails(record)}><Eye className="ml-2 h-4 w-4" />عرض</Button>
                    {hasPermission('${permission}', 'canEdit') && (
                      <Button variant="outline" onClick={() => openEditForm(record)}><Edit className="ml-2 h-4 w-4" />تعديل</Button>
                    )}
                    {record.coordinates && (
                      <Button variant="outline" onClick={() => openMap(record)}><MapPin className="ml-2 h-4 w-4" />الخريطة</Button>
                    )}
                    {hasPermission('${permission}', 'canDelete') && (
                      <Button variant="outline" className="platform-record-danger" onClick={() => requestDelete(record)}><Trash2 className="ml-2 h-4 w-4" />حذف</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>`;

replaceListCard(
  'src/app/pages/LeasedLandsOutPage.tsx',
  'قائمة الأراضي المؤجرة ({filteredRecords.length})',
  landCards({ partyPath: 'record.tenant?.name', partyFallback: 'أرض مؤجرة', label: 'مؤجرة', permission: 'leased_lands_out' })
);
replaceListCard(
  'src/app/pages/LeasedLandsInPage.tsx',
  'قائمة الأراضي المؤجرة ({filteredRecords.length})',
  landCards({ partyPath: 'record.owner?.name', partyFallback: 'أرض مستأجرة', label: 'مستأجرة', permission: 'leased_lands_in' })
);
replaceListCard(
  'src/app/pages/LeasedBuildingsOutPage.tsx',
  'قائمة السجلات ({filteredRecords.length})',
  buildingCards({ partyPath: 'record.tenant?.name', partyFallback: 'مبنى مؤجر', label: 'المستأجر', permission: 'leased_buildings_out' })
);
replaceListCard(
  'src/app/pages/LeasedBuildingsInPage.tsx',
  'قائمة السجلات ({filteredRecords.length})',
  buildingCards({ partyPath: 'record.owner?.name', partyFallback: 'مبنى مستأجر', label: 'المالك', permission: 'leased_buildings_in' })
);

console.log('Applied professional 3D record cards across primary platform list pages.');
