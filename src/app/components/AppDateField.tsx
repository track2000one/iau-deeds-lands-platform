import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import type { DateType } from '../../utils/dateUtils';
import { formatFlexibleDate, isValidFlexibleDate, normalizeHijriInput } from '../../utils/dateUtils';

type AppDateFieldProps = {
  label: string;
  value: string;
  dateType: DateType;
  onValueChange: (value: string) => void;
  onDateTypeChange: (dateType: DateType) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  helperText?: string;
};

export const AppDateField: React.FC<AppDateFieldProps> = ({
  label,
  value,
  dateType,
  onValueChange,
  onDateTypeChange,
  required = false,
  disabled = false,
  id,
  helperText,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);
  const inputId = id || label.replace(/\s+/g, '-');
  const isValid = isValidFlexibleDate(value, dateType);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-type`}>{ui('نوع التاريخ', 'Calendar')}</Label>
          <NativeSelect
            id={`${inputId}-type`}
            value={dateType}
            onChange={(event) => {
              onDateTypeChange(event.target.value as DateType);
              onValueChange('');
            }}
            disabled={disabled}
          >
            <option value="gregorian">{ui('ميلادي', 'Gregorian')}</option>
            <option value="hijri">{ui('هجري', 'Hijri')}</option>
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId}>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
            {!required ? <span className="text-muted-foreground"> {ui('(اختياري)', '(Optional)')}</span> : null}
          </Label>

          {dateType === 'gregorian' ? (
            <Input
              id={inputId}
              type="date"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              disabled={disabled}
              aria-invalid={!isValid}
              className={!isValid ? 'border-destructive focus-visible:ring-destructive' : undefined}
            />
          ) : (
            <Input
              id={inputId}
              value={value}
              onChange={(event) => onValueChange(normalizeHijriInput(event.target.value))}
              placeholder={ui('مثال: 1447/07/18', 'Example: 1447/07/18')}
              dir="ltr"
              disabled={disabled}
              aria-invalid={!isValid}
              className={!isValid ? 'border-destructive focus-visible:ring-destructive' : undefined}
            />
          )}
        </div>
      </div>

      <p className={`text-xs ${isValid ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
        {!isValid
          ? dateType === 'hijri'
            ? ui('أدخل التاريخ الهجري بصيغة صحيحة مثل 1447/07/18.', 'Enter a valid Hijri date such as 1447/07/18.')
            : ui('أدخل تاريخًا ميلاديًا صحيحًا.', 'Enter a valid Gregorian date.')
          : helperText || ui('يمكن ترك التاريخ فارغًا، أو اختيار ميلادي/هجري حسب المستند.', 'The date may be left blank, or entered as Gregorian/Hijri according to the document.')}
      </p>

      {value ? (
        <p className="text-xs text-muted-foreground">
          {ui('العرض', 'Preview')}: {formatFlexibleDate(value, dateType, isArabic ? 'ar' : 'en')}
        </p>
      ) : null}
    </div>
  );
};
