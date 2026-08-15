import pool from '../config/database';
import { InteractionType } from '../types';
import { invalidateUserRecommendations } from './recommendationService';

// Records one implicit-feedback signal (view/favorite/register/attend) and
// invalidates the user's cached recommendation ranking, since their taste
// vector is now stale. This is the single write path recommendation.ts's
// buildUserVector ultimately reads back from via user_interactions.
export async function recordInteraction(
  userId: number,
  sessionId: number,
  interactionType: InteractionType
): Promise<void> {
  await pool.query(
    `INSERT INTO user_interactions (user_id, session_id, interaction_type)
     VALUES ($1, $2, $3)`,
    [userId, sessionId, interactionType]
  );

  await invalidateUserRecommendations(userId);
}
