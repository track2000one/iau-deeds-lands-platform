import fs from 'node:fs';

const filePath = 'src/app/pages/AccountingTransformationFormPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (needle, replacement, label) => {
  if (!source.includes(needle)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(needle, replacement);
};

replaceOnce(
`import {
  createAccountingTransformationRecord,
  getAccountingTransformationRecord,
  updateAccountingTransformationRecord,
  uploadAccountingTransformationFile,
} from '../api/accountingTransformation';`,
`import {
  createAccountingTransformationRecord,
  getAccountingTransformationRecord,
  getAccountingTransformationRecords,
  updateAccountingTransformationRecord,
  uploadAccountingTransformationFile,
} from '../api/accountingTransformation';`,
'accounting API import'
);

replaceOnce(
`};

export const AccountingTransformationFormPage: React.FC = () => {`,
`};

const isOwnershipDeedAttachment = (attachment: AccountingTransformationAttachment) => {
  const classified = inferAccountingAttachmentMeta(attachment);
  return classified.documentPurpose === 'ownership_acquisition' && /صك/.test(String(classified.documentType || ''));
};

export const AccountingTransformationFormPage: React.FC = () => {`,
'ownership deed helper'
);

replaceOnce(
`  const [uploading, setUploading] = useState(false);
  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);`,
`  const [uploading, setUploading] = useState(false);
  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);
  const [linkedAssetCheck, setLinkedAssetCheck] = useState<{
    status: 'idle' | 'checking' | 'deed_found' | 'found_without_deed' | 'not_found' | 'error';
    recordType?: AccountingRecordType;
    assetDescription?: string;
  }>({ status: 'idle' });
  const linkedAssetNumber = String(
    recordType === 'fixed_asset' ? (payload.X ?? '') : recordType === 'land' ? (payload.F ?? '') : ''
  ).trim();
  const currentLandHasDeed = useMemo(() => attachments.some(isOwnershipDeedAttachment), [attachments]);`,
'linked asset state'
);

replaceOnce(
`    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!recordId) return;`,
`    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (recordType !== 'fixed_asset' || !linkedAssetNumber) {
      setLinkedAssetCheck({ status: 'idle' });
      return;
    }

    let active = true;
    setLinkedAssetCheck({ status: 'checking' });
    const timer = window.setTimeout(() => {
      getAccountingTransformationRecords({ search: linkedAssetNumber, all: true, limit: 200 })
        .then((page) => {
          if (!active) return;
          const linkedRecord = page.items.find((item) => {
            if (item.id === recordId) return false;
            const references = [
              item.mofAssetNumber,
              item.entityAssetNumber,
              item.recordNumber,
              item.payload?.D,
              item.payload?.E,
              item.payload?.Y,
              item.payload?.Z,
            ];
            return references.some((reference) => String(reference ?? '').trim() === linkedAssetNumber);
          });
          if (!linkedRecord) {
            setLinkedAssetCheck({ status: 'not_found' });
            return;
          }
          const hasDeed = (linkedRecord.attachments || []).some(isOwnershipDeedAttachment);
          setLinkedAssetCheck({
            status: hasDeed ? 'deed_found' : 'found_without_deed',
            recordType: linkedRecord.recordType,
            assetDescription: linkedRecord.assetDescription || undefined,
          });
        })
        .catch(() => {
          if (active) setLinkedAssetCheck({ status: 'error' });
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recordType, linkedAssetNumber, recordId]);

  useEffect(() => {
    if (!recordId) return;`,
'linked asset verification effect'
);

replaceOnce(
`    const responsiblePartyField =
      (recordType === 'fixed_asset' && field.c === 'V') ||`,
`    const linkedAssetField =
      (recordType === 'fixed_asset' && field.c === 'X') ||
      (recordType === 'land' && field.c === 'F');
    if (linkedAssetField) {
      const hasValue = Boolean(String(value).trim());
      let statusClass = 'border-slate-200 bg-slate-50 text-slate-600';
      let statusText = 'الرقم يثبت وجود أصل مرتبط فقط، ولا يُعد إثباتًا لوجود صك ملكية.';

      if (hasValue && recordType === 'land') {
        if (currentLandHasDeed) {
          statusClass = 'border-emerald-200 bg-emerald-50 text-emerald-800';
          statusText = 'يوجد أصل مرتبط، وصك ملكية الأرض موجود ضمن المرفقات المصنفة.';
        } else {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = 'يوجد أصل مرتبط، لكن لا يوجد صك ملكية مصنف لهذه الأرض. الرقم وحده لا يثبت وجود الصك.';
        }
      } else if (hasValue && recordType === 'fixed_asset') {
        if (linkedAssetCheck.status === 'checking') {
          statusClass = 'border-sky-200 bg-sky-50 text-sky-800';
          statusText = 'جاري التحقق من الأصل المرتبط ووثائق الملكية...';
        } else if (linkedAssetCheck.status === 'deed_found') {
          statusClass = 'border-emerald-200 bg-emerald-50 text-emerald-800';
          statusText = `تم العثور على الأصل المرتبط${linkedAssetCheck.assetDescription ? ` (${linkedAssetCheck.assetDescription})` : ''} ويوجد صك ملكية مصنف ضمن مرفقاته.`;
        } else if (linkedAssetCheck.status === 'found_without_deed') {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = `تم العثور على الأصل المرتبط${linkedAssetCheck.assetDescription ? ` (${linkedAssetCheck.assetDescription})` : ''}، لكن لا يوجد صك ملكية مصنف ضمن مرفقاته.`;
        } else if (linkedAssetCheck.status === 'not_found') {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = 'لم يتم العثور على سجل مطابق لهذا الرقم. سيبقى الرقم كرابط مرجعي فقط حتى يتم تسجيل الأصل المرتبط.';
        } else if (linkedAssetCheck.status === 'error') {
          statusClass = 'border-slate-200 bg-slate-50 text-slate-600';
          statusText = 'تعذر التحقق الآن من الأصل المرتبط. لن تعتبر المنصة الرقم دليلًا على وجود صك.';
        }
      }

      return <div className="space-y-1.5">
        <Input value={String(value)} onChange={(e) => setField(field.c, e.target.value)} placeholder="أدخل الرقم الفريد للأصل المرتبط" />
        <p className={`rounded-xl border px-2.5 py-2 text-[10px] leading-5 ${statusClass}`}>{statusText}</p>
      </div>;
    }

    const responsiblePartyField =
      (recordType === 'fixed_asset' && field.c === 'V') ||`,
'linked asset field UI'
);

fs.writeFileSync(filePath, source);
console.log('Applied linked asset deed verification.');
// Workflow trigger: verification rule v1
