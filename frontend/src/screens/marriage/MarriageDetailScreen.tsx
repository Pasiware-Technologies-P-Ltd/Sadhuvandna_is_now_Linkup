import { Image } from 'expo-image';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL, getFullPaymentUrl, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useFocusEffect } from '@react-navigation/native';
import { ImageService } from '../../services/ImageService';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const MarriageDetailScreen = ({ navigation, route }: any) => {
    const { profile } = route.params;
    const insets = useSafeAreaInsets();
    const { isDarkMode, theme } = useTheme();

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10, backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: isDarkMode ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE' }}>
            <Ionicons name={icon} size={20} color="#3B82F6" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{title}</Text>
        </View>
    );

    const isPending = proposalStatus === 'pending' || proposalStatus === 'sent' || proposalStatus === 'received';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card, zIndex: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, flex: 1 }} numberOfLines={1}>{profile.full_name}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}>
                <View style={{ position: 'relative' }}>
                    <Image
                        source={{ uri: profile.photo ? ImageService.getDetailImageUrl(`${PHOTO_URL}${profile.photo}`, 1080) : 'https://via.placeholder.com/300' }}
                        style={{ width: '100%', height: 320, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }}
                        contentFit="cover"
                    />
                </View>

                <View style={{ padding: 22, marginTop: -32, backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: theme.border, minHeight: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text }}>{profile.full_name}</Text>
                            <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 15, marginVertical: 3 }}>
                                {profile.occupation} {profile.work_place ? `at ${profile.work_place}` : ''}
                            </Text>
                            <Text style={{ color: theme.textMuted, fontSize: 13, flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="location" size={13} color={theme.textMuted} /> {profile.city}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDarkMode ? '#2563EB' : '#BFDBFE' }}>
                            <Text style={{ color: isDarkMode ? '#93C5FD' : '#1E40AF', fontWeight: 'bold', fontSize: 13 }}>
                                {new Date().getFullYear() - new Date(profile.dob).getFullYear()} yrs
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ marginTop: 20, marginBottom: 8 }}>
                        {proposalStatus === 'accepted' || proposalStatus === 'friend' ? (
                            <TouchableOpacity
                                style={{ backgroundColor: '#16A34A', padding: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 2 }}
                                onPress={checkPaymentAndNavigate}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="chatbubbles" size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Send Message</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={{
                                    padding: 15,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: isPending ? (isDarkMode ? '#334155' : '#E2E8F0') : '#2563EB',
                                    elevation: isPending ? 0 : 2,
                                }}
                                onPress={handleSendProposal}
                                disabled={isPending || loading}
                                activeOpacity={0.85}
                            >
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Ionicons name={isPending ? "time" : "heart"} size={20} color={isPending ? (isDarkMode ? "#94A3B8" : "gray") : "white"} />
                                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: isPending ? (isDarkMode ? '#94A3B8' : '#64748B') : 'white' }}>
                                            {isPending ? "Requested" : "Send Interest"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={{ color: theme.textSecondary, fontStyle: 'italic', marginVertical: 14, lineHeight: 22, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, textAlign: 'center' }}>
                        "{profile.about || "No bio available"}"
                    </Text>

                    {/* Basic Info */}
                    <SectionHeader title="Basic Details" icon="person" />
                    <View>
                        <InfoRow label="Age / DOB" value={`${profile.dob} (${new Date().getFullYear() - new Date(profile.dob).getFullYear()} yrs)`} theme={theme} />
                        <InfoRow label="Height" value={profile.height} theme={theme} />
                        <InfoRow label="Weight" value={profile.weight} theme={theme} />
                        <InfoRow label="Marital Status" value={profile.status} theme={theme} />
                        <InfoRow label="Religion" value={profile.religion} theme={theme} />
                        <InfoRow label="Caste" value={profile.caste} theme={theme} />
                        <InfoRow label="Kuldevi" value={profile.kuldevi} theme={theme} />
                    </View>

                    {/* Education & Career */}
                    <SectionHeader title="Education & Career" icon="briefcase" />
                    <View>
                        <InfoRow label="Education" value={profile.education} theme={theme} />
                        <InfoRow label="Occupation" value={profile.occupation} theme={theme} />
                        <InfoRow label="Work Place" value={profile.work_place} theme={theme} />
                        <InfoRow label="Income" value={profile.income} theme={theme} />
                    </View>

                    {/* Family Details */}
                    <SectionHeader title="Family Details" icon="people" />
                    <View>
                        <InfoRow label="Father" value={`${profile.father_name} (${profile.father_occupation})`} theme={theme} />
                        <InfoRow label="Mother" value={profile.mother_name} theme={theme} />
                        <InfoRow label="Siblings" value={profile.siblings} theme={theme} />
                        <InfoRow label="Family Type" value={profile.family_type} theme={theme} />
                    </View>

                    {/* Lifestyle & Habits */}
                    <SectionHeader title="Lifestyle & Habits" icon="cafe" />
                    <View>
                        <InfoRow label="Nature" value={profile.nature} theme={theme} />
                        <InfoRow label="Food Habit" value={profile.food} theme={theme} />
                        <InfoRow label="Habits" value={profile.habits} theme={theme} />
                        <InfoRow label="Hobbies" value={profile.hobbies} theme={theme} />
                    </View>

                    {/* Location */}
                    <SectionHeader title="Location" icon="location" />
                    <View>
                        <InfoRow label="City" value={profile.city} theme={theme} />
                        <InfoRow label="Residence" value={profile.residence} theme={theme} />
                    </View>

                    {/* Partner Preferences */}
                    <SectionHeader title="Partner Preference" icon="heart" />
                    <View>
                        <InfoRow label="Age Range" value={`${profile.partner_age_from} - ${profile.partner_age_to} yrs`} theme={theme} />
                        <InfoRow label="Education" value={profile.partner_education} theme={theme} />
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 }}>Expectations</Text>
                            <Text style={{ color: theme.text, backgroundColor: isDarkMode ? '#0F172A' : '#EFF6FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                                {profile.partner_expectations || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const InfoRow = ({ label, value, theme }: { label: string, value: string, theme: any }) => (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 10, alignItems: 'flex-start' }}>
        <Text style={{ width: 130, color: theme.textMuted, fontSize: 13, fontWeight: '500' }}>{label}</Text>
        <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: '600' }}>{value || 'N/A'}</Text>
    </View>
);

export default MarriageDetailScreen;
