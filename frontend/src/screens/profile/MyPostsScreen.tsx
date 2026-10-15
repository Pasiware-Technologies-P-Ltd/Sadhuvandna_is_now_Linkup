import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PostImage from '../../components/PostImage';
import PostCard from '../../components/PostCard';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;
const POST_IMAGE_URL = `${BASE_URL_ROOT}/uploads/posts/`;

const getImageUrl = (photo: string | null, baseUrl: string) => {
    if (!photo) return '';
    return photo.startsWith('http') ? photo : `${baseUrl}${photo}`;
};

const MyPostsScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePostId, setActivePostId] = useState<string | null>(null);

    const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setActivePostId(viewableItems[0].key);
        } else {
            setActivePostId(null);
        }
    }).current;

    const viewabilityConfig = React.useRef({
        itemVisiblePercentThreshold: 70,
    }).current;

    const loadCachedMyPosts = async (uid: string) => {
        try {
            const cached = await AsyncStorage.getItem(`cached_my_posts_${uid}`);
            if (cached) {
                setPosts(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        let deleteSub: any = null;
        import('react-native').then(({ DeviceEventEmitter }) => {
            deleteSub = DeviceEventEmitter.addListener('postDeleted', (data) => {
                setPosts(prev => prev.filter(p => p.id !== data.postId));
            });
        });

        AsyncStorage.getItem('user').then(async (u) => {
            if (u) {
                const user = JSON.parse(u);
                await loadCachedMyPosts(String(user.id));
                fetchMyPosts(String(user.id));
            } else {
                setLoading(false);
            }
        });

        return () => {
            if (deleteSub) deleteSub.remove();
        };
    }, []);

    const fetchMyPosts = async (uid?: string) => {
        try {
            if (!uid) return;
            const res = await api.get(`get_posts.php?filter_user_id=${uid}&user_id=${uid}`);
            if (res.data.status === 'success') {
                setPosts(res.data.data);
                AsyncStorage.setItem(`cached_my_posts_${uid}`, JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (postId: string) => {
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
                            const u = await AsyncStorage.getItem('user');
                            if (!u) return;
                            const user = JSON.parse(u);

                            const formData = new FormData();
                            formData.append('post_id', postId);
                            formData.append('user_id', user.id);

                            const res = await api.post('remove_post.php', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.status === 'success') {
                                setPosts(prev => prev.filter(p => p.id !== postId));
                                import('react-native').then(({ DeviceEventEmitter }) => {
                                    DeviceEventEmitter.emit('postDeleted', { postId });
                                });
                                Alert.alert("Success", "Post deleted");
                            } else {
                                Alert.alert("Error", res.data.message || "Failed to delete");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Network request failed");
                        }
                    }
                }
            ]
        );
    };

    const renderPostItem = ({ item }: { item: any }) => (
        <PostCard
            post={{
                id: item.id,
                user: {
                    id: item.user_id,
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
                link: item.link
            }}
            currentUserId={String(posts[0]?.user_id || '')}
            onDeletePress={() => handleDelete(String(item.id))}
            shouldPlay={activePostId === item.id}
        />
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View 
                className="flex-row items-center p-4" 
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>My Posts</Text>
            </View>

            <FlashList
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                contentContainerStyle={{ paddingBottom: 20, backgroundColor: theme.background }}
                ListEmptyComponent={
                    <View className="items-center mt-20 p-4">
                        <Text className="text-4xl mb-4">📝</Text>
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16 }}>You haven't posted anything yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default MyPostsScreen;
