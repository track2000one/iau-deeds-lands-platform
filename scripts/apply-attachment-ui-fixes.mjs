import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
};

// AddDeed: use authenticated requests for protected upload/attachment endpoints.
const deedPath = 'src/app/pages/AddDeedPage.tsx';
let deed = fs.readFileSync(deedPath, 'utf8');
deed = replaceOnce(
  deed,
  "import { usePermissions } from '../../context/PermissionsContext';\n",
  "import { authenticatedFetch } from '../../lib/http';\n",
  'AddDeed authenticatedFetch import',
);
deed = replaceOnce(
  deed,
  "  const { addDeed } = useDeeds();\n  const { isAdmin } = usePermissions();",
  "  const { addDeed } = useDeeds();",
  'AddDeed unused permission hook',
);
deed = replaceOnce(
  deed,
  "    const maxSizeMB = 10;",
  "    const maxSizeMB = 20;",
  'AddDeed upload size alignment',
);
deed = replaceOnce(
  deed,
  "    const response = await fetch(`${API_BASE_URL}/api/uploads`, {\n      method: 'POST',\n      body: formData,\n    });",
  "    const response = await authenticatedFetch('/api/uploads', {\n      method: 'POST',\n      headers: { 'X-Upload-Module': 'deeds' },\n      body: formData,\n    });",
  'AddDeed authenticated upload',
);
deed = replaceOnce(
  deed,
  "      const response = await fetch(`${API_BASE_URL}/api/attachments`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n        },",
  "      const response = await authenticatedFetch('/api/attachments', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n        },",
  'AddDeed authenticated attachment save',
);
fs.writeFileSync(deedPath, deed);

// Allocated lands: distinguish administrative use and open external maps safely.
const allocatedPath = 'src/app/pages/AllocatedLandsPage.tsx';
let allocated = fs.readFileSync(allocatedPath, 'utf8');
allocated = replaceOnce(
  allocated,
  "  { value: 'other', label: 'أخرى' },\n  { value: 'other', label: 'إداري' },",
  "  { value: 'other', label: 'أخرى' },\n  { value: 'administrative', label: 'إداري' },",
  'allocated administrative usage type',
);
allocated = replaceOnce(
  allocated,
  "    window.open(`https://www.google.com/maps/search/?api=1&query=${land.coordinates}`, '_blank');",
  "    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(land.coordinates)}`, '_blank', 'noopener,noreferrer');",
  'allocated map safe open',
);
fs.writeFileSync(allocatedPath, allocated);

// Shared upload widget: remove archive formats not accepted by the backend whitelist.
const uploadPath = 'src/app/components/FileUploadZone.tsx';
let upload = fs.readFileSync(uploadPath, 'utf8');
upload = replaceOnce(
  upload,
  "  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar',",
  "  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4',",
  'FileUploadZone default types',
);
fs.writeFileSync(uploadPath, upload);

console.log('Attachment and UI fixes applied.');
