import fs from 'node:fs';

const filePath = 'src/app/pages/AssetsPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

if (!source.includes('  Armchair,')) {
  source = source.replace(
    "import {\n  Boxes,",
    "import {\n  Armchair,\n  Boxes,\n  Cog,",
  );
  source = source.replace(
    "  FileSpreadsheet,\n  Layers3,",
    "  FileSpreadsheet,\n  Laptop,\n  Layers3,\n  Presentation,\n  Sofa,\n  Table2,",
  );
}

const assetCardAnchor = 'const AssetCard: React.FC<{' ;
if (!source.includes(assetCardAnchor)) {
  throw new Error('Could not locate AssetCard anchor in AssetsPage.tsx');
}

if (!source.includes('const GROUP_VISUAL_PALETTES')) {
  const helper = `const GROUP_VISUAL_PALETTES = [
  {
    color: '#2563eb',
    border: 'rgba(96,165,250,0.54)',
    cardBackground: 'linear-gradient(135deg, rgba(239,246,255,0.92), rgba(255,255,255,0.88) 54%, rgba(219,234,254,0.58))',
    cardShadow: '0 12px 34px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(239,246,255,0.92))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(59,130,246,0.18)',
  },
  {
    color: '#0f8b8d',
    border: 'rgba(45,212,191,0.50)',
    cardBackground: 'linear-gradient(135deg, rgba(240,253,250,0.94), rgba(255,255,255,0.89) 54%, rgba(204,251,241,0.54))',
    cardShadow: '0 12px 34px rgba(20,184,166,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(240,253,250,0.92))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(20,184,166,0.18)',
  },
  {
    color: '#c26b00',
    border: 'rgba(251,191,36,0.55)',
    cardBackground: 'linear-gradient(135deg, rgba(255,251,235,0.95), rgba(255,255,255,0.90) 54%, rgba(254,243,199,0.58))',
    cardShadow: '0 12px 34px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(255,251,235,0.93))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(245,158,11,0.18)',
  },
  {
    color: '#6354b8',
    border: 'rgba(167,139,250,0.52)',
    cardBackground: 'linear-gradient(135deg, rgba(245,243,255,0.95), rgba(255,255,255,0.90) 54%, rgba(237,233,254,0.58))',
    cardShadow: '0 12px 34px rgba(139,92,246,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(245,243,255,0.93))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(139,92,246,0.18)',
  },
  {
    color: '#3f7f31',
    border: 'rgba(134,239,172,0.56)',
    cardBackground: 'linear-gradient(135deg, rgba(240,253,244,0.95), rgba(255,255,255,0.90) 54%, rgba(220,252,231,0.60))',
    cardShadow: '0 12px 34px rgba(34,197,94,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(240,253,244,0.93))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(34,197,94,0.18)',
  },
  {
    color: '#a83261',
    border: 'rgba(244,114,182,0.48)',
    cardBackground: 'linear-gradient(135deg, rgba(253,242,248,0.95), rgba(255,255,255,0.90) 54%, rgba(252,231,243,0.58))',
    cardShadow: '0 12px 34px rgba(236,72,153,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
    iconBackground: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(253,242,248,0.93))',
    iconShadow: '0 0 0 1px rgba(255,255,255,0.75) inset, 0 7px 24px rgba(236,72,153,0.17)',
  },
] as const;

const resolveGroupVisual = (group: AssetGroupSummary) => {
  const text = \`${'${group.label} ${group.key}'}\`.toLowerCase();

  if (/الشاشات|أجهزة العرض|العرض|presentation|projector|screen|monitor/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[4], icon: Presentation };
  }
  if (/الحاسب|حاسب|كمبيوتر|computer|laptop/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[5], icon: Laptop };
  }
  if (/الآلات|آلات|المعدات|معدات|equipment|machinery/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[0], icon: Cog };
  }
  if (/الكراسي|كراسي|كرسي|chair/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[2], icon: Armchair };
  }
  if (/المكاتب|مكاتب|مكتب|desk|office/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[3], icon: Table2 };
  }
  if (/الأثاث|اثاث|أثاث|furniture|sofa/.test(text)) {
    return { ...GROUP_VISUAL_PALETTES[1], icon: Sofa };
  }

  const seed = Array.from(group.key || group.label || '').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = GROUP_VISUAL_PALETTES[seed % GROUP_VISUAL_PALETTES.length];
  return { ...palette, icon: Layers3 };
};

`;
  source = source.replace(assetCardAnchor, `${helper}${assetCardAnchor}`);
}

const groupReturnAnchor = `                const loaded = loadedGroups[group.key];\n                return <section key={group.key} className="overflow-hidden rounded-[24px] border bg-white/78 shadow-sm">`;
if (source.includes(groupReturnAnchor)) {
  source = source.replace(
    groupReturnAnchor,
    `                const loaded = loadedGroups[group.key];\n                const visual = resolveGroupVisual(group);\n                const GroupIcon = visual.icon;\n                return <section key={group.key} className="overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-[1px]" style={{ borderColor: visual.border, background: visual.cardBackground, boxShadow: visual.cardShadow }}>`,
  );
} else if (!source.includes('const visual = resolveGroupVisual(group);')) {
  throw new Error('Could not locate group card return anchor');
}

const groupButtonAnchor = 'className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-muted/35 sm:p-5"';
if (source.includes(groupButtonAnchor)) {
  source = source.replace(
    groupButtonAnchor,
    'className="group relative flex w-full items-center justify-between gap-4 overflow-hidden p-4 text-right transition hover:bg-white/30 sm:p-5"',
  );
}

const oldIconBlock = `<div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border bg-primary/5 text-primary"><Layers3 className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-lg font-black">مجموعة {group.label}</h2><p className="mt-1 text-xs text-muted-foreground">{group.count.toLocaleString('ar-SA')} سجل • إجمالي الكمية {group.quantity.toLocaleString('ar-SA')}</p></div></div>`;
const newIconBlock = `<div className="flex min-w-0 items-center gap-4"><div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] border bg-white/85 transition duration-300 group-hover:scale-[1.04]" style={{ borderColor: visual.border, background: visual.iconBackground, boxShadow: visual.iconShadow, color: visual.color }}><span className="absolute inset-3 rounded-full opacity-25 blur-lg" style={{ background: visual.color }} /><GroupIcon className="relative h-7 w-7" /></div><div className="min-w-0"><h2 className="truncate text-lg font-black">مجموعة {group.label}</h2><p className="mt-1 text-xs text-muted-foreground">{group.count.toLocaleString('ar-SA')} سجل • إجمالي الكمية {group.quantity.toLocaleString('ar-SA')}</p></div></div>`;
if (source.includes(oldIconBlock)) {
  source = source.replace(oldIconBlock, newIconBlock);
} else if (!source.includes('<GroupIcon className="relative h-7 w-7" />')) {
  throw new Error('Could not locate group icon block');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Asset group category icons and soft glow frames applied successfully.');
