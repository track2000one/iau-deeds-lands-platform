const fs = require('fs');

const pagePath = 'src/app/pages/MosquesUnitPage.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// Store exact logged-in personnel role.
const linkedAnchor = "  const [linkedSiteId, setLinkedSiteId] = useState<string | null>(null);\n";
if (!page.includes(linkedAnchor)) throw new Error('linkedSiteId anchor missing');
if (!page.includes('const [myPersonnelRole')) {
  page = page.replace(linkedAnchor, linkedAnchor + "  const [myPersonnelRole, setMyPersonnelRole] = useState<string | null>(null);\n");
}

const meAnchor = "      setRole(me.role);\n      setLinkedSiteId(me.siteId || null);";
if (!page.includes(meAnchor)) throw new Error('me assignment anchor missing');
page = page.replace(meAnchor, "      setRole(me.role);\n      setLinkedSiteId(me.siteId || null);\n      setMyPersonnelRole(me.personnelRole || null);");

const headerBadge = '<Badge variant="outline" className="border-sky-300 bg-white text-sky-700"><Shield className="ml-1 h-3.5 w-3.5" />{roleLabels[role]}</Badge>';
if (!page.includes(headerBadge)) throw new Error('header role badge missing');
page = page.replace(headerBadge, '<Badge variant="outline" className="border-sky-300 bg-white text-sky-700"><Shield className="ml-1 h-3.5 w-3.5" />{role === \'personnel\' && myPersonnelRole ? personnelRoleLabels[myPersonnelRole] || myPersonnelRole : roleLabels[role]}</Badge>');

const oldTeamBadge = "<Badge variant=\"outline\">{item.role === 'imam' ? 'إمام' : item.role === 'muezzin' ? 'مؤذن' : item.role === 'khateeb' ? 'خطيب' : 'متعاون'}</Badge>";
if (!page.includes(oldTeamBadge)) throw new Error('team role badge missing');
page = page.replace(oldTeamBadge, '<Badge variant="outline">{personnelRoleLabels[item.role] || item.role}</Badge>');

fs.writeFileSync(pagePath, page);

const apiPath = 'src/app/api/mosques.ts';
let api = fs.readFileSync(apiPath, 'utf8');
const meType = "type MosqueMe = { role: MosqueModuleRole; siteId?: string | null; userId: string; isAdmin: boolean };";
if (!api.includes(meType)) throw new Error('MosqueMe type anchor missing');
api = api.replace(meType, "type MosqueMe = { role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; isAdmin: boolean };");
fs.writeFileSync(apiPath, api);
console.log('Finalized exact mosque personnel role display');
