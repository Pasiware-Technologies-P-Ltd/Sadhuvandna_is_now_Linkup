import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { FFmpegKit, ReturnCode } from '@wokcito/ffmpeg-kit-react-native';

const memoryCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string | null>>();

/**
 * Robust helper to extract and cache video thumbnails for both local and remote videos.
 * - Uses in-memory Map cache
 * - Uses disk cache to avoid redundant network / extraction work
 * - For remote URLs, uses FFmpegKit stream-seeking to extract 1 frame without downloading whole video
 * - For local files, uses fast native VideoThumbnails
 */
export async function getVideoThumbnail(videoUri: string | null | undefined): Promise<string | null> {
    if (!videoUri) return null;

    // 1. Check in-memory cache
    if (memoryCache.has(videoUri)) {
        return memoryCache.get(videoUri)!;
    }

    // 2. Prevent duplicate concurrent extraction requests for the same URL
    if (pendingPromises.has(videoUri)) {
        return pendingPromises.get(videoUri)!;
    }

    const task = (async (): Promise<string | null> => {
        try {
            // Clean filename for persistent disk caching
            const rawFilename = videoUri.split('/').pop()?.split('?')[0] || 'video';
            const cleanName = rawFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
            const diskThumbPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}thumb_${cleanName}.jpg`;

            // Check if thumbnail already exists on disk
            try {
                const info = await FileSystem.getInfoAsync(diskThumbPath);
                if (info.exists && (info as any).size > 0) {
                    memoryCache.set(videoUri, diskThumbPath);
                    return diskThumbPath;
                }
            } catch (e) {}

            // For local files (e.g. file:// or content://), VideoThumbnails is fastest
            if (videoUri.startsWith('file://') || videoUri.startsWith('content://')) {
                try {
                    const result = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 200 });
                    if (result?.uri) {
                        memoryCache.set(videoUri, result.uri);
                        return result.uri;
                    }
                } catch (e) {}
            }

            // For remote URLs (https://...), FFmpegKit seeks only the first frame over HTTP stream
            try {
                const command = `-y -ss 00:00:00.100 -i "${videoUri}" -vframes 1 -q:v 2 "${diskThumbPath}"`;
                const session = await FFmpegKit.execute(command);
                const returnCode = await session.getReturnCode();
                if (ReturnCode.isSuccess(returnCode)) {
                    const check = await FileSystem.getInfoAsync(diskThumbPath);
                    if (check.exists && (check as any).size > 0) {
                        memoryCache.set(videoUri, diskThumbPath);
                        return diskThumbPath;
                    }
                }
            } catch (ffmpegErr) {
                // Fallback below
            }

            // Fallback: try VideoThumbnails with time 0
            try {
                const result = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0 });
                if (result?.uri) {
                    memoryCache.set(videoUri, result.uri);
                    return result.uri;
                }
            } catch (thumbErr) {
                // Silently ignore so console isn't spammed
            }
        } catch (err) {
            // Suppress unhandled exceptions
        } finally {
            pendingPromises.delete(videoUri);
        }

        return null;
    })();

    pendingPromises.set(videoUri, task);
    return task;
}
