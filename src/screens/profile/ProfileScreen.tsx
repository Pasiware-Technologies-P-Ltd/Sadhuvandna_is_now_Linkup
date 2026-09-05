import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

import ProfileSwitcherModal from '../../components/ProfileSwitcherModal';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const ProfileScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);
    const [marriageProfile, setMarriageProfile] = useState<any>(null);
    const [followStats, setFollowStats] = useState<any>({ followers: 0, following: 0, posts: 0 });
    const [isSwitcherVisible, setSwitcherVisible] = useState(false);
    const { t } = useLanguage();

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
            checkMarriageProfile(userData.id);
            fetchFollowStats(userData.id);

            // Fetch fresh details for latest photo, cover_photo, city, cast, etc.
            try {
                const res = await api.get(`/get_user_details.php?user_id=${userData.id}`);
                if (res.data.status === 'success') {
                    // merge so we keep is_business etc if it wasn't returned in get_user_details
                    const freshData = { ...userData, ...res.data.data };
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
            } else {
                setMarriageProfile(null);
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
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                {/* Banner Cover Image Backdrop */}
                <View style={{ height: 145, backgroundColor: '#ea580c', position: 'relative', overflow: 'hidden' }}>
                    {user.cover_photo ? (
                        <Image
                            source={{ uri: `${PHOTO_URL}${user.cover_photo}` }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
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
                            <Image
                                source={{ uri: user.profile_photo ? `${PHOTO_URL}${user.profile_photo}` : 'https://via.placeholder.com/100' }}
                                style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: 'white', backgroundColor: '#f3f4f6' }}
                            />
                        </TouchableOpacity>

                        {/* Stats Bar */}
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 16 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats.posts || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Posts</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_followers', title: 'Followers' })}
                                style={{ alignItems: 'center' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats.followers || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Followers</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_following', title: 'Following' })}
                                style={{ alignItems: 'center' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats.following || 0}</Text>
                                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Following</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* User Profile Details */}
                    <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827' }}>
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
                                                <Ionicons name="location-outline" size={14} color="#6b7280" />
                                                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>{user.city}</Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {user.cast && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="people-outline" size={14} color="#ea580c" />
                                                <Text style={{ fontSize: 13, color: '#ea580c', fontWeight: 'bold', marginLeft: 6 }}>Caste: {user.cast}</Text>
                                            </View>
                                        )}
                                        {user.city && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="location-outline" size={14} color="#6b7280" />
                                                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>{user.city}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                        
                        {/* Switch Profile Button */}
                        <TouchableOpacity 
                            onPress={() => setSwitcherVisible(true)} 
                            style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Ionicons name="swap-horizontal" size={16} color="#4b5563" />
                            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: '#4b5563' }}>Switch</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action Shortcuts */}
                    <View style={{ flexDirection: 'row', gap: 12, marginVertical: 18 }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate(user.is_business == 1 ? 'EditBusinessPage' : 'EditProfile')}
                            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 14, height: 42, alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Edit Profile</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PublicProfile', { userId: user.id })}
                            style={{ flex: 1, backgroundColor: '#fff7ed', borderRadius: 14, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffedd5' }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ea580c' }}>Public Feed</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content Area */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                    {/* Explore Grid */}
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 }}>
                        {user.is_business == 1 ? 'Business Tools' : t('explore')}
                    </Text>
                    
                    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
                        {(user.is_business == 1 ? [
                            { label: "My Products", icon: "cube-outline", route: "Gallery", color: "#3b82f6" },
                            { label: "Offers", icon: "pricetag-outline", route: "Gallery", color: "#f43f5e" },
                            { label: "Gallery", icon: "images-outline", route: "Gallery", color: "#eab308" },
                            { label: "Insights", icon: "stats-chart-outline", route: "Settings", color: "#10b981" },
                        ] : [
                            { label: t('jobs'), icon: "briefcase-outline", route: "Jobs", color: "#10b981" },
                            { label: t('shokSandesh'), icon: "reader-outline", route: "ShokSanvedana", color: "#6b7280" },
                            { label: t('gallery'), icon: "images-outline", route: "Gallery", color: "#eab308" },
                            { label: "Festival Poster", icon: "brush-outline", route: "FestivalPoster", color: "#f43f5e" },
                            { label: "Smart Card", icon: "id-card-outline", route: "SmartCard", color: "#3b82f6" },
                        ]).map((item, index, array) => (
                            <MenuItem 
                                key={index}
                                label={item.label} 
                                icon={item.icon} 
                                iconColor={item.color} 
                                onPress={() => navigation.navigate(item.route)} 
                                isLast={index === array.length - 1} 
                            />
                        ))}
                    </View>

                    {/* Settings / Actions */}
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 }}>
                        {t('general')}
                    </Text>
                    
                    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
                        <MenuItem label={t('settings')} icon="settings-outline" iconColor="#4b5563" onPress={() => navigation.navigate('Settings')} />
                        <MenuItem label="Linko - AI Support" icon="chatbubble-ellipses-outline" iconColor="#3b82f6" onPress={() => navigation.navigate('SupportChat')} isLast />
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
        </View>
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
            borderColor: '#f9fafb' 
        }}
        activeOpacity={0.7}
    >
        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: '#f9fafb' }}>
            <Ionicons name={icon} size={18} color={iconColor || '#6b7280'} />
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: 'bold', color: '#374151' }}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
);

export default ProfileScreen;
