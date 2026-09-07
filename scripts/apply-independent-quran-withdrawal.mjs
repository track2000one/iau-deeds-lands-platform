import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Missing anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`const validateQuranInventoryConsistency = (details: MosqueFieldVisitQuranInventoryDetails): QuranInventoryConsistency => {
  const counts = [details.largeCount, details.mediumCount, details.smallCount];
  if (!counts.every((value) => value != null && Number.isFinite(Number(value)))) {
    return { valid: true, total: null, withdrawal: Number(details.recommendedWithdrawalCount || 0), message: null };
  }
  const total = counts.reduce((sum, value) => sum + Number(value || 0), 0);
  const withdrawal = Math.max(0, Number(details.recommendedWithdrawalCount || 0));
  if (withdrawal > total) {
    return {
      valid: false,
      total,
      withdrawal,
      message: \`العدد المقترح للسحب (\${withdrawal}) يتجاوز إجمالي المصاحف المسجلة (\${total}). راجع أعداد الأحجام أو العدد المقترح للسحب.\`,
    };
  }
  return { valid: true, total, withdrawal, message: null };
};`,
`const validateQuranInventoryConsistency = (details: MosqueFieldVisitQuranInventoryDetails): QuranInventoryConsistency => {
  const counts = [details.largeCount, details.mediumCount, details.smallCount];
  const withdrawal = Math.max(0, Number(details.recommendedWithdrawalCount || 0));
  if (!counts.every((value) => value != null && Number.isFinite(Number(value)))) {
    return { valid: true, total: null, withdrawal, message: null };
  }
  const total = counts.reduce((sum, value) => sum + Number(value || 0), 0);
  // العدد المقترح للسحب/الاستبدال ملاحظة ميدانية مستقلة، ولا يدخل في حساب
  // إجمالي المصاحف حسب الأحجام أو الاحتياج وفق المستهدف.
  return { valid: true, total, withdrawal, message: null };
};

const isLegacyWithdrawalCouplingCorrection = (details: MosqueFieldVisitQuranInventoryDetails) => {
  if (details.reconciliationStatus !== 'needs_correction') return false;
  const message = String(details.reconciliationMessage || '');
  return message.includes('العدد المقترح للسحب') && message.includes('يتجاوز إجمالي المصاحف');
};`,
  'decouple withdrawal validation',
);

replaceOnce(
`  if (details.reconciliationStatus === 'needs_correction') {
    const reason = String(details.correctionReason || '').trim();`,
`  if (isLegacyWithdrawalCouplingCorrection(details)) {
    return {
      error: null as string | null,
      needsCorrection: false,
      details: {
        ...details,
        reconciliationStatus: 'valid' as const,
        reconciliationMessage: null,
        correctionReason: null,
        correctionDetectedAt: null,
        correctionDetectedBy: null,
        correctionBaseline: null,
      },
    };
  }

  if (details.reconciliationStatus === 'needs_correction') {
    const reason = String(details.correctionReason || '').trim();`,
  'normalize obsolete withdrawal correction state',
);

replaceOnce(
`const quranVisitNeedsCorrection = (visit: Pick<MosqueFieldVisit, 'items'>) =>
  (visit.items || []).some((item) => isQuranFieldVisitItem(item) && quranInventoryDetails(item).reconciliationStatus === 'needs_correction');`,
`const quranVisitNeedsCorrection = (visit: Pick<MosqueFieldVisit, 'items'>) =>
  (visit.items || []).some((item) => {
    if (!isQuranFieldVisitItem(item)) return false;
    const details = quranInventoryDetails(item);
    return details.reconciliationStatus === 'needs_correction' && !isLegacyWithdrawalCouplingCorrection(details);
  });`,
  'ignore obsolete withdrawal correction in visit status',
);

replaceOnce(
`  const storedNeedsCorrection = details.reconciliationStatus === 'needs_correction';`,
`  const storedNeedsCorrection = details.reconciliationStatus === 'needs_correction' && !isLegacyWithdrawalCouplingCorrection(details);`,
  'ignore obsolete withdrawal correction in editor',
);

replaceOnce(
`      <Field label="المقترح سحبها / استبدالها"><Input type="number" min="0" value={numericValue('recommendedWithdrawalCount')} onChange={(event) => updateNumber('recommendedWithdrawalCount', event.target.value)} /></Field>`,
`      <Field label="المقترح سحبها / استبدالها — مستقل"><Input type="number" min="0" value={numericValue('recommendedWithdrawalCount')} onChange={(event) => updateNumber('recommendedWithdrawalCount', event.target.value)} /></Field>`,
  'clarify independent withdrawal field',
);

replaceOnce(
`    </div>
    {(!consistency.valid || storedNeedsCorrection) && <div className={\`mt-3 rounded-2xl border p-3 \${readyForCorrection ? 'border-sky-300 bg-sky-50' : 'border-amber-300 bg-amber-50'}\`}>`,
`    </div>
    <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-[11px] leading-5 text-sky-900"><b>تنبيه حسابي:</b> «المقترح سحبها / استبدالها» حقل مستقل للتوصية الميدانية، ولا يدخل في مجموع المصاحف الكبيرة والمتوسطة والصغيرة ولا في حساب الاحتياج وفق المستهدف.</div>
    {(!consistency.valid || storedNeedsCorrection) && <div className={\`mt-3 rounded-2xl border p-3 \${readyForCorrection ? 'border-sky-300 bg-sky-50' : 'border-amber-300 bg-amber-50'}\`}>`,
  'add withdrawal independence note',
);

replaceOnce(
`    if (!consistency.valid || details.reconciliationStatus === 'needs_correction') {
      return { synced: false, needsCorrection: true, message: consistency.message || details.reconciliationMessage || 'بيانات جرد المصاحف تحتاج إلى تصحيح.' };
    }`,
`    if (!consistency.valid || (details.reconciliationStatus === 'needs_correction' && !isLegacyWithdrawalCouplingCorrection(details))) {
      return { synced: false, needsCorrection: true, message: consistency.message || details.reconciliationMessage || 'بيانات جرد المصاحف تحتاج إلى تصحيح.' };
    }`,
  'allow sync for obsolete withdrawal correction',
);

fs.writeFileSync(path, source);
console.log('Decoupled proposed Quran withdrawal/replacement count from size totals and target calculations.');
