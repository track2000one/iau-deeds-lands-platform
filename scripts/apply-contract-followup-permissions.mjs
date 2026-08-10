import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

const replaceRequired = (content, search, replacement, label) => {
  if (content.includes(replacement)) return content;
  if (!content.includes(search)) {
    throw new Error(`Unable to apply patch: ${label}`);
  }
  return content.replace(search, replacement);
};

// 1) Register contract follow-up as an independently assignable module.
{
  const path = 'src/types/permissions.ts';
  let text = read(path);

  text = replaceRequired(
    text,
    "  | 'leased_buildings_in'\n  | 'assets'",
    "  | 'leased_buildings_in'\n  | 'contracts_follow_up'\n  | 'assets'",
    'permissions module union'
  );

  text = replaceRequired(
    text,
    "  leased_buildings_in: 'المباني المستأجرة',\n  assets: 'وحدة الأصول',",
    "  leased_buildings_in: 'المباني المستأجرة',\n  contracts_follow_up: 'متابعة العقود',\n  assets: 'وحدة الأصول',",
    'Arabic permission label'
  );

  text = replaceRequired(
    text,
    "  leased_buildings_in: 'Leased Buildings (In)',\n  assets: 'Assets Unit',",
    "  leased_buildings_in: 'Leased Buildings (In)',\n  contracts_follow_up: 'Contract Follow-up',\n  assets: 'Assets Unit',",
    'English permission label'
  );

  text = replaceRequired(
    text,
    "  leased_buildings_in: { ...NONE },\n  assets: { ...NONE },",
    "  leased_buildings_in: { ...NONE },\n  contracts_follow_up: { ...NONE },\n  assets: { ...NONE },",
    'empty permissions'
  );

  text = replaceRequired(
    text,
    "  leased_buildings_in: { ...FULL },\n  assets: { ...FULL },",
    "  leased_buildings_in: { ...FULL },\n  contracts_follow_up: { ...FULL },\n  assets: { ...FULL },",
    'admin permissions'
  );

  write(path, text);
}

// 2) Expose the module in the administrator permission matrix.
{
  const path = 'src/app/components/PermissionMatrix.tsx';
  let text = read(path);
  text = replaceRequired(
    text,
    "  'leased_buildings_out',\n  'leased_buildings_in',\n  'assets',",
    "  'leased_buildings_out',\n  'leased_buildings_in',\n  'contracts_follow_up',\n  'assets',",
    'permission matrix module list'
  );
  write(path, text);
}

// 3) Prevent direct URL access unless canView is granted.
{
  const path = 'src/app/routes.tsx';
  let text = read(path);
  text = replaceRequired(
    text,
    "      { path: 'contracts/follow-up', element: page(<ContractsFollowUpPage />) },",
    "      { path: 'contracts/follow-up', element: <PermissionGuard module=\"contracts_follow_up\" action=\"canView\">{page(<ContractsFollowUpPage />)}</PermissionGuard> },",
    'contract follow-up route guard'
  );
  write(path, text);
}

// 4) Hide both the sidebar item and the top-bar contract alert unless granted.
{
  const path = 'src/app/components/Layout.tsx';
  let text = read(path);

  text = replaceRequired(
    text,
    "    { id: 'contracts-followup', path: '/contracts/follow-up', icon: FileClock, label: ui('متابعة العقود', 'Contract Follow-up'), alwaysVisible: true },",
    "    { id: 'contracts-followup', path: '/contracts/follow-up', icon: FileClock, label: ui('متابعة العقود', 'Contract Follow-up'), module: 'contracts_follow_up', action: 'canView' },",
    'sidebar contract permission'
  );

  const bell = "              <Button title={ui('تنبيهات العقود', 'Contract Alerts')} aria-label={ui('تنبيهات العقود', 'Contract Alerts')} variant=\"ghost\" size=\"icon\" className=\"h-10 w-10 rounded-2xl relative\" onClick={() => navigate('/contracts/follow-up')}>\n                <Bell className=\"h-4 w-4\" />\n                <span className=\"absolute top-2 end-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background\" />\n              </Button>";
  const guardedBell = "              {(isAdmin || hasPermission('contracts_follow_up', 'canView')) && (\n                <Button title={ui('تنبيهات العقود', 'Contract Alerts')} aria-label={ui('تنبيهات العقود', 'Contract Alerts')} variant=\"ghost\" size=\"icon\" className=\"h-10 w-10 rounded-2xl relative\" onClick={() => navigate('/contracts/follow-up')}>\n                  <Bell className=\"h-4 w-4\" />\n                  <span className=\"absolute top-2 end-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background\" />\n                </Button>\n              )}";

  text = replaceRequired(text, bell, guardedBell, 'top-bar contract alert permission');
  write(path, text);
}

// 5) Respect canEdit inside the follow-up screen, not only canView.
{
  const path = 'src/app/pages/ContractsFollowUpPage.tsx';
  let text = read(path);

  text = replaceRequired(
    text,
    "import { useData } from '../../context/DataContext';",
    "import { useData } from '../../context/DataContext';\nimport { usePermissions } from '../../context/PermissionsContext';",
    'contracts page permissions import'
  );

  text = replaceRequired(
    text,
    "export const ContractsFollowUpPage: React.FC = () => {\n  const { leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn, loading } = useData();",
    "export const ContractsFollowUpPage: React.FC = () => {\n  const { leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn, loading } = useData();\n  const { isAdmin, hasPermission } = usePermissions();\n  const canEdit = isAdmin || hasPermission('contracts_follow_up', 'canEdit');",
    'contracts page edit permission state'
  );

  text = replaceRequired(
    text,
    "  const save = async () => {\n    if (!selected) return;",
    "  const save = async () => {\n    if (!selected) return;\n    if (!canEdit) {\n      toast.error('ليس لديك صلاحية لتعديل متابعة العقود.');\n      return;\n    }",
    'contracts save permission guard'
  );

  text = replaceRequired(
    text,
    '<NativeSelect value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ContractFollowUpStatus }))}>',
    '<NativeSelect disabled={!canEdit} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ContractFollowUpStatus }))}>',
    'contracts status disabled state'
  );

  text = replaceRequired(
    text,
    '<Input value={form.assignedTo || \'\'} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} placeholder="اسم الموظف أو الجهة" />',
    '<Input disabled={!canEdit} value={form.assignedTo || \'\'} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} placeholder="اسم الموظف أو الجهة" />',
    'contracts assignee disabled state'
  );

  text = replaceRequired(
    text,
    '<Input value={form.action || \'\'} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))} placeholder="مثال: مخاطبة المستأجر بشأن التجديد" />',
    '<Input disabled={!canEdit} value={form.action || \'\'} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))} placeholder="مثال: مخاطبة المستأجر بشأن التجديد" />',
    'contracts action disabled state'
  );

  text = replaceRequired(
    text,
    '<Input type="date" value={form.nextFollowUpDate || \'\'} onChange={(e) => setForm((p) => ({ ...p, nextFollowUpDate: e.target.value }))} />',
    '<Input disabled={!canEdit} type="date" value={form.nextFollowUpDate || \'\'} onChange={(e) => setForm((p) => ({ ...p, nextFollowUpDate: e.target.value }))} />',
    'contracts date disabled state'
  );

  text = replaceRequired(
    text,
    '<Textarea rows={4} value={form.notes || \'\'} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="سجل آخر تواصل، ما تم اتخاذه، والقرار المتوقع..." />',
    '<Textarea disabled={!canEdit} rows={4} value={form.notes || \'\'} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="سجل آخر تواصل، ما تم اتخاذه، والقرار المتوقع..." />',
    'contracts notes disabled state'
  );

  text = replaceRequired(
    text,
    '<Button onClick={save} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? \'جارٍ الحفظ...\' : \'حفظ إجراء المتابعة\'}</Button>',
    '<Button onClick={save} disabled={saving || !canEdit}><Save className="ml-2 h-4 w-4" />{saving ? \'جارٍ الحفظ...\' : canEdit ? \'حفظ إجراء المتابعة\' : \'عرض فقط\'}</Button>',
    'contracts save button disabled state'
  );

  write(path, text);
}

console.log('Contract follow-up permissions applied successfully.');
