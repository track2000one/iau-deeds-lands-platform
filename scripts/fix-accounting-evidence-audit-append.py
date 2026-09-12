from pathlib import Path

p = Path('src/app/config/accountingPropertyEvidenceHistory.ts')
s = p.read_text(encoding='utf-8')
old = "  const history = previous?.history ? [...previous.history] : [...(next.history || [])];\n  const add = (event: EvidenceHistoryEvent) => history.push(event);\n"
new = "  const previousHistory = [...(previous?.history || [])];\n  const previousIds = new Set(previousHistory.map((event) => event.id));\n  const pendingEvents = previous\n    ? (next.history || []).filter((event) => !previousIds.has(event.id))\n    : [...(next.history || [])];\n  const history = [...previousHistory, ...pendingEvents];\n  const add = (event: EvidenceHistoryEvent) => history.push(event);\n"
if s.count(old) != 1:
    raise SystemExit('append-only merge marker not found exactly once')
s = s.replace(old, new, 1)
# Keep derived system milestone keys stable between renders.
repls = [
    ("    events.push(createEvidenceHistoryEvent('note', `دخلت المهمة نطاق الاستحقاق القريب (خلال ${EVIDENCE_ESCALATION_CONFIG.dueSoonDays} أيام).`, {\n      at: dueSoonAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }));",
     "    events.push({ ...createEvidenceHistoryEvent('note', `دخلت المهمة نطاق الاستحقاق القريب (خلال ${EVIDENCE_ESCALATION_CONFIG.dueSoonDays} أيام).`, {\n      at: dueSoonAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }), id: `system-due-soon-${entry.dueDate}` });"),
    ("    events.push(createEvidenceHistoryEvent('note', 'انتقلت المهمة إلى حالة متأخرة بعد تجاوز تاريخ الاستحقاق.', {\n      at: overdueAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }));",
     "    events.push({ ...createEvidenceHistoryEvent('note', 'انتقلت المهمة إلى حالة متأخرة بعد تجاوز تاريخ الاستحقاق.', {\n      at: overdueAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }), id: `system-overdue-${entry.dueDate}` });"),
    ("    events.push(createEvidenceHistoryEvent('note', `انتقلت المهمة إلى مستوى التصعيد «${EVIDENCE_ESCALATION_LABELS.critical}».`, {\n      at: criticalAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }));",
     "    events.push({ ...createEvidenceHistoryEvent('note', `انتقلت المهمة إلى مستوى التصعيد «${EVIDENCE_ESCALATION_LABELS.critical}».`, {\n      at: criticalAt.toISOString(),\n      actor: 'النظام',\n      source: 'system',\n    }), id: `system-critical-${entry.dueDate}` });"),
]
for old_value, new_value in repls:
    if s.count(old_value) != 1:
        raise SystemExit('system milestone marker not found exactly once')
    s = s.replace(old_value, new_value, 1)
p.write_text(s, encoding='utf-8')
