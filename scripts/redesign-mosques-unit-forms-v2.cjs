const fs = require('fs');
const pagePath = 'src/app/pages/MosquesUnitPage.tsx';
let s = fs.readFileSync(pagePath, 'utf8');

const fragment = (name) => fs.readFileSync(`scripts/mosque-form-fragments/${name}.jsx.txt`, 'utf8').trimEnd();

const replaceBlock = (startToken, endToken, replacement) => {
  const start = s.indexOf(startToken);
  if (start < 0) throw new Error(`Missing start token: ${startToken}`);
  const end = s.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error(`Missing end token: ${endToken}`);
  s = s.slice(0, start) + replacement + '\n\n      ' + endToken + s.slice(end + endToken.length);
};

replaceBlock('      <Dialog open={siteDialog}', '<Dialog open={requestDialog}', fragment('site'));
replaceBlock('      <Dialog open={requestDialog}', '<Dialog open={leaveDialog}', fragment('request'));
replaceBlock('      <Dialog open={leaveDialog}', '<Dialog open={statusDialog}', fragment('leave'));
replaceBlock('      <Dialog open={statusDialog}', '<Dialog open={Boolean(qrSite)}', fragment('status'));
replaceBlock('      <Dialog open={personnelDialog}', '    </div>\n  );', fragment('personnel'));

if (!s.includes('sm:max-w-[1180px]')) throw new Error('Site dialog was not widened');
if (!s.includes('sm:max-w-[900px]')) throw new Error('Personnel dialog was not widened');
if (!s.includes('المعلومات الأساسية') || !s.includes('الموقع الجغرافي')) throw new Error('Site form sections missing');
if (!s.includes('الارتباط والصفة') || !s.includes('بيانات المنسوب')) throw new Error('Personnel form sections missing');
if (!s.includes('وصف الاحتياج') || !s.includes('الفترة والبديل')) throw new Error('Workflow form sections missing');

fs.writeFileSync(pagePath, s, 'utf8');
console.log('Mosques unit forms redesigned with robust fragments.');
