const fs = require('fs');
const path = 'src/app/pages/ArchivePage.tsx';
let s = fs.readFileSync(path, 'utf8');

const detailLine = '              <InfoItem label="رقم Google Drive" value={selectedDocument.driveFileId || \'-\'} />\n';
if (!s.includes(detailLine)) throw new Error('Google Drive ID field not found');
s = s.replace(detailLine, '');

const oldSubtitle = '              <p className="text-sm text-muted-foreground mt-1">عرض بيانات الملف ورابط Google Drive والإجراءات.</p>';
const newSubtitle = '              <p className="text-sm text-muted-foreground mt-1">عرض بيانات الملف والإجراءات المتاحة.</p>';
if (!s.includes(oldSubtitle)) throw new Error('Archive details subtitle not found');
s = s.replace(oldSubtitle, newSubtitle);

fs.writeFileSync(path, s);
console.log('Hidden Google Drive internal ID from archive details');
