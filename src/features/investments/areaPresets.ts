import type { InvestmentAreaInput } from './types';

export interface InvestmentAreaPreset extends Omit<InvestmentAreaInput, 'siteId'> {
  sourceCoordinate: string;
}

const area = (
  siteCode: string,
  areaNumber: number,
  approximateArea: number,
  latitude: number,
  longitude: number,
  sourceCoordinate: string
): InvestmentAreaPreset => ({
  areaNumber,
  areaCode: `${siteCode}-${String(areaNumber).padStart(2, '0')}`,
  name: `الموقع ${String(areaNumber).padStart(2, '0')}`,
  description: 'مساحة واردة في بيان الأراضي الشاغرة.',
  approximateArea,
  surveyedArea: null,
  latitude,
  longitude,
  geoJson: null,
  geometryAccuracy: 'APPROXIMATE',
  occupancyStatus: 'AVAILABLE',
  investmentReadiness: 'NOT_ASSESSED',
  currentUse: 'غير مشغولة وفق البيان',
  proposedUse: null,
  notes: 'المساحة والإحداثيات مدخلة من بيان الأراضي الشاغرة وتعد بيانات أولية/تقريبية إلى حين التحقق والرفع المساحي.',
  sourceCoordinate,
});

export const INVESTMENT_AREA_PRESETS: Record<string, InvestmentAreaPreset[]> = {
  WEST: [
    area('WEST', 1, 78791.32, 26.383889, 50.190556, '26°23\'02"N 50°11\'26"E'),
    area('WEST', 2, 14233.50, 26.382500, 50.188056, '26°22\'57"N 50°11\'17"E'),
    area('WEST', 3, 15489.68, 26.381944, 50.187778, '26°22\'55"N 50°11\'16"E'),
    area('WEST', 4, 49842.23, 26.380000, 50.189167, '26°22\'48"N 50°11\'21"E'),
  ],
  RAKA: [
    area('RAKA', 1, 44770.94, 26.372222, 50.195833, '26°22\'20"N 50°11\'45"E'),
    area('RAKA', 2, 37916.15, 26.370278, 50.197222, '26°22\'13"N 50°11\'50"E'),
    area('RAKA', 3, 53758.70, 26.371111, 50.198889, '26°22\'16"N 50°11\'56"E'),
    area('RAKA', 4, 59847.42, 26.369167, 50.200278, '26°22\'09"N 50°12\'01"E'),
    area('RAKA', 5, 5137.38, 26.367778, 50.198889, '26°22\'04"N 50°11\'56"E'),
  ],
  EAST: [
    area('EAST', 1, 8895.75, 26.394722, 50.186111, '26°23\'41"N 50°11\'10"E'),
    area('EAST', 2, 17113.68, 26.395833, 50.190278, '26°23\'45"N 50°11\'25"E'),
    area('EAST', 3, 48193.12, 26.393611, 50.196944, '26°23\'37"N 50°11\'49"E'),
    area('EAST', 4, 39747.40, 26.396667, 50.195833, '26°23\'48"N 50°11\'45"E'),
    area('EAST', 5, 37916.15, 26.398333, 50.197500, '26°23\'54"N 50°11\'51"E'),
    area('EAST', 6, 10705.07, 26.396667, 50.199167, '26°23\'48"N 50°11\'57"E'),
    area('EAST', 7, 22524.01, 26.396389, 50.200833, '26°23\'47"N 50°12\'03"E'),
    area('EAST', 8, 36045.47, 26.399444, 50.200833, '26°23\'58"N 50°12\'03"E'),
    area('EAST', 9, 40185.13, 26.397778, 50.201944, '26°23\'52"N 50°12\'07"E'),
    area('EAST', 10, 59736.43, 26.402222, 50.201111, '26°24\'08"N 50°12\'04"E'),
    area('EAST', 11, 103575.20, 26.404444, 50.206111, '26°24\'16"N 50°12\'22"E'),
    area('EAST', 12, 1220281.62, 26.405556, 50.215000, '26°24\'20"N 50°12\'54"E'),
  ],
  RAYYAN: [
    area('RAYYAN', 1, 68812.85, 26.407778, 50.088056, '26°24\'28"N 50°05\'17"E'),
    area('RAYYAN', 2, 107839.08, 26.403056, 50.090556, '26°24\'11"N 50°05\'26"E'),
    area('RAYYAN', 3, 49307.13, 26.401944, 50.089167, '26°24\'07"N 50°05\'21"E'),
    area('RAYYAN', 4, 52652.62, 26.398611, 50.090000, '26°23\'55"N 50°05\'24"E'),
  ],
  QASHLAH: [
    area('QASHLAH', 1, 27354.84, 26.401111, 50.180278, '26°24\'04"N 50°10\'49"E'),
    area('QASHLAH', 2, 37255.76, 26.399722, 50.180833, '26°23\'59"N 50°10\'51"E'),
    area('QASHLAH', 3, 110380.00, 26.397778, 50.178056, '26°23\'52"N 50°10\'41"E'),
  ],
};

export const getInvestmentAreaPresets = (siteCode: string) =>
  INVESTMENT_AREA_PRESETS[siteCode.toUpperCase()] || [];

export const TOTAL_PRESET_AREAS = Object.values(INVESTMENT_AREA_PRESETS)
  .reduce((sum, rows) => sum + rows.length, 0);
