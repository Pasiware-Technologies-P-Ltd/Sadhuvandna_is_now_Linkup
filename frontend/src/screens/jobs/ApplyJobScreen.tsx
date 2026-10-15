import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const ApplyJobScreen = ({ navigation, route }: any) => {
    const { isDarkMode, theme } = useTheme();
    const { jobId, jobTitle, isAnchorApplication } = route.params || {};

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [education, setEducation] = useState('');
    const [district, setDistrict] = useState('');
    const [stateName, setStateName] = useState('');

    const [photo, setPhoto] = useState<any>(null);
    const [aadhaar, setAadhaar] = useState<any>(null);
    const [resume, setResume] = useState<any>(null);

    const [loading, setLoading] = useState(false);

    const pickDocument = async (type: 'photo' | 'aadhaar' | 'resume') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: type === 'photo' ? 'image/*' : (type === 'resume' ? ['application/pdf', 'application/msword'] : '*/*'),
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                if (type === 'photo') setPhoto(file);
                else if (type === 'aadhaar') setAadhaar(file);
                else if (type === 'resume') setResume(file);
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const handleSubmit = async () => {
        if (!name || !phone || !email || !education || !district || !stateName || !photo || !aadhaar || !resume) {
            Alert.alert("Missing Fields", "Please fill all fields and upload all documents.");
            return;
        }

        setLoading(true);
        try {
            const uStr = await AsyncStorage.getItem('user');
            const user = uStr ? JSON.parse(uStr) : null;
            const userId = user ? user.id : 0;

            const formData = new FormData();
            if (isAnchorApplication) {
                formData.append('user_id', String(userId));
            } else {
                formData.append('job_id', jobId);
            }
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('email', email);
            formData.append('education', education);
            formData.append('district', district);
            formData.append('state', stateName);

            const appendFile = (key: string, file: any) => {
                formData.append(key, {
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType || 'application/octet-stream'
                } as any);
            };

            appendFile('photo', photo);
            appendFile('aadhaar', aadhaar);
            appendFile('resume', resume);

            const endpoint = isAnchorApplication ? '/submit_anchor_application.php' : '/submit_job_application.php';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.status === 'success') {
                // Save the uploaded photo specifically for the Anchor ID Card locally
                if (isAnchorApplication && photo) {
                    try {
                        await AsyncStorage.setItem('anchor_local_photo', photo.uri);
                    } catch (e) {
                        console.error('Failed to save local anchor photo', e);
                    }
                }

                Alert.alert("Success", "Application Submitted Successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Failed to submit application.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 19, fontWeight: 'bold', marginLeft: 12, color: theme.text }}>
                    {isAnchorApplication ? 'Apply for News Anchor' : 'Apply for Job'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563EB', marginBottom: 20 }}>{jobTitle}</Text>

                <View style={{ gap: 16 }}>
                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>Full Name</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="Enter your name"
                            placeholderTextColor={theme.textMuted}
                            value={name} onChangeText={setName}
                        />
                    </View>

                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>Phone Number</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="Enter phone number"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            value={phone} onChangeText={setPhone}
                        />
                    </View>

                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>Email Address</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="Enter email"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="email-address"
                            value={email} onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </View>

                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>Education / Qualification</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="e.g. B.Tech, MBA"
                            placeholderTextColor={theme.textMuted}
                            value={education} onChangeText={setEducation}
                        />
                    </View>

                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>District</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="Enter district"
                            placeholderTextColor={theme.textMuted}
                            value={district} onChangeText={setDistrict}
                        />
                    </View>

                    <View>
                        <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>State</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', color: theme.text }}
                            placeholder="Enter state"
                            placeholderTextColor={theme.textMuted}
                            value={stateName} onChangeText={setStateName}
                        />
                    </View>

                    {/* File Uploads */}
                    {[
                        { label: 'Photo', state: photo, type: 'photo' },
                        { label: 'Aadhaar Card', state: aadhaar, type: 'aadhaar' },
                        { label: 'Resume (PDF/Doc)', state: resume, type: 'resume' }
                    ].map((field: any) => (
                        <View key={field.type}>
                            <Text style={{ fontWeight: '600', marginBottom: 6, color: theme.textSecondary }}>{field.label}</Text>
                            <TouchableOpacity
                                onPress={() => pickDocument(field.type)}
                                style={{
                                    borderWidth: 1, borderColor: field.state ? '#2563EB' : theme.border,
                                    borderStyle: 'dashed', borderRadius: 10, padding: 16,
                                    alignItems: 'center', backgroundColor: field.state ? (isDarkMode ? 'rgba(37,99,235,0.18)' : '#EFF6FF') : (isDarkMode ? '#1E293B' : '#F8FAFC')
                                }}
                            >
                                <Ionicons name={field.state ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={field.state ? "#2563EB" : theme.textMuted} />
                                <Text style={{ color: field.state ? '#3B82F6' : theme.textMuted, marginTop: 4, fontWeight: '500' }}>
                                    {field.state ? field.state.name : "Tap to Upload"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={{ backgroundColor: '#2563EB', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <ActivityIndicator color="white" /> : (
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Submit Application</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ApplyJobScreen;
