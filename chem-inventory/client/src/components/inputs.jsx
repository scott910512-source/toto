import { useState, useEffect } from 'react';
import { Select, TextInput } from './ui';
import { api } from '../api';

const UNIT_PRESET = ['kg', 'ea', 'L'];

/**
 * 품목 선택: 마스터 목록(관리자 등록)에서 선택하거나 '기타'로 직접 입력.
 * onChange(name, unit, vendor) — 마스터 선택 시 단위·기본 업체명도 함께 전달.
 */
export function ItemSelect({ category, value, onChange }) {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState(value ? '__preset__' : '');

  useEffect(() => {
    api.get('/items?category=' + category).then((d) => {
      setItems(d.items);
      // 초기값이 마스터에 없으면 '기타'로 간주
      if (value && !d.items.some((i) => i.name === value)) setMode('기타');
      else if (value) setMode(value);
    });
  }, [category]);

  function handleSelect(e) {
    const v = e.target.value;
    setMode(v);
    if (v === '기타') onChange('', '', '');
    else {
      const m = items.find((i) => i.name === v);
      onChange(v, m ? m.unit : '', m ? m.vendor || '' : '');
    }
  }

  return (
    <div className="form-row">
      <Select value={mode === '__preset__' ? value : mode} onChange={handleSelect}>
        <option value="" disabled>품목 선택</option>
        {items.map((i) => (
          <option key={i.id} value={i.name}>{i.name} ({i.unit})</option>
        ))}
        <option value="기타">기타(직접입력)</option>
      </Select>
      {mode === '기타' && (
        <TextInput value={value} onChange={(e) => onChange(e.target.value, '', '')} placeholder="품목명 직접 입력" />
      )}
    </div>
  );
}

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
