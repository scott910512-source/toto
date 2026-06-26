import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Loading, Bars, Empty } from '../components/ui';

function Stat({ label, value, unit, sub, warn, ico }) {
  return (
    <div className="card stat">
      <div className="label">{ico && <span>{ico}</span>}{label}</div>
      <div className={`value ${warn ? 'warn' : ''}`}>
        {value}{unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function SafetyList({ rows }) {
  const sorted = [...rows].sort((a, b) => {
    const ra = a.level == null ? Infinity : a.level;
    const rb = b.level == null ? Infinity : b.level;
    return ra - rb;
  });
  if (!sorted.length) return <Empty>등록된 품목이 없습니다.</Empty>;
  return sorted.map((r) => {
    const width = r.level == null ? 100 : Math.min(r.level, 100);
    const cls = r.below ? 'red' : r.level != null && r.level < 130 ? 'orange' : 'green';
    return (
      <div className="safety-row" key={r.name}>
        <div>
          <div className="safety-name">{r.name}</div>
          <div className="safety-qty">재고 {r.quantity.toLocaleString()}{r.unit} / 안전 {r.safetyStock.toLocaleString()}{r.unit}</div>
        </div>
        <span className="bar-track"><span className={`bar-fill ${cls}`} style={{ width: `${width}%` }} /></span>
        <span className={`ratio ${r.below ? 'warn' : 'ok'}`}>{r.level == null ? '–' : `${r.level}%`}</span>
      </div>
    );
  });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('raw');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Empty>{err}</Empty>;
  if (!data) return <Loading />;
  const { rawMaterials, subMaterials, canisters, settings } = data;

  return (
    <>
      <div className="grid grid-4">
        <Stat ico="⬡" label="원재료 미달" value={rawMaterials.belowCount} unit="종" warn={rawMaterials.belowCount > 0} sub={`전체 ${rawMaterials.totalItems}품목 · ${rawMaterials.totalLots}Lot`} />
        <Stat ico="◇" label="부재료 미달" value={subMaterials.belowCount} unit="종" warn={subMaterials.belowCount > 0} sub={`전체 ${subMaterials.totalItems}품목 · ${subMaterials.totalLots}Lot`} />
        <Stat ico="⚠️" label="안전재고 경고기준" value={settings.safetyRatioPercent} unit="%" sub="관리자 설정값" />
        <Stat ico="⬢" label="Canister 보유" value={canisters.total} unit="개" sub="위치/사이즈/상태별 관리" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>안전재고 현황</h3>
            <div className="btn-row">
              <button className={`btn sm ${tab === 'raw' ? '' : 'secondary'}`} onClick={() => setTab('raw')}>원재료</button>
              <button className={`btn sm ${tab === 'sub' ? '' : 'secondary'}`} onClick={() => setTab('sub')}>부재료</button>
            </div>
          </div>
          <div className="card-pad">
            <SafetyList rows={tab === 'raw' ? rawMaterials.items : subMaterials.items} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Canister 관리 현황</h3>
            <Link to="/canisters" className="inline-link">전체 보기 →</Link>
          </div>
          <div className="card-pad">
            <div className="section-title" style={{ marginTop: 0 }}>위치별</div>
            <Bars data={canisters.byLocation} color="purple" />
            <div className="section-title">제품(사이즈)별</div>
            <Bars data={canisters.bySize} color="" />
            <div className="section-title">상세구분(상태)별</div>
            <Bars data={canisters.byStatus} color="orange" />
          </div>
        </div>
      </div>
    </>
  );
}
