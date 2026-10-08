import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';                  
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
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
        <SafeAreaView className="flex-1 bg-[#fffaf5]" edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 120 }}>
                    {!showOtpScreen ? (
                    <>
                        <View className="items-center mb-10">
                            <View className="bg-white p-5 rounded-[32px] mb-6 shadow-xl shadow-orange-100 border border-orange-50">
                                <Ionicons name="people" size={48} color="#ff6b00" />
                            </View>
                            <Text className="text-4xl font-black text-[#1a2b4c] text-center tracking-tight">{t('welcomeLogin')}</Text>
                            <Text className="text-gray-500 font-medium mt-3 text-center text-base">{t('enterDetailsLogin')}</Text>
                        </View>

                        <View className="space-y-6 px-2">
                            <View>
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-2">{t('mobileNumber')}</Text>
                                <View className="flex-row items-center bg-white rounded-2xl px-5 py-4 shadow-sm shadow-gray-100 border border-gray-100">
                                    <Ionicons name="phone-portrait" size={24} color="#ff6b00" />
                                    <TextInput
                                        className="flex-1 ml-4 text-[#1a2b4c] text-lg font-bold"
                                        placeholder="9648022011"
                                        placeholderTextColor="#cbd5e1"
                                        value={mobile}
                                        onChangeText={setMobile}
                                        keyboardType="number-pad"
                                        maxLength={10}
                                        selectionColor="#ff6b00"
                                    />
                                </View>
                            </View>
                        </View>

                        <View className="px-2 mt-10">
                            <TouchableOpacity
                                className="w-full bg-[#ff6b00] py-4 rounded-2xl items-center shadow-lg shadow-orange-300 mb-4 flex-row justify-center"
                                onPress={handleGetLoginCode}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-lg mr-2 tracking-wide">{t('getLoginCode')}</Text>
                                        <Ionicons name="arrow-forward" size={22} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <View className="flex-1 justify-center items-center px-2">
                        <View className="bg-white p-6 rounded-[32px] mb-8 shadow-xl shadow-orange-100 border border-orange-50">
                            <Ionicons name="chatbubble-ellipses" size={56} color="#ff6b00" />
                        </View>
                        <Text className="text-3xl font-black text-[#1a2b4c] mb-3 text-center tracking-tight">{t('verifyOtp')}</Text>
                        <Text className="text-gray-500 text-center mb-10 px-4 text-base leading-relaxed">
                            {t('sentCodeTo')} <Text className="font-bold text-[#1a2b4c]">+91 {mobile}</Text>
                        </Text>

                        <View className="w-full bg-white rounded-3xl p-8 shadow-xl shadow-gray-100 border border-gray-50">
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">{t('enterOtp')}</Text>
                            <View className="bg-[#f8fafc] rounded-2xl px-5 py-4 border border-gray-100 flex-row items-center mb-8">
                                <Ionicons name="keypad" size={24} color="#ff6b00" />
                                <TextInput
                                    className="flex-1 ml-4 text-3xl tracking-[0.5em] text-[#1a2b4c] font-black text-center"
                                    placeholder="••••••"
                                    placeholderTextColor="#cbd5e1"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    autoFocus
                                    textContentType="oneTimeCode"
                                    autoComplete="sms-otp"
                                    importantForAutofill="yes"
                                    selectionColor="#ff6b00"
                                />
                            </View>

                            <TouchableOpacity
                                className="w-full bg-[#ff6b00] py-4 rounded-2xl items-center shadow-lg shadow-orange-300"
                                onPress={handleVerifyOtp}
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg tracking-wide">{t('verifyAndLogin')}</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="mt-8 items-center flex-row justify-center py-2"
                                onPress={() => setShowOtpScreen(false)}
                            >
                                <Ionicons name="arrow-back" size={18} color="#64748b" style={{ marginRight: 8 }} />
                                <Text className="text-slate-500 font-semibold text-base">{t('changeMobileNumber')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
