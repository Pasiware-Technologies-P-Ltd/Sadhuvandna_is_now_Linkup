import { Image } from 'expo-image';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL, getFullPaymentUrl } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useFocusEffect } from '@react-navigation/native';
import { ImageService } from '../../services/ImageService';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const MarriageDetailScreen = ({ navigation, route }: any) => {
    const { profile } = route.params;
    const insets = useSafeAreaInsets();

    const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
    const [proposalStatus, setProposalStatus] = React.useState<string>(profile.proposal_status || 'none');
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        loadUser();
    }, []);

    React.useEffect(() => {
        if (currentUserId && profile.id) {
            loadCachedStatus();
            checkStatus();
        }
    }, [currentUserId, profile]);

    const loadCachedStatus = async () => {
        try {
            const cached = await AsyncStorage.getItem(`cached_proposal_${currentUserId}_${profile.id}`);
            if (cached) setProposalStatus(cached);
        } catch (e) {}
    };

    const loadUser = async () => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                const u = JSON.parse(uStr);
                setCurrentUserId(String(u.id));
                return;
            }
            const directUid = await AsyncStorage.getItem('user_id');
            if (directUid) {
                setCurrentUserId(directUid);
            }
        } catch (e) {
            console.error("loadUser error", e);
        }
    };

    const checkStatus = async () => {
        if (!currentUserId) return;
        try {
            const res = await api.get(`get_proposal_status.php?user_id=${currentUserId}&receiver_id=${profile.id}`);
            if (res.data.status === 'success') {
                setProposalStatus(res.data.proposal_status);
                AsyncStorage.setItem(`cached_proposal_${currentUserId}_${profile.id}`, res.data.proposal_status);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const isFemale = profile?.gender === 'Female' || profile?.gender === 'female' || profile?.gender === 'F';

    useFocusEffect(
        React.useCallback(() => {
            if (isFemale) {
                ScreenCapture.preventScreenCaptureAsync().catch(console.warn);
            }
            return () => {
                if (isFemale) {
                    ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
                }
            };
        }, [isFemale])
    );

    const checkPaymentAndNavigate = async () => {
        if (!currentUserId) return;

        try {
            const payload = {
                user_id: currentUserId,
                receiver_id: profile.id,
                platform: 'marriage'
            };

            const res = await api.post('check_chat_payment.php', payload);

            if (res.data.status === 'success') {
                if (res.data.paid) {
                    navigation.navigate('Chat', { receiver: { id: profile.id, name: profile.full_name, profile_photo: profile.photo }, platform: 'marriage' });
                } else {
                    const paymentUrl = getFullPaymentUrl(res.data.payment_url);
                    Alert.alert(
                        "Payment Required",
                        "You need to pay to chat with this profile.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Pay Now", onPress: () => Linking.openURL(paymentUrl) }
                        ]
                    );
                }
            } else {
                Alert.alert("Error", res.data.message || "Failed to check payment status");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed");
        }
    };

    const handleSendProposal = async () => {
        if (!currentUserId) {
            Alert.alert("Error", "Please login first");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                user_id: currentUserId,
                receiver_id: profile.id
            };

            const res = await api.post('send_proposal.php', payload);
            if (res.data.status === 'success') {
                Alert.alert("Success", "Proposal Sent Successfully!");
                setProposalStatus('pending');
            } else {
                Alert.alert("Notice", res.data.message);
                if (res.data.message.includes("already sent")) {
                    setProposalStatus('pending');
                }
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ title, icon }: any) => (
        <View className="flex-row items-center gap-2 mt-6 mb-3 bg-blue-50 p-2 rounded-lg">
            <Ionicons name={icon} size={20} color="#2563EB" />
            <Text className="text-lg font-bold text-orange-800">{title}</Text>
        </View>
    );

    const isPending = proposalStatus === 'pending' || proposalStatus === 'sent' || proposalStatus === 'received';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center p-4 border-b border-gray-100 z-10 bg-white">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900 flex-1" numberOfLines={1}>{profile.full_name}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}>
                <View className="relative">
                    <Image
                        source={{ uri: profile.photo ? ImageService.getDetailImageUrl(`${PHOTO_URL}${profile.photo}`, 1080) : 'https://via.placeholder.com/300' }}
                        className="bg-slate-200"
                        style={{ width: '100%', height: 320 }}
                        contentFit="cover"
                    />
                </View>

                <View className="p-6 -mt-10 bg-white rounded-t-3xl shadow-lg min-h-screen">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-blue-950">{profile.full_name}</Text>
                            <Text className="text-blue-600 font-medium text-base mb-1">
                                {profile.occupation} {profile.work_place ? `at ${profile.work_place}` : ''}
                            </Text>
                            <Text className="text-slate-500 text-sm">
                                <Ionicons name="location" size={12} /> {profile.city}
                            </Text>
                        </View>
                        <View className="bg-blue-100 px-3 py-1 rounded-full border border-orange-200">
                            {/* Calculate Age roughly */}
                            <Text className="text-orange-800 font-bold">{new Date().getFullYear() - new Date(profile.dob).getFullYear()} yrs</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-6 mb-2">
                        {proposalStatus === 'accepted' || proposalStatus === 'friend' ? (
                            <TouchableOpacity
                                className="bg-green-600 p-4 rounded-xl items-center shadow-lg shadow-green-100 flex-row justify-center gap-2"
                                onPress={checkPaymentAndNavigate}
                            >
                                <Ionicons name="chatbubbles" size={20} color="white" />
                                <Text className="text-white font-bold text-lg">Send Message</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                className={`p-4 rounded-xl items-center shadow-lg flex-row justify-center gap-2 ${isPending ? 'bg-slate-200' : 'bg-blue-600 shadow-orange-200'}`}
                                onPress={handleSendProposal}
                                disabled={isPending || loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Ionicons name={isPending ? "time" : "heart"} size={20} color={isPending ? "gray" : "white"} />
                                        <Text className={`font-bold text-lg ${isPending ? 'text-slate-500' : 'text-white'}`}>
                                            {isPending ? "Requested" : "Send Interest"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text className="text-slate-500 italic my-4 leading-5 bg-slate-50 p-3 rounded-lg border border-gray-100 text-center">
                        "{profile.about || "No bio available"}"
                    </Text>

                    {/* Basic Info */}
                    <SectionHeader title="Basic Details" icon="person" />
                    <View className="space-y-3">
                        <InfoRow label="Age / DOB" value={`${profile.dob} (${new Date().getFullYear() - new Date(profile.dob).getFullYear()} yrs)`} />
                        <InfoRow label="Height" value={profile.height} />
                        <InfoRow label="Weight" value={profile.weight} />
                        <InfoRow label="Marital Status" value={profile.status} />
                        <InfoRow label="Religion" value={profile.religion} />
                        <InfoRow label="Caste" value={profile.caste} />
                        <InfoRow label="Kuldevi" value={profile.kuldevi} />
                    </View>

                    {/* Education & Career */}
                    <SectionHeader title="Education & Career" icon="briefcase" />
                    <View className="space-y-3">
                        <InfoRow label="Education" value={profile.education} />
                        <InfoRow label="Occupation" value={profile.occupation} />
                        <InfoRow label="Work Place" value={profile.work_place} />
                        <InfoRow label="Income" value={profile.income} />
                    </View>

                    {/* Family Details */}
                    <SectionHeader title="Family Details" icon="people" />
                    <View className="space-y-3">
                        <InfoRow label="Father" value={`${profile.father_name} (${profile.father_occupation})`} />
                        <InfoRow label="Mother" value={profile.mother_name} />
                        <InfoRow label="Siblings" value={profile.siblings} />
                        <InfoRow label="Family Type" value={profile.family_type} />
                    </View>

                    {/* Lifestyle & Habits */}
                    <SectionHeader title="Lifestyle & Habits" icon="cafe" />
                    <View className="space-y-3">
                        <InfoRow label="Nature" value={profile.nature} />
                        <InfoRow label="Food Habit" value={profile.food} />
                        <InfoRow label="Habits" value={profile.habits} />
                        <InfoRow label="Hobbies" value={profile.hobbies} />
                    </View>

                    {/* Location */}
                    <SectionHeader title="Location" icon="location" />
                    <View className="space-y-3">
                        <InfoRow label="City" value={profile.city} />
                        <InfoRow label="Residence" value={profile.residence} />
                    </View>

                    {/* Partner Preferences */}
                    <SectionHeader title="Partner Preference" icon="heart" />
                    <View className="space-y-3">
                        <InfoRow label="Age Range" value={`${profile.partner_age_from} - ${profile.partner_age_to} yrs`} />
                        <InfoRow label="Education" value={profile.partner_education} />
                        <View className="mt-2">
                            <Text className="text-slate-500 text-xs uppercase mb-1">Expectations</Text>
                            <Text className="text-blue-900 bg-blue-50 p-2 rounded-lg border border-orange-100">{profile.partner_expectations || 'N/A'}</Text>
                        </View>
                    </View>

                    <View className="h-10" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View className="flex-row border-b border-gray-100 py-2 items-start">
        <Text className="w-32 text-gray-400 text-sm font-medium">{label}</Text>
        <Text className="flex-1 text-blue-900 text-sm font-semibold">{value || 'N/A'}</Text>
    </View>
);

export default MarriageDetailScreen;
