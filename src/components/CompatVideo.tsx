import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { View, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export const ResizeMode = {
    COVER: 'cover',
    CONTAIN: 'contain',
    STRETCH: 'stretch',
};

export const CompatVideo = React.forwardRef(({
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
    const uri = source?.uri || null;
    const [status, setStatus] = useState<any>({ isLoaded: false });

    const player = useVideoPlayer(uri, player => {
        player.loop = !!isLooping;
        player.muted = !!isMuted;
    });

    useImperativeHandle(ref, () => ({
        playAsync: async () => player.play(),
        pauseAsync: async () => player.pause(),
        unloadAsync: async () => { },
        setPositionAsync: async (ms: number) => { player.currentTime = ms / 1000; },
        getStatusAsync: async () => status
    }));

    useEffect(() => {
        if (shouldPlay) player.play();
        else player.pause();
    }, [shouldPlay]);

    useEffect(() => {
        player.muted = !!isMuted;
    }, [isMuted]);

    useEffect(() => {
        player.loop = !!isLooping;
    }, [isLooping]);

    useEffect(() => {
        if (onLoadStart) onLoadStart();
        
        const sub = player.addListener('statusChange', (e) => {
            if (e.status === 'readyToPlay') {
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
    }, [player]);

    // Handle poster
    if (!status.isLoaded && usePoster && posterSource?.uri) {
        return <Image source={{ uri: posterSource.uri }} style={[style, posterStyle]} />;
    }

    return (
        <VideoView
            player={player}
            style={style}
            contentFit={resizeMode === ResizeMode.COVER ? 'cover' : 'contain'}
            nativeControls={!!useNativeControls}
        />
    );
});
