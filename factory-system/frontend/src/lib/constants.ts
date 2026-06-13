export const PROCESSES = ["증착", "식각", "세정", "확산", "포토"];

export const EQUIPMENTS = [
  "Reactor-101", "Reactor-102", "Reactor-103", "Reactor-104",
  "Tank-201", "Tank-202", "Tank-203", "Tank-204",
  "Filter-301", "Filter-302", "Filter-303", "Filter-304",
  "Dryer-401", "Dryer-402", "Dryer-403",
  "Etcher-501", "Etcher-502",
  "Cleaner-601", "Cleaner-602",
  "Furnace-701",
];

export const QUALITY_ITEMS = ["Moisture", "Metal", "Purity", "Particle"];

export const HAZARDS = ["화학물질 누출", "고온 노출", "협착 위험", "전기 위험", "밀폐공간 작업"];

export const WORK_AREAS = ["1공정라인", "2공정라인", "유틸리티동", "약품보관소", "폐수처리장", "옥외탱크"];

export const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
