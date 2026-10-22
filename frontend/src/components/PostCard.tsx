import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, Share, Linking, Animated, Easing, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import PostImage from './PostImage';
import ImageViewer from 'react-native-image-zoom-viewer';
import { ImageService } from '../services/ImageService';
import { WEBSITE_URL, API_BASE_URL } from '../services/api';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import Slider from '@react-native-community/slider';
import { FFmpegKit, ReturnCode } from '@wokcito/ffmpeg-kit-react-native';
import { Asset } from 'expo-asset';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import YoutubeIframe from 'react-native-youtube-iframe';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logoBase64 } from '../constants/logoBase64';
import { getVideoThumbnail } from '../utils/thumbnailHelper';
import { useTheme } from '../context/ThemeContext';

const FILTERS: any = {
    'none': { color: 'transparent' },
    'cinematic': { color: 'rgba(50, 20, 0, 0.15)' },
    'bw_grain': { color: 'rgba(0,0,0,0.4)', grain: true },
    'cyberpunk': { dualTone: ['rgba(255,0,255,0.15)', 'rgba(0,255,255,0.1)'] },
    'sunset': { color: 'rgba(255, 69, 0, 0.15)' },
    'cool_night': { color: 'rgba(0, 0, 139, 0.1)', dualTone: ['rgba(0,0,50,0.2)', 'rgba(0,100,255,0.05)'] },
    'retro_sepia': { color: 'rgba(112, 66, 20, 0.25)', grain: true },
};

const VignetteOverlay = () => null;

const FilmGrain = () => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.03)' }]} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { opacity: 0.1, backgroundColor: '#000' }]} />
    </View>
);

const FilterOverlay = ({ filterId }: { filterId: string }) => {
    const filter = FILTERS[filterId] || FILTERS['none'];
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.color || 'transparent' }]} />
            {filter.dualTone && (
                <>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.dualTone[0], opacity: 0.5 }]} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.dualTone[1], opacity: 0.3 }]} />
                </>
            )}
            {filter.vignette && <VignetteOverlay />}
            {filter.grain && <FilmGrain />}
        </View>
    );
};

// Define a type for Post data
export interface PostType {
    id: string;
    user: {
        id: string;
        name: string;
        avatar: string;
        location?: string;
    };
    content: string;
    image?: string;
    video?: string;
    media?: string[];
    likes: number;
    comments: number;
    timeAgo: string;
    isLiked?: boolean;
    isSaved?: boolean;
    user_saved?: boolean;
    is_saved?: boolean;
    link?: string;
    image_width?: number;
    image_height?: number;
}

const { width } = Dimensions.get('window');
const cardWidth = width - 24;
const POST_MEDIA_PATH = `${WEBSITE_URL}/uploads/posts/`;

const videoStyles = StyleSheet.create({
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    playButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
});

const VideoItem = ({ uri, shouldPlay, isActive, forwardedRef, isMuted, poster, aspectRatio, isDetail }: any) => {
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [thumbUri, setThumbUri] = useState<string | null>(poster || null);
    const isSliding = useRef(false);

    useEffect(() => {
        let isMounted = true;
        if (poster) {
            setThumbUri(poster);
            return;
        }
        if (uri) {
            getVideoThumbnail(uri).then((thumb) => {
                if (isMounted && thumb) {
                    setThumbUri(thumb);
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [uri, poster]);

    const formatTime = (millis: number) => {
        const totalSeconds = Math.round(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const isMounted = useRef(true);
    const showVideo = isActive !== undefined ? isActive : shouldPlay;

    const player = useVideoPlayer(uri, p => {
        try {
            p.loop = true;
            p.muted = isMuted;
        } catch (e) {}
    });

    React.useImperativeHandle(forwardedRef, () => ({
        playAsync: async () => {
            try { player.play(); } catch (e) {}
        },
        pauseAsync: async () => {
            try { player.pause(); } catch (e) {}
        },
        unloadAsync: async () => { },
        setPositionAsync: async (ms: number) => {
            try { player.currentTime = ms / 1000; } catch (e) {}
        }
    }));

    useEffect(() => {
        try {
            player.muted = isMuted;
        } catch (e) {}
    }, [isMuted, player]);

    useEffect(() => {
        isMounted.current = true;
        try {
            if (shouldPlay) {
                player.play();
            } else {
                player.pause();
            }
        } catch (e) {}
        return () => {
            isMounted.current = false;
        };
    }, [shouldPlay, player]);

    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<any>(null);

    const handleRetry = useCallback(() => {
        if (!isMounted.current) return;
        setError(null);
        setIsBuffering(true);
        setIsVideoReady(false);
        try {
            if (player) {
                if (typeof (player as any).replace === 'function' && uri) {
                    (player as any).replace(uri);
                }
                player.currentTime = 0;
                player.play();
            }
        } catch (e) {}
    }, [player, uri]);

    useEffect(() => {
        let sub: any;
        let sub2: any;
        try {
            sub = player.addListener('statusChange', (status) => {
                if (!isMounted.current) return;
                if (status.status === 'readyToPlay') {
                    retryCountRef.current = 0;
                    setError(null);
                    setIsBuffering(false);
                    setIsVideoReady(true);
                    try {
                        setDuration((player.duration || 0) * 1000);
                    } catch (e) {}
                } else if (status.status === 'error') {
                    setIsBuffering(false);
                    if (retryCountRef.current < 2 && isMounted.current) {
                        retryCountRef.current += 1;
                        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                        retryTimerRef.current = setTimeout(() => {
                            if (isMounted.current) {
                                handleRetry();
                            }
                        }, 1800);
                    } else {
                        setError("retry");
                    }
                }
            });
            sub2 = player.addListener('playingChange', (isPlaying) => {
                if (!isMounted.current) return;
                setIsBuffering(false);
                if (isPlaying) {
                    retryCountRef.current = 0;
                    setError(null);
                    setIsVideoReady(true);
                }
            });
        } catch (e) {}

        const interval = setInterval(() => {
            if (isMounted.current && !isSliding.current) {
                try {
                    if (player && typeof player.currentTime === 'number') {
                        setPosition(player.currentTime * 1000);
                    }
                } catch (e) {}
            }
        }, 500);

        return () => {
            try {
                if (sub) sub.remove();
                if (sub2) sub2.remove();
            } catch (e) {}
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            clearInterval(interval);
        };
    }, [player, handleRetry]);

    const videoAspect = isDetail ? (aspectRatio || 16 / 9) : (aspectRatio ? Math.max(aspectRatio, 9 / 16) : 9 / 16);
    return (
        <View style={{ width: '100%', aspectRatio: videoAspect, backgroundColor: '#0f172a', overflow: 'hidden' }}>
            {showVideo && player && (
                <VideoView
                    key={uri || 'post_video'}
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit={isDetail ? "contain" : "cover"}
                    nativeControls={false}
                />
            )}
            {(!showVideo || !isVideoReady || !!error) && (
                <View style={StyleSheet.absoluteFill}>
                    {thumbUri ? (
                        <Image
                            source={{ uri: thumbUri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator color="#3B82F6" size="small" />
                        </View>
                    )}
                    {!shouldPlay && !error && thumbUri && (
                        <View style={videoStyles.playOverlay}>
                            <View style={videoStyles.playButton}>
                                <Ionicons name="play" size={26} color="#ffffff" style={{ marginLeft: 3 }} />
                            </View>
                        </View>
                    )}
                </View>
            )}
            {isBuffering && !error && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                    <ActivityIndicator color="white" size="large" />
                </View>
            )}
            {error && (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleRetry}
                    style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }]}
                >
                    <View style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}>
                        <Ionicons name="reload" size={24} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
            )}
            {duration > 0 && (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: !shouldPlay ? 'rgba(0,0,0,0.3)' : 'transparent', paddingTop: !shouldPlay ? 10 : 0 }}>
                    <Slider
                        style={{ width: '100%', height: 20 }}
                        minimumValue={0}
                        maximumValue={duration}
                        value={position}
                        minimumTrackTintColor="#2563EB"
                        maximumTrackTintColor="rgba(255,255,255,0.5)"
                        thumbTintColor="#2563EB"
                        onSlidingStart={() => {
                            isSliding.current = true;
                        }}
                        onValueChange={(val) => {
                            setPosition(val);
                        }}
                        onSlidingComplete={(val) => {
                            isSliding.current = false;
                            if (forwardedRef?.current) forwardedRef.current.setPositionAsync(val);
                        }}
                    />
                    {!shouldPlay && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: -5, paddingBottom: 10 }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>{formatTime(position)}</Text>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>{formatTime(duration)}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const NativeAudioItem = ({ url, startTime, duration, shouldPlay, postId, isMuted, onReady }: any) => {
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.setStatusAsync({ volume: isMuted ? 0 : 1.0 });
        }
    }, [isMuted]);

    useEffect(() => {
        const loadSound = async () => {
            try {
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                }
                const formattedUrl = url?.startsWith('http')
                    ? url
                    : (url ? `${WEBSITE_URL}/${url.replace(/^\/+/, '')}` : '');

                if (!formattedUrl) {
                    setIsLoaded(true);
                    if (onReady) onReady(true);
                    return;
                }

                const { sound } = await Audio.Sound.createAsync(
                    { uri: formattedUrl },
                    {
                        shouldPlay: false, // Don't play until loaded
                        positionMillis: (startTime || 0) * 1000,
                        isLooping: false,
                        volume: isMuted ? 0 : 1.0
                    }
                );
                soundRef.current = sound;
                setIsLoaded(true);
                if (onReady) onReady(true);

                sound.setOnPlaybackStatusUpdate((status: any) => {
                    if (status.isLoaded && status.isPlaying) {
                        const current = status.positionMillis / 1000;
                        const end = (startTime || 0) + (duration || 30);
                        if (current >= end - 0.2) {
                            sound.setPositionAsync((startTime || 0) * 1000);
                        }
                    }
                });
            } catch (e: any) {
                console.warn(`[NativeAudio] Audio unavailable for post ${postId}:`, e?.message || e);
                // Don't block video if audio fails
                setIsLoaded(true);
                if (onReady) onReady(true);
            }
        };

        if (url) {
            if (onReady) onReady(false);
            loadSound();
        }

        return () => {
            if (soundRef.current) {
                const s = soundRef.current;
                soundRef.current = null;
                // Avoid async chain on unmount to prevent 'wrong thread' errors
                if (s) {
                    s.unloadAsync().catch(() => { });
                }
            }
        };
    }, [url, startTime, duration]);

    useEffect(() => {
        if (isLoaded && soundRef.current) {
            if (shouldPlay) {
                soundRef.current.playAsync().catch(() => { });
            } else {
                soundRef.current.pauseAsync().catch(() => { });
            }
        }
    }, [shouldPlay, isLoaded]);

    return null;
};

const REPORT_CATEGORIES = [
    'Child Safety Concern',
    'Sexual/Exploitative Content',
    'Harassment/Abuse',
    'Nudity/Sexual Content',
    'Violence',
    'Other'
];

export const MuteManager = {
    isGlobalMuted: true,
    listeners: new Set<Function>(),
    toggle: () => {
        MuteManager.isGlobalMuted = !MuteManager.isGlobalMuted;
        MuteManager.listeners.forEach(l => l(MuteManager.isGlobalMuted));
    },
    subscribe: (listener: Function) => {
        MuteManager.listeners.add(listener);
        return () => MuteManager.listeners.delete(listener);
    }
};


const BasePostCard = ({
    post,
    onUserPress,
    currentUserId,
    onDeletePress,
    shouldPlay = false,
    isDetail = false,
    renderMedia
}: {
    post: PostType,
    onUserPress?: () => void,
    currentUserId?: string,
    onDeletePress?: () => void,
    shouldPlay?: boolean,
    isDetail?: boolean,
    renderMedia?: (props: any) => React.ReactNode
}) => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { isDarkMode, theme } = useTheme();
    const [liked, setLiked] = useState(Boolean(post.isLiked || (post as any).user_liked));
    const [likeCount, setLikeCount] = useState(post.likes);
    // Track self-initiated like/unlike so we skip the next socket sync (avoid double-count)
    const skipNextLikeSync = useRef(false);
    const [saved, setSaved] = useState(Boolean(post.isSaved || (post as any).user_saved || (post as any).is_saved));
    const [videoReady, setVideoReady] = useState(false);
    const [musicMuted, setMusicMuted] = useState(MuteManager.isGlobalMuted);

    useEffect(() => {
        const unsubscribe = MuteManager.subscribe(setMusicMuted);
        return () => {
            unsubscribe();
        };
    }, []);
    const [paused, setPaused] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        setLiked(Boolean(post.isLiked || (post as any).user_liked));
    }, [post.isLiked, (post as any).user_liked]);

    useEffect(() => {
        // If this update was triggered by our own like action, skip it (PostCard already did optimistic update)
        if (skipNextLikeSync.current) {
            skipNextLikeSync.current = false;
            return;
        }
        // For all other updates (from other screens, other users), accept server count
        setLikeCount(Number(post.likes || 0));
    }, [post.likes]);

    useEffect(() => {
        setSaved(Boolean(post.isSaved || (post as any).user_saved || (post as any).is_saved));
    }, [post.isSaved, (post as any).user_saved, (post as any).is_saved]);

    const saveScale = useRef(new Animated.Value(1)).current;

    const toggleSave = async () => {
        const nextSaved = !saved;
        setSaved(nextSaved);

        Animated.sequence([
            Animated.spring(saveScale, { toValue: 1.35, useNativeDriver: true }),
            Animated.spring(saveScale, { toValue: 1, useNativeDriver: true }),
        ]).start();

        try {
            const u = await AsyncStorage.getItem('user');
            const uid = currentUserId || (u ? JSON.parse(u).id : null);
            if (!uid) return;

            // Sync with local AsyncStorage for fast offline retrieval
            const stored = await AsyncStorage.getItem('saved_post_ids');
            let ids: string[] = stored ? JSON.parse(stored) : [];
            if (nextSaved) {
                if (!ids.includes(String(post.id))) ids.push(String(post.id));
            } else {
                ids = ids.filter(id => id !== String(post.id));
            }
            await AsyncStorage.setItem('saved_post_ids', JSON.stringify(ids));

            await api.post('like_comment_action.php', {
                action: 'save',
                id: post.id,
                user_id: uid
            });
        } catch (e) {
            console.log("Toggle save error", e);
        }
    };
    const [soundReady, setSoundReady] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [reportCategory, setReportCategory] = useState('Child Safety Concern');
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const submitReport = async () => {
        if (!reportReason.trim()) {
            Alert.alert("Reason Required", "Please enter a reason for reporting this post.");
            return;
        }

        setReporting(true);
        try {
            const payload = {
                id: post.id,
                user_id: currentUserId || '',
                action: 'report',
                reason: reportReason.trim()
            };
            const response = await api.post('like_comment_action.php', payload);
            if (response.data && response.data.ok) {
                Alert.alert("Post Reported", "Thank you for reporting. We will review this post shortly.");
                setReportModalVisible(false);
                setReportReason('');
            } else {
                Alert.alert("Error", response.data?.message || "Failed to submit report. Please try again.");
            }
        } catch (e) {
            console.error("Report failed", e);
            Alert.alert("Error", "A network error occurred. Please try again.");
        } finally {
            setReporting(false);
        }
    };

    const likeScale = useRef(new Animated.Value(1)).current;
    const videoRef = useRef<any>(null);
    const webViewRef = useRef<WebView>(null);
    const musicData = React.useMemo(() => {
        try {
            if (post.link) {
                if (typeof post.link === 'object') return post.link;
                if (typeof post.link === 'string' && post.link.startsWith('{')) return JSON.parse(post.link);
            }
        } catch (e) { }
        return null;
    }, [post.link]);

    const MIN_MEDIA_ASPECT = isDetail ? undefined : 9 / 16; // Capped to 9:16 in feed, full height in detail
    const rawAspectRatio = musicData?.aspectRatio ? Number(musicData.aspectRatio) : (post.image_width && post.image_height ? post.image_width / post.image_height : undefined);
    const postAspectRatio = rawAspectRatio ? (MIN_MEDIA_ASPECT ? Math.max(rawAspectRatio, MIN_MEDIA_ASPECT) : rawAspectRatio) : undefined;
    const hasMusic = !!(musicData && (musicData.type === 'youtube_music' || musicData.type === 'custom_music'));

    // Combine local shouldPlay with screen focus
    // Fix: Only wait for soundReady if the post actually has music
    const actualShouldPlay = !!(shouldPlay && isFocused && !paused && (!hasMusic || soundReady));
    const audioShouldPlay = !!(!paused); // Allow music even if video jitters slightly

    const shouldMountAudio = !!(shouldPlay && isFocused);

    const rotation = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (actualShouldPlay && !musicMuted) {
            rotateAnim.current = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            rotateAnim.current.start();
        } else {
            if (rotateAnim.current) {
                rotateAnim.current.stop();
            }
            rotation.setValue(0);
        }
        return () => rotateAnim.current?.stop();
    }, [actualShouldPlay, musicMuted]);

    const rotateData = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    useEffect(() => {
        if (post.link && webViewRef.current) {
            const cmd = `if(window.setPlaybackStatus) window.setPlaybackStatus(${audioShouldPlay});`;
            webViewRef.current.injectJavaScript(cmd);
        }
    }, [audioShouldPlay]);

    const toggleLike = async () => {
        const newStatus = !liked;
        setLiked(newStatus);
        // Mark that we are self-initiating — skip next socket sync to avoid double-count
        skipNextLikeSync.current = true;
        setLikeCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));

        if (newStatus) {
            likeScale.setValue(0.7);
            Animated.spring(likeScale, {
                toValue: 1.25,
                friction: 3,
                tension: 45,
                useNativeDriver: true,
            }).start(() => {
                Animated.spring(likeScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 30,
                    useNativeDriver: true,
                }).start();
            });
        } else {
            likeScale.setValue(1.15);
            Animated.spring(likeScale, {
                toValue: 1,
                friction: 4,
                tension: 30,
                useNativeDriver: true,
            }).start();
        }

        try {
            const payload = {
                id: post.id,
                user_id: currentUserId || '',
                action: 'like'
            };
            await api.post('like_comment_action.php', payload);
        } catch (e) {
            console.error("Like failed", e);
            setLiked(!newStatus);
            setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleShare = async () => {
        try {
            if (mediaList && mediaList.length > 0 && isVideo(mediaList[0])) {
                // If it's a video, process and share the video file directly
                return handleDownloadPost();
            }
            const postUrl = `${WEBSITE_URL}/view_post.php?id=${post.id}`;
            const message = `Check out this post by ${post.user.name} on Sadhu Vandana:\n\n"${post.content?.substring(0, 150)}${post.content && post.content.length > 150 ? '...' : ''}"\n\nOpen in App: ${postUrl}`;
            await Share.share({ message, url: postUrl });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handlePostPress = () => {
        if (isDetail) return;
        try {
            if (navigation && navigation.navigate) {
                navigation.navigate('PostDetail', { post: { ...post, isSaved: saved, isLiked: liked, likes: likeCount } });
                return;
            }
        } catch (e) {}
        // @ts-ignore
        navigationRef.navigate('PostDetail', { post: { ...post, isSaved: saved, isLiked: liked, likes: likeCount } });
    };

    // Prepare media list
    let mediaList: string[] = [];
    if (post.media && post.media.length > 0) {
        mediaList = post.media.map(file => file.startsWith('http') ? file : `${POST_MEDIA_PATH}${file}`);
    } else if (post.image) {
        mediaList = [post.image.startsWith('http') ? post.image : `${POST_MEDIA_PATH}${post.image}`];
    }

    const isVideo = (uri: string) => {
        if (!uri) return false;
        const lower = uri.toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.3gp') || lower.endsWith('.mkv') || lower.endsWith('.webm');
    };

    const handleDownloadPost = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            if (!mediaList || mediaList.length === 0) {
                Alert.alert("No Media", "This post doesn't have an image or video to download.");
                setIsDownloading(false);
                return;
            }

            const uri = mediaList[0];
            const isVid = isVideo(uri);
            const filename = uri.split('/').pop() || (isVid ? 'download.mp4' : 'download.jpg');
            const fileUri = FileSystem.documentDirectory + filename;

            // Simple non-blocking loading toast
            if (require('react-native').Platform.OS === 'android') {
                require('react-native').ToastAndroid.show("Preparing video...", require('react-native').ToastAndroid.SHORT);
            }

            const downloadedFile = await FileSystem.downloadAsync(uri, fileUri);

            if (downloadedFile.status === 200) {
                let finalUri = downloadedFile.uri;

                if (isVid) {
                    try {
                        const outUri = FileSystem.documentDirectory + 'watermarked_' + filename;
                        const logoPath = FileSystem.documentDirectory + 'watermark_logo_v3.png';
                        const username = post.user?.name || 'User';
                        const safeUsername = username.replace(/'/g, "").replace(/:/g, ""); // strip quotes and colons for ffmpeg safety
                        const textPath = FileSystem.documentDirectory + 'watermark_text_' + safeUsername + '.png';

                        // Ensure logo exists (using new filename to bypass corrupt cached file)
                        const logoInfo = await FileSystem.getInfoAsync(logoPath);
                        if (!logoInfo.exists) {
                            try {
                                await FileSystem.writeAsStringAsync(logoPath, logoBase64, { encoding: FileSystem.EncodingType.Base64 });
                            } catch (e) {
                                console.error("Could not write local logo asset:", e);
                            }
                        }

                        // Download the username text image
                        try {
                            const encodedText = encodeURIComponent('@' + safeUsername);
                            const textUrl = `https://placehold.co/400x100/transparent/white.png?text=${encodedText}&font=roboto`;
                            await FileSystem.downloadAsync(textUrl, textPath);
                        } catch (e) {
                            console.error("Could not load text image:", e);
                        }

                        let command = '';
                        if (isVid) {
                            // Command to overlay logo and text with Instagram-like corner swapping animation (same row, transparent logo background)
                            // Reduced size for PostCards: logo 30px, text 125px
                            command = `-y -i "${downloadedFile.uri}" -i "${logoPath}" -i "${textPath}" -filter_complex "[1:v]format=rgba,colorkey=white:0.05:0.1,colorchannelmixer=aa=0.85,scale=30:-1[logo];[2:v]format=rgba,colorchannelmixer=aa=0.85,scale=125:-1[txt];[0:v][logo]overlay=x='if(lt(mod(t,6),3),15,W-175)':y='if(lt(mod(t,6),3),15,H-40)'[v1];[v1][txt]overlay=x='if(lt(mod(t,6),3),50,W-140)':y='if(lt(mod(t,6),3),15,H-40)'" -c:a copy "${outUri}"`;
                        } else {
                            // Static overlay for images (bottom right)
                            command = `-y -i "${downloadedFile.uri}" -i "${logoPath}" -i "${textPath}" -filter_complex "[1:v]format=rgba,colorkey=white:0.05:0.1,colorchannelmixer=aa=0.85,scale=30:-1[logo];[2:v]format=rgba,colorchannelmixer=aa=0.85,scale=125:-1[txt];[0:v][logo]overlay=W-175:H-40[v1];[v1][txt]overlay=W-140:H-40" "${outUri}"`;
                        }

                        const session = await FFmpegKit.execute(command);
                        const returnCode = await session.getReturnCode();

                        if (ReturnCode.isSuccess(returnCode)) {
                            finalUri = outUri;
                        } else {
                            console.warn("FFmpeg failed, falling back to original video");
                            const logs = await session.getLogsAsString();
                            console.error("FFmpeg Error Logs:", logs);
                        }
                    } catch (err) {
                        console.error("FFmpeg execution error", err);
                    }
                }

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(finalUri, {
                        dialogTitle: 'Save or Share Post Media',
                    });
                } else {
                    Alert.alert("Success", "File downloaded, but sharing/saving is not available on this device.");
                }
            } else {
                Alert.alert("Error", "Failed to download media.");
            }
        } catch (error) {
            console.error("Download Error", error);
            Alert.alert("Error", "An error occurred while downloading.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOptions = () => {
        if (!currentUserId) return;
        setOptionsModalVisible(true);
    };

    const renderContent = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = urlRegex.exec(text)) !== null) {
            const url = match[0];
            const index = match.index;
            if (index > lastIndex) {
                parts.push(
                    <Text key={`text-${lastIndex}`} style={{ color: '#172554' }}>
                        {text.substring(lastIndex, index)}
                    </Text>
                );
            }
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            parts.push(
                <Text
                    key={`link-${index}`}
                    style={{ color: '#2563eb', textDecorationLine: 'underline' }}
                    onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(fullUrl).catch(err =>
                            Alert.alert('Error', 'Could not open link')
                        );
                    }}
                >
                    {url}
                </Text>
            );
            lastIndex = index + url.length;
        }
        if (lastIndex < text.length) {
            parts.push(
                <Text key={`text-${lastIndex}`} style={{ color: '#172554' }}>
                    {text.substring(lastIndex)}
                </Text>
            );
        }
        return (
            <Text style={{ fontSize: 16, lineHeight: 20, marginBottom: 8 }}>
                {parts.length > 0 ? parts : text}
            </Text>
        );
    };

    return (
        <View style={[styles.cardContainer, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <TouchableOpacity style={styles.header} onPress={() => onUserPress && onUserPress()} activeOpacity={0.7}>
                {post.user.avatar && !post.user.avatar.includes('placeholder.com') ? (
                    <Image
                        source={{ uri: post.user.avatar }}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#DBEAFE' }]}>
                        <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 16 }}>
                            {post.user.name ? post.user.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.userName, isDarkMode && { color: theme.text }]}>{post.user.name}</Text>
                        <Ionicons name="checkmark-circle" size={15} color="#1877F2" style={{ marginLeft: 4 }} />
                        {(post.user as any).is_business == 1 && (
                            <View style={{ backgroundColor: isDarkMode ? '#1E293B' : '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                                <Ionicons name="briefcase" size={10} color="#2563eb" />
                                <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: 'bold' }}>
                                    {(post.user as any).category || 'Business'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {post.user.location ? (
                            <>
                                <Text style={[styles.timeAgo, isDarkMode && { color: theme.textMuted }]} numberOfLines={1}>{post.user.location}</Text>
                                <Text style={[styles.dotSeparator, isDarkMode && { color: theme.textMuted }]}>·</Text>
                            </>
                        ) : null}
                        <Text style={[styles.timeAgo, isDarkMode && { color: theme.textMuted }]}>{post.timeAgo}</Text>
                        <Text style={[styles.dotSeparator, isDarkMode && { color: theme.textMuted }]}>·</Text>
                        <Ionicons name="globe-outline" size={12} color={isDarkMode ? theme.textMuted : "#64748B"} />
                    </View>
                </View>
                <TouchableOpacity style={styles.optionsButton} onPress={handleOptions}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={isDarkMode ? theme.textMuted : "#64748B"} />
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Content Body */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={!isDetail ? handlePostPress : undefined}
                disabled={isDetail}
                style={styles.contentBody}
            >
                {post.content ? (
                    <View style={{ marginBottom: 8 }}>
                        {(() => {
                            const shouldTruncate = post.content.length > 100 || (post.content.match(/\n/g) || []).length > 2;
                            return (
                                <>
                                    <Text
                                        style={[styles.contentText, { lineHeight: 22 }, isDarkMode && { color: theme.text }]}
                                        numberOfLines={!isExpanded && shouldTruncate ? 3 : undefined}
                                        textBreakStrategy="highQuality"
                                        android_hyphenationFrequency="normal"
                                    >
                                        {renderContent(post.content)}
                                    </Text>
                                    {shouldTruncate && (
                                        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                                            <Text style={{ color: isDarkMode ? theme.primary : '#64748B', marginTop: 4, fontWeight: '500' }}>
                                                {isExpanded ? 'view less' : 'view more'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            );
                        })()}
                    </View>
                ) : null}

                {/* Music Info Overlay & Audio Engine */}
                {(() => {
                    const music = musicData;
                    if (music && (music.type === 'youtube_music' || music.type === 'custom_music')) {
                        return (
                            <>
                                <View style={[styles.musicOverlay, isDarkMode && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                                    <Animated.View style={[styles.musicIconContainer, { transform: [{ rotate: rotateData }] }]}>
                                        <Ionicons name="disc-outline" size={20} color="white" />
                                    </Animated.View>
                                    <View style={styles.musicTextContainer}>
                                        <Text style={[styles.playingFromText, isDarkMode && { color: '#93C5FD' }]}>{music.type === 'custom_music' ? 'Audio Original' : 'Official Audio'}</Text>
                                        <Text style={[styles.musicTitleText, isDarkMode && { color: theme.text }]} numberOfLines={1}>
                                            {music.title} • {music.artist}
                                        </Text>
                                    </View>
                                    <View style={[styles.liveBadge, isDarkMode && { backgroundColor: '#0F172A', borderColor: '#334155' }]}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>PLAYING</Text>
                                    </View>
                                </View>

                                {shouldMountAudio && music.type === 'custom_music' && (
                                    <NativeAudioItem
                                        url={music.music_url}
                                        startTime={music.startTime}
                                        duration={music.duration}
                                        shouldPlay={audioShouldPlay}
                                        postId={post.id}
                                        isMuted={musicMuted}
                                        onReady={setSoundReady}
                                    />
                                )}
                                {shouldMountAudio && music.type === 'youtube_music' && (
                                    <View key={`yt-${post.id}-${isFocused}`} style={styles.hiddenAudio} pointerEvents="none">
                                        <View style={{ flex: 1, pointerEvents: 'none' }}>
                                            <YoutubeIframe
                                                height={'100%'}
                                                width={'100%'}
                                                videoId={music.youtubeId}
                                                play={actualShouldPlay}
                                                mute={musicMuted}
                                                forceAndroidAutoplay={true}
                                                initialPlayerParams={{
                                                    controls: false,
                                                    rel: false,
                                                    modestbranding: true,
                                                    iv_load_policy: 3
                                                }}
                                                onReady={() => setSoundReady(true)}
                                            />
                                        </View>
                                    </View>
                                )}
                            </>
                        );
                    }
                    return null;
                })()}
            </TouchableOpacity>

            {/* Media Carousel */}
            {renderMedia && renderMedia({
                mediaList, cardWidth,
                postAspectRatio, isVideo, paused, setPaused, shouldPlay,
                isFocused, actualShouldPlay, videoRef,
                musicMuted, post, styles, isDetail,
                hasMusic,
                handlePostPress
            })}

            {/* Reaction Summary Bar (likes & comments count always visible matching image) */}
            <View style={styles.reactionSummaryBar}>
                <View style={styles.reactionIconsGroup}>
                    <View style={styles.reactionLikeBubble}>
                        <MaterialCommunityIcons name="thumb-up" size={11} color="#ffffff" />
                    </View>
                    <Text style={[styles.reactionCountText, isDarkMode && { color: theme.textMuted }]}>
                        {likeCount > 0 ? likeCount : (liked ? 1 : 0)}
                    </Text>
                </View>

                <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7}>
                    <Text style={[styles.commentsSharesText, isDarkMode && { color: theme.textMuted }]}>
                        {Array.isArray(post.comments) ? post.comments.length : (Number(post.comments) || 0)} comments
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Subtle Divider */}
            <View style={[styles.reactionDivider, isDarkMode && { backgroundColor: theme.border }]} />

            {/* 4 Action Buttons: Like, Comment, Share, Save */}
            <View style={styles.fbActionsRow}>
                {/* 1. Like */}
                <TouchableOpacity
                    style={styles.fbActionButton}
                    onPress={toggleLike}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                        <MaterialCommunityIcons
                            name={liked ? "thumb-up" : "thumb-up-outline"}
                            size={20}
                            color={liked ? "#1877F2" : (isDarkMode ? theme.textMuted : "#65676B")}
                        />
                    </Animated.View>
                    <Text style={[styles.fbActionText, isDarkMode && { color: theme.textMuted }, liked && { color: '#1877F2', fontWeight: '700' }]}>
                        Like
                    </Text>
                </TouchableOpacity>

                {/* 2. Comment */}
                <TouchableOpacity
                    style={styles.fbActionButton}
                    onPress={handlePostPress}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                    <Ionicons name="chatbubble-outline" size={18} color={isDarkMode ? theme.textMuted : "#65676B"} />
                    <Text style={[styles.fbActionText, isDarkMode && { color: theme.textMuted }]}>Comment</Text>
                </TouchableOpacity>

                {/* 3. Share */}
                <TouchableOpacity
                    style={styles.fbActionButton}
                    onPress={handleShare}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                    <Ionicons name="arrow-redo-outline" size={20} color={isDarkMode ? theme.textMuted : "#65676B"} />
                    <Text style={[styles.fbActionText, isDarkMode && { color: theme.textMuted }]}>Share</Text>
                </TouchableOpacity>

                {/* 4. Save */}
                <TouchableOpacity
                    style={styles.fbActionButton}
                    onPress={toggleSave}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                    <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                        <Ionicons
                            name={saved ? "bookmark" : "bookmark-outline"}
                            size={19}
                            color={saved ? "#1877F2" : (isDarkMode ? theme.textMuted : "#65676B")}
                        />
                    </Animated.View>
                    <Text style={[styles.fbActionText, isDarkMode && { color: theme.textMuted }, saved && { color: '#1877F2', fontWeight: '700' }]}>
                        Save
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Post Options Modal */}
            <Modal
                visible={optionsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} 
                    activeOpacity={1} 
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={{ backgroundColor: isDarkMode ? theme.modalBackground : 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: isDarkMode ? theme.border : '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
                            {String(post.user.id) === String(currentUserId) ? 'Manage Post' : 'Post Options'}
                        </Text>
                        
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}
                            onPress={() => {
                                setOptionsModalVisible(false);
                                handleDownloadPost();
                            }}
                        >
                            <Ionicons name="download-outline" size={24} color={isDarkMode ? theme.text : "#374151"} style={{ marginRight: 15 }} />
                            <Text style={{ fontSize: 16, color: theme.text }}>Download/Share Media</Text>
                        </TouchableOpacity>

                        {String(post.user.id) === String(currentUserId) ? (
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    if (onDeletePress) onDeletePress();
                                }}
                            >
                                <Ionicons name="trash-outline" size={24} color="#ef4444" style={{ marginRight: 15 }} />
                                <Text style={{ fontSize: 16, color: '#ef4444' }}>Delete Post</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    setReportModalVisible(true);
                                }}
                            >
                                <Ionicons name="warning-outline" size={24} color="#ef4444" style={{ marginRight: 15 }} />
                                <Text style={{ fontSize: 16, color: '#ef4444' }}>Report Post</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Report Post Modal */}
            <Modal
                visible={reportModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Report Post</Text>
                            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>Please select a category for reporting:</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={reportCategory}
                                onValueChange={(itemValue) => setReportCategory(itemValue)}
                                style={styles.picker}
                            >
                                {REPORT_CATEGORIES.map((category) => (
                                    <Picker.Item key={category} label={category} value={category} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.modalSubtitle}>Describe your reason:</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Write the detailed reason here..."
                            placeholderTextColor="#9ca3af"
                            multiline={true}
                            numberOfLines={4}
                            value={reportReason}
                            onChangeText={setReportReason}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setReportModalVisible(false)}
                                disabled={reporting}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitReport}
                                disabled={reporting}
                            >
                                {reporting ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: 'white',
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 16,
        paddingBottom: 4,
        borderWidth: 1,
        borderColor: '#F0F2F5',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E2E8F0',
        borderWidth: 2,
        borderColor: 'rgba(37, 99, 235, 0.2)',
    },
    headerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontWeight: '900',
        color: '#0f172a',
        fontSize: 16,
        letterSpacing: -0.3,
    },
    timeAgo: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '500',
    },
    dotSeparator: {
        color: '#9ca3af',
        fontSize: 11,
        marginHorizontal: 5,
    },
    optionsButton: {
        padding: 8,
    },
    contentBody: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    contentText: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 22,
        textAlign: 'justify',
    },
    musicOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 247, 237, 0.75)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginTop: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 237, 213, 0.6)',
    },
    musicIconContainer: {
        backgroundColor: '#93C5FD',
        padding: 6,
        borderRadius: 8,
    },
    musicTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    playingFromText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#c2410c',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    musicTitleText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#172554',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#93C5FD',
    },
    liveText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#93C5FD',
        marginLeft: 4,
        letterSpacing: 1,
    },
    hiddenAudio: {
        height: 1,
        width: 1,
        position: 'absolute',
        bottom: -10,
        right: -10,
        opacity: 0.01,
    },
    videoDuration: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    videoDurationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mediaContainerWrapper: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 4,
    },
    mediaCardInner: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    mediaBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 10,
    },
    mediaBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    mediaDotsContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        pointerEvents: 'none',
        zIndex: 10,
    },
    mediaDot: {
        height: 5,
        borderRadius: 2.5,
    },
    mediaDotActive: {
        width: 16,
        backgroundColor: '#ffffff',
    },
    mediaDotInactive: {
        width: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    reactionSummaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    reactionIconsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reactionLikeBubble: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactionCountText: {
        color: '#65676B',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
    },
    commentsSharesText: {
        color: '#65676B',
        fontSize: 13,
        fontWeight: '400',
    },
    reactionDivider: {
        height: 1,
        backgroundColor: '#E4E6EB',
        marginHorizontal: 16,
        marginVertical: 4,
    },
    fbActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        paddingHorizontal: 16,
    },
    fbActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        paddingHorizontal: 2,
    },
    fbActionText: {
        color: '#65676B',
        fontSize: 12.5,
        fontWeight: '600',
        marginLeft: 5,
    },
    cornerMuteButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,
        elevation: 6,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 12,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
        padding: 4,
    },
    actionText: {
        color: '#374151',
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '500',
    },
    muteButton: {
        padding: 5,
        marginLeft: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    vignettePart: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: Dimensions.get('window').width - 40,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#172554',
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        marginBottom: 12,
        overflow: 'hidden',
    },
    picker: {
        width: '100%',
        height: 50,
        color: '#172554',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#172554',
        backgroundColor: '#F8FAFC',
        textAlignVertical: 'top',
        height: 100,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#E2E8F0',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: '#2563EB',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});

export const areEqual = (prevProps: any, nextProps: any) => {
    const prevPost = prevProps.post || {};
    const nextPost = nextProps.post || {};
    
    return (
        String(prevPost.id) === String(nextPost.id) &&
        Number(prevPost.likes || 0) === Number(nextPost.likes || 0) &&
        (Array.isArray(prevPost.comments) ? prevPost.comments.length : Number(prevPost.comments || 0)) === (Array.isArray(nextPost.comments) ? nextPost.comments.length : Number(nextPost.comments || 0)) &&
        Boolean(prevPost.isLiked) === Boolean(nextPost.isLiked) &&
        Boolean(prevPost.isSaved || prevPost.user_saved || prevPost.is_saved) === Boolean(nextPost.isSaved || nextPost.user_saved || nextPost.is_saved) &&
        Boolean(prevProps.shouldPlay) === Boolean(nextProps.shouldPlay) &&
        String(prevProps.currentUserId) === String(nextProps.currentUserId)
    );
};

export const PostMediaCarousel = React.memo((props: any) => {
    const {
        mediaList, cardWidth,
        postAspectRatio, isVideo, paused, setPaused, shouldPlay,
        isFocused, actualShouldPlay, videoRef,
        musicMuted, post, styles, isDetail,
        hasMusic, handlePostPress
    } = props;
    
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [dynamicAspect, setDynamicAspect] = useState<number | undefined>(
        postAspectRatio ? (isDetail ? postAspectRatio : Math.max(postAspectRatio, 9 / 16)) : undefined
    );
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const effectiveAspect = isDetail
        ? (postAspectRatio || dynamicAspect)
        : (postAspectRatio
            ? Math.max(postAspectRatio, 9 / 16)
            : (dynamicAspect ? Math.max(dynamicAspect, 9 / 16) : (isVideo(mediaList[0]) ? 9 / 16 : undefined)));

    const imageViewerUrls = React.useMemo(() => {
        return mediaList
            .filter((uri: string) => !isVideo(uri))
            .map((uri: string) => ({
                url: ImageService.getDetailImageUrl(uri),
            }));
    }, [mediaList]);

    if (!mediaList || mediaList.length === 0) return null;

    // Professional framed layout with subtle horizontal X-axis padding
    const MEDIA_PADDING_X = 8;
    const mediaWidth = cardWidth - (MEDIA_PADDING_X * 2);

    const isCurrentMediaVideo = isVideo ? isVideo(mediaList[activeMediaIndex]) : false;
    const showMuteButton = isCurrentMediaVideo || Boolean(hasMusic);

    return (
        <View style={[styles.mediaContainerWrapper, { width: cardWidth }]}>
            <View style={[styles.mediaCardInner, { width: mediaWidth }]}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center' }}
                    onScroll={(event) => {
                        const slide = Math.round(event.nativeEvent.contentOffset.x / mediaWidth);
                        if (slide !== activeMediaIndex) {
                            setActiveMediaIndex(slide);
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {mediaList.map((uri: string, index: number) => (
                        <View 
                            key={index} 
                            style={{ 
                                width: mediaWidth, 
                                aspectRatio: effectiveAspect || (isVideo(uri) ? 9 / 16 : 4 / 3), 
                                backgroundColor: isVideo(uri) ? '#0F172A' : '#F8FAFC', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            {isVideo(uri) ? (
                                <TouchableOpacity
                                    activeOpacity={0.95}
                                    onPress={() => {
                                        if (!isDetail && handlePostPress) {
                                            handlePostPress();
                                        } else {
                                            setPaused(!paused);
                                        }
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <VideoItem
                                        uri={uri}
                                        poster={
                                            ((post as any)?.thumbnail ? ((post as any).thumbnail.startsWith('http') ? (post as any).thumbnail : `${POST_MEDIA_PATH}${(post as any).thumbnail}`) : undefined) ||
                                             mediaList.find((m: string) => !isVideo(m)) ||
                                            (!isVideo(mediaList[0]) ? mediaList[0] : undefined)
                                        }
                                        isActive={shouldPlay && isFocused && index === activeMediaIndex}
                                        shouldPlay={index === activeMediaIndex && actualShouldPlay}
                                        forwardedRef={index === activeMediaIndex ? videoRef : null}
                                        isMuted={musicMuted}
                                        aspectRatio={effectiveAspect}
                                        isDetail={isDetail}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={0.95}
                                    onPress={() => {
                                        if (!isDetail && handlePostPress) {
                                            handlePostPress();
                                        } else {
                                            const currentUrl = ImageService.getDetailImageUrl(uri);
                                            const idx = imageViewerUrls.findIndex((item: any) => item.url === currentUrl || item.url === uri);
                                            setViewerIndex(idx >= 0 ? idx : 0);
                                            setViewerVisible(true);
                                        }
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <PostImage
                                        uri={uri}
                                        forcedAspect={effectiveAspect}
                                        isDetail={isDetail}
                                        onAspectCalculated={(asp) => {
                                            if (!postAspectRatio) setDynamicAspect(asp);
                                        }}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </ScrollView>

                {/* Multiple Media Badge */}
                {mediaList.length > 1 && (
                    <View style={styles.mediaBadge}>
                        <Ionicons name="images" size={12} color="#ffffff" />
                        <Text style={styles.mediaBadgeText}>{activeMediaIndex + 1}/{mediaList.length}</Text>
                    </View>
                )}

                {/* Multiple Media Dots Indicator */}
                {mediaList.length > 1 && (
                    <View style={styles.mediaDotsContainer}>
                        {mediaList.map((_: any, idx: number) => (
                            <View
                                key={idx}
                                style={[
                                    styles.mediaDot,
                                    idx === activeMediaIndex ? styles.mediaDotActive : styles.mediaDotInactive,
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* Instagram-style Media Corner Mute/Unmute Button */}
                {showMuteButton && (
                    <TouchableOpacity
                        style={styles.cornerMuteButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            MuteManager.toggle();
                        }}
                        activeOpacity={0.8}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={musicMuted ? "volume-mute" : "volume-high"}
                            size={16}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                )}

                {/* Apply Filter Overlay if meta contains filterId */}
                {(() => {
                    try {
                        if (post.link) {
                            const meta = typeof post.link === 'string' ? JSON.parse(post.link) : post.link;
                            if (meta.filterId && meta.filterId !== 'none') {
                                return <FilterOverlay filterId={meta.filterId} />;
                            }
                        }
                    } catch (e) { }
                    return null;
                })()}
            </View>

            {/* Instagram-style Full Screen Zoomable Image Viewer Modal on Tap */}
            {imageViewerUrls.length > 0 && (
                <Modal visible={viewerVisible} transparent={true} onRequestClose={() => setViewerVisible(false)}>
                    <ImageViewer
                        imageUrls={imageViewerUrls}
                        index={viewerIndex}
                        onSwipeDown={() => setViewerVisible(false)}
                        enableSwipeDown={true}
                        renderIndicator={(currentIndex, allSize) => (
                            allSize && allSize > 1 ? (
                                <View style={{ position: 'absolute', top: 48, left: 20, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{currentIndex}/{allSize}</Text>
                                </View>
                            ) : <View />
                        )}
                        renderHeader={() => (
                            <TouchableOpacity
                                onPress={() => setViewerVisible(false)}
                                style={{
                                    position: 'absolute',
                                    top: 45,
                                    right: 20,
                                    zIndex: 9999,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    borderRadius: 20,
                                    padding: 6
                                }}
                            >
                                <Ionicons name="close" size={26} color="white" />
                            </TouchableOpacity>
                        )}
                    />
                </Modal>
            )}
        </View>
    );
});

export const ImagePost = React.memo((props: any) => {
    const renderMedia = React.useCallback((mediaProps: any) => <PostMediaCarousel {...mediaProps} />, []);
    return <BasePostCard {...props} renderMedia={renderMedia} />;
}, areEqual);

export const VideoPost = React.memo((props: any) => {
    const renderMedia = React.useCallback((mediaProps: any) => <PostMediaCarousel {...mediaProps} />, []);
    return <BasePostCard {...props} renderMedia={renderMedia} />;
}, areEqual);

export const MultiMediaPost = React.memo((props: any) => {
    const renderMedia = React.useCallback((mediaProps: any) => <PostMediaCarousel {...mediaProps} />, []);
    return <BasePostCard {...props} renderMedia={renderMedia} />;
}, areEqual);

export const TextPost = React.memo((props: any) => {
    return <BasePostCard {...props} />;
}, areEqual);

const PostCardRouter = (props: any) => {
    const { media, image } = props.post;
    const isDetail = props.isDetail;
    const isVid = (uri: string) => uri && (uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().endsWith('.m4v') || uri.toLowerCase().endsWith('.3gp') || uri.toLowerCase().endsWith('.mkv') || uri.toLowerCase().endsWith('.webm'));
    
    let mediaList: string[] = [];
    if (media && media.length > 0) {
        mediaList = media.map((file: string) => file.startsWith('http') ? file : `${POST_MEDIA_PATH}${file}`);
    } else if (image) {
        mediaList = [image.startsWith('http') ? image : `${POST_MEDIA_PATH}${image}`];
    }

    if (mediaList.length > 1) {
        return <MultiMediaPost {...props} />;
    } else if (mediaList.length === 1) {
        if (isVid(mediaList[0])) {
            return <VideoPost {...props} />;
        } else {
            return <ImagePost {...props} />;
        }
    } else {
        return <TextPost {...props} />;
    }
};

export default React.memo(PostCardRouter, areEqual);

