import fs from 'node:fs';

const path = 'src/app/pages/ViewDeedPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('const [printOptionsOpen, setPrintOptionsOpen]')) {
  console.log('Deed print options are already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    throw new Error(`Could not find anchor: ${label}`);
  }
  source = source.replace(from, to);
};

replaceOnce(
  "  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);\n  const [previewImage, setPreviewImage] = useState<string | null>(null);",
  "  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);\n  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);\n  const [previewImage, setPreviewImage] = useState<string | null>(null);",
  'print options state',
);

replaceOnce(
  '  const handlePrintDeed = () => {',
  '  const handlePrintDeed = (includeAttachments: boolean) => {',
  'print handler signature',
);

replaceOnce(
  '    <section class="section">\n      <div class="section-title">المرفقات والوثائق</div>',
  '    ${includeAttachments ? `<section class="section">\n      <div class="section-title">المرفقات والوثائق</div>',
  'attachments print section start',
);

replaceOnce(
  '    </section>\n\n    <footer class="footer">',
  "    </section>` : ''}\n\n    <footer class=\"footer\">",
  'attachments print section end',
);

replaceOnce(
  '                  onClick={handlePrintDeed}\n                  className="text-sm md:text-base"\n                  title="طباعة تقرير الصك بحجم A4"',
  '                  onClick={() => setPrintOptionsOpen(true)}\n                  className="text-sm md:text-base"\n                  title="خيارات طباعة تقرير الصك"',
  'print button action',
);

replaceOnce(
  '      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>',
  `      <Dialog open={printOptionsOpen} onOpenChange={setPrintOptionsOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg md:text-xl">خيارات الطباعة</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 pt-2">
            <Button
              type="button"
              className="h-auto min-h-20 justify-start gap-3 whitespace-normal px-4 py-4 text-right"
              onClick={() => {
                setPrintOptionsOpen(false);
                handlePrintDeed(true);
              }}
            >
              <Printer className="h-5 w-5 shrink-0" />
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span className="font-bold">طباعة مع المرفقات</span>
                <span className="text-xs font-normal opacity-85">
                  يتضمن التقرير قسم المرفقات والوثائق المرتبطة بالصك.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-20 justify-start gap-3 whitespace-normal px-4 py-4 text-right"
              onClick={() => {
                setPrintOptionsOpen(false);
                handlePrintDeed(false);
              }}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span className="font-bold">طباعة بدون المرفقات</span>
                <span className="text-xs font-normal text-muted-foreground">
                  يطبع بيانات الصك والموقع والملاحظات فقط دون قسم المرفقات.
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>`,
  'print options dialog',
);

fs.writeFileSync(path, source);
console.log('Applied deed print options: with attachments or without attachments.');
