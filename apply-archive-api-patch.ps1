$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\iau-deeds-lands-platform"
$FilePath = Join-Path $ProjectRoot "src\app\pages\ArchivePage.tsx"

if (-not (Test-Path $FilePath)) {
    throw "لم يتم العثور على الملف: $FilePath"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$FilePath.backup-$timestamp"
Copy-Item $FilePath $backup -Force
Write-Host "تم إنشاء نسخة احتياطية:" $backup -ForegroundColor Green

$content = Get-Content $FilePath -Raw -Encoding UTF8

function Replace-Required {
    param(
        [string]$Name,
        [string]$Pattern,
        [string]$Replacement
    )

    $newContent = [regex]::Replace(
        $script:content,
        $Pattern,
        $Replacement,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($newContent -eq $script:content) {
        throw "تعذر تطبيق التعديل: $Name. أعد الملف من النسخة الاحتياطية وأرسل ArchivePage.tsx الحالي."
    }

    $script:content = $newContent
    Write-Host "تم: $Name" -ForegroundColor Cyan
}

Replace-Required `
    "إضافة useEffect" `
    "import React, \{ useMemo, useRef, useState \} from 'react';" `
    "import React, { useEffect, useMemo, useRef, useState } from 'react';"

Replace-Required `
    "إلغاء مفتاح التخزين المحلي" `
    "const STORAGE_KEY = 'iau_archive_documents_v1';\r?\n" `
    "const LEGACY_STORAGE_KEY = 'iau_archive_documents_v1';`r`n"

Replace-Required `
    "إزالة دوال localStorage القديمة" `
    "const loadArchiveDocuments = \(\): ArchiveDocument\[\] => \{.*?\};\r?\n\r?\nconst saveArchiveDocuments = \(items: ArchiveDocument\[\]\) => \{.*?\};\r?\n" `
    ""

Replace-Required `
    "تغيير تهيئة قائمة الأرشفة" `
    "const \[documents, setDocuments\] = useState<ArchiveDocument\[\]>\(\(\) => loadArchiveDocuments\(\)\);" `
    "const [documents, setDocuments] = useState<ArchiveDocument[]>([]);"

Replace-Required `
    "إزالة persistDocuments" `
    "  const persistDocuments = \(items: ArchiveDocument\[\]\) => \{.*?  \};\r?\n\r?\n" `
    ""

$apiBlock = @'
  const [isLoading, setIsLoading] = useState(true);

  const archiveRequest = async <T,>(
    path = '',
    options: RequestInit = {}
  ): Promise<T> => {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_URL غير موجود. تأكد من ربط الواجهة بالـ Backend.');
    }

    const response = await fetch(`${API_BASE_URL}/api/archive${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || 'تعذر تنفيذ عملية الأرشفة');
    }

    return body as T;
  };

  const loadDocumentsFromServer = async () => {
    const remote = await archiveRequest<ArchiveDocument[]>();
    setDocuments(Array.isArray(remote) ? remote : []);
    return Array.isArray(remote) ? remote : [];
  };

  const migrateLegacyDocuments = async (remoteDocuments: ArchiveDocument[]) => {
    const migrationMarker = 'iau_archive_documents_migrated_to_postgres_v1';

    if (localStorage.getItem(migrationMarker) === 'done') {
      return remoteDocuments;
    }

    let legacyDocuments: ArchiveDocument[] = [];

    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      legacyDocuments = Array.isArray(parsed) ? parsed : [];
    } catch {
      legacyDocuments = [];
    }

    if (legacyDocuments.length === 0) {
      localStorage.setItem(migrationMarker, 'done');
      return remoteDocuments;
    }

    const existingKeys = new Set(
      remoteDocuments.map(
        (document) =>
          `${document.driveUrl || ''}|${document.originalName || ''}|${document.documentNumber || ''}`
      )
    );

    let migratedCount = 0;

    for (const legacy of legacyDocuments) {
      const key = `${legacy.driveUrl || ''}|${legacy.originalName || ''}|${legacy.documentNumber || ''}`;

      if (!legacy.driveUrl || existingKeys.has(key)) {
        continue;
      }

      await archiveRequest<ArchiveDocument>('', {
        method: 'POST',
        body: JSON.stringify(legacy),
      });

      existingKeys.add(key);
      migratedCount += 1;
    }

    localStorage.setItem(migrationMarker, 'done');

    if (migratedCount > 0) {
      toast.success(`تم نقل ${migratedCount} ملف أرشيف قديم إلى قاعدة البيانات`);
      return loadDocumentsFromServer();
    }

    return remoteDocuments;
  };

  useEffect(() => {
    let mounted = true;

    const initializeArchive = async () => {
      try {
        const remote = await loadDocumentsFromServer();

        if (!mounted) return;

        await migrateLegacyDocuments(remote);
      } catch (error) {
        console.error('Archive load error:', error);

        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'تعذر تحميل الأرشفة من الخادم'
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeArchive();

    return () => {
      mounted = false;
    };
  }, []);
'@

Replace-Required `
    "إضافة الاتصال بقاعدة البيانات" `
    "  const \[isSaving, setIsSaving\] = useState\(false\);" `
    "  const [isSaving, setIsSaving] = useState(false);`r`n`r`n$apiBlock"

$deleteBlock = @'
  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      await archiveRequest<void>(`/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      setDocuments((current) =>
        current.filter((doc) => doc.id !== documentToDelete.id)
      );

      toast.success('تم حذف الملف من الأرشفة');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);

      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error('Archive delete error:', error);
      toast.error(
        error instanceof Error ? error.message : 'فشل في حذف ملف الأرشفة'
      );
    }
  };
'@

Replace-Required `
    "ربط حذف الأرشفة بالخادم" `
    "  const confirmDelete = \(\) => \{.*?  \};\r?\n\r?\n  const validateForm" `
    "$deleteBlock`r`n  const validateForm"

$submitBlock = @'
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (formMode === 'add') {
        const savedDocuments: ArchiveDocument[] = [];

        for (const file of form.files) {
          const uploaded = await uploadFileToGoogleDrive(file);

          const baseTitle = form.title.trim();
          const title =
            form.files.length === 1
              ? baseTitle
              : `${baseTitle} - ${file.name.replace(/\.[^/.]+$/, '')}`;

          const payload = {
            title,
            category: form.category.trim(),
            documentNumber: form.documentNumber.trim(),
            documentDate: form.documentDate || '',
            documentDateType: form.documentDateType,
            issuingAuthority: form.issuingAuthority.trim(),
            confidentiality: form.confidentiality,
            tags: form.tags.trim(),
            description: form.description.trim(),
            fileName: uploaded.fileName || file.name,
            originalName: file.name,
            mimeType:
              uploaded.mimeType ||
              file.type ||
              'application/octet-stream',
            fileSize: file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          };

          const saved = await archiveRequest<ArchiveDocument>('', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          savedDocuments.push(saved);
        }

        setDocuments((current) => [...savedDocuments, ...current]);

        toast.success(
          savedDocuments.length === 1
            ? 'تمت أرشفة الملف بنجاح'
            : `تمت أرشفة ${savedDocuments.length} ملفات بنجاح`
        );
      } else if (selectedDocument) {
        let updatedFileData: Partial<ArchiveDocument> = {};

        if (form.files.length > 0) {
          const file = form.files[0];
          const uploaded = await uploadFileToGoogleDrive(file);

          updatedFileData = {
            fileName: uploaded.fileName || file.name,
            originalName: file.name,
            mimeType:
              uploaded.mimeType ||
              file.type ||
              'application/octet-stream',
            fileSize: file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          };
        }

        const payload = {
          ...selectedDocument,
          title: form.title.trim(),
          category: form.category.trim(),
          documentNumber: form.documentNumber.trim(),
          documentDate: form.documentDate || '',
          documentDateType: form.documentDateType,
          issuingAuthority: form.issuingAuthority.trim(),
          confidentiality: form.confidentiality,
          tags: form.tags.trim(),
          description: form.description.trim(),
          ...updatedFileData,
        };

        const updated = await archiveRequest<ArchiveDocument>(
          `/${selectedDocument.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        setDocuments((current) =>
          current.map((doc) =>
            doc.id === selectedDocument.id ? updated : doc
          )
        );

        toast.success('تم تحديث بيانات الملف');
      }

      setFormOpen(false);
      setSelectedDocument(null);
      setForm(emptyForm);
    } catch (error) {
      console.error('Archive save error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'فشل في حفظ بيانات الأرشفة'
      );
    } finally {
      setIsSaving(false);
    }
  };
'@

Replace-Required `
    "ربط الإضافة والتعديل بالخادم" `
    "  const handleSubmit = async \(\) => \{.*?  \};\r?\n\r?\n  const selectFiles" `
    "$submitBlock`r`n  const selectFiles"

# إضافة حالة تحميل واضحة قبل return
Replace-Required `
    "إضافة مؤشر التحميل" `
    "  return \(\r?\n    <div className=""container mx-auto p-4 md:p-6 space-y-6"">" `
    "  if (isLoading) {`r`n    return (`r`n      <div className=""container mx-auto p-6 flex items-center justify-center min-h-[300px]"">`r`n        <Loader2 className=""h-8 w-8 animate-spin text-primary"" />`r`n        <span className=""mr-3"">جاري تحميل الأرشفة...</span>`r`n      </div>`r`n    );`r`n  }`r`n`r`n  return (`r`n    <div className=""container mx-auto p-4 md:p-6 space-y-6"">"

Set-Content -Path $FilePath -Value $content -Encoding UTF8
Write-Host "تم تعديل ArchivePage.tsx بنجاح." -ForegroundColor Green
Write-Host "النسخة الاحتياطية محفوظة في:" $backup -ForegroundColor Yellow
