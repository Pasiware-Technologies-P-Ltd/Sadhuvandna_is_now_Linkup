import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email");
            return;
        }
        setLoading(true);
        try {
            const payload = { email: email };
            const res = await api.post('/api_forgot_send_otp.php', payload);
            if (res.data.status === 'success') {
                Alert.alert("OTP Sent", "Please check your email for OTP.");
                setStep(2);
            } else {
                Alert.alert("Error", res.data.message || "Failed to send OTP");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) {
            Alert.alert("Error", "Please enter OTP");
            return;
        }
        setLoading(true);
        try {
            const payload = { otp: otp };
            const res = await api.post('/api_forgot_verify_otp.php', payload);
            if (res.data.status === 'success') {
                setStep(3);
            } else {
                Alert.alert("Error", res.data.message || "Invalid OTP");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const payload = { password: newPassword };
            const res = await api.post('/api_forgot_reset_password.php', payload);
            if (res.data.status === 'success') {
                Alert.alert("Success", "Password reset successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Failed to reset password");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View className="w-full">
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>Enter your registered email to receive an OTP.</Text>
            <View 
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 24
                }}
            >
                <Ionicons name="mail-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <TouchableOpacity
                className="w-full bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-orange-200"
                onPress={handleSendOtp}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Send OTP</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View className="w-full">
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>Enter the 6-digit OTP sent to {email}</Text>
            <View 
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 24
                }}
            >
                <Ionicons name="key-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <TouchableOpacity
                className="w-full bg-green-600 py-4 rounded-xl items-center shadow-lg shadow-green-200"
                onPress={handleVerifyOtp}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Verify OTP</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View className="w-full">
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>Create a new password for your account.</Text>
            <View 
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 16
                }}
            >
                <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <View 
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 24
                }}
            >
                <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <TouchableOpacity
                className="w-full bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-orange-200"
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Reset Password</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, paddingHorizontal: 24, paddingVertical: 40 }}>
            <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={{ position: 'absolute', top: 48, left: 24, zIndex: 10, padding: 8 }}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>

            <View className="items-center mt-10 mb-8">
                <View 
                    style={{
                        width: 80,
                        height: 80,
                        backgroundColor: isDarkMode ? '#1E3A8A40' : '#DBEAFE',
                        borderRadius: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16
                    }}
                >
                    <Ionicons name={step === 3 ? "lock-open" : "shield-checkmark-outline"} size={40} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>
                    {step === 1 ? 'Forgot Password?' : step === 2 ? 'Verify Identity' : 'Reset Password'}
                </Text>
            </View>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </SafeAreaView>
    );
};

export default ForgotPasswordScreen;
