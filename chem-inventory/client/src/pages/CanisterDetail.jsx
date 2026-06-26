import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, downloadCsv } from '../api';
import { Loading, Empty, Badge, statusColor, useToast } from '../components/ui';

const typeColor = { 반입: 'green', 반출: 'orange', 상태변경: 'purple' };

export default function CanisterDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([api.get('/canisters/' + id), api.get(`/canisters/${id}/history`)]);
      setItem(c.item);
      setHistory(h.items);
    } catch (e) {
      setErr(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (err) return <Empty>{err} <Link to="/canisters" className="inline-link">목록으로</Link></Empty>;
  if (!item || !history) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/canisters" className="inline-link">← Canister 목록</Link>
          <h2 style={{ marginTop: 8, fontSize: 24 }}>{item.canisterNo}</h2>
        </div>
        <div className="btn-row">
          <button className="btn secondary sm" onClick={() => { downloadCsv(`/canisters/${id}/history/export`); toast.ok('이력 CSV를 내려받습니다.'); }}>⬇ 이력 CSV</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="label">사이즈</div><div className="value" style={{ fontSize: 22 }}>{item.sizeLabel}</div></div>
        <div className="card stat"><div className="label">현재 위치</div><div className="value" style={{ fontSize: 22 }}>{item.locationLabel}</div></div>
        <div className="card stat"><div className="label">현재 상태</div><div style={{ marginTop: 10 }}><Badge color={statusColor(item.status)} dot>{item.statusLabel}</Badge></div></div>
        <div className="card stat"><div className="label">반입/반출 횟수</div><div className="value" style={{ fontSize: 22 }}>{history.length}<span className="unit">건</span></div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>용기이력카드 — 반입/반출 내역</h3><Badge>{history.length}건</Badge></div>
        <div className="card-pad">
          {history.length === 0 ? (
            <Empty>이력이 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>일시</th><th>구분</th><th>위치</th><th>상태</th><th>비고</th><th>작성자</th></tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="muted">{(h.createdAt || '').slice(0, 16).replace('T', ' ')}</td>
                      <td><Badge color={typeColor[h.type] || ''}>{h.type}</Badge></td>
                      <td>{h.location}</td>
                      <td><Badge color={statusColor(h.status)} dot>{h.status}</Badge></td>
                      <td className="muted">{h.note || '–'}</td>
                      <td className="muted">{h.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
