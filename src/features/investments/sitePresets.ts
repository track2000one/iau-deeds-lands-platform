// Reference-site names and expected area counts from "بيان اراضي الشاغرة".
// Suggestions only: no production records or deed links are created automatically.
export interface InvestmentSitePreset {
  code: string;
  name: string;
  expectedAreas: number;
}

export const INVESTMENT_SITE_PRESETS: InvestmentSitePreset[] = [
  { code: 'WEST', name: 'الحرم الجامعي الغربي', expectedAreas: 4 },
  { code: 'RAKA', name: 'أرض الراكة الشمالية – المدينة الطبية الأكاديمية', expectedAreas: 5 },
  { code: 'EAST', name: 'الحرم الجامعي الشرقي', expectedAreas: 12 },
  { code: 'RAYYAN', name: 'أرض حي الريان', expectedAreas: 4 },
  { code: 'QASHLAH', name: 'أرض القشلة', expectedAreas: 3 },
];

export const findSitePreset = (code: string) =>
  INVESTMENT_SITE_PRESETS.find((site) => site.code === code);
