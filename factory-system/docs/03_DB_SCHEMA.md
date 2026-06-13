# 3. DB 스키마

PostgreSQL 16 기준 DDL. (실제 테이블은 SQLAlchemy 가 자동 생성하며, 아래는 참고용)

## 3.1 users

```sql
CREATE TYPE user_role AS ENUM ('admin', 'engineer', 'viewer');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    full_name       VARCHAR(100) NOT NULL DEFAULT '',
    hashed_password VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL DEFAULT 'viewer',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_users_username ON users (username);
```

## 3.2 production (생산 정보)

```sql
CREATE TABLE production (
    id             SERIAL PRIMARY KEY,
    produced_at    TIMESTAMPTZ NOT NULL,
    process_name   VARCHAR(50) NOT NULL,
    equipment_name VARCHAR(50) NOT NULL,
    lot_number     VARCHAR(30) NOT NULL,
    operator       VARCHAR(50) NOT NULL,
    quantity       INTEGER     NOT NULL,
    yield_rate     DOUBLE PRECISION NOT NULL,
    remark         TEXT        NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_production_produced_at  ON production (produced_at);
CREATE INDEX ix_production_process_name ON production (process_name);
CREATE INDEX ix_production_equipment    ON production (equipment_name);
CREATE INDEX ix_production_lot_number   ON production (lot_number);
```

## 3.3 equipment_check (설비 점검)

```sql
CREATE TYPE judgement AS ENUM ('PASS', 'FAIL');

CREATE TABLE equipment_check (
    id             SERIAL PRIMARY KEY,
    checked_at     TIMESTAMPTZ NOT NULL,
    equipment_name VARCHAR(50) NOT NULL,
    inspector      VARCHAR(50) NOT NULL,
    check_item     VARCHAR(80) NOT NULL,
    measured_value DOUBLE PRECISION NOT NULL,
    standard_value VARCHAR(50) NOT NULL,
    judgement      judgement   NOT NULL,
    action         TEXT        NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_equip_checked_at ON equipment_check (checked_at);
CREATE INDEX ix_equip_name       ON equipment_check (equipment_name);
CREATE INDEX ix_equip_judgement  ON equipment_check (judgement);
```

## 3.4 quality (품질 데이터)

```sql
CREATE TYPE quality_result AS ENUM ('OK', 'NG');

CREATE TABLE quality (
    id             SERIAL PRIMARY KEY,
    sample_number  VARCHAR(30) NOT NULL,
    lot_number     VARCHAR(30) NOT NULL,
    analyzed_at    TIMESTAMPTZ NOT NULL,
    analyst        VARCHAR(50) NOT NULL,
    item_name      VARCHAR(50) NOT NULL,
    measured_value DOUBLE PRECISION NOT NULL,
    spec_lower     DOUBLE PRECISION NOT NULL,
    spec_upper     DOUBLE PRECISION NOT NULL,
    result         quality_result NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_quality_lot     ON quality (lot_number);
CREATE INDEX ix_quality_item    ON quality (item_name);
CREATE INDEX ix_quality_result  ON quality (result);
CREATE INDEX ix_quality_analyzed ON quality (analyzed_at);
```

## 3.5 safety (안전 데이터)

```sql
CREATE TABLE safety (
    id          SERIAL PRIMARY KEY,
    worked_at   TIMESTAMPTZ  NOT NULL,
    work_area   VARCHAR(80)  NOT NULL,
    hazard      VARCHAR(120) NOT NULL,
    improvement TEXT         NOT NULL DEFAULT '',
    manager     VARCHAR(50)  NOT NULL,
    completed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_safety_worked_at ON safety (worked_at);
CREATE INDEX ix_safety_area      ON safety (work_area);
CREATE INDEX ix_safety_completed ON safety (completed);
```
