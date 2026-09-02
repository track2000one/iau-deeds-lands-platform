import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const originalPath = 'scripts/apply-merged-quran-field-census.mjs';
const tempPath = 'scripts/.apply-merged-quran-field-census-fixed.mjs';
let script = fs.readFileSync(originalPath, 'utf8');

const start = script.indexOf('const editNeedle = ');
const end = script.indexOf('fs.writeFileSync(apiPath, api);', start);
if (start < 0 || end < 0) throw new Error('Unable to locate the outdated frontend patch tail');

const fixedTail = `source = replaceOnce(\n  source,\n  \"</NativeSelect></div>{isActivityApprovalItem(item) &&\",\n  \"</NativeSelect></div>{isQuranFieldVisitItem(item) && <QuranFieldInventoryEditor item={item} stock={selectedQuranStock} baselineClosed={quranOpeningBaselineStatus?.closed ?? null} onChange={(patch) => updateQuranInventoryDetails(index, patch)} />}{isActivityApprovalItem(item) &&\",\n  'Quran census editor in visit form',\n);\n\nsource = replaceOnce(\n  source,\n  \"className={isActivityApprovalItem(item) ? 'hidden' : 'md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3'}\",\n  \"className={(isActivityApprovalItem(item) || isQuranFieldVisitItem(item)) ? 'hidden' : 'md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3'}\",\n  'hide before-after panel for Quran item',\n);\n\n`;

script = script.slice(0, start) + fixedTail + script.slice(end);
fs.writeFileSync(tempPath, script);
const result = spawnSync(process.execPath, [tempPath], { stdio: 'inherit' });
try { fs.unlinkSync(tempPath); } catch {}
if (result.status !== 0) process.exit(result.status || 1);
console.log('Applied corrected merged Quran field census patch.');
