const fs = require('fs');
const path = 'src/app/components/Layout.tsx';
let s = fs.readFileSync(path, 'utf8');

// Re-run after preserving the pre-change backup branch.
s = s.replace(
  'w-[84vw] max-w-[300px] shrink-0\n            lg:w-[250px] xl:w-[270px] 2xl:w-[290px]',
  'w-[88vw] max-w-[340px] shrink-0\n            lg:w-[300px] xl:w-[320px] 2xl:w-[340px]'
);

s = s.replace(
  "future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-sm h-12 px-4",
  "future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-[13px] min-h-12 h-auto px-3 py-2.5 whitespace-normal"
);

s = s.replace(
  "<span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>",
  "<span className={`min-w-0 flex-1 whitespace-normal break-words leading-5 ${isRTL ? 'text-right' : 'text-left'}`} title={item.label}>"
);

if (!s.includes('lg:w-[300px] xl:w-[320px] 2xl:w-[340px]')) throw new Error('Sidebar width patch did not apply');
if (!s.includes('min-h-12 h-auto px-3 py-2.5 whitespace-normal')) throw new Error('Nav item height patch did not apply');
if (!s.includes('whitespace-normal break-words leading-5')) throw new Error('Nav label wrapping patch did not apply');

fs.writeFileSync(path, s, 'utf8');
console.log('Sidebar labels now wrap without clipping.');
