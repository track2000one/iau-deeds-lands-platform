from pathlib import Path

root = Path('.')
globals_path = root / 'src/styles/globals.css'
main_path = root / 'src/main.tsx'
helper_path = root / 'src/lib/formAccessibility.ts'

globals_text = globals_path.read_text(encoding='utf-8')
main_text = main_path.read_text(encoding='utf-8')

marker = '/* ===== Global form focus, selection, and required-field accessibility ===== */'
css_block = r'''

/* ===== Global form focus, selection, and required-field accessibility ===== */
:root {
  --app-focus: #0284c7;
  --app-focus-ring: rgba(14, 165, 233, 0.20);
  --app-focus-glow: rgba(14, 165, 233, 0.22);
  --app-required-bg: #fff9c4;
  --app-required-border: #facc15;
  --app-selection-bg: #7dd3fc;
  --app-selection-text: #0f172a;
}

/* Text selection must stay visible in every editable field and normal page text. */
::selection {
  background: var(--app-selection-bg) !important;
  color: var(--app-selection-text) !important;
}

input::selection,
textarea::selection,
[contenteditable="true"]::selection {
  background: #38bdf8 !important;
  color: #082f49 !important;
}

::-moz-selection {
  background: var(--app-selection-bg) !important;
  color: var(--app-selection-text) !important;
}

/* Required fields: visual hint only; validation behavior remains controlled by the app. */
:where(input, textarea, select)[required]:not(:disabled):not([readonly]),
:where(input, textarea, select)[aria-required="true"]:not(:disabled):not([readonly]),
:where(input, textarea, select)[data-app-required="true"]:not(:disabled):not([readonly]),
[role="combobox"][aria-required="true"]:not([aria-disabled="true"]),
[role="combobox"][data-app-required="true"]:not([aria-disabled="true"]) {
  background-color: var(--app-required-bg) !important;
  border-color: var(--app-required-border) !important;
  box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.14) !important;
}

label[data-app-required-label="true"] {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-weight: 750;
}

label[data-app-required-label="true"]::after {
  content: "مطلوب";
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
  padding: 0.08rem 0.42rem;
  border: 1px solid #facc15;
  border-radius: 999px;
  background: #fef08a;
  color: #854d0e;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(133, 77, 14, 0.08);
}

/* Strong, consistent focus indicator for mouse and keyboard navigation. */
:where(input, textarea, select, [role="combobox"], [contenteditable="true"]):not(:disabled):not([aria-disabled="true"]):focus,
:where(input, textarea, select, [role="combobox"], [contenteditable="true"]):not(:disabled):not([aria-disabled="true"]):focus-visible {
  outline: 3px solid rgba(14, 165, 233, 0.68) !important;
  outline-offset: 2px !important;
  border-color: var(--app-focus) !important;
  box-shadow:
    0 0 0 4px var(--app-focus-ring),
    0 0 20px var(--app-focus-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.65) !important;
  caret-color: #075985 !important;
  position: relative;
  z-index: 1;
}

/* Keyboard users should also always know which interactive control is active. */
:where(button, a[href], [role="button"], [role="tab"], [tabindex]):focus-visible {
  outline: 3px solid rgba(14, 165, 233, 0.68) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.14) !important;
}

/* Error state takes priority over the yellow required-field hint. */
:where(input, textarea, select)[aria-invalid="true"],
[role="combobox"][aria-invalid="true"] {
  background-color: #fff7f7 !important;
  border-color: #ef4444 !important;
  outline-color: rgba(239, 68, 68, 0.55) !important;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.11) !important;
}

/* Read-only/disabled fields are intentionally visually distinct from editable required fields. */
:where(input, textarea, select):disabled,
:where(input, textarea)[readonly],
[role="combobox"][aria-disabled="true"] {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
  color: #64748b !important;
  box-shadow: none !important;
}

:where(input, textarea, select):disabled,
[role="combobox"][aria-disabled="true"] {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: no-preference) {
  :where(input, textarea, select, [role="combobox"], [contenteditable="true"]) {
    transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease, outline-color 140ms ease;
  }
}
'''

if marker not in globals_text:
    globals_path.write_text(globals_text.rstrip() + css_block + '\n', encoding='utf-8')

helper_path.write_text(r'''const CONTROL_SELECTOR = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
  'textarea',
  'select',
  '[role="combobox"]',
].join(',');

let formAccessibilityInstalled = false;
let scheduled = false;

const isEditableControl = (element: Element | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.matches('[disabled], [aria-disabled="true"], [readonly]')) return false;
  return element.matches(CONTROL_SELECTOR);
};

const findControlForLabel = (label: HTMLLabelElement): HTMLElement | null => {
  if (label.htmlFor) {
    const explicit = document.getElementById(label.htmlFor);
    if (isEditableControl(explicit)) return explicit;
  }

  const nested = label.querySelector(CONTROL_SELECTOR);
  if (isEditableControl(nested)) return nested;

  let scope: HTMLElement | null = label.parentElement;
  for (let depth = 0; scope && depth < 5; depth += 1, scope = scope.parentElement) {
    const candidate = scope.querySelector(CONTROL_SELECTOR);
    if (isEditableControl(candidate)) return candidate;
  }
  return null;
};

const markRequiredLabel = (label: HTMLLabelElement, control: HTMLElement) => {
  label.dataset.appRequiredLabel = 'true';
  control.dataset.appRequired = 'true';
  if (!control.hasAttribute('aria-required')) control.setAttribute('aria-required', 'true');
};

const enhanceRequiredFields = () => {
  document.querySelectorAll<HTMLLabelElement>('label').forEach((label) => {
    const labelText = (label.textContent || '').replace(/\s+/g, ' ').trim();
    const hasRequiredCue = labelText.includes('*') || /(^|\s)مطلوب(\s|$)/.test(labelText);
    if (!hasRequiredCue) return;
    const control = findControlForLabel(label);
    if (control) markRequiredLabel(label, control);
  });

  document.querySelectorAll<HTMLElement>(`${CONTROL_SELECTOR}[required], ${CONTROL_SELECTOR}[aria-required="true"]`).forEach((control) => {
    control.dataset.appRequired = 'true';
    const id = control.id;
    const associatedLabel = id
      ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`)
      : control.closest('label');
    if (associatedLabel) associatedLabel.dataset.appRequiredLabel = 'true';
  });
};

const scheduleEnhancement = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhanceRequiredFields();
  });
};

export const installFormAccessibilityEnhancements = () => {
  if (formAccessibilityInstalled || typeof document === 'undefined') return;
  formAccessibilityInstalled = true;

  scheduleEnhancement();
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length > 0)) scheduleEnhancement();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
};
''', encoding='utf-8')

import_anchor = 'import "./lib/leafletIconFix";'
accessibility_import = 'import { installFormAccessibilityEnhancements } from "./lib/formAccessibility";'
if accessibility_import not in main_text:
    if import_anchor not in main_text:
        raise SystemExit('Missing leaflet import anchor in main.tsx')
    main_text = main_text.replace(import_anchor, import_anchor + '\n' + accessibility_import, 1)

render_anchor = '  createRoot(document.getElementById("root")!).render(<App />);'
if 'installFormAccessibilityEnhancements();' not in main_text:
    if render_anchor not in main_text:
        raise SystemExit('Missing React render anchor in main.tsx')
    main_text = main_text.replace(render_anchor, '  installFormAccessibilityEnhancements();\n\n' + render_anchor, 1)

main_path.write_text(main_text, encoding='utf-8')
print('Global form accessibility enhancement applied')
