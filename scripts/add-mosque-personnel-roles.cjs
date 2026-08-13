const fs = require('fs');
const path = 'src/app/pages/MosquesUnitPage.tsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes("const roleLabels: Record<MosqueModuleRole, string>")) throw new Error('roleLabels anchor missing');
if (!s.includes("const siteTypeLabels")) throw new Error('siteTypeLabels anchor missing');

if (!s.includes("const personnelRoleLabels")) {
  s = s.replace(
    "const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', prayer_room: 'مصلى' };",
    "const personnelRoleLabels: Record<string, string> = { imam: 'إمام', muezzin: 'مؤذن', khateeb: 'خطيب', collaborating_khateeb: 'خطيب متعاون', collaborator: 'خطيب متعاون' };\nconst siteTypeLabels: Record<string, string> = { mosque: 'مسجد', prayer_room: 'مصلى' };"
  );
}

const assignmentStateAnchor = "  const [personnelForm, setPersonnelForm] = useState({ siteId: '', name: '', role: 'imam', mobile: '', email: '' });\n";
if (!s.includes(assignmentStateAnchor)) throw new Error('personnelForm anchor missing');
if (!s.includes('const [assignmentDrafts')) {
  s = s.replace(assignmentStateAnchor, assignmentStateAnchor + "  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { role: MosqueModuleRole; siteId: string; personnelRole: string }>>({});\n");
}

const assignmentLoad = "        try { setAssignments(await mosqueApi.assignments()); } catch { setAssignments([]); }";
if (!s.includes(assignmentLoad)) throw new Error('assignment loading anchor missing');
s = s.replace(assignmentLoad, "        try {\n          const rows = await mosqueApi.assignments();\n          setAssignments(rows);\n          setAssignmentDrafts(Object.fromEntries(rows.map((item) => [item.userId, { role: item.role, siteId: item.siteId || '', personnelRole: item.personnelRole || 'imam' }])));\n        } catch { setAssignments([]); setAssignmentDrafts({}); }");

const helperStart = s.indexOf("  const setUserAssignment = async (userId: string, roleValue: MosqueModuleRole, siteId?: string) => {");
if (helperStart < 0) throw new Error('setUserAssignment helper missing');
const helperEnd = s.indexOf("\n  const exportReportExcel", helperStart);
if (helperEnd < 0) throw new Error('setUserAssignment helper end missing');
const helper = `  const setUserAssignment = async (userId: string, roleValue: MosqueModuleRole, siteId?: string, personnelRole?: string) => {\n    try {\n      if (roleValue === 'personnel' && !siteId) {\n        toast.error('حدد المسجد أو المصلى المرتبط بالمنسوب');\n        return;\n      }\n      if (roleValue === 'personnel' && !personnelRole) {\n        toast.error('حدد صفة المنسوب: إمام أو مؤذن أو خطيب أو خطيب متعاون');\n        return;\n      }\n      await mosqueApi.setAssignment(userId, {\n        role: roleValue,\n        siteId: siteId || null,\n        personnelRole: roleValue === 'personnel' ? personnelRole : null,\n      });\n      toast.success(roleValue === 'personnel' ? 'تم ربط المستخدم بالموقع والصفة التشغيلية' : 'تم تحديث الدور التشغيلي');\n      const rows = await mosqueApi.assignments();\n      setAssignments(rows);\n      setAssignmentDrafts(Object.fromEntries(rows.map((item) => [item.userId, { role: item.role, siteId: item.siteId || '', personnelRole: item.personnelRole || 'imam' }])));\n      setPersonnel(await mosqueApi.personnel());\n    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الدور'); }\n  };\n`;
s = s.slice(0, helperStart) + helper + s.slice(helperEnd);

s = s.replace(/<option value="imam">[^<]*<\/option>\s*<option value="muezzin">[^<]*<\/option>\s*<option value="khateeb">[^<]*<\/option>\s*<option value="collaborator">[^<]*<\/option>/g,
  '<option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option>');
s = s.replace(/value="collaborator">متعاون</g, 'value="collaborating_khateeb">خطيب متعاون<');
s = s.replace(/value="collaborator">متعاون مع المسجد</g, 'value="collaborating_khateeb">خطيب متعاون<');
s = s.replace(/\{item\.role\}/g, "{personnelRoleLabels[item.role] || item.role}");
s = s.replace(/\{person\.role\}/g, "{personnelRoleLabels[person.role] || person.role}");

const rolesContentStart = s.indexOf('<TabsContent value="roles"');
if (rolesContentStart < 0) throw new Error('roles tab missing');
const rolesContentEnd = s.indexOf('</TabsContent>', rolesContentStart);
if (rolesContentEnd < 0) throw new Error('roles tab end missing');
const oldRolesBlock = s.slice(rolesContentStart, rolesContentEnd + '</TabsContent>'.length);
const newRolesBlock = `<TabsContent value="roles" className="space-y-4">\n          <Card className={card3d}>\n            <CardHeader>\n              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />الأدوار التشغيلية وربط منسوبي المساجد</CardTitle>\n              <CardDescription>اربط حساب المستخدم بمسجد أو مصلى وحدد صفته التشغيلية بدقة: إمام، مؤذن، خطيب، أو خطيب متعاون.</CardDescription>\n            </CardHeader>\n            <CardContent className="space-y-3">\n              {users.filter((user) => user.role !== 'admin').map((user) => {\n                const current = assignments.find((item) => item.userId === user.uid);\n                const draft = assignmentDrafts[user.uid] || { role: current?.role || 'viewer', siteId: current?.siteId || '', personnelRole: current?.personnelRole || 'imam' };\n                return (\n                  <div key={user.uid} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">\n                    <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">\n                      <div><p className="font-bold text-slate-900">{user.username}</p><p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p></div>\n                      {current && <Badge variant="outline" className="w-fit">{roleLabels[current.role]}{current.role === 'personnel' && current.personnelRole ? ' — ' + (personnelRoleLabels[current.personnelRole] || current.personnelRole) : ''}</Badge>}\n                    </div>\n                    <div className="grid gap-3 md:grid-cols-4">\n                      <Field label="الدور داخل الوحدة">\n                        <NativeSelect value={draft.role} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, role: e.target.value as MosqueModuleRole } }))}>\n                          <option value="viewer">عرض فقط</option><option value="personnel">منسوب مسجد / مصلى</option><option value="supervisor">مشرف الوحدة</option><option value="head">رئيس الوحدة</option>\n                        </NativeSelect>\n                      </Field>\n                      <Field label="المسجد / المصلى">\n                        <NativeSelect value={draft.siteId} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, siteId: e.target.value } }))} disabled={draft.role !== 'personnel'}>\n                          <option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}\n                        </NativeSelect>\n                      </Field>\n                      <Field label="الصفة التشغيلية">\n                        <NativeSelect value={draft.personnelRole} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, personnelRole: e.target.value } }))} disabled={draft.role !== 'personnel'}>\n                          <option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option>\n                        </NativeSelect>\n                      </Field>\n                      <div className="flex items-end"><Button className={button3d} onClick={() => setUserAssignment(user.uid, draft.role, draft.siteId, draft.personnelRole)}><Save className="ml-2 h-4 w-4" />حفظ الربط</Button></div>\n                    </div>\n                  </div>\n                );\n              })}\n              {!users.filter((user) => user.role !== 'admin').length && <Empty text="لا توجد حسابات مستخدمين للربط" />}\n            </CardContent>\n          </Card>\n        </TabsContent>`;
s = s.replace(oldRolesBlock, newRolesBlock);

fs.writeFileSync(path, s);
console.log('Updated mosque personnel roles and assignment UX');
