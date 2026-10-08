import { Image as RNImage } from 'react-native';
import { initDB } from './database';

export class ImageService {
    /**
     * Get an optimized URL for the feed/list view.
     * Currently, no CDN is configured, so this acts as an abstraction layer ready for the future.
     */
    static getFeedImageUrl(originalUrl: string, targetWidth: number = 600): string {
        if (!originalUrl) return '';
        if (!originalUrl.startsWith('http') || originalUrl.includes('192.168.') || originalUrl.includes('localhost')) {
            return originalUrl;
        }
        return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&w=${targetWidth}&output=webp&we`;
    }

    /**
     * Get an optimized URL for the detail/full-screen view.
     */
    static getDetailImageUrl(originalUrl: string, targetWidth: number = 1200): string {
        if (!originalUrl) return '';
        if (!originalUrl.startsWith('http') || originalUrl.includes('192.168.') || originalUrl.includes('localhost')) {
            return originalUrl;
        }
        return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&w=${targetWidth}&output=webp&we`;
    }

    /**
     * Get image dimensions, preferring local SQLite cache to save API/network time.
     */
    static async getImageDimensions(url: string): Promise<{ width: number, height: number, aspectRatio: number }> {
        try {
            const db = await initDB();
            const row: any = await db.getFirstAsync('SELECT width, height, aspect_ratio FROM image_metadata WHERE url = ?', [url]);
            if (row && row.width && row.height) {
                return { width: row.width, height: row.height, aspectRatio: row.aspect_ratio || (row.width / row.height) };
            }
        } catch (e) {
            console.warn('[ImageService] SQLite cache read error', e);
        }

        return new Promise((resolve, reject) => {
            RNImage.getSize(
                url,
                async (width, height) => {
                    const aspectRatio = width / height;
                    try {
                        const db = await initDB();
                        await db.runAsync(
                            'INSERT OR REPLACE INTO image_metadata (url, width, height, aspect_ratio, cached_at) VALUES (?, ?, ?, ?, ?)',
                            [url, width, height, aspectRatio, Date.now()]
                        );
                    } catch (e) {
                        console.warn('[ImageService] SQLite cache write error', e);
                    }
                    resolve({ width, height, aspectRatio });
                },
                (error) => reject(error)
            );
        });
    }
}
