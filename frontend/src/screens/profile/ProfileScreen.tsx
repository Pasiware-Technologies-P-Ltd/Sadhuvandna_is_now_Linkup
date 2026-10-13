import { Image } from 'expo-image';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Animated, Platform, StatusBar, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import LinkUpHeader, { TOP_HEADER_COLLAPSE } from '../../components/LinkUpHeader';

import ProfileSwitcherModal from '../../components/ProfileSwitcherModal';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

import { useTabSwipe } from '../../utils/useTabSwipe';
const ProfileScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top;
    const [user, setUser] = useState<any>(null);
    const tabSwipe = useTabSwipe({ currentTab: 'Profile', isBusiness: user?.is_business == 1 });
    const [marriageProfile, setMarriageProfile] = useState<any>(null);
    const [followStats, setFollowStats] = useState<any>({ followers: 0, following: 0, posts: 0 });
    const [isSwitcherVisible, setSwitcherVisible] = useState(false);
    const { t } = useLanguage();

    // Silky smooth auto-collapsing top header on scroll (native driver)
    const headerAnim = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const accumulatedScroll = useRef(0);
    const isHeaderHidden = useRef(false);
    const scrollRef = useRef<any>(null);

    const animateHeader = useCallback((toHide: boolean) => {
        if (isHeaderHidden.current === toHide) return;
        isHeaderHidden.current = toHide;
        Animated.timing(headerAnim, {
            toValue: toHide ? -TOP_HEADER_COLLAPSE : 0,
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
        }).start();
    }, [headerAnim]);

    const handleFeedScroll = useCallback((event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        if (currentY <= 10) {
            accumulatedScroll.current = 0;
            animateHeader(false);
            return;
        }

        if (diff > 0) {
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current > 40) {
                animateHeader(true);
            }
        } else if (diff < 0) {
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current < -30) {
                animateHeader(false);
            }
        }
    }, [animateHeader]);

    useEffect(() => {
        loadUser();
        const unsubscribe = navigation.addListener('focus', () => {
            loadUser();
        });
        return unsubscribe;
    }, [navigation]);

    const loadUser = async () => {
        const u = await AsyncStorage.getItem('user');
        if (u) {
            const userData = JSON.parse(u);
            setUser(userData);
            
            // Load cached secondary data
            const cachedMarriage = await AsyncStorage.getItem(`cached_marriage_${userData.id}`);
            if (cachedMarriage) setMarriageProfile(JSON.parse(cachedMarriage));
            
            const cachedStats = await AsyncStorage.getItem(`cached_stats_${userData.id}`);
            if (cachedStats) setFollowStats(JSON.parse(cachedStats));

            checkMarriageProfile(userData.id);
            fetchFollowStats(userData.id);

            // Fetch fresh details for latest photo, cover_photo, city, cast, etc.
            try {
                const res = await api.get(`/get_user_profile.php?user_id=${userData.id}`);
                if (res.data.status === 'success' && res.data.user) {
                    // merge so we keep is_business etc if it wasn't returned in get_user_details
                    const freshData = { ...userData, ...res.data.user };
                    setUser(freshData);
                    await AsyncStorage.setItem('user', JSON.stringify(freshData));
                }
            } catch (e) {
                console.log("Failed to fetch fresh user details", e);
            }
        }
    };

    const handleProfileSwitched = () => {
        loadUser();
        // Maybe also reset nav stack or refresh home feed
    };

    const fetchFollowStats = async (userId: string) => {
        try {
            const res = await api.post(`/api_follow.php?action=get_counts`, { current_user_id: userId, user_id: userId });
            if (res.data.ok) {
                setFollowStats(res.data);
                AsyncStorage.setItem(`cached_stats_${userId}`, JSON.stringify(res.data));
            }
        } catch (e) {
            console.error("Failed to fetch follow stats", e);
        }
    };

    const checkMarriageProfile = async (userId: string) => {
        try {
            const res = await api.get(`/get_my_profile.php?user_id=${userId}`);
            if (res.data.status === 'success') {
                setMarriageProfile(res.data.data);
                AsyncStorage.setItem(`cached_marriage_${userId}`, JSON.stringify(res.data.data));
            } else {
                setMarriageProfile(null);
                AsyncStorage.removeItem(`cached_marriage_${userId}`);
            }
        } catch (e) {
            setMarriageProfile(null);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            t('logoutTitle'),
            t('logoutConfirm'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('user');
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    }
                }
            ]
        );
    };

    if (!user) return <View style={{ flex: 1, backgroundColor: 'white' }} />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={[]} {...tabSwipe.panHandlers}>
            {/* LinkUp Global Header with Floating Tabs */}
            <LinkUpHeader
                currentTab="Profile"
                headerAnim={headerAnim}
                user={user}
                onTabPress={(tab) => {
                    if (tab === 'Profile') {
                        animateHeader(false);
                        scrollRef.current?.scrollTo({ y: 0, animated: true });
                    }
                }}
                onPlusPress={() => {
                    navigation.navigate('CreatePost');
                }}
                tabSwipeHandlers={tabSwipe.panHandlers}
                statusBarHeight={statusBarHeight}
            />

            <ScrollView
                ref={scrollRef}
                onScroll={handleFeedScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: statusBarHeight + 114, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Banner Cover Image Backdrop */}
                <View style={{ height: 145, backgroundColor: '#2563EB', position: 'relative', overflow: 'hidden' }}>
                    {user.cover_photo ? (
                        <Image
                            source={{ uri: `${PHOTO_URL}${user.cover_photo}` }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <>
                            {/* Decorative background glass bubbles */}
                            <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)', top: -110, right: -50 }} />
                            <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -45, left: -25 }} />
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="images-outline" size={30} color="rgba(255,255,255,0.35)" />
                            </View>
                        </>
                    )}
                </View>

                {/* Profile Card Overlay Wrapper */}
                <View style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, paddingHorizontal: 20, paddingTop: 16 }}>
                    {/* Avatar & Stats Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PublicProfile', { userId: user.id })}
                            activeOpacity={0.9}
                            style={{
                                marginTop: -55,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.12,
                                shadowRadius: 8,
                                elevation: 5
                            }}
                        >
                            {user.profile_photo ? (
                                <Image
                                    source={{ uri: `${PHOTO_URL}${user.profile_photo}` }}
                                    style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: 'white', backgroundColor: '#E2E8F0' }}
                                />
                            ) : (
                                <View style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: 'white', backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#9ca3af' }}>
                                        {getInitials(user.name)}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Stats Bar */}
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 16 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#172554' }}>{followStats.posts || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('posts')}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_followers', title: 'Followers' })}
                                style={{ alignItems: 'center' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#172554' }}>{followStats.followers || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('followers')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_following', title: 'Following' })}
                                style={{ alignItems: 'center' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#172554' }}>{followStats.following || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('following')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* User Profile Details */}
                    <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#172554' }}>
                                {user.name} {user.is_business == 1 && <Ionicons name="checkmark-circle" size={18} color="#0064e0" />}
                            </Text>
                            
                            {/* Detailed Info List */}
                            <View style={{ marginTop: 8, gap: 6 }}>
                                {user.is_business == 1 ? (
                                    <>
                                        {user.category && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="briefcase-outline" size={14} color="#059669" />
                                                <Text style={{ fontSize: 13, color: '#059669', fontWeight: 'bold', marginLeft: 6 }}>{user.category}</Text>
                                            </View>
                                        )}
                                        {user.city && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="location-outline" size={14} color="#64748B" />
                                                <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 6 }}>{user.city}</Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {(user.bio || user.about || user.about_me || user.biodata || user.description) ? (
                                            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18, marginTop: 1 }} numberOfLines={3}>
                                                {user.bio || user.about || user.about_me || user.biodata || user.description}
                                            </Text>
                                        ) : null}
                                        {user.city && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="location-outline" size={14} color="#64748B" />
                                                <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 6 }}>{user.city}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                        
                        {/* Switch Profile Button */}
                        <TouchableOpacity 
                            onPress={() => setSwitcherVisible(true)} 
                            style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Ionicons name="swap-horizontal" size={16} color="#64748B" />
                            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{t('switchProfile')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action Shortcuts */}
                    <View style={{ flexDirection: 'row', gap: 12, marginVertical: 18 }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate(user.is_business == 1 ? 'EditBusinessPage' : 'EditProfile')}
                            style={{ flex: 1, backgroundColor: '#E2E8F0', borderRadius: 14, height: 42, alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{t('editProfile')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PublicProfile', { userId: user.id })}
                            style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: 14, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DBEAFE' }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2563EB' }}>{t('publicFeed')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content Area */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                    {/* Explore Grid */}
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 }}>
                        {user.is_business == 1 ? t('businessTools') : t('explore')}
                    </Text>
                    
                    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
                        {(user.is_business == 1 ? [
                            { label: t('myPosts'), icon: "grid-outline", route: "MyPosts", color: "#3b82f6" },
                            { label: t('savedPosts'), icon: "bookmark-outline", route: "SavedPosts", color: "#2563EB" },
                            { label: t('gallery'), icon: "images-outline", route: "Gallery", color: "#eab308" },
                            { label: t('festivalPoster'), icon: "brush-outline", route: "FestivalPoster", color: "#f43f5e" },
                            { label: t('addManager'), icon: "people-outline", route: "ComingSoon", color: "#10b981" },
                            { label: t('smartCard'), icon: "id-card-outline", route: "SmartCard", color: "#8b5cf6" },
                        ] : [
                            { label: t('savedPosts'), icon: "bookmark-outline", route: "SavedPosts", color: "#2563EB" },
                            { label: t('jobs'), icon: "briefcase-outline", route: "Jobs", color: "#10b981" },
                            { label: t('shokSandesh'), icon: "reader-outline", route: "ShokSanvedana", color: "#64748B" },
                            { label: t('gallery'), icon: "images-outline", route: "Gallery", color: "#eab308" },
                            { label: t('festivalPoster'), icon: "brush-outline", route: "FestivalPoster", color: "#f43f5e" },
                            { label: t('smartCard'), icon: "id-card-outline", route: "SmartCard", color: "#3b82f6" },
                        ]).map((item, index, array) => (
                            <MenuItem 
                                key={index}
                                label={item.label} 
                                icon={item.icon} 
                                iconColor={item.color} 
                                onPress={() => {
                                    if (item.route === 'ComingSoon') {
                                        Alert.alert("Coming Soon! 🚀", "We are working on this feature. Stay tuned!");
                                    } else {
                                        navigation.navigate(item.route);
                                    }
                                }} 
                                isLast={index === array.length - 1} 
                            />
                        ))}
                    </View>

                    {/* Settings / Actions */}
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 }}>
                        {t('general')}
                    </Text>
                    
                    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
                        <MenuItem label={t('settings')} icon="settings-outline" iconColor="#64748B" onPress={() => navigation.navigate('Settings')} />
                        <MenuItem label={t('linkoSupport')} icon="chatbubble-ellipses-outline" iconColor="#3b82f6" onPress={() => navigation.navigate('SupportChat')} isLast />
                    </View>

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 20,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: '#fee2e2',
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.02,
                            shadowRadius: 8,
                            elevation: 1
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', marginRight: 14 }}>
                            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ef4444', flex: 1 }}>
                            {t('logout')}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#ef4444" />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 10 }}>
                        <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 'bold' }}>Version 1.45.0</Text>
                    </View>
                </View>
            </ScrollView>

            <ProfileSwitcherModal 
                visible={isSwitcherVisible} 
                onClose={() => setSwitcherVisible(false)} 
                onProfileSwitched={handleProfileSwitched} 
            />
        </SafeAreaView>
    );
};

const MenuItem = ({ label, icon, iconColor, onPress, isLast }: any) => (
    <TouchableOpacity 
        onPress={onPress} 
        style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 16, 
            borderBottomWidth: isLast ? 0 : 1, 
            borderColor: '#F8FAFC' 
        }}
        activeOpacity={0.7}
    >
        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: '#F8FAFC' }}>
            <Ionicons name={icon} size={18} color={iconColor || '#64748B'} />
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: 'bold', color: '#374151' }}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
);

export default ProfileScreen;
