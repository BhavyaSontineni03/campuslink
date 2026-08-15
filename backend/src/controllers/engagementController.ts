import { Request, Response, NextFunction } from 'express';
import { getRecommendedFeed } from '../services/recommendationService';
import { searchSessions } from '../services/search';
import { recordInteraction } from '../services/interactionService';
import { logFunnelEvent, getFunnelAnalytics } from '../services/funnelService';
import { getBanditSnapshot, reconcileBanditRewards, scheduleReminder } from '../services/banditService';
import { FUNNEL_STAGES } from '../services/funnel';
import { FunnelStage } from '../types';

export class EngagementController {
  static async recommendedFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const sessions = await getRecommendedFeed(userId);
      res.json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = String(req.query.q || '');
      const userId = (req as any).userId;
      const sessions = await searchSessions(q, { userId });
      res.json({ success: true, data: sessions, query: q });
    } catch (error) {
      next(error);
    }
  }

  static async createInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { session_id, interaction_type } = req.body;
      if (!session_id || !['view', 'favorite', 'register', 'attend'].includes(interaction_type)) {
        res.status(400).json({ success: false, error: 'Invalid interaction payload' });
        return;
      }
      await recordInteraction(userId, Number(session_id), interaction_type);
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async createFunnelEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { session_id, stage } = req.body;
      if (!session_id || !FUNNEL_STAGES.includes(stage as FunnelStage)) {
        res.status(400).json({ success: false, error: 'Invalid funnel payload' });
        return;
      }
      await logFunnelEvent(Number(session_id), stage as FunnelStage, userId);
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async funnelAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = Number(req.query.days || 30);
      const analysis = await getFunnelAnalytics({ windowDays: days });
      const biggest = analysis.biggestDropOff;
      res.json({
        success: true,
        data: {
          stages: analysis.stages.map((s) => ({
            stage: s.stage,
            count: s.count,
            conversion_from_previous: s.conversionFromPrevious,
          })),
          biggest_dropoff: biggest
            ? {
                from: biggest.fromStage,
                to: biggest.toStage,
                drop_pct: Number((biggest.dropOffRate * 100).toFixed(2)),
              }
            : null,
          reminder_timing_is_top_lever:
            !!biggest &&
            biggest.fromStage === 'completed_registration' &&
            biggest.toStage === 'attended',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async banditAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reconcileBanditRewards();
      const data = await getBanditSnapshot();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async scheduleTestReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { session_id, channel } = req.body;
      const send = await scheduleReminder(
        userId,
        Number(session_id),
        channel || 'in_app_push'
      );
      res.status(201).json({ success: true, data: send });
    } catch (error) {
      next(error);
    }
  }
}
