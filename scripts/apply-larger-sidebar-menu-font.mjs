import fs from 'node:fs';

const file = 'src/app/components/Layout.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldButtonClass = "future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-[13px] min-h-12 h-auto px-3 py-2.5 whitespace-normal";
const newButtonClass = "future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-base font-medium min-h-12 h-auto px-3 py-2.5 whitespace-normal";

if (!source.includes(oldButtonClass) && !source.includes(newButtonClass)) {
  throw new Error('Sidebar navigation button class was not found.');
}

source = source.replace(oldButtonClass, newButtonClass);
source = source.replace(
  "whitespace-normal break-words leading-5 ${isRTL ? 'text-right' : 'text-left'}",
  "whitespace-normal break-words leading-6 ${isRTL ? 'text-right' : 'text-left'}"
);

fs.writeFileSync(file, source);
console.log('Sidebar menu font now follows the platform base font size (text-base) with clearer line height.');
