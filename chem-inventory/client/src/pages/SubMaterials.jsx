import { useEffect, useState, useCallback } from 'react';
import { api, downloadCsv } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading, Badge } from '../components/ui';
import { UnitInput } from '../components/inputs';

const blank = { name: '', receivedDate: '', lotNo: '', vendor: '', unit: 'kg', weight: '', note: '' };

export default function SubMaterials() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('list'); // list | byItem
  const [items, setItems] = useState(null);
  const [groups, setGroups] = useState(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [tx, setTx] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const [d, g] = await Promise.all([api.get('/sub-materials?' + params.toString()), api.get('/sub-materials/by-item')]);
    setItems(d.items);
    setGroups(g.items);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    downloadCsv('/sub-materials/export?' + params.toString());
  }

  return (
    <>
      <div className="page-head">
        <div className="desc">부재료를 입고일·Lot No·무게·업체명으로 관리하고, 소진 시 수불 처리합니다.</div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn sm" onClick={() => setEdit({ mode: 'create', data: { ...blank } })}>+ 부재료 등록</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="btn-row">
          <button className={`btn sm ${tab === 'list' ? '' : 'secondary'}`} onClick={() => setTab('list')}>전체 목록</button>
          <button className={`btn sm ${tab === 'byItem' ? '' : 'secondary'}`} onClick={() => setTab('byItem')}>품목별 내역현황</button>
        </div>
        <div className="spacer" />
        {tab === 'list' && (
          <div className="search">
            <span>🔍</span>
            <input placeholder="품목명 / Lot No 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </div>

      {tab === 'list' ? (
        <div className="card table-wrap">
          {!items ? (
            <Loading />
          ) : items.length === 0 ? (
            <Empty>등록된 부재료가 없습니다.</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>품목명</th>
                  <th>입고일</th>
                  <th>Lot No</th>
                  <th className="num">잔량/입고</th>
                  <th>업체명</th>
                  <th>최종수정</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td className="muted">{r.receivedDate || '–'}</td>
                    <td><Badge color="blue">{r.lotNo}</Badge></td>
                    <td className="num">{Number(r.weight).toLocaleString()}<span className="muted"> / {Number(r.initialWeight).toLocaleString()}{r.unit}</span></td>
                    <td className="muted">{r.vendor || '–'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{r.updatedBy}<br />{(r.updatedAt || '').slice(0, 10)}</td>
                    <td>
                      <div className="btn-row">
                        <button className="btn ghost sm" onClick={() => setTx(r)}>수불</button>
                        <button className="btn secondary sm" onClick={() => setEdit({ mode: 'edit', data: { ...r } })}>수정</button>
                        {isAdmin && <button className="btn danger sm" onClick={() => setDel(r)}>삭제</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid grid-2">
          {!groups ? (
            <Loading />
          ) : groups.length === 0 ? (
            <Empty>데이터가 없습니다.</Empty>
          ) : (
            groups.map((g) => (
              <div className="card" key={g.name}>
                <div className="card-head">
                  <h3>{g.name}</h3>
                  <div className="btn-row">
                    <Badge>{g.lots} Lot</Badge>
                    <Badge color="green">잔량 {g.totalWeight.toLocaleString()}{g.unit}</Badge>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr><th>Lot No</th><th>입고일</th><th>업체</th><th className="num">잔량</th></tr>
                    </thead>
                    <tbody>
                      {g.items.map((it) => (
                        <tr key={it.id}>
                          <td>{it.lotNo}</td>
                          <td className="muted">{it.receivedDate || '–'}</td>
                          <td className="muted">{it.vendor || '–'}</td>
                          <td className="num">{Number(it.weight).toLocaleString()}{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {edit && (
        <SubForm
          mode={edit.mode}
          initial={edit.data}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); toast.ok(edit.mode === 'create' ? '부재료를 등록했습니다.' : '수정했습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {tx && (
        <SubTxForm
          item={tx}
          onClose={() => setTx(null)}
          onSaved={() => { setTx(null); load(); toast.ok('수불 처리되었습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {del && (
        <ConfirmDialog
          title="부재료 삭제"
          message={`'${del.name}' (Lot ${del.lotNo}) 항목을 삭제할까요?`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            try { await api.del('/sub-materials/' + del.id); setDel(null); load(); toast.ok('삭제했습니다.'); }
            catch (e) { toast.err(e.message); }
          }}
        />
      )}
    </>
  );
}

function SubForm({ mode, initial, onClose, onSaved, onError }) {
  const [f, setF] = useState({ ...blank, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return onError('품목명을 입력하세요.');
    if (!f.lotNo.trim()) return onError('Lot No를 입력하세요.');
    setBusy(true);
    try {
      const payload = { name: f.name.trim(), receivedDate: f.receivedDate, lotNo: f.lotNo.trim(), vendor: f.vendor, unit: f.unit, note: f.note };
      if (mode === 'create') {
        payload.weight = f.weight === '' ? 0 : Number(f.weight);
        await api.post('/sub-materials', payload);
      } else {
        payload.weight = Number(f.weight);
        await api.patch('/sub-materials/' + initial.id, payload);
      }
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={mode === 'create' ? '부재료 등록' : '부재료 수정'}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </>}
    >
      <Field label="품목명" required>
        <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 활성탄" autoFocus />
      </Field>
      <div className="form-row">
        <Field label="Lot No" required>
          <TextInput value={f.lotNo} onChange={(e) => set('lotNo', e.target.value)} placeholder="예: L-2026-001" />
        </Field>
        <Field label="입고일">
          <TextInput type="date" value={f.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label={mode === 'create' ? '무게(입고)' : '잔량'} required>
          <TextInput type="number" value={f.weight} onChange={(e) => set('weight', e.target.value)} placeholder="0" />
        </Field>
        <Field label="단위" required>
          <UnitInput value={f.unit} onChange={(v) => set('unit', v)} />
        </Field>
      </div>
      <Field label="업체명">
        <TextInput value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="예: (주)한솔케미칼" />
      </Field>
      <Field label="비고">
        <TextInput value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="선택 입력" />
      </Field>
    </Modal>
  );
}

function SubTxForm({ item, onClose, onSaved, onError }) {
  const [type, setType] = useState('출고');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cur = Number(item.weight);
  const qty = Number(quantity);
  const over = type === '출고' && qty > cur;

  async function submit() {
    if (!quantity || qty <= 0) return onError('수량(무게)은 0보다 커야 합니다.');
    if (over) return onError('출고(소진) 무게가 현재 잔량을 초과합니다.');
    setBusy(true);
    try {
      await api.post(`/sub-materials/${item.id}/transaction`, { type, quantity: qty, note });
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`수불 처리 — ${item.name}`}
      subtitle={`Lot ${item.lotNo} · 현재 잔량 ${cur.toLocaleString()}${item.unit}`}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy || over}>{busy ? '처리 중…' : '확인'}</button>
      </>}
    >
      <Field label="구분" required>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="출고">출고 (소진)</option>
          <option value="입고">입고 (추가)</option>
        </Select>
      </Field>
      <Field label={`무게 (${item.unit})`} required error={over ? '현재 잔량을 초과했습니다.' : ''}>
        <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" autoFocus />
      </Field>
      <Field label="비고">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 라인 보충" />
      </Field>
      {quantity && !over && (
        <div className="hint">처리 후 잔량: <b>{(type === '입고' ? cur + qty : cur - qty).toLocaleString()}{item.unit}</b></div>
      )}
    </Modal>
  );
}
