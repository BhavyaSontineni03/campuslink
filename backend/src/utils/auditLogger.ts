import pool from '../config/database';
import { Request } from 'express';

export interface AuditLogEntry {
  adminId: number;
  action: string;
  targetUserId?: number;
  oldValue?: string;
  newValue?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async logAction(
    req: Request,
    entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
  ): Promise<void> {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_id, action, target_user_id, old_value, new_value, details, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.adminId,
          entry.action,
          entry.targetUserId || null,
          entry.oldValue || null,
          entry.newValue || null,
          entry.details || null,
          ipAddress,
          userAgent
        ]
      );
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw error - audit logging failure shouldn't break the main operation
    }
  }

  static async getAuditLogs(
    limit: number = 50,
    offset: number = 0,
    adminId?: number,
    action?: string
  ): Promise<any[]> {
    let query = `
      SELECT 
        aal.*,
        u.name as admin_name,
        u.email as admin_email,
        tu.name as target_user_name,
        tu.email as target_user_email
      FROM admin_audit_log aal
      LEFT JOIN users u ON aal.admin_id = u.id
      LEFT JOIN users tu ON aal.target_user_id = tu.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (adminId) {
      params.push(adminId);
      query += ` AND aal.admin_id = $${params.length}`;
    }
    
    if (action) {
      params.push(action);
      query += ` AND aal.action = $${params.length}`;
    }
    
    params.push(limit, offset);
    query += ` ORDER BY aal.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    
    const { rows } = await pool.query(query, params);
    return rows as any[];
  }

  static async getAuditLogCount(adminId?: number, action?: string): Promise<number> {
    let query = 'SELECT COUNT(*)::int as count FROM admin_audit_log WHERE 1=1';
    const params: any[] = [];
    
    if (adminId) {
      params.push(adminId);
      query += ` AND admin_id = $${params.length}`;
    }
    
    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }
    
    const { rows } = await pool.query(query, params);
    return rows[0].count;
  }
}
