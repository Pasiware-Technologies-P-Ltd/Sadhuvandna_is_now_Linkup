import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';                  
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
// Picker removed as Caste selection is hidden
import { OTPWidget } from '@msg91comm/sendotp-react-native';

const ALLOWED_CASTES = [
    "Kapdi", "Deshani", "Dudhrejia", "Danidhariya", "Gondaliya", "Mesvaniya",
    "Ramkabir", "Ramsnehi", "Vaghani", "Chapbai", "Parabiya", "Hariyani",
    "Sarpadadiya", "Ramdevputra", "Ravibhan", "Baroliya"
];

const MSG91_WIDGET_ID = '36636b6f736b393436333238';
const MSG91_TOKEN_AUTH = '495236TgKMhDKHXV6996e94bP1';

export default function LoginScreen({ navigation }: any) {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();

    // Form states
    const [caste, setCaste] = useState('Kapdi');
    const [mobile, setMobile] = useState('');

    // OTP states
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [otp, setOtp] = useState('');
    const [reqId, setReqId] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Initialize MSG91 SDK
    useEffect(() => {
        OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
    }, []);

    // Auto-Submit Effect 
    useEffect(() => {
        // MSG91 OTPs are typically 4 or 6 digits
        if (otp && (otp.length === 4 || otp.length === 6)) {
            // Wait a small moment to ensure state is settled and user isn't still typing
            const timer = setTimeout(() => {
                if (!verifying) {
                    handleVerifyOtp();
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [otp]);

    const validateForm = () => {
        if (!mobile) {
            Alert.alert(t('error'), t('fillAllFields'));
            return false;
        }
        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            Alert.alert(t('error'), 'Please enter a valid 10-digit mobile number');
            return false;
        }
        return true;
    };

    const handleGetLoginCode = async () => {
        if (!validateForm()) return;

        // Bypass for test account
        if (mobile === '0123456789') {
            setReqId('bypass_req_id');
            setShowOtpScreen(true);
            return;
        }

        setLoading(true);
        try {
            // Identifier must be country code + number according to docs: '91758XXXXXXX'
            const data = {
                identifier: '91' + mobile
            };
            const response = await OTPWidget.sendOTP(data);

            // Expected response contains reqId if successful
            if (response && response.type === 'success' && response.message) {
                setReqId(response.message); // message contains the reqId in MSG91 V5
                setShowOtpScreen(true);
            } else {
                Alert.alert('Error', response?.message || 'Failed to send OTP via MSG91 SDK.');
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Network request failed when calling MSG91.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to verify with a specific OTP string (useful for auto-submit)
    const handleVerifyOtpWithCode = async (codeToVerify: string) => {
        if (!codeToVerify || codeToVerify.length < 4) {
            Alert.alert('Error', 'Please enter a valid OTP.');
            return;
        }

        console.log('Starting OTP Verification:', codeToVerify);
        setVerifying(true);
        try {
            let isVerified = false;

            if (mobile === '0123456789' && codeToVerify === '1234') {
                isVerified = true;
            } else if (mobile === '0123456789' && codeToVerify !== '1234') {
                Alert.alert('Verification Failed', 'Invalid OTP for test account');
                setVerifying(false);
                return;
            } else {
                const body = {
                    reqId: reqId,
                    otp: codeToVerify
                };
                console.log('Calling OTPWidget.verifyOTP...');
                const response = await OTPWidget.verifyOTP(body);
                console.log('OTPWidget.verifyOTP response:', response);

                if (response && response.type === 'success') {
                    isVerified = true;
                } else {
                    Alert.alert('Verification Failed', response?.message || 'Invalid OTP');
                    setVerifying(false);
                    return;
                }
            }

            if (isVerified) {
                const fullName = `New User`;

                const payload = {
                    mobile: mobile,
                    name: fullName,
                    caste: caste,
                    verified_from_sdk: 'true',
                    otp: codeToVerify
                };

                console.log('Calling backend verify API at:', api.defaults.baseURL + '/api_login_verify_otp.php');
                const backendResponse = await api.post('/api_login_verify_otp.php', payload);

                const data = backendResponse.data;
                console.log('Backend response data:', data);

                if (data.status === 'success_login' || data.status === 'success_register') {
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                    setShowOtpScreen(false);
                    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
                } else {
                    Alert.alert('Login Failed', data.message || data.detail || 'Invalid response from server');
                }
            }
        } catch (error: any) {
            console.error('OTP Verification Error:', error);
            let errorMsg = 'Verification request failed.';

            if (error.isAxiosError) {
                if (error.code === 'ECONNABORTED') {
                    errorMsg = 'Server connection timed out (30s). Please check your internet or try again later.';
                } else if (!error.response) {
                    errorMsg = `Network Error: Cannot reach server at ${api.defaults.baseURL}. Please verify server is online or try over high-speed internet.`;
                } else {
                    errorMsg = `Server Error (${error.response.status}): ${error.response.data?.message || error.message}`;
                }
            } else {
                errorMsg = error?.message || errorMsg;
            }

            Alert.alert('Error', errorMsg);
        } finally {
            console.log('Setting verifying to false');
            setVerifying(false);
        }
    };

    const handleVerifyOtp = () => {
        handleVerifyOtpWithCode(otp);
    };



    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 120 }}>
                    {!showOtpScreen ? (
                    <>
                        <View className="items-center mb-10">
                            <View 
                                style={{
                                    backgroundColor: theme.card,
                                    padding: 22,
                                    borderRadius: 32,
                                    marginBottom: 24,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    shadowColor: theme.primary,
                                    shadowOpacity: isDarkMode ? 0.3 : 0.12,
                                    shadowRadius: 12,
                                    elevation: 4
                                }}
                            >
                                <Ionicons name="people" size={48} color={theme.primary} />
                            </View>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: theme.text, textAlign: 'center', letterSpacing: -0.5 }}>{t('welcomeLogin')}</Text>
                            <Text style={{ color: theme.textSecondary, fontWeight: '500', marginTop: 12, textAlign: 'center', fontSize: 16 }}>{t('enterDetailsLogin')}</Text>
                        </View>

                        <View className="space-y-6 px-2">
                            <View>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 8 }}>{t('mobileNumber')}</Text>
                                <View 
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: theme.card,
                                        borderRadius: 16,
                                        paddingHorizontal: 20,
                                        paddingVertical: 14,
                                        borderWidth: 1,
                                        borderColor: theme.border,
                                    }}
                                >
                                    <Ionicons name="phone-portrait" size={24} color={theme.primary} />
                                    <TextInput
                                        style={{ flex: 1, marginLeft: 16, color: theme.text, fontSize: 18, fontWeight: 'bold' }}
                                        placeholder="9648022011"
                                        placeholderTextColor={theme.textMuted}
                                        value={mobile}
                                        onChangeText={setMobile}
                                        keyboardType="number-pad"
                                        maxLength={10}
                                        selectionColor={theme.primary}
                                    />
                                </View>
                            </View>
                        </View>

                        <View className="px-2 mt-10">
                            <TouchableOpacity
                                style={{
                                    width: '100%',
                                    backgroundColor: theme.primary,
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    shadowColor: theme.primary,
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                    marginBottom: 16
                                }}
                                onPress={handleGetLoginCode}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, marginRight: 8, letterSpacing: 0.5 }}>{t('getLoginCode')}</Text>
                                        <Ionicons name="arrow-forward" size={22} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <View className="flex-1 justify-center items-center px-2">
                        <View 
                            style={{
                                backgroundColor: theme.card,
                                padding: 24,
                                borderRadius: 32,
                                marginBottom: 32,
                                borderWidth: 1,
                                borderColor: theme.border,
                                shadowColor: theme.primary,
                                shadowOpacity: isDarkMode ? 0.3 : 0.12,
                                shadowRadius: 12,
                                elevation: 4
                            }}
                        >
                            <Ionicons name="chatbubble-ellipses" size={56} color={theme.primary} />
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 12, textAlign: 'center' }}>{t('verifyOtp')}</Text>
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 40, paddingHorizontal: 16, fontSize: 16, lineHeight: 24 }}>
                            {t('sentCodeTo')} <Text style={{ fontWeight: 'bold', color: theme.text }}>+91 {mobile}</Text>
                        </Text>

                        <View 
                            style={{
                                width: '100%',
                                backgroundColor: theme.card,
                                borderRadius: 24,
                                padding: 28,
                                borderWidth: 1,
                                borderColor: theme.border,
                                shadowColor: '#000',
                                shadowOpacity: isDarkMode ? 0.3 : 0.05,
                                shadowRadius: 8,
                                elevation: 3
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' }}>{t('enterOtp')}</Text>
                            <View 
                                style={{
                                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                                    borderRadius: 16,
                                    paddingHorizontal: 20,
                                    paddingVertical: 14,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: 32
                                }}
                            >
                                <Ionicons name="keypad" size={24} color={theme.primary} />
                                <TextInput
                                    style={{
                                        flex: 1,
                                        marginLeft: 16,
                                        fontSize: 28,
                                        letterSpacing: 12,
                                        color: theme.text,
                                        fontWeight: '900',
                                        textAlign: 'center'
                                    }}
                                    placeholder="••••••"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    autoFocus
                                    textContentType="oneTimeCode"
                                    autoComplete="sms-otp"
                                    importantForAutofill="yes"
                                    selectionColor={theme.primary}
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    width: '100%',
                                    backgroundColor: theme.primary,
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: theme.primary,
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4
                                }}
                                onPress={handleVerifyOtp}
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>{t('verifyAndLogin')}</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="mt-8 items-center flex-row justify-center py-2"
                                onPress={() => setShowOtpScreen(false)}
                            >
                                <Ionicons name="arrow-back" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
                                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 16 }}>{t('changeMobileNumber')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
