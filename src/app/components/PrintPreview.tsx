import React from 'react';

interface PrintPreviewProps {
  title: string;
  stats?: {
    total: number;
    totalArea?: string;
  };
  children: React.ReactNode;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ title, stats, children }) => {
  return (
    <div className="print-preview">
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 15mm 10mm;
            }

            body {
              background: white;
              color: black;
            }

            .no-print {
              display: none !important;
            }

            .print-preview {
              display: block !important;
            }
          }
        `}
      </style>
      <div className="hidden print:block">
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: 'white',
          padding: '30px',
          marginBottom: '30px',
          borderBottom: '6px solid #fbbf24',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              🎓 جامعة الإمام عبدالرحمن بن فيصل
            </div>
            <div style={{ fontSize: '16px', opacity: 0.95, marginBottom: '20px' }}>
              إدارة الأراضي والممتلكات
            </div>
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 'bold',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '15px',
          }}>
            {title}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '15px',
            paddingTop: '15px',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: '14px',
          }}>
            <div>📅 التاريخ: {new Date().toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</div>
            <div>🕐 الوقت: {new Date().toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
        </div>

        {stats && (
          <div style={{
            background: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '25px',
            display: 'flex',
            justifyContent: 'space-around',
            gap: '20px',
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>
                إجمالي السجلات
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                {stats.total}
              </div>
            </div>
            {stats.totalArea && (
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>
                  إجمالي المساحة
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                  {stats.totalArea} م²
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {children}

      <div className="hidden print:block" style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '3px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        <div style={{ textAlign: 'right' }}>
          <div><strong>جامعة الإمام عبدالرحمن بن فيصل</strong></div>
          <div>المملكة العربية السعودية</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div>تم الطباعة بتاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
          <div>نظام إدارة الأراضي والممتلكات</div>
        </div>
      </div>

      <div className="hidden print:block" style={{
        marginTop: '60px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          borderTop: '2px solid #374151',
          paddingTop: '10px',
          minWidth: '200px',
          margin: '0 40px',
        }}>
          التوقيع
        </div>
        <div style={{
          display: 'inline-block',
          borderTop: '2px solid #374151',
          paddingTop: '10px',
          minWidth: '200px',
          margin: '0 40px',
        }}>
          الختم
        </div>
      </div>
    </div>
  );
};
