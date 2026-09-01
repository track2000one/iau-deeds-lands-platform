from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

anchor = "const button3d = 'shadow-[0_4px_0_rgba(71,85,105,0.13),0_7px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.12)]';\n"
insert = anchor + "const siteActionButton = `${button3d} h-10 w-full min-w-0 justify-center gap-1.5 whitespace-nowrap px-2 text-xs font-bold leading-none`;\n"
if 'const siteActionButton =' not in text:
    if anchor not in text:
        raise SystemExit('button3d anchor not found')
    text = text.replace(anchor, insert, 1)

start = text.find('const SiteCard = ')
end = text.find('\n\nconst QuickFilterBar', start)
if start < 0 or end < 0:
    raise SystemExit('SiteCard block not found')
block = text[start:end]

block = block.replace('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6', 'grid grid-cols-2 gap-2 sm:grid-cols-3')
block = block.replace('className={button3d}', 'className={siteActionButton}')
block = block.replace('className="ml-1 h-4 w-4"', 'className="h-4 w-4 shrink-0"')
block = block.replace('<QrCode className="h-4 w-4 shrink-0" />QR', '<QrCode className="h-4 w-4 shrink-0" />رمز QR')
block = block.replace('<Button variant="outline" className={siteActionButton} onClick={onEdit}>تعديل</Button>', '<Button variant="outline" className={siteActionButton} onClick={onEdit}><Pencil className="h-4 w-4 shrink-0" />تعديل</Button>')
block = block.replace('<Button variant="outline" className="border-red-300 text-red-600" onClick={onDelete}>حذف</Button>', '<Button variant="outline" className={`${siteActionButton} border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700`} onClick={onDelete}><Trash2 className="h-4 w-4 shrink-0" />حذف</Button>')

text = text[:start] + block + text[end:]
path.write_text(text, encoding='utf-8')
print('Mosque site card action buttons formatted')
