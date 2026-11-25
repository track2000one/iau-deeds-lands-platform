const SNAPSHOT_ID = 'iau-dashboard-pdf-snapshot';

/**
 * Build a print-only snapshot outside the application's fixed 100vh shell.
 * The clone contains only the current user's visible, authorized data.
 */
export function printDashboardReport(source: HTMLElement): void {
  document.getElementById(SNAPSHOT_ID)?.remove();
  const snapshot = document.createElement('div');
  snapshot.id = SNAPSHOT_ID;
  snapshot.setAttribute('dir', source.closest('[dir]')?.getAttribute('dir') || 'rtl');
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.zoom = '1';
  clone.style.maxWidth = 'none';
  clone.style.width = '100%';
  clone.querySelectorAll('.dashboard-no-print, .dashboard-print-exclude').forEach((node) => node.remove());
  clone.querySelectorAll('input, select, textarea').forEach((node) => node.remove());
  clone.id = 'iau-dashboard-print-copy';
  snapshot.appendChild(clone);
  document.body.appendChild(snapshot);
  const cleanup = () => {
    snapshot.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
