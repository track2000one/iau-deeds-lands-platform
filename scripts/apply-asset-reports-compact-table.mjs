import fs from 'node:fs';

const filePath = 'src/app/pages/AssetReportsPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const reportAssetAnchor = "type ReportAsset = AssetRecord & { attachmentsCount?: number };\n\n";
if (!source.includes(reportAssetAnchor)) {
  throw new Error('Could not locate ReportAsset anchor in AssetReportsPage.tsx');
}

if (!source.includes('const SCREEN_COLUMN_WEIGHTS')) {
  source = source.replace(
    reportAssetAnchor,
    `${reportAssetAnchor}const SCREEN_COLUMN_WEIGHTS: Record<FieldKey, number> = {\n  itemNumber: 8,\n  barcode: 10,\n  name: 15,\n  category: 8,\n  brand: 7,\n  model: 7,\n  serialNumber: 10,\n  status: 7,\n  department: 15,\n  building: 7,\n  floor: 5,\n  room: 9,\n  cardNumber: 8,\n  purchaseDate: 8,\n  purchaseValue: 9,\n  attachments: 6,\n};\n\n`,
  );
}

const returnAnchor = '  return (\n    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">';
if (!source.includes(returnAnchor)) {
  throw new Error('Could not locate return anchor in AssetReportsPage.tsx');
}

if (!source.includes('const tableColumnWeightTotal')) {
  source = source.replace(
    returnAnchor,
    `  const tableColumnWeightTotal = 4 + selectedFields.reduce((sum, key) => sum + (SCREEN_COLUMN_WEIGHTS[key] || 7), 0) + (canPrint ? 9 : 0);\n\n${returnAnchor}`,
  );
}

const tablePattern = /      <Card className="overflow-hidden rounded-\[28px\] border-white\/55 bg-white\/70 shadow-\[0_16px_48px_rgba\(15,23,42,0\.07\)\] backdrop-blur-xl"><CardContent className="p-0">[\s\S]*?<\/CardContent><\/Card>/;
if (!tablePattern.test(source)) {
  throw new Error('Could not locate the current asset reports table block');
}

const compactTable = `      <Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl"><CardContent className="p-0">{loading?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل نتائج التقرير...</div>:!rows.length?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">لا توجد سجلات مطابقة للتصفية الحالية.</div>:<div className="overflow-x-auto p-1.5 sm:p-2"><table className="w-full table-fixed border-collapse text-[10px] leading-tight sm:text-[11px] lg:text-xs"><colgroup><col style={{width:((4/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>{selectedFields.map((key)=><col key={key} style={{width:(((SCREEN_COLUMN_WEIGHTS[key]||7)/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>)}{canPrint&&<col style={{width:((9/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>}</colgroup><thead className="bg-primary text-primary-foreground"><tr><th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">#</th>{selectedFields.map((key)=><th key={key} className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{printableFields.find(([field])=>field===key)?.[1]}</th>)}{canPrint&&<th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">التقرير</th>}</tr></thead><tbody>{rows.map((asset,index)=><tr key={asset.id} className="odd:bg-white/25 even:bg-muted/20 hover:bg-primary/5"><td className="border border-border/60 px-1 py-1.5 text-center align-middle font-bold">{(page-1)*pageSize+index+1}</td>{selectedFields.map((key)=><td key={key} title={String(valueFor(asset,key))} className="border border-border/60 px-1 py-1.5 text-center align-middle font-medium leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{String(valueFor(asset,key))}</td>)}{canPrint&&<td className="border border-border/60 px-1 py-1.5 text-center align-middle"><Button type="button" variant="outline" size="sm" className="h-7 max-w-full gap-1 px-1.5 text-[10px]" title="تقرير الأصل" onClick={()=>void printSingleAsset(asset)}><Printer className="h-3.5 w-3.5 shrink-0"/><span>تقرير</span></Button></td>}</tr>)}</tbody></table></div>}</CardContent></Card>`;

source = source.replace(tablePattern, compactTable);
fs.writeFileSync(filePath, source, 'utf8');
console.log('Asset reports table updated to a compact weighted fixed layout.');
