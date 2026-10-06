// Reference sites from "بيان اراضي الشاغرة".
// These are matching aids only; production records are created only after a user verifies the deed records.
export interface InvestmentSitePreset {
  code: string;
  name: string;
  expectedAreas: number;
  deedNumbers: string[];
  sourceCoordinate?: string;
}

export const INVESTMENT_SITE_PRESETS: InvestmentSitePreset[] = [
  {
    code: 'WEST',
    name: 'الحرم الجامعي الغربي',
    expectedAreas: 4,
    deedNumbers: ['330103025654'],
    sourceCoordinate: '26°23\'17"N 50°11\'10"E',
  },
  {
    code: 'RAKA',
    name: 'أرض الراكة الشمالية – المدينة الطبية الأكاديمية',
    expectedAreas: 5,
    deedNumbers: ['337901000329'],
    sourceCoordinate: '26°22\'39"N 50°11\'35"E',
  },
  {
    code: 'EAST',
    name: 'الحرم الجامعي الشرقي',
    expectedAreas: 12,
    deedNumbers: ['360607002075'],
    sourceCoordinate: '26°24\'06"N 50°12\'29"E',
  },
  {
    code: 'RAYYAN',
    name: 'أرض حي الريان',
    expectedAreas: 4,
    deedNumbers: ['730103028454', '330115016381'],
    sourceCoordinate: '26°24\'13"N 50°05\'19"E',
  },
  {
    code: 'QASHLAH',
    name: 'أرض القشلة',
    expectedAreas: 3,
    deedNumbers: ['930108020614'],
    sourceCoordinate: '26°23\'55"N 50°10\'46"E',
  },
];

export const findSitePreset = (code: string) =>
  INVESTMENT_SITE_PRESETS.find((site) => site.code === code);
