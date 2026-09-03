import fs from 'node:fs';

const file = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    "  Eye,\n  Image as ImageIcon,",
    "  Eye,\n  EyeOff,\n  Image as ImageIcon,",
  ],
  [
    "  const [view, setView] = React.useState<'visits' | 'tours'>('visits');\n  const [search, setSearch] = React.useState('');",
    "  const [view, setView] = React.useState<'visits' | 'tours'>('visits');\n  const [tourCardsVisible, setTourCardsVisible] = React.useState(true);\n  const [search, setSearch] = React.useState('');",
  ],
  [
    "            <Button size=\"sm\" variant={view === 'visits' ? 'default' : 'ghost'} onClick={() => setView('visits')}>الزيارات</Button>\n            <Button size=\"sm\" variant={view === 'tours' ? 'default' : 'ghost'} onClick={() => setView('tours')}>الجولات</Button>\n          </div>\n          {view === 'visits' && <div className=\"flex-1 space-y-2 md:max-w-5xl\">",
    "            <Button size=\"sm\" variant={view === 'visits' ? 'default' : 'ghost'} onClick={() => setView('visits')}>الزيارات</Button>\n            <Button size=\"sm\" variant={view === 'tours' ? 'default' : 'ghost'} onClick={() => setView('tours')}>الجولات</Button>\n          </div>\n          {view === 'tours' && <Button type=\"button\" size=\"sm\" variant=\"outline\" className={tourCardsVisible ? 'border-slate-300 text-slate-700' : 'border-emerald-300 bg-emerald-50 text-emerald-800'} onClick={() => setTourCardsVisible((current) => !current)}>{tourCardsVisible ? <EyeOff className=\"ml-2 h-4 w-4\" /> : <Eye className=\"ml-2 h-4 w-4\" />}{tourCardsVisible ? 'إخفاء بطاقات الجولات' : 'إظهار بطاقات الجولات'}</Button>}\n          {view === 'visits' && <div className=\"flex-1 space-y-2 md:max-w-5xl\">",
  ],
  [
    "    </div> : <div className=\"grid gap-4 md:grid-cols-2 xl:grid-cols-3\">\n      {tours.map((tour) => <Card key={tour.id} className=\"overflow-hidden\">",
    "    </div> : <div className={`${tourCardsVisible ? 'grid' : 'hidden'} gap-4 md:grid-cols-2 xl:grid-cols-3`}>\n      {tours.map((tour) => <Card key={tour.id} className=\"overflow-hidden\">",
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Required pattern not found; aborting safe patch:\n${before.slice(0, 180)}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Added show/hide toggle for tour cards only.');
