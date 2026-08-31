from pathlib import Path
import re

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')
original = text

old_sig = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, onQuranInventory, onQuranDistribution, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; onQuranInventory?: () => void; onQuranDistribution?: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
new_sig = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
if old_sig not in text:
    raise SystemExit('SiteCard signature anchor not found')
text = text.replace(old_sig, new_sig, 1)

# Remove the two Quran operational buttons only from the mosque/prayer-room card.
pattern = re.compile(
    r"\{onQuranInventory && <Button\n.*?</Button>\}\{onQuranDistribution && <Button type=\"button\" onClick=\{onQuranDistribution\}.*?</Button>\}",
    re.S,
)
text, count = pattern.subn('', text, count=1)
if count != 1:
    raise SystemExit(f'Expected to remove one SiteCard Quran action block, removed {count}')

old_props = " onQuranInventory={['head', 'supervisor', 'personnel'].includes(role) ? () => openQuranInventoryDialog(site) : undefined} onQuranDistribution={role === 'head' ? () => openQuranDistributionForSite(site) : undefined}"
if old_props not in text:
    raise SystemExit('SiteCard Quran props anchor not found')
text = text.replace(old_props, '', 1)

if text == original:
    raise SystemExit('No source changes made')

path.write_text(text, encoding='utf-8')
print('Removed Quran inventory/distribution buttons from mosque and prayer-room cards.')
