from pathlib import Path

path = Path('src/app/pages/ReportsPage.tsx')
text = path.read_text(encoding='utf-8')


def once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    text = text.replace(old, new, 1)


once(
    "  ChevronDown,\n  ChevronUp,\n  Download,",
    "  ChevronDown,\n  ChevronUp,\n  X,\n  Download,",
    'import X',
)

state_anchor = "  const [printSettingsBySection, setPrintSettingsBySection] = useState<Record<ReportSectionType, PrintSettings>>({"
state_block = """  const [excludedRowKeysBySection, setExcludedRowKeysBySection] = useState<
    Record<ReportSectionType, string[]>
  >({
    deeds: [],
    allocated: [],
    delivered: [],
    leasedOut: [],
    leasedIn: [],
    buildingsOut: [],
    buildingsIn: [],
    siteInspections: [],
  });

"""
once(state_anchor, state_block + state_anchor, 'excluded state')

old_apply = """  const applyManualRowOrder = (
    data: any[],
    section: ReportSectionType,
  ): any[] => {
    if (!manualOrderEnabledBySection[section]) {
      return data;
    }

    const manualOrder = manualRowOrderBySection[section] || [];
    const rank = new Map(manualOrder.map((key, index) => [key, index]));

    return [...data].sort((first, second) => {"""
new_apply = """  const excludeManualRow = (section: ReportSectionType, rowKey: string) => {
    setExcludedRowKeysBySection((prev) => {
      const current = prev[section] || [];
      if (current.includes(rowKey)) return prev;

      return {
        ...prev,
        [section]: [...current, rowKey],
      };
    });
  };

  const restoreExcludedRows = (section: ReportSectionType) => {
    setExcludedRowKeysBySection((prev) => ({
      ...prev,
      [section]: [],
    }));
  };

  const applyManualRowOrder = (
    data: any[],
    section: ReportSectionType,
  ): any[] => {
    if (!manualOrderEnabledBySection[section]) {
      return data;
    }

    const manualOrder = manualRowOrderBySection[section] || [];
    const excludedKeys = new Set(excludedRowKeysBySection[section] || []);
    const rank = new Map(manualOrder.map((key, index) => [key, index]));
    const visibleData = data.filter((item, index) =>
      !excludedKeys.has(getManualRowKey(item, index))
    );

    return [...visibleData].sort((first, second) => {"""
once(old_apply, new_apply, 'apply exclusion')

once(
    """    setManualOrderEnabledBySection((prev) => ({
      ...prev,
      [section]: true,
    }));
  };""",
    """    setExcludedRowKeysBySection((prev) => ({
      ...prev,
      [section]: [],
    }));

    setManualOrderEnabledBySection((prev) => ({
      ...prev,
      [section]: true,
    }));
  };""",
    'reset exclusions when enabling',
)

once(
    """    setManualRowOrderBySection((prev) => ({
      ...prev,
      [section]: [],
    }));
  };

  const moveManualRow = (""",
    """    setManualRowOrderBySection((prev) => ({
      ...prev,
      [section]: [],
    }));

    setExcludedRowKeysBySection((prev) => ({
      ...prev,
      [section]: [],
    }));
  };

  const moveManualRow = (""",
    'reset exclusions when disabling',
)

once(
    """  const moveManualRowToPosition = (
    section: ReportSectionType,
    rowKey: string,
    requestedPosition: number,
  ) => {
    setManualRowOrderBySection((prev) => {""",
    """  const moveManualRowToPosition = (
    section: ReportSectionType,
    rowKey: string,
    requestedPosition: number,
  ) => {
    if (requestedPosition <= 0) {
      excludeManualRow(section, rowKey);
      return;
    }

    setManualRowOrderBySection((prev) => {""",
    'zero excludes row',
)

once(
    """    const sortedData = applyManualRowOrder(automaticallySortedData, type);
    const manualOrderEnabled = manualOrderEnabledBySection[type];
    const enabledColumns = columns.filter((col) => col.enabled);""",
    """    const sortedData = applyManualRowOrder(automaticallySortedData, type);
    const manualOrderEnabled = manualOrderEnabledBySection[type];
    const excludedCount = (excludedRowKeysBySection[type] || []).length;
    const enabledColumns = columns.filter((col) => col.enabled);""",
    'excluded count',
)

old_notice = 'الترتيب اليدوي مفعّل. استخدم أدوات «ترتيب الصف» داخل الجدول لنقل كل سجل إلى الموضع المطلوب. هذا الترتيب يطبّق على Excel وPDF والطباعة.'
new_notice = """<span>
                          الترتيب اليدوي مفعّل. استخدم الأسهم أو رقم الموضع لترتيب السجلات. اكتب 0 أو اضغط × لاستبعاد الصف من التقرير. الصفوف المستبعدة لا تظهر في Excel أو PDF أو الطباعة.
                        </span>
                        {excludedCount > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mr-3 border-amber-300 bg-white/80"
                            onClick={() => restoreExcludedRows(type)}
                          >
                            استعادة المستبعد ({excludedCount})
                          </Button>
                        )}"""
once(old_notice, new_notice, 'manual order notice')

once(
    '<TableHead className="w-[170px] px-2 py-2 text-center text-white">\n                              ترتيب الصف\n                            </TableHead>',
    '<TableHead className="w-[210px] px-2 py-2 text-center text-white">\n                              ترتيب / استبعاد\n                            </TableHead>',
    'manual order header',
)

once('                                        min={1}\n', '                                        min={0}\n', 'input min')
once(
    '                                        title="رقم ترتيب الصف"\n',
    '                                        title="رقم ترتيب الصف — اكتب 0 للاستبعاد"\n',
    'input title',
)

down_button = """                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={index === sortedData.length - 1}
                                        onClick={() => moveManualRow(type, rowKey, 'down')}
                                        title="تحريك الصف للأسفل"
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>"""
x_button = down_button + """

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                                        onClick={() => excludeManualRow(type, rowKey)}
                                        title="استبعاد الصف من التقرير"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>"""
once(down_button, x_button, 'X exclusion button')

path.write_text(text, encoding='utf-8')
print('ReportsPage.tsx patched successfully')
