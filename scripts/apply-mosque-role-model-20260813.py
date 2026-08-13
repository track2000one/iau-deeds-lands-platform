from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
public_path = Path('src/app/pages/MosquesPublicPage.tsx')

api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')
public = public_path.read_text(encoding='utf-8')


def r1(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'Anchor not found: {label}')
    return text.replace(old, new, 1)


def block(text, start, end, new, label):
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f'Start anchor not found: {label}')
    b = text.find(end, a)
    if b < 0:
        raise RuntimeError(f'End anchor not found: {label}')
    return text[:a] + new + '\n\n' + text[b:]

# ---------------- API types / methods ----------------
api = r1(api,
    "export type MosqueModuleRole = 'head' | 'supervisor' | 'personnel' | 'viewer';",
    "export type MosqueModuleRole = 'head' | 'supervisor' | 'personnel' | 'university_member' | 'viewer';",
    'module role type')
api = r1(api,
    "siteType: 'mosque' | 'prayer_room';",
    "siteType: 'mosque' | 'jami' | 'prayer_room';",
    'site type')

assignment_type = """export type MosqueAssignment = {
  id: string;
  userId: string;
  role: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
  site?: { name: string } | null;
};
"""
staff_type = assignment_type + """

export type MosqueStaffUser = {
  uid: string;
  username: string;
  email: string;
  isActive: boolean;
  moduleRole: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
};
"""
api = r1(api, assignment_type, staff_type, 'staff user type')

old_dash = """export type MosqueDashboard = {
  role: MosqueModuleRole;
  siteId?: string | null;
  stats: {
    sites: number;
    newRequests: number;
    reviewRequests: number;
    approvedRequests: number;
    lateRequests: number;
    openTickets: number;
    pendingLeaves: number;
    jobs: number;
  };
  recentRequests: MosqueRequest[];
  recentTickets: MosqueTicket[];
};

export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'city' | 'district' | 'campusLocation' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;
"""
new_dash = """export type MosqueDashboard = {
  role: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
  stats: {
    sites: number;
    newRequests: number;
    reviewRequests: number;
    approvedRequests: number;
    lateRequests: number;
    openTickets: number;
    pendingLeaves: number;
    jobs: number;
    managedSites: number;
    assignedRequests: number;
    urgentRequests: number;
    newTickets: number;
    myRequests: number;
    myLeaves: number;
  };
  recentRequests: MosqueRequest[];
  recentTickets: MosqueTicket[];
  linkedSite?: MosqueSite | null;
  managedSiteIds?: string[];
};

export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'city' | 'district' | 'campusLocation' | 'area' | 'capacity' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;
"""
api = r1(api, old_dash, new_dash, 'dashboard type')
api = r1(api,
    "  createPersonnel: (input: Record<string, unknown>) => apiJson<MosquePersonnel>('/api/mosques/personnel', { method: 'POST', body: JSON.stringify(input) }),\n  assignments: () => apiJson<MosqueAssignment[]>('/api/mosques/assignments'),",
    "  createPersonnel: (input: Record<string, unknown>) => apiJson<MosquePersonnel>('/api/mosques/personnel', { method: 'POST', body: JSON.stringify(input) }),\n  createPersonnelAccount: (input: Record<string, unknown>) => apiJson<{ personnel: MosquePersonnel; user: { uid: string; username: string; email: string; isActive: boolean }; accountCreated: boolean; message: string }>('/api/mosques/personnel/account', { method: 'POST', body: JSON.stringify(input) }),\n  staffDirectory: () => apiJson<MosqueStaffUser[]>('/api/mosques/staff-directory'),\n  assignments: () => apiJson<MosqueAssignment[]>('/api/mosques/assignments'),",
    'personnel account api')

# ---------------- Unit page ----------------
page = page.replace("import { useAuth } from '../../context/AuthContext';\n", '')
page = r1(page,
    "  type MosqueSite,\n  type MosqueTicket,",
    "  type MosqueSite,\n  type MosqueStaffUser,\n  type MosqueTicket,",
    'staff import')
page = r1(page,
    "  personnel: 'منسوب مسجد / مصلى',\n  viewer: 'عرض فقط',",
    "  personnel: 'منسوب المسجد أو المصلى',\n  university_member: 'منسوب الجامعة',\n  viewer: 'منسوب الجامعة',",
    'role labels')
page = r1(page,
    "const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', prayer_room: 'مصلى' };",
    "const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى' };",
    'site type labels')
page = r1(page,
    "  name: '', siteType: 'mosque', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',\n  status: 'active', imamName: '', muezzinName: '', khateebName: '', contactPhone: '', notes: '',",
    "  name: '', siteType: 'mosque', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',\n  status: 'active', imamName: '', muezzinName: '', khateebName: '', contactPhone: '', supervisorUserId: '', notes: '',",
    'empty site')
page = page.replace("  const { users } = useAuth();\n", '')
page = r1(page,
    "  const [assignments, setAssignments] = useState<MosqueAssignment[]>([]);\n  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);",
    "  const [assignments, setAssignments] = useState<MosqueAssignment[]>([]);\n  const [staffUsers, setStaffUsers] = useState<MosqueStaffUser[]>([]);\n  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);",
    'staff state')

old_load_start = "  const loadAll = async () => {"
old_load_end = "\n  useEffect(() => { loadAll(); }, []);"
new_load = """  const loadAll = async () => {
    setLoading(true);
    try {
      const me = await mosqueApi.me();
      setRole(me.role);
      setLinkedSiteId(me.siteId || null);
      setMyPersonnelRole(me.personnelRole || null);

      const [dash, siteRows, noticeRows] = await Promise.all([
        mosqueApi.dashboard(), mosqueApi.sites(), mosqueApi.notifications(),
      ]);
      setDashboard(dash);
      setSites(siteRows);
      setNotifications(noticeRows);

      if (me.role === 'head' || me.role === 'supervisor') {
        const [requestRows, ticketRows, leaveRows, personRows, staffRows] = await Promise.all([
          mosqueApi.requests(), mosqueApi.tickets(), mosqueApi.leaves(), mosqueApi.personnel(), mosqueApi.staffDirectory(),
        ]);
        setRequests(requestRows);
        setTickets(ticketRows);
        setLeaves(leaveRows);
        setPersonnel(personRows);
        setStaffUsers(staffRows);
        try { setJobs(await mosqueApi.jobs()); } catch { setJobs([]); }
        if (me.role === 'head') {
          try {
            const rows = await mosqueApi.assignments();
            setAssignments(rows);
            setAssignmentDrafts(Object.fromEntries(rows.map((item) => [item.userId, { role: item.role, siteId: item.siteId || '', personnelRole: item.personnelRole || 'imam' }])));
          } catch { setAssignments([]); setAssignmentDrafts({}); }
        } else {
          setAssignments([]);
          setAssignmentDrafts({});
        }
      } else if (me.role === 'personnel') {
        const [requestRows, leaveRows] = await Promise.all([mosqueApi.requests(), mosqueApi.leaves()]);
        setRequests(requestRows);
        setLeaves(leaveRows);
        setTickets([]);
        setJobs([]);
        setPersonnel([]);
        setAssignments([]);
        setStaffUsers([]);
      } else {
        setRequests([]);
        setTickets([]);
        setLeaves([]);
        setJobs([]);
        setPersonnel([]);
        setAssignments([]);
        setStaffUsers([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات وحدة المساجد');
    } finally {
      setLoading(false);
    }
  };"""
page = block(page, old_load_start, old_load_end, new_load, 'loadAll')

page = r1(page,
    "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', contactPhone: site.contactPhone || '', notes: site.notes || '',",
    "      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',",
    'open site supervisor')

old_save_site = """      if (editingSite) await mosqueApi.updateSite(editingSite.id, payload); else await mosqueApi.createSite(payload);
      toast.success(editingSite ? 'تم تحديث بيانات الموقع' : 'تمت إضافة المسجد/المصلى');
      setSiteDialog(false);
      await loadAll();"""
new_save_site = """      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, { ...payload, images: editingSite.images || [] })
        : await mosqueApi.createSite(payload);
      toast.success(editingSite ? 'تم تحديث بيانات الموقع' : 'تمت إضافة الموقع وإنشاء QR تلقائيًا');
      setSiteDialog(false);
      await loadAll();
      if (!editingSite) setQrSite(savedSite);"""
page = r1(page, old_save_site, new_save_site, 'save site auto qr')

# Create a login-enabled personnel account from inside the unit.
old_save_personnel = """  const savePersonnel = async () => {
    if (!personnelForm.siteId || !personnelForm.name.trim()) return toast.error('الموقع والاسم مطلوبان');
    setSaving(true);
    try { await mosqueApi.createPersonnel(personnelForm); toast.success('تمت إضافة منسوب المسجد'); setPersonnelDialog(false); await loadAll(); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر الإضافة'); } finally { setSaving(false); }
  };"""
new_save_personnel = """  const savePersonnel = async () => {
    if (!personnelForm.siteId || !personnelForm.name.trim() || !personnelForm.email.trim()) return toast.error('الموقع والاسم والبريد الإلكتروني مطلوبة لإنشاء حساب المنسوب');
    setSaving(true);
    try {
      const result = await mosqueApi.createPersonnelAccount(personnelForm);
      toast.success(result.message || 'تمت إضافة منسوب المسجد وربط حسابه');
      setPersonnelDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إضافة منسوب المسجد'); } finally { setSaving(false); }
  };"""
page = r1(page, old_save_personnel, new_save_personnel, 'save personnel account')

# Operational role is authoritative inside the unit.
page = page.replace("{canAdd && ['head', 'supervisor'].includes(role) && <Button", "{['head', 'supervisor'].includes(role) && <Button")
page = page.replace("{canAdd && role !== 'viewer' && <div className=\"flex justify-end\"><Button", "{(role === 'personnel' || ['head', 'supervisor'].includes(role)) && <div className=\"flex justify-end\"><Button")
page = page.replace("onStatus={canEdit && ['head', 'supervisor'].includes(role) ?", "onStatus={['head', 'supervisor'].includes(role) ?")
page = page.replace("extraAction={canAdd && ['head', 'supervisor'].includes(role)", "extraAction={['head', 'supervisor'].includes(role)")
page = page.replace("{canAdd && <div className=\"flex justify-end\"><Button", "{['head', 'supervisor'].includes(role) && <div className=\"flex justify-end\"><Button")

# Add role-derived convenience values before render.
page = r1(page,
    "  const unreadNotifications = notifications.filter((item) => !item.isRead).length;",
    "  const unreadNotifications = notifications.filter((item) => !item.isRead).length;\n  const linkedSite = dashboard?.linkedSite || visibleSites[0] || null;\n  const activeMyRequests = requests.filter((item) => !['closed', 'rejected'].includes(item.status));\n  const maintenanceMyRequests = requests.filter((item) => item.requestType === 'maintenance' && !['closed', 'rejected'].includes(item.status));",
    'role derived values')

# Role-specific KPI ribbon.
old_stats_start = "      <div className=\"grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8\">"
old_stats_end = "\n\n      <Tabs defaultValue=\"overview\""
new_stats = """      {role === 'head' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} />
        <Stat title="طلبات جديدة" value={dashboard?.stats.newRequests || 0} icon={ClipboardList} />
        <Stat title="تحت المراجعة" value={dashboard?.stats.reviewRequests || 0} icon={Clock3} />
        <Stat title="معتمدة" value={dashboard?.stats.approvedRequests || 0} icon={CheckCircle2} />
        <Stat title="طلبات متأخرة" value={dashboard?.stats.lateRequests || 0} icon={AlertTriangle} />
        <Stat title="بلاغات مفتوحة" value={dashboard?.stats.openTickets || 0} icon={MessageSquare} />
        <Stat title="إجازات معلقة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="طلبات توظيف" value={dashboard?.stats.jobs || 0} icon={Briefcase} />
      </div>}

      {role === 'supervisor' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat title="المساجد التابعة لي" value={dashboard?.stats.managedSites || 0} icon={Building2} />
        <Stat title="طلبات تحتاج متابعة" value={dashboard?.stats.assignedRequests || 0} icon={ClipboardList} />
        <Stat title="بلاغات جديدة" value={dashboard?.stats.newTickets || 0} icon={MessageSquare} />
        <Stat title="طلبات عاجلة" value={dashboard?.stats.urgentRequests || 0} icon={AlertTriangle} />
        <Stat title="إجازات للمراجعة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="التنبيهات" value={unreadNotifications} icon={Bell} />
      </div>}

      {role === 'personnel' && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat title="الموقع المرتبط" value={linkedSite ? 1 : 0} icon={Building2} />
        <Stat title="طلباتي الحالية" value={dashboard?.stats.myRequests || activeMyRequests.length} icon={ClipboardList} />
        <Stat title="طلبات الصيانة" value={maintenanceMyRequests.length} icon={Wrench} />
        <Stat title="الإجازات الحالية" value={dashboard?.stats.myLeaves || 0} icon={CalendarDays} />
        <Stat title="الإشعارات" value={unreadNotifications} icon={Bell} />
      </div>}"""
page = block(page, old_stats_start, old_stats_end, new_stats, 'role stats')

# Role-aware navigation tabs.
old_tabs = """        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
          <TabsTrigger value="requests">الطلبات</TabsTrigger>
          <TabsTrigger value="tickets">البلاغات</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
          {(role === 'head' || role === 'supervisor') && <TabsTrigger value="jobs">التوظيف</TabsTrigger>}
          <TabsTrigger value="map">الخريطة</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
          {(role === 'head' || role === 'supervisor') && <TabsTrigger value="team">المنسوبون</TabsTrigger>}
          {role === 'head' && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>
        </TabsList>"""
new_tabs = """        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="requests">الطلبات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="tickets">البلاغات</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="leaves">الإجازات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="jobs">التوظيف</TabsTrigger>}
          <TabsTrigger value="map">الخريطة</TabsTrigger>
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="reports">التقارير</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="team">منسوبو المساجد</TabsTrigger>}
          {role === 'head' && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          {role !== 'university_member' && role !== 'viewer' && <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>}
        </TabsList>"""
page = r1(page, old_tabs, new_tabs, 'tabs')

# Role-specific overview.
overview_start = '        <TabsContent value="overview" className="space-y-4">'
overview_end = '        <TabsContent value="sites" className="space-y-4">'
new_overview = """        <TabsContent value="overview" className="space-y-4">
          {role === 'head' && <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>آخر طلبات الصيانة والاحتياج</CardTitle><CardDescription>أحدث العمليات داخل منظومة الوحدة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حتى الآن" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>آخر البلاغات</CardTitle><CardDescription>بلاغات الزوار ومنسوبي الجامعة التي تحتاج متابعة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد بلاغات حتى الآن" />}</CardContent></Card>
            </div>
            <Card className={card3d}><CardHeader><CardTitle>إدارة المنظومة</CardTitle><CardDescription>رئيس الوحدة يملك الرؤية الشاملة والتقارير والإعدادات واعتماد الإجراءات.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Rule title="الإشراف الشامل" text="متابعة جميع المساجد والمصليات والطلبات والبلاغات." /><Rule title="الاعتماد" text="اعتماد الطلبات والإجازات والقرارات النهائية." /><Rule title="المؤشرات" text="متابعة الأداء والطلبات المتأخرة والحالات العاجلة." /><Rule title="المنسوبون" text="إدارة المشرفين ومنسوبي المساجد وربطهم بالمواقع." /></CardContent></Card>
          </>}

          {role === 'supervisor' && <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>الطلبات التي تحتاج متابعة</CardTitle><CardDescription>طلبات المساجد التابعة لك حسب الإسناد التشغيلي.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات معلقة" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>البلاغات الجديدة</CardTitle><CardDescription>متابعة البلاغات والشكاوى للمواقع التابعة لك.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد بلاغات جديدة" />}</CardContent></Card>
            </div>
            <Card className={card3d}><CardHeader><CardTitle>مهام مشرف الوحدة</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Rule title="المراجعة اليومية" text="استقبال الطلبات ومراجعة الصيانة والاحتياجات." /><Rule title="البلاغات" text="متابعة البلاغات والشكاوى وتحديث حالاتها." /><Rule title="المنسوبون" text="التواصل مع منسوبي المساجد وإضافة الحسابات التشغيلية." /><Rule title="التقارير" text="رفع تقارير دورية عن المساجد التابعة لك." /></CardContent></Card>
          </>}

          {role === 'personnel' && <>
            <Card className={card3d}><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />بيانات المسجد أو المصلى المرتبط بحسابي</CardTitle><CardDescription>{myPersonnelRole ? `الصفة التشغيلية: ${personnelRoleLabels[myPersonnelRole] || myPersonnelRole}` : 'منسوب مسجد أو مصلى'}</CardDescription></CardHeader><CardContent>{linkedSite ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="الاسم" value={linkedSite.name} /><Info label="النوع" value={siteTypeLabels[linkedSite.siteType] || linkedSite.siteType} /><Info label="الموقع" value={[linkedSite.campusLocation, linkedSite.city, linkedSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="الحالة" value={siteStatusLabels[linkedSite.status] || linkedSite.status} /></div> : <Empty text="لم يتم ربط حسابك بمسجد أو مصلى حتى الآن" />}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>طلباتي الحالية</CardTitle><CardDescription>متابعة طلبات الاحتياج والصيانة التي قدمتها.</CardDescription></CardHeader><CardContent className="space-y-2">{activeMyRequests.length ? activeMyRequests.slice(0, 5).map((item) => <MiniRow key={item.id} title={item.requestNumber} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حالية" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>الخدمات السريعة</CardTitle><CardDescription>تقديم طلب أو إجازة/اعتذار واستقبال الإشعارات.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button className={button3d} onClick={openRequestDialog}><Wrench className="ml-2 h-4 w-4" />تقديم طلب جديد</Button><Button variant="outline" className={button3d} onClick={openLeaveDialog}><CalendarDays className="ml-2 h-4 w-4" />إجازة أو اعتذار</Button>{linkedSite?.mapUrl && <Button variant="outline" className={button3d} onClick={() => window.open(linkedSite.mapUrl!, '_blank')}><MapPin className="ml-2 h-4 w-4" />موقع المسجد</Button>}</CardContent></Card>
            </div>
          </>}

          {(role === 'university_member' || role === 'viewer') && <Card className={card3d}><CardHeader><CardTitle>منسوب الجامعة</CardTitle><CardDescription>الموظف، عضو هيئة التدريس، أو الطالب.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-slate-600">يمكنك الاطلاع على المعلومات العامة ومواقع المساجد والمصليات، وإرسال بلاغ أو شكوى ومتابعته برقم المتابعة. البيانات الداخلية والتقارير وبيانات الموظفين غير متاحة لهذا الدور.</p><div className="flex flex-wrap gap-3"><Button className={button3d} onClick={() => navigate('/mosques/public')}><MessageSquare className="ml-2 h-4 w-4" />إرسال أو متابعة بلاغ</Button><Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><MapPin className="ml-2 h-4 w-4" />معلومات ومواقع المساجد</Button></div></CardContent></Card>}
        </TabsContent>"""
page = block(page, overview_start, overview_end, new_overview, 'overview')

# Site dialog wording, Jami type, supervisor assignment.
page = page.replace('إضافة مسجد / مصلى جديد', 'إضافة مسجد / جامع / مصلى جديد')
page = page.replace('تعديل بيانات المسجد / المصلى', 'تعديل بيانات المسجد / الجامع / المصلى')
page = page.replace('تعريف المسجد أو المصلى وحالته وموقعه الإداري داخل الجامعة.', 'تعريف المسجد أو الجامع أو المصلى وحالته وموقعه الإداري داخل الجامعة.')
page = page.replace('اسم المسجد / المصلى *', 'اسم المسجد / الجامع / المصلى *')
page = r1(page,
    '<Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value })}><option value="mosque">مسجد</option><option value="prayer_room">مصلى</option></NativeSelect></Field>',
    '<Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value })}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect></Field>',
    'jami option')
location_field = '<Field label="الموقع داخل الجامعة"><Input className="h-11" value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>'
location_plus_supervisor = location_field + """
                {role === 'head' && <Field label="المشرف المسؤول عن الموقع"><NativeSelect className="h-11" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value="">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}"""
page = r1(page, location_field, location_plus_supervisor, 'site supervisor select')

# Team and role management uses the unit's staff directory rather than global admin-only user list.
page = page.replace("users.filter((user) => user.role !== 'admin').map((user) => {", "staffUsers.map((user) => {")
page = page.replace("!users.filter((user) => user.role !== 'admin').length", "!staffUsers.length")
page = page.replace('<option value="viewer">عرض فقط</option><option value="personnel">منسوب مسجد / مصلى</option>', '<option value="university_member">منسوب الجامعة</option><option value="personnel">منسوب المسجد أو المصلى</option>')

# Personnel dialog explicitly creates a login account and requires email.
page = page.replace('إضافة منسوب مسجد / مصلى</DialogTitle><DialogDescription>سجل المنسوب التشغيلي وربطه بالموقع مع بيانات التواصل والصفة داخل المسجد أو المصلى.</DialogDescription>', 'إضافة منسوب مسجد / مصلى</DialogTitle><DialogDescription>يتم إنشاء أو ربط حساب دخول للمنسوب بواسطة رئيس الوحدة أو المشرف، ثم ربطه بالموقع وصفته التشغيلية.</DialogDescription>')
page = page.replace('<Field label="البريد الإلكتروني"><Input className="h-11" type="email" inputMode="email"', '<Field label="البريد الإلكتروني *"><Input className="h-11" type="email" inputMode="email"')
page = page.replace('هذا السجل هو المرجع التشغيلي للمنسوب وبيانات التواصل. أما أسماء الإمام والمؤذن والخطيب داخل سجل المسجد فهي بيانات تعريفية مختصرة للموقع.', 'عند الحفظ يتم إنشاء حساب دخول جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. الحساب الجديد يستلم رابط التفعيل وبيانات الدخول عبر البريد الإلكتروني.')

# Rich permanent QR dialog. The QR points to a public-token URL so edits never require reprinting the code.
qr_start = '      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>'
qr_end = '      <Dialog open={personnelDialog} onOpenChange={setPersonnelDialog}>'
new_qr = """      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[620px]">
          <DialogHeader><DialogTitle>QR / الباركود التلقائي — {qrSite?.name}</DialogTitle><DialogDescription>يُنشأ الرمز تلقائيًا مع سجل المسجد أو الجامع أو المصلى، ويرتبط بالسجل الدائم لعرض أحدث بياناته وتقديم البلاغات.</DialogDescription></DialogHeader>
          {qrSite && <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /><p className="break-all text-center text-xs text-muted-foreground" dir="ltr">{publicUrlForSite(qrSite)}</p></div>
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="النوع" value={siteTypeLabels[qrSite.siteType] || qrSite.siteType} /><Info label="الموقع" value={[qrSite.campusLocation, qrSite.city, qrSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="المساحة" value={qrSite.area ? `${qrSite.area} م²` : '-'} /><Info label="الإحداثيات" value={qrSite.latitude != null && qrSite.longitude != null ? `${qrSite.latitude}, ${qrSite.longitude}` : '-'} /></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">الرمز دائم ولا يحتاج إلى إعادة إنشائه عند تعديل بيانات الموقع؛ لأنه يفتح السجل الحالي عبر رمز عام آمن، ولا يضع بيانات الموظفين أو البيانات الداخلية داخل الباركود.</div>
            <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة الرمز</Button></div>
          </div>}
        </DialogContent>
      </Dialog>"""
page = block(page, qr_start, qr_end, new_qr, 'qr dialog')

# ---------------- Public / visitor page ----------------
public = r1(public,
    "const jobTypes = { imam: 'إمام', muezzin: 'مؤذن', khateeb: 'خطيب', collaborator: 'متعاون', administrative: 'وظيفة إدارية' };",
    "const jobTypes = { imam: 'إمام', muezzin: 'مؤذن', khateeb: 'خطيب', collaborating_khateeb: 'خطيب متعاون', administrative: 'وظيفة إدارية' };\nconst siteTypeLabels: Record<string, string> = { mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى' };",
    'public labels')
public = public.replace('دخول منسوبي الوحدة</Button>', 'دخول منسوبي الوحدة والمساجد</Button>')
public = public.replace('المسجد / المصلى المرتبط بالرمز', 'المسجد / الجامع / المصلى المرتبط بالرمز')
public = public.replace('المسجد / المصلى *', 'المسجد / الجامع / المصلى *')

old_selected = """        {selectedSite && qrSiteToken && <Card className={`${shell} border-sky-300`}><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><MapPin className="h-6 w-6" /></div><div><p className="text-xs text-muted-foreground">المسجد / الجامع / المصلى المرتبط بالرمز</p><h2 className="text-xl font-black">{selectedSite.name}</h2><p className="text-sm text-muted-foreground">{selectedSite.city || ''} — {selectedSite.district || ''}</p></div></CardContent></Card>}"""
new_selected = """        {selectedSite && qrSiteToken && <Card className={`${shell} border-sky-300`}><CardContent className="p-5"><div className="flex items-start gap-4"><div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><MapPin className="h-6 w-6" /></div><div className="flex-1"><p className="text-xs text-muted-foreground">الموقع المرتبط بالـ QR</p><h2 className="text-xl font-black">{selectedSite.name}</h2><p className="text-sm text-muted-foreground">{siteTypeLabels[selectedSite.siteType] || selectedSite.siteType} — {[selectedSite.campusLocation, selectedSite.city, selectedSite.district].filter(Boolean).join(' — ')}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline">المساحة: {selectedSite.area ? `${selectedSite.area} م²` : 'غير محددة'}</Badge><Badge variant="outline">السعة: {selectedSite.capacity || 'غير محددة'}</Badge>{selectedSite.mapUrl && <Button size="sm" variant="outline" onClick={() => window.open(selectedSite.mapUrl!, '_blank')}><MapPin className="ml-1 h-3.5 w-3.5" />فتح على الخريطة</Button>}</div></div></div></CardContent></Card>}"""
public = r1(public, old_selected, new_selected, 'public selected site card')

old_public_tabs = '<TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white p-2"><TabsTrigger value="report">تقديم بلاغ</TabsTrigger><TabsTrigger value="track">متابعة بلاغ</TabsTrigger><TabsTrigger value="jobs">التوظيف / التعاون</TabsTrigger><TabsTrigger value="track-job">متابعة التوظيف</TabsTrigger></TabsList>'
new_public_tabs = '<TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white p-2"><TabsTrigger value="report">تقديم بلاغ</TabsTrigger><TabsTrigger value="track">متابعة بلاغ</TabsTrigger><TabsTrigger value="locations">المساجد والمواقع</TabsTrigger><TabsTrigger value="jobs">التوظيف / التعاون</TabsTrigger><TabsTrigger value="track-job">متابعة التوظيف</TabsTrigger></TabsList>'
public = r1(public, old_public_tabs, new_public_tabs, 'public tabs')

report_anchor = '          <TabsContent value="report">'
locations_content = """          <TabsContent value="locations">
            <Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />المساجد والجوامع والمصليات</CardTitle><CardDescription>معلومات عامة ومواقع يمكن لمنسوبي الجامعة والزوار الاطلاع عليها دون كشف أي بيانات داخلية.</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sites.map((site) => <div key={site.publicToken} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{site.name}</h3><p className="mt-1 text-xs text-muted-foreground">{siteTypeLabels[site.siteType] || site.siteType}</p></div><MapPin className="h-5 w-5 text-sky-600" /></div><p className="mt-3 text-sm text-slate-600">{[site.campusLocation, site.city, site.district].filter(Boolean).join(' — ') || 'الموقع غير موضح'}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">السعة: {site.capacity || '-'}</Badge>{site.mapUrl && <Button size="sm" variant="outline" onClick={() => window.open(site.mapUrl!, '_blank')}><MapPin className="ml-1 h-3.5 w-3.5" />الخريطة</Button>}</div></div>)}</div></CardContent></Card>
          </TabsContent>

""" + report_anchor
public = r1(public, report_anchor, locations_content, 'public locations tab')

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
public_path.write_text(public, encoding='utf-8')
print('Applied corrected mosque unit role dashboards, visitor/university member boundaries, staff account flow, Jami type, and automatic QR UX')
