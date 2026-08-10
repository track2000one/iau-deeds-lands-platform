import fs from 'node:fs';

const file = 'src/app/pages/AddAssetPage.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (before, after, label) => {
  if (!source.includes(before)) {
    throw new Error(`Could not find target for: ${label}`);
  }
  source = source.replace(before, after);
};

replaceOnce(
`  const [scannerOpen, setScannerOpen] = useState(false);\n  const [scannerMessage, setScannerMessage] = useState('');\n  const videoRef = useRef<HTMLVideoElement | null>(null);`,
`  const [scannerOpen, setScannerOpen] = useState(false);\n  const [scannerMessage, setScannerMessage] = useState('');\n  const [hardwareScannerActive, setHardwareScannerActive] = useState(false);\n  const [hardwareScannerMessage, setHardwareScannerMessage] = useState('');\n  const barcodeInputRef = useRef<HTMLInputElement | null>(null);\n  const videoRef = useRef<HTMLVideoElement | null>(null);`,
'barcode reader state'
);

replaceOnce(
`  useEffect(() => {\n    if (!scannerOpen) return;`,
`  const startHardwareBarcodeReader = () => {\n    setHardwareScannerMessage('');\n    setHardwareScannerActive(true);\n    setField('barcode', '');\n    window.requestAnimationFrame(() => {\n      barcodeInputRef.current?.focus();\n    });\n  };\n\n  const finishHardwareBarcodeReader = (rawValue?: string) => {\n    const value = String(rawValue ?? barcodeInputRef.current?.value ?? form.barcode ?? '').trim();\n    if (!value) {\n      setHardwareScannerMessage('لم يتم استلام باركود بعد. مرّر الملصق أمام القارئ المتصل ثم حاول مرة أخرى.');\n      barcodeInputRef.current?.focus();\n      return;\n    }\n\n    setField('barcode', value);\n    setHardwareScannerActive(false);\n    setHardwareScannerMessage(\`تمت قراءة الباركود من القارئ المتصل بنجاح: \${value}\`);\n    barcodeInputRef.current?.blur();\n  };\n\n  const cancelHardwareBarcodeReader = () => {\n    setHardwareScannerActive(false);\n    setHardwareScannerMessage('تم إلغاء وضع القراءة من القارئ المتصل.');\n    barcodeInputRef.current?.blur();\n  };\n\n  const handleHardwareScannerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {\n    if (!hardwareScannerActive) return;\n\n    if (event.key === 'Enter' || event.key === 'Tab') {\n      event.preventDefault();\n      finishHardwareBarcodeReader(event.currentTarget.value);\n      return;\n    }\n\n    if (event.key === 'Escape') {\n      event.preventDefault();\n      cancelHardwareBarcodeReader();\n    }\n  };\n\n  useEffect(() => {\n    if (!scannerOpen) return;`,
'hardware barcode reader handlers'
);

replaceOnce(
`            <div className="flex gap-2">\n              <Input value={form.barcode || ''} onChange={(e) => setField('barcode', e.target.value)} placeholder="اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول" />\n              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="h-10 shrink-0 rounded-xl px-3">\n                <ScanBarcode className="ml-2 h-4 w-4 text-blue-600" />\n                <span className="hidden sm:inline">مسح بالجوال</span>\n              </Button>\n            </div>\n            <p className="text-xs text-muted-foreground">يمكن قراءة باركود الأصل مباشرة بكاميرا الجوال، أو ترك الحقل فارغًا ليُنشأ تلقائيًا.</p>`,
`            <div className="flex flex-wrap gap-2">\n              <Input\n                ref={barcodeInputRef}\n                value={form.barcode || ''}\n                onChange={(e) => setField('barcode', e.target.value)}\n                onKeyDown={handleHardwareScannerKeyDown}\n                autoComplete="off"\n                className={hardwareScannerActive ? 'min-w-[220px] flex-1 border-emerald-400 ring-2 ring-emerald-100' : 'min-w-[220px] flex-1'}\n                placeholder={hardwareScannerActive ? 'جاهز للقراءة... مرّر الباركود أمام القارئ' : 'اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول'}\n              />\n              <Button\n                type="button"\n                variant="outline"\n                onClick={() => hardwareScannerActive ? finishHardwareBarcodeReader(barcodeInputRef.current?.value) : startHardwareBarcodeReader()}\n                className={hardwareScannerActive ? 'h-10 shrink-0 rounded-xl border-emerald-300 bg-emerald-50 px-3 text-emerald-700 hover:bg-emerald-100' : 'h-10 shrink-0 rounded-xl px-3'}\n                title="قراءة الباركود من قارئ USB أو القارئ اللاسلكي المتصل بالكمبيوتر"\n              >\n                <Barcode className="ml-2 h-4 w-4 text-emerald-600" />\n                <span>{hardwareScannerActive ? 'إنهاء القراءة' : 'قارئ USB'}</span>\n              </Button>\n              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="h-10 shrink-0 rounded-xl px-3">\n                <ScanBarcode className="ml-2 h-4 w-4 text-blue-600" />\n                <span className="hidden sm:inline">كاميرا الجوال</span>\n              </Button>\n            </div>\n            <p className="text-xs text-muted-foreground">يدعم قارئ الباركود المتصل بالكمبيوتر عبر USB أو اللاسلكي بوضع لوحة المفاتيح، وكذلك القراءة بكاميرا الجوال.</p>\n            {hardwareScannerActive && (\n              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">\n                القارئ جاهز الآن: مرّر الباركود أمام الجهاز المتصل. تُعتمد القراءة تلقائيًا عند إرسال Enter أو Tab من القارئ، ويمكن الضغط على «إنهاء القراءة» يدويًا.\n              </div>\n            )}\n            {hardwareScannerMessage && !hardwareScannerActive && (\n              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">\n                {hardwareScannerMessage}\n              </div>\n            )}`,
'barcode field controls'
);

fs.writeFileSync(file, source);
console.log('Desktop barcode reader controls applied to AddAssetPage.tsx');
