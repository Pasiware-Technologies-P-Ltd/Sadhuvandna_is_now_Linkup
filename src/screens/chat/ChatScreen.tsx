import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { Animated, LayoutAnimation, UIManager } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Pressable, Linking, Keyboard, ScrollView, AppState, FlatList } from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL, getFullPaymentUrl } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import WebCallModal from '../../components/WebCallModal';
import socketService from '../../services/socket';

import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import { ChatDBService } from '../../services/ChatDBService';
import { useOnlineStatus } from '../../context/OnlineContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const ChatScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const { receiver: rawReceiver, platform = 'community' } = route.params || {};
    const { t } = useLanguage();
    const { isUserOnline } = useOnlineStatus();

    // Ensure receiver object is robust
    const receiver = rawReceiver
        ? {
            ...rawReceiver,
            id: rawReceiver.id || rawReceiver.profile_id || rawReceiver.user_id || rawReceiver.partner_id,
            // Fallback for names
            full_name: rawReceiver.full_name || rawReceiver.name || 'User',
        }
        : null;

    const [messages, setMessages] = useState<any[]>([]);
    const messagesRef = useRef<any[]>([]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);
    const [text, setText] = useState('');
    const [myProfileId, setMyProfileId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const userIdRef = useRef<string | null>(null); // Ref to always have latest userId instantly
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] =
        useState<'checking' | 'paid' | 'unpaid'>('checking');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    // Media Upload State
    const [selectedMedia, setSelectedMedia] = useState<any>(null); // { uri, type, mimeType }
    const [uploading, setUploading] = useState(false);

    const [isTyping, setIsTyping] = useState(false);
    const [isReceiverTyping, setIsReceiverTyping] = useState(false);
    // receiverOnline driven by global OnlineContext — instant across all screens
    const receiverOnline = !route.params?.isGroup && isUserOnline(receiver?.id);
    const [receiverLastSeen, setReceiverLastSeen] = useState<string | null>(null);
    // Group typing indicator
    const [groupTypingUser, setGroupTypingUser] = useState<string | null>(null);
    const typingDotAnim = useRef(new Animated.Value(0)).current;

    // Block User State
    const [isBlockedByMe, setIsBlockedByMe] = useState(false);
    const [isBlockedByThem, setIsBlockedByThem] = useState(false);
    const isBlocked = isBlockedByMe || isBlockedByThem;
    const [showMenu, setShowMenu] = useState(false);

    const toggleMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMenu(!showMenu);
    };

    // Web Call State
    const [webCallUrl, setWebCallUrl] = useState<string | null>(null);

    // Full Screen Image State
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    // Message Options & Info State
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [showMessageOptions, setShowMessageOptions] = useState(false);
    const [viewers, setViewers] = useState<any[]>([]);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [showMessageInfo, setShowMessageInfo] = useState(false);
    const [expandedMessageIds, setExpandedMessageIds] = useState<number[]>([]);
    const [fontSize, setFontSize] = useState(16);
    const [showFontSizeControl, setShowFontSizeControl] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Search State
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Attachment Menu State
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [groupAdminsOnly, setGroupAdminsOnly] = useState(false);
    const [isMeAdmin, setIsMeAdmin] = useState(false);

    // Selection & Forwarding State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardingTargets, setForwardingTargets] = useState<any[]>([]);
    const [selectedTargets, setSelectedTargets] = useState<any[]>([]);
    const [isForwarding, setIsForwarding] = useState(false);
    const [forwardSearch, setForwardSearch] = useState('');

    const flatListRef = useRef<any>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isFetchingMoreRef = useRef(false);
    const lastFetchTimeRef = useRef(0);
    const hasSufficientCacheRef = useRef(false);
    const hasScrolledToBottomRef = useRef(false);
    const allowHistoryFetchRef = useRef(false);
    const isUserScrollingRef = useRef(false);
    const isAtBottomRef = useRef(true);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => { show.remove(); hide.remove(); };
    }, []);

    useEffect(() => {
        init();
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (paymentStatus !== 'paid' || !myProfileId) return;

        let notificationSubscription: any;
        let lastOnlineCheck = 0;
        let lastBlockCheck = 0;
        let isActive = true;

        const startPolling = () => {
            // Always clean up old listeners before re-registering
            // to prevent stacking (multiple focus/AppState events would
            // add multiple listeners → N API calls per socket event)
            stopPolling();

            // Listen for instant socket updates to refresh messages without polling
            if (socketService.socket) {
                socketService.socket.on('new_notification', (data: any) => {
                    let actualPayload = null;
                    if (data && data.type === 'new_notification' && data.payload) {
                        actualPayload = data.payload;
                    } else if (data && (data.type === 'chat' || data.type === 'message')) {
                        actualPayload = data;
                    }

                    if (actualPayload && actualPayload.message) {
                        const isFromReceiver = String(actualPayload.message.sender_id) === String(receiver?.id);
                        const isFromMeToReceiver = String(actualPayload.message.sender_id) === String(myProfileId) && String(actualPayload.message.receiver_id) === String(receiver?.id);

                        if (isFromReceiver || isFromMeToReceiver) {
                            const newMsg = actualPayload.message;
                            const isMine = isFromMeToReceiver;

                            setMessages(prev => {
                                // Deduplicate by client_message_id to avoid echoing back our own optimistic message
                                if (prev.some(m => (newMsg.id && m.id === newMsg.id) || (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id))) return prev;
                                console.log('[WS] NEW MESSAGE → appended');
                                return [{ ...newMsg, is_mine: isMine, seen: isMine ? 0 : 1 }, ...prev];
                            });

                            if (isAtBottomRef.current && navigation.isFocused()) {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                }, 150);
                            }

                            // Save to SQLite
                            const isGroup = route.params?.isGroup;
                            const chatId = isGroup ? `group_${receiver?.id}` : `user_${receiver?.id}`;
                            ChatDBService.saveMessages(chatId, [{ ...newMsg, is_mine: isMine, seen: isMine ? 0 : 1 }]).catch(() => { });

                            if (!isMine && isAtBottomRef.current && navigation.isFocused()) {
                                try {
                                    socketService.socket?.emit('mark_seen', {
                                        message_id: newMsg.id || newMsg.client_message_id,
                                        my_profile_id: myProfileId,
                                        receiver_id: receiver?.id,
                                        platform: platform,
                                    });
                                } catch { }
                            }
                        }
                        // If notification is from someone else, just ignore —
                        // socket already handled message delivery for this chat.
                    }
                });

                socketService.socket.on('new_group_notification', (data: any) => {
                    let actualPayload = null;
                    if (data && data.type === 'new_group_notification' && data.payload) {
                        actualPayload = data.payload;
                    } else if (data && data.type === 'group_chat') {
                        actualPayload = data;
                    }

                    if (actualPayload && actualPayload.message && route.params?.isGroup && String(actualPayload.group_id) === String(receiver?.id)) {
                        const newMsg = actualPayload.message;
                        const isMine = String(newMsg.sender_id) === String(myProfileId);

                        setMessages(prev => {
                            if (prev.some(m => (newMsg.id && m.id === newMsg.id) || (newMsg.client_message_id && m.client_message_id === newMsg.client_message_id))) return prev;
                            console.log('[WS] NEW GROUP MESSAGE → appended');
                            return [{ ...newMsg, is_mine: isMine, seen: isMine ? 0 : 1 }, ...prev];
                        });

                        if (isAtBottomRef.current && navigation.isFocused()) {
                            setTimeout(() => {
                                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                            }, 150);
                        }

                        const chatId = `group_${receiver?.id}`;
                        ChatDBService.saveMessages(chatId, [{ ...newMsg, is_mine: isMine, seen: isMine ? 0 : 1 }]).catch(() => { });
                    }
                });

                // Handle Send ACKs
                socketService.socket.on('chat:ack', (data: any) => {
                    if (data && data.client_message_id) {
                        setMessages(prev => prev.map(m =>
                            m.client_message_id === data.client_message_id
                                ? { ...m, isOptimistic: false, id: data.server_id, server_id: data.server_id }
                                : m
                        ));
                        ChatDBService.updateMessageStatus(data.client_message_id, { status: 'sent', server_id: data.server_id }).catch(() => { });
                    }
                });

                // Handle Send Errors
                socketService.socket.on('chat:error', (data: any) => {
                    if (data && data.client_message_id) {
                        setMessages(prev => prev.filter(m => m.client_message_id !== data.client_message_id));
                        Alert.alert('Send Error', data.message || 'Message could not be sent.');
                    }
                });

                socketService.socket.on('typing', (data: any) => {
                    if (data.senderId == receiver?.id || data.senderId == receiver?.user_id) {
                        setIsReceiverTyping(true);
                    }
                });

                socketService.socket.on('stop_typing', (data: any) => {
                    if (data.senderId == receiver?.id) {
                        setIsReceiverTyping(false);
                    }
                });

                // user_status is handled globally by OnlineContext.
                // We still listen locally only for last-seen text update.
                socketService.socket.on('user_status', (data: any) => {
                    if ((data.userId == receiver?.id || data.userId == receiver?.user_id) && data.status === 'offline') {
                        fetchUserStatus();
                    }
                });

                // Receiver ne messages dekhe — sender ke tick update karo
                // PHP get_chat_messages.php marks seen=1 then fires this event
                socketService.socket.on('messages_seen', (data: any) => {
                    if (String(data.viewer_id) === String(receiver?.id)) {
                        // Mark all sent messages (is_mine: true) as seen instantly in UI
                        setMessages(prev => prev.map(m =>
                            m.is_mine && m.seen == 0 ? { ...m, seen: 1 } : m
                        ));

                        // Mark in SQLite locally
                        const isGrp = route.params?.isGroup;
                        const chatId = isGrp ? `group_${receiver?.id}` : `user_${receiver?.id}`;
                        ChatDBService.markAllAsSeen(chatId).catch(() => { });
                    }
                });

                if (receiver?.id) {
                    socketService.socket.emit('check_status', receiver.id);
                }
            }

            // Listen to foreground push notifications directly for instant message delivery
            if (!notificationSubscription) {
                notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
                    // Handled exclusively by WebSocket to avoid API hit
                });
            }

            // Initial fetch on first load OR when socket is not available (fallback)
            // If socket is connected, skip re-fetch on focus/AppState — socket handles live delivery
            if (isMountedRef.current && isActive) {
                const isFirstLoad = lastFetchTimeRef.current === 0;
                const now = Date.now();

                if (isFirstLoad) {
                    lastFetchTimeRef.current = now;
                    // On FIRST load, NEVER call fetchMessages if we have cache.
                    fetchMessages(null, true); // ALWAYS fetch to reconcile gap if app was killed and mark as seen
                    // We check block status from local cache initially, avoid API overhead
                    checkBlockStatus();
                } else if (now - lastFetchTimeRef.current > 2000) {
                    lastFetchTimeRef.current = now;

                    // If we are foregrounding (not first load), we might have missed messages.
                    // Instead of a blind fetch, we do a proper reconciliation fetch (isReconnect = true).
                    // We only do this if we suspect a disconnect/reconnect gap.
                    if (!socketService.socket?.connected) {
                        fetchMessages(null, true);
                    }
                }
            }
        };

        const stopPolling = () => {
            if (notificationSubscription) {
                notificationSubscription.remove();
                notificationSubscription = null;
            }
            if (socketService.socket) {
                // Important: Clean up the event listener to avoid memory leaks and multiple fires
                socketService.socket.off('new_notification');
                socketService.socket.off('new_group_notification');
                socketService.socket.off('chat:ack');
                socketService.socket.off('chat:error');
                socketService.socket.off('typing');
                socketService.socket.off('stop_typing');
                socketService.socket.off('user_status');
                socketService.socket.off('messages_seen');
            }
        };

        startPolling();

        const unsubscribeFocus = navigation.addListener('focus', () => {
            isActive = true;
            // stopPolling() is called inside startPolling() — no double-listener stacking
            startPolling();
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            isActive = false;
            stopPolling();
        });

        // AppState listener
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && navigation.isFocused()) {
                isActive = true;
                // stopPolling() is called inside startPolling() — no double-listener stacking
                startPolling();
            } else {
                isActive = false;
                stopPolling();
            }
        });

        return () => {
            stopPolling();
            unsubscribeFocus();
            unsubscribeBlur();
            subscription.remove();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [paymentStatus, myProfileId, navigation]);

    const init = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                userIdRef.current = user.id;
                setUserId(user.id);
                await loadCachedChatMessages(user.id);
                checkPayment(user.id);
                updateMyOnlineStatus(user.id);
            }
            const savedFontSize = await AsyncStorage.getItem('chat_font_size');
            if (savedFontSize) {
                const parsed = parseInt(savedFontSize);
                if (!isNaN(parsed)) {
                    setFontSize(Math.max(12, Math.min(30, parsed)));
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Typing Animation
    useEffect(() => {
        if (isReceiverTyping || groupTypingUser) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(typingDotAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(typingDotAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            typingDotAnim.setValue(0);
        }
    }, [isReceiverTyping, groupTypingUser]);

    const TypingIndicator = ({ text }: { text: string }) => (
        <View className="flex-row items-center">
            <Text className="text-xs text-orange-600 font-bold tracking-wide">{text}</Text>
            <View className="flex-row ml-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                    <Animated.View
                        key={i}
                        style={{
                            width: 3,
                            height: 3,
                            borderRadius: 1.5,
                            backgroundColor: '#ea580c',
                            marginHorizontal: 1,
                            transform: [{
                                translateY: typingDotAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -4 * (1 - i * 0.3)]
                                })
                            }]
                        }}
                    />
                ))}
            </View>
        </View>
    );

    const updateMyOnlineStatus = async (uid?: string) => {
        try {
            const id = uid || userId;
            if (id && socketService.socket) {
                socketService.socket.emit('heartbeat', id);
            }
        } catch { }
    };

    const loadCachedChatMessages = async (uid: string) => {
        try {
            const isGroup = route.params?.isGroup;
            const chatId = isGroup ? `group_${receiver?.id}` : `user_${receiver?.id}`; ChatDBService.resetConversationUnreadCount(chatId); // Try SQLite first with limit 30
            const cachedMessages = await ChatDBService.getMessages(chatId, 30, 0);

            if (cachedMessages && cachedMessages.length > 0) {
                if (cachedMessages.length >= 1) {
                    hasSufficientCacheRef.current = true;
                }

                // Map from SQLite schema back to UI structure
                const mapped = cachedMessages.map((m: any) => ({
                    ...m,
                    id: m.server_id,
                    is_mine: m.is_mine === 1,
                    isOptimistic: m.status === 'pending'
                }));

                setMessages(mapped);
                setLoading(false);
                console.log('[CHAT HISTORY] SQLite messages:', mapped.length);
            } else {
                // Fallback to AsyncStorage
                const cacheKey = `cached_messages_v2_${isGroup ? 'grp' : uid}_${receiver?.id}`;
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    setMessages(JSON.parse(cached));
                    setLoading(false);
                }
            }
        } catch (e) { }
    };

    const checkPayment = async (uId: string) => {
        if (!receiver?.id) return;

        const cacheKey = `payment_cache_${platform}_${uId}_${receiver.id}`;
        try {
            // Check cache first
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const now = Date.now();
                // If paid and cache is less than 24 hours old, use it
                if (parsed.paid && parsed.my_profile_id && (now - parsed.timestamp < 24 * 60 * 60 * 1000)) {
                    setMyProfileId(parsed.my_profile_id);
                    setPaymentStatus('paid');
                    setLoading(false);
                    return; // Skip API call
                }
            }
        } catch (e) { }

        try {
            const res = await api.get(
                `check_chat_payment.php?user_id=${uId}&receiver_id=${receiver.id}&platform=${platform}`
            );

            if (res.data.status === 'success') {
                setMyProfileId(res.data.my_profile_id);

                // Block status will be checked by startPolling once myProfileId is set.
                if (res.data.paid) {
                    setPaymentStatus('paid');
                    // Cache successful payment status
                    AsyncStorage.setItem(cacheKey, JSON.stringify({
                        paid: true,
                        my_profile_id: res.data.my_profile_id,
                        timestamp: Date.now()
                    })).catch(() => { });
                } else {
                    setPaymentStatus('unpaid');
                    setPaymentUrl(
                        res.data.payment_url
                            ? getFullPaymentUrl(res.data.payment_url)
                            : null
                    );
                    // Clear cache if unpaid
                    AsyncStorage.removeItem(cacheKey).catch(() => { });
                }
            } else {
                Alert.alert('Error', res.data.message || 'Payment check failed');
            }
        } catch {
            Alert.alert('Error', 'Network error while checking payment');
        } finally {
            setLoading(false);
        }
    };

    // Helper to check block status with immediate ID
    const checkBlockStatusInternal = async (mid: string) => {
        if (!mid || !receiver?.id) return;

        // Local Check first
        try {
            const storedByMe = await AsyncStorage.getItem(`blocked_by_me_${mid}_${receiver.id}`);
            const storedByThem = await AsyncStorage.getItem(`blocked_by_them_${mid}_${receiver.id}`);
            if (storedByMe !== null) setIsBlockedByMe(storedByMe === 'true');
            if (storedByThem !== null) setIsBlockedByThem(storedByThem === 'true');
        } catch (e) { }

        try {
            const res = await api.post('block_user.php', {
                my_id: mid,
                target_id: receiver.id,
                platform: platform,
                action: 'check'
            });
            if (res.data.status === 'success') {
                const byMe = !!res.data.blocked_by_me;
                const byThem = !!res.data.blocked_by_them;
                setIsBlockedByMe(byMe);
                setIsBlockedByThem(byThem);
                AsyncStorage.setItem(`blocked_by_me_${mid}_${receiver.id}`, String(byMe));
                AsyncStorage.setItem(`blocked_by_them_${mid}_${receiver.id}`, String(byThem));
            }
        } catch (e) { }
    };

    const saveFontSize = async (size: number) => {
        const validSize = isNaN(size) ? 16 : Math.max(12, Math.min(30, size));
        setFontSize(validSize);
        await AsyncStorage.setItem('chat_font_size', validSize.toString());
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr.replace(' ', 'T'));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    };

    const formatDateHeader = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr.replace(' ', 'T'));
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined });
    };

    const isDifferentDay = (date1: string, date2: string) => {
        if (!date1 || !date2) return true;
        const d1 = new Date(date1.replace(' ', 'T'));
        const d2 = new Date(date2.replace(' ', 'T'));
        return d1.toDateString() !== d2.toDateString();
    };

    const fetchMessages = async (pid: string | null = null, isReconnect: boolean = false) => {
        const currentId = pid || myProfileId;
        if (!currentId || !receiver?.id) return;

        try {
            const isGroup = route.params?.isGroup;
            let extraParams = '';
            if (isReconnect && messagesRef.current && messagesRef.current.length > 0) {
                const realMessages = messagesRef.current.filter(m => !m.isOptimistic);
                const newestMsg = realMessages.length > 0 ? realMessages[0] : null;
                if (newestMsg) {
                    const sinceId = typeof newestMsg.id === 'string' && newestMsg.id.includes('pending') ? 0 : newestMsg.id;
                    extraParams = `&since_time=${encodeURIComponent(newestMsg.created_at)}&since_id=${sinceId}`;
                }
            }

            const endpoint = isGroup
                ? `get_group_messages.php?group_id=${receiver.id}&user_id=${userId}${extraParams}&t=${Date.now()}`
                : `get_chat_messages.php?my_profile_id=${currentId}&receiver_id=${receiver.id}&platform=${platform}${extraParams}&t=${Date.now()}`;
            const res = await api.get(endpoint);
            if (res?.data?.status === 'success' && Array.isArray(res?.data?.data) && isMountedRef.current) {
                // Map group messages for common keys
                const mappedData = res.data.data.map((m: any) => {
                    const att = isGroup ? (m.attachment || '') : (m.file || '');
                    // Skip empty attachment strings
                    const fileField = att.trim() === '' ? null : att;
                    // Use ref for immediate comparison - fixes race condition where state userId is null
                    const currentUserId = userIdRef.current || userId;
                    const isSeen = isGroup
                        ? (m.seen_by && m.seen_by !== '[]' && m.seen_by !== '')
                        : m.seen == 1;

                    return {
                        ...m,
                        is_mine: isGroup ? (String(m.sender_id) === String(currentUserId)) : m.is_mine,
                        seen: isSeen ? 1 : 0,
                        file: fileField,
                        file_type: m.file_type || (
                            fileField && (fileField.toLowerCase().endsWith('.mp4') ||
                                fileField.toLowerCase().endsWith('.mov') ||
                                fileField.toLowerCase().endsWith('.3gp'))
                                ? 'video' : (fileField ? 'image' : null)
                        )
                    };
                }).sort((a: any, b: any) => {
                    const timeA = new Date((a.created_at || '').replace(' ', 'T')).getTime() || 0;
                    const timeB = new Date((b.created_at || '').replace(' ', 'T')).getTime() || 0;
                    return timeB - timeA; // Descending: newest first, oldest last
                });
                if (mappedData.length === 0 && isReconnect) return;

                setMessages(prev => {
                    const optimisticMsgs = prev.filter((m: any) => m.isOptimistic);
                    const realPrevMsgs = prev.filter((m: any) => !m.isOptimistic);

                    const newIds = new Set(mappedData.map((m: any) => m.id));
                    const preservedOlderMsgs = realPrevMsgs.filter((m: any) => !newIds.has(m.id));

                    // Deduplicate optimistics just in case
                    const finalOptimistics = optimisticMsgs.filter(o => {
                        const lastRealMsg = mappedData.length > 0 ? mappedData[0] : null;
                        return !(lastRealMsg && lastRealMsg.message === o.message);
                    });

                    const finalData = [...finalOptimistics, ...mappedData, ...preservedOlderMsgs];

                    if (prev.length === finalData.length) {
                        let changed = false;
                        for (let i = 0; i < prev.length; i++) {
                            if (prev[i].id !== finalData[i].id ||
                                prev[i].seen !== finalData[i].seen ||
                                prev[i].is_deleted !== finalData[i].is_deleted ||
                                prev[i].message !== finalData[i].message) {
                                changed = true;
                                break;
                            }
                        }
                        if (!changed) return prev;
                    }

                    const currentUIdForCache = userIdRef.current || userId;
                    const cacheKey = `cached_messages_v2_${isGroup ? 'grp' : currentUIdForCache}_${receiver?.id}`;
                    AsyncStorage.setItem(cacheKey, JSON.stringify(finalData));

                    // Save to SQLite asynchronously
                    const chatId = isGroup ? `group_${receiver?.id}` : `user_${receiver?.id}`;
                    ChatDBService.saveMessages(chatId, finalData).catch(() => { });

                    return finalData;
                });

                if (isGroup) {
                    setGroupAdminsOnly(res.data.admins_only == 1);
                    // Check if I am admin in this group
                    const currentUId = userIdRef.current || userId;
                    if (currentUId) {
                        const resMembers = await api.get(`/get_group_members.php?group_id=${receiver.id}`);
                        if (resMembers?.data?.status === 'success' && Array.isArray(resMembers?.data?.data)) {
                            const myMember = resMembers.data.data.find((m: any) => m.user_id == currentUId);
                            setIsMeAdmin(myMember?.role === 'admin' || resMembers.data.creator_id == currentUId);
                        }
                    }
                }
            }
        } catch { }
    };
    const [hasMoreHistory, setHasMoreHistory] = useState(true);

    const fetchMoreMessages = async () => {
        if (isFetchingMoreRef.current || !hasMoreHistory) return;
        isFetchingMoreRef.current = true;
        try {
            const isGroup = route.params?.isGroup;
            // The oldest message is at index 0 (chronological order)
            const oldestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const beforeTime = oldestMessage ? oldestMessage.created_at : '';
            // Handle pending messages gracefully by defaulting before_id to 0 if id is non-numeric (e.g. pending_uuid)
            const beforeId = oldestMessage && typeof oldestMessage.id === 'string' && oldestMessage.id.includes('pending') ? 0 : (oldestMessage ? oldestMessage.id : 0);

            console.log('\n[CHAT HISTORY] TOP REACHED');
            console.log('[CHAT HISTORY] cursor_time=' + beforeTime);
            console.log('[CHAT HISTORY] cursor_id=' + beforeId);
            console.log('[CHAT HISTORY] Loading 30 older messages');

            const endpoint = isGroup
                ? `get_group_messages.php?group_id=${receiver?.id}&user_id=${userId}&limit=30&before_time=${encodeURIComponent(beforeTime)}&before_id=${beforeId}&t=${Date.now()}`
                : `get_chat_messages.php?my_profile_id=${myProfileId}&receiver_id=${receiver?.id}&platform=${platform}&limit=30&before_time=${encodeURIComponent(beforeTime)}&before_id=${beforeId}&t=${Date.now()}`;

            const res = await api.get(endpoint);

            if (res?.data?.status === 'success' && Array.isArray(res?.data?.data) && isMountedRef.current) {
                const mappedData = res.data.data.map((m: any) => {
                    const att = isGroup ? (m.attachment || '') : (m.file || '');
                    const fileField = att.trim() === '' ? null : att;
                    const currentUserId = userIdRef.current || userId;
                    const isSeen = isGroup ? (m.seen_by && m.seen_by !== '[]' && m.seen_by !== '') : m.seen == 1;

                    return {
                        ...m,
                        is_mine: isGroup ? (String(m.sender_id) === String(currentUserId)) : m.is_mine,
                        seen: isSeen ? 1 : 0,
                        file: fileField,
                        file_type: m.file_type || (
                            fileField && (fileField.toLowerCase().endsWith('.mp4') || fileField.toLowerCase().endsWith('.mov')) ? 'video' : (fileField ? 'image' : null)
                        )
                    };
                }).sort((a: any, b: any) => {
                    const timeA = new Date((a.created_at || '').replace(' ', 'T')).getTime() || 0;
                    const timeB = new Date((b.created_at || '').replace(' ', 'T')).getTime() || 0;
                    return timeB - timeA;
                });

                console.log('[CHAT HISTORY] received=' + mappedData.length);
                if (mappedData.length > 0) {
                    console.log('[CHAT HISTORY] first_received_id=' + mappedData[0].id);
                    console.log('[CHAT HISTORY] last_received_id=' + mappedData[mappedData.length - 1].id);
                }

                if (mappedData.length < 30) {
                    console.log('[CHAT HISTORY] END OF HISTORY');
                    setHasMoreHistory(false);
                }

                if (mappedData.length > 0) {
                    setMessages(prev => {
                        // Deduplicate to prevent key errors
                        const existingIds = new Set(prev.map(m => m.id));
                        const newData = mappedData.filter((m: any) => !existingIds.has(m.id));
                        const finalData = [...prev, ...newData];
                        console.log('[CHAT HISTORY] first_state_id=' + finalData[0]?.id);
                        console.log('[CHAT HISTORY] last_state_id=' + finalData[finalData.length - 1]?.id);
                        console.log('[HISTORY] latest messages NOT reloaded');
                        return finalData;
                    });
                }
            }
        } catch { } finally {
            isFetchingMoreRef.current = false;
        }
    };

    const fetchUserStatus = async (pid: string | null = null) => {
        if (route.params?.isGroup) {
            // For group chats, fetch group typing status
            try {
                const res = await api.get(
                    `get_group_typing.php?group_id=${receiver?.id}&user_id=${userId}&t=${Date.now()}`
                );
                if (res.data.status === 'success' && isMountedRef.current) {
                    setGroupTypingUser(prev => (prev === res.data.typing_user ? prev : (res.data.typing_user || null)));
                }
            } catch (e) { }
            return;
        }
        const currentId = pid || myProfileId;
        if (!currentId || !receiver?.id) return;

        try {
            // Note: API now expects profile_id (receiver) and my_profile_id (me)
            const res = await api.get(
                `get_chat_user_status.php?profile_id=${receiver.id}&my_profile_id=${currentId}&platform=${platform}&t=${Date.now()}`
            );
            if (res.data.status === 'success' && isMountedRef.current) {
                // online status driven by global OnlineContext
                setReceiverLastSeen((prev: string | null) => (prev === res.data.last_active ? prev : res.data.last_active));
                setIsReceiverTyping((prev: boolean) => (prev === res.data.is_typing ? prev : res.data.is_typing));
            }
        } catch (e) { console.log("Fetch Status Error", e); }
    };

    const handleTyping = (txt: string) => {
        setText(txt);
        if (!myProfileId) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (!isTyping) {
            setIsTyping(true);
            updateTypingStatus(true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            updateTypingStatus(false);
        }, 2000);
    };

    const handleTextChange = (txt: string) => {
        handleTyping(txt);
    };

    const updateTypingStatus = async (typing: boolean) => {
        if (!receiver?.id) return;
        try {
            if (route.params?.isGroup) {
                await api.post('update_group_typing.php', {
                    group_id: receiver.id,
                    user_id: userId,
                    is_typing: typing ? '1' : '0',
                });
            } else {
                if (!myProfileId) return;
                // Use WebSocket instead of hitting the API directly
                if (socketService.socket) {
                    socketService.socket.emit(typing ? 'typing' : 'stop_typing', {
                        senderId: myProfileId,
                        receiverId: receiver.id,
                        platform: platform
                    });
                }
            }
        } catch { }
    };

    const pickMedia = async () => {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All, // Images and Videos
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: asset.type, // 'image' or 'video'
                    mimeType: asset.mimeType,
                    fileName: asset.fileName || (asset.type === 'video' ? 'video.mp4' : 'image.jpg')
                });
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick media");
        }
    };

    const pickDocument = async () => {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', // All files
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'document',
                    mimeType: asset.mimeType,
                    fileName: asset.name,
                    size: asset.size
                });
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const takePhoto = async () => {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission denied", "We need camera permissions to take a photo");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'image',
                    mimeType: asset.mimeType,
                    fileName: asset.fileName || 'camera_photo.jpg'
                });
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to take photo");
        }
    };

    const cancelMedia = () => setSelectedMedia(null);

    const sendMessage = async () => {
        console.log("SEND MESSAGE TRIGGERED", { text, myProfileId, paymentStatus, isBlocked, hasMedia: !!selectedMedia });
        if ((!text.trim() && !selectedMedia) || !myProfileId || paymentStatus !== 'paid' || isBlocked) {
            console.log("SEND MESSAGE EARLY RETURN", {
                textEmpty: !text.trim(),
                noMedia: !selectedMedia,
                myProfileId,
                paymentStatus,
                isBlocked
            });
            return;
        }

        setShowEmojiPicker(false);

        const msgContent = text;
        const mediaToSend = selectedMedia;

        // Optimistic clear
        setText('');
        setSelectedMedia(null);
        updateTypingStatus(false);
        setUploading(!!mediaToSend);

        // Optimistic UI Render (Show instantly to Sender)
        const tempId = 'msg_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        const optimisticMsg = {
            id: tempId,
            client_message_id: tempId,
            message: msgContent,
            sender_id: myProfileId,
            receiver_id: receiver.id,
            created_at: (() => {
                // toISOString() gives UTC — but server stores IST (NOW() with +05:30 tz).
                // Use local time string so optimistic timestamp matches server format.
                const n = new Date();
                const pad = (x: number) => x.toString().padStart(2, '0');
                return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
            })(),
            is_mine: true,
            seen: 0,
            is_deleted: 0,
            file: mediaToSend ? mediaToSend.uri : null,
            file_type: mediaToSend ? (mediaToSend.type === 'video' ? 'video' : 'image') : null,
            isOptimistic: true
        };

        setMessages(prev => [optimisticMsg, ...prev]);
        setTimeout(() => {
            if (isAtBottomRef.current && navigation.isFocused()) {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
        }, 150);

        // Save to SQLite
        const isGroup = route.params?.isGroup;
        const chatId = isGroup ? `group_${receiver?.id}` : `user_${receiver?.id}`;
        ChatDBService.saveMessages(chatId, [optimisticMsg]).catch(() => { }); let timeStr = ""; try { const d = new Date(optimisticMsg.created_at.replace(" ", "T")); timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { } ChatDBService.updateConversationLastMessage(chatId, optimisticMsg.message || "Media", timeStr, false, true, false);

        try {
            const isGroup = route.params?.isGroup;

            // 1. Text Message (WebSocket Only)
            if (!mediaToSend) {
                if (socketService.socket) {
                    socketService.socket.emit('chat:send', {
                        isGroup,
                        receiver_id: receiver.id,
                        my_profile_id: myProfileId,
                        client_message_id: tempId,
                        message: msgContent,
                        platform: String(platform)
                    });
                    // We don't await the ACK here to keep the UI snappy and fully optimistic.
                    // The socket listener for 'chat:ack' will handle SQLite update to 'sent'.
                    // Fallback 'chat:error' will handle SQLite update to 'failed'.
                } else {
                    Alert.alert('Error', 'WebSocket not connected. Message pending.');
                    // Leave message in pending state; offline reconciliation logic will retry it
                }
            }
            // 2. Media Message (Requires Multi-part upload)
            else {
                const formData = new FormData();
                if (isGroup) {
                    formData.append('group_id', String(receiver.id));
                    formData.append('sender_id', String(userId || ''));
                } else {
                    formData.append('my_profile_id', String(myProfileId));
                    formData.append('receiver_id', String(receiver.id));
                }
                formData.append('client_message_id', tempId);
                formData.append('message', msgContent);
                formData.append('platform', String(platform));

                const filename = mediaToSend.fileName || mediaToSend.uri.split('/').pop();
                const type = mediaToSend.mimeType || (mediaToSend.type === 'video' ? 'video/mp4' : 'image/jpeg');
                formData.append(isGroup ? 'file' : 'attachment', {
                    uri: mediaToSend.uri,
                    name: filename,
                    type: type,
                } as any);

                const endpoint = isGroup ? 'send_group_message.php' : 'send_chat_message.php';
                const res = await api.post(endpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.data.status === 'success') {
                    const realId = res.data.id || res.data.client_message_id;
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isOptimistic: false } : m));
                    ChatDBService.updateMessageStatus(tempId, { status: 'sent', server_id: realId }).catch(() => { });

                    // The server already broadcasts new_notification internally now,
                    // so we do NOT emit 'send_notification' manually here anymore.
                } else {
                    console.log("Send Message Failed. Response:", res.data);
                    Alert.alert('Error', res.data.message || 'Failed to send message');
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                }
            }
        } catch (e: any) {
            console.error("Send Error:", e);
            Alert.alert('Error', e.message || 'Network error');
        } finally {
            setUploading(false);
        }
    };

    const initiateCall = async (type: 'audio' | 'video') => {
        if (!myProfileId || !receiver?.id) return;
        if (isBlocked) {
            Alert.alert("Blocked", isBlockedByMe ? "You have blocked this user. Unblock to make calls." : "You cannot call this user.");
            return;
        }

        Alert.alert(
            `Start ${type === 'video' ? 'Video' : 'Audio'} Call`,
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Call",
                    onPress: async () => {
                        // 1. Generate Consistent Channel ID (Sort IDs)
                        const ids = [parseInt(myProfileId), parseInt(receiver.id)].sort((a, b) => a - b);
                        const channelId = `call_${ids[0]}_${ids[1]}`;

                        // 2. Signal the call to backend (so receiver knows)
                        try {
                            await api.post('initiate_call.php', {
                                caller_id: myProfileId,
                                receiver_id: receiver.id,
                                type: type,
                                platform: platform,
                                peer_id: channelId
                            });
                        } catch (e) { console.error("Signal Error:", e); }

                        // 3. Navigate
                        navigation.navigate('AgoraCall', {
                            channelId: channelId,
                            isVideo: (type === 'video'),
                            isCaller: true,
                            otherUserId: receiver.id
                        });
                    }
                }
            ]
        );
    };

    const checkBlockStatus = async () => {
        if (!myProfileId || !receiver?.id) return;

        // Check local storage first
        let cacheFound = false;
        try {
            const storedByMe = await AsyncStorage.getItem(`blocked_by_me_${myProfileId}_${receiver.id}`);
            const storedByThem = await AsyncStorage.getItem(`blocked_by_them_${myProfileId}_${receiver.id}`);
            if (storedByMe !== null && storedByThem !== null) {
                setIsBlockedByMe(storedByMe === 'true');
                setIsBlockedByThem(storedByThem === 'true');
                cacheFound = true;
            }
        } catch (e) { }

        if (cacheFound) return; // Do not call API on every open if we have cached status

        try {
            const res = await api.post('block_user.php', {
                my_id: myProfileId,
                target_id: receiver.id,
                platform: platform,
                action: 'check'
            });
            if (res.data.status === 'success') {
                const byMe = !!res.data.blocked_by_me;
                const byThem = !!res.data.blocked_by_them;
                setIsBlockedByMe(byMe);
                setIsBlockedByThem(byThem);
                // Sync storage
                AsyncStorage.setItem(`blocked_by_me_${myProfileId}_${receiver.id}`, String(byMe));
                AsyncStorage.setItem(`blocked_by_them_${myProfileId}_${receiver.id}`, String(byThem));
            }
        } catch (e) { console.log("Check Block Error", e); }
    };

    const toggleBlockUser = async () => {
        if (!myProfileId || !receiver?.id) return;

        setShowMenu(false); // Close menu

        const action = isBlockedByMe ? 'unblock' : 'block';
        const confirmMsg = isBlockedByMe
            ? "Are you sure you want to Unblock this user?"
            : "Are you sure you want to Block this user? They won't be able to message you.";

        Alert.alert(
            isBlockedByMe ? "Unblock User" : "Block User",
            confirmMsg,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: isBlockedByMe ? "Unblock" : "Block",
                    style: isBlockedByMe ? "default" : "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.post('block_user.php', {
                                my_id: myProfileId,
                                target_id: receiver.id,
                                action: action,
                                platform: platform
                            });
                            if (res.data.status === 'success') {
                                const newState = !isBlockedByMe;
                                setIsBlockedByMe(newState);
                                AsyncStorage.setItem(`blocked_by_me_${myProfileId}_${receiver.id}`, String(newState));
                                Alert.alert("Success", isBlockedByMe ? "User Unblocked" : "User Blocked");
                            } else {
                                Alert.alert("Error", res.data.message || "Action failed");
                            }
                        } catch (e) {
                            Alert.alert("Error", "Network error");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteMessage = async (msgId: string) => {
        Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const isGroup = route.params?.isGroup;
                        const res = await api.post('delete_chat_message.php', {
                            message_id: msgId,
                            my_profile_id: isGroup ? userId : myProfileId,
                            is_group: isGroup ? '1' : '0'
                        });
                        if (res.data.status === 'success') {
                            // Update locally to show placeholder immediately
                            setMessages(prev => prev.map(m => m.id === msgId ? {
                                ...m,
                                is_deleted: 1,
                                message: '🚫 This message was deleted',
                                attachment: '',
                                file: ''
                            } : m));
                            setShowMessageOptions(false);
                            // Also fetch from server to sync
                            fetchMessages();
                        } else {
                            console.log("Delete Failed:", res.data);
                            Alert.alert("Error", res.data.message || "Could not delete message");
                        }
                    } catch (error) { console.error(error); }
                }
            }
        ]);
    };

    const fetchMessageInfo = async (msgId: string) => {
        setLoadingInfo(true);
        setShowMessageInfo(true);
        setShowMessageOptions(false);
        try {
            const res = await api.get(`get_group_message_info.php?message_id=${msgId}`);
            if (res.data.status === 'success') {
                setViewers(res.data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleLongPress = (item: any) => {
        setIsSelectionMode(true);
        setSelectedMessageIds([item.id]);
    };

    const toggleMessageSelection = (msgId: string) => {
        setSelectedMessageIds(prev => {
            if (prev.includes(msgId)) {
                const next = prev.filter(id => id !== msgId);
                if (next.length === 0) setIsSelectionMode(false);
                return next;
            }
            return [...prev, msgId];
        });
    };

    const fetchForwardingTargets = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                const res = await api.get(`/get_active_chats.php?user_id=${user.id}&platform=${platform}`);
                if (res.data.status === 'success') {
                    setForwardingTargets(res.data.data);
                }
            }
        } catch (e) { }
    };

    const handleForwardMessages = async () => {
        if (selectedTargets.length === 0 || selectedMessageIds.length === 0) return;
        setIsForwarding(true);
        try {
            // Sort selected messages by time to maintain order
            const msgsToForward = messages
                .filter(m => selectedMessageIds.includes(m.id))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            for (const target of selectedTargets) {
                for (const msg of msgsToForward) {
                    const isTargetGroup = target.isGroup;
                    const payload: any = {
                        message: msg.message || '',
                        platform: platform
                    };

                    if (isTargetGroup) {
                        payload.group_id = target.partner_id;
                        payload.sender_id = userId || '';
                    } else {
                        payload.my_profile_id = myProfileId || '';
                        payload.receiver_id = target.partner_id;
                    }

                    if (msg.file) {
                        payload.forward_file = msg.file;
                        payload.file_type = msg.file_type || '';
                    }

                    const endpoint = isTargetGroup ? 'send_group_message.php' : 'send_chat_message.php';
                    await api.post(endpoint, new URLSearchParams(payload).toString(), {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                }
            }
            Alert.alert("Success", "Messages forwarded");
            setShowForwardModal(false);
            setIsSelectionMode(false);
            setSelectedMessageIds([]);
            setSelectedTargets([]);
        } catch (e) {
            Alert.alert("Error", "Failed to forward some messages");
        } finally {
            setIsForwarding(false);
        }
    };

    const handlePayNow = () => {
        if (paymentUrl) Linking.openURL(paymentUrl);
        else Alert.alert('Error', 'Payment URL not available');
    };

    const getProfileImage = (usr: any) => {
        if (!usr) return null; // Return null to trigger fallback in render

        // Check all possible keys
        const img = usr.photo || usr.profile_photo || usr.avatar || usr.image;

        if (!img) return null;
        if (img.startsWith('http')) return { uri: img };
        return { uri: `${PHOTO_URL}${encodeURIComponent(img)}` };
    };

    // Helper to render Avatar or Initials
    const renderAvatar = () => {
        const source = getProfileImage(receiver);

        if (source) {
            return (
                <Image
                    source={source}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: 'white' }}
                />
            );
        }

        // Fallback: Initials
        const initials = (receiver?.full_name || 'U').charAt(0).toUpperCase();
        return (
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffedd5', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 18 }}>{initials}</Text>
            </View>
        );
    };


    // Removed full-screen loader to provide zero-loading experience.
    // Local SQLite cache will render instantly while payment status is checked in the background.

    if (paymentStatus === 'unpaid') {
        return (
            <View className="flex-1 items-center justify-center bg-white p-6">
                <TouchableOpacity
                    onPress={handlePayNow}
                    className="bg-orange-600 px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-bold">Pay Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="mt-6"
                >
                    <Ionicons name="close" size={26} color="gray" />
                </TouchableOpacity>
            </View>
        );
    }

    if (!receiver) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }} edges={['top', 'bottom']}>
            {/* Header */}
            {isSelectionMode ? (
                <View style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ea580c', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, zIndex: 20, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }}
                        style={{ marginRight: 16, padding: 4 }}
                    >
                        <Ionicons name="close" size={26} color="white" />
                    </TouchableOpacity>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, flex: 1 }}>{selectedMessageIds.length}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {selectedMessageIds.length === 1 && (
                            <TouchableOpacity
                                onPress={() => {
                                    const msg = messages.find(m => m.id === selectedMessageIds[0]);
                                    setSelectedMessage(msg);
                                    setShowMessageOptions(true);
                                }}
                                style={{ padding: 6 }}
                            >
                                <Ionicons name="ellipsis-vertical" size={22} color="white" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                fetchForwardingTargets();
                                setShowForwardModal(true);
                            }}
                            style={{ padding: 6 }}
                        >
                            <Ionicons name="arrow-redo" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, zIndex: 20, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8, padding: 6 }} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        activeOpacity={route.params?.isGroup ? 0.7 : 1}
                        onPress={() => {
                            if (route.params?.isGroup) {
                                navigation.navigate('GroupSettings', { group: receiver });
                            }
                        }}
                    >
                        <View style={{ position: 'relative' }}>
                            {renderAvatar()}
                            {receiverOnline && !route.params?.isGroup && (
                                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, backgroundColor: '#10b981', borderRadius: 6, borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }} />
                            )}
                        </View>
                        <View style={{ marginLeft: 10, flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#111827' }} numberOfLines={1}>
                                {receiver.full_name}
                            </Text>
                            {!route.params?.isGroup && (
                                isReceiverTyping ? (
                                    <TypingIndicator text="Typing" />
                                ) : (
                                    <Text style={{ fontSize: 11, fontWeight: '500', color: receiverOnline ? '#16a34a' : '#9ca3af' }}>
                                        {receiverOnline ? t('online') : (receiverLastSeen ? `Last seen ${receiverLastSeen}` : t('offline'))}
                                    </Text>
                                )
                            )}
                            {route.params?.isGroup && (
                                <>
                                    {groupTypingUser ? (
                                        <TypingIndicator text={`${groupTypingUser} is typing`} />
                                    ) : (
                                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#9ca3af' }}>Tap for group info</Text>
                                    )}
                                </>
                            )}
                        </View>
                    </TouchableOpacity>

                    {isSearchActive ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                            <Ionicons name="search" size={18} color="#6b7280" />
                            <TextInput
                                style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#1f2937', padding: 0 }}
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchQuery(''); }}>
                                <Ionicons name="close-circle" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {!route.params?.isGroup && platform === 'marriage' && (
                                <>
                                    <TouchableOpacity onPress={() => initiateCall('audio')} style={{ padding: 6 }} activeOpacity={0.7}>
                                        <Ionicons name="call-outline" size={22} color="#ea580c" />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => initiateCall('video')} style={{ padding: 6 }} activeOpacity={0.7}>
                                        <Ionicons name="videocam-outline" size={22} color="#ea580c" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* 3-Dot Menu */}
                            <TouchableOpacity onPress={toggleMenu} style={{ padding: 6 }} activeOpacity={0.7}>
                                <Ionicons name="ellipsis-vertical" size={22} color="#1f2937" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <View className="absolute top-16 right-4 bg-white rounded-xl shadow-xl z-50 overflow-hidden w-48 border border-gray-100" style={{ elevation: 5 }}>
                            {!route.params?.isGroup && platform === 'marriage' && (
                                <>
                                    <TouchableOpacity
                                        onPress={() => { setShowMenu(false); initiateCall('audio'); }}
                                        className="flex-row items-center px-4 py-3 active:bg-gray-50 bg-white border-b border-gray-100"
                                    >
                                        <Ionicons name="call-outline" size={20} color="#ea580c" />
                                        <Text className="ml-3 font-medium text-gray-700">Audio Call</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => { setShowMenu(false); initiateCall('video'); }}
                                        className="flex-row items-center px-4 py-3 active:bg-gray-50 bg-white border-b border-gray-100"
                                    >
                                        <Ionicons name="videocam-outline" size={20} color="#ea580c" />
                                        <Text className="ml-3 font-medium text-gray-700">Video Call</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            <TouchableOpacity
                                onPress={() => { setShowMenu(false); setIsSearchActive(true); }}
                                className="flex-row items-center px-4 py-3 active:bg-gray-50 bg-white border-b border-gray-100"
                            >
                                <Ionicons name="search" size={20} color="#374151" />
                                <Text className="ml-3 font-medium text-gray-700">Search</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={toggleBlockUser}
                                className="flex-row items-center px-4 py-3 active:bg-gray-50 bg-white"
                            >
                                <Ionicons
                                    name={isBlockedByMe ? "person-add-outline" : "person-remove-outline"}
                                    size={20}
                                    color={isBlockedByMe ? "#16a34a" : "#dc2626"}
                                />
                                <Text className={`ml-3 font-medium ${isBlockedByMe ? "text-green-600" : "text-red-600"}`}>
                                    {isBlockedByMe ? "Unblock User" : "Block User"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setShowFontSizeControl(!showFontSizeControl); setShowMenu(false); }}
                                className="flex-row items-center px-4 py-3 active:bg-gray-50 border-t border-gray-100 bg-white"
                            >
                                <Ionicons name="text" size={20} color="#f97316" />
                                <Text className="ml-3 font-medium text-gray-700">Font Size</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Font Size Control Overlay */}
            {showFontSizeControl && (
                <View className="absolute top-20 left-4 right-4 bg-white rounded-2xl shadow-2xl z-[60] p-4 border border-orange-100">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="font-bold text-gray-800">Adjust Font Size</Text>
                        <TouchableOpacity onPress={() => setShowFontSizeControl(false)}>
                            <Ionicons name="close-circle" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center justify-between bg-gray-50 p-2 rounded-xl">
                        <TouchableOpacity
                            onPress={() => saveFontSize(Math.max(12, fontSize - 1))}
                            className="bg-white p-3 rounded-lg shadow-sm"
                        >
                            <Ionicons name="remove" size={20} color="#ea580c" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-orange-600">{fontSize}</Text>
                        <TouchableOpacity
                            onPress={() => saveFontSize(Math.min(30, fontSize + 1))}
                            className="bg-white p-3 rounded-lg shadow-sm"
                        >
                            <Ionicons name="add" size={20} color="#ea580c" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-center mt-3 text-gray-400 text-xs">Preview: Sample message text</Text>
                    <Text style={{ fontSize, textAlign: 'center', marginTop: 5, color: '#374151' }}>Hello! This is a preview.</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                className="flex-1"
                enabled={true}
            >
                <FlatList
                    inverted={true}
                    onScroll={(e) => { isAtBottomRef.current = e.nativeEvent.contentOffset.y <= 50; }}
                    onEndReached={fetchMoreMessages}
                    onEndReachedThreshold={0.3}
                    scrollEventThrottle={16}
                    ref={flatListRef}
                    keyboardShouldPersistTaps="handled" extraData={receiverOnline}
                    data={searchQuery.trim() ? messages.filter(m => m.message?.toLowerCase().includes(searchQuery.toLowerCase())) : messages}
                    keyExtractor={(item, index) => (item?.id && item.id !== 'undefined' ? `msg_${item.id}` : (item?.client_message_id ? `cmid_${item.client_message_id}` : `idx_${index}`))}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
                    ListFooterComponent={
                        hasMoreHistory && messages.length >= 30 ? (
                            <View style={{ padding: 10, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#ea580c" />
                            </View>
                        ) : null
                    }
                    renderItem={({ item, index }) => {
                        const isMe = item.is_mine;
                        const hasFile = !!(item.file && item.file.trim && item.file.trim() !== '');
                        const timeStr = formatTime(item.created_at);
                        const isDeleted = item.is_deleted == 1;

                        const nextItem = index < messages.length - 1 ? messages[index + 1] : null;
                        const showDateHeader = !nextItem || isDifferentDay(item.created_at, nextItem.created_at);

                        // Robust URL resolution
                        let fileUrl: string | null = null;
                        if (hasFile && item.file) {
                            const f = item.file as string;
                            if (f.startsWith('http')) {
                                fileUrl = f;
                            } else {
                                let cleanPath = f.startsWith('/') ? f.substring(1) : f;
                                if (!cleanPath.includes('uploads/')) {
                                    cleanPath = `uploads/chat/${cleanPath}`;
                                }
                                fileUrl = `${BASE_URL_ROOT}/${cleanPath}`;
                            }
                        }

                        // Fallback type detection if file_type is missing
                        const isVideo = item.file_type === 'video' || (item.file && item.file.toLowerCase().endsWith('.mp4'));

                        const isSelected = selectedMessageIds.includes(item.id);

                        return (
                            <View>
                                {showDateHeader && (
                                    <View className="items-center my-4">
                                        <View className="bg-gray-100/80 px-4 py-1.5 rounded-2xl border border-gray-200">
                                            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {formatDateHeader(item.created_at)}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => isSelectionMode ? toggleMessageSelection(item.id) : null}
                                    onLongPress={() => !isDeleted && handleLongPress(item)}
                                    style={{
                                        marginBottom: 12,
                                        width: '100%',
                                        flexDirection: 'row',
                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                        backgroundColor: isSelected ? 'rgba(251,146,60,0.15)' : 'transparent',
                                        borderRadius: isSelected ? 12 : 0,
                                    }}
                                >
                                    <View
                                        style={{
                                            maxWidth: '75%',
                                            elevation: 1,
                                            shadowColor: '#000',
                                            shadowOpacity: 0.06,
                                            shadowRadius: 3,
                                            shadowOffset: { width: 0, height: 1 },
                                            overflow: 'hidden',
                                            flexShrink: 1,
                                            backgroundColor: isDeleted ? '#f3f4f6' : (isMe ? '#ea580c' : '#ffffff'),
                                            borderRadius: 18,
                                            borderTopRightRadius: isMe ? (isDeleted ? 18 : 4) : 18,
                                            borderTopLeftRadius: isMe ? 18 : (isDeleted ? 18 : 4),
                                            borderWidth: isDeleted ? 1 : (isMe ? 0 : 1),
                                            borderColor: isDeleted ? '#e5e7eb' : '#f3f4f6',
                                        }}
                                    >
                                        {hasFile && fileUrl && !isDeleted && (
                                            <View className="mb-1">
                                                {isVideo ? (
                                                    <Video
                                                        source={{ uri: fileUrl }}
                                                        style={{ width: 200, height: 150, backgroundColor: 'black' }}
                                                        useNativeControls
                                                        resizeMode={ResizeMode.CONTAIN}
                                                        isLooping
                                                    />
                                                ) : item.file_type === 'document' ? (
                                                    <TouchableOpacity
                                                        onPress={() => isSelectionMode ? toggleMessageSelection(item.id) : Linking.openURL(fileUrl as string)}
                                                        onLongPress={() => !isDeleted && handleLongPress(item)}
                                                        className={`p-3 flex-row items-center space-x-3 w-[200px] ${isMe ? 'bg-orange-700' : 'bg-gray-50'}`}
                                                    >
                                                        <Ionicons name="document-text" size={32} color={isMe ? "white" : "#ea580c"} />
                                                        <View className="flex-1 ml-2">
                                                            <Text className={`text-xs font-bold ${isMe ? 'text-white' : 'text-gray-800'}`} numberOfLines={1}>
                                                                {item.file?.split('/').pop()}
                                                            </Text>
                                                            <Text className={`text-[10px] ${isMe ? 'text-orange-200' : 'text-gray-500'}`}>Document</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        onPress={() => isSelectionMode ? toggleMessageSelection(item.id) : setFullScreenImage(fileUrl)}
                                                        onLongPress={() => !isDeleted && handleLongPress(item)}
                                                    >
                                                        <Image
                                                            source={{ uri: fileUrl as string }}
                                                            style={{ width: 200, height: 200, backgroundColor: 'transparent' }}
                                                            contentFit="cover"
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}

                                        {/* Sender Name & Photo for Group Chats */}
                                        {route.params?.isGroup && !isMe && item.sender_name && (
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    navigation.push('Chat', {
                                                        receiver: {
                                                            id: item.sender_id,
                                                            full_name: item.sender_name,
                                                            photo: item.sender_photo,
                                                        },
                                                        platform: platform,
                                                        isGroup: false
                                                    });
                                                }}
                                                className="flex-row items-center px-4 pt-2"
                                            >
                                                {(() => {
                                                    const photo = item.sender_photo;
                                                    let source = null;
                                                    if (photo) {
                                                        if (photo.startsWith('http')) source = { uri: photo };
                                                        else source = { uri: `${PHOTO_URL}${encodeURIComponent(photo)}` };
                                                    }

                                                    if (source) {
                                                        return (
                                                            <Image
                                                                source={source}
                                                                className="w-6 h-6 rounded-full bg-gray-200 mr-2"
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-2">
                                                            <Text className="text-[10px] text-orange-600 font-bold">
                                                                {(item.sender_name || 'U').charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}
                                                <Text className="text-xs text-orange-600 font-bold">
                                                    {item.sender_name}
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        {isDeleted ? (
                                            <View className="flex-row items-center px-4 py-3 space-x-2">
                                                <Ionicons name="ban" size={14} color="#9ca3af" />
                                                <Text className="text-gray-400 italic text-sm ml-1">This message was deleted</Text>
                                            </View>
                                        ) : (
                                            <>
                                                {!!item.message && (
                                                    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 }}>
                                                        <Text
                                                            key={`msg-${item.id}`}
                                                            style={{ fontSize, flexShrink: 1, color: isMe ? '#ffffff' : '#1f2937', lineHeight: fontSize * 1.4 }}
                                                            numberOfLines={expandedMessageIds.includes(item.id) ? undefined : 10}
                                                        >
                                                            {item.message}
                                                        </Text>
                                                        {item.message.length > 250 || item.message.split('\n').length > 10 ? (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    const id = item.id;
                                                                    setExpandedMessageIds(prev =>
                                                                        prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
                                                                    );
                                                                }}
                                                                className="py-1"
                                                            >
                                                                <Text className={`text-xs font-bold ${isMe ? 'text-orange-200' : 'text-orange-600'}`}>
                                                                    {expandedMessageIds.includes(item.id) ? 'Read Less' : '...Read More'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ) : null}
                                                    </View>
                                                )}

                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6, gap: 4 }}>
                                                    <Text key={`time-${item.id}`} style={{ fontSize: 10, fontWeight: '500', color: isMe ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
                                                        {timeStr}
                                                    </Text>
                                                    {isMe && (
                                                        <Ionicons
                                                            name={
                                                                item.isOptimistic ? "time-outline" :
                                                                    (item.seen == 1 || receiverOnline) ? "checkmark-done-outline" :
                                                                        "checkmark-outline"
                                                            }
                                                            size={14}
                                                            color={item.seen == 1 ? "#3b82f6" : "rgba(255,255,255,0.8)"}
                                                        />
                                                    )}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                />

                {/* Media Preview */}
                {selectedMedia && (
                    <View className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex-row items-center">
                        <View className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden items-center justify-center">
                            {selectedMedia.type === 'image' ? (
                                <Image source={{ uri: selectedMedia.uri }} className="w-full h-full" />
                            ) : selectedMedia.type === 'video' ? (
                                <Ionicons name="videocam" size={24} color="#ea580c" />
                            ) : (
                                <Ionicons name="document-text" size={24} color="#ea580c" />
                            )}
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="text-gray-800 font-bold text-sm" numberOfLines={1}>{selectedMedia.fileName}</Text>
                            <Text className="text-gray-400 text-xs">{selectedMedia.type?.toUpperCase() || 'FILE'}</Text>
                        </View>
                        <TouchableOpacity onPress={cancelMedia} className="p-2">
                            <Ionicons name="close-circle" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Attachment Menu */}
                {showAttachmentMenu && (
                    <View className="absolute bottom-20 left-4 bg-white rounded-3xl shadow-2xl p-4 flex-row space-x-6 z-50 border border-gray-100" style={{ elevation: 10 }}>
                        <TouchableOpacity onPress={pickMedia} className="items-center">
                            <View className="w-14 h-14 bg-orange-100 rounded-full items-center justify-center mb-1">
                                <Ionicons name="images" size={24} color="#ea580c" />
                            </View>
                            <Text className="text-xs text-gray-600 font-bold">Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickDocument} className="items-center ml-4">
                            <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center mb-1">
                                <Ionicons name="document" size={24} color="#2563eb" />
                            </View>
                            <Text className="text-xs text-gray-600 font-bold">Document</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={takePhoto} className="items-center ml-4">
                            <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-1">
                                <Ionicons name="camera" size={24} color="#16a34a" />
                            </View>
                            <Text className="text-xs text-gray-600 font-bold">Camera</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input Area */}
                {isBlocked ? (
                    <View className="bg-gray-100 p-4 rounded-xl items-center justify-center border border-gray-200 m-4">
                        <Text className="text-gray-500 font-medium text-center">
                            {isBlockedByMe
                                ? "You have blocked this user. Unblock to send messages."
                                : "You cannot send messages to this user."}
                        </Text>
                    </View>
                ) : (groupAdminsOnly && !isMeAdmin) ? (
                    <View className="bg-gray-50 p-4 rounded-xl items-center justify-center border border-gray-100 m-4">
                        <Ionicons name="lock-closed" size={20} color="#9ca3af" className="mb-1" />
                        <Text className="text-gray-500 font-medium text-center text-sm">
                            Only admins can send messages to this group.
                        </Text>
                    </View>
                ) : (
                    <View style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: 'white',
                        borderTopWidth: 1,
                        borderTopColor: '#f3f4f6',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                Keyboard.dismiss();
                                setShowAttachmentMenu(!showAttachmentMenu);
                            }}
                            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: showAttachmentMenu ? '#ffedd5' : '#f9fafb', borderWidth: 1, borderColor: showAttachmentMenu ? '#ffedd5' : '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={showAttachmentMenu ? "close" : "add"} size={22} color="#ea580c" />
                        </TouchableOpacity>

                        <View style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', minHeight: 38 }}>
                            <TextInput
                                style={{ flex: 1, color: '#1f2937', fontSize: 14, maxHeight: 100, paddingVertical: 6 }}
                                placeholder={t('typeMessage')}
                                placeholderTextColor="#9ca3af"
                                multiline
                                value={text}
                                onChangeText={handleTextChange}
                                onFocus={() => {
                                    setShowEmojiPicker(false);
                                    setShowAttachmentMenu(false);
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setShowEmojiPicker(prev => !prev);
                                    setShowAttachmentMenu(false);
                                }}
                                style={{ padding: 4 }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={showEmojiPicker ? "close-circle-outline" : "happy-outline"} size={22} color={showEmojiPicker ? "#ea580c" : "#9ca3af"} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={(!text.trim() && !selectedMedia) || uploading}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: (text.trim() || selectedMedia) && !uploading ? '#ea580c' : '#f3f4f6',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            activeOpacity={0.7}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons
                                    name="send"
                                    size={16}
                                    color={(text.trim() || selectedMedia) ? "white" : "#9ca3af"}
                                    style={{ marginLeft: 2 }}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Custom Emoji Picker */}
                {showEmojiPicker && (() => {
                    const emojiRows = [
                        ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '😝', '🤑', '🤗', '😇'],
                        ['😢', '😭', '😤', '😠', '🤪', '😱', '😨', '😰', '😥', '😓', '🙄', '😬', '🤥', '😶', '😐'],
                        ['👍', '👎', '👏', '🙌', '🤝', '✊', '👊', '🤲', '🙏', '💪', '👌', '✌️', '🤞', '🖐️', '👋'],
                        ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖'],
                        ['🔥', '💯', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💎', '🚨'],
                        ['😴', '🤔', '🤗', '😏', '😒', '😞', '😑', '🥺', '😔', '😟', '🤒', '🤕', '🤧', '😷', '🥴'],
                        ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐧'],
                        ['🍕', '🍔', '🍟', '🌮', '🌯', '🍜', '🍱', '🍣', '🍩', '🍪', '🍰', '🎂', '🍫', '🍬', '🍭'],
                        ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥊', '🏋️', '🤸', '⛹️', '🏊', '🚴'],
                        ['🚀', '🛸', '🌈', '🌊', '🌋', '🌸', '🌺', '🌻', '🌹', '🌿', '🍀', '🌴', '🌵', '🍁', '🍄'],
                    ];
                    return (
                        <View style={{ backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                            {emojiRows.map((row, rowIndex) => (
                                <ScrollView key={rowIndex} horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 4 }}>
                                        {row.map((emoji, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => setText(prev => prev + emoji)}
                                                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            ))}
                        </View>
                    );
                })()}
            </KeyboardAvoidingView>

            {/* Full Screen Image Modal */}
            <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
                <View className="flex-1 bg-black justify-center items-center">
                    <TouchableOpacity
                        className="absolute top-12 right-6 z-50 p-2 bg-black/50 rounded-full"
                        onPress={() => setFullScreenImage(null)}
                    >
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    {fullScreenImage && (
                        <Image
                            source={{ uri: fullScreenImage }}
                            className="w-full h-full"
                            contentFit="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Message Options Modal */}
            <Modal visible={showMessageOptions} transparent={true} animationType="fade" onRequestClose={() => setShowMessageOptions(false)}>
                <TouchableOpacity
                    className="flex-1 bg-black/40 justify-center items-center p-6"
                    activeOpacity={1}
                    onPress={() => setShowMessageOptions(false)}
                >
                    <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <View className="p-4 border-b border-gray-100 bg-gray-50">
                            <Text className="text-center font-bold text-gray-800">Message Options</Text>
                        </View>

                        {route.params?.isGroup && (
                            <TouchableOpacity
                                className="flex-row items-center px-6 py-4 active:bg-gray-50 border-b border-gray-50"
                                onPress={() => fetchMessageInfo(selectedMessage?.id)}
                            >
                                <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="information-circle" size={24} color="#2563eb" />
                                </View>
                                <Text className="text-lg text-gray-700 font-medium">Info</Text>
                            </TouchableOpacity>
                        )}

                        {selectedMessage?.is_mine && (
                            <TouchableOpacity
                                className="flex-row items-center px-6 py-4 active:bg-gray-50"
                                onPress={() => handleDeleteMessage(selectedMessage?.id)}
                            >
                                <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="trash" size={22} color="#dc2626" />
                                </View>
                                <Text className="text-lg text-red-600 font-medium">Delete</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="px-6 py-4 active:bg-gray-50 items-center border-t border-gray-100"
                            onPress={() => setShowMessageOptions(false)}
                        >
                            <Text className="text-gray-500 font-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Message Info Modal */}
            <Modal visible={showMessageInfo} transparent={true} animationType="slide" onRequestClose={() => setShowMessageInfo(false)}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white rounded-t-3xl h-[60%] shadow-2xl">
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">Message Info</Text>
                            <TouchableOpacity onPress={() => setShowMessageInfo(false)} className="p-2 bg-gray-100 rounded-full">
                                <Ionicons name="close" size={24} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        {loadingInfo ? (
                            <View className="flex-1 justify-center items-center">
                                <ActivityIndicator size="large" color="#ea580c" />
                                <Text className="text-gray-400 mt-2">Fetching viewers...</Text>
                            </View>
                        ) : (
                            <FlashList
                                data={viewers}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={{ padding: 16 }}
                                ListEmptyComponent={
                                    <View className="items-center py-20">
                                        <Ionicons name="eye-off-outline" size={60} color="#cbd5e1" />
                                        <Text className="text-gray-400 mt-4 text-center">No one has seen this message yet</Text>
                                    </View>
                                }
                                renderItem={({ item }) => {
                                    const seenAt = new Date(item.seen_at.replace(' ', 'T'));
                                    const timeStr = seenAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const dateStr = seenAt.toLocaleDateString([], { month: 'short', day: 'numeric' });

                                    const photoSource = item.photo
                                        ? (item.photo.startsWith('http') ? { uri: item.photo } : { uri: `${PHOTO_URL}${encodeURIComponent(item.photo)}` })
                                        : null;

                                    return (
                                        <View className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                            {photoSource ? (
                                                <Image source={photoSource} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                            ) : (
                                                <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center border-2 border-white shadow-sm">
                                                    <Text className="text-orange-600 font-bold text-lg">{(item.name || 'U').charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                            <View className="ml-4 flex-1">
                                                <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
                                                <Text className="text-xs text-gray-500">{dateStr} at {timeStr}</Text>
                                            </View>
                                            <Ionicons name="checkmark-done" size={20} color="#16a34a" />
                                        </View>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
            {/* Forward Modal (Absolute View to preserve context) */}
            {showForwardModal && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
                    <Pressable style={{ flex: 1 }} onPress={() => setShowForwardModal(false)} />
                    <View style={{ height: '80%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 }}>
                        <View className="px-6 py-4 border-b border-gray-100">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-xl font-bold text-gray-800">Forward to...</Text>
                                <TouchableOpacity onPress={() => setShowForwardModal(false)} className="p-2 bg-gray-100 rounded-full">
                                    <Ionicons name="close" size={24} color="#4b5563" />
                                </TouchableOpacity>
                            </View>
                            <View className="bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
                                <Ionicons name="search" size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 ml-2 text-gray-800"
                                    placeholder="Search chats..."
                                    value={forwardSearch}
                                    onChangeText={setForwardSearch}
                                />
                            </View>
                        </View>

                        <FlashList
                            data={forwardingTargets.filter(t => t.full_name?.toLowerCase().includes(forwardSearch.toLowerCase()))}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedTargets.some(t => t.partner_id === item.partner_id);
                                const photoSource = item.profile_photo
                                    ? { uri: `${PHOTO_URL}${encodeURIComponent(item.profile_photo)}` }
                                    : null;

                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedTargets(prev => {
                                                if (isSelected) return prev.filter(t => t.partner_id !== item.partner_id);
                                                return [...prev, item];
                                            });
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 12,
                                            marginBottom: 8,
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: isSelected ? '#fed7aa' : '#f3f4f6',
                                            backgroundColor: isSelected ? '#fff7ed' : '#f9fafb'
                                        }}
                                    >
                                        {photoSource ? (
                                            <Image source={photoSource} style={{ width: 48, height: 48, borderRadius: 24 }} />
                                        ) : (
                                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 18 }}>{(item.full_name || 'U').charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                        <View style={{ marginLeft: 16, flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>{item.full_name}</Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.isGroup ? 'Group' : 'Contact'}</Text>
                                        </View>
                                        <Ionicons
                                            name={isSelected ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={isSelected ? "#ea580c" : "#cbd5e1"}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginBottom: 24 }}>
                            <TouchableOpacity
                                onPress={handleForwardMessages}
                                disabled={selectedTargets.length === 0 || isForwarding}
                                style={{
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: selectedTargets.length > 0 ? '#ea580c' : '#e5e7eb',
                                    elevation: selectedTargets.length > 0 ? 4 : 0
                                }}
                            >
                                {isForwarding ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>Forward</Text>
                                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{selectedTargets.length}</Text>
                                        </View>
                                        <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default ChatScreen;

















