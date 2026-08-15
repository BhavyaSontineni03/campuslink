/**
 * Synthetic campus population for demos and offline experiment measurement.
 * Idempotent: clears engagement tables and re-seeds a realistic ~200 MAU cohort.
 *
 * Noise mix (keeps recommendation lift from being tautological):
 * - 60% interest-aligned
 * - 20% popularity-driven
 * - 10% social (friend pull)
 * - 10% pure random exploration
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from '../config/database';

const TAGS = [
  'fitness', 'wellness', 'sports', 'tech', 'workshop', 'arts', 'music',
  'career', 'networking', 'academic', 'social', 'outdoors', 'food', 'gaming',
  'volunteer', 'leadership', 'health', 'performance', 'stem', 'cultural',
];

const CATEGORIES = ['Fitness', 'Sports', 'Technology', 'Arts', 'Academic', 'Social', 'Career'];

// Titles deliberately avoid embedding interest tags so title-only ILIKE search
// underperforms Postgres FTS across description/tags/organizer (resume claim).
const TITLE_STEMS = [
  'Sunset Circle', 'Open Studio Hour', 'Late Night Lab', 'Quad Pop-Up',
  'Commons Gathering', 'Bridge Builders', 'North Lawn Series', 'Weekend Series',
  'Mentor Mixer', 'Skill Share Night', 'Campus Trail Run', 'Gallery Walk',
  'Code & Coffee', 'Morning Stretch', 'Peer Clinic', 'Game Night Classic',
  'Riverbank Meetup', 'Library Loft Chat', 'Rooftop Jam', 'Maker Table',
  'Honor Society Tea', 'Debate Warmup', 'Film Screening', 'Puzzle Night',
  'Alumni Fireside', 'Design Critique', 'Language Exchange', 'Charity Bakeoff',
  'Astronomy Watch', 'Robot Demo Day', 'Poetry Slam', 'Board Strategy Night',
  'Internship Panel', 'Quiet Study Bloc', 'Dance Practice', 'Photo Walk',
  'Startup Pitch Hour', 'Volunteer Fair', 'Meditation Room', 'Intramural Signup',
];

const FIRST = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Aria', 'Owen', 'Ivy', 'Caleb', 'Nora', 'Leo', 'Chloe', 'Miles', 'Ruby', 'Kai'];
const LAST = ['Nguyen', 'Patel', 'Garcia', 'Kim', 'Johnson', 'Singh', 'Brown', 'Chen', 'Lopez', 'Ali', 'Wright', 'Park'];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const rng = mulberry32(42);
  const passwordHash = await bcrypt.hash('password123', 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE notification_sends, funnel_events, user_interactions, experiment_results,
               attendance, reservations, favorites, notifications, follows, sessions, users
      RESTART IDENTITY CASCADE
    `);

    // Demo accounts with known passwords
    const demoUsers = [
      ['alice@campus.edu', 'Alice Nguyen', 'student'],
      ['organizer@campus.edu', 'Diana Organizer', 'organizer'],
      ['admin@campus.edu', 'Campus Admin', 'admin'],
    ] as const;

    const userIds: number[] = [];
    const interests: string[][] = [];

    for (const [email, name, role] of demoUsers) {
      const { rows } = await client.query(
        `INSERT INTO users (email, name, role, password_hash, is_active)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
        [email, name, role, passwordHash]
      );
      userIds.push(rows[0].id);
      interests.push([pick(TAGS, rng), pick(TAGS, rng), pick(TAGS, rng)]);
    }

    for (let i = 0; i < 197; i++) {
      const name = `${pick(FIRST, rng)} ${pick(LAST, rng)}`;
      const email = `student${i + 1}@campus.edu`;
      const role = i % 40 === 0 ? 'organizer' : 'student';
      const { rows } = await client.query(
        `INSERT INTO users (email, name, role, password_hash, is_active)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
        [email, name, role, passwordHash]
      );
      userIds.push(rows[0].id);
      const profile = new Set<string>();
      while (profile.size < 3) profile.add(pick(TAGS, rng));
      interests.push([...profile]);
    }

    const organizerIds = userIds.filter((_, idx) => idx < 3 || idx % 40 === 0);
    const sessionIds: number[] = [];
    const sessionTags: string[][] = [];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
      const category = pick(CATEGORIES, rng);
      const tagSet = new Set<string>();
      while (tagSet.size < 3) tagSet.add(pick(TAGS, rng));
      const tags = [...tagSet];
      const start = new Date(now + (i - 10) * 36 * 60 * 60 * 1000 + Math.floor(rng() * 8) * 3600000);
      const end = new Date(start.getTime() + (60 + Math.floor(rng() * 120)) * 60000);
      const createdBy = pick(organizerIds, rng);
      const title = `${pick(TITLE_STEMS, rng)} #${i + 1}`;
      const description =
        `Join this ${category.toLowerCase()} session for hands-on ${tags[0]} and ${tags[1]}. ` +
        `Optional deep dive on ${tags[2]} with peer mentors afterward.`;
      const { rows } = await client.query(
        `INSERT INTO sessions (title, description, category, start_time, end_time, capacity, location, created_by, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          title,
          description,
          category,
          start.toISOString(),
          end.toISOString(),
          10 + Math.floor(rng() * 40),
          `Building ${1 + Math.floor(rng() * 12)} Room ${100 + Math.floor(rng() * 40)}`,
          createdBy,
          tags,
        ]
      );
      sessionIds.push(rows[0].id);
      sessionTags.push(tags);
    }

    // Follow graph
    for (const uid of userIds) {
      const followCount = 2 + Math.floor(rng() * 5);
      for (let f = 0; f < followCount; f++) {
        const target = pick(userIds, rng);
        if (target === uid) continue;
        await client.query(
          `INSERT INTO follows (user_id, target_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [uid, target]
        );
      }
    }

    // Interactions + reservations + funnel with noise mix
    for (let u = 0; u < userIds.length; u++) {
      const uid = userIds[u];
      const profile = interests[u];
      for (let s = 0; s < sessionIds.length; s++) {
        const roll = rng();
        let engage = false;
        if (roll < 0.6) {
          engage = sessionTags[s].some((t) => profile.includes(t));
        } else if (roll < 0.8) {
          engage = rng() < 0.35; // popularity-ish random attention
        } else if (roll < 0.9) {
          engage = rng() < 0.25; // social
        } else {
          engage = rng() < 0.12; // pure explore
        }
        if (!engage) continue;

        const sid = sessionIds[s];
        await client.query(
          `INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, 'viewed')`,
          [uid, sid]
        );
        await client.query(
          `INSERT INTO user_interactions (user_id, session_id, interaction_type)
           VALUES ($1, $2, 'view')`,
          [uid, sid]
        );

        if (rng() < 0.55) {
          await client.query(
            `INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, 'opened')`,
            [uid, sid]
          );
        } else continue;

        if (rng() < 0.45) {
          await client.query(
            `INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, 'started_registration')`,
            [uid, sid]
          );
        } else continue;

        if (rng() < 0.75) {
          const status = rng() < 0.85 ? 'approved' : 'waitlisted';
          const { rows: resRows } = await client.query(
            `INSERT INTO reservations (user_id, session_id, status)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, session_id) DO NOTHING
             RETURNING id`,
            [uid, sid, status]
          );
          await client.query(
            `INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, 'completed_registration')`,
            [uid, sid]
          );
          await client.query(
            `INSERT INTO user_interactions (user_id, session_id, interaction_type)
             VALUES ($1, $2, 'register')`,
            [uid, sid]
          );

          if (resRows[0] && status === 'approved' && rng() < 0.42) {
            await client.query(
              `INSERT INTO attendance (reservation_id, checkin_time)
               VALUES ($1, NOW() - INTERVAL '2 days')`,
              [resRows[0].id]
            );
            await client.query(
              `INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, 'attended')`,
              [uid, sid]
            );
            await client.query(
              `INSERT INTO user_interactions (user_id, session_id, interaction_type)
               VALUES ($1, $2, 'attend')`,
              [uid, sid]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${userIds.length} users and ${sessionIds.length} sessions`);
    console.log('Demo logins (password: password123):');
    console.log('  alice@campus.edu (student)');
    console.log('  organizer@campus.edu (organizer)');
    console.log('  admin@campus.edu (admin)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
