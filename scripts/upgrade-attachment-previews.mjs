import fs from 'node:fs';

const path = 'src/app/pages/ViewDeedPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const importNeedle = "import { AppDateField } from '../components/AppDateField';\n";
const importLine = "import { AttachmentPreviewCard } from '../components/AttachmentPreview';\n";

if (!source.includes(importLine)) {
  if (!source.includes(importNeedle)) {
    throw new Error('Could not find AppDateField import in ViewDeedPage.tsx');
  }
  source = source.replace(importNeedle, importNeedle + importLine);
}

const startMarker = '            {attachments.map((att: any, index: number) => (\n';
const endMarker = '            ))}\n          </div>\n        )}\n';

const start = source.indexOf(startMarker);
if (start === -1) {
  if (source.includes('<AttachmentPreviewCard')) {
    console.log('ViewDeedPage already upgraded.');
    process.exit(0);
  }
  throw new Error('Could not find the legacy attachment grid start marker.');
}

const end = source.indexOf(endMarker, start);
if (end === -1) {
  throw new Error('Could not find the legacy attachment grid end marker.');
}

const replacement = `            {attachments.map((att: any, index: number) => {\n              const normalizedAttachment = {\n                ...att,\n                title: getAttachmentName(att),\n                driveUrl: getAttachmentUrl(att),\n                fileUrl: att?.fileUrl || undefined,\n                mimeType: getAttachmentMimeType(att),\n                driveFileId: extractGoogleDriveFileId(att) || undefined,\n              };\n\n              return (\n                <AttachmentPreviewCard\n                  key={att.id || getAttachmentUrl(att) || \`\${getAttachmentName(att)}-\${index}\`}\n                  attachment={normalizedAttachment}\n                  compact\n                  onOpen={() => openAttachment(att)}\n                  actions={\n                    <div className=\"grid grid-cols-3 gap-1\">\n                      <Button\n                        size=\"sm\"\n                        variant=\"outline\"\n                        className=\"h-8 text-xs\"\n                        onClick={() => openAttachment(att)}\n                        title=\"معاينة / فتح\"\n                      >\n                        <Eye className=\"h-3.5 w-3.5\" />\n                      </Button>\n\n                      <Button\n                        size=\"sm\"\n                        variant=\"outline\"\n                        className=\"h-8 text-xs\"\n                        onClick={() => downloadAttachment(att)}\n                        title=\"تنزيل الملف\"\n                      >\n                        <Download className=\"h-3.5 w-3.5\" />\n                      </Button>\n\n                      <Button\n                        size=\"sm\"\n                        variant=\"outline\"\n                        className=\"h-8 text-xs text-destructive hover:text-destructive\"\n                        onClick={async () => {\n                          try {\n                            if (API_BASE_URL && att.id) {\n                              const response = await authenticatedFetch(\`/api/attachments/\${att.id}\`, {\n                                method: 'DELETE',\n                              });\n\n                              if (!response.ok) {\n                                const body = await response.json().catch(() => ({}));\n                                throw new Error(body?.message || 'فشل في حذف المرفق');\n                              }\n\n                              setBackendAttachments((prev) => prev.filter((item) => item.id !== att.id));\n                            } else {\n                              await deleteAttachment(deedId, att.id);\n                            }\n\n                            toast.success('تم حذف المرفق');\n                          } catch (error) {\n                            console.error('Delete attachment error:', error);\n                            toast.error(error instanceof Error ? error.message : 'فشل في حذف المرفق');\n                          }\n                        }}\n                        title=\"حذف المرفق\"\n                      >\n                        <Trash2 className=\"h-3.5 w-3.5\" />\n                      </Button>\n                    </div>\n                  }\n                />\n              );\n            })}\n`;

source = source.slice(0, start) + replacement + source.slice(end + '            ))}\n'.length);

fs.writeFileSync(path, source, 'utf8');
console.log('Upgraded ViewDeedPage attachment previews.');
