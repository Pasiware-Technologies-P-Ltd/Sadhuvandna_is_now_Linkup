import { getDBConnection } from './database';

export const NotificationDBService = {
  initDB: async () => {
    const db = await getDBConnection();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        body TEXT,
        type TEXT,
        data TEXT,
        unread_count INTEGER,
        created_at TEXT,
        image TEXT,
        sender_id TEXT,
        platform TEXT
      );
    `);
  },
  
  saveNotifications: async (notifications: any[], userId: string) => {
    const db = await getDBConnection();
    await NotificationDBService.initDB();
    
    // Save new notifications
    for (const n of notifications) {
      await db.runAsync(`
        INSERT OR REPLACE INTO notifications 
        (id, user_id, title, body, type, data, unread_count, created_at, image, sender_id, platform)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        n.id,
        userId,
        n.title || '',
        n.body || '',
        n.type || '',
        JSON.stringify(n.data || {}),
        n.unread_count || 0,
        n.date || n.created_at,
        n.image || '',
        n.sender_id || 0,
        n.platform || ''
      ]);
    }
    
    // Keep only the latest 15 notifications for this user
    await db.runAsync(`
      DELETE FROM notifications 
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 15
      )
    `, [userId, userId]);
  },
  
  getNotifications: async (userId: string, limit = 15) => {
    const db = await getDBConnection();
    await NotificationDBService.initDB();
    const result = await db.getAllAsync(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]);
    
    return result.map((r: any) => ({
      ...r,
      data: r.data ? JSON.parse(r.data) : null,
      date: r.created_at
    }));
  }
};
