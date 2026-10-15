import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, ScrollView, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, WEBSITE_URL, getFullPaymentUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useUpload } from '../../context/UploadContext';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const CreateMarriageProfileScreen = ({ navigation, route }: any) => {
    const { isDarkMode, theme } = useTheme();
    const { startUpload } = useUpload();
    const { profile: routeProfile } = route.params || {};
    const [formData, setFormData] = useState({
        full_name: '',
        gender: '',
        dob: '',
        status: '', // Marital Status
        height: '',
        weight: '',
        religion: '',
        phone: '',
        email: '',
        education: '',
        occupation: '',
        work_place: '',
        income: '',
        city: '',
        residence: '', // State/Residence
        caste: '',
        about: '',

        // Family
        father_name: '',
        father_occupation: '',
        mother_name: '',
        siblings: '',
        family_type: '',

        // Personal
        nature: '',
        food: '',
        habits: '',
        hobbies: '',

        // Partner Preference
        partner_age_from: '',
        partner_age_to: '',
        partner_education: '',
        partner_expectations: ''
    });

    const [photo, setPhoto] = useState<string | null>(null);
    const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isEdit, setIsEdit] = useState(false);

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerDay, setPickerDay] = useState(1);
    const [pickerMonth, setPickerMonth] = useState(1);
    const [pickerYear, setPickerYear] = useState(2000);
    const { t } = useLanguage();

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
    const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

    const openDatePicker = () => {
        const dob = formData.dob;
        if (dob) {
            const parts = dob.split('-');
            if (parts.length === 3) {
                setPickerYear(parseInt(parts[0]) || 2000);
                setPickerMonth(parseInt(parts[1]) || 1);
                setPickerDay(parseInt(parts[2]) || 1);
            }
        }
        setShowDatePicker(true);
    };

    const confirmDate = () => {
        const y = pickerYear;
        const m = String(pickerMonth).padStart(2, '0');
        const d = String(pickerDay).padStart(2, '0');
        handleChange('dob', `${y}-${m}-${d}`);
        setShowDatePicker(false);
    };

    const formatDisplayDate = (val: string) => {
        if (!val) return '';
        const parts = val.split('-');
        if (parts.length === 3 && parts[0].length === 4 && parseInt(parts[1]) > 0 && parseInt(parts[1]) <= 12) {
            return `${parts[2]} ${MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}`;
        }
        return ''; // Return empty string for invalid garbage dates
    };

    const populateFormFromProfile = (profile: any) => {
        if (!profile) return;
        setFormData({
            full_name: profile.full_name || '',
            gender: profile.gender || '',
            dob: profile.dob || '',
            status: profile.status || '',
            height: profile.height || '',
            weight: profile.weight || '',
            religion: profile.religion || '',
            phone: profile.phone || '',
            email: profile.email || '',
            education: profile.education || '',
            occupation: profile.occupation || '',
            work_place: profile.work_place || '',
            income: profile.income ? String(profile.income) : '',
            city: profile.city || '',
            residence: profile.residence || '',
            caste: profile.caste || '',
            about: profile.about || '',

            father_name: profile.father_name || '',
            father_occupation: profile.father_occupation || '',
            mother_name: profile.mother_name || '',
            siblings: profile.siblings || '',
            family_type: profile.family_type || '',

            nature: profile.nature || '',
            food: profile.food || '',
            habits: profile.habits || '',
            hobbies: profile.hobbies || '',

            partner_age_from: profile.partner_age_from ? String(profile.partner_age_from) : '',
            partner_age_to: profile.partner_age_to ? String(profile.partner_age_to) : '',
            partner_education: profile.partner_education || '',
            partner_expectations: profile.partner_expectations || ''
        });

        if (profile.photo && !profile.photo.includes('default')) {
            setExistingPhoto(profile.photo);
        }
        setIsEdit(true);
    };

    useEffect(() => {
        const init = async () => {
            try {
                setLoadingProfile(true);
                const u = await AsyncStorage.getItem('user');
                let currentUid: string | null = null;
                let userData: any = null;
                if (u) {
                    userData = JSON.parse(u);
                    currentUid = String(userData.id);
                    setUserId(currentUid);
                }

                // If routeProfile has full details already
                if (routeProfile && (routeProfile.full_name || routeProfile.father_name || routeProfile.education)) {
                    populateFormFromProfile(routeProfile);
                    setLoadingProfile(false);
                    return;
                }

                // Fetch from server using get_my_profile.php
                const uidToFetch = currentUid || (routeProfile?.user_id ? String(routeProfile.user_id) : null);
                if (uidToFetch) {
                    try {
                        const res = await api.get(`/get_my_profile.php?user_id=${uidToFetch}`);
                        if (res.data.status === 'success' && res.data.data) {
                            populateFormFromProfile(res.data.data);
                            setLoadingProfile(false);
                            return;
                        }
                    } catch (err) {
                        console.log("Error fetching my profile", err);
                    }
                }

                // If creating fresh, pre-fill from user account
                if (userData) {
                    setFormData(prev => ({
                        ...prev,
                        full_name: userData.name || '',
                        city: userData.city || '',
                        phone: userData.mobile || '',
                        email: userData.email || '',
                        dob: userData.dob || '',
                        gender: userData.gender || '',
                        status: userData.maritial_status || '',
                        caste: userData.cast || ''
                    }));
                }
            } catch (e) {
                console.error("Init Error", e);
            } finally {
                setLoadingProfile(false);
            }
        };

        init();
    }, [routeProfile]);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!formData.full_name || !formData.dob || !formData.city || !formData.gender || !formData.status || (!photo && !isEdit)) {
            Alert.alert("Error", "Please fill essential fields (Name, DOB, City, Gender, Status) and ensure a photo is added.");
            return;
        }

        setLoading(true);
        try {
            // Check payment if it's a new profile creation (not editing)
            if (!isEdit) {
                const payCheckRes = await api.get(`/check_matrimony_payment.php?user_id=${userId}`);
                if (payCheckRes.data.status === 'success') {
                    if (!payCheckRes.data.paid) {
                        setLoading(false);
                        const paymentUrl = getFullPaymentUrl(payCheckRes.data.payment_url);
                        Alert.alert(
                            "Payment Required",
                            `Creating a matrimony profile requires a one-time fee of ₹${payCheckRes.data.fee}. Would you like to pay now?`,
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Pay Now", onPress: () => Linking.openURL(paymentUrl) }
                            ]
                        );
                        return;
                    }
                } else {
                    Alert.alert("Error", payCheckRes.data.message || "Failed to check payment status.");
                    setLoading(false);
                    return;
                }
            }

            const data = new FormData();
            data.append('user_id', userId || '');
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key as keyof typeof formData]);
            });

            if (photo) {
                const filename = photo.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                data.append('photo', { uri: photo, name: filename, type } as any);
            }

            const res = startUpload('create_marriage_profile.php', data as any, photo || null);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to start upload");
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ title, icon }: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8 }}>
            <Ionicons name={icon} size={20} color="#3B82F6" />
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: theme.text }}>{title}</Text>
        </View>
    );

    return (
        <>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card, zIndex: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>{isEdit ? t('editMatrimonyProfile') : t('createMatrimonyProfile')}</Text>
            </View>

            {loadingProfile ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 12, fontWeight: '500' }}>Loading profile details...</Text>
                </View>
            ) : (
                <KeyboardAwareScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} 
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid={true}
                    extraScrollHeight={100}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Photo Upload */}
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
                            {photo ? (
                                <Image source={{ uri: photo }} style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 4, borderColor: '#3B82F6' }} />
                            ) : existingPhoto ? (
                                <Image source={{ uri: `${PHOTO_URL}${existingPhoto}` }} style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 4, borderColor: '#3B82F6' }} />
                            ) : (
                                <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#3B82F6' }}>
                                    <Ionicons name="camera" size={36} color="#3B82F6" />
                                    <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 4, fontWeight: '600' }}>{t('addPhoto')}</Text>
                                </View>
                            )}
                            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2563EB', borderRadius: 20, padding: 8, borderWidth: 2, borderColor: theme.card }}>
                                <Ionicons name="pencil" size={16} color="white" />
                            </View>
                        </TouchableOpacity>
                        {isEdit && !photo && existingPhoto && <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>Tap to change photo</Text>}
                    </View>

                    {/* Basic Details */}
                    <SectionHeader title={t('basicDetails')} icon="person-outline" />
                    <View style={{ gap: 14 }}>
                        <Input label={t('fullName')} value={formData.full_name} onChangeText={(t) => handleChange('full_name', t)} placeholder="e.g. Rahul Sharma" required />

                        <View>
                            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>{t('genderLabel')} <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {['Male', 'Female', 'Other'].map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => handleChange('gender', g)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: formData.gender === g ? '#2563EB' : theme.border,
                                            backgroundColor: formData.gender === g ? '#2563EB' : (isDarkMode ? '#1E293B' : '#F8FAFC')
                                        }}
                                    >
                                        <Text style={{ color: formData.gender === g ? 'white' : theme.textSecondary, fontWeight: formData.gender === g ? 'bold' : '500' }}>
                                            {g === 'Male' ? t('male') : g === 'Female' ? t('female') : t('other')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>{t('dateOfBirth')} <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <TouchableOpacity
                                onPress={openDatePicker}
                                style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: formatDisplayDate(formData.dob) ? theme.text : theme.textMuted, fontSize: 15 }}>
                                    {formatDisplayDate(formData.dob) || t('selectDateOfBirth')}
                                </Text>
                                <Text style={{ fontSize: 18 }}>📅</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Input label={t('heightLabel')} value={formData.height} onChangeText={(t) => handleChange('height', t)} placeholder="e.g. 5 ft 10 in" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input label={t('weightLabel')} value={formData.weight} onChangeText={(t) => handleChange('weight', t)} placeholder="e.g. 65 kg" />
                            </View>
                        </View>

                        <View>
                            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>{t('maritalStatus')} <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {['Unmarried', 'Married', 'Divorced', 'Widowed', 'Separated'].map(s => {
                                    const tlMap: any = {
                                        Unmarried: t('unmarried'),
                                        Married: t('married'),
                                        Divorced: t('divorced'),
                                        Widowed: t('widowed'),
                                        Separated: t('separated')
                                    };
                                    const isSelected = formData.status === s;
                                    return (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => handleChange('status', s)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#2563EB' : theme.border,
                                                backgroundColor: isSelected ? '#2563EB' : (isDarkMode ? '#1E293B' : '#F8FAFC')
                                            }}
                                        >
                                            <Text style={{ color: isSelected ? 'white' : theme.textSecondary, fontSize: 12, fontWeight: isSelected ? 'bold' : '500' }}>{tlMap[s]}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <Input label={t('religionLabel')} value={formData.religion} onChangeText={(t) => handleChange('religion', t)} placeholder="e.g. Jain, Hindu, etc." />
                        <Input label={t('casteCommunity')} value={formData.caste} onChangeText={(t) => handleChange('caste', t)} placeholder="e.g. Digambar, Shwetambar, etc." />
                    </View>

                    {/* Contact & Location */}
                    <SectionHeader title={t('contactLocation')} icon="location-outline" />
                    <View className="space-y-4">
                        <Input label={t('phoneNumber')} value={formData.phone} onChangeText={(t) => handleChange('phone', t)} keyboardType="phone-pad" placeholder="Enter 10-digit mobile number" required />
                        <Input label={t('emailId')} value={formData.email} onChangeText={(t) => handleChange('email', t)} keyboardType="email-address" placeholder="e.g. rahul@example.com" />
                        <Input label={t('city')} value={formData.city} onChangeText={(t) => handleChange('city', t)} placeholder="e.g. Mumbai, Surat, Delhi" required />
                        <Input label={t('residenceAddress')} value={formData.residence} onChangeText={(t) => handleChange('residence', t)} placeholder="Enter complete residential address / state" multiline />
                    </View>

                    {/* Career */}
                    <SectionHeader title={t('educationCareer')} icon="briefcase-outline" />
                    <View className="space-y-4">
                        <Input label={t('educationLabel')} value={formData.education} onChangeText={(t) => handleChange('education', t)} placeholder="e.g. B.Tech, MBA, MBBS, CA" />
                        <Input label={t('occupationLabel')} value={formData.occupation} onChangeText={(t) => handleChange('occupation', t)} placeholder="e.g. Software Engineer, Businessman" />
                        <Input label={t('workPlace')} value={formData.work_place} onChangeText={(t) => handleChange('work_place', t)} placeholder="e.g. TCS Mumbai, Self Employed" />
                        <Input label={t('annualIncome')} value={formData.income} onChangeText={(t) => handleChange('income', t)} keyboardType="numeric" placeholder="e.g. 12,00,000 (Annual in ₹)" />
                    </View>

                    {/* Family */}
                    <SectionHeader title={t('familyDetails')} icon="people-outline" />
                    <View className="space-y-4">
                        <Input label={t('fatherName')} value={formData.father_name} onChangeText={(t) => handleChange('father_name', t)} placeholder="Enter father's name" />
                        <Input label={t('fatherOccupation')} value={formData.father_occupation} onChangeText={(t) => handleChange('father_occupation', t)} placeholder="e.g. Businessman, Govt. Service" />
                        <Input label={t('motherName')} value={formData.mother_name} onChangeText={(t) => handleChange('mother_name', t)} placeholder="Enter mother's name" />
                        <Input label={t('siblingsCount')} value={formData.siblings} onChangeText={(t) => handleChange('siblings', t)} placeholder="e.g. 2 Brothers, 1 Sister" />
                        <Input label={t('familyType')} value={formData.family_type} onChangeText={(t) => handleChange('family_type', t)} placeholder="e.g. Nuclear Family / Joint Family" />
                    </View>

                    {/* Personal */}
                    <SectionHeader title={t('personalDetails')} icon="cafe-outline" />
                    <View className="space-y-4">
                        <Input label={t('naturePersonality')} value={formData.nature} onChangeText={(t) => handleChange('nature', t)} placeholder="e.g. Calm, Cheerful, Caring..." />
                        <Input label={t('foodHabit')} value={formData.food} onChangeText={(t) => handleChange('food', t)} placeholder="e.g. Pure Vegetarian / Jain Food" />
                        <Input label={t('habitsDrinkingSmoking')} value={formData.habits} onChangeText={(t) => handleChange('habits', t)} placeholder="e.g. Non-smoker, Non-drinker" />
                        <Input label={t('hobbiesLabel')} value={formData.hobbies} onChangeText={(t) => handleChange('hobbies', t)} placeholder="e.g. Reading, Traveling, Music..." />

                        <View>
                            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>{t('aboutMe')}</Text>
                            <TextInput
                                style={{
                                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    color: theme.text,
                                    height: 96,
                                    fontSize: 15
                                }}
                                value={formData.about}
                                onChangeText={(t) => handleChange('about', t)}
                                placeholder={t('tellUsAboutYourself') || "Tell us about yourself, background, personality..."}
                                placeholderTextColor={theme.textMuted}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Partner Preferences */}
                    <SectionHeader title={t('partnerPreference')} icon="heart-outline" />
                    <View style={{ gap: 14 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Input label={t('ageFrom')} value={formData.partner_age_from} onChangeText={(t) => handleChange('partner_age_from', t)} keyboardType="numeric" placeholder="e.g. 24" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input label={t('ageTo')} value={formData.partner_age_to} onChangeText={(t) => handleChange('partner_age_to', t)} keyboardType="numeric" placeholder="e.g. 28" />
                            </View>
                        </View>
                        <Input label={t('expectedEducation')} value={formData.partner_education} onChangeText={(t) => handleChange('partner_education', t)} placeholder="e.g. Graduate, Post Graduate, MBA" />
                        <View>
                            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>{t('expectations')}</Text>
                            <TextInput
                                style={{
                                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    color: theme.text,
                                    height: 96,
                                    fontSize: 15
                                }}
                                value={formData.partner_expectations}
                                onChangeText={(t) => handleChange('partner_expectations', t)}
                                placeholder={t('whatAreYouLookingFor') || "What qualities and values are you looking for..."}
                                placeholderTextColor={theme.textMuted}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={{ backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginVertical: 32, elevation: 3 }}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>{isEdit ? t('updateProfile') : t('saveMarriageProfile')}</Text>}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </KeyboardAwareScrollView>
            )}
        </SafeAreaView>

            {/* DOB Date Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34, borderWidth: 1, borderColor: theme.border }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={{ fontSize: 16, color: theme.textMuted }}>{t('cancelLabel')}</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>{t('selectDateOfBirth')}</Text>
                                <TouchableOpacity onPress={confirmDate}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#2563EB' }}>{t('doneLabel')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', height: 200, paddingHorizontal: 8 }}>
                                {/* Day */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>{t('dayLabel')}</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {DAYS.map(d => (
                                            <TouchableOpacity key={d} onPress={() => setPickerDay(d)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerDay === d ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerDay === d ? '700' : '400', color: pickerDay === d ? '#3B82F6' : theme.text }}>{String(d).padStart(2,'0')}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                {/* Month */}
                                <View style={{ flex: 1.4 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>{t('monthLabel')}</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {MONTHS.map((m, i) => (
                                            <TouchableOpacity key={m} onPress={() => setPickerMonth(i + 1)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerMonth === i+1 ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerMonth === i+1 ? '700' : '400', color: pickerMonth === i+1 ? '#3B82F6' : theme.text }}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                {/* Year */}
                                <View style={{ flex: 1.4 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>{t('yearLabel')}</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {YEARS.map(y => (
                                            <TouchableOpacity key={y} onPress={() => setPickerYear(y)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerYear === y ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerYear === y ? '700' : '400', color: pickerYear === y ? '#3B82F6' : theme.text }}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

interface InputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: any;
    multiline?: boolean;
    required?: boolean;
}

const Input = ({ label, value, onChangeText, placeholder, keyboardType, multiline, required }: InputProps) => {
    const { isDarkMode, theme } = useTheme();
    const cleanLabel = (label || '').replace('*', '').trim();
    const defaultPlaceholder = placeholder || (cleanLabel ? `Enter ${cleanLabel.toLowerCase()}` : '');
    return (
        <View>
            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 4, marginLeft: 4, fontWeight: '600' }}>
                {label} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
            </Text>
            <TextInput
                style={{
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 12,
                    color: theme.text,
                    fontSize: 15,
                    height: multiline ? 80 : undefined
                }}
                value={value}
                onChangeText={onChangeText}
                placeholder={defaultPlaceholder}
                placeholderTextColor={theme.textMuted}
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    );
};

export default CreateMarriageProfileScreen;
