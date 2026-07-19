import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import {
  DateType,
  formatFlexibleDate,
  normalizeHijriInput,
} from '../../utils/dateUtils';

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
  const inputId = id || label.replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-type`}>
            نوع التاريخ
          </Label>

          <NativeSelect
            id={`${inputId}-type`}
            value={dateType}
            onChange={(event) => {
              onDateTypeChange(event.target.value as DateType);
              onValueChange('');
            }}
            disabled={disabled}
          >
            <option value="gregorian">ميلادي</option>
            <option value="hijri">هجري</option>
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId}>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
            {!required ? (
              <span className="text-muted-foreground"> (اختياري)</span>
            ) : null}
          </Label>

          {dateType === 'gregorian' ? (
            <Input
              id={inputId}
              type="date"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              disabled={disabled}
            />
          ) : (
            <Input
              id={inputId}
              value={value}
              onChange={(event) => onValueChange(normalizeHijriInput(event.target.value))}
              placeholder="مثال: 1447/07/18"
              dir="ltr"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {helperText || 'يمكن ترك التاريخ فارغًا، أو اختيار ميلادي/هجري حسب المستند.'}
      </p>

      {value ? (
        <p className="text-xs text-muted-foreground">
          العرض: {formatFlexibleDate(value, dateType)}
        </p>
      ) : null}
    </div>
  );
};
