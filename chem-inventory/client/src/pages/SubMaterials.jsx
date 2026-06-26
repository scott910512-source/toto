import { useEffect, useState, useCallback, Fragment } from 'react';
import { api, downloadCsv } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading, Badge } from '../components/ui';
import { UnitInput, ItemSelect } from '../components/inputs';

const blank = { name: '', receivedDate: '', lotNo: '', vendor: '', unit: 'kg', weight: '', note: '' };
const today = () => new Date().toISOString().slice(0, 10);

function groupByName(rows) {
  const groups = [];
  const idx = {};
  for (const r of rows) {
    if (!(r.name in idx)) {
      idx[r.name] = groups.length;
      groups.push({ name: r.name, lots: [] });
    }
    groups[idx[r.name]].lots.push(r);
  }
  return groups;
}

export default function SubMaterials() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [items, setItems] = useState(null);
  const [groups, setGroups] = useState(null);
  const [activeItem, setActiveItem] = useState('');
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
    if (g.items.length && !g.items.some((x) => x.name === activeItem)) setActiveItem(g.items[0].name);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    downloadCsv('/sub-materials/export?' + params.toString());
  }
  const activeGroup = groups && groups.find((g) => g.name === activeItem);

  return (
    <>
      <div className="page-head">
        <div className="desc">부재료를 품목 안에서 <b>Lot 단위</b>로 관리합니다. (입고일/Lot No/잔량/업체명)</div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn sm" onClick={() => setEdit({ mode: 'create', data: { ...blank, receivedDate: today() } })}>+ 부재료 등록</button>
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
            <table className="tbl compact">
              <thead>
                <tr>
                  <th>Lot No</th>
                  <th className="num">잔량 / 입고</th>
                  <th>업체명</th>
                  <th>입고일</th>
                  <th>비고</th>
                  <th>등록자</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {groupByName(items).map((g) => (
                  <Fragment key={g.name}>
                    <tr className="group-row"><td colSpan={7}>📦 {g.name} · {g.lots.length} Lot</td></tr>
                    {g.lots.map((r) => (
                      <tr key={r.id}>
                        <td style={{ paddingLeft: 24 }}><Badge color="blue">{r.lotNo}</Badge></td>
                        <td className="num"><b>{Number(r.weight).toLocaleString()}</b> <span className="muted">/ {Number(r.initialWeight).toLocaleString()}{r.unit}</span></td>
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
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <div className="toolbar" style={{ gap: 6 }}>
            {groups && groups.map((g) => (
              <button key={g.name} className={`btn sm ${activeItem === g.name ? '' : 'secondary'}`} onClick={() => setActiveItem(g.name)}>
                {g.name} ({g.lots})
              </button>
            ))}
          </div>
          <div className="card table-wrap">
            {!groups ? (
              <Loading />
            ) : !activeGroup ? (
              <Empty>데이터가 없습니다.</Empty>
            ) : (
              <>
                <div className="card-head">
                  <h3>{activeGroup.name} — 입고일순</h3>
                  <Badge color="green">총 잔량 {activeGroup.totalWeight.toLocaleString()}{activeGroup.unit}</Badge>
                </div>
                <table className="tbl compact">
                  <thead>
                    <tr><th>입고일</th><th>Lot No</th><th>업체명</th><th className="num">잔량 / 입고</th><th>비고</th></tr>
                  </thead>
                  <tbody>
                    {activeGroup.items.map((it) => (
                      <tr key={it.id}>
                        <td className="muted">{it.receivedDate || '–'}</td>
                        <td><Badge color="blue">{it.lotNo}</Badge></td>
                        <td className="muted">{it.vendor || '–'}</td>
                        <td className="num">{Number(it.weight).toLocaleString()} <span className="muted">/ {Number(it.initialWeight).toLocaleString()}{it.unit}</span></td>
                        <td className="muted">{it.note || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </>
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
        <SubTxForm item={tx} onClose={() => setTx(null)} onSaved={() => { setTx(null); load(); toast.ok('수불 처리되었습니다.'); }} onError={(m) => toast.err(m)} />
      )}
      {del && (
        <ConfirmDialog
          title="부재료 삭제"
          message={`'${del.name}' (Lot ${del.lotNo})을 삭제할까요?`}
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
    if (!f.name.trim()) return onError('품목을 선택하거나 입력하세요.');
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
      <Field label="품목" required hint="목록에서 선택하거나 '기타'로 직접 입력">
        {mode === 'create' ? (
          <ItemSelect category="sub" value={f.name} onChange={(name, unit, vendor) => setF((p) => ({ ...p, name, unit: unit || p.unit, vendor: vendor || p.vendor }))} />
        ) : (
          <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} />
        )}
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
        <TextInput value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="예: 대정화학" />
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
    if (!quantity || qty <= 0) return onError('무게는 0보다 커야 합니다.');
    if (over) return onError('출고(소진) 무게가 현재 잔량을 초과합니다.');
    setBusy(true);
    try {
      await api.post(`/sub-materials/${item.id}/transaction`, { type, quantity: qty, note });
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`수불 — ${item.name} (Lot ${item.lotNo})`}
      subtitle={`현재 잔량 ${cur.toLocaleString()}${item.unit}`}
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
      {quantity && !over && <div className="hint">처리 후 잔량: <b>{(type === '입고' ? cur + qty : cur - qty).toLocaleString()}{item.unit}</b></div>}
    </Modal>
  );
}
