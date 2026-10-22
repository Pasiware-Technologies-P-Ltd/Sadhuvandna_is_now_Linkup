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
    const isMountedRef = useRef(true);
    const [status, setStatus] = useState<any>({ isLoaded: false });

    const player = useVideoPlayer(uri, p => {
        try {
            p.loop = !!isLooping;
            p.muted = !!isMuted;
            if (shouldPlay) {
                p.play();
            }
        } catch (e) {}
    });

    useImperativeHandle(ref, () => ({
        playAsync: async () => {
            try { player?.play(); } catch (e) {}
        },
        pauseAsync: async () => {
            try { player?.pause(); } catch (e) {}
        },
        unloadAsync: async () => { },
        setPositionAsync: async (ms: number) => {
            try { if (player) player.currentTime = ms / 1000; } catch (e) {}
        },
        getStatusAsync: async () => status
    }));

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        try {
            if (shouldPlay) {
                player?.play();
            } else {
                player?.pause();
            }
        } catch (e) {}
    }, [shouldPlay, player]);

    useEffect(() => {
        try {
            if (player) player.muted = !!isMuted;
        } catch (e) {}
    }, [isMuted, player]);

    useEffect(() => {
        try {
            if (player) player.loop = !!isLooping;
        } catch (e) {}
    }, [isLooping, player]);

    const isLoadedRef = useRef(false);
    const onPlaybackStatusUpdateRef = useRef(onPlaybackStatusUpdate);
    
    useEffect(() => {
        onPlaybackStatusUpdateRef.current = onPlaybackStatusUpdate;
    }, [onPlaybackStatusUpdate]);

    useEffect(() => {
        if (onLoadStart) onLoadStart();
        
        let sub: any;
        try {
            sub = player.addListener('statusChange', (e) => {
                if (!isMountedRef.current) return;
                if (e.status === 'readyToPlay') {
                    isLoadedRef.current = true;
                    try {
                        const loadedStatus = {
                            isLoaded: true,
                            durationMillis: (player.duration || 0) * 1000,
                            positionMillis: (player.currentTime || 0) * 1000,
                            isBuffering: false,
                            isPlaying: player.playing
                        };
                        setStatus(loadedStatus);
                        if (onLoad) onLoad(loadedStatus);
                    } catch (err) {}
                } else if (e.status === 'error') {
                    if (onError) onError(e.error);
                }
            });
        } catch (err) {}
        
        const interval = setInterval(() => {
            if (isLoadedRef.current && isMountedRef.current) {
                try {
                    const currentStatus = {
                        isLoaded: true,
                        durationMillis: (player.duration || 0) * 1000,
                        positionMillis: (player.currentTime || 0) * 1000,
                        isBuffering: false,
                        isPlaying: player.playing
                    };
                    setStatus(currentStatus);
                    if (onPlaybackStatusUpdateRef.current) {
                        onPlaybackStatusUpdateRef.current(currentStatus);
                    }
                } catch (err) {
                    // Shared object already released, skip
                }
            }
        }, progressUpdateIntervalMillis || 250);

        return () => {
            try {
                if (sub) sub.remove();
            } catch (e) {}
            clearInterval(interval);
        };
    }, [player]);

    const showPoster = !status.isLoaded && usePoster && posterSource?.uri;

    return (
        <View style={[style, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
            {player && (
                <VideoView
                    key={uri || 'compat_video'}
                    player={player}
                    style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}
                    contentFit={resizeMode === ResizeMode.COVER ? 'cover' : 'contain'}
                    nativeControls={!!useNativeControls}
                />
            )}
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
