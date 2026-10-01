import * as SQLite from 'expo-sqlite';

const dbName = 'linkup.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDBConnection = async () => {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;
  
  dbPromise = SQLite.openDatabaseAsync(dbName);
  dbInstance = await dbPromise;
  return dbInstance;
};

let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const initDB = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await getDBConnection();

    // Enable WAL mode for better performance
    await db.execAsync('PRAGMA journal_mode = WAL;');

    // Create necessary tables here (we will add more as per module)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT,
        username TEXT,
        profile_picture TEXT,
        bio TEXT,
        last_synced INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS Feed (
        id INTEGER PRIMARY KEY NOT NULL,
        post_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        content TEXT,
        media_url TEXT,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TEXT,
        last_synced INTEGER
      );

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

      CREATE TABLE IF NOT EXISTS image_metadata (
        url TEXT PRIMARY KEY,
        width INTEGER,
        height INTEGER,
        aspect_ratio REAL,
        cached_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS media_cache (
        url TEXT PRIMARY KEY,
        local_uri TEXT,
        media_type TEXT,
        cached_at INTEGER,
        size INTEGER
      );
    `);

    console.log('Database and tables initialized successfully');
      return db;
    } catch (error) {
      initPromise = null; // allow retry
      console.error('Error initializing database:', error);
      throw error;
    }
  })();

  return initPromise;
};
