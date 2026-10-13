import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, RefreshControl, Linking, Alert, Modal, Pressable, StyleSheet, DeviceEventEmitter, Platform, Animated, Easing, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import PostImage from '../../components/PostImage';
import PostCard from '../../components/PostCard';
import { useLanguage } from '../../context/LanguageContext';
import { useBadge } from '../../context/BadgeContext';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import { ImageService } from '../../services/ImageService';
import socketService from '../../services/socket';
import StoryRing from '../../components/StoryRing';
import MatrimonyRingsIcon from '../../components/MatrimonyRingsIcon';
import NewsPaperIcon from '../../components/NewsPaperIcon';
import LinkUpHeader, { TOP_HEADER_COLLAPSE } from '../../components/LinkUpHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabSwipe } from '../../utils/useTabSwipe';

const { width } = Dimensions.get('window');

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;
const POST_IMAGE_URL = `${WEBSITE_URL}/uploads/posts/`;

interface User {
    id: string;
    name: string;
    profile_photo?: string;
    photo?: string;
    avatar?: string;
    is_business?: number;
}

const isVideo = (uri: string) => {
    return uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov');
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

// Reusable UserAvatar component that NEVER shows a blank circle
const UserAvatar = ({
    photoUrl,
    name,
    size = 40,
    fontSize = 16,
    style,
    borderWidth = 0,
    borderColor = 'transparent',
}: {
    photoUrl?: string | null;
    name?: string;
    size?: number;
    fontSize?: number;
    style?: any;
    borderWidth?: number;
    borderColor?: string;
}) => {
    const [hasError, setHasError] = React.useState(false);
    React.useEffect(() => {
        setHasError(false);
    }, [photoUrl]);

    const uri = !hasError ? resolvePhotoUri(photoUrl) : null;

    if (uri) {
        return (
            <ExpoImage
                source={{ uri }}
                style={[
                    { width: size, height: size, borderRadius: size / 2, borderWidth, borderColor, backgroundColor: '#E2E8F0' },
                    style,
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
                onError={() => setHasError(true)}
            />
        );
    }

    const initial = (name && name.trim().length > 0) ? name.trim().charAt(0).toUpperCase() : 'U';
    return (
        <View
            style={[
                style,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: '#1877F2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth,
                    borderColor,
                },
            ]}
        >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize }}>
                {initial}
            </Text>
        </View>
    );
};

// Facebook-style Create Story Card (always present as first item)
const CreateStoryCardItem = ({
    photoUri,
    onPress,
}: {
    photoUri: string | null;
    onPress: () => void;
}) => {
    const [imgError, setImgError] = React.useState(false);
    React.useEffect(() => {
        setImgError(false);
    }, [photoUri]);
    const showPhoto = !!photoUri && !imgError;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.88}
            style={{
                width: 105,
                height: 175,
                borderRadius: 16,
                backgroundColor: 'white',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginRight: 10,
                position: 'relative',
            }}
        >
            {/* Top half — User's Profile Photo or Blue camera placeholder */}
            <View style={{ width: '100%', height: 110, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                {showPhoto ? (
                    <ExpoImage
                        source={{ uri: photoUri! }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <LinearGradient
                        colors={['#2563EB', '#1D4ED8', '#1E40AF']}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <View style={{
                            width: 44, height: 44, borderRadius: 22,
                            backgroundColor: 'rgba(255,255,255,0.25)',
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
                        }}>
                            <Ionicons name="camera" size={22} color="#FFFFFF" />
                        </View>
                    </LinearGradient>
                )}
            </View>

            {/* Blue + button sitting on the divider */}
            <View
                style={{
                    position: 'absolute',
                    top: 92,
                    alignSelf: 'center',
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: '#1877F2',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 3, borderColor: 'white',
                    zIndex: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                }}
            >
                <Ionicons name="add" size={20} color="white" />
            </View>

            {/* Bottom half */}
            <View style={{
                flex: 1,
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 10,
                backgroundColor: 'white',
            }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                    Create Story
                </Text>
                <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '500', marginTop: 1 }}>
                    Share photo
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const HomeScreen = () => {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [posts, setPosts] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [reels, setReels] = useState<any[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const tabSwipe = useTabSwipe({ currentTab: 'Home', isBusiness: user?.is_business == 1 });
    const insets = useSafeAreaInsets();
    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top;

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

    const handleFeedScroll = useCallback((event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        // At the very top of feed (or pull-to-refresh), always smoothly reveal header
        if (currentY <= 10) {
            accumulatedScroll.current = 0;
            animateHeader(false);
            return;
        }

        if (diff > 0) {
            // User is scrolling DOWN
            if (accumulatedScroll.current < 0) {
                accumulatedScroll.current = 0;
            }
            accumulatedScroll.current += diff;

            // Trigger smooth hide once scrolled down by at least 24px and past top zone
            if (accumulatedScroll.current > 24 && currentY > 40) {
                animateHeader(true);
            }
        } else if (diff < 0) {
            // User is scrolling UP
            if (accumulatedScroll.current > 0) {
                accumulatedScroll.current = 0;
            }
            accumulatedScroll.current += diff;

            // Trigger smooth show once scrolled up by at least 18px
            if (accumulatedScroll.current < -18) {
                animateHeader(false);
            }
        }
    }, [animateHeader]);

    const handleLogout = () => {
        setShowMoreMenu(false);
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.removeItem('user');
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    }
                }
            ]
        );
    };
    const cursorScoreRef = useRef<string | null>(null);
    const cursorIdRef = useRef<number | null>(null);
    const statsFetchedRef = useRef<Set<string>>(new Set());
    const isFetchingRef = useRef(false);
    const fetchInitialFeedRef = useRef<Function | null>(null);
    const fetchStoriesOnlyRef = useRef<Function | null>(null);
    const lastStoriesFetchTimeRef = useRef<number>(0);
    const isFetchingStoriesRef = useRef<boolean>(false);
    const userRef = useRef<any>(null);
    const setUserWithRef = (u: any) => {
        userRef.current = u;
        setUser(u);
    };
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const [feedSeed, setFeedSeed] = useState(Math.floor(Math.random() * 100000) + 1);
    const { notificationCount, chatCount, refreshCounts } = useBadge();
    const navigation = useNavigation<any>();


    const flatListRef = useRef<FlatList>(null);
    const lastTabPress = useRef<number>(0);

    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', (e: any) => {
            const time = new Date().getTime();
            const delta = time - lastTabPress.current;
            if (delta < 300) {
                // Double tap detected
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                setRefreshing(true);
                fetchInitialFeedRef.current?.(userRef.current?.id, true);
                refreshCounts();
            }
            lastTabPress.current = time;
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const init = async () => {
            try {
                // Audio mode setup - static once per mount
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                });
            } catch (e) {
                console.error("Init Error:", e);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const { DeviceEventEmitter } = require('react-native');
        const subscription = DeviceEventEmitter.addListener('profileSwitched', async () => {
            try {
                const uStr = await AsyncStorage.getItem('user');
                if (uStr) {
                    const u = JSON.parse(uStr);
                    setUserWithRef(u);
                    fetchInitialFeed(u.id);
                    refreshCounts();
                }
            } catch (err) {
                console.error("Switch error:", err);
            }
        });

        const uploadSub = DeviceEventEmitter.addListener('uploadSuccess', () => {
            fetchStoriesOnlyRef.current?.(userRef.current?.id, true);
            fetchInitialFeed(userRef.current?.id, false); // false to avoid blocking loading indicator
        });

        const deleteSub = DeviceEventEmitter.addListener('postDeleted', (data: any) => {
            setPosts(prev => prev.filter(p => p.id !== data.postId));
        });

        return () => {
            subscription.remove();
            uploadSub.remove();
            deleteSub.remove();
        };
    }, []);

    useEffect(() => {
        const initUser = async () => {
            try {
                const uStr = await AsyncStorage.getItem('user');
                let u = null;
                if (uStr) {
                    u = JSON.parse(uStr);
                    setUserWithRef(u);
                }
                fetchInitialFeed(u?.id);
                refreshCounts();

                // Fetch fresh profile in background so latest profile_photo is always available
                if (u?.id) {
                    api.get(`/get_user_profile.php?user_id=${u.id}`).then(res => {
                        if (res.data?.status === 'success' && res.data.user) {
                            const fresh = { ...u, ...res.data.user };
                            if (fresh.profile_photo && !fresh.photo) fresh.photo = fresh.profile_photo;
                            if (fresh.photo && !fresh.profile_photo) fresh.profile_photo = fresh.photo;
                            setUserWithRef(fresh);
                            AsyncStorage.setItem('user', JSON.stringify(fresh));
                        }
                    }).catch(() => {});
                }
            } catch (err) {
                console.error("Init Error:", err);
                fetchInitialFeed();
                refreshCounts();
            }
        };
        initUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            const refreshUser = async () => {
                try {
                    const uStr = await AsyncStorage.getItem('user');
                    if (uStr && isMounted) {
                        const u = JSON.parse(uStr);
                        setUserWithRef(u);
                        if (u?.id) {
                            api.get(`/get_user_profile.php?user_id=${u.id}`).then(res => {
                                if (isMounted && res.data?.status === 'success' && res.data.user) {
                                    const fresh = { ...u, ...res.data.user };
                                    if (fresh.profile_photo && !fresh.photo) fresh.photo = fresh.profile_photo;
                                    if (fresh.photo && !fresh.profile_photo) fresh.profile_photo = fresh.photo;
                                    setUserWithRef(fresh);
                                    AsyncStorage.setItem('user', JSON.stringify(fresh));
                                }
                            }).catch(() => {});
                        }
                    }
                } catch (e) {}
            };
            refreshUser();
            return () => { isMounted = false; };
        }, [])
    );

    useEffect(() => {
        const handleCommentAdded = (data: any) => {
            setPosts(prev => prev.map(p => {
                if (p.id == data.post_id) {
                    if (Array.isArray(p.comments)) {
                        return { ...p, comments: [data.comment, ...p.comments] };
                    }
                    return { ...p, comments: Number(p.comments || 0) + 1 };
                }
                return p;
            }));
        };

        const handleCommentDeleted = (data: any) => {
            setPosts(prev => prev.map(p => {
                if (p.id == data.post_id) {
                    if (Array.isArray(p.comments)) {
                        return { ...p, comments: p.comments.filter((c: any) => c.comment_id != data.comment_id) };
                    }
                    return { ...p, comments: Math.max(0, Number(p.comments || 0) - 1) };
                }
                return p;
            }));
        };

        const handleLikeUpdated = (data: any) => {
            setPosts(prev => prev.map(p => {
                if (p.id == data.post_id) {
                    const newLikes = data.status === 'liked'
                        ? Number(p.likes || 0) + 1
                        : Math.max(0, Number(p.likes || 0) - 1);
                    if (user && data.user_id && String(data.user_id) === String(user.id)) {
                        return {
                            ...p,
                            likes: newLikes,
                            isLiked: data.status === 'liked',
                            user_liked: data.status === 'liked'
                        };
                    }
                    return { ...p, likes: newLikes };
                }
                return p;
            }));
        };

        const commentAddedSub = DeviceEventEmitter.addListener('post_comment_added', handleCommentAdded);
        const commentDeletedSub = DeviceEventEmitter.addListener('post_comment_deleted', handleCommentDeleted);
        const likeUpdatedSub = DeviceEventEmitter.addListener('post_like_updated', handleLikeUpdated);

        return () => {
            commentAddedSub.remove();
            commentDeletedSub.remove();
            likeUpdatedSub.remove();
        };
    }, [user]);

    // onRefresh is defined after fetchInitialFeed below

    const getImageUrl = (photo: string | undefined | null, type: 'photo' | 'post' = 'photo') => {
        if (!photo) return 'https://via.placeholder.com/100';
        if (photo.startsWith('http')) return photo;
        const baseUrl = type === 'photo' ? PHOTO_URL : POST_IMAGE_URL;
        return ImageService.getFeedImageUrl(`${baseUrl}${photo}`);
    };

    const handleLinkPress = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot open this link");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const loadCachedData = async (uid: string) => {
        try {
            const cachedStr = await AsyncStorage.getItem(`home_cache_${uid}`);
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                if (cached.posts) setPosts(cached.posts);
                if (cached.stories) setStories(cached.stories);
                if (cached.reels) {
                    setReels(cached.reels);
                    if (cached.reels.length > 0) {
                        const pageData = {
                            pages: [cached.reels],
                            pageParams: [0]
                        };
                        queryClient.setQueryData(['reels', undefined, uid, 0], pageData);
                        queryClient.setQueryData(['reels', undefined, null, 0], pageData);
                    }
                }
                if (cached.suggestedUsers) setSuggestedUsers(cached.suggestedUsers);
                setLoading(false); // Disable loading immediately since we have cached data
                return true;
            }
        } catch (e) {
            console.log("Cache load error", e);
        }
        return false;
    };

    const fetchPostStats = async (postIds: string[]) => {
        if (postIds.length === 0) return;
        try {
            const res = await api.get(`get_posts.php?action=fetch_post_stats_batch&post_ids=${postIds.join(',')}`);
            if (res.data.status === 'success') {
                const statsMap = res.data.data;
                setPosts(prevPosts => prevPosts.map(p => {
                    if (p.id && statsMap[p.id]) {
                        return {
                            ...p,
                            likes: statsMap[p.id].likes,
                            user_liked: statsMap[p.id].user_liked,
                            comments: statsMap[p.id].comments,
                            stats_loaded: true
                        };
                    }
                    return p;
                }));
            }
        } catch (e) {
            console.error("Stats fetch error", e);
        }
    };

    const fetchInitialFeed = async (userId?: string, isRefresh: boolean = false) => {
        // For manual refresh: always force-reset and proceed
        if (isRefresh) {
            isFetchingRef.current = false;
        } else {
            if (!navigation.isFocused() && posts.length > 0) return;
            if (isFetchingRef.current) return;
        }

        const uid = userId || userRef.current?.id || user?.id;
        const finalUid = uid || 0;

        isFetchingRef.current = true;
        cursorScoreRef.current = null;
        cursorIdRef.current = null;
        statsFetchedRef.current.clear();
        setHasMore(true);

        let hasCache = false;
        if (uid && !isRefresh) {
            hasCache = await loadCachedData(uid.toString());
        }

        if (!hasCache) {
            setPosts([]);
            setStories([]);
            setReels([]);
            setLoading(true);
        }

        try {
            const currentSeed = isRefresh ? Math.floor(Math.random() * 100000) + 1 : feedSeed;
            if (isRefresh) setFeedSeed(currentSeed);

            console.log(`[HomeScreen API] Fetching INITIAL get_posts.php?seed=${currentSeed}`);
            const [postsRes, storiesRes, reelsRes, suggestRes] = await Promise.all([
                api.get(`get_posts.php?user_id=${finalUid}&limit=20&seed=${currentSeed}&lazy=true`),
                api.get('fetch_stories.php?user_id=' + finalUid),
                api.get('get_posts.php?filter_reels=1&limit=4&user_id=' + finalUid),
                api.get(`api_follow.php?action=fetch_suggestions&current_user_id=${finalUid}&limit=10`)
            ]);

            let finalReels = reels;
            let finalPosts: any[] = [];
            let finalStories: any[] = [];
            let finalSuggestedUsers: any[] = [];
            let idsToFetchStats: string[] = [];

            if (reelsRes.data.status === 'success' && Array.isArray(reelsRes.data.data)) {
                finalReels = reelsRes.data.data.filter((p: any) => p.media && p.media.some((m: string) => isVideo(m)));
                setReels(finalReels);
            }

            if (postsRes.data.status === 'success') {
                const newPosts = postsRes.data.data;
                if (newPosts.length < 20) setHasMore(false);
                idsToFetchStats = newPosts.map((p: any) => p.id);

                if (newPosts.length > 0) {
                    const lastPost = newPosts[newPosts.length - 1];
                    if (lastPost.rand_score !== undefined) {
                        cursorScoreRef.current = lastPost.rand_score;
                        cursorIdRef.current = lastPost.id;
                    }
                }

                finalPosts = [...newPosts];
                if (suggestRes.data.status === 'success' && suggestRes.data.data?.length > 0) {
                    finalPosts.splice(1, 0, { id: 'suggest_users_shelf', type: 'suggest_users_shelf' });
                }
                if (finalReels.length > 0 && finalPosts.length > 0) {
                    const targetIndex = finalPosts.length > 9 ? 9 : finalPosts.length;
                    finalPosts.splice(targetIndex, 0, { id: 'reels_shelf', type: 'reels_shelf' });
                }
                setPosts(finalPosts);
                if (finalPosts.length > 0) {
                    const firstRealPost = finalPosts.find(p => p.type !== 'reels_shelf' && p.type !== 'suggest_users_shelf');
                    setActivePostId(firstRealPost ? firstRealPost.id?.toString() : finalPosts[0].id?.toString());
                }
            }

            if (storiesRes.data.status === 'success') {
                lastStoriesFetchTimeRef.current = Date.now();
                const myStories = storiesRes.data.my_stories || [];
                const others = storiesRes.data.others || [];
                const list: any[] = [];
                // 1. Create Story card is ALWAYS first
                list.push({ id: 'create_story_card', isCreateCard: true });
                // 2. If user has active stories, show 'Your Story' card
                if (myStories.length > 0) {
                    list.push({
                        id: 'my_story_card',
                        name: 'Your Story',
                        profile_photo: userRef.current?.profile_photo || user?.profile_photo,
                        stories: myStories,
                        isMine: true,
                    });
                }
                finalStories = [...list, ...others];
                setStories(finalStories);
            }

            if (suggestRes.data.status === 'success' && Array.isArray(suggestRes.data.data)) {
                finalSuggestedUsers = suggestRes.data.data;
                setSuggestedUsers(finalSuggestedUsers);
            }

            if (idsToFetchStats.length > 0) {
                const newStatsIds = idsToFetchStats.filter(id => !statsFetchedRef.current.has(id));
                if (newStatsIds.length > 0) {
                    newStatsIds.forEach(id => statsFetchedRef.current.add(id));
                    fetchPostStats(newStatsIds);
                }
            }

            if (finalUid) {
                const cacheData = { posts: finalPosts, stories: finalStories, reels: finalReels, suggestedUsers: finalSuggestedUsers };
                AsyncStorage.setItem(`home_cache_${finalUid}`, JSON.stringify(cacheData)).catch(e => console.log('Cache save err', e));
            }
        } catch (error: any) {
            console.error("Fetch Data Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    };
    // Always keep ref updated so onRefresh can call latest version
    fetchInitialFeedRef.current = fetchInitialFeed;

    // Defined AFTER fetchInitialFeed to avoid stale closure issues
    const onRefresh = useCallback(() => {
        console.log('[HomeScreen] onRefresh called, user=', userRef.current?.id);
        setRefreshing(true);
        refreshCounts();
        fetchInitialFeedRef.current?.(userRef.current?.id, true);
    }, []);

    const fetchStoriesOnly = useCallback(async (uid?: string, force: boolean = false) => {
        const finalUid = uid || userRef.current?.id || 0;
        if (!finalUid) return; // Do not fetch with 0 before user is initialized

        const now = Date.now();
        if (!force) {
            if (isFetchingStoriesRef.current) return;
            // Prevent redundant fetches within 20 seconds
            if (now - lastStoriesFetchTimeRef.current < 20000) return;
        }

        isFetchingStoriesRef.current = true;
        try {
            const storiesRes = await api.get('fetch_stories.php?user_id=' + finalUid);
            lastStoriesFetchTimeRef.current = Date.now();
            if (storiesRes.data.status === 'success') {
                const myStories = storiesRes.data.my_stories || [];
                const others = storiesRes.data.others || [];
                const list: any[] = [];
                list.push({ id: 'create_story_card', isCreateCard: true });
                if (myStories.length > 0) {
                    list.push({
                        id: 'my_story_card',
                        name: 'Your Story',
                        profile_photo: userRef.current?.profile_photo || userRef.current?.photo,
                        stories: myStories,
                        isMine: true,
                    });
                }
                setStories([...list, ...others]);
            }
        } catch (e) {
            console.log('[HomeScreen] fetchStoriesOnly error:', e);
        } finally {
            isFetchingStoriesRef.current = false;
        }
    }, []);
    fetchStoriesOnlyRef.current = fetchStoriesOnly;

    useFocusEffect(
        useCallback(() => {
            fetchStoriesOnly();
        }, [fetchStoriesOnly])
    );

    const fetchNextPage = async () => {
        if (!hasMore || loading || isFetchingRef.current || cursorScoreRef.current === null || cursorIdRef.current === null) return;

        const finalUid = user?.id || 0;
        isFetchingRef.current = true;
        setIsFetchingMore(true);

        try {
            console.log(`[HomeScreen API] Fetching NEXT PAGE get_posts.php?seed=${feedSeed}&cursor_score=${cursorScoreRef.current}&cursor_id=${cursorIdRef.current}`);
            const postsRes = await api.get(`get_posts.php?user_id=${finalUid}&limit=20&seed=${feedSeed}&cursor_score=${cursorScoreRef.current}&cursor_id=${cursorIdRef.current}&lazy=true`);

            if (postsRes.data.status === 'success') {
                const newPosts = postsRes.data.data;
                if (newPosts.length < 20) setHasMore(false);

                if (newPosts.length > 0) {
                    const lastPost = newPosts[newPosts.length - 1];
                    if (lastPost.rand_score !== undefined) {
                        cursorScoreRef.current = lastPost.rand_score;
                        cursorIdRef.current = lastPost.id;
                    }

                    const idsToFetchStats = newPosts.map((p: any) => p.id);
                    const newStatsIds = idsToFetchStats.filter((id: string) => !statsFetchedRef.current.has(id));
                    if (newStatsIds.length > 0) {
                        newStatsIds.forEach((id: string) => statsFetchedRef.current.add(id));
                        fetchPostStats(newStatsIds);
                    }

                    setPosts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNew = newPosts.filter((p: any) => !existingIds.has(p.id));
                        return [...prev, ...uniqueNew];
                    });
                }
            }
        } catch (error: any) {
            console.error("Fetch Next Page Error:", error);
        } finally {
            setIsFetchingMore(false);
            isFetchingRef.current = false;
        }
    };


    const handlePlusPress = () => {
        setShowUploadModal(true);
    };

    const handleFollowUser = async (targetId: string) => {
        if (!user?.id) return;
        try {
            const formData = new FormData();
            formData.append('current_user_id', user.id);
            formData.append('user_id', targetId);
            await api.post('api_follow.php?action=follow', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFollowedUsers(prev => new Set([...prev, targetId]));
        } catch (e) {
            console.error('Follow error:', e);
        }
    };

    const renderStoryItem = ({ item }: { item: any }) => {
        // 1. Create Story Card (Always present as first item)
        if (item.isCreateCard) {
            const myPhoto = user?.profile_photo || (user as any)?.photo || (user as any)?.avatar || userRef.current?.profile_photo || (userRef.current as any)?.photo || (userRef.current as any)?.avatar;
            const photoUri = resolvePhotoUri(myPhoto);
            return (
                <CreateStoryCardItem
                    photoUri={photoUri}
                    onPress={() => navigation.navigate('CreateStory')}
                />
            );
        }

        // Fix: story media from API comes as "uploads/stories/xxx.jpg" — prepend WEBSITE_URL directly
        const getStoryMediaUrl = (media: string) => {
            if (!media) return null;
            if (media.startsWith('http')) return media;
            return `${WEBSITE_URL}/${media}`;
        };

        const myPhoto = user?.profile_photo || (user as any)?.photo || userRef.current?.profile_photo || (userRef.current as any)?.photo;
        const validPhoto = myPhoto && myPhoto !== 'null' && myPhoto !== 'undefined' && !myPhoto.includes('via.placeholder');
        const photoUrl = item.isMine ? (validPhoto ? myPhoto : null) : item.profile_photo;

        const storyCover = (item.stories && item.stories[0]?.media)
            ? getStoryMediaUrl(item.stories[0].media)
            : (photoUrl ? (photoUrl.startsWith('http') ? photoUrl : `${PHOTO_URL}${photoUrl}`) : null);

        const handlePress = () => {
            if (!item.isMine) {
                setStories(prev => prev.map(s => s.id === item.id ? { ...s, unseen_count: 0 } : s));
            }
            navigation.navigate('StoryViewer', {
                stories: item.stories,
                initialIndex: 0,
                userId: item.isMine ? user?.id : item.user_id,
                userName: item.isMine ? (user?.name || 'Your Story') : item.name,
                userPhoto: photoUrl,
            });
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.85}
                style={homeStyles.storyCard}
            >
                {/* Always show gradient background as base */}
                <LinearGradient
                    colors={item.isMine ? ['#1E3A8A', '#0F172A'] : ['#1e293b', '#0f172a']}
                    style={StyleSheet.absoluteFill}
                />
                {storyCover ? (
                    <Image
                        source={{ uri: storyCover }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                ) : null}
                <LinearGradient
                    colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.85)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Top Row: Avatar with story ring + story count badge for Your Story */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        borderWidth: 2.5,
                        borderColor: item.isMine ? '#3B82F6' : (item.unseen_count > 0 ? '#1877F2' : '#94A3B8'),
                        overflow: 'hidden',
                        backgroundColor: '#1E293B',
                    }}>
                        <UserAvatar
                            photoUrl={photoUrl}
                            name={item.isMine ? (user?.name || 'You') : item.name}
                            size={34}
                            fontSize={13}
                        />
                    </View>

                    {item.isMine && item.stories?.length > 0 && (
                        <View style={{
                            backgroundColor: '#2563EB',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>
                                {item.stories.length}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom: Name */}
                <Text style={homeStyles.storyCardName} numberOfLines={1}>
                    {item.isMine ? 'Your Story' : item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const [activePostId, setActivePostId] = useState<string | null>(null);

    const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            const firstPost = viewableItems.find((vi: any) =>
                vi.item &&
                vi.item.type !== 'reels_shelf' &&
                vi.item.type !== 'suggest_users_shelf'
            );

            if (firstPost) {
                const activeId = firstPost.key ? firstPost.key.toString() : null;
                setActivePostId(activeId);
            } else if (viewableItems[0]) {
                setActivePostId(viewableItems[0].key?.toString());
            }
        }
    }).current;

    const viewabilityConfig = React.useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 250,
    }).current;

    const renderHeader = () => (
        <>
            {/* 1. Stories Rail */}
            <View style={{ backgroundColor: 'white', paddingVertical: 12, paddingLeft: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' }}>
                <FlatList
                    data={stories}
                    renderItem={renderStoryItem}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            {/* 2. "What's on your mind?" Input Box Card */}
            <View style={homeStyles.composerCard}>
                <View style={homeStyles.composerTopRow}>
                    <TouchableOpacity onPress={() => user?.id && navigation.navigate('PublicProfile', { userId: user.id })} activeOpacity={0.8}>
                        <UserAvatar
                            photoUrl={user?.profile_photo || (user as any)?.photo || (user as any)?.avatar || userRef.current?.profile_photo || (userRef.current as any)?.photo || (userRef.current as any)?.avatar}
                            name={user?.name || userRef.current?.name}
                            size={40}
                            fontSize={16}
                            style={homeStyles.composerAvatar}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={homeStyles.composerInputButton}
                        onPress={() => navigation.navigate('CreatePost')}
                        activeOpacity={0.7}
                    >
                        <Text style={homeStyles.composerInputText}>What's on your mind?</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider line */}
                <View style={homeStyles.composerDivider} />

                {/* 3 Action Buttons */}
                <View style={homeStyles.composerActionRow}>
                    <TouchableOpacity
                        style={homeStyles.composerActionButton}
                        onPress={() => Alert.alert("Live Video", "Live streaming feature is coming soon!")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="videocam" size={20} color="#EF4444" />
                        <Text style={homeStyles.composerActionText}>Live</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={homeStyles.composerActionButton}
                        onPress={() => navigation.navigate('CreatePost')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="images" size={20} color="#22C55E" />
                        <Text style={homeStyles.composerActionText}>Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={homeStyles.composerActionButton}
                        onPress={() => navigation.navigate('CreatePost')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="happy" size={20} color="#F59E0B" />
                        <Text style={homeStyles.composerActionText}>Feeling</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    const renderSuggestShelf = () => (
        <View className="bg-white py-4 mb-2 border-y border-gray-100">
            <View className="flex-row justify-between items-center px-5 mb-3.5">
                <View className="flex-row items-center">
                    <Ionicons name="people" size={18} color="#2563EB" />
                    <Text className="font-bold text-blue-900 text-sm ml-2">{t('peopleYouMayKnow')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.push('FollowList', { userId: user?.id, action: 'fetch_all_members', title: 'All Members' })} activeOpacity={0.7}>
                    <Text className="text-blue-600 font-bold text-xs">{t('viewAll') || 'See All'}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={suggestedUsers}
                keyExtractor={(item) => `suggest-${item.id}`}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
                renderItem={({ item }) => {
                    const isFollowed = followedUsers.has(item.id?.toString());
                    return (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
                            className="mr-3 w-32 bg-white rounded-2xl border border-gray-100 items-center py-4 px-2 shadow-sm"
                            activeOpacity={0.8}
                        >
                            {item.photo ? (
                                <Image
                                    source={{ uri: `${getImageUrl(item.photo)}` }}
                                    className="w-14 h-14 rounded-full bg-slate-100 mb-2.5 border border-orange-100"
                                />
                            ) : (
                                <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mb-2.5 border border-orange-100">
                                    <Text className="text-blue-600 font-bold text-lg">{item.full_name?.[0] || item.name?.[0] || '?'}</Text>
                                </View>
                            )}
                            <Text className="text-blue-900 font-semibold text-xs text-center px-1" numberOfLines={1}>{item.full_name || item.name}</Text>
                            {item.city ? <Text className="text-gray-400 text-[10px] mt-0.5" numberOfLines={1}>{item.city}</Text> : null}
                            <TouchableOpacity
                                onPress={() => handleFollowUser(item.id?.toString())}
                                className={`mt-3 px-4 py-1.5 rounded-full ${isFollowed ? 'bg-slate-100 border border-slate-200' : 'bg-blue-600'}`}
                                activeOpacity={0.7}
                            >
                                <Text className={`text-[10px] font-bold ${isFollowed ? 'text-slate-500' : 'text-white'}`}>
                                    {isFollowed ? t('followingStatus') : t('followStatus')}
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );

    const renderReelsShelf = () => (
        <View className="bg-white py-4 mb-2 border-y border-gray-100">
            <View className="flex-row justify-between items-center px-5 mb-3.5">
                <View className="flex-row items-center">
                    <Ionicons name="videocam" size={18} color="#2563EB" />
                    <Text className="font-bold text-blue-900 text-sm ml-2">{t('reels')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Reels')} activeOpacity={0.7}>
                    <Text className="text-blue-600 font-bold text-xs">{t('viewAll')}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ id: 'create_reel', isCreate: true }, ...reels]}
                keyExtractor={(item) => `shelf-${item.id}`}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
                renderItem={({ item }) => {
                    if (item.isCreate) {
                        return (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CreateReel')}
                                className="mr-3 w-32 h-52 rounded-2xl bg-blue-50/50 items-center justify-center border border-orange-100 border-dashed"
                                activeOpacity={0.7}
                            >
                                <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mb-2">
                                    <Ionicons name="add" size={24} color="#2563EB" />
                                </View>
                                <Text className="text-blue-950 font-bold text-xs">{t('create')}</Text>
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Reels', { initialReelId: item.id })}
                            className="mr-3 w-32 h-52 rounded-2xl overflow-hidden bg-gray-900 relative shadow-md"
                            activeOpacity={0.8}
                        >
                            <Image
                                source={{ uri: getImageUrl(item.media?.find((m: string) => !isVideo(m)) || item.image, 'post') }}
                                style={{ width: '100%', height: '100%', opacity: 0.9 }}
                                resizeMode="cover"
                            />
                            {/* Play Icon Overlay for Reels */}
                            <View style={StyleSheet.absoluteFill} className="items-center justify-center">
                                <View className="bg-white/20 border border-white/20 p-2 rounded-full">
                                    <Ionicons name="play-circle-outline" size={28} color="white" />
                                </View>
                            </View>
                            {/* Simple Bottom Overlay */}
                            <View className="absolute bottom-0 left-0 right-0 p-2.5 bg-black/40 justify-center">
                                <Text className="text-white text-[10px] font-semibold" numberOfLines={1}>{item.name}</Text>
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="heart" size={8} color="white" />
                                    <Text className="text-white text-[9px] font-bold ml-1">{item.likes || 0}</Text>
                                </View>
                            </View>
                            <View className="absolute top-2 right-2 bg-black/30 p-1.5 rounded-full">
                                <Ionicons name="videocam" size={12} color="white" />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );

    const renderPostItem = ({ item }: { item: any }) => {
        if (item.type === 'reels_shelf') {
            return renderReelsShelf();
        }
        if (item.type === 'suggest_users_shelf') {
            return renderSuggestShelf();
        }
        return (
            <View className="w-full">
                <PostCard
                    post={{
                        id: item.id,
                        user: {
                            id: item.user_id,
                            name: item.name,
                            avatar: getImageUrl(item.profile_photo, 'photo'),
                            is_business: item.is_business,
                            category: item.category,
                        } as any,
                        content: item.description,
                        media: item.media,
                        image: item.image,
                        likes: parseInt(item.likes) || 0,
                        comments: item.comments?.length || 0,
                        timeAgo: item.date,
                        isLiked: item.user_liked,
                        isSaved: Boolean(item.user_saved || item.is_saved),
                        link: item.link
                    }}
                    currentUserId={user?.id}
                    onUserPress={() => navigation.navigate('PublicProfile', { userId: item.user_id })}
                    onDeletePress={() => {
                        Alert.alert(
                            "Delete Post",
                            "Are you sure you want to delete this post?",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: async () => {
                                        try {
                                            const formData = new FormData();
                                            formData.append('post_id', item.id);
                                            formData.append('user_id', user?.id || '');
                                            const res = await api.post('remove_post.php', formData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            if (res.data.status === 'success') {
                                                setPosts(prev => prev.filter(p => p.id !== item.id));
                                                DeviceEventEmitter.emit('postDeleted', { postId: item.id });
                                                Alert.alert(t('success'), "Post deleted");
                                            } else {
                                                Alert.alert(t('error'), res.data.message || "Failed to delete");
                                            }
                                        } catch (error) {
                                            console.error(error);
                                            Alert.alert(t('error'), "Something went wrong");
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                    shouldPlay={String(activePostId) === String(item.id)}
                />
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-blue-50">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F1F5F9]" edges={[]} {...tabSwipe.panHandlers}>
            <LinkUpHeader
                currentTab="Home"
                headerAnim={headerAnim}
                user={user}
                onTabPress={(tab) => {
                    if (tab === 'Home') {
                        animateHeader(false);
                        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }
                }}
                onPlusPress={handlePlusPress}
                tabSwipeHandlers={tabSwipe.panHandlers}
                statusBarHeight={statusBarHeight}
            />

            <FlashList
                ref={flatListRef as any}
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id.toString()}
                getItemType={(item) => {
                    if (item.type === 'reels_shelf') return 'reels';
                    if (item.type === 'suggest_users_shelf') return 'suggest';
                    return 'post';
                }}
                extraData={activePostId}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2563EB']}
                        tintColor="#2563EB"
                        progressViewOffset={statusBarHeight + 116}
                    />
                }
                onScroll={handleFeedScroll}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                // @ts-ignore
                estimatedItemSize={600}
                contentContainerStyle={{ paddingTop: statusBarHeight + 116, paddingBottom: 100, backgroundColor: '#F8FAFC' }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="newspaper-outline" size={48} color="#ccc" />
                        <Text className="text-slate-500 mt-4">{t('noPosts')}</Text>
                    </View>
                }
                onEndReached={() => fetchNextPage()}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetchingMore ? (
                    <View style={{ paddingVertical: 20 }}>
                        <ActivityIndicator color="#2563EB" />
                    </View>
                ) : null}
            />


            {/* Professional Upload Modal */}
            <Modal
                visible={showUploadModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUploadModal(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowUploadModal(false)}
                >
                    <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
                        <View className="items-center mb-6">
                            <View className="w-12 h-1.5 bg-slate-200 rounded-full mb-6" />
                            <Text className="text-xl font-bold text-blue-900">{t('createNew')}</Text>
                            <Text className="text-slate-500 text-sm mt-1">{t('whatToShare')}</Text>
                        </View>

                        <View className="gap-3">
                            <TouchableOpacity
                                className="flex-row items-center p-4 bg-blue-50 rounded-2xl border border-orange-100"
                                onPress={() => { setShowUploadModal(false); navigation.navigate('CreatePost'); }}
                            >
                                <View className="w-12 h-12 bg-white rounded-xl items-center justify-center shadow-sm">
                                    <Ionicons name="create" size={24} color="#2563EB" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-blue-900">Create Post</Text>
                                    <Text className="text-slate-500 text-xs">Share your photos and thoughts</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center p-4 bg-purple-50 rounded-2xl border border-purple-100"
                                onPress={() => { setShowUploadModal(false); navigation.navigate('CreateReel'); }}
                            >
                                <View className="w-12 h-12 bg-white rounded-xl items-center justify-center shadow-sm">
                                    <Ionicons name="videocam" size={24} color="#8b5cf6" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-blue-900">Create Reel</Text>
                                    <Text className="text-slate-500 text-xs">Record and share short videos</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center p-4 bg-blue-50 rounded-2xl border border-blue-100"
                                onPress={() => { setShowUploadModal(false); navigation.navigate('CreateStory'); }}
                            >
                                <View className="w-12 h-12 bg-white rounded-xl items-center justify-center shadow-sm">
                                    <Ionicons name="camera" size={24} color="#3b82f6" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-blue-900">Add Story</Text>
                                    <Text className="text-slate-500 text-xs">Share a moment for 24 hours</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="mt-4 p-4 items-center"
                                onPress={() => setShowUploadModal(false)}
                            >
                                <Text className="text-gray-400 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const homeStyles = StyleSheet.create({
    morePillBtn: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 4,
        marginHorizontal: 4,
    },
    morePillBtnActive: {
        borderColor: '#1877F2',
        backgroundColor: '#EFF6FF',
    },
    createStoryCard: {
        width: 105,
        height: 175,
        borderRadius: 16,
        backgroundColor: 'white',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 10,
        position: 'relative',
    },
    createStoryTopHalf: {
        width: '100%',
        height: 110,
        backgroundColor: '#F1F5F9',
    },
    createStoryAddCircle: {
        position: 'absolute',
        top: 92,
        alignSelf: 'center',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    createStoryBottomHalf: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 10,
        backgroundColor: 'white',
    },
    createStoryText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    storyCard: {
        width: 105,
        height: 175,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 10,
        backgroundColor: '#0F172A',
        position: 'relative',
        justifyContent: 'space-between',
        padding: 8,
    },
    storyCardAvatarWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2.5,
        borderColor: '#1877F2',
        overflow: 'hidden',
        backgroundColor: 'white',
    },
    storyCardAvatar: {
        width: '100%',
        height: '100%',
    },
    storyCardName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        paddingHorizontal: 2,
    },
    composerCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        marginHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F0F2F5',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    composerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    composerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
    },
    composerInputButton: {
        flex: 1,
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 40,
        justifyContent: 'center',
        marginLeft: 10,
    },
    composerInputText: {
        fontSize: 14,
        color: '#64748B',
    },
    composerDivider: {
        height: 1,
        backgroundColor: '#F0F2F5',
        marginVertical: 10,
    },
    composerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    composerActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    composerActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginLeft: 6,
    },
    moreModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 95,
        paddingRight: 12,
    },
    moreMenuCard: {
        width: 260,
        maxHeight: Dimensions.get('window').height * 0.75,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    moreMenuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    moreMenuTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    moreMenuCloseBtn: {
        padding: 4,
    },
    moreMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 10,
    },
    moreMenuIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    moreMenuItemLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
});

export default HomeScreen;
