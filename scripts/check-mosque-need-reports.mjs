import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Build the actual TypeScript report helper, not a duplicate implementation.
const result = await build({
  entryPoints: ['src/app/utils/mosqueProgramNeedsReport.ts'],
  bundle: true, platform: 'node', format: 'esm',
  write: false, logLevel: 'silent',
});
const source = result.outputFiles[0].text;
const { buildMosqueNeedSummaries, mosqueNeedPresets } = await import(
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
);
const statusBundle = await build({
  entryPoints: ['src/app/utils/carpetVisitStatus.ts'],
  bundle: true, platform: 'node', format: 'esm',
  write: false, logLevel: 'silent',
});
const { carpetStatusSelectionPatch, selectedCarpetItemStatus, CARPET_REPLACEMENT_NOTE } = await import(
  'data:text/javascript;base64,' + Buffer.from(statusBundle.outputFiles[0].text).toString('base64')
);

let testCount = 0;
const defaults = { preset: 'all', query: '', state: 'open', siteType: '', sort: 'priority' };
const item = (title, note, overrides = {}) => ({
  title, note, category: 'التجهيزات', status: 'needs_action',
  priority: 'high', resolutionStatus: 'new',
  ...overrides,
});
const visit = (id, items = [], extra = {}) => ({
  id, visitNumber: 'MVS-' + id, visitDate: '2026-10-24T10:00:00',
  createdAt: '2026-10-24T10:00:00', workflowStatus: 'completed',
  visitScope: 'whole_site', siteId: id, site: {
    name: 'المسجد ' + id, siteType: 'mosque',
  },
  priority: 'high', items, ...extra,
});
const check = (description, records, preset, expected, options = {}) => {
  const got = buildMosqueNeedSummaries(records, { ...defaults, preset, ...options });
  assert.equal(got.length, expected, description);
  testCount++;
};

// Every named need category must work with stored checklist observations.
check('Carpet replacement', [visit('1', [item('فرش المسجد', 'يحتاج إلى توفير فرش جديد')])], 'carpet', 1);
check('Carpet cleaning is NOT carpet purchase', [visit('2', [item('نظافة السجاد والأرضيات', 'يحتاج إلى تنظيف السجاد')])], 'carpet', 0);
check('Cooling and ventilation', [visit('3', [item('التكييف والتهوية', 'المكيف يحتاج صيانة')])], 'air', 1);
check('Lighting and power', [visit('4', [item('الإنارة', 'تلف عدد من المصابيح')])], 'lighting', 1);
check('Cleaning', [visit('5', [item('النظافة', 'تحتاج دورات المياه إلى تنظيف')])], 'cleaning', 1);
check('Quran and shelving', [visit('6', [item('رفوف المصاحف', 'تحتاج الرفوف إلى استبدال')])], 'quran', 1);
check('Custom query', [visit('7', [item('تسرب المياه', 'يلزم إصلاح تسرب المياه')])], 'custom', 1, { query: 'تسرب' });
check('Custom query excludes unrelated', [visit('7', [item('تسرب المياه', 'يلزم إصلاح تسرب المياه')])], 'custom', 0, { query: 'مصاحف' });
check('All needs includes checklist findings', [visit('8', [item('النظافة', 'تحتاج تنظيف')])], 'all', 1);

// A specific "needs changing" selection is saved as a normal, backend-valid
// needs_action item with a structured carpet replacement flag.
const carpetInspection = item('نظافة السجاد والأرضيات', '', { category: 'النظافة', details: {} });
const replacementPatch = carpetStatusSelectionPatch(carpetInspection, 'needs_replacement');
assert.equal(replacementPatch.status, 'needs_action');
assert.equal(replacementPatch.details.carpetAssessment, 'replace');
assert.equal(replacementPatch.note, CARPET_REPLACEMENT_NOTE);
testCount += 3;
const savedReplacement = { ...carpetInspection, ...replacementPatch };
assert.equal(selectedCarpetItemStatus(savedReplacement), 'needs_replacement');
testCount++;
check('Replacement option feeds carpeting needs report',
  [visit('carpet-choice', [savedReplacement])], 'carpet', 1);
check('Replacement option does not incorrectly appear in cleaning service report',
  [visit('carpet-choice', [savedReplacement])], 'cleaning', 0);
check('Resolved replacement not reported among open needs',
  [visit('carpet-fixed', [{ ...savedReplacement, resolutionStatus: 'closed' }])], 'carpet', 0);
check('Resolved replacement is available in completed needs report',
  [visit('carpet-fixed', [{ ...savedReplacement, resolutionStatus: 'closed' }])], 'carpet', 1, { state: 'resolved' });

const cleaningPatch = carpetStatusSelectionPatch(savedReplacement, 'needs_action');
const savedCleaning = { ...savedReplacement, ...cleaningPatch };
assert.equal(cleaningPatch.details.carpetAssessment, 'clean');
assert.equal(selectedCarpetItemStatus(savedCleaning), 'needs_action');
assert.equal(cleaningPatch.note, '');
testCount += 3;
check('Choosing cleaning removes the previous replacement need',
  [visit('carpet-clean', [{ ...savedCleaning, note: 'تحتاج السجادة للتنظيف' }])], 'carpet', 0);
check('Choosing cleaning is included in cleaning report',
  [visit('carpet-clean', [{ ...savedCleaning, note: 'تحتاج السجادة للتنظيف' }])], 'cleaning', 1);
check('Existing legacy free-text carpet request remains supported',
  [visit('legacy-carpet', [item('نظافة السجاد والأرضيات', 'السجاد يحتاج إلى تغيير')])], 'carpet', 1);
check('Untouched carpet-good entry not listed as a need',
  [visit('carpet-good', [item('نظافة السجاد والأرضيات', '', { status: 'good' })])], 'carpet', 0);

// A general/recommendations-only need must be found for EVERY report type.
const noteCases = [
  ['carpet', 'المسجد يحتاج إلى فرش جديد'],
  ['air', 'الحاجة إلى صيانة المكيف'],
  ['lighting', 'يلزم تركيب مصابيح إنارة'],
  ['cleaning', 'دورات المياه تحتاج إلى تنظيف'],
  ['quran', 'نقص المصاحف ويجب توفير مصاحف إضافية'],
  ['custom', 'تحتاج الوحدة إلى إصلاح تسرب المياه'],
  ['all', 'الموقع يحتاج إلى صيانة الأبواب'],
];
for (const [preset, note] of noteCases) {
  check('General notes: ' + preset, [visit('notes-' + preset, [], { generalNotes: note })],
    preset, 1, preset === 'custom' ? { query: 'تسرب' } : {});
}
check('Do not report completed supply as open need',
  [visit('done', [], { recommendations: 'تم تركيب مصابيح جديدة' })], 'lighting', 0);
check('Normal operational note is not an unmet need',
  [visit('normal', [], { generalNotes: 'تم فحص النظافة والحالة جيدة' })], 'cleaning', 0);
check('Planned visits are not verified findings',
  [visit('planned', [item('إنارة المسجد', 'يحتاج تركيب إنارة')], { workflowStatus: 'planned' })], 'lighting', 0);
check('Resolved items are absent from open reports',
  [visit('resolved', [item('التكييف', 'يحتاج إصلاح', { resolutionStatus: 'closed' })])], 'air', 0);
check('Resolved items appear in resolved reports',
  [visit('resolved', [item('التكييف', 'يحتاج إصلاح', { resolutionStatus: 'closed' })])], 'air', 1, { state: 'resolved' });
check('Site type filter applies to all need types',
  [visit('prayer', [item('التكييف', 'يحتاج إصلاح')], { site: { name: 'مصلى', siteType: 'prayer_room' } })],
  'air', 0, { siteType: 'mosque' });
check('No double count when one site has multiple findings',
  [visit('same', [item('التكييف', 'يحتاج صيانة'), item('الإنارة', 'تحتاج تغيير')])], 'all', 1);

// Validate the dropdown's every possible selection using a single combined fixture.
const records = [
  visit('c', [item('فرش', 'يحتاج إلى توريد سجاد جديد')]),
  visit('a', [item('التكييف', 'يحتاج صيانة')]),
  visit('l', [item('الإنارة', 'يلزم تغيير المصابيح')]),
  visit('n', [item('النظافة', 'تحتاج تنظيف')]),
  visit('q', [item('المصاحف', 'نقص المصاحف')]),
  visit('x', [item('تسرب المياه', 'يحتاج إصلاح تسرب')]),
];
for (const { value: preset } of mosqueNeedPresets) {
  const output = buildMosqueNeedSummaries(records, {
    ...defaults, preset, query: preset === 'custom' ? 'تسرب' : '',
  });
  assert.ok(output.length >= 1, 'Dropdown option must return applicable needs: ' + preset);
  testCount++;
}
console.log('SUCCESS: ' + testCount + ' need-report checks passed for all dropdown options.');
