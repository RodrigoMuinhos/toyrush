CREATE TABLE machine_balance (
  id VARCHAR(80) PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0)
);
CREATE TABLE payment_session (
  id VARCHAR(36) PRIMARY KEY,
  machine_id VARCHAR(80) NOT NULL REFERENCES machine_balance(id),
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payer_email VARCHAR(254) NOT NULL,
  payer_cpf VARCHAR(11),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  provider_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_id VARCHAR(80) UNIQUE,
  external_reference VARCHAR(160) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  provider_status VARCHAR(40),
  qr_code TEXT,
  qr_code_base64 TEXT,
  credits_released BOOLEAN NOT NULL DEFAULT FALSE,
  auto_start_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  closed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX payment_machine_created ON payment_session(machine_id, created_at);
CREATE TABLE game_session (
  id VARCHAR(36) PRIMARY KEY,
  machine_id VARCHAR(80) NOT NULL REFERENCES machine_balance(id),
  mode VARCHAR(8) NOT NULL,
  cost INTEGER NOT NULL,
  status VARCHAR(25) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
