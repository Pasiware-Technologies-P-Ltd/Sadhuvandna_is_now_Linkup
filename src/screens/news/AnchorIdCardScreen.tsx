import { Image } from 'expo-image';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import api, { WEBSITE_URL } from '../../services/api';

const { width } = Dimensions.get('window');
const cardWidth = Math.min(width - 40, 360);

const AnchorIdCardScreen = ({ navigation }: any) => {
    const { t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const viewShotRef = useRef<ViewShot>(null);

    const [anchorLocalPhoto, setAnchorLocalPhoto] = useState<string | null>(null);
    const [anchorState, setAnchorState] = useState<string | null>(null);
    const [anchorDistrict, setAnchorDistrict] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const uStr = await AsyncStorage.getItem('user');
                let userId = null;
                if (uStr) {
                    const parsedUser = JSON.parse(uStr);
                    setUser(parsedUser);
                    userId = parsedUser.id;
                }
                
                // 1. Check local storage first (for instant updates after applying)
                const localPhoto = await AsyncStorage.getItem('anchor_local_photo');
                if (localPhoto) {
                    setAnchorLocalPhoto(localPhoto);
                }
                
                // 2. Fetch from backend to ensure we have the official application photo across devices
                if (userId) {
                    try {
                        const anchorRes = await api.get(`/check_anchor_status.php?user_id=${userId}`);
                        if (anchorRes.data && anchorRes.data.status === 'success') {
                            const appPhoto = anchorRes.data.application_photo;
                            if (appPhoto) {
                                // Anchor application photos are stored in uploads/anchor_applications/
                                const fullUrl = appPhoto.startsWith('http') ? appPhoto : `${WEBSITE_URL}/uploads/anchor_applications/${appPhoto}`;
                                setAnchorLocalPhoto(fullUrl);
                            }
                            if (anchorRes.data.state) {
                                setAnchorState(anchorRes.data.state);
                            }
                            if (anchorRes.data.district) {
                                setAnchorDistrict(anchorRes.data.district);
                            }
                        }
                    } catch (e) {
                        console.log('Failed to fetch backend anchor photo', e);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const captureAndShare = async () => {
        try {
            if (viewShotRef.current && viewShotRef.current.capture) {
                const uri = await viewShotRef.current.capture();
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: 'Share ID Card',
                        UTI: 'public.png'
                    });
                } else {
                    Alert.alert("Error", "Sharing is not available on this device");
                }
            }
        } catch (error) {
            console.error("Failed to capture screen", error);
            Alert.alert("Error", "Failed to generate image.");
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#1b3b64" />
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                <Text>User not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#1b3b64', borderRadius: 8 }}>
                    <Text style={{ color: 'white' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Generate ID
    const userIdString = String(user.id || 0).padStart(3, '0');
    const idNo = `LNKP-${new Date().getFullYear()}-${userIdString}`;

    // Generate Expiry Date
    const issueDate = user.created_at ? new Date(user.created_at) : new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Formatting date to look like "31 Dec 2027"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = expiryDate.getDate().toString().padStart(2, '0');
    const month = months[expiryDate.getMonth()];
    const year = expiryDate.getFullYear();
    const validTill = `${day} ${month} ${year}`;

    // QR Code URL
    const qrData = encodeURIComponent(`https://www.sadhuvandna.co.in/verify_reporter.php?id=${idNo}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

    // Get Profile Photo URL (prefer the one uploaded during Anchor Application)
    const profileFileName = user.profile_photo || user.photo || user.profile_pic || user.avatar;
    const backendPhotoUrl = profileFileName && !profileFileName.startsWith('http') 
        ? `${WEBSITE_URL}/uploads/photo/${profileFileName}` 
        : profileFileName;
        
    const finalPhotoUrl = anchorLocalPhoto || backendPhotoUrl;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Press Card</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }} style={styles.viewShotContainer}>
                    {/* ID CARD */}
                    <View style={styles.cardContainer}>
                        
                        {/* Top Hole */}
                        <View style={styles.hangerHoleWrapper}>
                            <View style={styles.hangerHole} />
                        </View>

                        {/* HEADER */}
                        <View style={styles.cardHeader}>
                            {/* Faint Globe Watermark */}
                            <Ionicons name="earth" size={180} color="rgba(255,255,255,0.06)" style={styles.globeOverlay} />
                            
                            <View style={styles.headerContent}>
                                {/* Logo */}
                                <View style={styles.logoWrapper}>
                                    <View style={styles.logoCircle}>
                                        <Image source={require('../../../assets/logo.png')} style={styles.actualLogo} />
                                    </View>
                                </View>
                                
                                {/* Title Texts */}
                                <View style={styles.headerRightText}>
                                    <Text style={styles.headerTitle}>LINKUP</Text>
                                    <Text style={styles.headerSubTitle}>APPLICATION</Text>
                                    <View style={styles.newsBadge}>
                                        <Text style={styles.newsBadgeText}>NEWS</Text>
                                    </View>
                                    <Text style={styles.headerSlogan}>हर खबर आपके साथ</Text>
                                </View>
                            </View>
                        </View>

                        {/* BODY */}
                        <View style={styles.cardBody}>
                            <View style={styles.bodyContentRow}>
                                
                                {/* LEFT COLUMN */}
                                <View style={styles.leftColumn}>
                                    <View style={styles.profileImageContainer}>
                                        {finalPhotoUrl ? (
                                            <Image source={{ uri: finalPhotoUrl }} style={styles.profileImage} />
                                        ) : (
                                            <View style={styles.profilePlaceholder}>
                                                <Ionicons name="person" size={70} color="#374151" />
                                            </View>
                                        )}
                                    </View>
                                    
                                    <View style={styles.signatureBox}>
                                        <Text style={styles.signatureScript}>{user.name?.split(' ')[0] || 'Reporter'}</Text>
                                        <View style={styles.signatureLine} />
                                        <Text style={styles.signatureLabel}>Holder's Signature</Text>
                                    </View>
                                    
                                    <View style={styles.sloganContainer}>
                                        <Text style={styles.sloganText} numberOfLines={1} adjustsFontSizeToFit>सत्यता | निष्पक्षता | जनहित</Text>
                                    </View>
                                </View>

                                {/* RIGHT COLUMN */}
                                <View style={styles.rightColumn}>
                                    {/* Badges */}
                                    <View style={styles.badgesSection}>
                                        <View style={styles.redBadgeSolid}>
                                            <Text style={styles.pressText}>PRESS</Text>
                                        </View>
                                        
                                        <Text style={styles.cardTextLarge}>CARD</Text>
                                        
                                        <View style={[styles.blueBadgeSolid, { marginTop: 2 }]}>
                                            <Text style={styles.reporterText}>NEWS REPORTER</Text>
                                        </View>
                                    </View>

                                    {/* Details Table */}
                                    <View style={styles.detailsContainer}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Name</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue}>{user.name || user.username || 'Reporter Name'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Designation</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>News Reporter</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>ID No.</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{idNo}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Mobile</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{user.phone || user.mobile || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>District</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{anchorDistrict || user.district || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>State</Text>
                                            <Text style={styles.detailColon}>:</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{anchorState || user.state || 'N/A'}</Text>
                                        </View>
                                    </View>

                                    {/* QR Code */}
                                    <View style={styles.qrCodeSection}>
                                        <View style={styles.qrCodeWrapper}>
                                            <Image source={{ uri: qrUrl }} style={styles.qrCodeImage} />
                                        </View>
                                        <Text style={styles.qrLabel}>Scan to Verify</Text>
                                        <Text style={styles.qrLabel}>Reporter ID</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* FOOTER - Rock solid layout for all Androids */}
                        <View style={styles.cardFooter}>
                            <View style={styles.footerRedArea}>
                                <Ionicons name="videocam-outline" size={32} color="white" style={{ marginRight: 8 }} />
                                <View>
                                    <Text style={styles.footerRedText}>सही खबर,</Text>
                                    <Text style={styles.footerRedText}>सही समय, सबके लिए</Text>
                                </View>
                            </View>
                            <View style={styles.footerSlant} />
                            <View style={styles.footerBlueArea}>
                                <Text style={styles.footerBlueLabel}>Valid Till</Text>
                                <Text style={styles.footerBlueDate}>{validTill}</Text>
                            </View>
                        </View>

                    </View>
                </ViewShot>

                {/* Download Button */}
                <TouchableOpacity style={styles.downloadButton} onPress={captureAndShare}>
                    <Ionicons name="download-outline" size={24} color="white" />
                    <Text style={styles.downloadButtonText}>Share & Download</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e5e7eb',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#d1d5db',
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 40,
    },
    viewShotContainer: {
        backgroundColor: 'transparent',
    },
    cardContainer: {
        width: cardWidth,
        aspectRatio: 0.63, // Exact standard ID card ratio
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#d1d5db',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    hangerHoleWrapper: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    hangerHole: {
        width: 55,
        height: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    cardHeader: {
        backgroundColor: '#1b3b64',
        paddingTop: 30, // Brought back slightly larger padding
        paddingBottom: 15,
        position: 'relative',
        overflow: 'hidden',
    },
    globeOverlay: {
        position: 'absolute',
        right: -30,
        top: -15,
        zIndex: 0,
    },
    headerContent: {
        flexDirection: 'row',
        zIndex: 2,
        paddingHorizontal: 15,
    },
    logoWrapper: {
        flex: 0.35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoCircle: {
        width: 70, // Restored good size
        height: 70, 
        borderRadius: 35,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fbb314', // Yellow border matching design
        overflow: 'hidden',
    },
    actualLogo: {
        width: '90%',
        height: '90%',
        resizeMode: 'contain',
    },
    headerRightText: {
        flex: 0.65,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 28, // Restored good size
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    headerSubTitle: {
        color: '#93c5fd',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginTop: -2,
    },
    newsBadge: {
        backgroundColor: '#d82424',
        paddingHorizontal: 15,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    newsBadgeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSlogan: {
        color: 'white',
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
    },
    cardBody: {
        flex: 1, 
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#f8fafc',
    },
    bodyContentRow: {
        flexDirection: 'row',
        flex: 1, // Let this row fill the cardBody to allow auto margins to work
    },
    leftColumn: {
        flex: 0.44, 
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    rightColumn: {
        flex: 0.56,
        paddingLeft: 6,
    },
    profileImageContainer: {
        width: 105,
        height: 125, // Restored good size for profile image
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginTop: 2,
    },
    profilePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    signatureBox: {
        alignItems: 'center',
        width: '100%',
        marginTop: 12,
    },
    signatureScript: {
        fontSize: 20, 
        fontFamily: 'sans-serif-medium',
        fontStyle: 'italic',
        fontWeight: 'bold',
        color: '#1b3b64',
        marginBottom: 2,
    },
    signatureLine: {
        width: '85%',
        height: 1,
        backgroundColor: '#1b3b64',
        marginBottom: 2,
    },
    signatureLabel: {
        fontSize: 9, 
        fontWeight: '700',
        color: '#1b3b64',
    },
    badgesSection: {
        alignItems: 'center',
        marginBottom: 6, 
    },
    redBadgeSolid: {
        backgroundColor: '#d82424',
        paddingHorizontal: 10,
        paddingVertical: 2,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
    },
    pressText: {
        color: 'white',
        fontSize: 26, // Restored slightly larger font
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    cardTextLarge: {
        color: '#1b3b64',
        fontSize: 30, // Restored slightly larger font
        fontWeight: '900',
        letterSpacing: 1,
        marginVertical: -2,
    },
    blueBadgeSolid: {
        backgroundColor: '#1b3b64',
        paddingHorizontal: 10,
        paddingVertical: 2,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
    },
    reporterText: {
        color: 'white',
        fontSize: 12, 
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    detailsContainer: {
        paddingHorizontal: 2,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 2, // Tighter spacing
    },
    detailLabel: {
        width: 60,
        fontSize: 10, 
        fontWeight: 'bold',
        color: '#1b3b64',
    },
    detailColon: {
        width: 8,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1b3b64',
    },
    detailValue: {
        flex: 1,
        fontSize: 10, 
        fontWeight: '600',
        color: '#000000',
    },
    qrCodeSection: {
        alignItems: 'center',
        marginTop: 'auto', // PUSHES QR CODE TO THE VERY BOTTOM OF THE COLUMN
        alignSelf: 'flex-end',
        paddingRight: 10,
    },
    qrCodeWrapper: {
        padding: 3,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#1b3b64',
        borderRadius: 4,
        marginBottom: 2,
    },
    qrCodeImage: {
        width: 45, // Shrunk to ensure labels fit perfectly
        height: 45,
    },
    qrLabel: {
        fontSize: 8.5, 
        fontWeight: '700',
        color: '#1b3b64',
        textAlign: 'center',
        lineHeight: 10,
    },
    sloganContainer: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        paddingTop: 4,
        marginTop: 'auto', // PUSHES SLOGAN TO THE VERY BOTTOM OF THE COLUMN
        width: '100%', 
    },
    sloganText: {
        fontSize: 11, // Reduced slightly to fit one line
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 0,
    },
    cardFooter: {
        height: 55, // Slightly larger footer
        flexDirection: 'row',
        backgroundColor: '#1b3b64',
        overflow: 'hidden',
    },
    footerRedArea: {
        flexDirection: 'row',
        backgroundColor: '#d82424',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 10,
        minWidth: '55%', 
    },
    footerRedText: {
        color: 'white',
        fontSize: 11, // Restored
        fontWeight: 'bold',
    },
    footerSlant: {
        width: 0,
        height: 0,
        borderTopWidth: 55, // Match footer height
        borderTopColor: '#d82424', 
        borderRightWidth: 25, // Slant angle
        borderRightColor: 'transparent',
    },
    footerBlueArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 15,
        marginLeft: -10, 
    },
    footerBlueLabel: {
        color: '#93c5fd',
        fontSize: 10, 
        fontWeight: '600',
    },
    footerBlueDate: {
        color: 'white',
        fontSize: 12, // Restored
        fontWeight: 'bold',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0b3861',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});

export default AnchorIdCardScreen;
