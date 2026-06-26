import { useEffect, useState, useCallback } from 'react';
import { api, downloadCsv } from '../api';
import { Loading, Empty, Badge, Select } from '../components/ui';

const catLabel = { raw: '원재료', sub: '부재료', canister: 'Canister' };
const catColor = { raw: 'blue', sub: 'purple', canister: 'green' };
const inTypes = ['입고', '반입'];

export default function Transactions() {
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ materialType: '', type: '', q: '', from: '', to: '', sort: 'category' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const params = () => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  };

  const load = useCallback(async () => {
    const d = await api.get('/transactions?' + params());
    setItems(d.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <div className="desc">원재료·부재료·Canister의 입출고(수불) 작성 이력 전체입니다. 해당 없는 항목은 빈칸으로 표시됩니다.</div>
        <button className="btn secondary sm" onClick={() => downloadCsv('/transactions/export?' + params())}>⬇ CSV Export</button>
      </div>

      <div className="toolbar">
        <Select value={f.materialType} onChange={(e) => set('materialType', e.target.value)} style={{ width: 130 }}>
          <option value="">대분류 전체</option>
          <option value="raw">원재료</option>
          <option value="sub">부재료</option>
          <option value="canister">Canister</option>
        </Select>
        <Select value={f.type} onChange={(e) => set('type', e.target.value)} style={{ width: 120 }}>
          <option value="">입출고 전체</option>
          <option value="입고">입고</option>
          <option value="출고">출고</option>
          <option value="반입">반입</option>
          <option value="반출">반출</option>
        </Select>
        <Select value={f.sort} onChange={(e) => set('sort', e.target.value)} style={{ width: 150 }}>
          <option value="category">대분류·품목순</option>
          <option value="date">최신순</option>
        </Select>
        <div className="search">
          <span>🔍</span>
          <input placeholder="품목/Lot/내용물 검색" value={f.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <div className="spacer" />
        <input className="input" type="date" style={{ width: 145 }} value={f.from} onChange={(e) => set('from', e.target.value)} />
        <span className="muted">~</span>
        <input className="input" type="date" style={{ width: 145 }} value={f.to} onChange={(e) => set('to', e.target.value)} />
      </div>

      <div className="card table-wrap">
        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty>수불 내역이 없습니다.</Empty>
        ) : (
          <table className="tbl compact">
            <thead>
              <tr>
                <th>일시</th>
                <th>대분류</th>
                <th>제품/품목</th>
                <th>Lot / 내용물</th>
                <th>구분</th>
                <th className="num">수량</th>
                <th className="num">처리후</th>
                <th>비고</th>
                <th>작성자</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{(t.createdAt || '').slice(0, 16).replace('T', ' ')}</td>
                  <td><Badge color={catColor[t.materialType] || ''}>{catLabel[t.materialType] || t.materialType}</Badge></td>
                  <td><b>{t.materialName || ''}</b></td>
                  <td className="muted">{t.lotNo || t.content || ''}</td>
                  <td><Badge color={inTypes.includes(t.type) ? 'green' : 'orange'}>{t.type}</Badge></td>
                  <td className="num">{t.quantity ? Number(t.quantity).toLocaleString() + (t.unit || '') : ''}</td>
                  <td className="num muted">{t.balanceAfter !== '' && t.balanceAfter != null ? Number(t.balanceAfter).toLocaleString() + (t.unit || '') : ''}</td>
                  <td className="muted">{t.note || ''}</td>
                  <td className="muted">{t.createdBy || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
