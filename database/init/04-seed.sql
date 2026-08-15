-- Seed data for Student Activities Booking System

-- Insert sample users
INSERT INTO users (id, email, name, avatar_url, role, password_hash) VALUES
(1, 'alice@university.edu', 'Alice Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', 'student', NULL),
(2, 'bob@university.edu', 'Bob Smith', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'student', NULL),
(3, 'charlie@university.edu', 'Charlie Brown', 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', 'student', NULL),
(4, 'diana@university.edu', 'Diana Prince', 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', 'organizer', NULL),
(5, 'eve@university.edu', 'Eve Wilson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve', 'student', NULL),
(6, 'frank@university.edu', 'Frank Miller', 'https://api.dicebear.com/7.x/avataaars/svg?seed=frank', 'organizer', NULL),
(7, 'grace@university.edu', 'Grace Lee', 'https://api.dicebear.com/7.x/avataaars/svg?seed=grace', 'student', NULL),
(8, 'henry@university.edu', 'Henry Davis', 'https://api.dicebear.com/7.x/avataaars/svg?seed=henry', 'student', NULL),
(9, 'ivy@university.edu', 'Ivy Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ivy', 'organizer', NULL),
(10, 'jack@university.edu', 'Jack Wilson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jack', 'student', NULL),
(11, 'kate@university.edu', 'Kate Wilson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=kate', 'student', NULL),
(12, 'luke@university.edu', 'Luke Skywalker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=luke', 'student', NULL),
(13, 'mary@university.edu', 'Mary Jane', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mary', 'student', NULL),
(14, 'nick@university.edu', 'Nick Fury', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nick', 'student', NULL),
(15, 'olivia@university.edu', 'Olivia Pope', 'https://api.dicebear.com/7.x/avataaars/svg?seed=olivia', 'student', NULL),
(16, 'peter@university.edu', 'Peter Parker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=peter', 'student', NULL),
(17, 'quinn@university.edu', 'Quinn Fabray', 'https://api.dicebear.com/7.x/avataaars/svg?seed=quinn', 'student', NULL),
(18, 'rachel@university.edu', 'Rachel Green', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel', 'student', NULL),
    (19, 'admin@university.edu', 'System Administrator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (20, 'superadmin@university.edu', 'Super Administrator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin', 'super_admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert sample sessions
INSERT INTO sessions (id, title, description, category, start_time, end_time, capacity, location, created_by) VALUES
(1, 'Morning Yoga Session', 'Start your day with peaceful yoga and meditation', 'Fitness', '2024-01-15 07:00:00', '2024-01-15 08:00:00', 15, 'Gym Studio A', 1),
(2, 'Basketball Pickup Game', 'Casual basketball game for all skill levels', 'Sports', '2024-01-15 18:00:00', '2024-01-15 20:00:00', 10, 'Basketball Court', 2),
(3, 'Study Group - Calculus', 'Collaborative study session for Calculus II', 'Academic', '2024-01-16 14:00:00', '2024-01-16 16:00:00', 8, 'Library Room 201', 3),
(4, 'Cooking Workshop', 'Learn to make authentic Italian pasta', 'Cooking', '2024-01-16 19:00:00', '2024-01-16 21:00:00', 12, 'Campus Kitchen', 4),
(5, 'Photography Walk', 'Explore campus with your camera', 'Arts', '2024-01-17 16:00:00', '2024-01-17 18:00:00', 20, 'Meet at Main Gate', 5),
(6, 'Chess Tournament', 'Friendly chess competition', 'Games', '2024-01-17 19:00:00', '2024-01-17 22:00:00', 16, 'Student Center', 6),
(7, 'Book Club Discussion', 'Discuss "The Great Gatsby"', 'Literature', '2024-01-18 15:00:00', '2024-01-18 17:00:00', 10, 'Library Quiet Room', 7),
(8, 'Dance Workshop', 'Learn contemporary dance moves', 'Dance', '2024-01-18 20:00:00', '2024-01-18 22:00:00', 14, 'Dance Studio', 8),
(9, 'Coding Bootcamp', 'Build a web app in 3 hours', 'Technology', '2024-01-19 10:00:00', '2024-01-19 13:00:00', 25, 'Computer Lab 3', 9),
(10, 'Movie Night', 'Watch "Inception" with friends', 'Entertainment', '2024-01-19 19:30:00', '2024-01-19 22:00:00', 30, 'Student Theater', 10);

-- Insert sample reservations (some approved, some waitlisted)
INSERT INTO reservations (user_id, session_id, status) VALUES
-- Yoga session (7/15 approved, 3 waitlisted)
(1, 1, 'approved'), (2, 1, 'approved'), (3, 1, 'approved'), (4, 1, 'approved'),
(5, 1, 'approved'), (6, 1, 'approved'), (7, 1, 'approved'),
(8, 1, 'waitlisted'), (9, 1, 'waitlisted'), (10, 1, 'waitlisted'),

-- Basketball (8/10 approved, 2 waitlisted)
(2, 2, 'approved'), (3, 2, 'approved'), (4, 2, 'approved'), (5, 2, 'approved'),
(6, 2, 'approved'), (7, 2, 'approved'), (8, 2, 'approved'), (9, 2, 'approved'),
(10, 2, 'waitlisted'), (1, 2, 'waitlisted'),

-- Study Group (5/8 approved, 1 waitlisted)
(1, 3, 'approved'), (2, 3, 'approved'), (3, 3, 'approved'), (4, 3, 'approved'), (5, 3, 'approved'),
(6, 3, 'waitlisted'),

-- Cooking Workshop (10/12 approved, 2 waitlisted)
(1, 4, 'approved'), (2, 4, 'approved'), (3, 4, 'approved'), (4, 4, 'approved'), (5, 4, 'approved'),
(6, 4, 'approved'), (7, 4, 'approved'), (8, 4, 'approved'), (9, 4, 'approved'), (10, 4, 'approved'),
(11, 4, 'waitlisted'), (12, 4, 'waitlisted'),

-- Photography Walk (15/20 approved, 3 waitlisted)
(1, 5, 'approved'), (2, 5, 'approved'), (3, 5, 'approved'), (4, 5, 'approved'), (5, 5, 'approved'),
(6, 5, 'approved'), (7, 5, 'approved'), (8, 5, 'approved'), (9, 5, 'approved'), (10, 5, 'approved'),
(11, 5, 'approved'), (12, 5, 'approved'), (13, 5, 'approved'), (14, 5, 'approved'), (15, 5, 'approved'),
(16, 5, 'waitlisted'), (17, 5, 'waitlisted'), (18, 5, 'waitlisted');

-- Insert sample follows (social connections)
INSERT INTO follows (user_id, target_user_id) VALUES
(1, 2), (1, 3), (1, 4),
(2, 1), (2, 3), (2, 5),
(3, 1), (3, 2), (3, 6),
(4, 1), (4, 7), (4, 8),
(5, 2), (5, 9), (5, 10),
(6, 3), (6, 7),
(7, 4), (7, 6), (7, 8),
(8, 4), (8, 7), (8, 9),
(9, 5), (9, 8), (9, 10),
(10, 5), (10, 9);

-- Insert sample attendance records
INSERT INTO attendance (reservation_id, checkin_time, checkout_time) VALUES
(1, '2024-01-15 06:55:00', '2024-01-15 08:05:00'), -- Alice's yoga
(2, '2024-01-15 06:58:00', '2024-01-15 08:02:00'), -- Bob's yoga
(3, '2024-01-15 07:02:00', '2024-01-15 08:00:00'), -- Charlie's yoga
(11, '2024-01-15 17:45:00', '2024-01-15 20:10:00'), -- Bob's basketball
(12, '2024-01-15 17:50:00', '2024-01-15 20:05:00'), -- Charlie's basketball
(13, '2024-01-15 17:48:00', '2024-01-15 20:08:00'), -- Diana's basketball
(14, '2024-01-15 17:52:00', '2024-01-15 20:12:00'), -- Eve's basketball
(15, '2024-01-15 17:47:00', '2024-01-15 20:07:00'), -- Frank's basketball
(16, '2024-01-15 17:49:00', '2024-01-15 20:09:00'), -- Grace's basketball
(17, '2024-01-15 17:51:00', '2024-01-15 20:11:00'), -- Henry's basketball
(18, '2024-01-15 17:46:00', '2024-01-15 20:06:00'); -- Ivy's basketball

-- Explicit ids above don't advance Postgres's SERIAL sequences (unlike MySQL's
-- AUTO_INCREMENT, which does) - without this, the next default-id insert would
-- collide with an existing seed row.
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions));
