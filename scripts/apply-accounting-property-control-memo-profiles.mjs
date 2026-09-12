import fs from 'node:fs';

const pagePath = 'src/app/pages/AccountingPropertyControlIndicatorsPage.tsx';
const before = fs.readFileSync(pagePath, 'utf8');
let next = before;

const typeImport = "import type { AccountingTransformationRecord } from '../../types/accountingTransformation';";
const profileImport = `${typeImport}\nimport { findPropertyControlMemoProfile, memoProfileToAnalysisSeed } from '../config/accountingPropertyControlMemoProfiles';`;
if (!next.includes('memoProfileToAnalysisSeed')) {
  if (!next.includes(typeImport)) throw new Error('Accounting record type import anchor not found');
  next = next.replace(typeImport, profileImport);
}

const controlTypeAnchor = "  updatedAt?: string;\n};";
const controlTypeReplacement = "  updatedAt?: string;\n  memoProfileId?: string;\n  memoSourceLabel?: string;\n  memoReferenceScore?: number;\n};";
if (!next.includes('memoReferenceScore?: number')) {
  if (!next.includes(controlTypeAnchor)) throw new Error('ControlAnalysis type anchor not found');
  next = next.replace(controlTypeAnchor, controlTypeReplacement);
}

const readAnchor = `const readAnalysis = (record?: AccountingTransformationRecord | null): ControlAnalysis => {\n  if (!record) return emptyAnalysis();\n  const raw = record.payload?.[CONTROL_KEY];\n  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyAnalysis();\n  return { ...emptyAnalysis(), ...(raw as Partial<ControlAnalysis>) };\n};`;
const readReplacement = `const readAnalysis = (record?: AccountingTransformationRecord | null): ControlAnalysis => {\n  if (!record) return emptyAnalysis();\n  const profile = findPropertyControlMemoProfile(record);\n  const seed = profile ? memoProfileToAnalysisSeed(profile) as Partial<ControlAnalysis> : {};\n  const raw = record.payload?.[CONTROL_KEY];\n  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...emptyAnalysis(), ...seed };\n  return { ...emptyAnalysis(), ...seed, ...(raw as Partial<ControlAnalysis>) };\n};`;
if (!next.includes('const seed = profile ? memoProfileToAnalysisSeed')) {
  if (!next.includes(readAnchor)) throw new Error('readAnalysis anchor not found');
  next = next.replace(readAnchor, readReplacement);
}

const selectedAnchor = "  const selected = candidates.find((record) => record.id === selectedId) || null;";
const selectedReplacement = `${selectedAnchor}\n  const selectedMemoProfile = selected ? findPropertyControlMemoProfile(selected) : undefined;`;
if (!next.includes('selectedMemoProfile')) {
  if (!next.includes(selectedAnchor)) throw new Error('selected record anchor not found');
  next = next.replace(selectedAnchor, selectedReplacement);
}

const scoreAnchor = "  const score = scoreAnalysis(analysis);";
const scoreReplacement = `${scoreAnchor}\n  const memoReferenceScore = analysis.memoReferenceScore;`;
if (!next.includes('const memoReferenceScore = analysis.memoReferenceScore')) {
  if (!next.includes(scoreAnchor)) throw new Error('score anchor not found');
  next = next.replace(scoreAnchor, scoreReplacement);
}

const headerAnchor = "            <p className=\"mt-3 max-w-5xl text-sm leading-7 text-slate-300\">مساحة عمل لحصر الحالات، جمع المستندات، تحليل مؤشرات الملكية والوصول والاستخدام وحق النفاذ، ثم توثيق المعالجة المقترحة قبل الاعتماد المالي والنظامي.</p>";
const headerReplacement = `${headerAnchor}\n            <p className=\"mt-2 max-w-5xl text-xs leading-6 text-cyan-100\">الحالات الأربع الواردة في مذكرة 27/08/2026 يتم التعرف عليها تلقائيًا وتعبئة بيانات البطاقة المرجعية مع بقاء التعديل والمراجعة متاحين للمستخدم.</p>`;
if (!next.includes('الحالات الأربع الواردة في مذكرة 27/08/2026')) {
  if (!next.includes(headerAnchor)) throw new Error('hero description anchor not found');
  next = next.replace(headerAnchor, headerReplacement);
}

const selectedFragmentAnchor = '{selected && <>';
const memoPanel = `\n              <Card className="rounded-[26px] border-teal-200 bg-teal-50/55">\n                <CardContent className="p-4">\n                  <div className="flex flex-wrap items-center justify-between gap-3">\n                    <div>\n                      <p className="text-xs font-bold text-teal-700">الربط مع مذكرة مؤشرات السيطرة</p>\n                      <p className="mt-1 text-sm font-black text-slate-900">{selectedMemoProfile ? selectedMemoProfile.title : 'هذه الحالة غير مطابقة تلقائيًا لإحدى البطاقات الأربع'}</p>\n                      {analysis.memoSourceLabel && <p className="mt-1 text-[11px] text-slate-600">{analysis.memoSourceLabel}</p>}\n                    </div>\n                    <div className="flex flex-wrap items-center gap-2">\n                      {selectedMemoProfile && <Badge variant="outline" className="border-teal-300 bg-white text-teal-800">بيانات مرجعية معبأة تلقائيًا</Badge>}\n                      {typeof memoReferenceScore === 'number' && <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-800">درجة المذكرة: {memoReferenceScore}/10</Badge>}\n                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">الدرجة الحسابية المساعدة: {score}/10</Badge>\n                    </div>\n                  </div>\n                  {selectedMemoProfile && typeof memoReferenceScore === 'number' && memoReferenceScore !== score && (\n                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-900">\n                      درجة المذكرة محفوظة كما وردت في المستند، وقد تختلف عن الدرجة الحسابية المساعدة للمنصة. لا يتم تعديل أي منهما آليًا لتطابق الأخرى.\n                    </p>\n                  )}\n                </CardContent>\n              </Card>\n`;
if (!next.includes('الربط مع مذكرة مؤشرات السيطرة')) {
  if (!next.includes(selectedFragmentAnchor)) throw new Error('Selected fragment anchor not found');
  next = next.replace(selectedFragmentAnchor, `${selectedFragmentAnchor}${memoPanel}`);
}

fs.writeFileSync(pagePath, next);
console.log('Accounting property control memo profiles integrated.');
