import fs from 'node:fs';

const file = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(file, 'utf8');

const before = `{canAdd && <Button variant="outline" className="border-emerald-300 text-emerald-800" onClick={openTour}><CalendarDays className="ml-2 h-4 w-4" />إنشاء جولة</Button>}`;
const after = `{canAdd && <Button className="border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-500" onClick={openTour}><CalendarDays className="ml-2 h-4 w-4 text-white" />إنشاء جولة</Button>}`;

if (!source.includes(before)) {
  throw new Error('Create tour button pattern was not found; aborting to avoid an unsafe edit.');
}

source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Updated create-tour button to green with white text.');
