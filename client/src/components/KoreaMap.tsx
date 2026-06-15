import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { rateColor } from '../utils/format';

interface Props {
  selectedProvince: string | null;
  onSelectProvince: (province: string) => void;
}

// 대한민국 17개 시도 지리 근사 SVG path (viewBox 0 0 480 565)
// 큰 도(道)를 먼저, 광역시는 나중에 렌더링하여 겹치는 지역이 위에 표시됩니다.
const PROVINCE_GEO = [
  {
    name: '경기도', short: '경기',
    d: 'M 162,30 L 262,28 L 275,102 L 248,162 L 195,172 L 168,160 L 148,128 L 158,90 Z',
    tx: 200, ty: 90,
  },
  {
    name: '강원특별자치도', short: '강원',
    d: 'M 262,28 L 458,22 L 468,80 L 465,165 L 435,182 L 375,196 L 325,195 L 288,185 L 272,165 L 275,102 Z',
    tx: 365, ty: 102,
  },
  {
    name: '충청남도', short: '충남',
    d: 'M 58,140 L 115,155 L 148,128 L 168,160 L 172,182 L 170,248 L 143,272 L 110,290 L 65,276 L 40,245 L 36,192 Z',
    tx: 105, ty: 210,
  },
  {
    name: '충청북도', short: '충북',
    d: 'M 195,172 L 248,162 L 272,165 L 288,185 L 305,215 L 283,260 L 257,272 L 215,268 L 194,248 L 186,220 L 172,182 Z',
    tx: 248, ty: 218,
  },
  {
    name: '세종특별자치시', short: '세종',
    d: 'M 186,220 L 210,218 L 212,240 L 186,242 Z',
    tx: 199, ty: 230,
  },
  {
    name: '대전광역시', short: '대전',
    d: 'M 158,262 L 200,260 L 202,285 L 158,288 Z',
    tx: 180, ty: 274,
  },
  {
    name: '경상북도', short: '경북',
    d: 'M 272,165 L 325,195 L 375,196 L 435,182 L 465,205 L 462,308 L 430,350 L 390,372 L 352,366 L 315,350 L 294,322 L 258,290 L 257,272 L 283,260 L 305,215 L 288,185 Z',
    tx: 375, ty: 258,
  },
  {
    name: '전북특별자치도', short: '전북',
    d: 'M 85,265 L 170,248 L 215,268 L 257,272 L 258,290 L 238,332 L 200,358 L 160,364 L 113,358 L 78,328 L 63,295 Z',
    tx: 162, ty: 308,
  },
  {
    name: '경상남도', short: '경남',
    d: 'M 238,332 L 315,350 L 352,366 L 390,372 L 422,408 L 400,448 L 348,464 L 288,460 L 244,444 L 215,412 L 210,368 L 200,358 Z',
    tx: 316, ty: 400,
  },
  {
    name: '전라남도', short: '전남',
    d: 'M 63,295 L 113,358 L 160,364 L 200,358 L 210,368 L 215,412 L 200,460 L 160,494 L 104,506 L 53,480 L 33,418 L 36,356 Z',
    tx: 120, ty: 420,
  },
  // 광역시·특별시는 상위 도(道)보다 나중에 렌더링 (위에 표시)
  {
    name: '서울특별시', short: '서울',
    d: 'M 166,79 L 208,77 L 214,94 L 210,116 L 177,121 L 163,102 Z',
    tx: 190, ty: 98,
  },
  {
    name: '인천광역시', short: '인천',
    d: 'M 93,67 L 148,64 L 166,79 L 163,102 L 138,125 L 103,130 L 66,112 Z',
    tx: 118, ty: 94,
  },
  {
    name: '대구광역시', short: '대구',
    d: 'M 292,288 L 348,288 L 350,342 L 292,342 Z',
    tx: 320, ty: 315,
  },
  {
    name: '울산광역시', short: '울산',
    d: 'M 415,302 L 462,296 L 462,375 L 415,375 Z',
    tx: 438, ty: 335,
  },
  {
    name: '부산광역시', short: '부산',
    d: 'M 374,382 L 438,364 L 452,407 L 418,434 L 367,440 L 350,418 Z',
    tx: 408, ty: 408,
  },
  {
    name: '광주광역시', short: '광주',
    d: 'M 102,350 L 150,350 L 150,392 L 102,392 Z',
    tx: 126, ty: 370,
  },
  {
    name: '제주특별자치도', short: '제주',
    d: 'M 136,520 L 286,510 L 298,544 L 147,554 Z',
    tx: 218, ty: 532,
  },
];

export function KoreaMap({ selectedProvince, onSelectProvince }: Props) {
  const { regions, visitByRegion, wishlistRegionIds } = useData();
  const [hovered, setHovered] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; visited: number; planned: number; wish: number }>();
    for (const r of regions) {
      const s = map.get(r.provinceName) ?? { total: 0, visited: 0, planned: 0, wish: 0 };
      s.total += 1;
      const v = visitByRegion.get(r.id);
      if (v?.status === 'VISITED') s.visited += 1;
      else if (v?.status === 'PLANNED') s.planned += 1;
      if (wishlistRegionIds.has(r.id)) s.wish += 1;
      map.set(r.provinceName, s);
    }
    return map;
  }, [regions, visitByRegion, wishlistRegionIds]);

  return (
    <svg
      viewBox="0 0 480 565"
      className="h-auto w-full max-w-md select-none"
      role="img"
      aria-label="대한민국 시도 지도"
    >
      {PROVINCE_GEO.map((geo) => {
        const s = stats.get(geo.name) ?? { total: 0, visited: 0, planned: 0, wish: 0 };
        const rate = s.total ? (s.visited / s.total) * 100 : 0;
        const isSelected = selectedProvince === geo.name;
        const isHovered = hovered === geo.name;
        const hasPlanned = s.planned > 0 && s.visited === 0;
        const fill = s.visited > 0 ? rateColor(rate) : hasPlanned ? '#fde68a' : '#e2e8f0';

        return (
          <g key={geo.name}>
            <path
              d={geo.d}
              fill={fill}
              fillOpacity={isHovered && !isSelected ? 0.72 : 1}
              stroke={isSelected ? '#f4663a' : '#ffffff'}
              strokeWidth={isSelected ? 3 : 1.5}
              strokeLinejoin="round"
              className="cursor-pointer drop-shadow-sm"
              onClick={() => onSelectProvince(geo.name)}
              onMouseEnter={() => setHovered(geo.name)}
              onMouseLeave={() => setHovered(null)}
            />
            {/* pointerEvents none → 텍스트가 클릭을 막지 않음 */}
            <text
              x={geo.tx}
              y={geo.ty - 3}
              textAnchor="middle"
              dominantBaseline="auto"
              style={{ fontSize: 10, fontWeight: 700, fill: '#1e293b', pointerEvents: 'none', userSelect: 'none' }}
            >
              {geo.short}
            </text>
            <text
              x={geo.tx}
              y={geo.ty + 9}
              textAnchor="middle"
              style={{ fontSize: 9, fill: '#475569', pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.visited}/{s.total}
            </text>
            {s.wish > 0 && (
              <text
                x={geo.tx + 15}
                y={geo.ty - 10}
                style={{ fontSize: 10, pointerEvents: 'none', userSelect: 'none' }}
              >
                ⭐
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
