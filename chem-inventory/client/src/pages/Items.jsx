import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading, Badge } from '../components/ui';
import { UnitInput } from '../components/inputs';

const blank = { category: 'raw', name: '', unit: 'kg', safetyStock: '', vendor: '', note: '' };

export default function Items() {
  const toast = useToast();
  const [cat, setCat] = useState('raw');
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const d = await api.get('/items?category=' + cat);
    setItems(d.items);
  }, [cat]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <div className="desc">원·부재료의 <b>품목</b>과 <b>안전재고 목표값</b>을 관리합니다. 사용자는 등록 시 이 목록에서 품목을 선택합니다.</div>
        <button className="btn sm" onClick={() => setEdit({ mode: 'create', data: { ...blank, category: cat } })}>+ 품목 등록</button>
      </div>

      <div className="toolbar">
        <div className="btn-row">
          <button className={`btn sm ${cat === 'raw' ? '' : 'secondary'}`} onClick={() => setCat('raw')}>원재료</button>
          <button className={`btn sm ${cat === 'sub' ? '' : 'secondary'}`} onClick={() => setCat('sub')}>부재료</button>
        </div>
      </div>

      <div className="card table-wrap">
        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty>등록된 품목이 없습니다. 우측 상단 [품목 등록]으로 추가하세요.</Empty>
        ) : (
          <table className="tbl compact">
            <thead>
              <tr>
                <th>품목명</th>
                <th>단위</th>
                <th className="num">안전재고 목표값</th>
                <th>기본 업체명</th>
                <th>비고</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td><b>{it.name}</b></td>
                  <td><Badge>{it.unit}</Badge></td>
                  <td className="num">{Number(it.safetyStock).toLocaleString()} {it.unit}</td>
                  <td className="muted">{it.vendor || '–'}</td>
                  <td className="muted">{it.note || '–'}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn secondary sm" onClick={() => setEdit({ mode: 'edit', data: { ...it } })}>수정</button>
                      <button className="btn danger sm" onClick={() => setDel(it)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <ItemForm
          mode={edit.mode}
          initial={edit.data}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); toast.ok(edit.mode === 'create' ? '품목을 등록했습니다.' : '수정했습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {del && (
        <ConfirmDialog
          title="품목 삭제"
          message={`'${del.name}' 품목을 삭제할까요? (이미 등록된 Lot/이력 데이터는 유지됩니다)`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            try { await api.del('/items/' + del.id); setDel(null); load(); toast.ok('삭제했습니다.'); }
            catch (e) { toast.err(e.message); }
          }}
        />
      )}
    </>
  );
}

function ItemForm({ mode, initial, onClose, onSaved, onError }) {
  const [f, setF] = useState({ ...blank, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return onError('품목명을 입력하세요.');
    setBusy(true);
    try {
      const payload = { category: f.category, name: f.name.trim(), unit: f.unit, safetyStock: f.safetyStock === '' ? 0 : Number(f.safetyStock), vendor: f.vendor, note: f.note };
      if (mode === 'create') await api.post('/items', payload);
      else await api.patch('/items/' + initial.id, payload);
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={mode === 'create' ? '품목 등록' : '품목 수정'}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </>}
    >
      <Field label="구분" required>
        <Select value={f.category} onChange={(e) => set('category', e.target.value)} disabled={mode === 'edit'}>
          <option value="raw">원재료</option>
          <option value="sub">부재료</option>
        </Select>
      </Field>
      <Field label="품목명" required>
        <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 톨루엔" autoFocus />
      </Field>
      <div className="form-row">
        <Field label="단위" required>
          <UnitInput value={f.unit} onChange={(v) => set('unit', v)} />
        </Field>
        <Field label="안전재고 목표값" hint="이 값 대비 % 로 재고수준 표시">
          <TextInput type="number" value={f.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} placeholder="0" />
        </Field>
      </div>
      <Field label="기본 업체명" hint="원/부재료 등록 시 이 값이 자동 입력됩니다(수정 가능)">
        <TextInput value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="예: (주)한솔케미칼" />
      </Field>
      <Field label="비고">
        <TextInput value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="선택 입력" />
      </Field>
    </Modal>
  );
}
