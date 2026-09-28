import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../../components/PostCard';
import { useLanguage } from '../../context/LanguageContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const getImageUrl = (photo: string | null, baseUrl: string) => {
    if (!photo) return '';
    return photo.startsWith('http') ? photo : `${baseUrl}${photo}`;
};

const SavedPostsScreen = ({ navigation }: any) => {
    const { t } = useLanguage();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [activePostId, setActivePostId] = useState<string | null>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setActivePostId(viewableItems[0].key);
        } else {
            setActivePostId(null);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 70,
    }).current;

    useEffect(() => {
        loadUserAndPosts();
    }, []);

    const loadCachedSavedPosts = async (uid: string) => {
        try {
            const cached = await AsyncStorage.getItem(`cached_saved_posts_${uid}`);
            if (cached) {
                setPosts(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {}
    };

    const loadUserAndPosts = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                setCurrentUserId(String(user.id));
                await loadCachedSavedPosts(String(user.id));
                fetchSavedPosts(String(user.id));
            } else {
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const fetchSavedPosts = async (uid?: string) => {
        const id = uid || currentUserId;
        if (!id) return;

        try {
            const res = await api.get(`get_posts.php?filter_saved=1&user_id=${id}&t=${Date.now()}`);
            if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
                setPosts(res.data.data);
                AsyncStorage.setItem(`cached_saved_posts_${id}`, JSON.stringify(res.data.data));
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error("Fetch saved posts error", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSavedPosts();
    }, [currentUserId]);

    const renderPostItem = ({ item }: { item: any }) => (
        <PostCard
            post={{
                id: String(item.id),
                user: {
                    id: String(item.user_id),
                    name: item.name,
                    avatar: getImageUrl(item.profile_photo, PHOTO_URL),
                },
                content: item.description,
                media: item.media,
                image: item.image,
                likes: parseInt(item.likes) || 0,
                comments: item.comments?.length || 0,
                timeAgo: item.date,
                isLiked: item.user_liked,
                isSaved: true,
                link: item.link
            }}
            currentUserId={currentUserId}
            onUserPress={() => navigation.push('PublicProfile', { userId: item.user_id })}
            shouldPlay={activePostId === String(item.id)}
        />
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                zIndex: 10
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 12 }} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                        {t('saved')} {t('posts')}
                    </Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="bookmark" size={20} color="#ea580c" />
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#ea580c" />
                    <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>{t('loading')}...</Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderPostItem}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    contentContainerStyle={posts.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingVertical: 10 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="bookmark-outline" size={40} color="#ea580c" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 6, textAlign: 'center' }}>
                                {t('noSavedPosts') || 'No Saved Posts'}
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
                                You haven't bookmarked any posts yet. Tap the bookmark icon on any post to save it here!
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                                style={{ marginTop: 20, backgroundColor: '#ea580c', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Explore Posts</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default SavedPostsScreen;
