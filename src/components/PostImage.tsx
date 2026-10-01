import React, { useState, useEffect } from 'react';
import { Image as RNImage, View, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ImageService } from '../services/ImageService';

interface PostImageProps {
    uri: string;
    forcedAspect?: number;
}

const PostVideo: React.FC<{ uri: string }> = ({ uri }) => {
    const player = useVideoPlayer(uri, player => {
        player.loop = false;
    });

    return (
        <View className="w-full bg-black rounded-xl overflow-hidden relative" style={{ aspectRatio: 4 / 3 }}>
            <VideoView
                player={player}
                allowsFullscreen
                allowsPictureInPicture
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls={false}
            />
        </View>
    );
};

const PostImage: React.FC<PostImageProps> = ({ uri, forcedAspect }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [aspect, setAspect] = useState<number>(forcedAspect || 4 / 3);

    useEffect(() => {
        let isMounted = true;
        if (forcedAspect) {
            setAspect(forcedAspect);
            return;
        }
        if (uri) {
            ImageService.getImageDimensions(uri)
                .then(({ aspectRatio }) => {
                    if (isMounted) setAspect(aspectRatio);
                })
                .catch(() => {
                    if (isMounted) setAspect(4 / 3);
                });
        }
        return () => { isMounted = false; };
    }, [uri, forcedAspect]);

    if (!uri || error) {
        return (
            <View className="w-full h-64 bg-gray-100 rounded-xl justify-center items-center">
                <Text className="text-gray-400 text-xs">Image not available</Text>
            </View>
        );
    }

    const isVideo = uri.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i);

    if (isVideo) {
        return <PostVideo uri={uri} />;
    }

    // Use the abstraction for feed-optimized URLs (ready for CDN integration)
    const optimizedUri = ImageService.getFeedImageUrl(uri);

    return (
        <View className="w-full bg-gray-50 rounded-xl overflow-hidden relative">
            <Image
                source={{ uri: optimizedUri }}
                style={{ width: '100%', aspectRatio: aspect }}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />
            {loading && (
                <View className="absolute inset-0 justify-center items-center bg-gray-100">
                    <ActivityIndicator color="#ea580c" size="small" />
                </View>
            )}
        </View>
    );
};

export default PostImage;
