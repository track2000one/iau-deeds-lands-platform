from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

old = '''      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="quran">المصاحف</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="requests">الطلبات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="tickets">البلاغات</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="leaves">الإجازات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="jobs">التوظيف</TabsTrigger>}
          <TabsTrigger value="map">الخريطة</TabsTrigger>
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="reports">التقارير</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="team">منسوبو المساجد</TabsTrigger>}
          {isAdmin && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          {role !== 'university_member' && role !== 'viewer' && <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>}
        </TabsList>
'''

new = '''      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="rounded-2xl border border-sky-200/80 bg-white/95 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-sky-700">التنقل بين أقسام الوحدة</p>
              <p className="mt-0.5 text-xs text-slate-500">اختر القسم المطلوب من القائمة</p>
            </div>
            {unreadNotifications > 0 && role !== 'university_member' && role !== 'viewer' && <Badge className="shrink-0 bg-amber-500 text-white">{unreadNotifications} إشعار</Badge>}
          </div>
          <NativeSelect
            className="h-12 w-full rounded-xl border-sky-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm focus:border-sky-400"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            aria-label="اختيار قسم وحدة المساجد والمصليات"
          >
            <option value="overview">الرئيسية</option>
            <option value="sites">المساجد والمصليات</option>
            {['head', 'supervisor', 'personnel'].includes(role) && <option value="quran">المصاحف</option>}
            {['head', 'supervisor', 'personnel'].includes(role) && <option value="requests">الطلبات</option>}
            {['head', 'supervisor'].includes(role) && <option value="tickets">البلاغات</option>}
            {['head', 'supervisor', 'personnel'].includes(role) && <option value="leaves">الإجازات</option>}
            {['head', 'supervisor'].includes(role) && <option value="jobs">التوظيف</option>}
            <option value="map">الخريطة</option>
            {['head', 'supervisor'].includes(role) && <option value="reports">التقارير</option>}
            {['head', 'supervisor'].includes(role) && <option value="team">منسوبو المساجد</option>}
            {isAdmin && <option value="roles">الأدوار التشغيلية</option>}
            {role !== 'university_member' && role !== 'viewer' && <option value="notifications">الإشعارات{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}</option>}
          </NativeSelect>
        </div>

        <TabsList className="hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2 sm:flex [&>[data-slot=tabs-trigger]]:min-w-max [&>[data-slot=tabs-trigger]]:flex-none">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="quran">المصاحف</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="requests">الطلبات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="tickets">البلاغات</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="leaves">الإجازات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="jobs">التوظيف</TabsTrigger>}
          <TabsTrigger value="map">الخريطة</TabsTrigger>
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="reports">التقارير</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="team">منسوبو المساجد</TabsTrigger>}
          {isAdmin && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          {role !== 'university_member' && role !== 'viewer' && <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>}
        </TabsList>
'''

if new in text:
    print('Mobile mosque navigation already fixed')
    raise SystemExit(0)

if old not in text:
    raise SystemExit('Mosque tabs navigation anchor not found')

text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Mosque mobile navigation patch applied')
