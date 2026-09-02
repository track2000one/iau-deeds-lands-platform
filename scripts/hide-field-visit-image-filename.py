from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')
old = """      <div className=\"mt-1.5 min-w-0 px-1\">\n        <p className=\"truncate text-[10px] font-semibold text-slate-700\" title={image.fileName || `صورة ${index + 1}`}>{image.fileName || `صورة ${index + 1}`}</p>\n        {image.capturedAt && <p className=\"mt-0.5 text-[9px] text-slate-400\">{new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory')}</p>}\n      </div>"""
new = """      {image.capturedAt && <div className=\"mt-1.5 px-1 text-center\"><p className=\"text-[9px] text-slate-400\">{new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory')}</p></div>}"""
if old not in text:
    raise SystemExit('target block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('hidden field visit image filename')
