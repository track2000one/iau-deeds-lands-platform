import fs from 'node:fs';

const path = 'src/app/pages/AccountingPropertyEvidenceAuditPage.tsx';
let text = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!text.includes(from)) throw new Error(`Missing anchor: ${label}`);
  text = text.replace(from, to);
};

if (!text.includes("AccountingBackendDeploymentStatus")) {
  const anchor = "import { NativeSelect } from '../components/ui/native-select';\n";
  replaceOnce(
    anchor,
    anchor + "import { AccountingBackendDeploymentStatus } from '../components/accounting/AccountingBackendDeploymentStatus';\n",
    'deployment component import'
  );
}

if (!text.includes('const [backendAuditReady, setBackendAuditReady]')) {
  replaceOnce(
    "  const [backfillLoading, setBackfillLoading] = useState(false);\n",
    "  const [backfillLoading, setBackfillLoading] = useState(false);\n  const [backendAuditReady, setBackendAuditReady] = useState(false);\n",
    'deployment readiness state'
  );
}

if (!text.includes("النسخة المنشورة لا تدعم مسار المطابقة الرقابية بعد")) {
  const anchor = "    setReconciliationLoading(true);\n";
  const guard = "    if (!backendAuditReady) {\n      toast.error('النسخة المنشورة لا تدعم مسار المطابقة الرقابية بعد. تحقق من بطاقة جاهزية الخادم أولًا.');\n      return;\n    }\n";
  replaceOnce(anchor, guard + anchor, 'reconciliation readiness guard');
}

text = text.replace(
  "    if (!isAdmin || !reconciliation?.remainingMissing) return;\n",
  "    if (!isAdmin || !backendAuditReady || !reconciliation?.remainingMissing) return;\n"
);

text = text.replace(
  'disabled={reconciliationLoading || backfillLoading}',
  'disabled={reconciliationLoading || backfillLoading || !backendAuditReady}'
);
text = text.replace(
  'disabled={reconciliationLoading || backfillLoading}',
  'disabled={reconciliationLoading || backfillLoading || !backendAuditReady}'
);

if (!text.includes('<AccountingBackendDeploymentStatus onReadinessChange={setBackendAuditReady} />')) {
  const anchor = '      <Card className="audit-print-card rounded-[26px] border-cyan-200 bg-cyan-50/35">\n';
  replaceOnce(
    anchor,
    '      <AccountingBackendDeploymentStatus onReadinessChange={setBackendAuditReady} />\n\n' + anchor,
    'deployment status card'
  );
}

fs.writeFileSync(path, text);
console.log('Deployment fingerprint UI integrated.');
