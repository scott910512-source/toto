"""공장 마스터 데이터 상수 (가상 데이터 생성 및 AI 검색 공용)."""

# 5개 공정
PROCESSES = ["증착", "식각", "세정", "확산", "포토"]

# 20개 설비
EQUIPMENTS = [
    "Reactor-101", "Reactor-102", "Reactor-103", "Reactor-104",
    "Tank-201", "Tank-202", "Tank-203", "Tank-204",
    "Filter-301", "Filter-302", "Filter-303", "Filter-304",
    "Dryer-401", "Dryer-402", "Dryer-403",
    "Etcher-501", "Etcher-502",
    "Cleaner-601", "Cleaner-602",
    "Furnace-701",
]

# 품질 분석 항목과 현실적인 규격 범위
QUALITY_ITEMS = {
    "Moisture": {"unit": "ppm", "lower": 0.0, "upper": 50.0, "typical": (5, 45)},
    "Metal": {"unit": "ppb", "lower": 0.0, "upper": 10.0, "typical": (0.1, 9)},
    "Purity": {"unit": "%", "lower": 99.0, "upper": 100.0, "typical": (99.0, 99.999)},
    "Particle": {"unit": "ea", "lower": 0.0, "upper": 100.0, "typical": (1, 95)},
}

# 안전 위험요인
HAZARDS = ["화학물질 누출", "고온 노출", "협착 위험", "전기 위험", "밀폐공간 작업"]

# 작업구역
WORK_AREAS = ["1공정라인", "2공정라인", "유틸리티동", "약품보관소", "폐수처리장", "옥외탱크"]

# 점검 항목
CHECK_ITEMS = ["온도", "압력", "진동", "유량", "전류", "누설", "청정도"]

# 작업자/점검자/분석자 이름 풀
PEOPLE = ["김철수", "이영희", "박민수", "정수진", "최지훈", "강서연", "윤도현", "임하늘"]
