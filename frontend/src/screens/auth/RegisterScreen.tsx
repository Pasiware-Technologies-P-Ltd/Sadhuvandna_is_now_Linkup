import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const RegisterScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    // State for generatedOtp is no longer needed
    // const [generatedOtp, setGeneratedOtp] = useState('');

    // Step 3 Data
    const [mobile, setMobile] = useState('');
    const [city, setCity] = useState('');
    const [cast, setCast] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('Male');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOtp = async () => {
        if (!name || !email) {
            Alert.alert("Error", "Please enter Name and Email");
            return;
        }
        setLoading(true);
        try {
            const payload = { email: email };
            const res = await api.post('/api_send_otp.php', payload);

            // Backend now returns clean JSON
            if (res.data.status === 'success') {
                Alert.alert("OTP Sent", res.data.message);
                setStep(2);
            } else {
                Alert.alert("Error", res.data.message || "Failed to send OTP. Try again.");
            }
        } catch (e) {
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
            const payload = {
                email: email,
                otp: otp
            };

            const res = await api.post('/api_verify_otp.php', payload);

            // Backend now returns clean JSON
            if (res.data.status === 'success') {
                setStep(3);
            } else {
                Alert.alert("Error", res.data.message || "Invalid or Expired OTP");
            }
        } catch (e) {
            Alert.alert("Error", "Network error verifying OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!mobile || !city || !cast || !dob || !password || !confirmPassword) {
            Alert.alert("Error", "All fields are required");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: name,
                email: email,
                mobile: mobile,
                city: city,
                cast: cast,
                dob: dob,
                gender: gender,
                password: password
            };

            const res = await api.post('/register.php', payload);

            if (res.data.status === 'success') {
                Alert.alert("Success", "Registration Successful! Please Login.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Registration failed");
            }
        } catch (e) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View className="space-y-4">
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
                <Ionicons name="person-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
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
                    marginBottom: 16
                }}
            >
                <Ionicons name="mail-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center shadow-lg shadow-orange-200 mt-6"
                onPress={handleSendOtp}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Send OTP</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View className="space-y-4">
            <Text style={{ textAlign: 'center', color: theme.textSecondary, marginBottom: 16 }}>OTP sent to {email}</Text>
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
                <Ionicons name="key-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center shadow-lg shadow-orange-200 mt-6"
                onPress={handleVerifyOtp}
            >
                <Text className="text-white font-bold text-lg">Verify & Proceed</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View className="space-y-4">
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
                    marginBottom: 12
                }}
            >
                <Ionicons name="call-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
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
                    marginBottom: 12
                }}
            >
                <Ionicons name="business-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="City"
                    value={city}
                    onChangeText={setCity}
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
                    marginBottom: 12
                }}
            >
                <Ionicons name="people-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Community / Cast"
                    value={cast}
                    onChangeText={setCast}
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
                    marginBottom: 12
                }}
            >
                <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Date of Birth (DD-MM-YYYY)"
                    value={dob}
                    onChangeText={setDob}
                    placeholderTextColor={theme.textMuted}
                />
            </View>

            {/* Gender Selection */}
            <View className="flex-row justify-between mb-3">
                {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            alignItems: 'center',
                            marginHorizontal: 4,
                            backgroundColor: gender === g ? (isDarkMode ? '#1E3A8A40' : '#DBEAFE') : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                            borderColor: gender === g ? '#2563EB' : theme.border
                        }}
                    >
                        <Text style={{ color: gender === g ? '#3B82F6' : theme.textSecondary, fontWeight: gender === g ? 'bold' : 'normal' }}>{g}</Text>
                    </TouchableOpacity>
                ))}
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
                    marginBottom: 12
                }}
            >
                <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} />
                <TextInput
                    style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16 }}
                    placeholder="Create Password"
                    value={password}
                    onChangeText={setPassword}
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
                    marginBottom: 12
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
                className="bg-blue-600 p-4 rounded-xl items-center shadow-lg shadow-orange-200 mt-6"
                onPress={handleRegister}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Sign Up</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View className="mb-8 mt-4">
                    <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} className="mb-4">
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text }}>
                        {step === 1 ? 'Create Account' : step === 2 ? 'Verify Email' : 'Personal Details'}
                    </Text>
                    <Text style={{ color: theme.textSecondary, marginTop: 8, fontWeight: '500' }}>Step {step} of 3</Text>
                </View>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}

                {step === 1 && (
                    <View className="flex-row justify-center mt-8 mb-10">
                        <Text style={{ color: theme.textSecondary }}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text className="text-blue-600 font-bold">Login</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default RegisterScreen;
