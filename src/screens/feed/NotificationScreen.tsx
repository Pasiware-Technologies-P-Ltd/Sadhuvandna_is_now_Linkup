import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NotificationDBService } from '../../services/NotificationDBService';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";

const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString.replace(' ', 'T'));
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 60000) return 'Just Now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
};

const BadgeIcon = ({ type }: { type: string }) => {
    let iconName = 'notifications';
    let bgColor = '#9ca3af';
    switch (type) {
        case 'like': iconName = 'heart'; bgColor = '#ef4444'; break;
        case 'comment': iconName = 'chatbubble'; bgColor = '#10b981'; break;
        case 'message': iconName = 'chatbubble-ellipses'; bgColor = '#3b82f6'; break;
        case 'request': iconName = 'person-add'; bgColor = '#5a67d8'; break;
        case 'follow_request': iconName = 'person-add'; bgColor = '#5a67d8'; break;
        case 'follow': iconName = 'person'; bgColor = '#5a67d8'; break;
        case 'news': 
        case 'post': 
        case 'system':
        default: iconName = 'notifications'; bgColor = '#9ca3af'; break;
    }
    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <Ionicons name={iconName as any} size={12} color="white" />
        </View>
    );
};

const groupNotifications = (notifications: any[]) => {
    const groupedMap = new Map();
    for (const item of notifications) {
        let key = item.id;
        const itemDate = new Date(item.date || item.created_at);
        const dateKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
        
        if (item.type === 'like' || item.type === 'comment') {
            let refId = '';
            try {
                if (item.data_payload) {
                    const data = typeof item.data_payload === 'string' ? JSON.parse(item.data_payload) : item.data_payload;
                    refId = data.postId || data.reference_id || '';
                }
            } catch (e) {}
            if (refId) key = `${item.type}_${refId}_${dateKey}`;
            else key = `${item.type}_${item.title}_${dateKey}`;
        } else if (item.type === 'message' || item.type === 'chat') {
            key = `msg_${item.sender_id}_${dateKey}`;
        } else if (item.type === 'incoming_call') {
            let callerId = '';
            try {
                if (item.data_payload) {
                    const data = typeof item.data_payload === 'string' ? JSON.parse(item.data_payload) : item.data_payload;
                    callerId = data.caller_id || '';
                }
            } catch (e) {}
            key = `call_${callerId}_${dateKey}`;
        } else if (item.type === 'group_chat') {
            let groupId = '';
            try {
                if (item.data_payload) {
                    const data = typeof item.data_payload === 'string' ? JSON.parse(item.data_payload) : item.data_payload;
                    groupId = data.group_id || '';
                }
            } catch (e) {}
            key = `group_${groupId}_${dateKey}`;
        } else if (item.type === 'post' && item.title === 'New Post') {
            key = `post_Linkup_${dateKey}`;
        }

        if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...item, _groupCount: item._groupCount || 1 });
        } else {
            const existing = groupedMap.get(key);
            const existingDate = new Date(existing.date || existing.created_at).getTime();
            const newDate = new Date(item.date || item.created_at).getTime();
            if (newDate > existingDate) {
                groupedMap.set(key, { ...item, _groupCount: (existing._groupCount || 1) + 1 });
            } else {
                existing._groupCount = (existing._groupCount || 1) + 1;
            }
        }
    }
    const finalMerged = Array.from(groupedMap.values());
    finalMerged.sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
    return finalMerged;
};

const NotificationScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastCursor, setLastCursor] = useState<string | null>(null);

    useEffect(() => {
        loadLocalThenFetch();
    }, []);

    const loadLocalThenFetch = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (!u) return;
            const user = JSON.parse(u);

            // Load instantly from SQLite
            const localNotes = await NotificationDBService.getNotifications(String(user.id), 15);
            if (localNotes && localNotes.length > 0) {
                setNotifications(groupNotifications(localNotes));
            }

            // Then fetch from API
            await fetchNotifications();
        } catch (error) {
            console.error(error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (!u) return;
            const user = JSON.parse(u);

            const res = await api.get(`/fetch_notifications.php?user_id=${user.id}&limit=15`);
            if (res.data.status === 'success') {
                const fetched = res.data.data;
                
                setNotifications(prev => {
                    const combined = [...fetched];
                    const fetchedIds = new Set(fetched.map((f: any) => f.id));
                    for (const item of prev) {
                        if (!fetchedIds.has(item.id)) {
                            combined.push(item);
                        }
                    }

                    return groupNotifications(combined);
                });

                if (fetched.length > 0) {
                    const lastFetched = fetched[fetched.length - 1];
                    setLastCursor(lastFetched.date || lastFetched.created_at);
                }

                if (fetched.length < 15) setHasMore(false);
                else setHasMore(true);

                // Save to SQLite
                await NotificationDBService.saveNotifications(fetched, String(user.id));
                await api.post('/mark_notification_seen.php', `user_id=${user.id}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchMoreNotifications = async () => {
        if (loadingMore || !hasMore || notifications.length === 0) return;
        setLoadingMore(true);
        try {
            const u = await AsyncStorage.getItem('user');
            if (!u) return;
            const user = JSON.parse(u);

            let cursorToUse = lastCursor;
            if (!cursorToUse) {
                cursorToUse = notifications[notifications.length - 1].date || notifications[notifications.length - 1].created_at;
            }
            
            const res = await api.get(`/fetch_notifications.php?user_id=${user.id}&limit=15&cursor=${encodeURIComponent(cursorToUse || '')}`);
            if (res.data.status === 'success') {
                const fetched = res.data.data;
                if (fetched.length > 0) {
                    const lastFetched = fetched[fetched.length - 1];
                    setLastCursor(lastFetched.date || lastFetched.created_at);
                    
                    setNotifications(prev => {
                        const combined = [...prev, ...fetched];
                        return groupNotifications(combined);
                    });
                }
                if (fetched.length < 15) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handlePress = (item: any) => {
        if (item.type === 'message') {
            navigation.navigate('Chat', {
                receiver: {
                    id: item.data?.sender_id,
                    full_name: item.title,
                    photo: item.image
                }
            });
        } else if (item.type === 'request' || item.type === 'follow_request') {
            navigation.navigate('Requests');
        } else if (item.type === 'follow') {
            navigation.navigate('PublicProfile', { userId: item.sender_id || item.data?.user_id });
        } else if (item.type === 'news') {
            navigation.navigate('MainTabs', { screen: 'News' });
        } else if (item.type === 'like' || item.type === 'comment' || item.type === 'post') {
            if (item.data && item.data.postId) {
                navigation.navigate('PostDetail', { postId: String(item.data.postId) });
            } else if (item.data && item.data.user_id) {
                navigation.navigate('PublicProfile', { userId: item.data.user_id });
            }
        }
    };

    const getInitials = (item: any) => {
        let name = item.title;
        if (name === 'New Like' || name === 'New Comment' || name === 'New Message' || name === 'New Request') {
            name = item.body?.split(' ')[0] || '?';
        }
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = item.seen === "0" || item.seen === 0;
        const isLogo = item.image?.endsWith('logo.png') || item.image?.includes('via.placeholder.com');
        const isSystem = item.type === 'news' || (item.type === 'system' && item.title === 'System');
        
        return (
            <TouchableOpacity
                style={[styles.itemContainer, isUnread && styles.unreadContainer]}
                activeOpacity={0.7}
                onPress={() => handlePress(item)}
            >
                {/* Unread Dot */}
                <View style={styles.unreadDotContainer}>
                    {isUnread && <View style={styles.unreadDot} />}
                </View>

                {/* Avatar with Badge */}
                <View style={styles.avatarContainer}>
                    {isLogo && !isSystem ? (
                        <View style={[styles.avatar, { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#475569' }}>{getInitials(item)}</Text>
                        </View>
                    ) : (
                        <Image
                            source={
                                item.image?.endsWith('logo.png')
                                    ? require('../../../assets/logo.png')
                                    : { 
                                        uri: item.image?.startsWith('http') 
                                            ? item.image 
                                            : (item.image?.startsWith('uploads') || item.image?.startsWith('images')
                                                ? `${BASE_URL_ROOT}/${item.image}`
                                                : 'https://via.placeholder.com/100')
                                    }
                            }
                            style={styles.avatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    )}
                    <BadgeIcon type={item.type} />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.date}>{timeAgo(item.date || item.created_at)}</Text>
                    </View>
                    <Text style={styles.body} numberOfLines={2}>
                        {item.type === 'post' && item.title === 'New Post' ? (
                            item._groupCount && item._groupCount > 1
                                ? <Text><Text style={{fontWeight: 'bold'}}>Linkup</Text> shared {item._groupCount} new posts.</Text>
                                : <Text><Text style={{fontWeight: 'bold'}}>Linkup</Text> shared a new post.</Text>
                        ) : item.type === 'incoming_call' ? (
                            item._groupCount && item._groupCount > 1
                                ? `${(item.body || item.message)} (${item._groupCount} calls)`
                                : (item.body || item.message)
                        ) : item.type === 'group_chat' ? (
                            item._groupCount && item._groupCount > 1
                                ? `${(item.body || item.message)} (${item._groupCount} messages)`
                                : (item.body || item.message)
                        ) : (
                            item._groupCount && item._groupCount > 1 
                                ? `${(item.body || item.message).replace('.', '')} and ${item._groupCount - 1} more.`
                                : (item.body || item.message)
                        )}
                    </Text>
                    
                    {/* Action Buttons removed as requested */}
                </View>

                {/* Optional Right Thumbnail (for posts) */}
                {(item.type === 'post' || item.type === 'like' || item.type === 'comment') && item.data?.thumbnail && (
                    <Image 
                        source={{ uri: item.data.thumbnail?.startsWith('http') ? item.data.thumbnail : `${BASE_URL_ROOT}/${item.data.thumbnail}` }} 
                        style={styles.thumbnail} 
                        contentFit="cover" 
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#ea580c" size="large" />
                </View>
            ) : (
                <FlashList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id?.toString() || Math.random().toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={['#ea580c']} />}
                    onEndReached={fetchMoreNotifications}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#ea580c" style={{ margin: 20 }} /> : null}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: 'gray' }}>No notifications yet.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
        paddingHorizontal: 8, paddingVertical: 12, backgroundColor: '#f9fafb' 
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    itemContainer: { 
        flexDirection: 'row', paddingVertical: 12, paddingRight: 16, 
        backgroundColor: '#f9fafb', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' 
    },
    unreadContainer: { backgroundColor: '#eff6ff' },
    unreadDotContainer: { width: 20, alignItems: 'center', justifyContent: 'center' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e5e7eb' },
    badge: { 
        position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, 
        borderRadius: 12, justifyContent: 'center', alignItems: 'center', 
        borderWidth: 2, borderColor: '#f9fafb' 
    },
    contentContainer: { flex: 1, justifyContent: 'center' },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    title: { fontWeight: 'bold', fontSize: 15, color: '#111827', flex: 1, marginRight: 8 },
    date: { fontSize: 12, color: '#6b7280' },
    body: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
    thumbnail: { width: 50, height: 50, borderRadius: 8, marginLeft: 12, backgroundColor: '#e5e7eb' }
});

export default NotificationScreen;
