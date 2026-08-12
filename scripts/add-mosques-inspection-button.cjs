const fs = require('fs');
const path = 'src/app/pages/MosquesUnitPage.tsx';
let s = fs.readFileSync(path, 'utf8');
const anchor = `            <Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><ExternalLink className="ml-2 h-4 w-4" />البوابة العامة</Button>\n`;
if (!s.includes(anchor)) throw new Error('Mosques unit public portal button anchor not found');
const addition = `            <Button variant="outline" className={button3d} onClick={() => window.open('https://inspection-vna1.vercel.app/', '_blank', 'noopener,noreferrer')}><ClipboardList className="ml-2 h-4 w-4" />نظام المعاينة</Button>\n`;
s = s.replace(anchor, anchor + addition);
fs.writeFileSync(path, s);
console.log('Added inspection system button to MosquesUnitPage');
