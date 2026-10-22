import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const CreateGroupScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [groupName, setGroupName] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [groupIcon, setGroupIcon] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                const res = await api.get(`/get_all_users.php?user_id=${user.id}`);
                if (res.data.status === 'success') {
                    setAllUsers(res.data.data);
                    setFilteredUsers(res.data.data);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetching(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter(u => 
            u.full_name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredUsers(filtered);
    };

    const toggleFriendSelection = (id: number) => {
        setSelectedFriends(prev => 
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const pickImage = async () => {
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

    const createGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        setLoading(true);
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                const formData = new FormData();
                formData.append('user_id', user.id.toString());
                formData.append('group_name', groupName);
                formData.append('platform', 'community');
                if (selectedFriends.length > 0) {
                    formData.append('member_ids', selectedFriends.join(','));
                }
                if (groupIcon) {
                    const filename = groupIcon.fileName || groupIcon.uri.split('/').pop();
                    const type = groupIcon.mimeType || 'image/jpeg';
                    formData.append('photo', {
                        uri: groupIcon.uri,
                        name: filename,
                        type: type,
                    } as any);
                }

                const res = await api.post('/create_group.php', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.data.status === 'success') {
                    Alert.alert('Success', 'Group created successfully');
                    navigation.goBack();
                } else {
                    Alert.alert('Error', res.data.message);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const renderFriend = ({ item }: { item: any }) => {
        const isSelected = selectedFriends.includes(item.partner_id);
        return (
            <TouchableOpacity 
                className="flex-row items-center p-3 mb-2 rounded-lg border"
                style={{ 
                    borderColor: isSelected ? '#2563EB' : theme.border, 
                    backgroundColor: isSelected ? (isDarkMode ? '#1E3A8A30' : '#EFF6FF') : theme.card 
                }}
                onPress={() => toggleFriendSelection(item.partner_id)}
            >
                <View className="relative mr-3">
                    <Image
                        source={{ uri: item.profile_photo ? `${PHOTO_URL}${encodeURIComponent(item.profile_photo)}` : 'https://via.placeholder.com/100' }}
                        className="w-10 h-10 rounded-full bg-slate-200"
                    />
                    <View 
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${item.is_online ? 'bg-green-500' : 'bg-red-500'}`} 
                    />
                </View>
                <Text className="flex-1 text-base font-medium" style={{ color: theme.text }}>{item.full_name}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#2563EB" />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <View className="flex-row items-center p-4 border-b" style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}>
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold flex-1" style={{ color: theme.text }}>Create Group</Text>
                <TouchableOpacity onPress={createGroup} disabled={loading}>
                    {loading ? <ActivityIndicator color="#2563EB" /> : <Text className="text-blue-600 font-bold text-base">Create</Text>}
                </TouchableOpacity>
            </View>

            <View className="p-4 flex-1">
                <View className="items-center mb-6">
                    <TouchableOpacity onPress={pickImage} className="relative">
                        <View className="w-24 h-24 rounded-full bg-slate-200 border-2 border-orange-200 items-center justify-center overflow-hidden">
                            {groupIcon ? (
                                <Image source={{ uri: groupIcon.uri }} className="w-full h-full" />
                            ) : (
                                <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                            )}
                        </View>
                        <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-2 border-white">
                            <Ionicons name="add" size={16} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>

                <TextInput
                    placeholder="Group Name"
                    placeholderTextColor={theme.subtext}
                    className="rounded-lg p-3 mb-4 text-base"
                    style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, color: theme.text }}
                    value={groupName}
                    onChangeText={setGroupName}
                />
                
                <View className="mb-4">
                    <Text className="text-sm font-bold mb-2 uppercase" style={{ color: theme.subtext }}>Search Members</Text>
                    <View 
                        className="flex-row items-center rounded-lg px-3 py-1"
                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }}
                    >
                        <Ionicons name="search" size={18} color={theme.subtext} />
                        <TextInput
                            className="flex-1 ml-2 text-base p-1"
                            style={{ color: theme.text }}
                            placeholder="Type name to search..."
                            placeholderTextColor={theme.subtext}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={18} color={theme.subtext} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Text className="text-sm font-bold mb-2 uppercase" style={{ color: theme.subtext }}>Select Members ({selectedFriends.length} selected)</Text>
                
                {fetching ? (
                    <ActivityIndicator color="#2563EB" className="mt-4" />
                ) : (
                    <FlashList
                        data={filteredUsers}
                        renderItem={renderFriend}
                        keyExtractor={(item, index) => item.partner_id ? `user_${item.partner_id}` : index.toString()}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={<Text className="text-center mt-4" style={{ color: theme.subtext }}>No connected members found.</Text>}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default CreateGroupScreen;
