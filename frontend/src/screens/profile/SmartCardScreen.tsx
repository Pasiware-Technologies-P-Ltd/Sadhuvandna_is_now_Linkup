import { Image } from 'expo-image';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { WEBSITE_URL } from '../../services/api';

const { width } = Dimensions.get('window');

// Standard ATM/Credit card ratio: 85.6mm × 53.98mm ≈ 1.586 : 1
const CARD_WIDTH = width * 0.92;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

const LOGO_ASSET = require('../../../assets/icon.png');
const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

// Format number as card number blocks: SV-00087 → displayed as membership number
const formatCardId = (id: any) => {
    const num = String(id || '0').padStart(16, '0');
    return `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8, 12)} ${num.slice(12, 16)}`;
};

const SmartCardScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const viewShotRef = useRef<ViewShot>(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                setUser(JSON.parse(uStr));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!viewShotRef.current?.capture) return;
        try {
            const uri = await viewShotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: 'Share Smart Card',
                });
            } else {
                Alert.alert("Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            console.error("Snapshot failed", error);
            Alert.alert("Error", "Failed to generate smart card image.");
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Failed to load user data.</Text>
            </View>
        );
    }

    const cardIdNum = `SV-${String(user.id || '0').padStart(5, '0')}`;
    const formattedNumber = `•••• •••• •••• ${String(user.id || '0').padStart(4, '0')}`;
    const memberSince = new Date().getFullYear();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SMART CARD</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareIconButton}>
                    <Ionicons name="share-social-outline" size={22} color="#2563EB" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 24, paddingBottom: 50 }}>

                {/* ── ATM CARD ── */}
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}
                    style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={['#0F172A', '#1E3A8A', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
                    >

                        {/* Metallic / glass accent balls */}
                        <View style={styles.gradientTop} />
                        <View style={styles.gradientBall} />

                        {/* TOP ROW: Logo + VIP badge */}
                        <View style={styles.topRow}>
                            <View style={styles.logoBox}>
                                <View style={styles.logoWrapper}>
                                    <Image source={LOGO_ASSET} style={styles.logo} contentFit="cover" />
                                </View>
                                <View style={{ marginLeft: 8 }}>
                                    <Text style={styles.orgName}>LINKUP</Text>
                                </View>
                            </View>
                            <View style={styles.vipPill}>
                                <Ionicons name="shield-checkmark" size={11} color="#FCD34D" style={{ marginRight: 4 }} />
                                <Text style={styles.vipText}>VIP MEMBER</Text>
                            </View>
                        </View>

                        {/* CHIP + CONTACTLESS ROW */}
                        <View style={styles.chipRow}>
                            {/* EMV Chip */}
                            <View style={styles.chip}>
                                <View style={styles.chipInner}>
                                    <View style={styles.chipLine} />
                                    <View style={styles.chipLineH} />
                                    <View style={styles.chipLine} />
                                </View>
                            </View>
                            {/* Contactless symbol */}
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.contactless}>))))</Text>
                            </View>
                            {/* Profile Photo — pushed to right */}
                            <View style={styles.photoWrap}>
                                <Image
                                    source={{ uri: user.profile_photo ? `${PHOTO_URL}${user.profile_photo}` : 'https://via.placeholder.com/80' }}
                                    style={styles.photo}
                                />
                            </View>
                        </View>

                        {/* CARD NUMBER */}
                        <Text style={styles.cardNumber}>{formattedNumber}</Text>

                        {/* BOTTOM ROW: Name + Valid + Membership ID */}
                        <View style={styles.bottomRow}>
                            <View>
                                <Text style={styles.fieldLabel}>CARD HOLDER</Text>
                                <Text style={styles.fieldValue} numberOfLines={1}>
                                    {(user.name || 'MEMBER').toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ marginLeft: 28 }}>
                                <Text style={styles.fieldLabel}>VALID THRU</Text>
                                <Text style={styles.fieldValue}>{String(memberSince).slice(-2)}/{String(memberSince + 5).slice(-2)}</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.fieldLabel}>MEMBER ID</Text>
                                <Text style={styles.memberIdText}>{cardIdNum}</Text>
                            </View>
                        </View>

                        {/* Shine overlay */}
                        <View style={styles.shine} />
                    </LinearGradient>
                </ViewShot>

                {/* BACK OF CARD HINT */}
                <Text style={styles.hint}>Official LinkUp VIP Digital Membership Smart Card</Text>

                {/* DETAILS CARD */}
                <View style={styles.detailCard}>
                    <DetailRow icon="call" label="Mobile" value={`+91 ${user.phone || user.mobile || 'N/A'}`} />
                    {(user.city || user.address) && (
                        <DetailRow icon="location" label="City" value={user.city || user.address} />
                    )}
                    <DetailRow icon="pricetag" label="Membership No." value={cardIdNum} isLast={true} />
                </View>

                {/* Share Button */}
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.85}>
                    <Ionicons name="cloud-download-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.shareBtnText}>DOWNLOAD SMART CARD</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const DetailRow = ({ icon, label, value, isLast }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#F1F5F9' }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Ionicons name={icon} size={18} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
            <Text style={{ fontSize: 15, color: '#0F172A', fontWeight: '800', marginTop: 2 }}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        color: '#0F172A',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 1,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    shareIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
    },

    // ── Card Styles ──
    card: {
        borderRadius: 20,
        padding: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'space-between',
    },
    gradientTop: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: CARD_WIDTH * 0.55,
        height: CARD_WIDTH * 0.55,
        borderRadius: CARD_WIDTH * 0.275,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    gradientBall: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: CARD_WIDTH * 0.4,
        height: CARD_WIDTH * 0.4,
        borderRadius: CARD_WIDTH * 0.2,
        backgroundColor: 'rgba(37, 99, 235, 0.25)',
    },
    shine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: CARD_HEIGHT * 0.45,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderBottomLeftRadius: 100,
        borderBottomRightRadius: 100,
    },

    // Top row
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logoBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoWrapper: {
        width: 32,
        height: 32,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#2563EB',
        overflow: 'hidden',
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    logo: {
        width: '100%',
        height: '100%',
        transform: [{ scale: 1.18 }],
    },
    orgName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    vipPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3.5,
    },
    vipText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.2,
    },

    // Chip row
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    chip: {
        width: 36,
        height: 28,
        backgroundColor: '#EAB308',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    chipInner: {
        width: 28,
        height: 20,
        borderWidth: 0.5,
        borderColor: '#A16207',
        borderRadius: 3,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 2,
    },
    chipLine: {
        width: 24,
        height: 1.5,
        backgroundColor: '#A16207',
    },
    chipLineH: {
        width: 1.5,
        height: 14,
        backgroundColor: '#A16207',
        position: 'absolute',
    },
    contactless: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        letterSpacing: -4,
        fontWeight: '300',
        transform: [{ rotate: '90deg' }],
    },
    photoWrap: {
        marginLeft: 'auto' as any,
        width: CARD_HEIGHT * 0.38,
        height: CARD_HEIGHT * 0.38,
        borderRadius: CARD_HEIGHT * 0.19,
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        backgroundColor: '#1E293B',
    },
    photo: {
        width: '100%',
        height: '100%',
    },

    // Card number
    cardNumber: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 3,
        fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Bottom row
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    fieldLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    fieldValue: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
        maxWidth: 130,
    },
    memberIdText: {
        color: '#93C5FD',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
    },

    // Below card
    hint: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 18,
        marginBottom: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    detailCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 26,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 26,
        width: CARD_WIDTH,
        height: 52,
        elevation: 4,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    shareBtnText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 14.5,
        marginLeft: 8,
        letterSpacing: 1,
    },
});

export default SmartCardScreen;
