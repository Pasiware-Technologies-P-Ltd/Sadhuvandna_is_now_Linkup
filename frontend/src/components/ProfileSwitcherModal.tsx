import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { WEBSITE_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ProfileSwitcherDBService } from '../services/ProfileSwitcherDBService';

interface ProfileSwitcherModalProps {
    visible: boolean;
    onClose: () => void;
    onProfileSwitched: () => void;
}

const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfileSwitcherModal = ({ visible, onClose, onProfileSwitched }: ProfileSwitcherModalProps) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const navigation = useNavigation<any>();

    useEffect(() => {
        if (visible) {
            fetchPages();
        }
    }, [visible]);

    const fetchPages = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                setCurrentUser(user);
                
                const mainId = user.is_business == 1 ? user.parent_userid : user.id;
                
                // 1. Load from SQLite Cache Instantly
                const cachedProfiles = await ProfileSwitcherDBService.getProfiles(String(mainId));
                if (cachedProfiles && cachedProfiles.length > 0) {
                    setProfiles(cachedProfiles);
                } else {
                    setLoading(true);
                }
                
                // 2. Fetch fresh from API in background
                const profileRes = await api.get(`/get_user_profile.php?user_id=${mainId}`);
                let mainProfile = null;
                if (profileRes.data.status === 'success') {
                    mainProfile = profileRes.data.user;
                } else {
                    mainProfile = { id: mainId, name: user.name, profile_photo: user.profile_photo, is_business: 0 };
                }
                
                const res = await api.post('/api_get_my_pages.php', { user_id: mainId });
                let pagesList = [];
                if (res.data.status === 'success') {
                    pagesList = res.data.data;
                }
                
                // Construct the combined array
                const allProfiles = [
                    {
                        id: mainProfile.id,
                        name: mainProfile.name,
                        photo: mainProfile.profile_photo,
                        type: 'Main Profile'
                    },
                    ...pagesList.map((p: any) => ({
                        id: p.page_id,
                        name: p.name,
                        photo: p.photo,
                        type: 'Page'
                    }))
                ];
                
                setProfiles(allProfiles);
                
                // 3. Save back to SQLite Cache
                await ProfileSwitcherDBService.saveProfiles(String(mainId), allProfiles);
            }
        } catch (error) {
            console.error("Failed to fetch pages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (targetProfileId: string | number) => {
        setSwitching(true);
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                const res = await api.post('/api_switch_profile.php', {
                    user_id: user.id,
                    target_profile_id: targetProfileId
                });

                if (res.data.status === 'success') {
                    let freshData = res.data.data;
                    
                    // Fetch full profile to ensure we have 'profile_photo' and other details
                    try {
                        const profileRes = await api.get(`/get_user_profile.php?user_id=${targetProfileId}`);
                        if (profileRes.data.status === 'success' && profileRes.data.user) {
                            freshData = { ...freshData, ...profileRes.data.user };
                        }
                    } catch (e) {
                        console.log("Failed to fetch fresh user details during switch", e);
                    }

                    // Update Async Storage with new comprehensive profile
                    await AsyncStorage.setItem('user', JSON.stringify(freshData));
                    
                    const { DeviceEventEmitter } = require('react-native');
                    DeviceEventEmitter.emit('profileSwitched');
                    
                    onProfileSwitched();
                    onClose();
                } else {
                    alert(res.data.message || "Failed to switch profile");
                }
            }
        } catch (error) {
            console.error("Failed to switch profile", error);
            alert("Network error while switching profile");
        } finally {
            setSwitching(false);
        }
    };

    const handleCreatePage = () => {
        onClose();
        navigation.navigate('CreateBusinessPage');
    };

    const renderItem = ({ item }: { item: any }) => {
        const isCurrent = currentUser?.id == item.id;
        return (
            <TouchableOpacity 
                onPress={() => !isCurrent && handleSwitch(item.id)}
                activeOpacity={isCurrent ? 1 : 0.7}
                style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: 'white'
                }}
            >
                {item.photo ? (
                    <Image 
                        source={{ uri: `${WEBSITE_URL}/uploads/photo/${item.photo}` }} 
                        style={{ width: 44, height: 44, borderRadius: 22, marginRight: 16, backgroundColor: '#E2E8F0' }} 
                    />
                ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#9ca3af' }}>
                            {getInitials(item.name)}
                        </Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#172554' }}>{item.name}</Text>
                    {item.type === 'Page' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: 'bold' }}>Page</Text>
                            </View>
                        </View>
                    )}
                </View>
                {isCurrent && (
                    <Ionicons name="checkmark-circle" size={24} color="#0064e0" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '80%' }}>
                    
                    {/* Drag Handle */}
                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 5 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
                    </View>

                    {loading || switching ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#0064e0" />
                            <Text style={{ marginTop: 12, color: '#64748B' }}>{switching ? 'Switching...' : 'Loading...'}</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 20 }}>
                            {profiles.map(item => (
                                <React.Fragment key={item.id}>
                                    {renderItem({ item })}
                                </React.Fragment>
                            ))}
                            <TouchableOpacity 
                                onPress={handleCreatePage}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    paddingVertical: 12,
                                    paddingHorizontal: 20,
                                    marginTop: 4
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="add" size={24} color="#172554" />
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#172554' }}>Create Business Page</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default ProfileSwitcherModal;
