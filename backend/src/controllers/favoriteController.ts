import { Request, Response } from 'express';
import { FavoriteModel } from '../models/Favorite';

export class FavoriteController {
  // Add session to favorites
  static async addToFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(userId) || isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or session ID'
        });
        return;
      }

      // Check if already favorited
      const isAlreadyFavorited = await FavoriteModel.isFavorited(userId, sessionId);
      if (isAlreadyFavorited) {
        res.status(409).json({
          success: false,
          error: 'Session already in favorites'
        });
        return;
      }

      const favorite = await FavoriteModel.addToFavorites(userId, sessionId);

      res.status(201).json({
        success: true,
        data: favorite,
        message: 'Session added to favorites'
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add to favorites',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Remove session from favorites
  static async removeFromFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(userId) || isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or session ID'
        });
        return;
      }

      const removed = await FavoriteModel.removeFromFavorites(userId, sessionId);
      
      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'Session not found in favorites'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Session removed from favorites'
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove from favorites',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Toggle favorite status
  static async toggleFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(userId) || isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or session ID'
        });
        return;
      }

      const isFavorited = await FavoriteModel.isFavorited(userId, sessionId);
      
      if (isFavorited) {
        await FavoriteModel.removeFromFavorites(userId, sessionId);
        res.json({
          success: true,
          data: { isFavorited: false },
          message: 'Session removed from favorites'
        });
      } else {
        const favorite = await FavoriteModel.addToFavorites(userId, sessionId);
        res.json({
          success: true,
          data: { isFavorited: true, favorite },
          message: 'Session added to favorites'
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle favorite',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's favorites
  static async getUserFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
        return;
      }

      const favorites = await FavoriteModel.getByUserId(userId);

      res.json({
        success: true,
        data: favorites
      });
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch favorites',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check if session is favorited
  static async checkFavoriteStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const sessionId = parseInt(req.params.sessionId);

      if (isNaN(userId) || isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or session ID'
        });
        return;
      }

      const isFavorited = await FavoriteModel.isFavorited(userId, sessionId);
      const favoriteCount = await FavoriteModel.getFavoriteCount(sessionId);

      res.json({
        success: true,
        data: {
          isFavorited,
          favoriteCount
        }
      });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check favorite status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
