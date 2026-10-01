import * as FileSystem from 'expo-file-system/legacy';
import { initDB } from './database';

export class MediaCacheService {
    /**
     * Quickly checks if a media file is cached locally without initiating a download.
     */
    static async checkCacheOnly(url: string): Promise<string | null> {
        if (!url || !url.startsWith('http')) return null;
        try {
            const db = await initDB();
            const row: any = await db.getFirstAsync('SELECT local_uri FROM media_cache WHERE url = ?', [url]);
            if (row && row.local_uri) {
                const fileInfo = await FileSystem.getInfoAsync(row.local_uri);
                if (fileInfo.exists) return row.local_uri;
            }
        } catch (e) { }
        return null;
    }

    /**
     * Get local cached media URI for a given remote URL.
     * If it exists in cache and on disk, returns the local URI (`file://...`).
     * Otherwise, downloads the file, caches it, and returns the local URI.
     */
    static async getCachedMedia(url: string, type: 'video' | 'image' = 'image'): Promise<string> {
        if (!url || !url.startsWith('http')) return url;

        try {
            const db = await initDB();
            
            // 1. Check SQLite for existing cache
            const row: any = await db.getFirstAsync('SELECT local_uri FROM media_cache WHERE url = ?', [url]);
            
            if (row && row.local_uri) {
                console.log(`[MediaCache] cache lookup source: SQLite`);
                // 2. Verify file still exists on disk
                const fileInfo = await FileSystem.getInfoAsync(row.local_uri);
                if (fileInfo.exists) {
                    console.log(`[MediaCache] cache HIT with remote URL ${url} + local file URI ${row.local_uri}`);
                    return row.local_uri;
                } else {
                    console.log(`[MediaCache] file missing on disk (filesystem lookup failed)`);
                    // Cache is stale, file deleted by OS
                    await db.runAsync('DELETE FROM media_cache WHERE url = ?', [url]);
                }
            }

            console.log(`[MediaCache] cache MISS before download for ${url}`);

            // 3. File not in cache or deleted, so download it
            const ext = url.split('.').pop()?.split('?')[0] || (type === 'video' ? 'mp4' : 'jpg');
            const filename = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const fileUri = FileSystem.cacheDirectory + filename;

            const downloadedFile = await FileSystem.downloadAsync(url, fileUri);

            if (downloadedFile.status === 200) {
                console.log(`[MediaCache] download completed with local file URI ${fileUri}`);
                // 4. Save to SQLite
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                const size = fileInfo.exists ? fileInfo.size : 0;
                
                await db.runAsync(
                    'INSERT OR REPLACE INTO media_cache (url, local_uri, media_type, cached_at, size) VALUES (?, ?, ?, ?, ?)',
                    [url, fileUri, type, Date.now(), size]
                );

                return fileUri;
            }

            // If download failed, return original URL as fallback
            return url;
            
        } catch (e) {
            console.warn('[MediaCacheService] Error caching media:', e);
            // Fallback to original URL on error
            return url;
        }
    }

    /**
     * Cleans up old cache files (e.g., older than 24 hours) to prevent disk space issues.
     */
    static async cleanupOldCache(hours: number = 24) {
        try {
            const db = await initDB();
            const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
            
            const rows: any[] = await db.getAllAsync('SELECT url, local_uri FROM media_cache WHERE cached_at < ?', [cutoffTime]);
            
            for (const row of rows) {
                try {
                    await FileSystem.deleteAsync(row.local_uri, { idempotent: true });
                } catch (e) {
                    console.warn(`[MediaCacheService] Failed to delete file ${row.local_uri}`, e);
                }
                await db.runAsync('DELETE FROM media_cache WHERE url = ?', [row.url]);
            }
            if (rows.length > 0) {
                console.log(`[MediaCacheService] Cleaned up ${rows.length} expired cache files.`);
            }
        } catch (e) {
            console.error('[MediaCacheService] Error during cache cleanup:', e);
        }
    }
}
