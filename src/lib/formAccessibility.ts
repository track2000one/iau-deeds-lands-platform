const CONTROL_SELECTOR = [
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

  document.querySelectorAll<HTMLElement>(CONTROL_SELECTOR).forEach((control) => {
    if (!control.matches('[required], [aria-required="true"]')) return;
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
