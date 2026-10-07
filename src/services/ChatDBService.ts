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
        last_message_is_mine INTEGER DEFAULT 0,
        last_message_seen INTEGER DEFAULT 0,
        unread_count INTEGER,
        time TEXT,
        timestamp_val TEXT,
        my_user_id TEXT,
        platform TEXT DEFAULT 'community'
      );
    `);
    
    try {
      await db.execAsync(`ALTER TABLE chat_conversations ADD COLUMN last_message_is_mine INTEGER DEFAULT 0;`);
    } catch (e) {}
    try {
      await db.execAsync(`ALTER TABLE chat_conversations ADD COLUMN last_message_seen INTEGER DEFAULT 0;`);
    } catch (e) {}
    try {
      await db.execAsync(`ALTER TABLE chat_conversations ADD COLUMN timestamp_val TEXT;`);
    } catch (e) {}
    try {
      await db.execAsync(`ALTER TABLE chat_conversations ADD COLUMN platform TEXT DEFAULT 'community';`);
    } catch (e) {}

    await db.execAsync(`
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
      (chat_id, partner_id, is_group, full_name, profile_photo, last_message, last_message_is_mine, last_message_seen, unread_count, time, timestamp_val, my_user_id, platform) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uniqueChatId,
      partnerId,
      isGroup,
      conv.full_name || conv.name,
      conv.profile_photo || conv.photo || '',
      conv.last_message || '',
      conv.last_message_is_mine ? 1 : 0,
      conv.last_message_seen ? 1 : 0,
      conv.unread || 0,
      conv.time || '',
      conv.timestamp || '',
      userId,
      conv.platform || 'community'
    ]);
  },

  getConversations: async (userId: string, platform: string = 'community') => {
    const db = await getDBConnection();
    try {
      return await db.getAllAsync(`SELECT * FROM chat_conversations WHERE my_user_id = ? AND platform = ? ORDER BY timestamp_val DESC`, [userId, platform]);
    } catch {
      return [];
    }
  },

  resetConversationUnreadCount: async (chatId: string) => { const db = await getDBConnection(); try { await db.runAsync(`UPDATE chat_conversations SET unread_count = 0 WHERE chat_id = ?`, [chatId]); } catch (e) {} }, updateConversationLastMessage: async (chatId: string, lastMessage: string, time: string, incrementUnread: boolean, isMine: boolean = false, seen: boolean = false, timestampVal: string = "") => { const db = await getDBConnection(); try { const ts = timestampVal || new Date().toISOString().replace("T", " ").substring(0, 19); if (incrementUnread) { await db.runAsync(`UPDATE chat_conversations SET last_message = ?, time = ?, timestamp_val = ?, unread_count = unread_count + 1, last_message_is_mine = ?, last_message_seen = ? WHERE chat_id = ?`, [lastMessage, time, ts, isMine ? 1 : 0, seen ? 1 : 0, chatId]); } else { await db.runAsync(`UPDATE chat_conversations SET last_message = ?, time = ?, timestamp_val = ?, last_message_is_mine = ?, last_message_seen = ? WHERE chat_id = ?`, [lastMessage, time, ts, isMine ? 1 : 0, seen ? 1 : 0, chatId]); } } catch (e) {
      console.log('Error updating conversation', e);
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
        m.id ? String(m.id) : null,
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
    `, [...values, clientMsgId] as any[]);
  },
  
  markAllAsSeen: async (chatId: string) => {
    const db = await getDBConnection();
    await db.runAsync(`
      UPDATE chat_messages 
      SET seen = 1 
      WHERE chat_id = ? AND is_mine = 1 AND seen = 0
    `, [chatId]);
    await db.runAsync(`
      UPDATE chat_conversations
      SET last_message_seen = 1
      WHERE chat_id = ?
    `, [chatId]);
  },
  
  deleteMessage: async (msgIdOrClientId: string) => {
    const db = await getDBConnection();
    await db.runAsync(`
      UPDATE chat_messages 
      SET is_deleted = 1, message = '🚫 This message was deleted', file = '', file_type = '' 
      WHERE server_id = ? OR client_message_id = ?
    `, [msgIdOrClientId, msgIdOrClientId]);
  }
};





