import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

const marker = 'IAU_FIELD_VISIT_DRAFT_PER_SITE_V3';
if (source.includes(marker)) {
  console.log('Field visit per-site draft V3 patch already applied.');
  process.exit(0);
}

const draftKeyAnchor = "  const fieldVisitDraftKey = React.useMemo(() => `field-visit-draft:${currentUsername || 'anonymous'}`, [currentUsername]);";
ensure(source.includes(draftKeyAnchor), 'legacy fieldVisitDraftKey anchor not found');
source = source.replace(
  draftKeyAnchor,
  `  // ${marker}\n  const legacyFieldVisitDraftKey = React.useMemo(\n    () => \`field-visit-draft:\${currentUsername || 'anonymous'}\`,\n    [currentUsername],\n  );\n  const fieldVisitDraftScope = React.useMemo(() => {\n    if (editingVisit?.id) return \`visit:\${editingVisit.id}\`;\n    const siteId = String(visitForm.siteId || '').trim();\n    return siteId ? \`site:\${siteId}\` : 'new';\n  }, [editingVisit?.id, visitForm.siteId]);\n  const fieldVisitDraftKey = React.useMemo(\n    () => \`\${legacyFieldVisitDraftKey}:\${fieldVisitDraftScope}\`,\n    [legacyFieldVisitDraftKey, fieldVisitDraftScope],\n  );`,
);

const emergencyKeyAnchor = `  const fieldVisitEmergencyKey = React.useMemo(\n    () => makeFieldVisitEmergencyKey(currentUsername || 'anonymous'),\n    [currentUsername],\n  );`;
ensure(source.includes(emergencyKeyAnchor), 'legacy emergency key anchor not found');
source = source.replace(
  emergencyKeyAnchor,
  `  const legacyFieldVisitEmergencyKey = React.useMemo(\n    () => makeFieldVisitEmergencyKey(currentUsername || 'anonymous'),\n    [currentUsername],\n  );\n  const fieldVisitEmergencyKey = React.useMemo(\n    () => \`\${legacyFieldVisitEmergencyKey}:\${fieldVisitDraftScope}\`,\n    [legacyFieldVisitEmergencyKey, fieldVisitDraftScope],\n  );`,
);

const latestFormRefAnchor = '  const latestVisitFormRef = React.useRef(visitForm);';
ensure(source.includes(latestFormRefAnchor), 'latestVisitFormRef anchor not found');
source = source.replace(
  latestFormRefAnchor,
  `${latestFormRefAnchor}\n  const lastRestoredDraftScopeRef = React.useRef('');`,
);

const restoreStartNeedle = `  React.useEffect(() => {\n    if (!visitDialog || restoringDraftRef.current) return;\n    restoringDraftRef.current = true;\n    void (async () => {\n      try {\n        const [indexedDraft, rows] = await Promise.all([`;
const restoreStart = source.indexOf(restoreStartNeedle);
ensure(restoreStart >= 0, 'draft restore effect start not found');

const autosaveStartNeedle = `\n  React.useEffect(() => {\n    if (!visitDialog || restoringDraftRef.current) return;\n    latestVisitFormRef.current = visitForm;`;
const restoreEnd = source.indexOf(autosaveStartNeedle, restoreStart);
ensure(restoreEnd > restoreStart, 'draft autosave effect anchor not found');

const replacement = `  React.useEffect(() => {\n    if (!visitDialog || restoringDraftRef.current) return;\n    const restoreToken = \`\${fieldVisitDraftKey}|\${editingVisit?.id || 'new'}\`;\n    if (lastRestoredDraftScopeRef.current === restoreToken) return;\n    lastRestoredDraftScopeRef.current = restoreToken;\n    restoringDraftRef.current = true;\n    void (async () => {\n      try {\n        const shouldReadLegacyDraft = fieldVisitDraftKey !== legacyFieldVisitDraftKey;\n        const [indexedDraft, legacyIndexedDraft, rows] = await Promise.all([\n          loadFieldVisitDraft<VisitForm>(fieldVisitDraftKey),\n          shouldReadLegacyDraft ? loadFieldVisitDraft<VisitForm>(legacyFieldVisitDraftKey) : Promise.resolve(null),\n          listPendingFieldVisitMedia(currentUsername || 'anonymous'),\n        ]);\n        const emergencyDraft = loadFieldVisitEmergencyDraft<VisitForm>(fieldVisitEmergencyKey);\n        const legacyEmergencyDraft = fieldVisitEmergencyKey !== legacyFieldVisitEmergencyKey\n          ? loadFieldVisitEmergencyDraft<VisitForm>(legacyFieldVisitEmergencyKey)\n          : null;\n        const expectedEditingVisitId = editingVisit?.id || null;\n        const expectedSiteId = String(editingVisit?.siteId || visitForm.siteId || '').trim();\n        const candidates = [indexedDraft, emergencyDraft, legacyIndexedDraft, legacyEmergencyDraft].filter((draft) => {\n          if (!draft?.form) return false;\n          const draftSiteId = String((draft.form as VisitForm).siteId || '').trim();\n          if (expectedSiteId && draftSiteId !== expectedSiteId) return false;\n          return true;\n        });\n        const draft = newestFieldVisitRecoveryDraft<VisitForm>(\n          candidates,\n          expectedEditingVisitId,\n        );\n        setPendingMediaCount(rows.length);\n        if (draft?.form) {\n          setVisitForm(hydrateOfflinePlaceholders(draft.form, rows));\n          setFieldVisitAutosaveAt(draft.savedAt);\n          toast.success('تم استعادة آخر مسودة محفوظة تلقائيًا لهذا المسجد / المصلى ويمكنك متابعة التعبئة من حيث توقفت');\n        }\n      } catch {\n        // Local recovery must never block opening or completing a visit.\n      } finally {\n        restoringDraftRef.current = false;\n      }\n    })();\n  }, [visitDialog, editingVisit?.id, editingVisit?.siteId, visitForm.siteId, fieldVisitDraftKey, legacyFieldVisitDraftKey, fieldVisitEmergencyKey, legacyFieldVisitEmergencyKey, currentUsername, hydrateOfflinePlaceholders]);\n\n  React.useEffect(() => {\n    if (!visitDialog) lastRestoredDraftScopeRef.current = '';\n  }, [visitDialog]);\n`;

source = source.slice(0, restoreStart) + replacement + source.slice(restoreEnd);

const clearAnchor = `      await clearFieldVisitDraft(fieldVisitDraftKey).catch(() => undefined);\n      clearFieldVisitEmergencyDraft(fieldVisitEmergencyKey);\n      setFieldVisitAutosaveAt(null);`;
ensure(source.includes(clearAnchor), 'successful save draft cleanup anchor not found');
source = source.replace(
  clearAnchor,
  `      await clearFieldVisitDraft(fieldVisitDraftKey).catch(() => undefined);\n      if (legacyFieldVisitDraftKey !== fieldVisitDraftKey) {\n        await clearFieldVisitDraft(legacyFieldVisitDraftKey).catch(() => undefined);\n      }\n      clearFieldVisitEmergencyDraft(fieldVisitEmergencyKey);\n      if (legacyFieldVisitEmergencyKey !== fieldVisitEmergencyKey) {\n        clearFieldVisitEmergencyDraft(legacyFieldVisitEmergencyKey);\n      }\n      setFieldVisitAutosaveAt(null);`,
);

fs.writeFileSync(path, source, 'utf8');
console.log('Applied per-site field visit draft persistence V3.');
