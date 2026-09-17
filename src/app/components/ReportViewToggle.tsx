import React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from './ui/button';

type ReportViewMode = 'cards' | 'table';

type Props = {
  storageKey: string;
  scopeId: string;
  className?: string;
  defaultMode?: ReportViewMode;
};

const readMode = (storageKey: string, fallback: ReportViewMode): ReportViewMode => {
  try {
    return window.localStorage.getItem(storageKey) === 'cards' ? 'cards' : window.localStorage.getItem(storageKey) === 'table' ? 'table' : fallback;
  } catch {
    return fallback;
  }
};

export const ReportViewToggle: React.FC<Props> = ({ storageKey, scopeId, className = '', defaultMode = 'table' }) => {
  const [mode, setMode] = React.useState<ReportViewMode>(() => readMode(storageKey, defaultMode));

  React.useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) return;

    scope.dataset.reportView = mode;
    scope.classList.toggle('iau-report-cards-mode', mode === 'cards');
    scope.classList.toggle('iau-report-table-mode', mode === 'table');

    if (mode === 'cards') {
      scope.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
        const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).map((header) => (header.textContent || '').trim());
        table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
          Array.from(row.cells).forEach((cell, index) => {
            cell.dataset.reportLabel = headers[index] || '';
          });
        });
      });
    }

    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      // Keep the selected mode for the current session when storage is unavailable.
    }
  }, [mode, scopeId, storageKey]);

  return (
    <>
      <div className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm ${className}`} dir="rtl" aria-label="طريقة عرض التقرير">
        <Button
          type="button"
          size="sm"
          variant={mode === 'cards' ? 'default' : 'ghost'}
          onClick={() => setMode('cards')}
          className="gap-2 rounded-lg px-3 font-bold"
          aria-pressed={mode === 'cards'}
        >
          <LayoutGrid className="h-4 w-4" />
          بطاقات
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'table' ? 'default' : 'ghost'}
          onClick={() => setMode('table')}
          className="gap-2 rounded-lg px-3 font-bold"
          aria-pressed={mode === 'table'}
        >
          <Table2 className="h-4 w-4" />
          جدول
        </Button>
      </div>

      <style>{`
        #${scopeId}.iau-report-cards-mode table { display: block; width: 100%; min-width: 0 !important; }
        #${scopeId}.iau-report-cards-mode table thead { display: none !important; }
        #${scopeId}.iau-report-cards-mode table tbody {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          width: 100%;
        }
        #${scopeId}.iau-report-cards-mode table tbody tr {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
          overflow: hidden;
          border: 1px solid rgb(203 213 225 / .95) !important;
          border-radius: 18px;
          background: linear-gradient(180deg, rgb(255 255 255), rgb(248 250 252));
          box-shadow: 0 5px 0 rgb(100 116 139 / .10), 0 12px 24px rgb(15 23 42 / .07);
        }
        #${scopeId}.iau-report-cards-mode table tbody td {
          display: block !important;
          min-width: 0 !important;
          width: auto !important;
          height: auto !important;
          padding: 10px 12px !important;
          border: 0 !important;
          border-bottom: 1px solid rgb(226 232 240 / .8) !important;
          white-space: normal !important;
          overflow-wrap: anywhere;
          text-align: right !important;
          vertical-align: top !important;
        }
        #${scopeId}.iau-report-cards-mode table tbody td::before {
          content: attr(data-report-label);
          display: block;
          margin-bottom: 4px;
          color: rgb(100 116 139);
          font-size: .72em;
          font-weight: 700;
          line-height: 1.25;
        }
        #${scopeId}.iau-report-cards-mode table tbody td:has(button),
        #${scopeId}.iau-report-cards-mode table tbody td:has(a) { grid-column: 1 / -1; }
        #${scopeId}.iau-report-cards-mode table tbody tr:hover {
          border-color: rgb(56 189 248 / .9) !important;
          box-shadow: 0 7px 0 rgb(14 165 233 / .10), 0 16px 28px rgb(15 23 42 / .09);
        }
        @media (max-width: 1279px) {
          #${scopeId}.iau-report-cards-mode table tbody { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 767px) {
          #${scopeId}.iau-report-cards-mode table tbody { grid-template-columns: 1fr; }
          #${scopeId}.iau-report-cards-mode table tbody tr { grid-template-columns: 1fr; }
          #${scopeId}.iau-report-cards-mode table tbody td { grid-column: 1 / -1; }
        }
        @media print {
          #${scopeId}.iau-report-cards-mode table { display: table !important; }
          #${scopeId}.iau-report-cards-mode table thead { display: table-header-group !important; }
          #${scopeId}.iau-report-cards-mode table tbody { display: table-row-group !important; }
          #${scopeId}.iau-report-cards-mode table tbody tr { display: table-row !important; box-shadow: none !important; }
          #${scopeId}.iau-report-cards-mode table tbody td { display: table-cell !important; }
          #${scopeId}.iau-report-cards-mode table tbody td::before { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default ReportViewToggle;
