import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Loading, Empty, Badge, useToast, ConfirmDialog, Select } from '../components/ui';

const statusBadge = { pending: { c: 'orange', t: '승인대기' }, approved: { c: 'green', t: '승인됨' }, rejected: { c: 'red', t: '거절/금지' } };

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const d = await api.get('/users');
    setItems(d.items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function action(fn, okMsg) {
    try {
      await fn();
      await load();
      toast.ok(okMsg);
    } catch (e) {
      toast.err(e.message);
    }
  }

  if (!items) return <Loading />;
  const pending = items.filter((u) => u.status === 'pending');

  return (
    <>
      <div className="page-head">
        <div className="desc">가입 신청을 승인하고 사용자 권한(등록자/관리자)을 관리합니다.</div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--orange)' }}>
          <div className="card-head"><h3>승인 대기 {pending.length}건</h3></div>
          <div className="card-pad">
            {pending.map((u) => (
              <div key={u.id} className="safety-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="safety-name">{u.name} <span className="muted" style={{ fontWeight: 400 }}>({u.id})</span></div>
                  <div className="safety-qty">신청일 {(u.createdAt || '').slice(0, 10)}</div>
                </div>
                <div className="btn-row">
                  <button className="btn sm" onClick={() => action(() => api.post(`/users/${u.id}/approve`, { role: 'user' }), '등록자로 승인했습니다.')}>등록자 승인</button>
                  <button className="btn secondary sm" onClick={() => action(() => api.post(`/users/${u.id}/approve`, { role: 'admin' }), '관리자로 승인했습니다.')}>관리자 승인</button>
                  <button className="btn danger sm" onClick={() => action(() => api.post(`/users/${u.id}/reject`), '거절했습니다.')}>거절</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card table-wrap">
        <div className="card-head"><h3>전체 사용자 {items.length}명</h3></div>
        {items.length === 0 ? (
          <Empty>사용자가 없습니다.</Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>아이디</th><th>이름</th><th>역할</th><th>상태</th><th>가입일</th><th style={{ width: 1 }}></th></tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const sb = statusBadge[u.status] || { c: '', t: u.status };
                const self = u.id === user.id;
                return (
                  <tr key={u.id}>
                    <td><b>{u.id}</b>{self && <span className="muted"> (나)</span>}</td>
                    <td>{u.name}</td>
                    <td>
                      <Select
                        value={u.role}
                        disabled={self}
                        onChange={(e) => action(() => api.patch(`/users/${u.id}`, { role: e.target.value }), '역할을 변경했습니다.')}
                        style={{ width: 110 }}
                      >
                        <option value="user">등록자</option>
                        <option value="admin">관리자</option>
                      </Select>
                    </td>
                    <td><Badge color={sb.c} dot>{sb.t}</Badge></td>
                    <td className="muted">{(u.createdAt || '').slice(0, 10)}</td>
                    <td>
                      <div className="btn-row">
                        {u.status !== 'approved' && (
                          <button className="btn ghost sm" onClick={() => action(() => api.post(`/users/${u.id}/approve`, { role: u.role }), '승인했습니다.')}>승인</button>
                        )}
                        {!self && <button className="btn danger sm" onClick={() => setDel(u)}>삭제</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {del && (
        <ConfirmDialog
          title="사용자 삭제"
          message={`'${del.name}(${del.id})' 계정을 삭제할까요?`}
          onClose={() => setDel(null)}
          onConfirm={() => { setDel(null); action(() => api.del('/users/' + del.id), '삭제했습니다.'); }}
        />
      )}
    </>
  );
}
