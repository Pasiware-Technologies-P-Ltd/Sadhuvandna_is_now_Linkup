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

    const isLoadedRef = useRef(false);
    const onPlaybackStatusUpdateRef = useRef(onPlaybackStatusUpdate);
    
    useEffect(() => {
        onPlaybackStatusUpdateRef.current = onPlaybackStatusUpdate;
    }, [onPlaybackStatusUpdate]);

    useEffect(() => {
        if (onLoadStart) onLoadStart();
        
        const sub = player.addListener('statusChange', (e) => {
            if (e.status === 'readyToPlay') {
                isLoadedRef.current = true;
                // We shouldn't use shouldPlay from the closure here because it's not a dependency, 
                // but the player itself handles initial play. To force it we can just play if it's supposed to.
                // Actually, since shouldPlay is in a separate useEffect, it handles it.
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
            if (isLoadedRef.current) {
                const currentStatus = {
                    isLoaded: true,
                    durationMillis: player.duration * 1000,
                    positionMillis: player.currentTime * 1000,
                    isBuffering: false,
                    isPlaying: player.playing
                };
                setStatus(currentStatus);
                if (onPlaybackStatusUpdateRef.current) {
                    onPlaybackStatusUpdateRef.current(currentStatus);
                }
            }
        }, progressUpdateIntervalMillis || 250);

        return () => {
            sub.remove();
            clearInterval(interval);
        };
    }, [player]);

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
