import { useState } from 'react';
import { Select, TextInput } from './ui';

const UNIT_PRESET = ['kg', 'ea', 'L'];

/** 단위 입력: kg/ea/L 또는 '기타' 선택 시 직접 입력. 값은 단일 문자열로 관리. */
export function UnitInput({ value, onChange }) {
  const initialEtc = value && !UNIT_PRESET.includes(value);
  const [mode, setMode] = useState(value === '' ? 'kg' : initialEtc ? '기타' : value);

  function handleSelect(e) {
    const v = e.target.value;
    setMode(v);
    onChange(v === '기타' ? '' : v);
  }
  return (
    <div className="form-row">
      <Select value={mode} onChange={handleSelect}>
        {UNIT_PRESET.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value="기타">기타(직접입력)</option>
      </Select>
      {mode === '기타' && (
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="단위 입력 (예: box)" />
      )}
    </div>
  );
}

/**
 * enum + 기타(직접작성) 선택. value는 enum 값, etc는 기타 텍스트.
 * onChange(value, etc)
 */
export function EtcSelect({ options, value, etc, onChange, placeholder = '직접 입력' }) {
  return (
    <div className="form-row">
      <Select value={value} onChange={(e) => onChange(e.target.value, e.target.value === '기타' ? etc : '')}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
      {value === '기타' && (
        <TextInput value={etc || ''} onChange={(e) => onChange('기타', e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
