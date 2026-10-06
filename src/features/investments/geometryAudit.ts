import {
  calculateDifference,
  getPolygonMetrics,
  type PolygonCoordinate,
} from './geometry';
import type { InvestmentArea } from './types';

export type GisAuditSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type GisAuditIssueCode =
  | 'MISSING_POLYGON'
  | 'INVALID_POLYGON'
  | 'SELF_INTERSECTION'
  | 'AREA_VARIANCE'
  | 'MISSING_SURVEYED_AREA'
  | 'MISSING_REFERENCE_POINT'
  | 'POLYGON_OVERLAP';

export interface GisAuditIssue {
  id: string;
  areaId: string;
  areaCode: string;
  siteId: string;
  siteName: string;
  severity: GisAuditSeverity;
  code: GisAuditIssueCode;
  title: string;
  description: string;
  relatedAreaId?: string;
  relatedAreaCode?: string;
  differencePercent?: number;
}

export interface GisAreaAudit {
  area: InvestmentArea;
  polygonAreaSqm: number | null;
  vertexCount: number;
  issues: GisAuditIssue[];
  passed: boolean;
}

export interface GisAuditResult {
  areas: GisAreaAudit[];
  overlapPairs: Array<{
    firstAreaId: string;
    firstAreaCode: string;
    secondAreaId: string;
    secondAreaCode: string;
  }>;
  issueCount: number;
  criticalAreaCount: number;
  warningAreaCount: number;
  passedAreaCount: number;
  polygonAreaCount: number;
  polygonCoveragePercent: number;
}

type Box = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const EPSILON = 1e-12;

const orientation = (
  a: PolygonCoordinate,
  b: PolygonCoordinate,
  c: PolygonCoordinate
) => {
  const value =
    (b[1] - a[1]) * (c[0] - b[0]) -
    (b[0] - a[0]) * (c[1] - b[1]);

  if (Math.abs(value) < EPSILON) return 0;
  return value > 0 ? 1 : 2;
};

const onSegment = (
  a: PolygonCoordinate,
  b: PolygonCoordinate,
  c: PolygonCoordinate
) =>
  b[0] <= Math.max(a[0], c[0]) + EPSILON &&
  b[0] + EPSILON >= Math.min(a[0], c[0]) &&
  b[1] <= Math.max(a[1], c[1]) + EPSILON &&
  b[1] + EPSILON >= Math.min(a[1], c[1]);

const segmentsIntersect = (
  p1: PolygonCoordinate,
  q1: PolygonCoordinate,
  p2: PolygonCoordinate,
  q2: PolygonCoordinate
) => {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
};

const samePoint = (a: PolygonCoordinate, b: PolygonCoordinate) =>
  Math.abs(a[0] - b[0]) < EPSILON &&
  Math.abs(a[1] - b[1]) < EPSILON;

const getBox = (points: PolygonCoordinate[]): Box | null => {
  if (!points.length) return null;

  return points.reduce<Box>(
    (box, [x, y]) => ({
      minX: Math.min(box.minX, x),
      minY: Math.min(box.minY, y),
      maxX: Math.max(box.maxX, x),
      maxY: Math.max(box.maxY, y),
    }),
    {
      minX: points[0][0],
      minY: points[0][1],
      maxX: points[0][0],
      maxY: points[0][1],
    }
  );
};

const boxesOverlap = (first: Box, second: Box) =>
  first.minX <= second.maxX + EPSILON &&
  first.maxX + EPSILON >= second.minX &&
  first.minY <= second.maxY + EPSILON &&
  first.maxY + EPSILON >= second.minY;

const pointInPolygon = (
  point: PolygonCoordinate,
  polygon: PolygonCoordinate[]
) => {
  let inside = false;

  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [xCurrent, yCurrent] = polygon[current];
    const [xPrevious, yPrevious] = polygon[previous];

    const intersects =
      yCurrent > point[1] !== yPrevious > point[1] &&
      point[0] <
        ((xPrevious - xCurrent) * (point[1] - yCurrent)) /
          (yPrevious - yCurrent || EPSILON) +
          xCurrent;

    if (intersects) inside = !inside;
  }

  return inside;
};

export const polygonSelfIntersects = (points: PolygonCoordinate[]) => {
  if (points.length < 4) return false;

  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;

    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;

      const adjacent =
        first === second ||
        firstNext === second ||
        secondNext === first;

      if (adjacent) continue;

      if (first === 0 && secondNext === 0) continue;

      if (
        segmentsIntersect(
          points[first],
          points[firstNext],
          points[second],
          points[secondNext]
        )
      ) {
        return true;
      }
    }
  }

  return false;
};

export const polygonsOverlap = (
  first: PolygonCoordinate[],
  second: PolygonCoordinate[]
) => {
  if (first.length < 3 || second.length < 3) return false;

  const firstBox = getBox(first);
  const secondBox = getBox(second);

  if (!firstBox || !secondBox || !boxesOverlap(firstBox, secondBox)) {
    return false;
  }

  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstNext = (firstIndex + 1) % first.length;

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondNext = (secondIndex + 1) % second.length;

      const a = first[firstIndex];
      const b = first[firstNext];
      const c = second[secondIndex];
      const d = second[secondNext];

      const sharedEndpoint =
        samePoint(a, c) ||
        samePoint(a, d) ||
        samePoint(b, c) ||
        samePoint(b, d);

      if (segmentsIntersect(a, b, c, d) && !sharedEndpoint) {
        return true;
      }
    }
  }

  return (
    pointInPolygon(first[0], second) ||
    pointInPolygon(second[0], first)
  );
};

const issueId = (
  areaId: string,
  code: GisAuditIssueCode,
  suffix = ''
) => `${areaId}:${code}:${suffix}`;

const areaNumber = (value: number | string | null | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export const runGisQualityAudit = (
  areas: InvestmentArea[],
  thresholds: {
    warningPercent: number;
    criticalPercent: number;
  }
): GisAuditResult => {
  const warningPercent = Math.max(0, thresholds.warningPercent);
  const criticalPercent = Math.max(
    warningPercent,
    thresholds.criticalPercent
  );

  const audits: GisAreaAudit[] = areas.map((area) => {
    const metrics = getPolygonMetrics(area.geoJson);
    const issues: GisAuditIssue[] = [];
    const siteName = area.site?.name || 'غير محدد';

    if (!area.geoJson) {
      issues.push({
        id: issueId(area.id, 'MISSING_POLYGON'),
        areaId: area.id,
        areaCode: area.areaCode,
        siteId: area.siteId,
        siteName,
        severity: 'WARNING',
        code: 'MISSING_POLYGON',
        title: 'لا توجد حدود Polygon',
        description:
          'المساحة مسجلة دون حدود جغرافية؛ لا يمكن تنفيذ فحوص التداخل أو المقارنة الهندسية الكاملة.',
      });
    } else if (!metrics.isValid) {
      issues.push({
        id: issueId(area.id, 'INVALID_POLYGON'),
        areaId: area.id,
        areaCode: area.areaCode,
        siteId: area.siteId,
        siteName,
        severity: 'CRITICAL',
        code: 'INVALID_POLYGON',
        title: 'Polygon غير صالح',
        description:
          'الحدود الجغرافية لا تحتوي على ثلاث نقاط صالحة على الأقل.',
      });
    } else {
      if (polygonSelfIntersects(metrics.points)) {
        issues.push({
          id: issueId(area.id, 'SELF_INTERSECTION'),
          areaId: area.id,
          areaCode: area.areaCode,
          siteId: area.siteId,
          siteName,
          severity: 'CRITICAL',
          code: 'SELF_INTERSECTION',
          title: 'تقاطع ذاتي في الحدود',
          description:
            'أحد أضلاع Polygon يتقاطع مع ضلع آخر من الحدود نفسها، ويجب مراجعة ترتيب النقاط.',
        });
      }

      const surveyedArea = areaNumber(area.surveyedArea);
      const approximateArea = areaNumber(area.approximateArea);
      const referenceArea = surveyedArea ?? approximateArea;
      const referenceLabel = surveyedArea
        ? 'المساحة المساحية المعتمدة'
        : 'المساحة التقريبية';

      const difference = calculateDifference(
        metrics.calculatedAreaSqm,
        referenceArea
      );

      if (difference) {
        const absolutePercent = Math.abs(difference.percentage);

        if (absolutePercent >= warningPercent) {
          const severity: GisAuditSeverity =
            absolutePercent >= criticalPercent ? 'CRITICAL' : 'WARNING';

          issues.push({
            id: issueId(area.id, 'AREA_VARIANCE'),
            areaId: area.id,
            areaCode: area.areaCode,
            siteId: area.siteId,
            siteName,
            severity,
            code: 'AREA_VARIANCE',
            title: 'فرق في المساحة',
            description:
              `المساحة المحسوبة من Polygon تختلف عن ${referenceLabel} بنسبة ${absolutePercent.toFixed(2)}%.`,
            differencePercent: difference.percentage,
          });
        }
      }
    }

    if (
      (area.geometryAccuracy === 'SURVEYED' ||
        area.geometryAccuracy === 'OFFICIAL') &&
      !areaNumber(area.surveyedArea)
    ) {
      issues.push({
        id: issueId(area.id, 'MISSING_SURVEYED_AREA'),
        areaId: area.id,
        areaCode: area.areaCode,
        siteId: area.siteId,
        siteName,
        severity: 'WARNING',
        code: 'MISSING_SURVEYED_AREA',
        title: 'دقة مرتفعة دون مساحة مساحية',
        description:
          'تصنيف الدقة مساحي/رسمي بينما حقل المساحة المساحية المعتمدة غير متوفر.',
      });
    }

    const latitude = Number(area.latitude);
    const longitude = Number(area.longitude);
    const hasReferencePoint =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    if (!hasReferencePoint) {
      issues.push({
        id: issueId(area.id, 'MISSING_REFERENCE_POINT'),
        areaId: area.id,
        areaCode: area.areaCode,
        siteId: area.siteId,
        siteName,
        severity: 'WARNING',
        code: 'MISSING_REFERENCE_POINT',
        title: 'الإحداثية المرجعية غير متوفرة',
        description:
          'لا توجد Latitude/Longitude صالحة لتمثيل مركز المساحة على الخريطة.',
      });
    }

    return {
      area,
      polygonAreaSqm: metrics.isValid ? metrics.calculatedAreaSqm : null,
      vertexCount: metrics.vertexCount,
      issues,
      passed: issues.length === 0,
    };
  });

  const auditById = new Map(audits.map((audit) => [audit.area.id, audit]));
  const polygonEntries = audits
    .map((audit) => ({
      audit,
      points: getPolygonMetrics(audit.area.geoJson).points,
    }))
    .filter(({ points }) => points.length >= 3);

  const overlapPairs: GisAuditResult['overlapPairs'] = [];

  for (let first = 0; first < polygonEntries.length; first += 1) {
    for (let second = first + 1; second < polygonEntries.length; second += 1) {
      const firstEntry = polygonEntries[first];
      const secondEntry = polygonEntries[second];

      if (!polygonsOverlap(firstEntry.points, secondEntry.points)) {
        continue;
      }

      const firstArea = firstEntry.audit.area;
      const secondArea = secondEntry.audit.area;

      overlapPairs.push({
        firstAreaId: firstArea.id,
        firstAreaCode: firstArea.areaCode,
        secondAreaId: secondArea.id,
        secondAreaCode: secondArea.areaCode,
      });

      const firstIssue: GisAuditIssue = {
        id: issueId(firstArea.id, 'POLYGON_OVERLAP', secondArea.id),
        areaId: firstArea.id,
        areaCode: firstArea.areaCode,
        siteId: firstArea.siteId,
        siteName: firstArea.site?.name || 'غير محدد',
        severity: 'CRITICAL',
        code: 'POLYGON_OVERLAP',
        title: 'تداخل حدود مع مساحة أخرى',
        description: `يتداخل Polygon مع المساحة ${secondArea.areaCode}.`,
        relatedAreaId: secondArea.id,
        relatedAreaCode: secondArea.areaCode,
      };

      const secondIssue: GisAuditIssue = {
        id: issueId(secondArea.id, 'POLYGON_OVERLAP', firstArea.id),
        areaId: secondArea.id,
        areaCode: secondArea.areaCode,
        siteId: secondArea.siteId,
        siteName: secondArea.site?.name || 'غير محدد',
        severity: 'CRITICAL',
        code: 'POLYGON_OVERLAP',
        title: 'تداخل حدود مع مساحة أخرى',
        description: `يتداخل Polygon مع المساحة ${firstArea.areaCode}.`,
        relatedAreaId: firstArea.id,
        relatedAreaCode: firstArea.areaCode,
      };

      auditById.get(firstArea.id)?.issues.push(firstIssue);
      auditById.get(secondArea.id)?.issues.push(secondIssue);
    }
  }

  for (const audit of audits) {
    audit.passed = audit.issues.length === 0;
  }

  const criticalAreaCount = audits.filter((audit) =>
    audit.issues.some((issue) => issue.severity === 'CRITICAL')
  ).length;

  const warningAreaCount = audits.filter(
    (audit) =>
      !audit.issues.some((issue) => issue.severity === 'CRITICAL') &&
      audit.issues.some((issue) => issue.severity === 'WARNING')
  ).length;

  const polygonAreaCount = audits.filter(
    (audit) => audit.polygonAreaSqm != null
  ).length;

  return {
    areas: audits,
    overlapPairs,
    issueCount: audits.reduce(
      (sum, audit) => sum + audit.issues.length,
      0
    ),
    criticalAreaCount,
    warningAreaCount,
    passedAreaCount: audits.filter((audit) => audit.passed).length,
    polygonAreaCount,
    polygonCoveragePercent:
      audits.length === 0
        ? 0
        : (polygonAreaCount / audits.length) * 100,
  };
};
