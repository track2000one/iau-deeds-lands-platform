const fs = require('fs');
const path = 'src/app/pages/MosquesPublicPage.tsx';
let s = fs.readFileSync(path, 'utf8');
const from = 'className="h-full w-full object-cover"';
const to = 'className="h-full w-full object-contain bg-slate-950"';
if (!s.includes(from)) throw new Error('Mosque slideshow image class not found');
s = s.replace(from, to);
fs.writeFileSync(path, s);
console.log('Mosque slideshow now shows full image without cropping');
