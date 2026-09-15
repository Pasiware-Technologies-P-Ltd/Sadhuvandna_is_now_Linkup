import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface PostImageProps {
    uri: string;
    forcedAspect?: number;
}

const PostImage: React.FC<PostImageProps> = ({ uri, forcedAspect }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [aspect, setAspect] = useState<number>(forcedAspect || 4 / 3);

    useEffect(() => {
        if (forcedAspect) {
            setAspect(forcedAspect);
            return;
        }
        if (uri) {
            Image.getSize(uri, (w, h) => {
                setAspect(w / h);
            }, () => {
                setAspect(4 / 3);
            });
        }
    }, [uri]);

    if (!uri || error) {
        return (
            <View className="w-full h-64 bg-gray-100 rounded-xl justify-center items-center">
                <Text className="text-gray-400 text-xs">Image not available</Text>
            </View>
        );
    }

    const isVideo = uri.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i);

    if (isVideo) {
        return (
            <View className="w-full bg-black rounded-xl overflow-hidden relative" style={{ aspectRatio: 4 / 3 }}>
                <Video
                    source={{ uri }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    useNativeControls
                    style={{ width: '100%', height: '100%' }}
                    posterSource={{ uri: 'https://via.placeholder.com/300x200?text=Video' }}
                    usePoster
                />
            </View>
        );
    }

    return (
        <View className="w-full bg-gray-50 rounded-xl overflow-hidden relative">
            <Image
                source={{ uri }}
                style={{ width: '100%', aspectRatio: aspect }}
                resizeMode="cover"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
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
