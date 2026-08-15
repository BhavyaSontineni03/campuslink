-- CampusLink engagement layer: tags, FTS, interactions, funnel, bandit

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);

-- Keep organizer_name in sync with users.name for same-table FTS
CREATE OR REPLACE FUNCTION sync_session_organizer_name()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    SELECT name INTO NEW.organizer_name FROM users WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_organizer_name ON sessions;
CREATE TRIGGER trg_sessions_organizer_name
  BEFORE INSERT OR UPDATE OF created_by ON sessions
  FOR EACH ROW EXECUTE FUNCTION sync_session_organizer_name();

CREATE OR REPLACE FUNCTION sync_organizer_name_on_user_rename()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE sessions SET organizer_name = NEW.name WHERE created_by = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_rename_organizer ON users;
CREATE TRIGGER trg_users_rename_organizer
  AFTER UPDATE OF name ON users
  FOR EACH ROW EXECUTE FUNCTION sync_organizer_name_on_user_rename();

-- Trigger-maintained FTS (generated columns cannot use array_to_string)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION sessions_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.organizer_name, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_search_vector ON sessions;
CREATE TRIGGER trg_sessions_search_vector
  BEFORE INSERT OR UPDATE OF title, description, category, tags, organizer_name
  ON sessions
  FOR EACH ROW EXECUTE FUNCTION sessions_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_sessions_search_vector ON sessions USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_sessions_tags ON sessions USING GIN (tags);

CREATE TABLE IF NOT EXISTS user_interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL
    CHECK (interaction_type IN ('view', 'favorite', 'register', 'attend')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_created
  ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_session
  ON user_interactions(session_id);

CREATE TABLE IF NOT EXISTS funnel_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  stage VARCHAR(40) NOT NULL CHECK (stage IN (
    'viewed',
    'opened',
    'started_registration',
    'completed_registration',
    'attended'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_session_stage ON funnel_events(session_id, stage);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON funnel_events(created_at);

CREATE TABLE IF NOT EXISTS notification_sends (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'in_app_push', 'sms')),
  offset_minutes INT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome_recorded_at TIMESTAMPTZ,
  attended BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_notification_sends_pending
  ON notification_sends(session_id)
  WHERE outcome_recorded_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_experiments (
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'in_app_push', 'sms')),
  offset_minutes INT NOT NULL,
  alpha DOUBLE PRECISION NOT NULL DEFAULT 1,
  beta DOUBLE PRECISION NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel, offset_minutes)
);

INSERT INTO notification_experiments (channel, offset_minutes, alpha, beta)
VALUES
  ('email', 1440, 1, 1),
  ('email', 180, 1, 1),
  ('email', 30, 1, 1),
  ('in_app_push', 1440, 1, 1),
  ('in_app_push', 180, 1, 1),
  ('in_app_push', 30, 1, 1),
  ('sms', 1440, 1, 1),
  ('sms', 180, 1, 1),
  ('sms', 30, 1, 1)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS experiment_results (
  id SERIAL PRIMARY KEY,
  experiment_name VARCHAR(100) NOT NULL,
  baseline_metric DOUBLE PRECISION NOT NULL,
  treatment_metric DOUBLE PRECISION NOT NULL,
  lift_pct DOUBLE PRECISION NOT NULL,
  sample_size INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
