import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export const ResizeMode = {
    COVER: 'cover',
    CONTAIN: 'contain',
    STRETCH: 'stretch',
};

export const CompatVideoInner = React.forwardRef(({
    source,
    style,
    resizeMode,
    isLooping,
    shouldPlay,
    isMuted,
    usePoster,
    posterSource,
    posterStyle,
    onPlaybackStatusUpdate,
    progressUpdateIntervalMillis,
    onLoadStart,
    onLoad,
    onError,
    useNativeControls,
}: any, ref) => {
    let uri = source?.uri || null;
    if (uri && uri.startsWith('http') && !uri.includes('cb=')) {
        uri = uri + (uri.includes('?') ? '&cb=2' : '?cb=2');
    }
    const [status, setStatus] = useState<any>({ isLoaded: false });

    const player = useVideoPlayer(uri, player => {
        player.loop = !!isLooping;
        player.muted = !!isMuted;
        if (shouldPlay) {
            player.play();
        }
    });

    useImperativeHandle(ref, () => ({
        playAsync: async () => player.play(),
        pauseAsync: async () => player.pause(),
        unloadAsync: async () => { },
        setPositionAsync: async (ms: number) => { player.currentTime = ms / 1000; },
        getStatusAsync: async () => status
    }));

    useEffect(() => {
        if (shouldPlay) {
            player.play();
        } else {
            player.pause();
        }
    }, [shouldPlay, player]);

    useEffect(() => {
        player.muted = !!isMuted;
    }, [isMuted, player]);

    useEffect(() => {
        player.loop = !!isLooping;
    }, [isLooping, player]);

    useEffect(() => {
        if (onLoadStart) onLoadStart();
        
        const sub = player.addListener('statusChange', (e) => {
            if (e.status === 'readyToPlay') {
                if (shouldPlay) player.play();
                const loadedStatus = {
                    isLoaded: true,
                    durationMillis: player.duration * 1000,
                    positionMillis: player.currentTime * 1000,
                    isBuffering: false,
                    isPlaying: player.playing
                };
                setStatus(loadedStatus);
                if (onLoad) onLoad(loadedStatus);
            } else if (e.status === 'error') {
                if (onError) onError(e.error);
            }
        });
        
        const interval = setInterval(() => {
            if (status.isLoaded) {
                const currentStatus = {
                    ...status,
                    positionMillis: player.currentTime * 1000,
                    isPlaying: player.playing
                };
                setStatus(currentStatus);
                if (onPlaybackStatusUpdate) onPlaybackStatusUpdate(currentStatus);
            }
        }, progressUpdateIntervalMillis || 500);

        return () => {
            sub.remove();
            clearInterval(interval);
        };
    }, [player, shouldPlay]);

    const showPoster = !status.isLoaded && usePoster && posterSource?.uri;

    return (
        <View style={[style, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
            <VideoView
                player={player}
                style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}
                contentFit={resizeMode === ResizeMode.COVER ? 'cover' : 'contain'}
                nativeControls={!!useNativeControls}
            />
            {showPoster && (
                <Image 
                    source={{ uri: posterSource.uri }} 
                    style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style, posterStyle]} 
                />
            )}
            {!status.isLoaded && (
                <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            )}
        </View>
    );
});

export const CompatVideo = React.forwardRef((props: any, ref) => {
    return <CompatVideoInner {...props} ref={ref} />;
});
