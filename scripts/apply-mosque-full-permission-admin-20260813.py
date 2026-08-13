from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')

old_api = "me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; isAdmin: boolean }>('/api/mosques/me'),"
new_api = "me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; isAdmin: boolean; fullPermissionAccess?: boolean; accessSource?: string }>('/api/mosques/me'),"
if old_api not in api:
    raise RuntimeError('mosques me type anchor not found')
api = api.replace(old_api, new_api, 1)

old_state = "  const [myPersonnelRole, setMyPersonnelRole] = useState<string | null>(null);\n"
new_state = "  const [myPersonnelRole, setMyPersonnelRole] = useState<string | null>(null);\n  const [fullPermissionAccess, setFullPermissionAccess] = useState(false);\n"
if old_state not in page:
    raise RuntimeError('fullPermissionAccess state anchor not found')
page = page.replace(old_state, new_state, 1)

old_load = "      setMyPersonnelRole(me.personnelRole || null);\n"
new_load = "      setMyPersonnelRole(me.personnelRole || null);\n      setFullPermissionAccess(Boolean(me.fullPermissionAccess && me.accessSource === 'module_permissions'));\n"
if old_load not in page:
    raise RuntimeError('me load anchor not found')
page = page.replace(old_load, new_load, 1)

old_badge = "<Badge variant=\"outline\" className=\"border-sky-300 bg-white text-sky-700\"><Shield className=\"ml-1 h-3.5 w-3.5\" />{role === 'personnel' && myPersonnelRole ? personnelRoleLabels[myPersonnelRole] || myPersonnelRole : roleLabels[role]}</Badge>"
new_badge = "<Badge variant=\"outline\" className=\"border-sky-300 bg-white text-sky-700\"><Shield className=\"ml-1 h-3.5 w-3.5\" />{fullPermissionAccess ? 'مسؤول الوحدة — صلاحية كاملة' : role === 'personnel' && myPersonnelRole ? personnelRoleLabels[myPersonnelRole] || myPersonnelRole : roleLabels[role]}</Badge>"
if old_badge not in page:
    raise RuntimeError('role badge anchor not found')
page = page.replace(old_badge, new_badge, 1)

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
