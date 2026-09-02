import fs from 'node:fs';

const path = 'src/app/components/Layout.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes("iau-sidebar-collapsed")) {
  console.log('Collapsible desktop sidebar is already applied.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Could not find anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "  const [sidebarOpen, setSidebarOpen] = React.useState(false);\n  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);",
  "  const [sidebarOpen, setSidebarOpen] = React.useState(false);\n  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {\n    if (typeof window === 'undefined') return true;\n    return window.localStorage.getItem('iau-sidebar-collapsed') !== 'false';\n  });\n  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);",
  'sidebar state',
);

replaceOnce(
  "  React.useEffect(() => {\n    setSidebarOpen(false);\n  }, [location.pathname]);",
  "  React.useEffect(() => {\n    setSidebarOpen(false);\n  }, [location.pathname]);\n\n  React.useEffect(() => {\n    window.localStorage.setItem('iau-sidebar-collapsed', String(sidebarCollapsed));\n  }, [sidebarCollapsed]);",
  'sidebar persistence effect',
);

replaceOnce(
  `            <Button\n              variant="ghost"\n              size="icon"\n              className="lg:hidden shrink-0 h-10 w-10 rounded-xl future-glow-button"\n              onClick={() => setSidebarOpen((prev) => !prev)}\n            >\n              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}\n            </Button>`,
  `            <Button\n              variant="ghost"\n              size="icon"\n              className="lg:hidden shrink-0 h-10 w-10 rounded-xl future-glow-button"\n              onClick={() => setSidebarOpen((prev) => !prev)}\n            >\n              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}\n            </Button>\n\n            <Button\n              variant="ghost"\n              size="icon"\n              title={sidebarCollapsed ? ui('إظهار القائمة الجانبية', 'Expand sidebar') : ui('طي القائمة الجانبية', 'Collapse sidebar')}\n              aria-label={sidebarCollapsed ? ui('إظهار القائمة الجانبية', 'Expand sidebar') : ui('طي القائمة الجانبية', 'Collapse sidebar')}\n              className="hidden lg:inline-flex shrink-0 h-10 w-10 rounded-xl future-glow-button"\n              onClick={() => setSidebarCollapsed((prev) => !prev)}\n            >\n              <Menu className="h-5 w-5" />\n            </Button>`,
  'desktop sidebar toggle',
);

replaceOnce(
  `            w-[88vw] max-w-[340px] shrink-0\n            lg:w-[300px] xl:w-[320px] 2xl:w-[340px]\n            bg-sidebar text-sidebar-foreground\n            transition-transform duration-300 ease-in-out`,
  `            w-[88vw] max-w-[340px] shrink-0\n            ${'${sidebarCollapsed ? \'lg:w-[76px]\' : \'lg:w-[300px] xl:w-[320px] 2xl:w-[340px]\'}'}\n            bg-sidebar text-sidebar-foreground\n            transition-[width,transform] duration-300 ease-in-out`,
  'desktop sidebar width',
);

replaceOnce(
  `          <div className="p-4 border-b border-sidebar-border">\n            <div className="flex items-center justify-between gap-3">\n              <div className="min-w-0">`,
  `          <div className={\`p-4 border-b border-sidebar-border ${'${sidebarCollapsed ? \'lg:px-2\' : \'\'}'}\`}>\n            <div className={\`flex items-center gap-3 ${'${sidebarCollapsed ? \'lg:justify-center\' : \'justify-between\'}'}\`}>\n              <div className={\`min-w-0 ${'${sidebarCollapsed ? \'lg:hidden\' : \'\'}'}\`}>`,
  'sidebar account header',
);

replaceOnce(
  `                className="h-9 w-9 rounded-2xl"\n              >\n                <LogOut className="h-4 w-4" />`,
  `                title={ui('تسجيل الخروج', 'Log out')}\n                aria-label={ui('تسجيل الخروج', 'Log out')}\n                className="h-9 w-9 rounded-2xl shrink-0"\n              >\n                <LogOut className="h-4 w-4" />`,
  'logout tooltip',
);

replaceOnce(
  `                    className={\`\n                      future-nav-item w-full ${'${isRTL ? \'justify-end\' : \'justify-start\'}'} gap-3 text-[13px] min-h-12 h-auto px-3 py-2.5 whitespace-normal\n                      ${'${isActive ? \'is-active font-bold\' : \'\'}'}\n                    \`}\n                    onClick={() => {`,
  `                    title={item.label}\n                    aria-label={item.label}\n                    className={\`\n                      future-nav-item w-full ${'${isRTL ? \'justify-end\' : \'justify-start\'}'} gap-3 text-[13px] min-h-12 h-auto px-3 py-2.5 whitespace-normal\n                      ${'${sidebarCollapsed ? \'lg:justify-center lg:px-2 lg:gap-0\' : \'\'}'}\n                      ${'${isActive ? \'is-active font-bold\' : \'\'}'}\n                    \`}\n                    onClick={() => {`,
  'navigation button collapsed styling',
);

replaceOnce(
  `                    <Icon className="h-4.5 w-4.5 shrink-0" />\n                    <span className={\`min-w-0 flex-1 whitespace-normal break-words leading-5 ${'${isRTL ? \'text-right\' : \'text-left\'}'}\`} title={item.label}>`,
  `                    <Icon className={\`shrink-0 ${'${sidebarCollapsed ? \'lg:h-5 lg:w-5\' : \'h-4.5 w-4.5\'}'}\`} />\n                    <span className={\`min-w-0 flex-1 whitespace-normal break-words leading-5 ${'${isRTL ? \'text-right\' : \'text-left\'}'} ${'${sidebarCollapsed ? \'lg:hidden\' : \'\'}'}\`} title={item.label}>`,
  'navigation labels',
);

replaceOnce(
  `            <Separator className="my-4 bg-sidebar-border" />\n\n            <div className={\`px-3 py-2 text-xs opacity-70 ${'${isRTL ? \'text-right\' : \'text-left\'}'}\`}>`,
  `            <Separator className={\`my-4 bg-sidebar-border ${'${sidebarCollapsed ? \'lg:mx-2\' : \'\'}'}\`} />\n\n            <div className={\`px-3 py-2 text-xs opacity-70 ${'${isRTL ? \'text-right\' : \'text-left\'}'} ${'${sidebarCollapsed ? \'lg:hidden\' : \'\'}'}\`}>`,
  'sidebar footer',
);

fs.writeFileSync(path, source);
console.log('Applied collapsible desktop sidebar with remembered state.');
