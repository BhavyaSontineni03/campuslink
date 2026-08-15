import { Request, Response, NextFunction } from 'express';

export const validateReservationRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { user_id, session_id } = req.body;
  
  if (!user_id || !session_id) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'user_id and session_id are required'
    });
    return;
  }
  
  if (typeof user_id !== 'number' || typeof session_id !== 'number') {
    res.status(400).json({
      success: false,
      error: 'Invalid data types',
      message: 'user_id and session_id must be numbers'
    });
    return;
  }
  
  if (user_id <= 0 || session_id <= 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid IDs',
      message: 'user_id and session_id must be positive numbers'
    });
    return;
  }
  
  next();
};

export const validateCheckinRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { reservation_id } = req.body;
  
  if (!reservation_id) {
    res.status(400).json({
      success: false,
      error: 'Missing reservation_id',
      message: 'reservation_id is required'
    });
    return;
  }
  
  if (typeof reservation_id !== 'number' || reservation_id <= 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid reservation_id',
      message: 'reservation_id must be a positive number'
    });
    return;
  }
  
  next();
};

export const validateSessionRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { title, category, start_time, end_time, capacity, created_by } = req.body;
  
  if (!title || !category || !start_time || !end_time || !capacity || !created_by) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'title, category, start_time, end_time, capacity, and created_by are required'
    });
    return;
  }
  
  if (typeof capacity !== 'number' || capacity <= 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid capacity',
      message: 'capacity must be a positive number'
    });
    return;
  }
  
  const startTime = new Date(start_time);
  const endTime = new Date(end_time);
  
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    res.status(400).json({
      success: false,
      error: 'Invalid date format',
      message: 'start_time and end_time must be valid dates'
    });
    return;
  }
  
  if (startTime >= endTime) {
    res.status(400).json({
      success: false,
      error: 'Invalid time range',
      message: 'start_time must be before end_time'
    });
    return;
  }
  
  next();
};

export const validateUserRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { email, name } = req.body;
  
  if (!email || !name) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'email and name are required'
    });
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      error: 'Invalid email format',
      message: 'Please provide a valid email address'
    });
    return;
  }
  
  if (name.trim().length < 2) {
    res.status(400).json({
      success: false,
      error: 'Invalid name',
      message: 'Name must be at least 2 characters long'
    });
    return;
  }
  
  next();
};
