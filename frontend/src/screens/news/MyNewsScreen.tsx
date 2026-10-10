import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const BASE_URL_ROOT = 'https://www.sadhuvandna.co.in';
const NEWS_URL = `${BASE_URL_ROOT}/uploads/news/`;

const MyNewsScreen = ({ navigation }: any) => {
    const [myNews, setMyNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => { loadUser(); }, []);
    useEffect(() => { if (userId) fetchMyNews(); }, [userId]);

    const loadUser = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) setUserId(JSON.parse(u).id);
        } catch (e) { console.error(e); }
    };

    const fetchMyNews = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const res = await api.get(`/get_news.php?user_id=${userId}`);
            if (res.data.status === 'success') {
                setMyNews(res.data.data || []);
            } else {
                setMyNews([]);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to load your news.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMyNews();
        setRefreshing(false);
    };

    const handleDelete = (newsId: string) => {
        Alert.alert('Delete News', 'Are you sure you want to delete this news article?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.post('/delete_news.php', { news_id: newsId, user_id: userId });
                        setMyNews(prev => prev.filter(n => String(n.id) !== String(newsId)));
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete. Please try again.');
                    }
                }
            }
        ]);
    };

    const renderNewsItem = ({ item }: { item: any }) => {
        const images: string[] = item.media
            ? item.media.filter((m: any) => m.type === 'image' || !m.type).map((m: any) => m.url || m)
            : item.image ? [item.image] : [];
        const thumbnail = images.length > 0 ? `${NEWS_URL}${images[0]}` : null;

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('NewsDetail', { news: item })}
                activeOpacity={0.9}
                style={{
                    backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12,
                    borderRadius: 16, overflow: 'hidden', elevation: 2,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.07, shadowRadius: 4,
                    borderWidth: 1, borderColor: '#E2E8F0'
                }}
            >
                {thumbnail && (
                    <Image source={{ uri: thumbnail }} style={{ width: '100%', height: 170 }} contentFit="cover" />
                )}
                <View style={{ padding: 14 }}>
                    {item.category && (
                        <View style={{
                            alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
                            borderColor: '#fed7aa', borderWidth: 1, borderRadius: 20,
                            paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>{item.category}</Text>
                        </View>
                    )}
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#172554', lineHeight: 22, marginBottom: 6 }} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 19 }} numberOfLines={2}>
                        {item.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={13} color="#9ca3af" />
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>{item.date || item.created_at || ''}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('NewsDetail', { news: item })}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="eye-outline" size={13} color="#2563EB" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB', marginLeft: 4 }}>View</Text>
                            </TouchableOpacity>
                            {/* Delete button temporarily disabled
                            <TouchableOpacity
                                onPress={() => handleDelete(String(item.id))}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={13} color="#dc2626" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626', marginLeft: 4 }}>Delete</Text>
                            </TouchableOpacity>
                            */}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
            <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
                paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="#172554" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#172554' }}>My News</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
                        {myNews.length > 0 ? `${myNews.length} articles published` : 'Your published articles'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateNews')}
                    style={{ backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={{ marginTop: 12, color: '#9ca3af', fontWeight: '500' }}>Loading your news...</Text>
                </View>
            ) : (
                <FlashList
                    data={myNews}
                    keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
                    renderItem={renderNewsItem}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingTop: 80 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="newspaper-outline" size={36} color="#2563EB" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#172554', marginBottom: 8 }}>No News Yet</Text>
                            <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 }}>
                                You haven't published any news yet. Share your first story!
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CreateNews')}
                                style={{ backgroundColor: '#2563EB', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Add First News</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default MyNewsScreen;
