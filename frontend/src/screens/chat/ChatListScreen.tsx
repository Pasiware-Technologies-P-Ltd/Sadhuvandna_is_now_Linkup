import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, LayoutAnimation, Platform, UIManager, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socket';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ChatDBService } from '../../services/ChatDBService';
import { useOnlineStatus } from '../../context/OnlineContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL_COMMUNITY = `${BASE_URL_ROOT}/uploads/photo/`;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ChatListScreen = ({ navigation, route }: any) => {
    const { isUserOnline, checkOnlineStatuses, onlineUsers } = useOnlineStatus();
    const { isDarkMode, theme } = useTheme();
    const [friends, setFriends] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchContacts, setSearchContacts] = useState<any[]>([]);
    const [searchingContacts, setSearchingContacts] = useState(false);
    const [loading, setLoading] = useState(true);
    const activePlatform = route?.params?.platform || 'community';
    const { t } = useLanguage();

    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const searchTimeoutRef = React.useRef<any>(null);



    const loadCachedChats = async (uid: number) => {
        try {
            const cachedChats = await ChatDBService.getConversations(String(uid), activePlatform);
            if (cachedChats && cachedChats.length > 0) {
                // Map sqlite format to UI format
                const mapped = cachedChats.map((c: any) => ({
                    partner_id: c.partner_id,
                    isGroup: c.is_group === 1,
                    full_name: c.full_name,
                    profile_photo: c.profile_photo,
                    last_message: c.last_message,
                    last_message_is_mine: c.last_message_is_mine === 1,
                    last_message_seen: c.last_message_seen === 1,
                    unread: c.unread_count,
                    time: c.time
                })).filter((c: any) => String(c.partner_id) !== String(uid));
                setFriends(mapped);
                setLoading(false);
            } else {
                // Fallback to asyncstorage if sqlite is empty
                const cached = await AsyncStorage.getItem(`cached_chats_v1_${uid}_${activePlatform}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setFriends(parsed.filter((c: any) => String(c.partner_id) !== String(uid)));
                    setLoading(false);
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        AsyncStorage.getItem('user').then(async (u) => {
            if (u) {
                const user = JSON.parse(u);
                setUserId(user.id);
                await loadCachedChats(user.id);
                fetchFriends(user.id);
            } else {
                setLoading(false);
            }
        });
        
        const unsubscribe = navigation.addListener('focus', () => { AsyncStorage.getItem('user').then((u) => { if (u) { const user = JSON.parse(u); loadCachedChats(user.id); fetchFriends(user.id); } }); }); return unsubscribe;
    }, [navigation, activePlatform]);

    useEffect(() => {
        if (socketService.socket) {
            const handleMessagesSeen = (data: any) => { setFriends(prev => prev.map(f => { if (String(f.partner_id) === String(data.viewer_id) && f.last_message_is_mine) { return { ...f, last_message_seen: true }; } return f; })); const chatId = `user_${data.viewer_id}`; ChatDBService.markAllAsSeen(chatId).catch(() => {}); }; 
            
            const handleNewNotification = (data: any) => {
                let actualPayload = null;
                if (data && data.type === 'new_notification' && data.payload) {
                    actualPayload = data.payload;
                } else if (data && (data.type === 'chat' || data.type === 'message')) {
                    actualPayload = data;
                }

                if (actualPayload && (actualPayload.type === 'chat' || actualPayload.type === 'message') && actualPayload.message) {
                    const msg = actualPayload.message;
                    const partnerId = msg.sender_id == userId ? msg.receiver_id : msg.sender_id;
                    
                    let found = false;
                    setFriends(prev => {
                        const existingIdx = prev.findIndex(f => f.partner_id == partnerId);
                        if (existingIdx >= 0) {
                            found = true;
                            const updatedChats = [...prev];
                            const chat = { ...updatedChats[existingIdx] };
                            chat.last_message = msg.message || 'Media';
                            chat.last_message_is_mine = msg.sender_id == userId;
                            chat.last_message_seen = false; // It's a new message, so if it's mine it hasn't been seen yet
                            
                            try {
                                const d = new Date(msg.created_at.replace(' ', 'T'));
                                chat.time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch (e) {
                                chat.time = '';
                            }
                            
                            if (msg.sender_id != userId) {
                                chat.unread = (chat.unread || 0) + 1;
                            }
                            
                            updatedChats.splice(existingIdx, 1);
                            return [chat, ...updatedChats];
                        }
                        return prev;
                    });
                    
                    if (!found && userId !== null) { fetchFriends(userId); }
                }
            };
            
            socketService.socket.on('new_notification', handleNewNotification); socketService.socket.on('messages_seen', handleMessagesSeen);
            
            return () => {
                socketService.socket?.off('new_notification', handleNewNotification); socketService.socket?.off('messages_seen', handleMessagesSeen);
            };
        }
    }, [userId]);
    
    // Check statuses via Global Context whenever friends load
    useEffect(() => {
        if (friends.length > 0) {
            const userIds = friends.filter(f => !f.isGroup).map(f => String(f.user_id || f.partner_id));
            checkOnlineStatuses(userIds);
        }
    }, [friends.length]);

    // Debounced search for connected contacts (even those with no messages)
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!searchQuery.trim() || !userId) {
            setSearchContacts([]);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => {
            fetchSearchContacts(searchQuery.trim());
        }, 400);
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery, userId]);

    const fetchSearchContacts = async (query: string) => {
        setSearchingContacts(true);
        try {
            const res = await api.get(`/api_search.php?query=${encodeURIComponent(query)}&user_id=${userId}&connected_only=true`);
            if (res.data.ok) {
                // Map api_search users shape to chat list shape
                const mapped = (res.data.users || []).map((u: any) => ({
                    partner_id:      u.id,
                    full_name:       u.name,
                    profile_photo:   u.profile_photo,
                    last_message:    null,
                    time:            null,
                    unread:          0,
                    is_online:       false,
                    isGroup:         false,
                    is_contact_only: true,
                }));
                // Filter out users already in the active chats list
                const existingIds = new Set(friends.map((f: any) => f.partner_id));
                setSearchContacts(mapped.filter((c: any) => !existingIds.has(c.partner_id)));
            }
        } catch (e) {
            // silently fail – search contacts are supplementary
        } finally {
            setSearchingContacts(false);
        }
    };

    const isFetchingRef = React.useRef(false);
    const fetchFriends = async (uidToFetch?: number) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const currentUid = uidToFetch || userId;
            if (!currentUid) return;
            const res = await api.get(`/get_active_chats.php?user_id=${currentUid}&platform=${activePlatform}`);
            if (res.data.status === 'success') {
                const filteredData = (res.data.data || []).filter((f: any) => String(f.partner_id) !== String(currentUid));
                setFriends(filteredData);
                AsyncStorage.setItem(`cached_chats_v1_${currentUid}_${activePlatform}`, JSON.stringify(res.data.data));
                
                // Save to SQLite asynchronously
                res.data.data.forEach((conv: any) => {
                    ChatDBService.saveConversation({ ...conv, platform: activePlatform }, String(currentUid)).catch(() => {});
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim() || !userId) return;
        setJoining(true);
        try {
            const res = await api.post('/join_group_via_link.php', {
                invite_code: joinCode.trim(),
                user_id: userId
            });

            if (res.data.status === 'success') {
                Alert.alert('Success', res.data.message);
                setJoinModalVisible(false);
                setJoinCode('');
                fetchFriends();
                
                // Navigate to the newly joined group
                const group = res.data.group;
                const receiverObj = {
                    id: group.id,
                    name: group.name,
                    isGroup: true,
                    full_name: group.name
                };
                navigation.navigate('Chat', { receiver: receiverObj, platform: activePlatform, isGroup: true });
            } else {
                Alert.alert('Error', res.data.message);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error');
        } finally {
            setJoining(false);
        }
    };

    const toggleMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMenu(!showMenu);
    };

    const renderItem = ({ item }: { item: any }) => {
        const receiverObj = {
            id: item.partner_id,
            name: item.full_name,
            photo: item.profile_photo || item.photo,
            isGroup: item.isGroup || false,
            ...item
        };

        const currentPhotoUrl = PHOTO_URL_COMMUNITY;
        const isOnline = !item.isGroup && isUserOnline(item.user_id || item.partner_id);

        return (
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}
                onPress={() => navigation.navigate('Chat', { receiver: receiverObj, platform: activePlatform, isGroup: item.isGroup })}
                activeOpacity={0.7}
            >
                <View style={{ position: 'relative', marginRight: 14 }}>
                    <Image
                        source={{ uri: (item.profile_photo) ? `${currentPhotoUrl}${encodeURIComponent(item.profile_photo)}` : 'https://via.placeholder.com/100' }}
                        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 1, borderColor: theme.border }}
                    />
                    {isOnline && (
                        <View 
                            style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: theme.card }} 
                        />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }} numberOfLines={1}>
                            {item.full_name}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textMuted }}>
                            {item.time}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                            {item.last_message_is_mine && (
                                <Ionicons
                                    name={item.last_message_seen ? "checkmark-done" : "checkmark-done"}
                                    size={16}
                                    color={item.last_message_seen ? "#3b82f6" : theme.textMuted}
                                    style={{ marginRight: 4 }}
                                />
                            )}
                            <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                                {item.last_message || 'Media'}
                            </Text>
                        </View>
                        {item.unread > 0 && (
                            <View style={{ backgroundColor: '#2563EB', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 }}>
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>{item.unread}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Filter existing chats by query, then append connected contacts not yet in chats
    const filteredFriends = [
        ...friends.filter(friend =>
            friend.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        // Append search contacts (connected users with no prior messages) only when searching
        ...(searchQuery.trim().length > 0 ? searchContacts : [])
    ];

    

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            {/* Header Toolbar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: theme.card, zIndex: 50 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>{t('messages') || "Messages"}</Text>
                </View>
                {activePlatform !== 'marriage' && (
                    <TouchableOpacity onPress={toggleMenu} style={{ padding: 4 }} activeOpacity={0.7}>
                        <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
                {showMenu && activePlatform !== 'marriage' && (
                    <View style={{ position: 'absolute', top: 48, right: 16, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5, paddingVertical: 6, width: 150, zIndex: 100 }}>
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                            onPress={() => {
                                toggleMenu();
                                navigation.navigate('CreateGroup');
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Create Group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
                            onPress={() => {
                                toggleMenu();
                                setJoinModalVisible(true);
                            }}
                        >
                            <Ionicons name="enter-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Join Group</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Search Filter Bar */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderRadius: 20, paddingHorizontal: 12, height: 38 }}>
                    <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={{ flex: 1, fontSize: 13, color: theme.text, padding: 0 }}
                        placeholder={t('search') || "Search messages..."}
                        placeholderTextColor={theme.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filteredFriends}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.partner_id ? `${item.isGroup ? 'group_' : 'user_'}${item.partner_id}` : index.toString()}
                contentContainerStyle={{ paddingVertical: 4 }} extraData={onlineUsers}
                ListFooterComponent={
                    searchingContacts ? (
                        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#2563EB" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={(!searchingContacts && !loading) ? (
                        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
                            <Ionicons name="chatbubbles-outline" size={60} color="#fed7aa" />
                            <Text style={{ color: '#9ca3af', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                                {searchQuery.length > 0 ? `No results found for "${searchQuery}"` : `No chats found`}
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Join Group Modal */}
            <Modal visible={joinModalVisible} transparent={true} animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#172554' }}>Join Group</Text>
                            <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 16 }}>
                            Enter the 8-character invite code to join a group.
                        </Text>
                        
                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
                            <TextInput
                                style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', letterSpacing: 4, color: '#2563EB' }}
                                placeholder="8A2B3C..."
                                placeholderTextColor="#fed7aa"
                                value={joinCode}
                                onChangeText={(val) => setJoinCode(val.toUpperCase())}
                                maxLength={8}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>

                        <TouchableOpacity 
                            style={{ backgroundColor: joinCode.length === 8 ? '#2563EB' : '#E2E8F0', paddingVertical: 14, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                            disabled={joinCode.length !== 8 || joining}
                            onPress={handleJoinGroup}
                        >
                            {joining ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="enter-outline" size={18} color="white" style={{ marginRight: 6 }} />
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Join Group</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default ChatListScreen;












