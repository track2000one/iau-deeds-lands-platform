import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppDateField } from './AppDateField';
import type { DateType } from '../../utils/dateUtils';

export type ContractDateRangeValue = {
  startDate: string;
  startDateType: DateType;
  endDate: string;
  endDateType: DateType;
};

type Props = ContractDateRangeValue & {
  onChange: (value: ContractDateRangeValue) => void;
};

export const ContractDateRangeFields: React.FC<Props> = ({
  startDate,
  startDateType,
  endDate,
  endDateType,
  onChange,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:col-span-2">
      <div className="rounded-2xl border bg-background/55 p-4">
        <AppDateField
          label={ui('تاريخ بداية العقد', 'Contract Start Date')}
          value={startDate}
          dateType={startDateType}
          onValueChange={(value) => onChange({ startDate: value, startDateType, endDate, endDateType })}
          onDateTypeChange={(value) => onChange({ startDate: '', startDateType: value, endDate, endDateType })}
          required
          helperText={ui('يُحفظ تاريخ بداية العقد مع نوع التقويم كما ورد في المستند.', 'The contract start date is saved together with its calendar type as stated in the source document.')}
        />
      </div>

      <div className="rounded-2xl border bg-background/55 p-4">
        <AppDateField
          label={ui('تاريخ نهاية العقد', 'Contract End Date')}
          value={endDate}
          dateType={endDateType}
          onValueChange={(value) => onChange({ startDate, startDateType, endDate: value, endDateType })}
          onDateTypeChange={(value) => onChange({ startDate, startDateType, endDate: '', endDateType: value })}
          required
          helperText={ui('يعتمد نظام متابعة العقود على تاريخ النهاية لتنبيه المتابعة قبل 6 أشهر.', 'Contract follow-up uses the end date to trigger the six-month expiry monitoring period.')}
        />
      </div>
    </div>
  );
};
