import { useEffect, useState, useCallback } from 'react';
import { api, downloadCsv } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading, Badge } from '../components/ui';
import { UnitInput, ItemSelect } from '../components/inputs';

const blank = { itemName: '', lotNo: '', quantity: '', unit: 'kg', vendor: '', receivedDate: '', note: '' };

export default function RawMaterials() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [tx, setTx] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const [s, d] = await Promise.all([api.get('/raw-materials/summary'), api.get('/raw-materials?' + params.toString())]);
    setSummary(s);
    setItems(d.items);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    downloadCsv('/raw-materials/export?' + params.toString());
  }

  return (
    <>
      {/* ===== 원재료 현황 요약 ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>원재료 현황</h3>{summary && <Badge>경고기준 {summary.threshold}%</Badge>}</div>
        <div className="table-wrap">
          {!summary ? (
            <Loading />
          ) : summary.items.length === 0 ? (
            <Empty>등록된 품목이 없습니다. (관리자: 품목·안전재고 메뉴에서 품목을 먼저 등록하세요)</Empty>
          ) : (
            <table className="tbl compact">
              <thead>
                <tr>
                  <th>품목</th>
                  <th className="num">총수량</th>
                  <th className="num">재고수준</th>
                  <th className="num">안전재고</th>
                  <th className="num">Lot수</th>
                  <th>최근 입고</th>
                  <th>최근 사용</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.map((s) => (
                  <tr key={s.name}>
                    <td><b>{s.name}</b>{!s.isMaster && <span className="muted" style={{ fontWeight: 400 }}> (기타)</span>}</td>
                    <td className="num"><b>{s.totalQuantity.toLocaleString()}</b> <span className="muted">{s.unit}</span></td>
                    <td className="num">
                      {s.level == null ? <span className="muted">–</span> : <b style={{ color: s.below ? 'var(--red)' : 'var(--green)' }}>{s.level}%</b>}
                    </td>
                    <td className="num muted">{s.safetyStock ? s.safetyStock.toLocaleString() : '–'}</td>
                    <td className="num muted">{s.lots}</td>
                    <td className="muted">{s.lastReceived || '–'}</td>
                    <td className="muted">{s.lastUsed || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===== Lot 목록 ===== */}
      <div className="page-head">
        <div className="desc">품목은 취합 관리되며, 입출고(수불)는 <b>Lot 단위</b>로 개별 처리됩니다.</div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn sm" onClick={() => setEdit({ mode: 'create', data: { ...blank } })}>+ 원재료 등록</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <span>🔍</span>
          <input placeholder="품목명 / Lot No 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card table-wrap">
        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty>등록된 Lot이 없습니다.</Empty>
        ) : (
          <table className="tbl compact">
            <thead>
              <tr>
                <th>품목명</th>
                <th>Lot No</th>
                <th className="num">수량</th>
                <th>단위</th>
                <th>업체명</th>
                <th>입고일</th>
                <th>비고</th>
                <th>등록자</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.itemName}</b></td>
                  <td><Badge color="blue">{r.lotNo}</Badge></td>
                  <td className="num">{Number(r.quantity).toLocaleString()}</td>
                  <td className="muted">{r.unit}</td>
                  <td className="muted">{r.vendor || '–'}</td>
                  <td className="muted">{r.receivedDate || '–'}</td>
                  <td className="muted">{r.note || '–'}</td>
                  <td className="muted">{r.updatedBy}</td>
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

      {edit && (
        <RawForm
          mode={edit.mode}
          initial={edit.data}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); toast.ok(edit.mode === 'create' ? '원재료 Lot을 등록했습니다.' : '수정했습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {tx && (
        <TxForm item={tx} onClose={() => setTx(null)} onSaved={() => { setTx(null); load(); toast.ok('수불 처리되었습니다.'); }} onError={(m) => toast.err(m)} />
      )}
      {del && (
        <ConfirmDialog
          title="원재료 Lot 삭제"
          message={`'${del.itemName}' (Lot ${del.lotNo})을 삭제할까요?`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            try { await api.del('/raw-materials/' + del.id); setDel(null); load(); toast.ok('삭제했습니다.'); }
            catch (e) { toast.err(e.message); }
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
    if (!f.itemName.trim()) return onError('품목을 선택하거나 입력하세요.');
    if (!f.lotNo.trim()) return onError('Lot No를 입력하세요.');
    setBusy(true);
    try {
      const payload = { itemName: f.itemName.trim(), lotNo: f.lotNo.trim(), unit: f.unit, vendor: f.vendor, receivedDate: f.receivedDate, note: f.note };
      if (mode === 'create') {
        payload.quantity = f.quantity === '' ? 0 : Number(f.quantity);
        await api.post('/raw-materials', payload);
      } else {
        await api.patch('/raw-materials/' + initial.id, payload);
      }
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={mode === 'create' ? '원재료 등록 (Lot)' : '원재료 Lot 수정'}
      subtitle={mode === 'edit' ? '수량은 수불(입고/출고)로 변경하세요.' : undefined}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </>}
    >
      <Field label="품목" required hint="목록에서 선택하거나 '기타'로 직접 입력">
        {mode === 'create' ? (
          <ItemSelect category="raw" value={f.itemName} onChange={(name, unit) => setF((p) => ({ ...p, itemName: name, unit: unit || p.unit }))} />
        ) : (
          <TextInput value={f.itemName} onChange={(e) => set('itemName', e.target.value)} />
        )}
      </Field>
      <div className="form-row">
        <Field label="Lot No" required>
          <TextInput value={f.lotNo} onChange={(e) => set('lotNo', e.target.value)} placeholder="예: T-2026-003" />
        </Field>
        {mode === 'create' && (
          <Field label="수량">
            <TextInput type="number" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
          </Field>
        )}
      </div>
      <div className="form-row">
        <Field label="단위" required>
          <UnitInput value={f.unit} onChange={(v) => set('unit', v)} />
        </Field>
        <Field label="입고일">
          <TextInput type="date" value={f.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
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
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`수불 — ${item.itemName} (Lot ${item.lotNo})`}
      subtitle={`현재 재고 ${cur.toLocaleString()}${item.unit}`}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy || over}>{busy ? '처리 중…' : '확인'}</button>
      </>}
    >
      <Field label="구분" required>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="출고">출고 (사용/소진)</option>
          <option value="입고">입고 (추가)</option>
        </Select>
      </Field>
      <Field label={`수량 (${item.unit})`} required error={over ? '현재 재고를 초과했습니다.' : ''}>
        <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" autoFocus />
      </Field>
      <Field label="비고">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 3공정 투입" />
      </Field>
      {quantity && !over && <div className="hint">처리 후 재고: <b>{(type === '입고' ? cur + qty : cur - qty).toLocaleString()}{item.unit}</b></div>}
    </Modal>
  );
}
