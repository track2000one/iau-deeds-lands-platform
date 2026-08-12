const fs = require('fs');

const path = 'src/app/pages/ArchivePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const start = content.indexOf('      <section className="overflow-hidden rounded-[28px]');
const end = content.indexOf('      <AlertDialog open={deleteDialogOpen}', start);

if (start < 0 || end < 0) {
  throw new Error('Archive 3D card block not found');
}

let block = content.slice(start, end);

const replacements = [
  ['ملفات الأرشفة (${filteredDocuments.length})', 'ملفات الأرشفة ({filteredDocuments.length})'],
  ['${filteredDocuments.length} ملف', '{filteredDocuments.length} ملف'],
  ["${doc.category || 'غير مصنف'}", "{doc.category || 'غير مصنف'}"],
  ['${getConfidentialityLabel(doc.confidentiality)}', '{getConfidentialityLabel(doc.confidentiality)}'],
  ['${doc.title}', '{doc.title}'],
  ['${doc.originalName || doc.fileName}', '{doc.originalName || doc.fileName}'],
  ["${doc.documentNumber || '-'}", "{doc.documentNumber || '-'}"],
  ['${formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}', '{formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}'],
  ["${doc.issuingAuthority || '-'}", "{doc.issuingAuthority || '-'}"],
  ['${getArchiveFileTypeLabel(doc)}', '{getArchiveFileTypeLabel(doc)}'],
  ['${formatFileSize(doc.fileSize)}', '{formatFileSize(doc.fileSize)}'],
  ['#${tag}', '#{tag}'],
];

for (const [from, to] of replacements) {
  block = block.split(from).join(to);
}

content = content.slice(0, start) + block + content.slice(end);
fs.writeFileSync(path, content, 'utf8');
console.log('Archive card JSX bindings corrected.');
