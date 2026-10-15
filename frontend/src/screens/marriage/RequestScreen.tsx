import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const RequestScreen = ({ navigation }: any) => {
    const layout = useWindowDimensions();
    const { isDarkMode, theme } = useTheme();

    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'pending', title: 'Pending' },
        { key: 'sent', title: 'Sent' },
        { key: 'connected', title: 'Friends' },
    ]);

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [connectedFriends, setConnectedFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        fetchData(); // Initial load
        return unsubscribe;
    }, [navigation]);

    const fetchData = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsedUser = JSON.parse(u);
                setUser(parsedUser);

                const res = await api.post('api_connect.php', {
                    action: 'fetch_my_requests',
                    user_id: parsedUser.id
                });

                if (res.data.status === 'success') {
                    setPendingRequests(res.data.received);
                    setSentRequests(res.data.sent);
                    setConnectedFriends(res.data.connected);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'reject' | 'remove') => {
        // action: accept/reject/remove
        // unified API uses 'manage_request' for accept/reject (by receiver)
        // For remove, it might be same or specialized.
        // My API: 'manage_request' uses 'sender_id' (the other person).
        // Wait, manage_request expects 'sender_id' (who sent the request). 
        // In pending list, 'item.sender_profile_id' is the profile ID of sender.

        // For 'remove' (unfriend), usually we delete the row. My API didn't explicitly have 'remove_friend' but 'reject' deletes row.
        // Let's use 'reject' logic for remove if 'manage_request' allows it or create specific if needed.
        // Actually, 'manage_request' deletes if sub_action is reject.
        // But manage_request requires 'sender_id' (profile ID of other person). 
        // In 'connected' list, if I am receiver, sender_id is other. If I am sender, receiver_id is other.
        // This is complex. Let's simplify API to take 'proposal_id' directly?
        // Ah, api_matrimony.php uses `WHERE sender_id='$sender_id' AND receiver_id='$my_profile_id'`.
        // This only works if *I* am the receiver and I am rejecting/accepting.
        // For REMOVING a friend, I could be either sender or receiver.

        // Let's quickly ADD a robust 'delete_proposal' to api_matrimony.php that takes proposal_id.
        // It's safer.

        // Proceeding with assumption I'll add 'delete_proposal' action to API.

        // try { // Removed unclosed try
        const formData = new FormData();
        formData.append('action', 'delete_proposal');
        formData.append('proposal_id', id); // We need to pass the ID of the proposal row
        formData.append('sub_action', action === 'accept' ? 'accept' : 'delete');

        // Wait, for ACCEPT, I need 'manage_request'.
        // For REJECT/REMOVE, I can use 'delete_proposal'.

        // id here is effectively the PROPOSAL ID according to previous code,
        // BUT for api_connect.php we need SENDER_ID or OTHER_ID (Profile IDs).
        // Let's find the item to get IDs.

        let item: any;
        if (action === 'remove') item = connectedFriends.find(p => p.id === id);
        else item = pendingRequests.find(p => p.id === id);

        if (!item) return;

        const payload = {
            user_id: user.id,
            action: action === 'accept' ? 'accept_request' : (action === 'reject' ? 'reject_request' : 'remove_connection'),
            sender_id: item.sender_profile_id || item.sender_id,
            receiver_id: item.receiver_profile_id || item.receiver_id,
            proposal_id: item.proposal_id || item.id,
            other_user_id: item.user_id
        };

        try {
            await api.post('api_connect.php', payload);
            Alert.alert("Success", "Action Completed");
            fetchData();
        } catch (error) {
            Alert.alert("Error", "Action Failed");
        }
    };

    const handleCancelRequest = async (receiverId: string) => {
        Alert.alert("Cancel Request", "Are you sure you want to cancel this request?", [
            { text: "No", style: "cancel" },
            {
                text: "Yes, Cancel", style: "destructive", onPress: async () => {
                    try {
                        await api.post('api_connect.php', {
                            action: 'cancel_request',
                            user_id: user.id,
                            receiver_id: receiverId
                        });
                        fetchData();
                        Alert.alert("Success", "Request Cancelled");
                    } catch (error) {
                        Alert.alert("Error", "Failed to cancel request");
                    }
                }
            }
        ]);
    };

    const renderPendingItem = ({ item }: { item: any }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Image
                source={{ uri: item.photo ? `${PHOTO_URL}${item.photo}` : 'https://via.placeholder.com/100' }}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.full_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{item.city} • {item.age} yrs</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                        style={{ backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, flex: 1, alignItems: 'center' }}
                        onPress={() => handleAction(item.id, 'accept')}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', borderWidth: 1, borderColor: isDarkMode ? '#EF4444' : '#FECACA', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, flex: 1, alignItems: 'center' }}
                        onPress={() => handleAction(item.id, 'reject')}
                    >
                        <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderConnectedItem = ({ item }: { item: any }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Image
                source={{ uri: item.photo ? `${PHOTO_URL}${item.photo}` : 'https://via.placeholder.com/100' }}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.full_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{item.city} • {item.age} yrs</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                        style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                        onPress={() => navigation.navigate('Chat', {
                            receiver: {
                                id: item.friend_profile_id,
                                full_name: item.full_name,
                                photo: item.photo,
                                user_id: item.user_id
                            },
                            platform: 'marriage'
                        })}
                    >
                        <Ionicons name="chatbubble-ellipses" size={15} color="white" />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, flex: 1, alignItems: 'center' }}
                        onPress={() => Alert.alert("Remove Friend", "Are you sure?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Remove", style: "destructive", onPress: () => handleAction(item.id, 'remove') }
                        ])}
                    >
                        <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderSentItem = ({ item }: { item: any }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Image
                source={{ uri: item.photo ? `${PHOTO_URL}${item.photo}` : 'https://via.placeholder.com/100' }}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.full_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{item.city} • {item.age} yrs</Text>
                <TouchableOpacity
                    style={{ marginTop: 8, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start' }}
                    onPress={() => handleCancelRequest(item.receiver_id)}
                >
                    <Text style={{ color: theme.textMuted, fontWeight: 'bold', fontSize: 12 }}>Cancel Request</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const PendingRoute = () => (
        <FlashList
            data={pendingRequests}
            renderItem={renderPendingItem}
            keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : index.toString()}
            contentContainerStyle={{ backgroundColor: theme.background }}
            ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 80, padding: 16 }}>
                    <Text style={{ fontSize: 36, marginBottom: 16 }}>🔕</Text>
                    <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: 16, fontWeight: '500' }}>No pending requests.</Text>
                </View>
            }
        />
    );

    const SentRoute = () => (
        <FlashList
            data={sentRequests}
            renderItem={renderSentItem}
            keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : index.toString()}
            contentContainerStyle={{ backgroundColor: theme.background }}
            ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 80, padding: 16 }}>
                    <Text style={{ fontSize: 36, marginBottom: 16 }}>🕊️</Text>
                    <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: 16, fontWeight: '500' }}>No sent requests.</Text>
                </View>
            }
        />
    );

    const ConnectedRoute = () => (
        <FlashList
            data={connectedFriends}
            renderItem={renderConnectedItem}
            keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : index.toString()}
            contentContainerStyle={{ backgroundColor: theme.background }}
            ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 80, padding: 16 }}>
                    <Text style={{ fontSize: 36, marginBottom: 16 }}>👥</Text>
                    <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: 16, fontWeight: '500' }}>No connections yet.</Text>
                </View>
            }
        />
    );

    const renderScene = SceneMap({
        pending: PendingRoute,
        sent: SentRoute,
        connected: ConnectedRoute,
    });

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}><ActivityIndicator color="#2563EB" /></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Requests & Friends</Text>
            </View>

            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={(props: any) => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: '#2563EB', height: 3 }}
                        style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}
                        activeColor="#2563EB"
                        inactiveColor={theme.textMuted}
                        renderLabel={({ route, focused, color }: any) => (
                            <Text style={{ color, margin: 8, fontWeight: focused ? 'bold' : '600', fontSize: 14 }}>
                                {route.title}
                            </Text>
                        )}
                    />
                )}
            />
        </SafeAreaView>
    );
};

export default RequestScreen;

