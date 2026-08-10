import fs from 'node:fs';

const filePath = 'src/app/pages/AssetsPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const lucideImport = `import {
  AirVent,
  Archive,
  Armchair,
  BatteryCharging,
  Boxes,
  Building2,
  BusFront,
  Camera,
  CarFront,
  ChevronDown,
  ChevronUp,
  Cloud,
  Cog,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  Laptop,
  Map,
  Network,
  PackageSearch,
  Pencil,
  PlusCircle,
  Presentation,
  Printer,
  Search,
  SlidersHorizontal,
  Sofa,
  Table2,
  Trash2,
} from 'lucide-react';`;

source = source.replace(
  /import \{\n[\s\S]*?\n\} from 'lucide-react';/,
  lucideImport,
);

const helper = `const GROUP_VISUAL_PALETTES = [
  {
    color: '#2563eb',
    border: 'rgba(59,130,246,0.50)',
    cardBackground: 'linear-gradient(135deg, rgba(239,246,255,0.96), rgba(255,255,255,0.92) 55%, rgba(219,234,254,0.76))',
    cardShadow: '0 12px 32px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(239,246,255,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(37,99,235,0.16)',
  },
  {
    color: '#16a34a',
    border: 'rgba(34,197,94,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(240,253,244,0.96), rgba(255,255,255,0.92) 55%, rgba(220,252,231,0.78))',
    cardShadow: '0 12px 32px rgba(22,163,74,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,253,244,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(22,163,74,0.15)',
  },
  {
    color: '#d4a017',
    border: 'rgba(245,158,11,0.48)',
    cardBackground: 'linear-gradient(135deg, rgba(255,251,235,0.97), rgba(255,255,255,0.92) 55%, rgba(254,240,138,0.70))',
    cardShadow: '0 12px 32px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,251,235,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(217,119,6,0.16)',
  },
  {
    color: '#0284c7',
    border: 'rgba(56,189,248,0.48)',
    cardBackground: 'linear-gradient(135deg, rgba(240,249,255,0.96), rgba(255,255,255,0.92) 55%, rgba(224,242,254,0.80))',
    cardShadow: '0 12px 32px rgba(2,132,199,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,249,255,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(2,132,199,0.15)',
  },
  {
    color: '#65a30d',
    border: 'rgba(132,204,22,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(247,254,231,0.97), rgba(255,255,255,0.92) 55%, rgba(217,249,157,0.76))',
    cardShadow: '0 12px 32px rgba(101,163,13,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,254,231,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(101,163,13,0.15)',
  },
  {
    color: '#eab308',
    border: 'rgba(234,179,8,0.46)',
    cardBackground: 'linear-gradient(135deg, rgba(254,252,232,0.97), rgba(255,255,255,0.92) 55%, rgba(254,249,195,0.82))',
    cardShadow: '0 12px 32px rgba(234,179,8,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(254,252,232,0.94))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.72) inset, 0 8px 22px rgba(234,179,8,0.15)',
  },
] as const;

const FALLBACK_GROUP_ICONS = [Boxes, Archive, Building2, Cloud, Cog, Printer] as const;

const resolveGroupVisual = (group: AssetGroupSummary) => {
  const text = String(group.label + ' ' + group.key).toLowerCase();

  if (/النقل العام|public transport|bus/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: BusFront };
  }
  if (/مركبات|سيارات|وسائل النقل|vehicle|car|transport/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: CarFront };
  }
  if (/ups|طاقة احتياطية|الطاقة الاحتياطية|بطارية|battery|power backup/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[5], icon: BatteryCharging };
  }
  if (/التكييف|التبريد|مكيف|hvac|cooling|air conditioning/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: AirVent };
  }
  if (/طبية|مخبرية|مختبر|medical|lab|laboratory/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: FlaskConical };
  }
  if (/شبكات|اتصالات|network|communication|router|switch/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Network };
  }
  if (/كاميرات|كاميرا|camera|surveillance/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Camera };
  }
  if (/طابعات|طابعة|أجهزة النسخ|اجهزة النسخ|printer|copy|copier/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Printer };
  }
  if (/الشاشات|أجهزة العرض|اجهزة العرض|العرض|presentation|projector|screen|monitor/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Presentation };
  }
  if (/الحاسب|حاسب|كمبيوتر|computer|laptop/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: Laptop };
  }
  if (/الخزائن|خزائن|الكبائن|كبائن|خزانة|cabinet|locker|safe/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: Archive };
  }
  if (/الكراسي|كراسي|كرسي|chair/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: Armchair };
  }
  if (/الطاولات|طاولات|طاولة|table/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[5], icon: Table2 };
  }
  if (/المكاتب|مكاتب|مكتب|desk|office/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Table2 };
  }
  if (/الأثاث|الاثاث|اثاث|أثاث|furniture|sofa/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: Sofa };
  }
  if (/الآلات|آلات|الات|المعدات|معدات|equipment|machinery/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Cog };
  }
  if (/غير الملموسة|غير ملموسة|intangible|software|license/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Cloud };
  }
  if (/الأراضي|الاراضي|أراضي|اراضي|land|lands/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: Map };
  }
  if (/البنية التحتية|بنية تحتية|infrastructure/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: Building2 };
  }

  const seed = Array.from(group.key || group.label || '').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = GROUP_VISUAL_PALETTES[seed % GROUP_VISUAL_PALETTES.length];
  const icon = FALLBACK_GROUP_ICONS[seed % FALLBACK_GROUP_ICONS.length];
  return { ...palette, icon };
};

`;

const helperPattern = /const GROUP_VISUAL_PALETTES = \[[\s\S]*?\n};\n\nconst AssetCard:/;
if (!helperPattern.test(source)) {
  throw new Error('Could not locate current asset group visual helper block');
}
source = source.replace(helperPattern, `${helper}const AssetCard:`);

if (!source.includes('const visual = resolveGroupVisual(group);') || !source.includes('<GroupIcon className="relative h-7 w-7" />')) {
  throw new Error('Expected group visual rendering is not present in AssetsPage.tsx');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Distinct asset group icons applied with fixed blue, green and yellow palettes.');
