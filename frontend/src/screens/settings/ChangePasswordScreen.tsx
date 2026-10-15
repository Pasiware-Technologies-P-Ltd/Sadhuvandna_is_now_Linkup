import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const ChangePasswordScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const checkPassword = (str: string) => {
        // Just minimal validation for now
        return str.length >= 6;
    };

    const handleChange = async () => {
        if (!current || !newPass || !confirm) {
            Alert.alert("Error", "All fields are required.");
            return;
        }
        if (newPass !== confirm) {
            Alert.alert("Error", "New passwords do not match.");
            return;
        }
        if (!checkPassword(newPass)) {
            Alert.alert("Error", "Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const uStr = await AsyncStorage.getItem('user');
            if (!uStr) return;
            const user = JSON.parse(uStr);

            const fd = new FormData();
            fd.append('user_id', user.id);
            fd.append('current_password', current);
            fd.append('new_password', newPass);

            const res = await api.post('/change_password.php', fd);

            if (res.data.status === 'success') {
                Alert.alert("Success", "Password updated successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Failed to update password.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 16, color: theme.text }}>Change Password</Text>
            </View>

            <View style={{ padding: 20, gap: 20 }}>

                <View>
                    <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.subtext }}>Current Password</Text>
                    <TextInput
                        secureTextEntry
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card, color: theme.text }}
                        value={current} onChangeText={setCurrent}
                        placeholder="Enter current password"
                        placeholderTextColor={theme.subtext}
                    />
                </View>

                <View>
                    <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.subtext }}>New Password</Text>
                    <TextInput
                        secureTextEntry
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card, color: theme.text }}
                        value={newPass} onChangeText={setNewPass}
                        placeholder="Min 6 characters"
                        placeholderTextColor={theme.subtext}
                    />
                </View>

                <View>
                    <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.subtext }}>Confirm New Password</Text>
                    <TextInput
                        secureTextEntry
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card, color: theme.text }}
                        value={confirm} onChangeText={setConfirm}
                        placeholder="Re-enter new password"
                        placeholderTextColor={theme.subtext}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleChange}
                    disabled={loading}
                    style={{ backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? <ActivityIndicator color="white" /> : (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Update Password</Text>
                    )}
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
};

export default ChangePasswordScreen;
