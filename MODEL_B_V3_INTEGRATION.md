# Model B v3 integration

- Canonical output: نموذج (ب - استدامة) سجل الأصول الثابتة — النسخة الثالثة (24-06-2026).
- Unit Assets remains the central Master Asset Register.
- Accounting Transformation is a reconciliation/review workflow, not a second competing master.
- Incoming departmental Excel workbooks may be partial, reordered, renamed, or contain additional sheets.
- Model B sheets are recognized from their field headers and stored as `fixed_asset` records.
- Legacy land/building workbooks remain supported during transition.
- Blank/omitted values in partial updates do not mean deletion; explicit clearing requires an explicit clear instruction.
- Strong identity prefers MoF unique asset number and entity unique asset number. Classification codes are never treated as a unique asset identity for Model B.
- Legacy color rules are isolated from Model B and run only on their intended legacy source type.
