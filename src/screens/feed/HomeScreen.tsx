import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, RefreshControl, Linking, Alert, Modal, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const { width } = Dimensions.get('window');

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;
const POST_IMAGE_URL = `${WEBSITE_URL}/uploads/posts/`;

interface User {
    id: string;
    name: string;
    profile_photo?: string;
    is_business?: number;
}

const isVideo = (uri: string) => {
    return uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov');
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
    const cursorScoreRef = useRef<string | null>(null);
    const cursorIdRef = useRef<number | null>(null);
    const statsFetchedRef = useRef<Set<string>>(new Set());
    const isFetchingRef = useRef(false);
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
                fetchInitialFeed();
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
                    setUser(u);
                    setPosts([]); // Clear visually to show refresh
                    setStories([]);
                    setReels([]);
                    fetchInitialFeed(u.id);
                    refreshCounts();
                }
            } catch (err) {
                console.error("Switch error:", err);
            }
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const initUser = async () => {
            try {
                const uStr = await AsyncStorage.getItem('user');
                let u = null;
                if (uStr) {
                    u = JSON.parse(uStr);
                    setUser(u);
                }
                fetchInitialFeed(u?.id);
                refreshCounts();
            } catch (err) {
                console.error("Init Error:", err);
                fetchInitialFeed();
                refreshCounts();
            }
        };
        initUser();
    }, []);

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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        refreshCounts();
        setFeedSeed(Math.floor(Math.random() * 100000) + 1);
        fetchInitialFeed();
    }, []);

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
            }
        } catch (e) {
            console.log("Cache load error", e);
        }
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

    const fetchInitialFeed = async (userId?: string) => {
        if (!navigation.isFocused() && posts.length > 0) return;
        if (isFetchingRef.current) return;
        
        const uid = userId || user?.id;
        if (!uid && loading && !userId) return; 
        const finalUid = uid || 0;

        isFetchingRef.current = true;
        if (posts.length === 0) setLoading(true);
        cursorScoreRef.current = null;
        cursorIdRef.current = null;
        statsFetchedRef.current.clear();
        setHasMore(true);

        if (uid) await loadCachedData(uid.toString());

        try {
            console.log(`[HomeScreen API] Fetching INITIAL get_posts.php?seed=${feedSeed}`);
            const [postsRes, storiesRes, reelsRes, suggestRes] = await Promise.all([
                api.get(`get_posts.php?user_id=${finalUid}&limit=20&seed=${feedSeed}&lazy=true`),
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
                const myStories = storiesRes.data.my_stories || [];
                const others = storiesRes.data.others || [];
                const list = [];
                if (myStories.length > 0) {
                    list.push({ id: 'mine', name: 'You', profile_photo: user?.profile_photo, stories: myStories, isMine: true });
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
        // 1. Add Story Button
        if (item.isAdd) {
            return (
                <TouchableOpacity
                    style={{ alignItems: 'center', marginRight: 16 }}
                    onPress={() => navigation.navigate('CreateStory')}
                    activeOpacity={0.8}
                >
                    <View style={{ width: 56, height: 56, borderRadius: 28, position: 'relative', marginBottom: 6 }}>
                        {user?.profile_photo ? (
                            <Image
                                source={{ uri: `${PHOTO_URL}${user?.profile_photo}` }}
                                style={{ width: '100%', height: '100%', borderRadius: 28, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' }}
                            />
                        ) : (
                            <View style={{ width: '100%', height: '100%', borderRadius: 28, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}>
                                <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 18 }}>
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </Text>
                            </View>
                        )}
                        {/* Floating plus badge overlay */}
                        <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ea580c', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
                            <Ionicons name="add" size={14} color="white" />
                        </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#4b5563', fontWeight: 'bold' }}>{t('add')}</Text>
                </TouchableOpacity>
            );
        }

        // 2. Story Bubble
        const hasUnseen = item.isMine ? false : (parseInt(item.unseen_count) > 0);
        return (
            <TouchableOpacity
                style={{ alignItems: 'center', marginRight: 16 }}
                onPress={() => {
                    navigation.navigate('StoryViewer', {
                        stories: item.stories,
                        initialIndex: 0,
                        userId: item.isMine ? user?.id : item.user_id,
                        userName: item.name,
                        userPhoto: item.profile_photo,
                    });
                }}
                activeOpacity={0.8}
            >
                <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    borderWidth: 2,
                    borderColor: hasUnseen ? '#ea580c' : '#e5e7eb',
                    padding: 2.5,
                    marginBottom: 6,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    {item.profile_photo ? (
                        <Image
                            source={{ uri: `${PHOTO_URL}${item.profile_photo}` }}
                            style={{ width: '100%', height: '100%', borderRadius: 28, backgroundColor: '#f3f4f6' }}
                        />
                    ) : (
                        <View style={{ width: '100%', height: '100%', borderRadius: 28, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 18 }}>
                                {item.isMine ? 'Y' : (item.name ? item.name.charAt(0).toUpperCase() : 'U')}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={{ fontSize: 10, color: '#374151', fontWeight: 'bold', maxWidth: 60, textAlign: 'center' }} numberOfLines={1}>
                    {item.isMine ? t('you') : item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const [activePostId, setActivePostId] = useState<string | null>(null);

    const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            // Find the item currently at the top of the viewport
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
            <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <TouchableOpacity onPress={() => user?.id && navigation.navigate('PublicProfile', { userId: user.id })} activeOpacity={0.8}>
                    <Image
                        source={{ uri: user?.profile_photo ? `${PHOTO_URL}${user?.profile_photo}` : 'https://via.placeholder.com/100' }}
                        style={{ width: 38, height: 38, borderRadius: 19, marginRight: 12, borderWidth: 1, borderColor: '#ffedd5', backgroundColor: '#f9fafb' }}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    onPress={() => navigation.navigate('CreatePost')}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 13, color: '#9ca3af', fontWeight: '500', flex: 1 }}>{t('whatsOnYourMind') || "What's on your mind?"}</Text>
                    <Ionicons name="image-outline" size={18} color="#10b981" />
                </TouchableOpacity>
            </View>

            {/* Stories Rail */}
            <View style={{ backgroundColor: 'white', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, marginLeft: 4 }}>
                    {t('stories')}
                </Text>
                <FlatList
                    data={[{ id: 'add', isAdd: true }, ...stories]}
                    renderItem={renderStoryItem}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        </>
    );

    const renderSuggestShelf = () => (
        <View className="bg-white py-4 mb-2 border-y border-gray-100">
            <View className="flex-row justify-between items-center px-5 mb-3.5">
                <View className="flex-row items-center">
                    <Ionicons name="people" size={18} color="#ea580c" />
                    <Text className="font-bold text-gray-800 text-sm ml-2">{t('peopleYouMayKnow')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.push('FollowList', { userId: user?.id, action: 'fetch_all_members', title: 'All Members' })} activeOpacity={0.7}>
                    <Text className="text-orange-600 font-bold text-xs">{t('viewAll') || 'See All'}</Text>
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
                                    source={{ uri: `${PHOTO_URL}${item.photo}` }}
                                    className="w-14 h-14 rounded-full bg-gray-100 mb-2.5 border border-orange-100"
                                />
                            ) : (
                                <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center mb-2.5 border border-orange-100">
                                    <Text className="text-orange-600 font-bold text-lg">{item.full_name?.[0] || item.name?.[0] || '?'}</Text>
                                </View>
                            )}
                            <Text className="text-gray-800 font-semibold text-xs text-center px-1" numberOfLines={1}>{item.full_name || item.name}</Text>
                            {item.city ? <Text className="text-gray-400 text-[10px] mt-0.5" numberOfLines={1}>{item.city}</Text> : null}
                            <TouchableOpacity
                                onPress={() => handleFollowUser(item.id?.toString())}
                                className={`mt-3 px-4 py-1.5 rounded-full ${isFollowed ? 'bg-gray-100 border border-gray-200' : 'bg-orange-600'}`}
                                activeOpacity={0.7}
                            >
                                <Text className={`text-[10px] font-bold ${isFollowed ? 'text-gray-500' : 'text-white'}`}>
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
                    <Ionicons name="videocam" size={18} color="#ea580c" />
                    <Text className="font-bold text-gray-800 text-sm ml-2">{t('reels')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Reels')} activeOpacity={0.7}>
                    <Text className="text-orange-600 font-bold text-xs">{t('viewAll')}</Text>
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
                                className="mr-3 w-32 h-52 rounded-2xl bg-orange-50/50 items-center justify-center border border-orange-100 border-dashed"
                                activeOpacity={0.7}
                            >
                                <View className="bg-orange-100 w-10 h-10 rounded-full items-center justify-center mb-2">
                                    <Ionicons name="add" size={24} color="#ea580c" />
                                </View>
                                <Text className="text-orange-700 font-bold text-xs">{t('create')}</Text>
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
            <View className="flex-1 justify-center items-center bg-orange-50">
                <ActivityIndicator size="large" color="#ea580c" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f9fafb]" edges={['top']}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1, zIndex: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={require('../../../assets/logo.png')} style={{ width: 32, height: 32, marginRight: 8 }} />
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>
                            LinkUp
                        </Text>
                        {user?.is_business == 1 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -2 }}>
                                <Ionicons name="briefcase" size={10} color="#0064e0" />
                                <Text style={{ fontSize: 9, color: '#0064e0', fontWeight: 'bold', marginLeft: 3 }}>{t('business')}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Search')}
                        activeOpacity={0.7}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="search-outline" size={18} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handlePlusPress}
                        activeOpacity={0.7}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ea580c12', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="add" size={20} color="#ea580c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.7}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    >
                        <Ionicons name="notifications-outline" size={18} color="#374151" />
                        {notificationCount > 0 && (
                            <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: 'white' }}>
                                <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Chats')}
                        activeOpacity={0.7}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    >
                        <Ionicons name="chatbubbles-outline" size={18} color="#374151" />
                        {chatCount > 0 && (
                            <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: 'white' }}>
                                <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                                    {chatCount > 9 ? '9+' : chatCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} tintColor="#ea580c" />}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                // @ts-ignore
                estimatedItemSize={600}
                contentContainerStyle={{ paddingBottom: 100, backgroundColor: '#f9fafb' }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="newspaper-outline" size={48} color="#ccc" />
                        <Text className="text-gray-500 mt-4">{t('noPosts')}</Text>
                    </View>
                }
                onEndReached={() => fetchNextPage()}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetchingMore ? (
                    <View style={{ paddingVertical: 20 }}>
                        <ActivityIndicator color="#ea580c" />
                    </View>
                ) : null}
            />

            {/* Professional Floating Action Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('SupportChat')}
                activeOpacity={0.85}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 20,
                    backgroundColor: '#ea580c',
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#ea580c',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                    zIndex: 999
                }}
            >
                <Ionicons name="chatbubble-ellipses" size={22} color="white" />
            </TouchableOpacity>

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
                            <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
                            <Text className="text-xl font-bold text-gray-800">{t('createNew')}</Text>
                            <Text className="text-gray-500 text-sm mt-1">{t('whatToShare')}</Text>
                        </View>

                        <View className="gap-3">
                            <TouchableOpacity
                                className="flex-row items-center p-4 bg-orange-50 rounded-2xl border border-orange-100"
                                onPress={() => { setShowUploadModal(false); navigation.navigate('CreatePost'); }}
                            >
                                <View className="w-12 h-12 bg-white rounded-xl items-center justify-center shadow-sm">
                                    <Ionicons name="create" size={24} color="#ea580c" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-gray-800">Create Post</Text>
                                    <Text className="text-gray-500 text-xs">Share your photos and thoughts</Text>
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
                                    <Text className="text-base font-bold text-gray-800">Create Reel</Text>
                                    <Text className="text-gray-500 text-xs">Record and share short videos</Text>
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
                                    <Text className="text-base font-bold text-gray-800">Add Story</Text>
                                    <Text className="text-gray-500 text-xs">Share a moment for 24 hours</Text>
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

export default HomeScreen;
