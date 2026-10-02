'use client';

import { useEffect, useState } from 'react';
import { COUNTRIES } from '@/lib/countries';

export function CountrySelect({
  value,
  onChange,
  emptyLabel = 'Select country / network',
  allowCustom = true,
  className = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const isKnown = COUNTRIES.includes(value as (typeof COUNTRIES)[number]);
  const [customMode, setCustomMode] = useState(Boolean(value) && !isKnown);

  useEffect(() => {
    if (value && !COUNTRIES.includes(value as (typeof COUNTRIES)[number])) {
      setCustomMode(true);
    }
    if (!value && !customMode) {
      setCustomMode(false);
    }
  }, [value, customMode]);

  const selectValue = customMode ? '__custom__' : value;

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '__custom__') {
            setCustomMode(true);
            if (isKnown) onChange('');
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        disabled={disabled}
        className={className}
      >
        <option value="">{emptyLabel}</option>
        {COUNTRIES.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
        {allowCustom && <option value="__custom__">Custom (enter manually)</option>}
      </select>
      {allowCustom && customMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. WCA, GLN, Saudi Arabia"
          maxLength={100}
          disabled={disabled}
          className={className}
        />
      )}
    </div>
  );
}