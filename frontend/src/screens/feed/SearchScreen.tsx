import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostCard from '../../components/PostCard';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const SearchScreen = ({ navigation }: any) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'People' | 'Posts'>('All');
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState('');
    
    const usersOffset = useRef(0);
    const postsOffset = useRef(0);
    const hasMoreUsers = useRef(true);
    const hasMorePosts = useRef(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 20;

    useEffect(() => {
        const getUid = async () => {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                const u = JSON.parse(uStr);
                setCurrentUserId(u.id);
            }
        };
        getUid();
    }, []);

    const performSearch = useCallback(async (text: string, reset: boolean = false) => {
        if (!text.trim()) {
            setUsers([]);
            setPosts([]);
            usersOffset.current = 0;
            postsOffset.current = 0;
            hasMoreUsers.current = true;
            hasMorePosts.current = true;
            return;
        }

        if (reset) {
            setLoading(true);
            usersOffset.current = 0;
            postsOffset.current = 0;
            hasMoreUsers.current = true;
            hasMorePosts.current = true;
        } else {
            setLoadingMore(true);
        }

        try {
            const res = await api.get(`/api_search.php?query=${encodeURIComponent(text)}&user_id=${currentUserId}&user_offset=${usersOffset.current}&user_limit=${LIMIT}&post_offset=${postsOffset.current}&post_limit=${LIMIT}`);
            if (res.data.ok) {
                const newUsers = res.data.users || [];
                const newPosts = res.data.posts || [];
                
                if (reset) {
                    setUsers(newUsers);
                    setPosts(newPosts);
                } else {
                    if (newUsers.length > 0) setUsers(prev => [...prev, ...newUsers]);
                    if (newPosts.length > 0) setPosts(prev => [...prev, ...newPosts]);
                }

                hasMoreUsers.current = newUsers.length === LIMIT;
                hasMorePosts.current = newPosts.length === LIMIT;
                usersOffset.current += newUsers.length;
                postsOffset.current += newPosts.length;
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            performSearch(query, true);
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [query, performSearch]);

    const renderUser = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 mb-2 mx-4 rounded-2xl shadow-sm border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
            onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
        >
            <Image
                source={{ uri: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/100' }}
                className="w-14 h-14 rounded-full"
                style={{ backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 1, borderColor: theme.border }}
            />
            <View className="ml-4 flex-1">
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 4 }}>{item.city || 'No City'}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>
    );

    const renderPost = ({ item }: { item: any }) => (
        <View className="mb-4">
            <PostCard
                post={{
                    ...item,
                    avatar: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/100'
                }}
                currentUserId={currentUserId}
                onUserPress={() => navigation.navigate('PublicProfile', { userId: item.user_id })}
                onDeletePress={() => { }} // Search results usually don't have delete
            />
        </View>
    );

    const filteredData = () => {
        if (activeTab === 'People') return users;
        if (activeTab === 'Posts') return posts;

        // Tab 'All' -> Combined list
        const combined = [];
        if (users.length > 0) combined.push({ type: 'header', title: 'People' }, ...users.slice(0, 5));
        if (posts.length > 0) combined.push({ type: 'header', title: 'Posts' }, ...posts);
        return combined;
    };

    const loadMore = () => {
        if (loading || loadingMore || !query.trim()) return;

        if (activeTab === 'People' && !hasMoreUsers.current) return;
        if (activeTab === 'Posts' && !hasMorePosts.current) return;
        if (activeTab === 'All' && !hasMoreUsers.current && !hasMorePosts.current) return;

        performSearch(query, false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            {/* Header / Search Bar */}
            <View 
                className="px-4 pt-2 pb-4 shadow-sm"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View 
                        className="flex-1 flex-row items-center px-4 rounded-full border"
                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }}
                    >
                        <Ionicons name="search" size={20} color={theme.textMuted} />
                        <TextInput
                            placeholder="Search people, posts..."
                            placeholderTextColor={theme.textMuted}
                            className="flex-1 py-2.5 ml-2"
                            style={{ color: theme.text }}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View 
                className="flex-row px-4 border-b"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
            >
                {['All', 'People', 'Posts'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab as any)}
                        className={`py-3 px-4 mr-2 ${activeTab === tab ? 'border-b-2 border-blue-600' : ''}`}
                    >
                        <Text style={{ fontWeight: 'bold', color: activeTab === tab ? '#2563EB' : theme.textSecondary }}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlashList
                    data={filteredData()}
                    keyExtractor={(item, index) => item.type === 'header' ? `header-${item.title}` : (item.id?.toString() || index.toString())}
                    renderItem={({ item }) => {
                        if (item.type === 'header') {
                            return (
                                <View className="px-4 py-3 mt-2">
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>{item.title}</Text>
                                </View>
                            );
                        }
                        return item.name ? renderUser({ item }) : renderPost({ item });
                    }}
                    contentContainerStyle={{ paddingBottom: 20, backgroundColor: theme.background }}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator size="small" color="#2563EB" />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        query.length > 0 ? (
                            <View className="flex-1 items-center justify-center pt-20">
                                <Ionicons name="search-outline" size={64} color={theme.textMuted} />
                                <Text style={{ color: theme.textSecondary, marginTop: 16, fontWeight: '500' }}>No results found for "{query}"</Text>
                            </View>
                        ) : (
                            <View className="flex-1 items-center justify-center pt-20">
                                <Ionicons name="people-outline" size={64} color={theme.textMuted} />
                                <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center', paddingHorizontal: 40 }}>Search for friends or community posts to stay connected</Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default SearchScreen;
