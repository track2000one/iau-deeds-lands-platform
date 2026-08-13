from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
s = path.read_text(encoding='utf-8')
old = '<div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /><p className="break-all text-center text-xs text-muted-foreground" dir="ltr">{publicUrlForSite(qrSite)}</p></div>'
new = '<div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /></div>'
if old not in s:
    raise RuntimeError('QR URL display block not found')
s = s.replace(old, new, 1)
path.write_text(s, encoding='utf-8')
