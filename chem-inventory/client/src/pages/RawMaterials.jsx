import { useEffect, useState, useCallback } from 'react';
import { api, downloadCsv } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading } from '../components/ui';
import { UnitInput } from '../components/inputs';

const blank = { name: '', quantity: '', unit: 'kg', safetyStock: '', receivedDate: '', note: '' };

export default function RawMaterials() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [edit, setEdit] = useState(null); // {mode, data}
  const [tx, setTx] = useState(null); // 수불 대상
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (unit) params.set('unit', unit);
    const d = await api.get('/raw-materials?' + params.toString());
    setItems(d.items);
  }, [q, unit]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (unit) params.set('unit', unit);
    downloadCsv('/raw-materials/export?' + params.toString());
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="desc">원재료 품목·수량·단위·입고일을 관리하고, 사용 시 수불 처리합니다.</div>
        </div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn sm" onClick={() => setEdit({ mode: 'create', data: { ...blank } })}>+ 원재료 등록</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <span>🔍</span>
          <input placeholder="품목명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: 140 }}>
          <option value="">단위 전체</option>
          <option value="kg">kg</option>
          <option value="ea">ea</option>
          <option value="L">L</option>
        </Select>
      </div>

      <div className="card table-wrap">
        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty>등록된 원재료가 없습니다.</Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>품목명</th>
                <th className="num">수량</th>
                <th>단위</th>
                <th className="num">안전재고</th>
                <th>입고일</th>
                <th>비고</th>
                <th>최종수정</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const below = Number(r.safetyStock) > 0 && Number(r.quantity) < Number(r.safetyStock);
                return (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td className="num" style={below ? { color: 'var(--red)', fontWeight: 700 } : {}}>{Number(r.quantity).toLocaleString()}</td>
                    <td className="muted">{r.unit}</td>
                    <td className="num muted">{Number(r.safetyStock).toLocaleString()}</td>
                    <td className="muted">{r.receivedDate || '–'}</td>
                    <td className="muted">{r.note || '–'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{r.updatedBy}<br />{(r.updatedAt || '').slice(0, 10)}</td>
                    <td>
                      <div className="btn-row">
                        <button className="btn ghost sm" onClick={() => setTx(r)}>수불</button>
                        <button className="btn secondary sm" onClick={() => setEdit({ mode: 'edit', data: { ...r } })}>수정</button>
                        {isAdmin && <button className="btn danger sm" onClick={() => setDel(r)}>삭제</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <RawForm
          mode={edit.mode}
          initial={edit.data}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
            toast.ok(edit.mode === 'create' ? '원재료를 등록했습니다.' : '수정했습니다.');
          }}
          onError={(m) => toast.err(m)}
        />
      )}

      {tx && (
        <TxForm
          item={tx}
          onClose={() => setTx(null)}
          onSaved={() => {
            setTx(null);
            load();
            toast.ok('수불 처리되었습니다.');
          }}
          onError={(m) => toast.err(m)}
        />
      )}

      {del && (
        <ConfirmDialog
          title="원재료 삭제"
          message={`'${del.name}' 항목을 삭제할까요? 되돌릴 수 없습니다.`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            try {
              await api.del('/raw-materials/' + del.id);
              setDel(null);
              load();
              toast.ok('삭제했습니다.');
            } catch (e) {
              toast.err(e.message);
            }
          }}
        />
      )}
    </>
  );
}

function RawForm({ mode, initial, onClose, onSaved, onError }) {
  const [f, setF] = useState({ ...blank, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return onError('품목명을 입력하세요.');
    if (!f.unit) return onError('단위를 입력하세요.');
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(),
        unit: f.unit,
        safetyStock: f.safetyStock === '' ? 0 : Number(f.safetyStock),
        receivedDate: f.receivedDate,
        note: f.note,
      };
      if (mode === 'create') {
        payload.quantity = f.quantity === '' ? 0 : Number(f.quantity);
        await api.post('/raw-materials', payload);
      } else {
        await api.patch('/raw-materials/' + initial.id, payload);
      }
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={mode === 'create' ? '원재료 등록' : '원재료 수정'}
      subtitle={mode === 'edit' ? '수량은 수불(입고/출고)로 변경하세요.' : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>취소</button>
          <button className="btn" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        </>
      }
    >
      <Field label="품목명" required>
        <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 톨루엔" autoFocus />
      </Field>
      <div className="form-row">
        {mode === 'create' && (
          <Field label="초기 수량">
            <TextInput type="number" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
          </Field>
        )}
        <Field label="단위" required>
          <UnitInput value={f.unit} onChange={(v) => set('unit', v)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="안전재고 기준수량" hint="대시보드 경고 기준">
          <TextInput type="number" value={f.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} placeholder="0" />
        </Field>
        <Field label="입고일">
          <TextInput type="date" value={f.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
        </Field>
      </div>
      <Field label="비고">
        <TextInput value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="선택 입력" />
      </Field>
    </Modal>
  );
}

function TxForm({ item, onClose, onSaved, onError }) {
  const [type, setType] = useState('출고');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cur = Number(item.quantity);
  const qty = Number(quantity);
  const over = type === '출고' && qty > cur;

  async function submit() {
    if (!quantity || qty <= 0) return onError('수량은 0보다 커야 합니다.');
    if (over) return onError('출고 수량이 현재 재고를 초과합니다.');
    setBusy(true);
    try {
      await api.post(`/raw-materials/${item.id}/transaction`, { type, quantity: qty, note });
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`수불 처리 — ${item.name}`}
      subtitle={`현재 재고 ${cur.toLocaleString()}${item.unit}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>취소</button>
          <button className="btn" onClick={submit} disabled={busy || over}>{busy ? '처리 중…' : '확인'}</button>
        </>
      }
    >
      <Field label="구분" required>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="출고">출고 (사용/소진)</option>
          <option value="입고">입고 (추가 입고)</option>
        </Select>
      </Field>
      <Field label={`수량 (${item.unit})`} required error={over ? '현재 재고를 초과했습니다.' : ''}>
        <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" autoFocus />
      </Field>
      <Field label="비고">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 3공정 투입" />
      </Field>
      {quantity && !over && (
        <div className="hint">처리 후 재고: <b>{(type === '입고' ? cur + qty : cur - qty).toLocaleString()}{item.unit}</b></div>
      )}
    </Modal>
  );
}
