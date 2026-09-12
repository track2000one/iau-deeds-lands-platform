import fs from 'node:fs';

const scopedPath = 'src/app/pages/AccountingTransformationScopedImportPage.tsx';
let scoped = fs.readFileSync(scopedPath, 'utf8');

if (!scoped.includes('consultantReview.errorCount > 0')) {
  const intakeMarker = "      const intakeMessage = `اكتمل التحليل بالخلفية دون حجز واجهة المستخدم: ${analyzed.inspection.sheets.length.toLocaleString('ar-SA')} ورقة؛ ${mappedCount.toLocaleString('ar-SA')} مرتبطة بالمخطط الرسمي و${unmappedCount.toLocaleString('ar-SA')} ورقة إضافية/مرجعية.${modelBText}`;";
  if (!scoped.includes(intakeMarker)) throw new Error('Scoped import intake message marker not found');
  const replacement = `${intakeMarker}\n      const consultantReview = analyzed.consultantReview;\n      const consultantText = \` فحص ملاحظات الاستشاري: \${consultantReview.checkedBuildingRows.toLocaleString('ar-SA')} سجل مبنى، \${consultantReview.errorCount.toLocaleString('ar-SA')} خطأ مانع، \${consultantReview.warningCount.toLocaleString('ar-SA')} تنبيه، وتم توحيد \${consultantReview.normalizedCells.toLocaleString('ar-SA')} خلية آليًا.\`;\n\n      if (consultantReview.errorCount > 0) {\n        setMessage(\`\${intakeMessage}\${consultantText} تم إيقاف الاستيراد حتى معالجة الأخطاء المانعة.\`);\n        toast.error(\`يوجد \${consultantReview.errorCount.toLocaleString('ar-SA')} خطأ مانع وفق قواعد ملاحظات الاستشاري. راجع الملف قبل الاستيراد.\`);\n        return;\n      }`;
  scoped = scoped.replace(intakeMarker, replacement);

  const parsedWarningMarker = "        setMessage(`${intakeMessage} لم تُكتب أي بيانات لأن النظام لم يجد سجلات يمكن ربطها آليًا.`);";
  if (scoped.includes(parsedWarningMarker)) {
    scoped = scoped.replace(parsedWarningMarker, "        setMessage(`${intakeMessage}${consultantText} لم تُكتب أي بيانات لأن النظام لم يجد سجلات يمكن ربطها آليًا.`);");
  }

  const successMessageMarker = "      setMessage(intakeMessage);";
  if (scoped.includes(successMessageMarker)) {
    scoped = scoped.replace(successMessageMarker, "      setMessage(`${intakeMessage}${consultantText}`);");
  }

  fs.writeFileSync(scopedPath, scoped);
}

const baselinePath = 'src/app/pages/AccountingTransformationBaselineResetPage.tsx';
let baseline = fs.readFileSync(baselinePath, 'utf8');

if (!baseline.includes('consultantReview.errorCount > 0')) {
  const analysisMarker = "      if (controller.signal.aborted) return;\n\n      const workbookSheetNames = analyzed.inspection.sheets.map((sheet) => sheet.sheetName);";
  if (!baseline.includes(analysisMarker)) throw new Error('Baseline analysis marker not found');
  const replacement = `      if (controller.signal.aborted) return;\n\n      const consultantReview = analyzed.consultantReview;\n      if (consultantReview.errorCount > 0) {\n        const firstIssues = consultantReview.issues\n          .filter((issue) => issue.severity === 'error')\n          .slice(0, 3)\n          .map((issue) => \`\${issue.sourceSheet}!\${issue.column}\${issue.sourceRow}: \${issue.message}\`)\n          .join(' | ');\n        throw new Error(\`تعذر اعتماد ملف الأساس: يوجد \${consultantReview.errorCount.toLocaleString('ar-SA')} خطأ مانع وفق ملاحظات الاستشاري. \${firstIssues}\`);\n      }\n\n      const workbookSheetNames = analyzed.inspection.sheets.map((sheet) => sheet.sheetName);`;
  baseline = baseline.replace(analysisMarker, replacement);

  const baselineMessageMarker = "        + `تم تجاهل ${ignoredSheets.toLocaleString('ar-SA')} ورقة مرجعية/تصنيفية وعدم تحويلها إلى سجلات.`,";
  if (baseline.includes(baselineMessageMarker)) {
    baseline = baseline.replace(
      baselineMessageMarker,
      "        + `تم تجاهل ${ignoredSheets.toLocaleString('ar-SA')} ورقة مرجعية/تصنيفية وعدم تحويلها إلى سجلات. `\n        + `فحص ملاحظات الاستشاري: ${consultantReview.warningCount.toLocaleString('ar-SA')} تنبيه، وتم توحيد ${consultantReview.normalizedCells.toLocaleString('ar-SA')} خلية آليًا.`,",
    );
  }

  fs.writeFileSync(baselinePath, baseline);
}

console.log('Accounting consultant data quality UI integration applied.');
