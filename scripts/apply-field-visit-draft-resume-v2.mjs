import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

const marker = 'IAU_FIELD_VISIT_DRAFT_RESUME_V2';
if (source.includes(marker)) {
  console.log('Field visit draft resume V2 patch already applied.');
  process.exit(0);
}

const offlineImport = "} from '../utils/fieldVisitOffline';";
ensure(source.includes(offlineImport), 'fieldVisitOffline import anchor not found');
source = source.replace(
  offlineImport,
  `${offlineImport}\nimport {\n  clearFieldVisitEmergencyDraft,\n  loadFieldVisitEmergencyDraft,\n  makeFieldVisitEmergencyKey,\n  newestFieldVisitRecoveryDraft,\n  saveFieldVisitEmergencyDraft,\n} from '../utils/fieldVisitDraftRecovery';`,
);

const stateAnchor = '  const restoringDraftRef = React.useRef(false);';
ensure(source.includes(stateAnchor), 'restoringDraftRef anchor not found');
source = source.replace(
  stateAnchor,
  `${stateAnchor}\n  // ${marker}\n  const fieldVisitEmergencyKey = React.useMemo(\n    () => makeFieldVisitEmergencyKey(currentUsername || 'anonymous'),\n    [currentUsername],\n  );\n  const latestVisitFormRef = React.useRef(visitForm);\n  React.useEffect(() => {\n    latestVisitFormRef.current = visitForm;\n  }, [visitForm]);`,
);

const restoreStart = "  React.useEffect(() => {\n    if (!visitDialog || editingVisit || restoringDraftRef.current) return;";
const queueStart = "\n  const queueFieldVisitMedia = React.useCallback";
const startIndex = source.indexOf(restoreStart);
ensure(startIndex >= 0, 'existing draft restore effect not found');
const endIndex = source.indexOf(queueStart, startIndex);
ensure(endIndex > startIndex, 'queueFieldVisitMedia anchor not found');

const replacement = `  React.useEffect(() => {\n    if (!visitDialog || restoringDraftRef.current) return;\n    restoringDraftRef.current = true;\n    void (async () => {\n      try {\n        const [indexedDraft, rows] = await Promise.all([\n          loadFieldVisitDraft<VisitForm>(fieldVisitDraftKey),\n          listPendingFieldVisitMedia(currentUsername || 'anonymous'),\n        ]);\n        const emergencyDraft = loadFieldVisitEmergencyDraft<VisitForm>(fieldVisitEmergencyKey);\n        const expectedEditingVisitId = editingVisit?.id || null;\n        const draft = newestFieldVisitRecoveryDraft<VisitForm>(\n          [indexedDraft, emergencyDraft],\n          expectedEditingVisitId,\n        );\n        setPendingMediaCount(rows.length);\n        if (draft?.form) {\n          setVisitForm(hydrateOfflinePlaceholders(draft.form, rows));\n          setFieldVisitAutosaveAt(draft.savedAt);\n          toast.success('تم استعادة آخر مسودة محفوظة تلقائيًا ويمكنك متابعة التعبئة من حيث توقفت');\n        }\n      } catch {\n        // Local recovery must never block opening or completing a visit.\n      } finally {\n        restoringDraftRef.current = false;\n      }\n    })();\n  }, [visitDialog, editingVisit?.id, fieldVisitDraftKey, fieldVisitEmergencyKey, currentUsername, hydrateOfflinePlaceholders]);\n\n  React.useEffect(() => {\n    if (!visitDialog || restoringDraftRef.current) return;\n    latestVisitFormRef.current = visitForm;\n    const savedAt = new Date().toISOString();\n    const snapshot = {\n      username: currentUsername || 'anonymous',\n      form: visitForm,\n      editingVisitId: editingVisit?.id || null,\n      savedAt,\n    };\n\n    // Synchronous browser storage protects the latest keystroke/select change.\n    saveFieldVisitEmergencyDraft(fieldVisitEmergencyKey, snapshot);\n    setFieldVisitAutosaveAt(savedAt);\n\n    // IndexedDB remains the durable offline layer, including queued media references.\n    const timer = window.setTimeout(() => {\n      void saveFieldVisitDraft({\n        id: fieldVisitDraftKey,\n        ...snapshot,\n      }).catch(() => undefined);\n    }, 650);\n    return () => window.clearTimeout(timer);\n  }, [visitDialog, visitForm, editingVisit?.id, fieldVisitDraftKey, fieldVisitEmergencyKey, currentUsername]);\n\n  React.useEffect(() => {\n    if (!visitDialog) return;\n    const flushEmergencySnapshot = () => {\n      saveFieldVisitEmergencyDraft(fieldVisitEmergencyKey, {\n        username: currentUsername || 'anonymous',\n        form: latestVisitFormRef.current,\n        editingVisitId: editingVisit?.id || null,\n        savedAt: new Date().toISOString(),\n      });\n    };\n    const onVisibilityChange = () => {\n      if (document.visibilityState === 'hidden') flushEmergencySnapshot();\n    };\n\n    window.addEventListener('pagehide', flushEmergencySnapshot);\n    window.addEventListener('beforeunload', flushEmergencySnapshot);\n    document.addEventListener('visibilitychange', onVisibilityChange);\n    return () => {\n      window.removeEventListener('pagehide', flushEmergencySnapshot);\n      window.removeEventListener('beforeunload', flushEmergencySnapshot);\n      document.removeEventListener('visibilitychange', onVisibilityChange);\n    };\n  }, [visitDialog, editingVisit?.id, fieldVisitEmergencyKey, currentUsername]);\n`;

source = source.slice(0, startIndex) + replacement + source.slice(endIndex);

const clearAnchor = "      await clearFieldVisitDraft(fieldVisitDraftKey).catch(() => undefined);\n      setFieldVisitAutosaveAt(null);";
ensure(source.includes(clearAnchor), 'successful-save draft clear anchor not found');
source = source.replace(
  clearAnchor,
  "      await clearFieldVisitDraft(fieldVisitDraftKey).catch(() => undefined);\n      clearFieldVisitEmergencyDraft(fieldVisitEmergencyKey);\n      setFieldVisitAutosaveAt(null);",
);

fs.writeFileSync(path, source, 'utf8');
console.log('Applied field visit draft resume V2 with immediate emergency persistence.');
