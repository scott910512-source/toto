import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Loading, Empty, Badge, useToast } from '../components/ui';

const QUICK = [
  { label: '원재료 입고', sub: '신규 Lot 등록', to: '/raw?new=1', ico: '⬡', bg: '#0071e3' },
  { label: '부재료 입고', sub: '신규 Lot 등록', to: '/sub?new=1', ico: '◇', bg: '#5e5ce6' },
  { label: '원재료 사용', sub: '출고/소진 처리', to: '/raw', ico: '↓', bg: '#ff9500' },
  { label: '부재료 사용', sub: '출고/소진 처리', to: '/sub', ico: '↓', bg: '#ff9500' },
  { label: 'Canister 수불', sub: '반입/반출 등록', to: '/canisters?move=1', ico: '⬢', bg: '#34c759' },
];

const statColor = { 완료: 'green', 진행중: 'blue', 대기: '', 지연: 'red' };
const prioColor = { 상: 'red', 중: 'orange', 하: '' };

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [warnings, setWarnings] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [matTab, setMatTab] = useState('raw');

  const loadWarnings = useCallback(() => api.get('/warnings').then((d) => setWarnings(d.items)), []);
  const loadTasks = useCallback(() => api.get('/tasks').then((d) => setTasks(d.items)), []);
  useEffect(() => {
    api.get('/dashboard').then(setDash).catch(() => setDash({ error: true }));
    loadWarnings();
    loadTasks();
  }, [loadWarnings, loadTasks]);

  async function ack(key, content) {
    try { await api.post('/warnings/ack', { key, content }); loadWarnings(); } catch (e) { toast.err(e.message); }
  }
  async function dismiss(key, content) {
    try { await api.post('/warnings/dismiss', { key, content }); loadWarnings(); toast.ok('경고를 숨겼습니다.'); } catch (e) { toast.err(e.message); }
  }
  async function completeTask(t) {
    try { await api.patch('/tasks/' + t.id, { status: '완료' }); loadTasks(); toast.ok('완료 처리했습니다.'); } catch (e) { toast.err(e.message); }
  }

  if (!dash) return <Loading />;
  if (dash.error) return <Empty>대시보드를 불러오지 못했습니다.</Empty>;

  const mat = matTab === 'raw' ? dash.rawSummary : dash.subSummary;

  return (
    <>
      {/* 1) 퀵메뉴 */}
      <div className="quickmenu">
        {QUICK.map((q) => (
          <div className="quick-box" key={q.label} onClick={() => navigate(q.to)}>
            <div className="quick-ico" style={{ background: q.bg }}>{q.ico}</div>
            <div><div className="qt">{q.label}</div><div className="qs">{q.sub}</div></div>
          </div>
        ))}
      </div>

      {/* 2) 경고 영역 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>⚠ 경고 {warnings ? `(${warnings.length})` : ''}</h3>
          <span className="hint">안전재고 부족 · Canister 용량 초과</span>
        </div>
        <div>
          {!warnings ? <Loading /> : warnings.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>현재 경고가 없습니다. 👍</div>
          ) : warnings.map((w) => (
            <div className={`warn-item ${w.level === 'warn' ? 'warn' : ''}`} key={w.key}>
              <span className="wbar" />
              <div className="wc">
                <div className="wmsg">{w.content}</div>
                <div className="wack">
                  확인 {w.ackCount}/{w.totalUsers}명 {w.ackedByMe ? '· 내 확인 완료' : ''}
                  {w.pending && w.pending.length > 0 && <> · 미확인: {w.pending.join(', ')}</>}
                </div>
              </div>
              {!w.ackedByMe && <button className="btn sm" onClick={() => ack(w.key, w.content)}>확인</button>}
              <button className="btn secondary sm" onClick={() => dismiss(w.key, w.content)}>삭제</button>
            </div>
          ))}
        </div>
      </div>

      {/* 3) 요약 현황 */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>원·부재료 현황</h3>
            <div className="btn-row">
              <button className={`btn sm ${matTab === 'raw' ? '' : 'secondary'}`} onClick={() => setMatTab('raw')}>원재료</button>
              <button className={`btn sm ${matTab === 'sub' ? '' : 'secondary'}`} onClick={() => setMatTab('sub')}>부재료</button>
            </div>
          </div>
          <div className="table-wrap">
            {mat.length === 0 ? <Empty>품목이 없습니다.</Empty> : (
              <table className="tbl compact">
                <thead>
                  <tr><th>품목</th><th className="num">잔여 Lot</th><th className="num">현재고</th><th>단위</th><th className="num">최소재고</th><th className="num">안전%</th><th>상태</th></tr>
                </thead>
                <tbody>
                  {mat.map((r) => (
                    <tr key={r.name} style={{ cursor: 'pointer' }} onClick={() => navigate(matTab === 'raw' ? '/raw' : '/sub')}>
                      <td><b className="inline-link">{r.name}</b></td>
                      <td className="num">{r.lots}</td>
                      <td className="num"><b>{r.current.toLocaleString()}</b></td>
                      <td className="muted">{r.unit}</td>
                      <td className="num muted">{r.minStock ? r.minStock.toLocaleString() : '–'}</td>
                      <td className="num">{r.level == null ? '–' : `${r.level}%`}</td>
                      <td><span className={`state-pill state-${r.state}`}>{r.state}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Canister 현황</h3><span className="inline-link" onClick={() => navigate('/canisters')}>전체 →</span></div>
          <div className="table-wrap">
            {dash.canisterSummary.length === 0 ? <Empty>Canister가 없습니다.</Empty> : (
              <table className="tbl compact">
                <thead>
                  <tr><th>사용 제품</th><th>종류</th><th className="num">개수</th><th className="num">Total 무게</th><th>최대 무게 비고</th></tr>
                </thead>
                <tbody>
                  {dash.canisterSummary.map((c, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate('/canisters')}>
                      <td><b className="inline-link">{c.content}</b></td>
                      <td><Badge>{c.size}</Badge></td>
                      <td className="num">{c.count}</td>
                      <td className="num">{c.totalWeight.toLocaleString()}</td>
                      <td className="muted">{c.heaviestNote || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 4) Task */}
      <div className="card">
        <div className="card-head">
          <h3>진행 Task {tasks ? `(${tasks.length})` : ''}</h3>
          <span className="inline-link" onClick={() => navigate('/tasks')}>+ Task 등록 / 관리 →</span>
        </div>
        <div className="table-wrap">
          {!tasks ? <Loading /> : tasks.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>진행 중인 Task가 없습니다.</div>
          ) : (
            <table className="tbl compact">
              <thead>
                <tr><th>우선</th><th>Task명</th><th>구분</th><th>담당</th><th>완료예정</th><th>현황</th><th style={{ width: 1 }}></th></tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td><Badge color={prioColor[t.priority]}>{t.priority}</Badge></td>
                    <td><b>{t.title}</b></td>
                    <td className="muted">{t.category === '기타' ? t.categoryEtc || '기타' : t.category}</td>
                    <td className="muted">{t.assignee || '–'}</td>
                    <td className="muted">{t.dueDate || '–'}</td>
                    <td><Badge color={statColor[t.status]} dot>{t.status}</Badge></td>
                    <td><div className="btn-row"><button className="btn ghost sm" onClick={() => completeTask(t)}>완료</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
