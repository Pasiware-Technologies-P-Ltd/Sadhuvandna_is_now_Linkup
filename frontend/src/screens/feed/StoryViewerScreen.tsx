import { Image } from 'expo-image';
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Modal,
    Animated,
    StyleSheet,
    StatusBar,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import { useIsFocused } from '@react-navigation/native';
import { MediaCacheService } from '../../services/MediaCacheService';
import api, { WEBSITE_URL, BASE_URL_ROOT } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

// Facebook-style Story Reactions
export const STORY_REACTIONS = [
    { type: 'like', emoji: '👍', label: 'Like', color: '#2563EB' },
    { type: 'love', emoji: '❤️', label: 'Love', color: '#EF4444' },
    { type: 'care', emoji: '🥰', label: 'Care', color: '#F59E0B' },
    { type: 'haha', emoji: '😂', label: 'Haha', color: '#FBBF24' },
    { type: 'wow',  emoji: '😮', label: 'Wow',  color: '#F59E0B' },
    { type: 'sad',  emoji: '😢', label: 'Sad',  color: '#3B82F6' },
    { type: 'fire', emoji: '🔥', label: 'Fire', color: '#F97316' },
];

interface FloatingParticle {
    id: number;
    emoji: string;
    x: number;
    wobble: number;
    scale: number;
    anim: Animated.Value;
}

const StoryViewerScreen = ({ navigation, route }: any) => {
    const { stories: initialStories, initialIndex = 0, userId: storyOwnerId, userName, userPhoto } = route.params;
    const insets = useSafeAreaInsets();

    const isFocused = useIsFocused();
    const isFocusedRef = useRef(true);
    isFocusedRef.current = isFocused;

    const [stories, setStories] = useState(initialStories || []);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [loading, setLoading] = useState(true);
    const [progress] = useState(new Animated.Value(0));
    const [paused, setPaused] = useState(false);
    const [viewerId, setViewerId] = useState<string | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);

    const videoRef = useRef<any>(null);
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    const currentProgressRef = useRef(0);
    const pressStartTimeRef = useRef(0);
    const isPressingRef = useRef(false);
    const lastTapRef = useRef(0);

    // Viewers state (for owner)
    const [viewers, setViewers] = useState<any[]>([]);
    const [showViewers, setShowViewers] = useState(false);
    
    // Caching state
    const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(null);
    const [isMediaLoading, setIsMediaLoading] = useState(true);

    // Reactions & Reply state (Facebook style)
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [totalReactions, setTotalReactions] = useState(0);
    const [reactionsSummary, setReactionsSummary] = useState<Record<string, number>>({});
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [replyToast, setReplyToast] = useState<string | null>(null);

    // Floating particles state
    const [particles, setParticles] = useState<FloatingParticle[]>([]);
    const nextParticleId = useRef(1);

    // Big Center Heart (Double-tap)
    const [showBigHeart, setShowBigHeart] = useState(false);
    const bigHeartAnim = useRef(new Animated.Value(0)).current;

    // Track keyboard show/hide to position inputs safely above Android navigation bar and soft keyboard
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setIsKeyboardVisible(false);
                setIsInputFocused(false);
            }
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Calculate safe bottom padding:
    // Android 3-button navigation bar is ~48px. When status bar is hidden, insets.bottom can be 0 or ~48px.
    // By enforcing a minimum of 48px on Android, the reply and reaction controls are guaranteed
    // to sit completely and comfortably ABOVE the Android navigation buttons (square, circle, triangle).
    const defaultBottomInset = Platform.OS === 'android' ? 48 : 24;
    const safeBottom = Math.max(insets.bottom, defaultBottomInset) + 10;
    const footerBottom = isKeyboardVisible ? (Platform.OS === 'ios' ? 12 : 12) : safeBottom;

    useEffect(() => {
        const fetchMedia = async () => {
            const currentStory = stories[currentIndex];
            if (!currentStory) return;
            
            const url = `${BASE_URL_ROOT}/${currentStory.media}`;
            const isVideo = currentStory.type === 'video';
            
            try {
                const quickCacheHit = await MediaCacheService.checkCacheOnly(url);
                if (quickCacheHit) {
                    setIsMediaLoading(false);
                    setLocalMediaUrl(quickCacheHit);
                } else {
                    setIsMediaLoading(true);
                    const downloadedUri = await MediaCacheService.getCachedMedia(url, isVideo ? 'video' : 'image');
                    setLocalMediaUrl(downloadedUri);
                    setIsMediaLoading(false);
                }
            } catch (e) {
                console.error("Cache error", e);
                setLocalMediaUrl(url);
                setIsMediaLoading(false);
            }
            
            // Prefetch next story silently
            const nextStory = stories[currentIndex + 1];
            if (nextStory) {
                const nextUrl = `${BASE_URL_ROOT}/${nextStory.media}`;
                const nextIsVideo = nextStory.type === 'video';
                MediaCacheService.getCachedMedia(nextUrl, nextIsVideo ? 'video' : 'image').catch(() => {});
            }
        };
        fetchMedia();
    }, [currentIndex, stories]);

    useEffect(() => {
        const listenerId = progress.addListener(({ value }) => {
            currentProgressRef.current = value;
        });
        return () => {
            progress.removeListener(listenerId);
        };
    }, []);

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const parsed = JSON.parse(u);
                setViewerId(String(parsed.id));
            }
        });
        setLoading(false);

        return () => {
            console.log("[StoryViewer] Cleaning up on unmount");
            if (animRef.current) {
                animRef.current.stop();
            }
            if (soundRef.current) {
                const s = soundRef.current;
                soundRef.current = null;
                s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
            }
            if (videoRef.current) {
                videoRef.current.unloadAsync().catch(() => {});
            }
        };
    }, []);

    // Fetch story reactions on story change
    useEffect(() => {
        const currentStory = stories[currentIndex];
        if (currentStory) {
            setUserReaction(null);
            setTotalReactions(0);
            setReactionsSummary({});
            const url = viewerId 
                ? `fetch_story_reactions.php?story_id=${currentStory.id}&user_id=${viewerId}`
                : `fetch_story_reactions.php?story_id=${currentStory.id}`;
            api.get(url).then(res => {
                if (res.data && res.data.status === 'success') {
                    setUserReaction(res.data.user_reaction || null);
                    setTotalReactions(res.data.total_reactions || 0);
                    setReactionsSummary(res.data.reactions_summary || {});
                }
            }).catch(() => {});
        }
    }, [currentIndex, viewerId, stories]);

    useEffect(() => {
        const story = stories[currentIndex];
        if (story?.music_url) {
            loadAndPlayMusic(story.music_url);
        } else {
            stopMusic();
        }
    }, [currentIndex]);

    const loadAndPlayMusic = async (url: string) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: !paused && !showViewers && !isInputFocused && isFocused, isLooping: true }
            );
            soundRef.current = newSound;
            setIsMusicPlaying(true);
        } catch (e: any) {
            console.error("Error loading music:", e);
        }
    };

    const stopMusic = async () => {
        if (soundRef.current) {
            const s = soundRef.current;
            soundRef.current = null;
            setIsMusicPlaying(false);
            try {
                await s.stopAsync();
                await s.unloadAsync();
            } catch (e) {}
        }
    };

    const startProgress = (fromProgress: number = 0) => {
        if (stories[currentIndex]?.type === 'video') return;

        const storyDuration = stories[currentIndex]?.duration ? parseInt(stories[currentIndex].duration) * 1000 : 7000;
        const remainingDuration = storyDuration * (1 - fromProgress);

        if (remainingDuration <= 0) {
            if (isFocusedRef.current) nextStory();
            return;
        }

        if (animRef.current) {
            animRef.current.stop();
        }

        progress.setValue(fromProgress);
        currentProgressRef.current = fromProgress;

        const anim = Animated.timing(progress, {
            toValue: 1,
            duration: remainingDuration,
            useNativeDriver: false,
        });
        animRef.current = anim;

        anim.start(({ finished }) => {
            if (finished && isFocusedRef.current && !isInputFocused) nextStory();
        });
    };

    const pauseStory = () => {
        setPaused(true);
        if (animRef.current) {
            animRef.current.stop();
        }
        if (soundRef.current) {
            soundRef.current.pauseAsync().catch(() => {});
        }
    };

    const resumeStory = () => {
        if (isInputFocused || showViewers) return;
        setPaused(false);
        if (stories[currentIndex]?.type !== 'video') {
            startProgress(currentProgressRef.current);
        }
        if (soundRef.current) {
            soundRef.current.playAsync().catch(() => {});
        }
    };

    // Handle Story index change
    useEffect(() => {
        if (!stories[currentIndex]) {
            navigation.goBack();
            return;
        }
        currentProgressRef.current = 0;
        progress.setValue(0);
        if (!paused && !showViewers && !isInputFocused && isFocused) {
            startProgress(0);
        }
    }, [currentIndex]);

    // Handle focus / blur
    useEffect(() => {
        if (!isFocused) {
            pauseStory();
        } else {
            if (!showViewers && !isPressingRef.current && !isInputFocused) {
                resumeStory();
            }
        }
    }, [isFocused]);

    // Handle viewers modal pause/resume
    useEffect(() => {
        if (showViewers || !isFocused || isInputFocused) {
            pauseStory();
        } else if (!isPressingRef.current) {
            resumeStory();
        }
    }, [showViewers, isFocused, isInputFocused]);

    const markAsViewed = async (storyId: number) => {
        if (!viewerId) return;
        try {
            const formData = new FormData();
            formData.append('user_id', viewerId);
            formData.append('story_id', String(storyId));
            
            await api.post('story_view.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (e) { console.error(e); }
    };

    const nextStory = () => {
        if (!isFocusedRef.current || isInputFocused) return;
        if (animRef.current) animRef.current.stop();
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            navigation.goBack();
        }
    };

    const prevStory = () => {
        if (animRef.current) animRef.current.stop();
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            currentProgressRef.current = 0;
            progress.setValue(0);
            if (isFocusedRef.current && !isInputFocused) {
                startProgress(0);
            }
        }
    };

    const handlePressIn = () => {
        pressStartTimeRef.current = Date.now();
        isPressingRef.current = true;
        if (!showViewers && !isInputFocused) {
            pauseStory();
        }
    };

    const handlePressOut = (evt: any) => {
        const pressDuration = Date.now() - pressStartTimeRef.current;
        isPressingRef.current = false;

        if (isInputFocused) {
            Keyboard.dismiss();
            setIsInputFocused(false);
            return;
        }

        if (pressDuration < 250) {
            const x = evt.nativeEvent.locationX;
            const now = Date.now();

            // Double Tap Detection: Center screen area (20% to 80% width)
            if (now - lastTapRef.current < 300 && x >= width * 0.2 && x <= width * 0.8) {
                lastTapRef.current = 0;
                triggerDoubleTapHeart();
                return;
            }
            lastTapRef.current = now;

            if (x < width / 3) {
                prevStory();
            } else {
                nextStory();
            }
        } else {
            if (!showViewers && isFocused && !isInputFocused) {
                resumeStory();
            }
        }
    };

    // Double Tap Heart Burst Animation
    const triggerDoubleTapHeart = () => {
        setShowBigHeart(true);
        bigHeartAnim.setValue(0);
        spawnFloatingReactions('❤️');

        Animated.sequence([
            Animated.spring(bigHeartAnim, {
                toValue: 1,
                friction: 3.5,
                tension: 45,
                useNativeDriver: true,
            }),
            Animated.timing(bigHeartAnim, {
                toValue: 0,
                duration: 350,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowBigHeart(false);
        });

        handleReactionPress('love', '❤️');
    };

    // Facebook-style Floating Reaction Particles Explosion
    const spawnFloatingReactions = (emoji: string) => {
        const newParticles: FloatingParticle[] = [];
        const count = 9;

        for (let i = 0; i < count; i++) {
            const id = nextParticleId.current++;
            const anim = new Animated.Value(0);
            const x = width * 0.35 + (Math.random() * (width * 0.45) - width * 0.1);
            const wobble = (Math.random() - 0.5) * 70;
            const scale = 0.85 + Math.random() * 0.5;

            newParticles.push({
                id,
                emoji,
                x,
                wobble,
                scale,
                anim,
            });

            setTimeout(() => {
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1800 + Math.random() * 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }).start(() => {
                    setParticles(prev => prev.filter(p => p.id !== id));
                });
            }, i * 45);
        }

        setParticles(prev => [...prev.slice(-25), ...newParticles]);
    };

    // Handle reaction press
    const handleReactionPress = async (reactionType: string, emoji: string) => {
        const currentStory = stories[currentIndex];
        if (!currentStory || !viewerId) return;

        spawnFloatingReactions(emoji);

        // Optimistic UI update
        const isTogglingOff = userReaction === reactionType;
        const newReaction = isTogglingOff ? null : reactionType;
        setUserReaction(newReaction);
        setTotalReactions(prev => Math.max(0, isTogglingOff ? prev - 1 : (userReaction ? prev : prev + 1)));

        try {
            const formData = new FormData();
            formData.append('user_id', viewerId);
            formData.append('story_id', String(currentStory.id));
            formData.append('reaction_type', reactionType);

            const res = await api.post('story_react.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setUserReaction(res.data.user_reaction);
                setTotalReactions(res.data.total_reactions);
                if (res.data.reactions_summary) {
                    setReactionsSummary(res.data.reactions_summary);
                }
            }
        } catch (e) {
            console.error("Error reacting to story:", e);
        }
    };

    // Send reply to story
    const sendReply = async () => {
        const text = replyText.trim();
        if (!text || sendingReply || !viewerId) return;

        const currentStory = stories[currentIndex];
        if (!currentStory) return;

        setSendingReply(true);
        try {
            const formData = new FormData();
            formData.append('user_id', viewerId);
            formData.append('story_id', String(currentStory.id));
            formData.append('story_owner_id', String(storyOwnerId));
            formData.append('message', text);

            const res = await api.post('story_reply.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setReplyText('');
                Keyboard.dismiss();
                setIsInputFocused(false);
                setReplyToast(`Reply sent to ${userName || 'user'}!`);
                setTimeout(() => setReplyToast(null), 2500);
                if (!showViewers && isFocused) {
                    resumeStory();
                }
            } else {
                Alert.alert("Error", res.data.message || "Failed to send reply");
            }
        } catch (e) {
            console.error("Error sending reply:", e);
            Alert.alert("Error", "Network error while sending reply");
        } finally {
            setSendingReply(false);
        }
    };

    const deleteStory = async () => {
        const story = stories[currentIndex];
        try {
            const formData = new FormData();
            formData.append('user_id', viewerId!);
            formData.append('story_id', String(story.id));

            const res = await api.post('delete_story.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.status === 'success') {
                import('react-native').then(({ DeviceEventEmitter }) => {
                    DeviceEventEmitter.emit('uploadSuccess', { source: 'story_delete' });
                });
                const newStories = stories.filter((s: any) => s.id !== story.id);
                if (newStories.length > 0) {
                    setStories(newStories);
                    setCurrentIndex((prev: number) => (prev >= newStories.length ? 0 : prev));
                } else {
                    navigation.goBack();
                }
            } else {
                Alert.alert("Delete Failed", res.data.message || "Could not delete story");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Network error while deleting");
        }
    };

    useEffect(() => {
        if (viewerId && stories[currentIndex]) {
            if (String(storyOwnerId) !== String(viewerId)) {
                markAsViewed(stories[currentIndex].id);
            } else {
                fetchViewers(stories[currentIndex].id);
            }
        }
    }, [currentIndex, viewerId]);

    const fetchViewers = async (storyId: string) => {
        try {
            const res = await api.get(`fetch_story_viewers.php?story_id=${storyId}`);
            if (res.data.status === 'success') {
                setViewers(res.data.data || []);
                if (res.data.total_reactions !== undefined) {
                    setTotalReactions(res.data.total_reactions);
                }
                if (res.data.reactions_summary) {
                    setReactionsSummary(res.data.reactions_summary);
                }
            }
        } catch (e) { console.error(e); }
    };

    const formatViewerTime = (dateString: string) => {
        if (!dateString) return '';
        try {
            const parts = dateString.split(' ');
            if (parts.length === 2) {
                const timeParts = parts[1].split(':');
                let hours = parseInt(timeParts[0], 10);
                const minutes = timeParts[1];
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                return `${hours}:${minutes} ${ampm}`;
            }
            return dateString;
        } catch {
            return dateString;
        }
    };

    const currentStory = stories[currentIndex];
    if (!currentStory) return null;

    const isVideo = currentStory.type === 'video';
    const isOwner = String(storyOwnerId) === String(viewerId);

    const renderViewersModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showViewers}
            onRequestClose={() => setShowViewers(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Story Activity</Text>
                            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' }}>
                                {viewers.length} views {totalReactions > 0 ? `• ${totalReactions} reactions` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowViewers(false)} style={{ padding: 6 }}>
                            <Ionicons name="close" size={24} color="#1E293B" />
                        </TouchableOpacity>
                    </View>

                    {/* Reaction summary pills */}
                    {totalReactions > 0 && (
                        <View style={styles.summaryChipsRow}>
                            {Object.entries(reactionsSummary).map(([type, count]: any) => {
                                const rObj = STORY_REACTIONS.find(r => r.type === type);
                                if (!rObj || count <= 0) return null;
                                return (
                                    <View key={type} style={styles.summaryChip}>
                                        <Text style={{ fontSize: 15 }}>{rObj.emoji}</Text>
                                        <Text style={styles.summaryChipText}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        {viewers.map((item, index) => {
                            const rObj = STORY_REACTIONS.find(r => r.type === item.reaction_type);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.viewerItem}
                                    onPress={() => {
                                        setShowViewers(false);
                                        pauseStory();
                                        (navigation as any).navigate('PublicProfile', { userId: item.user_id || item.id });
                                    }}
                                >
                                    <View style={{ position: 'relative' }}>
                                        <Image
                                            source={{ uri: item.profile_photo ? `${BASE_URL_ROOT}/uploads/photo/${item.profile_photo}` : 'https://via.placeholder.com/50' }}
                                            style={styles.viewerAvatar}
                                        />
                                        {rObj && (
                                            <View style={styles.viewerReactionBadge}>
                                                <Text style={{ fontSize: 11 }}>{rObj.emoji}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={styles.viewerName}>{item.name}</Text>
                                        <Text style={styles.viewerTime}>{formatViewerTime(item.date)}</Text>
                                    </View>
                                    {rObj && (
                                        <View style={[styles.reactionLabelPill, { backgroundColor: `${rObj.color}15` }]}>
                                            <Text style={{ fontSize: 14 }}>{rObj.emoji}</Text>
                                            <Text style={[styles.reactionLabelText, { color: rObj.color }]}>{rObj.label}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                        {viewers.length === 0 && (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Ionicons name="eye-outline" size={38} color="#94A3B8" />
                                <Text style={{ marginTop: 8, color: '#94A3B8', fontSize: 14 }}>No views yet.</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Progress Bars */}
            <View style={[styles.progressContainer, { paddingTop: Math.max(insets.top, 24) }]}>
                {stories.map((s: any, i: number) => (
                    <View key={i} style={styles.progressBarBackground}>
                        {i === currentIndex ? (
                            <Animated.View style={[styles.progressBarFill, {
                                width: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }]} />
                        ) : (
                            <View style={[styles.progressBarFill, { width: i < currentIndex ? '100%' : '0%' }]} />
                        )}
                    </View>
                ))}
            </View>

            {/* Header */}
            <View style={[styles.header, { top: Math.max(insets.top, 24) + 12 }]}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => {
                        pauseStory();
                        (navigation as any).navigate('PublicProfile', { userId: storyOwnerId });
                    }}
                >
                    <Image
                        source={{ uri: userPhoto ? `${PHOTO_URL}${userPhoto}` : 'https://via.placeholder.com/40' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.userName}>{userName || 'Story'}</Text>
                    <Text style={styles.time}>{new Date(currentStory.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>

                {currentStory.music_title && (
                    <View style={styles.musicLabel}>
                        <Ionicons name="musical-notes" size={14} color="white" />
                        <Text style={styles.musicLabelText} numberOfLines={1}>
                            {currentStory.music_title} - {currentStory.music_artist}
                        </Text>
                    </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isOwner && (
                        <TouchableOpacity onPress={deleteStory} style={{ padding: 8 }}>
                            <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Media Content */}
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.mediaContainer}
            >
                {isMediaLoading || !localMediaUrl ? (
                    <View style={[styles.media, { justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                ) : isVideo ? (
                    <Video
                        ref={videoRef}
                        source={{ uri: localMediaUrl }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={!paused && !showViewers && !isInputFocused && isFocused}
                        style={styles.media}
                        onPlaybackStatusUpdate={(status: any) => {
                            if (status.isLoaded) {
                                if (status.durationMillis && status.positionMillis) {
                                    progress.setValue(status.positionMillis / status.durationMillis);
                                }
                                if (status.didJustFinish && isFocusedRef.current && !isInputFocused) nextStory();
                            }
                        }}
                        onError={(e: any) => {
                            console.error("[StoryViewer Video] Error:", e, "URI:", localMediaUrl);
                        }}
                    />
                ) : (
                    <Image source={{ uri: localMediaUrl }} style={styles.media} contentFit="contain" />
                )}
            </TouchableOpacity>

            {/* Floating Flying Animated Reaction Particles */}
            {particles.map((p) => (
                <Animated.View
                    key={p.id}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        bottom: safeBottom + 70,
                        left: p.x,
                        zIndex: 999,
                        transform: [
                            {
                                translateY: p.anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -height * 0.65],
                                }),
                            },
                            {
                                translateX: p.anim.interpolate({
                                    inputRange: [0, 0.25, 0.5, 0.75, 1],
                                    outputRange: [0, p.wobble, -p.wobble * 0.7, p.wobble * 0.5, -p.wobble * 0.2],
                                }),
                            },
                            {
                                scale: p.anim.interpolate({
                                    inputRange: [0, 0.15, 0.8, 1],
                                    outputRange: [0.3, p.scale * 1.3, p.scale, p.scale * 0.7],
                                }),
                            },
                        ],
                        opacity: p.anim.interpolate({
                            inputRange: [0, 0.1, 0.7, 1],
                            outputRange: [0, 1, 0.9, 0],
                        }),
                    }}
                >
                    <Text style={{ fontSize: 34 }}>{p.emoji}</Text>
                </Animated.View>
            ))}

            {/* Center Double-Tap Big Glowing Heart */}
            {showBigHeart && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: height * 0.38,
                        left: (width - 120) / 2,
                        width: 120,
                        height: 120,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                        transform: [
                            {
                                scale: bigHeartAnim.interpolate({
                                    inputRange: [0, 0.6, 1],
                                    outputRange: [0, 1.4, 1],
                                }),
                            },
                        ],
                        opacity: bigHeartAnim,
                    }}
                >
                    <View style={{
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        borderRadius: 60,
                        padding: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)'
                    }}>
                        <Ionicons name="heart" size={80} color="#EF4444" />
                    </View>
                </Animated.View>
            )}

            {/* Toast Notification when Reply is sent */}
            {replyToast && (
                <View style={styles.toastContainer}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.toastText}>{replyToast}</Text>
                </View>
            )}

            {/* BOTTOM CONTROLS */}
            {isOwner ? (
                /* Viewers Footer (Only for Story Owner) */
                <TouchableOpacity
                    style={[styles.footer, { bottom: safeBottom }]}
                    onPress={() => setShowViewers(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.ownerStatsPill}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="eye" size={18} color="white" />
                            <Text style={styles.ownerStatsText}>{viewers.length} Views</Text>
                        </View>

                        {totalReactions > 0 && (
                            <>
                                <View style={styles.statsDivider} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="heart" size={18} color="#EF4444" />
                                    <Text style={styles.ownerStatsText}>{totalReactions} Reactions</Text>
                                </View>
                            </>
                        )}
                        <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
                    </View>
                </TouchableOpacity>
            ) : (
                /* Facebook-style Interactive Reaction & Reply Bar (For Viewers) */
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                    style={[styles.viewerFooterContainer, { bottom: footerBottom }]}
                >
                    {/* Quick Reactions Bar (hidden when keyboard is open to maximize story visibility) */}
                    {!isInputFocused && !isKeyboardVisible && (
                        <View style={styles.quickReactionsRow}>
                            {STORY_REACTIONS.map((r) => {
                                const isSelected = userReaction === r.type;
                                return (
                                    <TouchableOpacity
                                        key={r.type}
                                        activeOpacity={0.6}
                                        onPress={() => handleReactionPress(r.type, r.emoji)}
                                        style={[
                                            styles.quickReactionBtn,
                                            isSelected && styles.quickReactionBtnActive,
                                        ]}
                                    >
                                        <Text style={[styles.quickReactionEmoji, isSelected && { transform: [{ scale: 1.25 }] }]}>
                                            {r.emoji}
                                        </Text>
                                        {isSelected && <View style={styles.activeDot} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Reply Input Row */}
                    <View style={styles.replyInputRow}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.replyInput}
                                placeholder={`Send message to ${userName || 'user'}...`}
                                placeholderTextColor="rgba(255, 255, 255, 0.65)"
                                value={replyText}
                                onChangeText={setReplyText}
                                onFocus={() => {
                                    setIsInputFocused(true);
                                    pauseStory();
                                }}
                                onBlur={() => {
                                    setIsInputFocused(false);
                                    if (!showViewers && isFocused) resumeStory();
                                }}
                                returnKeyType="send"
                                onSubmitEditing={sendReply}
                            />
                        </View>

                        {replyText.trim().length > 0 ? (
                            <TouchableOpacity
                                onPress={sendReply}
                                disabled={sendingReply}
                                style={styles.sendBtn}
                                activeOpacity={0.7}
                            >
                                {sendingReply ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons name="send" size={19} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => handleReactionPress(userReaction === 'love' ? 'like' : 'love', userReaction === 'love' ? '👍' : '❤️')}
                                style={[
                                    styles.primaryLikeBtn,
                                    userReaction && {
                                        backgroundColor: userReaction === 'like' ? '#2563EB' : '#EF4444',
                                        borderColor: 'transparent'
                                    }
                                ]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={userReaction === 'like' ? 'thumbs-up' : 'heart'}
                                    size={22}
                                    color="#FFFFFF"
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            )}

            {renderViewersModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    progressContainer: { flexDirection: 'row', paddingHorizontal: 10, height: 44, zIndex: 10 },
    progressBarBackground: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 2 },
    progressBarFill: { height: 2.5, backgroundColor: 'white', borderRadius: 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, position: 'absolute', left: 0, right: 0, zIndex: 10 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10, borderWidth: 1.5, borderColor: '#FFFFFF' },
    userName: { color: 'white', fontWeight: 'bold', fontSize: 14, marginRight: 10 },
    time: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    musicLabel: {
        position: 'absolute',
        top: 96,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start'
    },
    musicLabelText: { color: 'white', fontSize: 12, marginLeft: 6, fontWeight: '600' },
    mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    media: { width: width, height: height * 0.74 },
    
    // Owner Footer
    footer: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
    ownerStatsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 20, 25, 0.85)',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6
    },
    ownerStatsText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    statsDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },

    // Viewer Footer (Facebook style)
    viewerFooterContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 14,
        zIndex: 20,
        gap: 10
    },
    quickReactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 20, 25, 0.85)',
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)'
    },
    quickReactionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        position: 'relative'
    },
    quickReactionBtnActive: {
        transform: [{ scale: 1.1 }]
    },
    quickReactionEmoji: {
        fontSize: 24
    },
    activeDot: {
        position: 'absolute',
        bottom: -2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3B82F6'
    },
    replyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'rgba(20, 20, 25, 0.85)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 16,
        height: 46,
        justifyContent: 'center'
    },
    replyInput: {
        color: '#FFFFFF',
        fontSize: 14,
        paddingVertical: 0
    },
    sendBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4
    },
    primaryLikeBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(20, 20, 25, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Toast Banner
    toastContainer: {
        position: 'absolute',
        top: 90,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        zIndex: 99
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },

    // Viewers Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '65%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    summaryChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155'
    },
    viewerItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    viewerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' },
    viewerReactionBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2
    },
    viewerName: { fontWeight: '700', fontSize: 14, color: '#0F172A' },
    viewerTime: { color: '#64748B', fontSize: 12, marginTop: 2 },
    reactionLabelPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    reactionLabelText: {
        fontSize: 12,
        fontWeight: '600'
    }
});

export default StoryViewerScreen;
