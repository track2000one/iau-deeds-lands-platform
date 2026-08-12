const fs = require('fs');

const dashboardPath = 'src/app/pages/AccountingTransformationDashboardPage.tsx';
let dashboard = fs.readFileSync(dashboardPath, 'utf8');
const oldDashboard = "                  const disabled = path.endsWith('/new') && !canAdd;";
const newDashboard = "                  const disabled = (path.endsWith('/new') || path.endsWith('/import')) && !canAdd;";
if (dashboard.includes(oldDashboard)) {
  dashboard = dashboard.replace(oldDashboard, newDashboard);
  fs.writeFileSync(dashboardPath, dashboard, 'utf8');
} else if (!dashboard.includes(newDashboard)) {
  throw new Error('Dashboard permission anchor not found');
}

const reportsPath = 'src/app/pages/AccountingTransformationReportsPage.tsx';
let reports = fs.readFileSync(reportsPath, 'utf8');
const oldExport = '<Button variant="outline" className="rounded-2xl" onClick={exportExcel}><Download className="ml-2 h-4 w-4" />Excel</Button>{canPrint && <Button className="rounded-2xl" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}';
const newExport = '{canPrint && <><Button variant="outline" className="rounded-2xl" onClick={exportExcel}><Download className="ml-2 h-4 w-4" />Excel</Button><Button className="rounded-2xl" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button></>}';
if (reports.includes(oldExport)) {
  reports = reports.replace(oldExport, newExport);
  fs.writeFileSync(reportsPath, reports, 'utf8');
} else if (!reports.includes(newExport)) {
  throw new Error('Reports permission anchor not found');
}

console.log('Accounting transformation permission polish applied.');
