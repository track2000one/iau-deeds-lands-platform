import fs from 'node:fs';

const filePath = 'src/app/pages/AddAssetPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Could not locate ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "import React, { useMemo, useState } from 'react';",
  "import React, { useEffect, useMemo, useRef, useState } from 'react';",
  'React hooks import',
);

replaceOnce(
  "  Save,\n  Upload,",
  "  Save,\n  ScanBarcode,\n  Upload,",
  'ScanBarcode icon import',
);

replaceOnce(
  "  const [uploadProgress, setUploadProgress] = useState('');\n",
  "  const [uploadProgress, setUploadProgress] = useState('');\n  const [scannerOpen, setScannerOpen] = useState(false);\n  const [scannerMessage, setScannerMessage] = useState('');\n  const videoRef = useRef<HTMLVideoElement | null>(null);\n  const scannerStreamRef = useRef<MediaStream | null>(null);\n  const scannerFrameRef = useRef<number | null>(null);\n",
  'scanner state',
);

const removeFileBlock = `  const removeFile = (category: AssetAttachmentCategory, index: number) => {\n    setAttachments((current) => ({\n      ...current,\n      [category]: current[category].filter((_, fileIndex) => fileIndex !== index),\n    }));\n  };\n\n`;

const scannerEffect = `  const removeFile = (category: AssetAttachmentCategory, index: number) => {\n    setAttachments((current) => ({\n      ...current,\n      [category]: current[category].filter((_, fileIndex) => fileIndex !== index),\n    }));\n  };\n\n  useEffect(() => {\n    if (!scannerOpen) return;\n\n    let active = true;\n\n    const stopScanner = () => {\n      active = false;\n      if (scannerFrameRef.current !== null) {\n        window.cancelAnimationFrame(scannerFrameRef.current);\n        scannerFrameRef.current = null;\n      }\n      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());\n      scannerStreamRef.current = null;\n      if (videoRef.current) videoRef.current.srcObject = null;\n    };\n\n    const startScanner = async () => {\n      setScannerMessage('');\n\n      const BarcodeDetectorCtor = (window as any).BarcodeDetector;\n      if (!BarcodeDetectorCtor) {\n        setScannerMessage('قارئ الباركود بالكاميرا غير مدعوم في هذا المتصفح. جرّب متصفحًا حديثًا على الجوال أو أدخل الرقم يدويًا.');\n        setScannerOpen(false);\n        return;\n      }\n\n      if (!navigator.mediaDevices?.getUserMedia) {\n        setScannerMessage('تعذر الوصول إلى كاميرا الجهاز من هذا المتصفح.');\n        setScannerOpen(false);\n        return;\n      }\n\n      try {\n        const stream = await navigator.mediaDevices.getUserMedia({\n          video: {\n            facingMode: { ideal: 'environment' },\n            width: { ideal: 1280 },\n            height: { ideal: 720 },\n          },\n          audio: false,\n        });\n\n        if (!active) {\n          stream.getTracks().forEach((track) => track.stop());\n          return;\n        }\n\n        scannerStreamRef.current = stream;\n        const video = videoRef.current;\n        if (!video) return;\n\n        video.srcObject = stream;\n        await video.play();\n\n        const detector = new BarcodeDetectorCtor();\n\n        const scanFrame = async () => {\n          if (!active || !videoRef.current) return;\n\n          try {\n            if (videoRef.current.readyState >= 2) {\n              const results = await detector.detect(videoRef.current);\n              const value = results?.[0]?.rawValue;\n              if (value) {\n                setField('barcode', String(value));\n                setScannerMessage(\`تمت قراءة الباركود بنجاح: \${String(value)}\`);\n                setScannerOpen(false);\n                return;\n              }\n            }\n          } catch {\n            // Continue scanning; transient frame detection errors are expected.\n          }\n\n          scannerFrameRef.current = window.requestAnimationFrame(scanFrame);\n        };\n\n        scannerFrameRef.current = window.requestAnimationFrame(scanFrame);\n      } catch (cameraError: any) {\n        const permissionDenied = cameraError?.name === 'NotAllowedError' || cameraError?.name === 'PermissionDeniedError';\n        setScannerMessage(\n          permissionDenied\n            ? 'لم يتم السماح باستخدام الكاميرا. اسمح للمتصفح بالوصول إلى الكاميرا ثم حاول مرة أخرى.'\n            : 'تعذر تشغيل كاميرا الجوال لقراءة الباركود.'\n        );\n        setScannerOpen(false);\n      }\n    };\n\n    void startScanner();\n    return stopScanner;\n  }, [scannerOpen]);\n\n`;

replaceOnce(removeFileBlock, scannerEffect, 'remove file block');

const barcodeField = `          <div className=\"space-y-2\">\n            <Label>رقم الباركود / ملصق الأصل</Label>\n            <Input value={form.barcode || ''} onChange={(e) => setField('barcode', e.target.value)} placeholder=\"اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول\" />\n            <p className=\"text-xs text-muted-foreground\">سيُنشئ النظام رقم باركود فريدًا تلقائيًا عند الحفظ.</p>\n          </div>`;

const barcodeFieldWithScanner = `          <div className=\"space-y-2\">\n            <Label>رقم الباركود / ملصق الأصل</Label>\n            <div className=\"flex gap-2\">\n              <Input value={form.barcode || ''} onChange={(e) => setField('barcode', e.target.value)} placeholder=\"اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول\" />\n              <Button type=\"button\" variant=\"outline\" onClick={() => setScannerOpen(true)} className=\"h-10 shrink-0 rounded-xl px-3\">\n                <ScanBarcode className=\"ml-2 h-4 w-4 text-blue-600\" />\n                <span className=\"hidden sm:inline\">مسح بالجوال</span>\n              </Button>\n            </div>\n            <p className=\"text-xs text-muted-foreground\">يمكن قراءة باركود الأصل مباشرة بكاميرا الجوال، أو ترك الحقل فارغًا ليُنشأ تلقائيًا.</p>\n          </div>`;

replaceOnce(barcodeField, barcodeFieldWithScanner, 'barcode field');

const attachmentHeaderCounter = `            <div className=\"w-fit rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold\">\n              {totalAttachments} مرفق\n            </div>`;

const attachmentMobileActions = `            <div className=\"flex flex-wrap items-center gap-2\">\n              <Button type=\"button\" variant=\"outline\" onClick={() => setScannerOpen(true)} className=\"h-9 rounded-xl px-3 text-xs\">\n                <ScanBarcode className=\"ml-2 h-4 w-4 text-blue-600\" />\n                قارئ الباركود\n              </Button>\n              <label className=\"inline-flex h-9 cursor-pointer items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100\">\n                <Camera className=\"ml-2 h-4 w-4\" />\n                تصوير مباشر\n                <input\n                  type=\"file\"\n                  accept=\"image/*\"\n                  capture=\"environment\"\n                  className=\"hidden\"\n                  onChange={(event) => {\n                    addFiles('asset_images', event.target.files);\n                    event.currentTarget.value = '';\n                  }}\n                />\n              </label>\n              <div className=\"w-fit rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold\">\n                {totalAttachments} مرفق\n              </div>\n            </div>`;

replaceOnce(attachmentHeaderCounter, attachmentMobileActions, 'attachment counter');

const cardContentMarker = `        <CardContent className=\"grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2\">`;
const scannerMessageBlock = `        {scannerMessage && (\n          <div className=\"mx-5 mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800 sm:mx-6\">\n            {scannerMessage}\n          </div>\n        )}\n\n        <CardContent className=\"grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2\">`;
replaceOnce(cardContentMarker, scannerMessageBlock, 'attachment card content');

const rootClosing = `    </div>\n  );\n};\n`;
const scannerModal = `      {scannerOpen && (\n        <div className=\"fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm\" role=\"dialog\" aria-modal=\"true\" aria-label=\"قارئ الباركود\">\n          <div className=\"w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl\">\n            <div className=\"flex items-center justify-between border-b border-white/10 px-4 py-3 text-white\">\n              <div className=\"flex items-center gap-2\">\n                <ScanBarcode className=\"h-5 w-5 text-cyan-300\" />\n                <div>\n                  <h3 className=\"font-bold\">قارئ باركود الأصل</h3>\n                  <p className=\"mt-0.5 text-[11px] text-slate-300\">وجّه الكاميرا الخلفية نحو الباركود حتى تتم القراءة تلقائيًا.</p>\n                </div>\n              </div>\n              <Button type=\"button\" variant=\"ghost\" size=\"icon\" onClick={() => setScannerOpen(false)} className=\"text-white hover:bg-white/10 hover:text-white\">\n                <X className=\"h-5 w-5\" />\n              </Button>\n            </div>\n\n            <div className=\"relative aspect-[4/3] overflow-hidden bg-black\">\n              <video ref={videoRef} playsInline muted className=\"h-full w-full object-cover\" />\n              <div className=\"pointer-events-none absolute inset-0 flex items-center justify-center\">\n                <div className=\"relative h-36 w-[82%] max-w-sm rounded-2xl border-2 border-cyan-300/90 shadow-[0_0_0_999px_rgba(2,6,23,0.38),0_0_30px_rgba(34,211,238,0.28)]\">\n                  <div className=\"absolute left-3 right-3 top-1/2 h-px bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]\" />\n                </div>\n              </div>\n            </div>\n\n            <div className=\"flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-300\">\n              <span>تعمل الكاميرا الخلفية تلقائيًا على الجوال.</span>\n              <Button type=\"button\" variant=\"outline\" onClick={() => setScannerOpen(false)} className=\"h-9 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white\">إلغاء</Button>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n`;

if (!source.endsWith(rootClosing)) throw new Error('Could not locate root closing block');
source = source.slice(0, -rootClosing.length) + scannerModal;

fs.writeFileSync(filePath, source, 'utf8');
console.log('Mobile barcode scanner and direct camera capture added to AddAssetPage.');
