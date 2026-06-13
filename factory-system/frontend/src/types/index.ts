export type Role = "admin" | "engineer" | "viewer";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Production {
  id: number;
  produced_at: string;
  process_name: string;
  equipment_name: string;
  lot_number: string;
  operator: string;
  quantity: number;
  yield_rate: number;
  remark: string;
}

export interface EquipmentCheck {
  id: number;
  checked_at: string;
  equipment_name: string;
  inspector: string;
  check_item: string;
  measured_value: number;
  standard_value: string;
  judgement: "PASS" | "FAIL";
  action: string;
}

export interface Quality {
  id: number;
  sample_number: string;
  lot_number: string;
  analyzed_at: string;
  analyst: string;
  item_name: string;
  measured_value: number;
  spec_lower: number;
  spec_upper: number;
  result: "OK" | "NG";
}

export interface Safety {
  id: number;
  worked_at: string;
  work_area: string;
  hazard: string;
  improvement: string;
  manager: string;
  completed: boolean;
}

export interface Kpi {
  daily_production: number;
  monthly_production: number;
  avg_yield: number;
  equipment_fail_count: number;
  quality_ng_count: number;
  safety_open_count: number;
}

export interface AiAnswer {
  matched: boolean;
  question: string;
  answer: string;
  rows: Record<string, unknown>[];
}

export interface AuditLog {
  id: number;
  created_at: string;
  username: string;
  role: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entity_id: number | null;
  summary: string;
}
