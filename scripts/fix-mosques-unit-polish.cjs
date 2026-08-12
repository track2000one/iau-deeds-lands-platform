const fs = require('fs');

const path = 'src/app/pages/MosquesUnitPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = `    if (!statusTarget || !statusValue) return;\n    if (['rejected', 'returned_for_edit'].includes(statusValue) && !statusNote.trim()) return toast.error('اكتب سبب الرفض أو ملاحظة الإعادة');\n    setSaving(true);\n    try {\n      let evidenceUrl: string | undefined;\n      if (statusTarget.kind === 'request' && statusValue === 'completed') {\n        if (!statusEvidence && !statusTarget.item.completionEvidenceUrl) return toast.error('يلزم رفع إثبات الإنجاز قبل إكمال الطلب');\n        if (statusEvidence) evidenceUrl = (await mosqueApi.upload(statusEvidence)).driveUrl;\n      }`;

const after = `    if (!statusTarget || !statusValue) return;\n    if (['rejected', 'returned_for_edit'].includes(statusValue) && !statusNote.trim()) return toast.error('اكتب سبب الرفض أو ملاحظة الإعادة');\n    if (statusTarget.kind === 'request' && statusValue === 'completed' && !statusEvidence && !statusTarget.item.completionEvidenceUrl) {\n      return toast.error('يلزم رفع إثبات الإنجاز قبل إكمال الطلب');\n    }\n    setSaving(true);\n    try {\n      let evidenceUrl: string | undefined;\n      if (statusTarget.kind === 'request' && statusValue === 'completed') {\n        if (statusEvidence) evidenceUrl = (await mosqueApi.upload(statusEvidence)).driveUrl;\n      }`;

if (!content.includes(after)) {
  if (!content.includes(before)) throw new Error('Status workflow block not found');
  content = content.replace(before, after);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Mosques unit workflow UI polish applied.');
