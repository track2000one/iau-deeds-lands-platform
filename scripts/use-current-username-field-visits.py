from pathlib import Path

# 1) API typing
api_path = Path('src/app/api/mosques.ts')
api = api_path.read_text(encoding='utf-8')
old = "me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; isAdmin: boolean; fullPermissionAccess?: boolean; accessSource?: string }>('/api/mosques/me'),"
new = "me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; username: string; isAdmin: boolean; fullPermissionAccess?: boolean; accessSource?: string }>('/api/mosques/me'),"
if 'username: string; isAdmin: boolean' not in api:
    if old not in api:
        raise SystemExit('mosqueApi.me type anchor not found')
    api = api.replace(old, new, 1)
api_path.write_text(api, encoding='utf-8')

# 2) Page: retain username returned by /me and pass it to field visits panel
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
page = page_path.read_text(encoding='utf-8')
old = """  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<MosqueModuleRole>('viewer');
  const [linkedSiteId, setLinkedSiteId] = useState<string | null>(null);"""
new = """  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<MosqueModuleRole>('viewer');
  const [currentUsername, setCurrentUsername] = useState('مستخدم');
  const [linkedSiteId, setLinkedSiteId] = useState<string | null>(null);"""
if 'const [currentUsername, setCurrentUsername]' not in page:
    if old not in page:
        raise SystemExit('MosquesUnitPage state anchor not found')
    page = page.replace(old, new, 1)

old = """      const me = await mosqueApi.me();
      setRole(me.role);
      setLinkedSiteId(me.siteId || null);"""
new = """      const me = await mosqueApi.me();
      setRole(me.role);
      setCurrentUsername(me.username || 'مستخدم');
      setLinkedSiteId(me.siteId || null);"""
if "setCurrentUsername(me.username || 'مستخدم');" not in page:
    if old not in page:
        raise SystemExit('MosquesUnitPage me anchor not found')
    page = page.replace(old, new, 1)

old = "<MosqueFieldVisitsPanel sites={sites} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete && role === 'head'} canPrint={canPrint} />"
new = "<MosqueFieldVisitsPanel sites={sites} currentUsername={currentUsername} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete && role === 'head'} canPrint={canPrint} />"
if 'currentUsername={currentUsername}' not in page:
    if old not in page:
        raise SystemExit('MosqueFieldVisitsPanel invocation anchor not found')
    page = page.replace(old, new, 1)
page_path.write_text(page, encoding='utf-8')

# 3) Field visit panel: one current user instead of hard-coded team
panel_path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
panel = panel_path.read_text(encoding='utf-8')

old = """type Props = {
  sites: MosqueSite[];
  canAdd: boolean;"""
new = """type Props = {
  sites: MosqueSite[];
  currentUsername: string;
  canAdd: boolean;"""
if 'currentUsername: string;' not in panel:
    if old not in panel:
        raise SystemExit('Props anchor not found')
    panel = panel.replace(old, new, 1)

old = """const emptyVisit = (items: MosqueFieldVisitItem[] = []): VisitForm => ({
  tourId: '',"""
new = """const emptyVisit = (items: MosqueFieldVisitItem[] = [], currentUsername = 'مستخدم'): VisitForm => ({
  tourId: '',"""
if "currentUsername = 'مستخدم'" not in panel:
    if old not in panel:
        raise SystemExit('emptyVisit signature anchor not found')
    panel = panel.replace(old, new, 1)

panel = panel.replace("teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي',", "teamMembers: currentUsername || 'مستخدم',", 1)

old = "export const MosqueFieldVisitsPanel: React.FC<Props> = ({ sites, canAdd, canEdit, canDelete, canPrint }) => {"
new = "export const MosqueFieldVisitsPanel: React.FC<Props> = ({ sites, currentUsername, canAdd, canEdit, canDelete, canPrint }) => {"
if '({ sites, currentUsername, canAdd' not in panel:
    if old not in panel:
        raise SystemExit('panel component props anchor not found')
    panel = panel.replace(old, new, 1)

# initial tour form and openTour reset
panel = panel.replace("teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي', notes: '', siteIds: [] as string[],", "teamMembers: currentUsername || 'مستخدم', notes: '', siteIds: [] as string[],", 1)
panel = panel.replace("const [visitForm, setVisitForm] = React.useState<VisitForm>(() => emptyVisit());", "const [visitForm, setVisitForm] = React.useState<VisitForm>(() => emptyVisit([], currentUsername));", 1)
panel = panel.replace("scope: '', teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي', notes: '', siteIds: [],", "scope: '', teamMembers: currentUsername || 'مستخدم', notes: '', siteIds: [],", 1)
panel = panel.replace("setVisitForm({ ...emptyVisit(template), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });", "setVisitForm({ ...emptyVisit(template, currentUsername), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });", 1)

# Validation wording: team is now automatically derived from logged-in username.
panel = panel.replace("toast.error('أكمل عنوان الجولة وتاريخها والفريق واختر موقعًا واحدًا على الأقل');", "toast.error('أكمل عنوان الجولة وتاريخها واختر موقعًا واحدًا على الأقل');", 1)
panel = panel.replace("toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة وأعضاء الفريق');", "toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة');", 1)

# Make the current user read-only in new forms. Historical visits keep their stored team values when edited.
old = '<div className="md:col-span-2"><Field label="أعضاء الفريق *"><Textarea rows={2} value={tourForm.teamMembers} onChange={(event) => setTourForm({ ...tourForm, teamMembers: event.target.value })} placeholder="افصل بين الأسماء بفاصلة" /></Field></div>'
new = '<div className="md:col-span-2"><Field label="منفذ الجولة"><Input value={tourForm.teamMembers} readOnly className="bg-slate-100 font-semibold text-slate-700" /></Field><p className="mt-1 text-[11px] text-slate-500">يُسجل اسم المستخدم الحالي تلقائيًا دون الحاجة لكتابة جميع أعضاء الفريق.</p></div>'
if 'label="منفذ الجولة"' not in panel:
    if old not in panel:
        raise SystemExit('tour team field anchor not found')
    panel = panel.replace(old, new, 1)

old = '<div className="md:col-span-3"><Field label="أعضاء الفريق *"><Textarea rows={2} value={visitForm.teamMembers} onChange={(event) => setVisitForm({ ...visitForm, teamMembers: event.target.value })} /></Field></div>'
new = '<div className="md:col-span-3"><Field label="منفذ الزيارة"><Input value={visitForm.teamMembers} readOnly className="bg-slate-100 font-semibold text-slate-700" /></Field><p className="mt-1 text-[11px] text-slate-500">يُسجل اسم المستخدم الحالي تلقائيًا. السجلات السابقة تحتفظ بأسماء الفريق المحفوظة تاريخيًا.</p></div>'
if 'label="منفذ الزيارة"' not in panel:
    if old not in panel:
        raise SystemExit('visit team field anchor not found')
    panel = panel.replace(old, new, 1)

panel_path.write_text(panel, encoding='utf-8')
print('Current username field visit UI applied')
