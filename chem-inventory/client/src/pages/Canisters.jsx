import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadCsv } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal, Field, TextInput, Select, useToast, ConfirmDialog, Empty, Loading, Badge, statusColor } from '../components/ui';
import { EtcSelect } from '../components/inputs';

const blankCreate = { canisterNo: '', size: '50L', sizeEtc: '', location: '2공장현장', locationEtc: '', status: '수령', statusEtc: '', note: '' };

export default function Canisters() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ q: '', size: '', location: '', status: '' });
  const [create, setCreate] = useState(false);
  const [move, setMove] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    const [d, s] = await Promise.all([api.get('/canisters?' + params.toString()), api.get('/canisters/summary')]);
    setItems(d.items);
    setSummary(s);
  }, [filters]);

  useEffect(() => {
    api.get('/meta').then(setMeta);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    downloadCsv('/canisters/export?' + params.toString());
  }
  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  if (!meta) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div className="desc">Canister(용기)를 No.·사이즈·위치·상태로 관리하고, 반입/반출 이력을 용기이력카드로 추적합니다.</div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={exportCsv}>⬇ CSV</button>
          <button className="btn sm" onClick={() => setCreate(true)}>+ Canister 등록</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><div className="label">⬢ 총 보유</div><div className="value">{summary.total}<span className="unit">개</span></div></div>
          <div className="card stat"><div className="label">사용중</div><div className="value">{summary.byStatus['사용중'] || 0}<span className="unit">개</span></div></div>
          <div className="card stat"><div className="label">세정의뢰</div><div className="value" style={{ color: 'var(--orange)' }}>{summary.byStatus['세정의뢰'] || 0}<span className="unit">개</span></div></div>
          <div className="card stat"><div className="label">사용금지</div><div className="value" style={{ color: 'var(--red)' }}>{summary.byStatus['사용금지'] || 0}<span className="unit">개</span></div></div>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <span>🔍</span>
          <input placeholder="Canister No. 검색" value={filters.q} onChange={(e) => setF('q', e.target.value)} />
        </div>
        <Select value={filters.size} onChange={(e) => setF('size', e.target.value)} style={{ width: 130 }}>
          <option value="">사이즈 전체</option>
          {meta.canisterSizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.location} onChange={(e) => setF('location', e.target.value)} style={{ width: 150 }}>
          <option value="">위치 전체</option>
          {meta.canisterLocations.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setF('status', e.target.value)} style={{ width: 140 }}>
          <option value="">상태 전체</option>
          {meta.canisterStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <div className="card table-wrap">
        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty>조건에 맞는 Canister가 없습니다.</Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Canister No.</th>
                <th>사이즈</th>
                <th>위치</th>
                <th>상태</th>
                <th>최종변경</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/canisters/${c.id}`} className="inline-link"><b>{c.canisterNo}</b></Link></td>
                  <td><Badge>{c.sizeLabel}</Badge></td>
                  <td className="muted">{c.locationLabel}</td>
                  <td><Badge color={statusColor(c.status)} dot>{c.statusLabel}</Badge></td>
                  <td className="muted" style={{ fontSize: 12 }}>{c.updatedBy}<br />{(c.updatedAt || '').slice(0, 10)}</td>
                  <td>
                    <div className="btn-row">
                      <Link to={`/canisters/${c.id}`} className="btn ghost sm">이력카드</Link>
                      <button className="btn secondary sm" onClick={() => setMove(c)}>반입/반출</button>
                      {isAdmin && <button className="btn danger sm" onClick={() => setDel(c)}>삭제</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {create && (
        <CanisterForm
          meta={meta}
          onClose={() => setCreate(false)}
          onSaved={() => { setCreate(false); load(); toast.ok('Canister를 등록했습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {move && (
        <MoveForm
          meta={meta}
          item={move}
          onClose={() => setMove(null)}
          onSaved={() => { setMove(null); load(); toast.ok('이력이 기록되었습니다.'); }}
          onError={(m) => toast.err(m)}
        />
      )}
      {del && (
        <ConfirmDialog
          title="Canister 삭제"
          message={`'${del.canisterNo}' 및 해당 용기 이력 전체가 삭제됩니다. 계속할까요?`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            try { await api.del('/canisters/' + del.id); setDel(null); load(); toast.ok('삭제했습니다.'); }
            catch (e) { toast.err(e.message); }
          }}
        />
      )}
    </>
  );
}

function CanisterForm({ meta, onClose, onSaved, onError }) {
  const [f, setF] = useState({ ...blankCreate });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.canisterNo.trim()) return onError('Canister No.를 입력하세요.');
    setBusy(true);
    try {
      await api.post('/canisters', { ...f, canisterNo: f.canisterNo.trim() });
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Canister 등록"
      subtitle="등록 시 '반입' 이력이 자동 생성됩니다."
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </>}
    >
      <Field label="Canister No." required>
        <TextInput value={f.canisterNo} onChange={(e) => set('canisterNo', e.target.value)} placeholder="예: CN-004" autoFocus />
      </Field>
      <Field label="용기 사이즈" required>
        <EtcSelect options={meta.canisterSizes} value={f.size} etc={f.sizeEtc} onChange={(v, etc) => setF((p) => ({ ...p, size: v, sizeEtc: etc }))} placeholder="사이즈 입력" />
      </Field>
      <Field label="위치" required>
        <EtcSelect options={meta.canisterLocations} value={f.location} etc={f.locationEtc} onChange={(v, etc) => setF((p) => ({ ...p, location: v, locationEtc: etc }))} placeholder="위치 입력" />
      </Field>
      <Field label="상태" required>
        <EtcSelect options={meta.canisterStatuses} value={f.status} etc={f.statusEtc} onChange={(v, etc) => setF((p) => ({ ...p, status: v, statusEtc: etc }))} placeholder="상태 입력" />
      </Field>
      <Field label="비고">
        <TextInput value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="선택 입력" />
      </Field>
    </Modal>
  );
}

function MoveForm({ meta, item, onClose, onSaved, onError }) {
  const [f, setF] = useState({
    type: '반출',
    location: item.location,
    locationEtc: item.locationEtc || '',
    status: item.status,
    statusEtc: item.statusEtc || '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/canisters/${item.id}/move`, f);
      onSaved();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`반입/반출 처리 — ${item.canisterNo}`}
      subtitle={`현재: ${item.locationLabel} · ${item.statusLabel}`}
      onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={onClose}>취소</button>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? '처리 중…' : '이력 기록'}</button>
      </>}
    >
      <Field label="구분" required>
        <Select value={f.type} onChange={(e) => set('type', e.target.value)}>
          {meta.canisterMoveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="위치">
        <EtcSelect options={meta.canisterLocations} value={f.location} etc={f.locationEtc} onChange={(v, etc) => setF((p) => ({ ...p, location: v, locationEtc: etc }))} />
      </Field>
      <Field label="상태">
        <EtcSelect options={meta.canisterStatuses} value={f.status} etc={f.statusEtc} onChange={(v, etc) => setF((p) => ({ ...p, status: v, statusEtc: etc }))} />
      </Field>
      <Field label="비고">
        <TextInput value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="예: 2공장 → 3류창고 이동" />
      </Field>
    </Modal>
  );
}
