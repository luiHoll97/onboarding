CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status INTEGER NOT NULL,
  applied_at TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  national_insurance_number TEXT NOT NULL,
  right_to_work_check_code TEXT NOT NULL,
  induction_date TEXT NOT NULL,
  interview_date TEXT NOT NULL,
  id_document_type TEXT NOT NULL,
  id_document_number TEXT NOT NULL,
  id_check_completed INTEGER NOT NULL,
  id_check_completed_at TEXT NOT NULL,
  drivers_license_number TEXT NOT NULL,
  drivers_license_expiry_date TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role INTEGER NOT NULL DEFAULT 1,
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  available_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  error_message TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_external
ON webhook_events(provider, external_event_id);
