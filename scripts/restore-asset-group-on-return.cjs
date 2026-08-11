const fs = require('fs');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

// Assets list: pass group context into view/edit and restore the same expanded group on return.
{
  const path = 'src/app/pages/AssetsPage.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    "import { useNavigate } from 'react-router';",
    "import { useLocation, useNavigate } from 'react-router';",
    'AssetsPage useLocation import'
  );

  s = replaceOnce(
    s,
    "export const AssetsPage: React.FC = () => {\n  const navigate = useNavigate();",
    "export const AssetsPage: React.FC = () => {\n  const navigate = useNavigate();\n  const location = useLocation();",
    'AssetsPage location'
  );

  s = replaceOnce(
    s,
    "  const searchSequence = useRef(0);",
    "  const searchSequence = useRef(0);\n  const restoredGroupRef = useRef<string | null>(null);",
    'AssetsPage restored group ref'
  );

  s = replaceOnce(
    s,
    "  const toggleGroup = async (group: AssetGroupSummary) => {\n    const willOpen = !expandedGroups[group.key];\n    setExpandedGroups((current) => ({ ...current, [group.key]: willOpen }));\n    if (willOpen && !loadedGroups[group.key]) await loadGroupPage(group, 1, false);\n  };",
    "  const toggleGroup = async (group: AssetGroupSummary) => {\n    const willOpen = !expandedGroups[group.key];\n    setExpandedGroups((current) => ({ ...current, [group.key]: willOpen }));\n    if (willOpen && !loadedGroups[group.key]) await loadGroupPage(group, 1, false);\n  };\n\n  useEffect(() => {\n    const groupKey = String((location.state as { assetGroupKey?: string } | null)?.assetGroupKey || '').trim();\n    if (!groupKey || loadingGroups || !groups.length || restoredGroupRef.current === groupKey) return;\n\n    const group = groups.find((item) => item.key === groupKey);\n    if (!group) return;\n\n    restoredGroupRef.current = groupKey;\n    setExpandedGroups((current) => ({ ...current, [groupKey]: true }));\n    if (!loadedGroups[groupKey]) void loadGroupPage(group, 1, false);\n\n    const timer = window.setTimeout(() => {\n      document.getElementById(`asset-group-${groupKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n    }, 120);\n    return () => window.clearTimeout(timer);\n  }, [groups, loadingGroups, location.state]);",
    'AssetsPage restore group effect'
  );

  s = replaceOnce(
    s,
    "return <section key={group.key} className=\"overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[1px]\"",
    "return <section id={`asset-group-${group.key}`} key={group.key} className=\"scroll-mt-24 overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[1px]\"",
    'AssetsPage group anchor'
  );

  s = replaceOnce(
    s,
    "onView={() => navigate(`/assets/${asset.id}`)} onEdit={() => navigate(`/assets/${asset.id}/edit`)} onDelete={() => handleDelete(asset)} />)}</div>",
    "onView={() => navigate(`/assets/${asset.id}`, { state: { assetGroupKey: group.key } })} onEdit={() => navigate(`/assets/${asset.id}/edit`, { state: { assetGroupKey: group.key } })} onDelete={() => handleDelete(asset)} />)}</div>",
    'AssetsPage grouped card navigation state'
  );

  fs.writeFileSync(path, s);
}

// Asset view: back returns to the originating expanded group, and edit keeps the same context.
{
  const path = 'src/app/pages/ViewAssetPage.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    "import { useNavigate, useParams } from 'react-router';",
    "import { useLocation, useNavigate, useParams } from 'react-router';",
    'ViewAssetPage useLocation import'
  );

  s = replaceOnce(
    s,
    "export const ViewAssetPage: React.FC = () => {\n  const navigate = useNavigate();\n  const { assetId } = useParams();",
    "export const ViewAssetPage: React.FC = () => {\n  const navigate = useNavigate();\n  const location = useLocation();\n  const { assetId } = useParams();",
    'ViewAssetPage location'
  );

  s = replaceOnce(
    s,
    "  const canEdit = isAdmin || hasPermission('assets', 'canEdit');\n  const canDelete = isAdmin || hasPermission('assets', 'canDelete');",
    "  const canEdit = isAdmin || hasPermission('assets', 'canEdit');\n  const canDelete = isAdmin || hasPermission('assets', 'canDelete');\n  const assetGroupKey = String((location.state as { assetGroupKey?: string } | null)?.assetGroupKey || '').trim();\n\n  const returnToAssetList = (replace = false) => {\n    navigate('/assets/list', {\n      replace,\n      state: assetGroupKey ? { assetGroupKey } : undefined,\n    });\n  };",
    'ViewAssetPage return helper'
  );

  s = replaceOnce(
    s,
    "      navigate('/assets/list', { replace: true });",
    "      returnToAssetList(true);",
    'ViewAssetPage delete return'
  );

  s = replaceOnce(
    s,
    "            <Button className=\"mt-5\" variant=\"outline\" onClick={() => navigate('/assets/list')}>",
    "            <Button className=\"mt-5\" variant=\"outline\" onClick={() => returnToAssetList()}>",
    'ViewAssetPage missing asset return'
  );

  s = replaceOnce(
    s,
    "          <Button variant=\"outline\" onClick={() => navigate('/assets/list')}>",
    "          <Button variant=\"outline\" onClick={() => returnToAssetList()}>",
    'ViewAssetPage main return'
  );

  s = replaceOnce(
    s,
    "            <Button variant=\"outline\" onClick={() => navigate(`/assets/${asset.id}/edit`)}>",
    "            <Button variant=\"outline\" onClick={() => navigate(`/assets/${asset.id}/edit`, { state: assetGroupKey ? { assetGroupKey } : undefined })}>",
    'ViewAssetPage edit context'
  );

  fs.writeFileSync(path, s);
}

// Edit view: preserve group context when returning to the detail page after cancel/save.
{
  const path = 'src/app/pages/EditAssetPage.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    "import { useNavigate, useParams } from 'react-router';",
    "import { useLocation, useNavigate, useParams } from 'react-router';",
    'EditAssetPage useLocation import'
  );

  s = replaceOnce(
    s,
    "export const EditAssetPage: React.FC = () => {\n  const navigate = useNavigate();\n  const { assetId } = useParams();",
    "export const EditAssetPage: React.FC = () => {\n  const navigate = useNavigate();\n  const location = useLocation();\n  const { assetId } = useParams();\n  const assetGroupKey = String((location.state as { assetGroupKey?: string } | null)?.assetGroupKey || '').trim();",
    'EditAssetPage location context'
  );

  s = replaceOnce(
    s,
    "      navigate(`/assets/${assetId}`, { replace: true });",
    "      navigate(`/assets/${assetId}`, { replace: true, state: assetGroupKey ? { assetGroupKey } : undefined });",
    'EditAssetPage save return context'
  );

  s = replaceOnce(
    s,
    "        <Button variant=\"outline\" onClick={() => navigate(`/assets/${assetId}`)}><ArrowRight className=\"ml-2 h-4 w-4\" />العودة للعرض</Button>",
    "        <Button variant=\"outline\" onClick={() => navigate(`/assets/${assetId}`, { state: assetGroupKey ? { assetGroupKey } : undefined })}><ArrowRight className=\"ml-2 h-4 w-4\" />العودة للعرض</Button>",
    'EditAssetPage back context'
  );

  fs.writeFileSync(path, s);
}

console.log('Asset group return-state patch applied.');
