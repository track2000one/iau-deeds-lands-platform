const fs = require('fs');
const path = 'src/app/pages/AssetsPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const badSearch = "<div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3\">{searchResult.items.map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`, { state: { assetGroupKey: group.key } })} onEdit={() => navigate(`/assets/${asset.id}/edit`, { state: { assetGroupKey: group.key } })} onDelete={() => handleDelete(asset)} />)}</div>";
const goodSearch = "<div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3\">{searchResult.items.map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`)} onEdit={() => navigate(`/assets/${asset.id}/edit`)} onDelete={() => handleDelete(asset)} />)}</div>";
if (!s.includes(badSearch)) throw new Error('Search-result navigation target not found');
s = s.replace(badSearch, goodSearch);

const groupedOld = "<div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3\">{(loaded?.items || []).map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`)} onEdit={() => navigate(`/assets/${asset.id}/edit`)} onDelete={() => handleDelete(asset)} />)}</div>";
const groupedNew = "<div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3\">{(loaded?.items || []).map((asset) => <AssetCard key={asset.id} asset={asset} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} onView={() => navigate(`/assets/${asset.id}`, { state: { assetGroupKey: group.key } })} onEdit={() => navigate(`/assets/${asset.id}/edit`, { state: { assetGroupKey: group.key } })} onDelete={() => handleDelete(asset)} />)}</div>";
if (!s.includes(groupedOld)) throw new Error('Grouped asset navigation target not found');
s = s.replace(groupedOld, groupedNew);

fs.writeFileSync(path, s);
console.log('Asset group return context hotfix applied.');
