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

const compactTableMarker = '<Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl">';
if (!source.includes(compactTableMarker)) {
  const tablePattern = /      <Card className="overflow-hidden rounded-\[28px\] border-white\/55 bg-white\/70 shadow-\[0_16px_48px_rgba\(15,23,42,0\.07\)\] backdrop-blur-xl"><CardContent className="p-0">[\s\S]*?<\/CardContent><\/Card>/;
  if (!tablePattern.test(source)) {
    throw new Error('Could not locate the current asset reports table block');
  }

  const compactTable = `      <Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl"><CardContent className="p-0">{loading?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل نتائج التقرير...</div>:!rows.length?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">لا توجد سجلات مطابقة للتصفية الحالية.</div>:<div className="overflow-x-auto p-1.5 sm:p-2"><table className="w-full table-fixed border-collapse text-[10px] leading-tight sm:text-[11px] lg:text-xs"><colgroup><col style={{width:((4/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>{selectedFields.map((key)=><col key={key} style={{width:(((SCREEN_COLUMN_WEIGHTS[key]||7)/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>)}{canPrint&&<col style={{width:((9/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>}</colgroup><thead className="bg-primary text-primary-foreground"><tr><th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">#</th>{selectedFields.map((key)=><th key={key} className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{printableFields.find(([field])=>field===key)?.[1]}</th>)}{canPrint&&<th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">التقرير</th>}</tr></thead><tbody>{rows.map((asset,index)=><tr key={asset.id} className="odd:bg-white/25 even:bg-muted/20 hover:bg-primary/5"><td className="border border-border/60 px-1 py-1.5 text-center align-middle font-bold">{(page-1)*pageSize+index+1}</td>{selectedFields.map((key)=><td key={key} title={String(valueFor(asset,key))} className="border border-border/60 px-1 py-1.5 text-center align-middle font-medium leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{String(valueFor(asset,key))}</td>)}{canPrint&&<td className="border border-border/60 px-1 py-1.5 text-center align-middle"><Button type="button" variant="outline" size="sm" className="h-7 max-w-full gap-1 px-1.5 text-[10px]" title="تقرير الأصل" onClick={()=>void printSingleAsset(asset)}><Printer className="h-3.5 w-3.5 shrink-0"/><span>تقرير</span></Button></td>}</tr>)}</tbody></table></div>}</CardContent></Card>`;

  source = source.replace(tablePattern, compactTable);
}

const oldPrintCss = `@page{size:A4 landscape;margin:.5mm}*{box-sizing:border-box}html,body{width:100%;margin:0;padding:0}body{font-family:Tahoma,Arial,sans-serif;color:#172033;padding:0 .5mm}.header{text-align:center;border-bottom:1.5px solid #1f4e79;padding:0 0 2px;margin:0 0 2px}.header h1{font-size:19px;line-height:1.05;margin:0;font-weight:800}.sub{font-size:10px;line-height:1.05;color:#64748b;margin-top:1px}.filters{margin:1px 0;padding:2px 4px;border:1px solid #dbe3ec;border-radius:3px;font-size:10px;line-height:1.1}.summary{display:flex;gap:2px;margin:0 0 2px}.summary div{flex:1;border:1px solid #dbe3ec;border-radius:3px;padding:2px 4px;text-align:center;line-height:1.05;font-size:11px}.summary strong{font-size:16px}table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:14px;line-height:1.12}th{background:#1f4e79;color:#fff;padding:2px 2px;border:.6px solid #dbe3ec;font-weight:800;vertical-align:middle;white-space:normal;overflow-wrap:anywhere}td{padding:1.5px 2px;border:.6px solid #dbe3ec;text-align:center;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.footer{margin-top:2px;font-size:8px;line-height:1;color:#64748b;display:flex;justify-content:space-between}`;

const tightPrintCss = `@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{width:100%;margin:0!important;padding:0!important}body{font-family:Tahoma,Arial,sans-serif;color:#172033}.header{text-align:center;border-bottom:1px solid #1f4e79;padding:0;margin:0}.header h1{font-size:14px;line-height:1;margin:0;font-weight:800}.sub{font-size:8px;line-height:1;color:#64748b;margin:0}.filters{margin:0;padding:1px 2px;border:1px solid #dbe3ec;border-radius:0;font-size:8.5px;line-height:1}.summary{display:flex;gap:0;margin:0}.summary div{flex:1;border:1px solid #dbe3ec;border-radius:0;padding:1px 2px;text-align:center;line-height:1;font-size:9px}.summary strong{font-size:12px}table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:11px;line-height:1.02}th{background:#1f4e79;color:#fff;padding:.6px 1px;border:.45px solid #dbe3ec;font-size:11px;font-weight:800;vertical-align:middle;white-space:normal;overflow-wrap:anywhere}td{padding:.45px 1px;border:.45px solid #dbe3ec;font-size:11px;text-align:center;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.footer{margin-top:0;padding:0 1px;font-size:7px;line-height:1;color:#64748b;display:flex;justify-content:space-between}`;

if (source.includes(oldPrintCss)) {
  source = source.replace(oldPrintCss, tightPrintCss);
} else if (!source.includes('@page{size:A4 landscape;margin:0}')) {
  throw new Error('Could not locate asset report print CSS block');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Asset reports screen table and print layout refined successfully.');
