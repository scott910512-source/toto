import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Loading, Bars, Empty } from '../components/ui';

function Stat({ label, value, unit, sub, warn, ico }) {
  return (
    <div className="card stat">
      <div className="label">{ico && <span>{ico}</span>}{label}</div>
      <div className={`value ${warn ? 'warn' : ''}`}>
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Empty>{err}</Empty>;
  if (!data) return <Loading />;

  const { rawMaterials, subMaterials, canisters, settings } = data;
  const sortedRaw = [...rawMaterials.items].sort((a, b) => {
    const ra = a.ratio == null ? Infinity : a.ratio;
    const rb = b.ratio == null ? Infinity : b.ratio;
    return ra - rb;
  });

  return (
    <>
      <div className="grid grid-4">
        <Stat ico="⬡" label="원재료 품목" value={rawMaterials.totalItems} unit="종" sub={`총 수량 ${rawMaterials.totalQuantity.toLocaleString()}`} />
        <Stat ico="⚠️" label="안전재고 미달" value={rawMaterials.belowCount} unit="종" warn={rawMaterials.belowCount > 0} sub={`경고 기준 ${settings.safetyRatioPercent}%`} />
        <Stat ico="◇" label="부재료 Lot" value={subMaterials.totalLots} unit="건" sub={`${subMaterials.distinctItems}개 품목 · 총중량 ${subMaterials.totalWeight.toLocaleString()}`} />
        <Stat ico="⬢" label="Canister 보유" value={canisters.total} unit="개" sub="위치/사이즈/상태별 관리" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>원재료 안전재고 현황</h3>
            <Link to="/raw" className="inline-link">전체 보기 →</Link>
          </div>
          <div className="card-pad">
            {sortedRaw.length === 0 && <Empty>등록된 원재료가 없습니다.</Empty>}
            {sortedRaw.map((r) => {
              const ratio = r.ratio == null ? null : r.ratio;
              const width = ratio == null ? 100 : Math.min(ratio, 100);
              const cls = r.below ? 'red' : ratio != null && ratio < 130 ? 'orange' : 'green';
              return (
                <div className="safety-row" key={r.id}>
                  <div>
                    <div className="safety-name">{r.name}</div>
                    <div className="safety-qty">
                      재고 {r.quantity.toLocaleString()}{r.unit} / 안전 {r.safetyStock.toLocaleString()}{r.unit}
                    </div>
                  </div>
                  <span className="bar-track"><span className={`bar-fill ${cls}`} style={{ width: `${width}%` }} /></span>
                  <span className={`ratio ${r.below ? 'warn' : 'ok'}`}>{ratio == null ? '–' : `${ratio}%`}</span>
                </div>
              );
            })}
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
