-- CampusLink core schema (PostgreSQL)

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'organizer', 'admin', 'super_admin')),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    location VARCHAR(255),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (start_time < end_time)
);

CREATE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    session_id INT NOT NULL REFERENCES sessions(id),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'waitlisted', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, session_id)
);

CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Replaces MySQL's tr_check_capacity_before_approval trigger: prevents a reservation
-- from being updated to 'approved' once the session is already at capacity.
CREATE OR REPLACE FUNCTION check_capacity_before_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity INT;
    v_approved_count INT;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SELECT capacity INTO v_capacity FROM sessions WHERE id = NEW.session_id;
        SELECT COUNT(*) INTO v_approved_count FROM reservations
            WHERE session_id = NEW.session_id AND status = 'approved' AND id != NEW.id;
        IF v_approved_count >= v_capacity THEN
            RAISE EXCEPTION 'Session is at capacity, cannot approve reservation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_capacity_before_approval
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION check_capacity_before_approval();

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE REFERENCES reservations(id),
    checkin_time TIMESTAMPTZ,
    checkout_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (checkout_time IS NULL OR checkin_time IS NOT NULL),
    CHECK (checkout_time IS NULL OR checkout_time > checkin_time)
);

CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    target_user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, target_user_id),
    CHECK (user_id != target_user_id)
);

CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_session_status_created
    ON reservations(session_id, status, created_at);
CREATE INDEX idx_reservations_user_status ON reservations(user_id, status);
CREATE INDEX idx_sessions_time ON sessions(start_time, end_time);
CREATE INDEX idx_attendance_checkin ON attendance(checkin_time);
CREATE INDEX idx_sessions_category ON sessions(category);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
