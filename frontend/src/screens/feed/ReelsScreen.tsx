import { Image } from 'expo-image';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, StyleSheet, Alert, Animated, Platform, StatusBar, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import Slider from '@react-native-community/slider';
import { FlatList, ViewToken } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as VideoThumbnails from 'expo-video-thumbnails';
import api, { API_BASE_URL, WEBSITE_URL, BASE_URL_ROOT } from '../../services/api';
import { useBadge } from '../../context/BadgeContext';
import MatrimonyRingsIcon from '../../components/MatrimonyRingsIcon';
import NewsPaperIcon from '../../components/NewsPaperIcon';
import LinkUpHeader, { TOP_HEADER_COLLAPSE } from '../../components/LinkUpHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import { WebView } from 'react-native-webview';
import { Modal, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logoBase64 } from '../../constants/logoBase64';
import { FFmpegKit, ReturnCode } from '@wokcito/ffmpeg-kit-react-native';
import { Asset } from 'expo-asset';
import { getVideoThumbnail } from '../../utils/thumbnailHelper';
import { useTabSwipe } from '../../utils/useTabSwipe';

const { width, height } = Dimensions.get('window');
const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;
const POST_MEDIA_PATH = `${BASE_URL_ROOT}/uploads/posts/`;

const isVideo = (uri: string) => {
    if (!uri) return false;
    const lower = uri.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.3gp') || lower.endsWith('.mkv');
};

const resolvePhotoUri = (photo: string | undefined | null): string | null => {
    if (!photo || photo === 'null' || photo === 'undefined' || photo.includes('via.placeholder') || (typeof photo === 'string' && photo.trim() === '')) {
        return null;
    }
    const clean = String(photo).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean;
    }
    if (clean.startsWith('/')) {
        return `${WEBSITE_URL}${clean}`;
    }
    if (clean.startsWith('uploads/')) {
        return `${WEBSITE_URL}/${clean}`;
    }
    return `${PHOTO_URL}${clean}`;
};

const FILTERS: any = {
    'none': { color: 'transparent' },
    'cinematic': { color: 'rgba(50, 20, 0, 0.15)', vignette: true },
    'bw_grain': { color: 'rgba(0,0,0,0.4)', grain: true },
    'cyberpunk': { dualTone: ['rgba(255,0,255,0.15)', 'rgba(0,255,255,0.1)'] },
    'sunset': { color: 'rgba(255, 69, 0, 0.15)', vignette: true },
    'cool_night': { color: 'rgba(0, 0, 139, 0.1)', dualTone: ['rgba(0,0,50,0.2)', 'rgba(0,100,255,0.05)'] },
    'retro_sepia': { color: 'rgba(112, 66, 20, 0.25)', grain: true, vignette: true },
};

const VignetteOverlay = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.vignettePart, { top: -20, left: -20, right: -20, height: 150, borderBottomLeftRadius: 100, borderBottomRightRadius: 100 }]} />
        <View style={[styles.vignettePart, { bottom: -20, left: -20, right: -20, height: 150, borderTopLeftRadius: 100, borderTopRightRadius: 100 }]} />
        <View style={[styles.vignettePart, { left: -20, top: 0, bottom: 0, width: 80, borderTopRightRadius: 50, borderBottomRightRadius: 50 }]} />
        <View style={[styles.vignettePart, { right: -20, top: 0, bottom: 0, width: 80, borderTopLeftRadius: 50, borderBottomLeftRadius: 50 }]} />
    </View>
);

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

const NativeAudioItem = ({ url, startTime, duration, shouldPlay, onReady }: any) => {
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

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
                    if (onReady) onReady(true);
                    return;
                }

                const { sound } = await Audio.Sound.createAsync(
                    { uri: formattedUrl },
                    {
                        shouldPlay: false,
                        positionMillis: (startTime || 0) * 1000,
                        isLooping: false,
                        volume: 1.0
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
                console.warn("[NativeAudio] Audio load warning:", e?.message || e);
                if (onReady) onReady(true); // Don't block video if audio fails
            }
        };

        if (url) {
            setIsLoaded(false);
            if (onReady) onReady(false);
            loadSound();
        }

        return () => {
            if (soundRef.current) {
                const s = soundRef.current;
                soundRef.current = null;
                s.stopAsync()
                    .then(() => s.unloadAsync())
                    .catch(() => {});
            }
        };
    }, [url]);

    useEffect(() => {
        if (isLoaded && soundRef.current) {
            if (shouldPlay) {
                soundRef.current.playAsync().catch(() => {});
            } else {
                soundRef.current.pauseAsync().catch(() => {});
            }
        }
    }, [shouldPlay, isLoaded]);

    return null;
};

const ReelsItem = ({ item, index, activeIndex, focused, currentUserId, layoutHeight, onUserPress, onCommentPress, onDelete }: any) => {
    const active = index === activeIndex;
    const isNearby = (index - activeIndex) >= -1 && (index - activeIndex) <= 1; // Preload 1 ahead silently
    const videoRef = useRef<any>(null);
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.unloadAsync();
            }
        };
    }, []);
    const [liked, setLiked] = useState(item.user_liked);
    const [likeCount, setLikeCount] = useState(parseInt(item.likes) || 0);
    const [saved, setSaved] = useState(Boolean(item.is_saved || item.user_saved));
    const [paused, setPaused] = useState(false);
    const [soundReady, setSoundReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [followStatus, setFollowStatus] = useState<string>('loading'); // loading, none, pending, accepted
    const tapCount = useRef<number>(0);
    const timer = useRef<any>(null);
    const heartScale = useRef(new Animated.Value(0)).current;
    const saveScale = useRef(new Animated.Value(1)).current;

    const REPORT_CATEGORIES = [
        'Child Safety Concern',
        'Sexual/Exploitative Content',
        'Harassment/Abuse',
        'Nudity/Sexual Content',
        'Violence',
        'Other'
    ];
    
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [reportCategory, setReportCategory] = useState('Child Safety Concern');
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const isSliding = useRef(false);

    const submitReport = async () => {
        if (!reportReason.trim()) {
            Alert.alert("Reason Required", "Please enter a reason for reporting this reel.");
            return;
        }

        setReporting(true);
        try {
            const payload = {
                id: item.id,
                user_id: currentUserId || '',
                action: 'report',
                reason: `[${reportCategory}] ${reportReason.trim()}`
            };
            const response = await api.post('like_comment_action.php', payload);
            if (response.data && (response.data.ok || response.data.status === 'success')) {
                Alert.alert("Reel Reported", "Thank you for reporting. We will review this reel shortly.");
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

    // Sync state when item changes (e.g. on FlashList recycle)
    useEffect(() => {
        setLiked(item.user_liked);
        setLikeCount(parseInt(item.likes) || 0);
        setSaved(Boolean(item.is_saved || item.user_saved));
        setDuration(0);
        setPosition(0);
        setIsBuffering(false);
    }, [item.id, item.user_liked, item.likes, item.is_saved, item.user_saved]);

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
                if (!ids.includes(String(item.id))) ids.push(String(item.id));
            } else {
                ids = ids.filter(id => id !== String(item.id));
            }
            await AsyncStorage.setItem('saved_post_ids', JSON.stringify(ids));

            await api.post('like_comment_action.php', {
                action: 'save',
                id: item.id,
                post_id: item.id,
                user_id: uid
            });
        } catch (e) {
            console.log("Toggle save reel error", e);
        }
    };

    useEffect(() => {
        const hasMusic = !!item.link;
        if (active && focused && !paused) {
            // Slight delay allows the Android surface to be fully ready before playing, preventing black screens
            setTimeout(() => {
                videoRef.current?.playAsync();
            }, 150);
            fetchFollowStatus();
        } else {
            videoRef.current?.pauseAsync();
        }
    }, [active, focused, paused, soundReady]);

    const fetchFollowStatus = async () => {
        if (!currentUserId || !item.user_id || item.user_id === currentUserId) {
            setFollowStatus('none');
            return;
        }
        try {
            const res = await api.post(`api_follow.php?action=get_counts&current_user_id=${currentUserId}&user_id=${item.user_id}`, {
                current_user_id: currentUserId,
                user_id: item.user_id
            });
            if (res.data.ok) {
                if (res.data.is_following) setFollowStatus('accepted');
                else if (res.data.is_requested) setFollowStatus('pending');
                else setFollowStatus('none');
            }
        } catch (e) {
            console.error("Follow status fetch failed", e);
        }
    };

    const handleToggleFollow = async () => {
        if (!currentUserId || !item.user_id) return;

        try {
            const res = await api.post(`api_follow.php?action=follow&current_user_id=${currentUserId}&user_id=${item.user_id}`, {
                current_user_id: currentUserId,
                user_id: item.user_id,
            });

            if (res.data.ok) {
                if (res.data.status === 'requested') setFollowStatus('pending');
                else if (res.data.status === 'connected') setFollowStatus('accepted');
                else setFollowStatus('none');
            }
        } catch (error) {
            Alert.alert("Error", "Failed to update follow status");
        }
    };

    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    useEffect(() => {
        if (!active || !focused) {
            setPaused(false);
            tapCount.current = 0;
            if (timer.current) clearTimeout(timer.current);
            if (!focused) {
                videoRef.current?.unloadAsync();
            }
        }
    }, [active, focused]);

    const toggleLike = async (manual = true) => {
        const newStatus = manual ? !liked : true;
        if (newStatus === liked && !manual) return;

        setLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const payload = {
                id: item.id,
                user_id: currentUserId || '',
                action: 'like'
            };
            await api.post('like_comment_action.php', payload);
        } catch (e) {
            setLiked(!newStatus);
            setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handlePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        tapCount.current += 1;

        if (tapCount.current === 2) {
            if (timer.current) clearTimeout(timer.current);
            tapCount.current = 0;
            if (!liked) toggleLike(false);
            showHeartAnimation();
        } else {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                setPaused(!paused);
                tapCount.current = 0;
            }, DOUBLE_PRESS_DELAY);
        }
    };

    const showHeartAnimation = () => {
        Animated.sequence([
            Animated.spring(heartScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 3,
            }),
            Animated.timing(heartScale, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
                delay: 400,
            }),
        ]).start();
    };

    const handleDownloadReel = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const videoUri = Array.isArray(item.media) ? item.media.find((m: string) => isVideo(m)) : item.media;
            const uri = videoUri ? (videoUri.startsWith('http') ? videoUri : `${POST_MEDIA_PATH}${videoUri}`) : null;
            if (!uri) return;
            
            if (require('react-native').Platform.OS === 'android') {
                require('react-native').ToastAndroid.show("Preparing reel...", require('react-native').ToastAndroid.SHORT);
            }

            const filename = uri.split('/').pop() || 'download.mp4';
            const fileUri = FileSystem.documentDirectory + filename;
            const downloadedFile = await FileSystem.downloadAsync(uri, fileUri);

            if (downloadedFile.status === 200) {
                let finalUri = downloadedFile.uri;
                
                try {
                    const outUri = FileSystem.documentDirectory + 'watermarked_reel_' + filename;
                    const logoPath = FileSystem.documentDirectory + 'watermark_logo_v3.png';
                    
                    const logoInfo = await FileSystem.getInfoAsync(logoPath);
                    if (!logoInfo.exists) {
                        try {
                            await FileSystem.writeAsStringAsync(logoPath, logoBase64, { encoding: FileSystem.EncodingType.Base64 });
                        } catch (e) {
                            console.error("Could not write local logo asset:", e);
                        }
                    }
                    
                    const safeUsername = (item.name || 'User').replace(/'/g, "").replace(/:/g, "");
                    const textPath = FileSystem.documentDirectory + 'watermark_text_' + safeUsername + '.png';
                    
                    try {
                        const encodedText = encodeURIComponent('@' + safeUsername);
                        const textUrl = `https://placehold.co/400x100/transparent/white.png?text=${encodedText}&font=roboto`;
                        await FileSystem.downloadAsync(textUrl, textPath);
                    } catch (e) {}
                    
                    const command = `-y -i "${downloadedFile.uri}" -i "${logoPath}" -i "${textPath}" -filter_complex "[1:v]format=rgba,colorkey=white:0.05:0.1,colorchannelmixer=aa=0.85,scale=60:-1[logo];[2:v]format=rgba,colorchannelmixer=aa=0.85,scale=250:-1[txt];[0:v][logo]overlay=x='if(lt(mod(t,6),3),20,W-340)':y='if(lt(mod(t,6),3),20,H-80)'[v1];[v1][txt]overlay=x='if(lt(mod(t,6),3),85,W-275)':y='if(lt(mod(t,6),3),20,H-80)'" -c:a copy "${outUri}"`;
                    
                    const session = await FFmpegKit.execute(command);
                    const returnCode = await session.getReturnCode();
                    
                    if (ReturnCode.isSuccess(returnCode)) {
                        finalUri = outUri;
                    }
                } catch (err) {}
                
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(finalUri, {
                        dialogTitle: 'Save Reel to Device',
                    });
                }
            }
        } catch (error: any) {
            Alert.alert(error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        try {
            const postUrl = `${WEBSITE_URL}/view_post.php?id=${item.id}`;
            const message = `Check out this reel by ${item.name || 'User'} on Sadhu Vandana:\n\nOpen in App: ${postUrl}`;
            await require('react-native').Share.share({ message, url: postUrl });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const onDeletePress = () => {
        Alert.alert(
            "Delete Reel",
            "Are you sure you want to delete this reel?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            const formData = new FormData();
                            formData.append('post_id', item.id);
                            formData.append('user_id', currentUserId);
                            
                            const res = await api.post('remove_post.php', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.status === 'success' || res.data.ok) {
                                if (onDelete) onDelete(item.id);
                                import('react-native').then(({ DeviceEventEmitter }) => {
                                    DeviceEventEmitter.emit('postDeleted', { postId: item.id });
                                });
                                Alert.alert("Deleted", "Reel deleted successfully.");
                            } else {
                                Alert.alert("Error", res.data.message || "Failed to delete reel");
                            }
                        } catch (e) {
                            Alert.alert("Error", "Network error");
                        }
                    } 
                }
            ]
        );
    };

    const handleOptions = () => {
        if (!currentUserId) return;
        setOptionsModalVisible(true);
    };

    const videoUri = item.media.find((m: string) => isVideo(m));
    const fullVideoUri = videoUri ? (videoUri.startsWith('http') ? videoUri : `${POST_MEDIA_PATH}${videoUri}`) : null;

    const serverThumb = item.media.find((m: string) => !isVideo(m));
    const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!serverThumb && fullVideoUri && isNearby && !localThumbnail) {
            getVideoThumbnail(fullVideoUri).then((thumb) => {
                if (isMounted && thumb) {
                    setLocalThumbnail(thumb);
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [isNearby, fullVideoUri, serverThumb, localThumbnail]);

    const finalThumbUri = serverThumb ? (serverThumb.startsWith('http') ? serverThumb : `${POST_MEDIA_PATH}${serverThumb}`) : localThumbnail;

    if (!fullVideoUri) return null;

    return (
        <View style={[styles.reelContainer, { height: layoutHeight }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                style={[styles.backgroundVideo, { height: layoutHeight }]}
            >
                {isNearby && focused ? (
                        <Video
                            ref={videoRef}
                            source={{ uri: fullVideoUri }}
                            style={styles.backgroundVideo}
                            resizeMode={ResizeMode.COVER}
                            isLooping
                            shouldPlay={active && focused && !paused}
                            onLoad={() => {
                                if (position > 0 && videoRef.current) {
                                    videoRef.current.setPositionAsync(position);
                                }
                            }}
                            usePoster={true}
                            posterSource={{ uri: finalThumbUri || '' }}
                            posterStyle={{ resizeMode: ResizeMode.COVER }}
                            isMuted={false} // Allow original audio to mix with music
                            onPlaybackStatusUpdate={(status: any) => {
                            if (status.isLoaded) {
                                if (!isSliding.current) {
                                    setPosition(status.positionMillis || 0);
                                }
                                if (status.durationMillis && status.durationMillis !== duration) {
                                    setDuration(status.durationMillis);
                                }
                                if (status.isBuffering !== isBuffering) {
                                    setIsBuffering(status.isBuffering);
                                }
                            }
                        }}
                        progressUpdateIntervalMillis={500}
                        onError={(e: any) => {
                            console.error("[Reels Video] Error:", e, "URI:", fullVideoUri);
                        }}
                    />
                ) : (
                    <View style={[styles.backgroundVideo, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                        {finalThumbUri ? (
                            <Image 
                                source={{ uri: finalThumbUri }} 
                                style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                            />
                        ) : (
                            <ActivityIndicator size="large" color="#ffffff" />
                        )}
                    </View>
                )}

                <Animated.View
                    style={[styles.pauseOverlay, {
                        transform: [{ scale: heartScale }],
                        opacity: heartScale.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] })
                    }]}
                    pointerEvents="none"
                >
                    <Ionicons name="heart" size={120} color="white" />
                </Animated.View>

                {paused && (
                    <View style={styles.pauseOverlay} pointerEvents="none">
                        <Ionicons name="play" size={80} color="rgba(255,255,255,0.5)" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Always visible slider at bottom edge of video */}
            {active && (
                <View style={{ position: 'absolute', bottom: -5, left: -16, right: -16, height: 20, justifyContent: 'center', zIndex: 10 }}>
                    <Slider
                        style={{ width: width + 32, height: 20 }}
                        minimumValue={0}
                        maximumValue={duration > 0 ? duration : 1}
                        value={position}
                        minimumTrackTintColor="rgba(255,255,255,0.85)"
                        maximumTrackTintColor="rgba(255,255,255,0.2)"
                        thumbTintColor="transparent"
                        onSlidingStart={() => {
                            isSliding.current = true;
                        }}
                        onValueChange={(val) => {
                            setPosition(val);
                        }}
                        onSlidingComplete={(val) => {
                            isSliding.current = false;
                            if (videoRef?.current && duration > 0) videoRef.current.setPositionAsync(val);
                        }}
                    />
                </View>
            )}
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, pointerEvents: 'none' }}
            />

            <View style={[styles.bottomOverlay]}>
                <TouchableOpacity style={[styles.userInfo, (!item.description || item.description.trim() === '') ? { marginBottom: 0 } : {}]} onPress={() => onUserPress(item.user_id)}>
                    <Image
                        source={{ uri: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/50' }}
                        style={styles.avatar}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                        <Text style={[styles.userName, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                        {item.user_id !== currentUserId && followStatus !== 'accepted' && (
                            <TouchableOpacity
                                style={[
                                    styles.followButton,
                                    followStatus === 'pending' && { backgroundColor: 'rgba(255,255,255,0.2)' }
                                ]}
                                onPress={handleToggleFollow}
                            >
                                <Text style={styles.followText}>
                                    {followStatus === 'loading' ? '...' :
                                        followStatus === 'pending' ? 'Requested' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>

                {item.description && item.description.trim() !== '' && (
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                {/* Music Info Overlay & Audio Engine */}
                {(() => {
                    try {
                        if (item.link && item.link.startsWith('{')) {
                            const music = JSON.parse(item.link);
                            if (music.type === 'youtube_music' || music.type === 'custom_music') {
                                return (
                                    <>
                                         <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                            <Ionicons name="musical-notes" size={14} color="white" />
                                            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 6 }} numberOfLines={1}>
                                                {music.title} • {music.artist}
                                            </Text>
                                        </View>

                                        {/* Audio Engine */}
                                        {active && focused && music.type === 'custom_music' && (
                                            <NativeAudioItem
                                                url={music.music_url}
                                                startTime={music.startTime}
                                                duration={music.duration}
                                                shouldPlay={!paused && !isBuffering}
                                                onReady={setSoundReady}
                                            />
                                        )}

                                         {active && focused && music.type === 'youtube_music' && (
                                             <View key={`reel-yt-${item.id}-${focused}`} style={{ height: 1, width: 1, position: 'absolute', bottom: -10, right: -10, opacity: 0.01 }} pointerEvents="none">
                                                 <WebView
                                                     source={{
                                                         uri: `https://m.youtube.com/watch?v=${music.id}${music.startTime > 0 ? '&t=' + music.startTime : ''}`
                                                     }}
                                                     onMessage={(event) => {
                                                         if (event.nativeEvent.data === 'yt-ready') setSoundReady(true);
                                                     }}
                                                    injectedJavaScript={`
                                                        (function() {
                                                            const css = '#header-bar, #footer-bar, .player-control-container, #related, #comments, .video-player-control-overlay, .ad-container, .ad-display, .ytp-ad-overlay-container { display: none !important; }';
                                                            const style = document.createElement('style');
                                                            style.innerHTML = css;
                                                            document.head.appendChild(style);
                                                                                                                         let jumped = false;
                                                            let sentReady = false;

                                                            const loopLogic = () => {
                                                                const video = document.querySelector("video");
                                                                if (!video) return;

                                                                if (!sentReady && video.readyState >= 3) {
                                                                    window.ReactNativeWebView.postMessage('yt-ready');
                                                                    sentReady = true;
                                                                }

                                                                const sTime = Number(${music.startTime || 0});
                                                                const duration = Number(${music.duration || 30});
                                                                const eTime = sTime + duration;                                                                 const adShowing = document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-overlay-container");
                                                                if (adShowing) {
                                                                    video.muted = true;
                                                                    if (video.duration > 0) video.currentTime = video.duration - 0.1;
                                                                    const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-text, .ytp-ad-preview-container");
                                                                    if (skipBtn) skipBtn.click();
                                                                } else {
                                                                    const shouldPlay = ${!paused && !isBuffering};
                                                                    video.muted = false;
                                                                    video.volume = 1.0;
                                                                    
                                                                    if(shouldPlay) {
                                                                        if(video.paused) video.play().catch(e => {});
                                                                    } else {
                                                                        if(!video.paused) video.pause();
                                                                    }

                                                                     // Handle Start Time Jump & Loop
                                                                     if (!jumped && sTime > 0 && video.currentTime < sTime) {
                                                                         video.currentTime = sTime;
                                                                         jumped = true;
                                                                     }
                                                                     
                                                                     // Loop Logic (40ms precision)
                                                                     if (video.currentTime >= eTime || (video.currentTime < sTime - 1.5 && !video.seeking)) {
                                                                         video.currentTime = sTime;
                                                                         video.play().catch(e => {});
                                                                     }

                                                                    const unmuteSelectors = [".ytp-unmute", ".ytp-mute-button", ".ytp-unmute-button", "button[aria-label*='unmute']"];
                                                                    unmuteSelectors.forEach(sel => {
                                                                        const btn = document.querySelector(sel);
                                                                        if (btn) btn.click();
                                                                    });
                                                                }
}
                                                            };
                                                            setInterval(loopLogic, 250);
                                                        })();
                                                    `}
                                                    allowsInlineMediaPlayback={true}
                                                    mediaPlaybackRequiresUserAction={false}
                                                    javaScriptEnabled={true}
                                                    domStorageEnabled={true}
                                                    sharedCookiesEnabled={true}
                                                    androidLayerType="hardware"
                                                    originWhitelist={['*']}
                                                    mixedContentMode="always"
                                                    userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
                                                />
                                             </View>
                                         )}
                                    </>
                                );
                            }
                        }
                    } catch (e) { }
                    return null;
                })()}
            </View>
                        
                        {/* Apply Filter Overlay if meta contains filterId */}
                        {(() => {
                            try {
                                if (item.link) {
                                    const meta = typeof item.link === 'string' ? JSON.parse(item.link) : item.link;
                                    if (meta.filterId && meta.filterId !== 'none') {
                                        return <FilterOverlay filterId={meta.filterId} />;
                                    }
                                }
                            } catch(e) {}
                            return null;
                        })()}

                        {/* Overlay Controls */}
            <View style={styles.rightOverlay}>
                <TouchableOpacity style={styles.iconButton} onPress={() => toggleLike(true)}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={32} color={liked ? "#ff3b30" : "white"} style={styles.iconShadow} />
                    <Text style={styles.iconText}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => onCommentPress(item.id)}>
                    <Ionicons name="chatbubble-outline" size={28} color="white" style={styles.iconShadow} />
                    <Text style={styles.iconText}>{item.comments?.length || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="paper-plane-outline" size={28} color="white" style={styles.iconShadow} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={toggleSave} activeOpacity={0.7}>
                    <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                        <Ionicons
                            name={saved ? "bookmark" : "bookmark-outline"}
                            size={28}
                            color={saved ? "#2563EB" : "white"}
                            style={styles.iconShadow}
                        />
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={handleOptions}>
                    <Ionicons name="ellipsis-vertical" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Reel Options Modal */}
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
                    <TouchableOpacity activeOpacity={1} style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#172554' }}>
                            {String(item.user_id) === String(currentUserId) ? 'Manage Reel' : 'Reel Options'}
                        </Text>
                        
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}
                            onPress={() => {
                                setOptionsModalVisible(false);
                                handleDownloadReel();
                            }}
                        >
                            <Ionicons name="download-outline" size={24} color="#374151" style={{ marginRight: 15 }} />
                            <Text style={{ fontSize: 16, color: '#374151' }}>Download Reel</Text>
                        </TouchableOpacity>

                        {String(item.user_id) === String(currentUserId) ? (
                            <>
                                <TouchableOpacity 
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}
                                    onPress={() => {
                                        setOptionsModalVisible(false);
                                        toggleSave();
                                    }}
                                >
                                    <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={24} color="#2563EB" style={{ marginRight: 15 }} />
                                    <Text style={{ fontSize: 16, color: '#2563EB' }}>{saved ? "Unsave Reel" : "Save Reel"}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                                    onPress={() => {
                                        setOptionsModalVisible(false);
                                        onDeletePress();
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#ef4444" style={{ marginRight: 15 }} />
                                    <Text style={{ fontSize: 16, color: '#ef4444' }}>Delete Reel</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
                                onPress={() => {
                                    setOptionsModalVisible(false);
                                    setReportModalVisible(true);
                                }}
                            >
                                <Ionicons name="warning-outline" size={24} color="#ef4444" style={{ marginRight: 15 }} />
                                <Text style={{ fontSize: 16, color: '#ef4444' }}>Report Reel</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Report Reel Modal */}
            <Modal
                visible={reportModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Report Reel</Text>
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

const ReelsScreen = ({ navigation, route }: any) => {
    const { t } = useLanguage();
    const isFocused = useIsFocused();
    const initialReelId = route.params?.initialReelId || route.params?.startPostId;
    const filterUserId = route.params?.filter_user_id;
    const showBack = route.params?.showBack || !!filterUserId;
    
    const [user, setUser] = useState<any>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const tabSwipe = useTabSwipe({ currentTab: 'Reels', isBusiness: user?.is_business == 1 });
    const insets = useSafeAreaInsets();
    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top;
    const { notificationCount, chatCount, refreshCounts } = useBadge();

    const [layoutHeight, setLayoutHeight] = useState(height);
    const flashListRef = useRef<any>(null);
    const REELS_BATCH_SIZE = 4;
    const [refreshKey, setRefreshKey] = useState(0);

    // Facebook-style silky smooth auto-collapsing top header on scroll (native driver)
    const headerAnim = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const accumulatedScroll = useRef(0);
    const isHeaderHidden = useRef(false);

    const animateHeader = useCallback((toHide: boolean) => {
        if (isHeaderHidden.current === toHide) return;
        isHeaderHidden.current = toHide;
        Animated.timing(headerAnim, {
            toValue: toHide ? -TOP_HEADER_COLLAPSE : 0,
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
        }).start();
    }, [headerAnim]);

    const handleScroll = useCallback((event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        if (currentY <= 10) {
            accumulatedScroll.current = 0;
            animateHeader(false);
            return;
        }

        if (diff > 0) {
            if (accumulatedScroll.current < 0) accumulatedScroll.current = 0;
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current > 24 && currentY > 40) {
                animateHeader(true);
            }
        } else if (diff < 0) {
            if (accumulatedScroll.current > 0) accumulatedScroll.current = 0;
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current < -18) {
                animateHeader(false);
            }
        }
    }, [animateHeader]);

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const parsed = JSON.parse(u);
                setUser(parsed);
                setCurrentUserId(parsed.id);
            }
        });
    }, []);

    const fetchReels = async ({ pageParam = 0 }) => {
        let url = `get_posts.php?filter_reels=1&user_id=${currentUserId || ''}&limit=${REELS_BATCH_SIZE}&offset=${pageParam}`;
        if (filterUserId) {
            url += `&filter_user_id=${filterUserId}`;
        }
        if (pageParam === 0 && initialReelId) {
            url += `&start_post_id=${initialReelId}`;
        }
        const res = await api.get(url);
        if (res.data.status === 'success' && Array.isArray(res.data.data)) {
            return res.data.data.filter((post: any) =>
                post.media && post.media.some((m: string) => isVideo(m))
            );
        }
        return [];
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching,
        refetch
    } = useInfiniteQuery({
        queryKey: ['reels', filterUserId, currentUserId, refreshKey],
        queryFn: fetchReels,
        initialPageParam: 0,
        placeholderData: keepPreviousData,
        staleTime: Infinity,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < REELS_BATCH_SIZE) return undefined;
            return allPages.length * REELS_BATCH_SIZE;
        },
        enabled: !!currentUserId || true,
    });

    const reels = data ? data.pages.flat() : [];
    const queryClient = useQueryClient();

    useEffect(() => {
        let deleteSub: any = null;
        import('react-native').then(({ DeviceEventEmitter }) => {
            deleteSub = DeviceEventEmitter.addListener('postDeleted', (data: any) => {
                queryClient.setQueryData(['reels', filterUserId, currentUserId, refreshKey], (oldData: any) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.filter(post => post.id !== data.postId))
                    };
                });
            });
        });
        return () => {
            if (deleteSub) deleteSub.remove();
        };
    }, [queryClient, filterUserId, currentUserId, refreshKey]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            if (isFocused) {
                setRefreshKey(prev => prev + 1);
                setActiveIndex(0);
                if (reels.length > 0 && flashListRef.current) {
                    flashListRef.current.scrollToIndex({ index: 0, animated: true });
                }
            }
        });
        return unsubscribe;
    }, [navigation, isFocused, reels.length]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null && index !== undefined) {
                setActiveIndex(index);
                if (index === 0) {
                    animateHeader(false);
                } else {
                    animateHeader(true);
                }
            }
        }
    }).current;

    const renderItem = useCallback(({ item, index }: any) => (
        <ReelsItem
            item={item}
            index={index}
            activeIndex={activeIndex}
            focused={isFocused}
            currentUserId={currentUserId}
            layoutHeight={layoutHeight}
            onUserPress={(uid: string) => navigation.navigate('PublicProfile', { userId: uid })}
            onCommentPress={(pid: string) => navigation.navigate('Comments', { postId: pid })}
        />
    ), [activeIndex, isFocused, currentUserId, layoutHeight]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (reels.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="videocam-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No reels found</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { height: layoutHeight }]} onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)} {...tabSwipe.panHandlers}>
            {isFetching && !isFetchingNextPage && (
                <View style={{ position: 'absolute', top: statusBarHeight + 120, width: '100%', alignItems: 'center', zIndex: 100 }}>
                    <ActivityIndicator size="small" color="white" />
                </View>
            )}

            <FlashList
                ref={flashListRef}
                data={reels}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.5}
            />

            <LinkUpHeader
                currentTab="Reels"
                headerAnim={headerAnim}
                user={user}
                onTabPress={(tab) => {
                    if (tab === 'Reels') {
                        animateHeader(false);
                        flashListRef.current?.scrollToIndex({ index: 0, animated: true });
                    }
                }}
                onPlusPress={() => navigation.navigate('CreateReel')}
                tabSwipeHandlers={tabSwipe.panHandlers}
                statusBarHeight={statusBarHeight}
                subHeader={
                    <View style={styles.reelsSubHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {showBack && (
                                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 6 }}>
                                    <Ionicons name="arrow-back" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.headerTitle}>{t('reels')}</Text>
                            <Ionicons name="chevron-down" size={18} color="white" />
                        </View>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateReel')}
                            style={styles.cameraButton}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="camera-outline" size={26} color="white" />
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    pagerView: {
        flex: 1,
    },
    reelContainer: {
        width: width,
        height: height,
        position: 'relative',
    },
    backgroundVideo: {
        width: width,
        height: height,
        position: 'absolute',
    },
    pauseOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    emptyText: {
        color: '#888',
        marginTop: 10,
        fontSize: 16,
    },
    reelsSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    cameraButton: {
        padding: 6,
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 80,
        padding: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'white',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 4,
    },
    followButton: {
        marginLeft: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'white',
    },
    followText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    description: {
        color: 'white',
        fontSize: 13,
        lineHeight: 18,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 4,
    },
    rightOverlay: {
        position: 'absolute',
        bottom: 20,
        right: 0,
        width: 70,
        alignItems: 'center',
        paddingVertical: 20,
    },
    iconButton: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconText: {
        color: 'white',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 4,
    },
    iconShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 4,
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
    }
});

export default ReelsScreen;
