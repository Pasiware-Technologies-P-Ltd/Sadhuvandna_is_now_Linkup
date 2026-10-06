import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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

const NotificationScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (!u) return;
            const user = JSON.parse(u);

            const res = await api.get(`/fetch_notifications.php?user_id=${user.id}`);
            if (res.data.status === 'success') {
                setNotifications(res.data.data);
                await api.post('/mark_notification_seen.php', `user_id=${user.id}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = item.seen === "0" || item.seen === 0;
        
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
                            <Text><Text style={{fontWeight: 'bold'}}>Linkup</Text> shared a new post.</Text>
                        ) : (
                            item.body || item.message
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
