import type {
  IBadgeRepository,
  IRegionRepository,
  IVisitRepository,
} from '../../domain/repositories';

/** 시드되어야 하는 배지 정의 (seed.ts 와 BadgeService 가 공유) */
export const BADGE_DEFINITIONS = [
  { key: 'FIRST_VISIT',          name: '첫 발자국',           description: '첫 방문 기록 작성. 여행의 시작!',                      icon: '👣' },
  { key: 'NATION_10',            name: '슬슬 맛들리시네요?',  description: '전국 시군구 10% 방문 달성',                             icon: '🗺️' },
  { key: 'NATION_25',            name: '이제 좀 돌아다니셨군요!', description: '전국 시군구 25% 방문 달성',                         icon: '🧭' },
  { key: 'NATION_50',            name: '반타작! 이제 반이에요!', description: '전국 시군구 50% 방문 달성',                          icon: '🥈' },
  { key: 'NATION_100',           name: '대한민국 완전정복!',   description: '전국 229개 시군구 100% 방문. 진짜요?!',                icon: '🏆' },
  { key: 'PROVINCE_COMPLETE',    name: '도(道) 정복자',        description: '한 개 시도 전 지역 방문. 구석구석!',                   icon: '🎖️' },
  { key: 'SEOUL_COMPLETE',       name: '서울구석구이다!',       description: '서울특별시 25개 구 전부 방문',                         icon: '🏙️' },
  { key: 'GYEONGGI_COMPLETE',    name: '수도권 마스터 (찍먹완료)', description: '경기도 전 시군 방문',                              icon: '🏘️' },
  { key: 'GANGWON_COMPLETE',     name: '강원도 자연인 🌲',     description: '강원특별자치도 전 시군 방문',                          icon: '🏔️' },
  { key: 'CHUNGCHEONG_MASTER',   name: '충청도 마스터유~',      description: '충청남도·충청북도·대전·세종 모두 완주. 오메~',         icon: '🌾' },
  { key: 'GYEONGBUK_COMPLETE',   name: '경상북도 완주',        description: '경상북도 전 시군 방문. 유교의 성지!',                  icon: '⛩️' },
  { key: 'GYEONGNAM_COMPLETE',   name: '경남 탐험대!',         description: '경상남도 전 시군 방문. 바다부터 산까지!',              icon: '🌊' },
  { key: 'HONAM_MASTER',         name: '호남 맛집 투어 완료!', description: '전라남도·전북특별자치도·광주 모두 완주. 먹어야 산다!', icon: '🍚' },
  { key: 'JEJU_COMPLETE',        name: '제주왔수다!',           description: '제주특별자치도 전 읍·면·동 방문. 어디어디 가봤수과?',  icon: '🌴' },
  { key: 'METRO_MASTER',         name: '도시 유목민',           description: '7대 특·광역시(서울·부산·대구·인천·광주·대전·울산) 각 1곳 이상 방문', icon: '🌆' },
] as const;

export interface EarnedBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

/** 사용자의 방문 현황을 평가하여 자동으로 배지를 부여 */
export class BadgeService {
  constructor(
    private readonly badges: IBadgeRepository,
    private readonly regions: IRegionRepository,
    private readonly visits: IVisitRepository,
  ) {}

  /** 방문 변경 시 호출 → 새로 획득한 배지 key 목록 반환 */
  async evaluate(userId: string): Promise<string[]> {
    const [allRegions, userVisits, allBadges] = await Promise.all([
      this.regions.listAll(),
      this.visits.listByUser(userId),
      this.badges.listAll(),
    ]);

    const badgeByKey = new Map(allBadges.map((b) => [b.key, b]));
    const visitedRegionIds = new Set(
      userVisits.filter((v) => v.status === 'VISITED').map((v) => v.regionId),
    );

    const total = allRegions.length;
    const visitedCount = visitedRegionIds.size;
    const rate = total ? (visitedCount / total) * 100 : 0;

    // 시도별 완주 여부 계산
    const byProvince = new Map<string, { total: number; visited: number }>();
    for (const r of allRegions) {
      const s = byProvince.get(r.provinceName) ?? { total: 0, visited: 0 };
      s.total += 1;
      if (visitedRegionIds.has(r.id)) s.visited += 1;
      byProvince.set(r.provinceName, s);
    }
    const isComplete = (name: string) => {
      const s = byProvince.get(name);
      return !!s && s.total > 0 && s.total === s.visited;
    };
    const anyProvinceComplete = [...byProvince.values()].some((s) => s.total === s.visited && s.total > 0);

    const hasVisitIn = (name: string) => {
      const s = byProvince.get(name);
      return !!s && s.visited > 0;
    };

    const toAward: string[] = [];
    const want = (key: string, cond: boolean) => {
      if (cond && badgeByKey.has(key)) toAward.push(key);
    };

    want('FIRST_VISIT',        visitedCount >= 1);
    want('NATION_10',          rate >= 10);
    want('NATION_25',          rate >= 25);
    want('NATION_50',          rate >= 50);
    want('NATION_100',         rate >= 100);
    want('PROVINCE_COMPLETE',  anyProvinceComplete);
    want('SEOUL_COMPLETE',     isComplete('서울특별시'));
    want('GYEONGGI_COMPLETE',  isComplete('경기도'));
    want('GANGWON_COMPLETE',   isComplete('강원특별자치도'));
    want('CHUNGCHEONG_MASTER',
      isComplete('충청남도') && isComplete('충청북도') &&
      isComplete('대전광역시') && isComplete('세종특별자치시'),
    );
    want('GYEONGBUK_COMPLETE', isComplete('경상북도'));
    want('GYEONGNAM_COMPLETE', isComplete('경상남도'));
    want('HONAM_MASTER',
      isComplete('전라남도') && isComplete('전북특별자치도') && isComplete('광주광역시'),
    );
    want('JEJU_COMPLETE',      isComplete('제주특별자치도'));
    want('METRO_MASTER',
      ['서울특별시', '부산광역시', '대구광역시', '인천광역시',
       '광주광역시', '대전광역시', '울산광역시'].every(hasVisitIn),
    );

    const newlyEarned: string[] = [];
    for (const key of toAward) {
      const badge = badgeByKey.get(key)!;
      const awarded = await this.badges.award(userId, badge.id);
      if (awarded) newlyEarned.push(key);
    }
    return newlyEarned;
  }

  async listForUser(userId: string): Promise<{ all: EarnedBadge[]; earnedKeys: string[] }> {
    const [allBadges, earned] = await Promise.all([
      this.badges.listAll(),
      this.badges.listEarned(userId),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.badge.key, e.earnedAt]));
    const all = allBadges.map((b) => ({
      key: b.key,
      name: b.name,
      description: b.description,
      icon: b.icon,
      earnedAt: earnedMap.get(b.key)?.toISOString() ?? '',
    }));
    return { all, earnedKeys: [...earnedMap.keys()] };
  }
}
