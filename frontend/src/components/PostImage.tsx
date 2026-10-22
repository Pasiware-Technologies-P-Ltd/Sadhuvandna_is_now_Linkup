import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { ImageService } from '../services/ImageService';

const MIN_ASPECT = 9 / 16; // 0.5625 (Max height ratio limit: 9:16)

interface PostImageProps {
    uri: string;
    forcedAspect?: number;
    isDetail?: boolean;
    onAspectCalculated?: (aspect: number) => void;
}

const PostVideo: React.FC<{ uri: string }> = ({ uri }) => {
    const player = useVideoPlayer(uri, player => {
        player.loop = false;
    });

    return (
        <View style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#0F172A', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            {player && (
                <VideoView
                    key={uri || 'post_image_video'}
                    player={player}
                    allowsFullscreen
                    allowsPictureInPicture
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                    nativeControls={false}
                />
            )}
        </View>
    );
};

const PostImage: React.FC<PostImageProps> = ({ uri, forcedAspect, isDetail, onAspectCalculated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [aspect, setAspect] = useState<number>(forcedAspect ? (isDetail ? forcedAspect : Math.max(forcedAspect, MIN_ASPECT)) : 4 / 3);

    useEffect(() => {
        let isMounted = true;
        if (forcedAspect) {
            const finalAspect = isDetail ? forcedAspect : Math.max(forcedAspect, MIN_ASPECT);
            setAspect(finalAspect);
            return;
        }
        if (uri) {
            ImageService.getImageDimensions(uri)
                .then(({ aspectRatio }) => {
                    if (isMounted) {
                        const finalAspect = isDetail ? aspectRatio : Math.max(aspectRatio, MIN_ASPECT);
                        setAspect(finalAspect);
                        onAspectCalculated?.(finalAspect);
                    }
                })
                .catch(() => {
                    if (isMounted) setAspect(4 / 3);
                });
        }
        return () => { isMounted = false; };
    }, [uri, forcedAspect, isDetail]);

    if (!uri || error) {
        return (
            <View style={{ width: '100%', height: 200, backgroundColor: '#F1F5F9', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="image-outline" size={32} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 6, fontWeight: '500' }}>Image not available</Text>
            </View>
        );
    }

    const isVideo = uri.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i);

    if (isVideo) {
        return <PostVideo uri={uri} />;
    }

    const optimizedUri = isDetail ? ImageService.getDetailImageUrl(uri) : ImageService.getFeedImageUrl(uri);
    const cardAspect = isDetail ? aspect : Math.max(aspect, MIN_ASPECT);

    return (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            <Image
                source={{ uri: optimizedUri }}
                style={{ width: '100%', height: '100%', aspectRatio: cardAspect }}
                contentFit={isDetail ? "contain" : "cover"}
                transition={200}
                cachePolicy="memory-disk"
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />
            {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                    <ActivityIndicator color="#2563EB" size="small" />
                </View>
            )}
        </View>
    );
};

export default PostImage;
