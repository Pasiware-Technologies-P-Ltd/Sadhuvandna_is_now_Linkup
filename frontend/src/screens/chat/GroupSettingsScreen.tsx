import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const GroupSettingsScreen = ({ navigation, route }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { group } = route.params;
    const [groupName, setGroupName] = useState(group.full_name || '');
    const [groupIcon, setGroupIcon] = useState<any>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [isMemberSearchActive, setIsMemberSearchActive] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [adminsOnly, setAdminsOnly] = useState(false);
    const [groupDescription, setGroupDescription] = useState('');
    const [updatingSettings, setUpdatingSettings] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                setUserId(JSON.parse(u).id);
            }
            fetchMembers();
            fetchInviteCode();
        };
        init();

        const unsubscribe = navigation.addListener('focus', () => {
            fetchMembers();
        });

        return unsubscribe;
    }, [navigation]);

    const fetchMembers = async () => {
        try {
            const res = await api.get(`/get_group_members.php?group_id=${group.id || group.partner_id}`);
            if (res.data.status === 'success') {
                setMembers(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching members', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchInviteCode = async () => {
        setLoadingInvite(true);
        try {
            const res = await api.get(`/get_group_invite.php?group_id=${group.id || group.partner_id}`);
            if (res.data.status === 'success') {
                setInviteCode(res.data.invite_code);
                setAdminsOnly(res.data.admins_only == 1);
                setGroupDescription(res.data.description || '');
            }
        } catch (error) {
            console.error('Error fetching invite code', error);
        } finally {
            setLoadingInvite(false);
        }
    };

    const handleShareInvite = async () => {
        if (!inviteCode) {
            Alert.alert("Please wait", "Invite link is still generating...");
            fetchInviteCode();
            return;
        }
        try {
            const inviteLink = `https://sadhuvandna.co.in/Api/join_group.php?inviteCode=${inviteCode}`;
            const result = await Share.share({
                message: `Join our group "${groupName}" on SadhuVandna! Click here: ${inviteLink}\n\nInvite Code: ${inviteCode}`,
                title: 'Group Invite',
            });
        } catch (error) {
            Alert.alert("Error", "Could not open share menu");
            console.error(error);
        }
    };

    // Check if the current user is an admin (either creator or has admin role)
    const currentUserMember = members.find(m => m.user_id == userId);
    const isAdmin = !!(userId && (group.created_by == userId || currentUserMember?.role === 'admin'));

    const toggleAdminsOnly = async () => {
        if (!isAdmin) return;
        setUpdatingSettings(true);
        try {
            const newValue = !adminsOnly;
            const res = await api.post('/update_group_settings.php', {
                group_id: group.id || group.partner_id,
                user_id: userId,
                admins_only: newValue ? '1' : '0'
            });
            if (res.data.status === 'success') {
                setAdminsOnly(newValue);
            } else {
                Alert.alert("Error", res.data.message || "Failed to update settings");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setUpdatingSettings(false);
        }
    };

    const pickImage = async () => {
        if (!isAdmin) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setGroupIcon(result.assets[0]);
        }
    };

    const handleSave = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Group name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('group_id', group.id || group.partner_id);
            formData.append('user_id', userId?.toString() || '');
            formData.append('group_name', groupName);
            formData.append('description', groupDescription);

            if (groupIcon) {
                const filename = groupIcon.fileName || groupIcon.uri.split('/').pop();
                const type = groupIcon.mimeType || 'image/jpeg';
                formData.append('photo', {
                    uri: groupIcon.uri,
                    name: filename,
                    type: type,
                } as any);
            }

            const res = await api.post('/update_group.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.status === 'success') {
                Alert.alert('Success', 'Group updated successfully');
                navigation.goBack();
            } else {
                Alert.alert('Error', res.data.message);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update group');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: number, memberName: string) => {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${memberName} from this group?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.post('/remove_group_member.php', {
                                group_id: group.id || group.partner_id,
                                user_id: memberId,
                                admin_id: userId
                            });
                            if (res.data.status === 'success') {
                                Alert.alert("Success", "Member removed");
                                fetchMembers();
                            } else {
                                Alert.alert("Error", res.data.message);
                            }
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Network error");
                        }
                    }
                }
            ]
        );
    };

    const handleExitGroup = () => {
        Alert.alert(
            "Exit Group",
            "Are you sure you want to exit this group?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Exit",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.post('/exit_group.php', {
                                group_id: group.id || group.partner_id,
                                user_id: userId
                            });
                            if (res.data.status === 'success') {
                                Alert.alert("Success", res.data.message);
                                navigation.navigate('Chats');
                            } else {
                                Alert.alert("Error", res.data.message);
                            }
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Network error");
                        }
                    }
                }
            ]
        );
    };

    const currentImageSource = groupIcon 
        ? { uri: groupIcon.uri } 
        : (group.profile_photo || group.photo ? { uri: `${PHOTO_URL}${encodeURIComponent(group.profile_photo || group.photo)}` } : null);

    const filteredMembers = members.filter(m => m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()));

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <View className="flex-row items-center p-4 border-b" style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}>
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold flex-1" style={{ color: theme.text }}>Group Settings</Text>
                {isAdmin && (
                    <TouchableOpacity onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#2563EB" /> : <Text className="text-blue-600 font-bold text-base">Save</Text>}
                    </TouchableOpacity>
                )}
            </View>

            {loadingMembers ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#2563EB" size="large" />
                </View>
            ) : (
                <ScrollView 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View className="p-6 items-center">
                        <TouchableOpacity onPress={pickImage} disabled={!isAdmin} className="relative mb-6">
                            <View 
                                className="w-32 h-32 rounded-full border-2 items-center justify-center overflow-hidden"
                                style={{ backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', borderColor: theme.border }}
                            >
                                {currentImageSource ? (
                                    <Image source={currentImageSource} className="w-full h-full" />
                                ) : (
                                    <Ionicons name="people-outline" size={60} color={theme.subtext} />
                                )}
                            </View>
                            {isAdmin && (
                                <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-2 border-white">
                                    <Ionicons name="camera" size={20} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View className="w-full">
                            <Text className="text-sm font-bold mb-2 uppercase" style={{ color: theme.subtext }}>Group Name</Text>
                            <TextInput
                                className="border rounded-lg p-3 text-base"
                                style={{
                                    backgroundColor: isAdmin ? theme.card : (isDarkMode ? '#1E293B' : '#F1F5F9'),
                                    borderColor: isAdmin ? theme.border : 'transparent',
                                    color: theme.text
                                }}
                                value={groupName}
                                onChangeText={setGroupName}
                                editable={isAdmin}
                                placeholder="Enter group name"
                                placeholderTextColor={theme.subtext}
                            />
                        </View>

                        <View className="w-full mt-4">
                            <Text className="text-sm font-bold mb-2 uppercase" style={{ color: theme.subtext }}>Group Description</Text>
                            <TextInput
                                className="border rounded-lg p-3 text-base min-h-[80px]"
                                style={{
                                    backgroundColor: isAdmin ? theme.card : (isDarkMode ? '#1E293B' : '#F1F5F9'),
                                    borderColor: isAdmin ? theme.border : 'transparent',
                                    color: theme.text
                                }}
                                value={groupDescription}
                                onChangeText={setGroupDescription}
                                editable={isAdmin}
                                placeholder="Enter group description..."
                                placeholderTextColor={theme.subtext}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {!isAdmin && (
                            <Text className="text-sm mt-4 text-center" style={{ color: theme.subtext }}>
                                Only the group admin can edit the group icon and name.
                            </Text>
                        )}

                        {/* Group Permissions (Admin Only) */}
                        {isAdmin && (
                            <View 
                                className="w-full mt-6 p-4 rounded-2xl border"
                                style={{ backgroundColor: theme.card, borderColor: theme.border }}
                            >
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1 mr-4">
                                        <Text className="font-bold text-base" style={{ color: theme.text }}>Only Admins Send Messages</Text>
                                        <Text className="text-xs mt-1" style={{ color: theme.subtext }}>If enabled, only group admins can send messages to this group.</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={toggleAdminsOnly}
                                        disabled={updatingSettings}
                                        className={`w-12 h-6 rounded-full px-1 justify-center ${adminsOnly ? 'bg-blue-600' : isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}
                                    >
                                        <View className={`w-4 h-4 rounded-full bg-white ${adminsOnly ? 'translate-x-6' : 'translate-x-0'} transition-all`} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Invite Link Section */}
                        <View 
                            className="w-full mt-4 p-4 rounded-2xl border"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                        >
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-sm font-bold uppercase" style={{ color: theme.text }}>Invite Link</Text>
                                <TouchableOpacity onPress={handleShareInvite} className="bg-blue-600 px-3 py-1.5 rounded-full flex-row items-center">
                                    <Ionicons name="share-social" size={14} color="white" />
                                    <Text className="text-white text-xs font-bold ml-1.5">Share</Text>
                                </TouchableOpacity>
                            </View>
                            {loadingInvite ? (
                                <ActivityIndicator size="small" color="#2563EB" />
                            ) : (
                                <TouchableOpacity 
                                    onPress={handleShareInvite}
                                    className="p-3 rounded-xl border flex-row items-center justify-between"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border }}
                                >
                                    <Text className="font-medium flex-1 mr-2" style={{ color: theme.text }} numberOfLines={1}>
                                        {inviteCode ? `sadhuvandna.co.in/Api/join_group.php?inviteCode=${inviteCode}` : 'Generating link...'}
                                    </Text>
                                    <Ionicons name={inviteCode ? "share-social" : "sync"} size={18} color="#2563EB" />
                                </TouchableOpacity>
                            )}
                            <Text className="text-[10px] mt-2 text-center" style={{ color: theme.subtext }}>Anyone with this link can join the group</Text>
                        </View>

                        <View className="w-full mt-8">
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold uppercase" style={{ color: theme.subtext }}>
                                        Group Members ({members.length})
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <TouchableOpacity 
                                        onPress={() => setIsMemberSearchActive(!isMemberSearchActive)}
                                        className="p-1.5 rounded-full mr-2"
                                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#DBEAFE' }}
                                    >
                                        <Ionicons name={isMemberSearchActive ? "close" : "search"} size={18} color="#2563EB" />
                                    </TouchableOpacity>
                                    {isAdmin && (
                                        <TouchableOpacity 
                                            onPress={() => navigation.navigate('AddGroupMembers', { group, currentMembers: members })}
                                            className="px-3 py-1.5 rounded-full"
                                            style={{ backgroundColor: isDarkMode ? '#1E293B' : '#DBEAFE' }}
                                        >
                                            <Text className="text-blue-600 text-xs font-bold">+ Add</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Member Search Bar */}
                            {isMemberSearchActive && (
                                <View 
                                    className="flex-row items-center rounded-xl px-3 py-2 mb-4 border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }}
                                >
                                    <Ionicons name="search" size={18} color={theme.subtext} />
                                    <TextInput
                                        className="flex-1 ml-2 text-base p-0"
                                        style={{ color: theme.text }}
                                        placeholder="Search members..."
                                        placeholderTextColor={theme.subtext}
                                        value={memberSearchQuery}
                                        onChangeText={setMemberSearchQuery}
                                        autoFocus
                                    />
                                    {memberSearchQuery !== '' && (
                                        <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                                            <Ionicons name="close-circle" size={18} color={theme.subtext} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Members List */}
                    <View className="px-5">
                        {filteredMembers.map((item) => (
                            <TouchableOpacity 
                                key={item.user_id.toString()}
                                className="flex-row items-center py-3 mb-2 rounded-lg px-2"
                                style={{ backgroundColor: theme.card }}
                                onPress={() => {
                                    if (item.user_id != userId) {
                                        navigation.push('Chat', {
                                            receiver: {
                                                id: item.user_id,
                                                full_name: item.name,
                                                photo: item.profile_photo
                                            },
                                            platform: 'community',
                                            isGroup: false
                                        });
                                    }
                                }}
                            >
                                <View className="relative mr-3">
                                    <Image
                                        source={{ uri: item.profile_photo ? `${PHOTO_URL}${encodeURIComponent(item.profile_photo)}` : 'https://via.placeholder.com/100' }}
                                        className="w-10 h-10 rounded-full bg-slate-200 border"
                                        style={{ borderColor: theme.border }}
                                    />
                                    <View 
                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${item.is_online ? 'bg-green-500' : 'bg-red-500'}`} 
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-medium" style={{ color: theme.text }}>{item.name} {item.user_id == userId ? '(You)' : ''}</Text>
                                    <Text className="text-xs capitalize" style={{ color: theme.subtext }}>{item.role}</Text>
                                </View>
                                {item.role === 'admin' ? (
                                    <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }}>
                                        <Text className="text-blue-600 text-xs font-bold">Admin</Text>
                                    </View>
                                ) : (
                                    isAdmin && item.user_id != userId && (
                                        <TouchableOpacity 
                                            onPress={() => handleRemoveMember(item.user_id, item.name)}
                                            className="p-2 rounded-full"
                                            style={{ backgroundColor: isDarkMode ? '#450a0a' : '#FEF2F2' }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#dc2626" />
                                        </TouchableOpacity>
                                    )
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Exit Group Button */}
                    <View className="px-6 pb-10">
                        <TouchableOpacity 
                            onPress={handleExitGroup}
                            className="flex-row items-center justify-center p-4 mt-4 rounded-2xl border"
                            style={{ backgroundColor: isDarkMode ? '#450a0a20' : '#FEF2F2', borderColor: isDarkMode ? '#7f1d1d' : '#FEE2E2' }}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                            <Text className="text-red-600 font-bold ml-2">Exit Group</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default GroupSettingsScreen;
