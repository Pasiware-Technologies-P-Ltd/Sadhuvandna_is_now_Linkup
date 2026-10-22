import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const FollowListScreen = ({ route, navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { userId, action, title } = route.params;

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const isFetchingRef = useRef(false);

    const loadCachedFollowList = async (uid: string, listAction: string) => {
        try {
            const cached = await AsyncStorage.getItem(`cached_follow_list_${uid}_${listAction}`);
            if (cached) {
                setUsers(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        const loadCurrentUser = async () => {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                const u = JSON.parse(uStr);
                setCurrentUserId(u.id);
                if (!searchQuery) {
                    await loadCachedFollowList(u.id, action);
                }
            }
        };
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            const delayDebounceFn = setTimeout(() => {
                fetchUsersList(false);
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [currentUserId, userId, action, searchQuery]);

    const fetchUsersList = async (isMore = false) => {
        if (isFetchingRef.current) return;
        if (isMore && (!hasMore || loadingMore || loading)) return;

        isFetchingRef.current = true;
        if (isMore) setLoadingMore(true);
        else {
            setLoading(true);
            setPage(0);
            setHasMore(true);
        }

        try {
            const currentOffset = isMore ? (page + 1) * 20 : 0;
            const res = await api.post(`/api_follow.php?action=${action}&limit=20&offset=${currentOffset}`, {
                current_user_id: currentUserId,
                user_id: userId,
                search: searchQuery
            });

            if (res.data.ok) {
                const newList = res.data.list || [];
                if (isMore) {
                    setUsers(prev => [...prev, ...newList]);
                    setPage(prev => prev + 1);
                } else {
                    setUsers(newList);
                    if (!searchQuery) {
                        AsyncStorage.setItem(`cached_follow_list_${currentUserId}_${action}`, JSON.stringify(newList));
                    }
                }

                if (newList.length < 20) {
                    setHasMore(false);
                }
            } else {
                Alert.alert("Error", res.data.message || "Failed to load list");
            }
        } catch (error) {
            console.error("Fetch list error", error);
            Alert.alert("Error", "Network error while loading list.");
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleToggleFollow = async (targetUserId: string) => {
        if (!currentUserId) return;
        setProcessingId(targetUserId);

        try {
            const res = await api.post(`/api_follow.php?action=follow&current_user_id=${currentUserId}&user_id=${targetUserId}`, {
                current_user_id: currentUserId,
                user_id: targetUserId,
            });

            if (res.data.ok) {
                // Update local state without full refresh for better speed
                setUsers(prev => prev.map(u => {
                    if (u.id === targetUserId) {
                        const newIFollow = res.data.status !== 'unfollowed';
                        const newStatus = res.data.status === 'connected' ? 'accepted' : (res.data.status === 'requested' ? 'pending' : '');
                        return { ...u, i_follow: newIFollow, my_status: newStatus };
                    }
                    return u;
                }));
            } else {
                Alert.alert("Notice", res.data.message || "Failed to update status");
            }
        } catch (error) {
            Alert.alert("Error", "Network error while updating connection status.");
        } finally {
            setProcessingId(null);
        }
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View className="flex-1 justify-center items-center py-20 px-6">
                <Ionicons name="people-outline" size={64} color={theme.textMuted} />
                <Text style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center', fontSize: 16 }}>No {title.toLowerCase()} found.</Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const isMe = String(item.id) === String(currentUserId);

        let btnText = "Connect";
        let btnStyle = "bg-blue-600 border-blue-700";
        let textStyle = "text-white";
        let iconName: any = "person-add-outline";
        let iconColor = "white";

        if (item.i_follow) {
            if (item.my_status === 'accepted') {
                btnText = "Friends";
                btnStyle = isDarkMode ? "bg-emerald-950/40 border-emerald-800" : "bg-green-100 border-green-200";
                textStyle = isDarkMode ? "text-emerald-400" : "text-green-700";
                iconName = "people";
                iconColor = isDarkMode ? "#34d399" : "#15803d";
            } else {
                btnText = "Requested";
                btnStyle = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200";
                textStyle = isDarkMode ? "text-slate-400" : "text-slate-500";
                iconName = "time-outline";
                iconColor = isDarkMode ? "#94a3b8" : "#64748B";
            }
        } else if (item.follows_me) {
            btnText = "Follow Back";
            btnStyle = "bg-blue-500 border-blue-600";
            iconName = "arrow-redo-outline";
            iconColor = "white";
        }

        return (
            <View className="px-4 py-2">
                <TouchableOpacity
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between p-4 rounded-2xl shadow-sm"
                    style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}
                    onPress={() => navigation.push('PublicProfile', { userId: item.id })}
                >
                    <View className="flex-row items-center flex-1">
                        <View className="relative">
                            {item.profile_photo ? (
                                <Image
                                    source={{ uri: `${PHOTO_URL}${item.profile_photo}` }}
                                    className="w-14 h-14 rounded-full mr-4"
                                    style={{ borderWidth: 2, borderColor: theme.border }}
                                />
                            ) : (
                                <View 
                                    className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF', borderWidth: 2, borderColor: theme.border }}
                                >
                                    <Text className="text-blue-500 font-bold text-xl">
                                        {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                    </Text>
                                </View>
                            )}
                            {item.follows_me && (
                                <View className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white items-center justify-center">
                                    <Ionicons name="checkmark" size={10} color="white" />
                                </View>
                            )}
                        </View>

                        <View className="flex-1 mr-2">
                            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                                {item.name || "Member"}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="location-outline" size={12} color={theme.textMuted} />
                                <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 4 }} numberOfLines={1}>
                                    {item.city || 'Member'}
                                </Text>
                            </View>
                            {item.follows_me && (
                                <Text className="text-[9px] text-green-500 mt-1 font-bold uppercase tracking-widest italic">
                                    Follows You
                                </Text>
                            )}
                        </View>
                    </View>

                    {!isMe && (
                        <TouchableOpacity
                            disabled={processingId === item.id}
                            onPress={() => handleToggleFollow(item.id)}
                            className={`px-4 py-2 rounded-xl items-center justify-center border ${btnStyle} shadow-sm min-w-[100px]`}
                        >
                            {processingId === item.id ? (
                                <ActivityIndicator size="small" color={textStyle.includes('white') ? 'white' : '#2563EB'} />
                            ) : (
                                <View className="flex-row items-center">
                                    <Ionicons name={iconName} size={14} color={iconColor} style={{ marginRight: 4 }} />
                                    <Text className={`font-bold text-xs ${textStyle}`}>
                                        {btnText}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            {/* Custom Header */}
            <View 
                className="px-4 py-4 flex-row items-center justify-between"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                {isSearching ? (
                    <View 
                        className="flex-row items-center flex-1 rounded-full px-3 py-1 border"
                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }}
                    >
                        <Ionicons name="search-outline" size={20} color={theme.textMuted} />
                        <TextInput
                            autoFocus
                            placeholder="Search by name or city..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="flex-1 ml-2 text-base py-2"
                            style={{ color: theme.text }}
                            placeholderTextColor={theme.textMuted}
                        />
                        <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
                            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                className="mr-4 w-10 h-10 rounded-full items-center justify-center border"
                                style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border }}
                            >
                                <Ionicons name="chevron-back" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <View>
                                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Connect with Community</Text>
                            </View>
                        </View>
                        <TouchableOpacity 
                            className="w-10 h-10 rounded-full items-center justify-center border"
                            style={{ backgroundColor: isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF', borderColor: theme.border }}
                            onPress={() => setIsSearching(true)}
                        >
                            <Ionicons name="search-outline" size={20} color="#2563EB" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {loading && users.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlashList
                    data={users}
                    keyExtractor={(item, index) => item.id ? item.id.toString() + '_' + index : index.toString()}
                    renderItem={renderItem}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={{ paddingVertical: 12, backgroundColor: theme.background }}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => fetchUsersList(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => loadingMore ? (
                        <View className="py-4">
                            <ActivityIndicator size="small" color="#2563EB" />
                        </View>
                    ) : null}
                />
            )}
        </SafeAreaView>
    );
};

export default FollowListScreen;
