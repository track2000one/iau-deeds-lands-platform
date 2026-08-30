from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

# 1) Make the SiteCard accept an optional Quran inventory action.
old = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
new = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, onQuranInventory, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; onQuranInventory?: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
replace_once(old, new, 'SiteCard Quran action prop')

# 2) Add the prominent luminous Quran button to every mosque/prayer-room card.
old = '<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Button variant="outline" className={button3d} onClick={onQr}>'
new = '''{onQuranInventory && <Button
  type="button"
  onClick={onQuranInventory}
  aria-label={`إضافة أو تحديث المصاحف في ${site.name}`}
  className="group relative mb-3 h-12 w-full overflow-hidden border-0 bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-500 px-4 font-black text-white shadow-[0_0_18px_rgba(16,185,129,0.48),0_5px_0_rgba(6,95,70,0.28),0_12px_26px_rgba(15,118,110,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.72),0_5px_0_rgba(6,95,70,0.24),0_15px_30px_rgba(15,118,110,0.28)] active:translate-y-[1px]"
>
  <span className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/15 to-transparent" />
  <span className="pointer-events-none absolute -right-20 top-[-45%] h-[190%] w-12 rotate-[18deg] bg-white/35 blur-md transition-transform duration-700 group-hover:-translate-x-[430px]" />
  <span className="relative ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300 text-emerald-950 shadow-[0_0_18px_rgba(253,224,71,0.95),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-white/80">
    <span className="absolute -inset-1.5 animate-pulse rounded-xl bg-amber-300/45 blur-md" />
    <BookOpen className="relative h-4.5 w-4.5 drop-shadow-[0_0_5px_rgba(255,255,255,0.95)]" />
  </span>
  <span className="relative">إضافة / تحديث المصاحف</span>
</Button>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Button variant="outline" className={button3d} onClick={onQr}>'''
replace_once(old, new, 'SiteCard glowing Quran button')

# 3) Wire the card button only for roles allowed to manage Quran inventory.
old = 'onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined}'
new = "onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} onQuranInventory={['head', 'supervisor', 'personnel'].includes(role) ? () => openQuranInventoryDialog(site) : undefined} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined}"
replace_once(old, new, 'SiteCard Quran action wiring')

# 4) Upgrade the Quran inventory table action itself to the same luminous visual language.
old = '<Button size="sm" variant="outline" className={button3d} onClick={() => openQuranInventoryDialog(site)}><Pencil className="ml-1 h-3.5 w-3.5" />تحديث الجرد</Button>'
new = '''<Button
  size="sm"
  onClick={() => openQuranInventoryDialog(site)}
  className="group relative overflow-hidden border-0 bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-500 font-black text-white shadow-[0_0_14px_rgba(16,185,129,0.42),0_4px_0_rgba(6,95,70,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.68),0_4px_0_rgba(6,95,70,0.22)]"
>
  <span className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/15 to-transparent" />
  <span className="relative ml-1 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-300 text-emerald-950 shadow-[0_0_14px_rgba(253,224,71,0.92)] ring-1 ring-white/80">
    <BookOpen className="h-3.5 w-3.5" />
  </span>
  <span className="relative">إضافة / تحديث المصاحف</span>
</Button>'''
replace_once(old, new, 'Quran table glowing action')

path.write_text(text, encoding='utf-8')
print('Applied luminous Quran inventory buttons.')
