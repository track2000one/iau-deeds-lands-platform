import fs from 'node:fs';

const filePath = 'src/app/pages/AddAssetPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const formatMarker = `const formatFileSize = (size: number) => {
  if (size < 1024) return \`\${size} B\`;
  if (size < 1024 * 1024) return \`\${(size / 1024).toFixed(1)} KB\`;
  return \`\${(size / (1024 * 1024)).toFixed(1)} MB\`;
};`;

const previewComponent = `${formatMarker}

const AttachmentImagePreview: React.FC<{ file: File }> = ({ file }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  if (!isImage || !previewUrl) return null;

  return (
    <div className=\"relative overflow-hidden border-b bg-slate-100\">
      <img
        src={previewUrl}
        alt={\`معاينة \${file.name}\`}
        className=\"h-44 w-full bg-slate-100 object-contain sm:h-52\"
      />
      <div className=\"absolute bottom-2 right-2 rounded-lg bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm\">
        معاينة الصورة
      </div>
    </div>
  );
};`;

if (!source.includes('const AttachmentImagePreview: React.FC')) {
  if (!source.includes(formatMarker)) throw new Error('formatFileSize marker not found');
  source = source.replace(formatMarker, previewComponent);
}

const oldFileCard = `                      {files.map((file, index) => (
                        <div key={\`\${file.name}-\${file.lastModified}-\${index}\`} className=\"flex items-center justify-between gap-3 rounded-xl border bg-background/80 px-3 py-2\">
                          <div className=\"min-w-0\">
                            <p className=\"truncate text-sm font-medium\">{file.name}</p>
                            <p className=\"text-xs text-muted-foreground\">{formatFileSize(file.size)}</p>
                          </div>
                          <Button type=\"button\" variant=\"ghost\" size=\"icon\" onClick={() => removeFile(section.key, index)} className=\"h-8 w-8 shrink-0\">
                            <X className=\"h-4 w-4\" />
                          </Button>
                        </div>
                      ))}`;

const newFileCard = `                      {files.map((file, index) => (
                        <div key={\`\${file.name}-\${file.lastModified}-\${index}\`} className=\"overflow-hidden rounded-xl border bg-background/80 shadow-sm\">
                          <AttachmentImagePreview file={file} />
                          <div className=\"flex items-center justify-between gap-3 px-3 py-2.5\">
                            <div className=\"min-w-0\">
                              <p className=\"truncate text-sm font-medium\">{file.name}</p>
                              <p className=\"text-xs text-muted-foreground\">{formatFileSize(file.size)}</p>
                            </div>
                            <Button type=\"button\" variant=\"ghost\" size=\"icon\" onClick={() => removeFile(section.key, index)} className=\"h-8 w-8 shrink-0\">
                              <X className=\"h-4 w-4\" />
                            </Button>
                          </div>
                        </div>
                      ))}`;

if (!source.includes('<AttachmentImagePreview file={file} />')) {
  if (!source.includes(oldFileCard)) throw new Error('attachment file card marker not found');
  source = source.replace(oldFileCard, newFileCard);
}

fs.writeFileSync(filePath, source);
console.log('Applied immediate image previews for asset attachments.');
