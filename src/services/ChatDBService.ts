import { getDBConnection } from './database';

export const ChatDBService = {
  // Insert or update a conversation in local DB
  saveConversation: async (conv: any, userId: string) => {
    const db = await getDBConnection();
    const partnerId = conv.partner_id || conv.id;
    const isGroup = conv.isGroup ? 1 : 0;
    const uniqueChatId = isGroup ? `group_${partnerId}` : `user_${partnerId}`;

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        chat_id TEXT PRIMARY KEY,
        partner_id TEXT,
        is_group INTEGER,
        full_name TEXT,
        profile_photo TEXT,
        last_message TEXT,
        unread_count INTEGER,
        time TEXT,
        my_user_id TEXT
      );
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        client_message_id TEXT PRIMARY KEY,
        server_id TEXT,
        chat_id TEXT,
        sender_id TEXT,
        message TEXT,
        file TEXT,
        file_type TEXT,
        is_mine INTEGER,
        is_deleted INTEGER,
        seen INTEGER,
        created_at TEXT,
        status TEXT
      );
    `);

    await db.runAsync(`
      INSERT OR REPLACE INTO chat_conversations 
      (chat_id, partner_id, is_group, full_name, profile_photo, last_message, unread_count, time, my_user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uniqueChatId,
      partnerId,
      isGroup,
      conv.full_name || conv.name,
      conv.profile_photo || conv.photo || '',
      conv.last_message || '',
      conv.unread || 0,
      conv.time || '',
      userId
    ]);
  },

  getConversations: async (userId: string) => {
    const db = await getDBConnection();
    try {
      return await db.getAllAsync(`SELECT * FROM chat_conversations WHERE my_user_id = ? ORDER BY time DESC`, [userId]);
    } catch {
      return [];
    }
  },

  saveMessages: async (chatId: string, messages: any[]) => {
    const db = await getDBConnection();
    for (const m of messages) {
      const cid = m.client_message_id || `temp_${m.id}`;
      await db.runAsync(`
        INSERT OR REPLACE INTO chat_messages 
        (client_message_id, server_id, chat_id, sender_id, message, file, file_type, is_mine, is_deleted, seen, created_at, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cid,
        String(m.id),
        chatId,
        String(m.sender_id),
        m.message || '',
        m.file || '',
        m.file_type || '',
        m.is_mine ? 1 : 0,
        m.is_deleted ? 1 : 0,
        m.seen || 0,
        m.created_at || new Date().toISOString(),
        m.isOptimistic ? 'pending' : 'sent'
      ]);
    }
    
    // Enforce 30 messages limit per chat
    await db.runAsync(`
      DELETE FROM chat_messages 
      WHERE chat_id = ? AND client_message_id NOT IN (
        SELECT client_message_id FROM chat_messages 
        WHERE chat_id = ? 
        ORDER BY created_at DESC 
        LIMIT 30
      )
    `, [chatId, chatId]);
  },

  getMessages: async (chatId: string, limit = 50, offset = 0) => {
    const db = await getDBConnection();
    try {
      return await db.getAllAsync(`
        SELECT * FROM chat_messages 
        WHERE chat_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);
    } catch {
      return [];
    }
  },

  updateMessageStatus: async (clientMsgId: string, updates: any) => {
    const db = await getDBConnection();
    const setKeys = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    
    await db.runAsync(`
      UPDATE chat_messages 
      SET ${setKeys} 
      WHERE client_message_id = ?
    `, [...values, clientMsgId]);
  },
  
  markAllAsSeen: async (chatId: string) => {
    const db = await getDBConnection();
    await db.runAsync(`
      UPDATE chat_messages 
      SET seen = 1 
      WHERE chat_id = ? AND is_mine = 1 AND seen = 0
    `, [chatId]);
  }
};
