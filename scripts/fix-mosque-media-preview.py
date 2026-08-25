from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')

api = api_path.read_text(encoding='utf-8')
api_anchor = "  deleteUpload: async (fileId: string) => {\n"
api_insert = """  mediaBlob: async (fileId: string) => {\n    const response = await authenticatedFetch(`/api/uploads/${encodeURIComponent(fileId)}/content`, { headers: { 'x-upload-module': 'mosques' } });\n    if (!response.ok) {\n      const body = await response.json().catch(() => ({}));\n      throw new Error(body?.message || 'تعذر تحميل معاينة الملف');\n    }\n    return response.blob();\n  },\n"""
if api_insert not in api:
    if api_anchor not in api:
        raise SystemExit('mosque api deleteUpload anchor not found')
    api = api.replace(api_anchor, api_insert + api_anchor, 1)
    api_path.write_text(api, encoding='utf-8')

page = page_path.read_text(encoding='utf-8')
old_preview = """const drivePreviewUrl = (url: string) => {\n  const id = String(url || '').match(/drive\\.google\\.com\\/file\\/d\\/([^/?#]+)/i)?.[1] || String(url || '').match(/[?&]id=([^&#]+)/i)?.[1];\n  return id ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : url;\n};\n"""
new_preview = """const drivePreviewUrl = (url: string) => {\n  const id = String(url || '').match(/drive\\.google\\.com\\/file\\/d\\/([^/?#]+)/i)?.[1] || String(url || '').match(/[?&]id=([^&#]+)/i)?.[1];\n  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : url;\n};\n\nconst MosqueMediaImage: React.FC<{ item: { url: string; fileId?: string | null }; alt: string; className?: string }> = ({ item, alt, className }) => {\n  const [src, setSrc] = useState<string | null>(() => item.fileId ? null : drivePreviewUrl(item.url));\n  const [failed, setFailed] = useState(false);\n\n  useEffect(() => {\n    let cancelled = false;\n    let objectUrl: string | null = null;\n    const fallback = drivePreviewUrl(item.url);\n\n    setFailed(false);\n    if (!item.fileId) {\n      setSrc(fallback);\n      return () => undefined;\n    }\n\n    setSrc(null);\n    void mosqueApi.mediaBlob(item.fileId)\n      .then((blob) => {\n        if (cancelled) return;\n        objectUrl = URL.createObjectURL(blob);\n        setSrc(objectUrl);\n      })\n      .catch(() => {\n        if (!cancelled) setSrc(fallback);\n      });\n\n    return () => {\n      cancelled = true;\n      if (objectUrl) URL.revokeObjectURL(objectUrl);\n    };\n  }, [item.fileId, item.url]);\n\n  if (failed) {\n    return <div className={`${className || ''} flex items-center justify-center bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500`}>تعذر عرض الصورة — يمكن فتح الملف بالضغط على البطاقة</div>;\n  }\n\n  if (!src) {\n    return <div className={`${className || ''} flex items-center justify-center gap-2 bg-slate-100 text-xs font-semibold text-slate-500`}><RefreshCw className=\"h-4 w-4 animate-spin\" />جاري تحميل الصورة...</div>;\n  }\n\n  return <img src={src} alt={alt} className={className} onError={() => {\n    const fallback = drivePreviewUrl(item.url);\n    if (src !== fallback) setSrc(fallback);\n    else setFailed(true);\n  }} />;\n};\n"""
if 'const MosqueMediaImage:' not in page:
    if old_preview not in page:
        raise SystemExit('drivePreviewUrl anchor not found')
    page = page.replace(old_preview, new_preview, 1)

old_img = '<img src={drivePreviewUrl(item.url)} alt={item.fileName || \'صورة الموقع\'} className="h-32 w-full object-cover" />'
new_img = '<MosqueMediaImage item={item} alt={item.fileName || \'صورة الموقع\'} className="h-32 w-full object-cover" />'
if old_img in page:
    page = page.replace(old_img, new_img, 1)
elif new_img not in page:
    raise SystemExit('preview image render anchor not found')

page_path.write_text(page, encoding='utf-8')
