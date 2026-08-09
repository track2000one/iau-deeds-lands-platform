import React from 'react';
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
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:col-span-2">
      <div className="rounded-2xl border bg-background/55 p-4">
        <AppDateField
          label="تاريخ بداية العقد"
          value={startDate}
          dateType={startDateType}
          onValueChange={(value) => onChange({ startDate: value, startDateType, endDate, endDateType })}
          onDateTypeChange={(value) => onChange({ startDate: '', startDateType: value, endDate, endDateType })}
          required
          helperText="يُحفظ تاريخ بداية العقد مع نوع التقويم كما ورد في المستند."
        />
      </div>

      <div className="rounded-2xl border bg-background/55 p-4">
        <AppDateField
          label="تاريخ نهاية العقد"
          value={endDate}
          dateType={endDateType}
          onValueChange={(value) => onChange({ startDate, startDateType, endDate: value, endDateType })}
          onDateTypeChange={(value) => onChange({ startDate, startDateType, endDate: '', endDateType: value })}
          required
          helperText="يعتمد نظام متابعة العقود على تاريخ النهاية لتنبيه المتابعة قبل 6 أشهر."
        />
      </div>
    </div>
  );
};
