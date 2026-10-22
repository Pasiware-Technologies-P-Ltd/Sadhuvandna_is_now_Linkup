import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    StyleSheet, 
    Platform,
    StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import api, { UPLOAD_BASE_URL, WEBSITE_URL } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;


const getResolvedPhotoUrl = (path: string | null | undefined) => {
    if (!path || typeof path !== 'string' || !path.trim()) return null;
    const clean = path.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('file://')) {
        return clean;
    }
    if (clean.startsWith('uploads/')) {
        return `${WEBSITE_URL}/${clean}`;
    }
    return `${PHOTO_URL}${clean}`;
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

const EditProfileScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [dob, setDob] = useState('');
    const [cast, setCast] = useState('');
    const [gender, setGender] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [education, setEducation] = useState('');
    const [occupation, setOccupation] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [stateName, setStateName] = useState('');
    const [hobbies, setHobbies] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [cover, setCover] = useState<string | null>(null);
    const [currentCover, setCurrentCover] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [deletePhoto, setDeletePhoto] = useState(false);
    const [deleteCover, setDeleteCover] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        loadUser();
    }, []);

    const populateUserData = (userData: any) => {
        if (!userData) return;
        if (userData.name || userData.full_name) setName(userData.name || userData.full_name || '');
        if (userData.city || userData.location) setLocation(userData.city || userData.location || '');
        
        const rawDob = userData.dob || userData.date_of_birth;
        if (rawDob && typeof rawDob === 'string' && !rawDob.startsWith('0000')) {
            const d = new Date(rawDob);
            if (!isNaN(d.getTime())) {
                setDob(d.toISOString().split('T')[0]);
            }
        }

        if (userData.cast || userData.caste) setCast(userData.cast || userData.caste || '');
        if (userData.gender || userData.sex) setGender(userData.gender || userData.sex || '');
        
        const userBio = userData.about || userData.bio || userData.about_me || userData.biodata || userData.description || '';
        if (userBio) setBio(userBio);

        const userMarital = userData.maritial_status || userData.marital_status || userData.maritalStatus || '';
        if (userMarital) setMaritalStatus(userMarital);

        if (userData.education || userData.qualification) setEducation(userData.education || userData.qualification || '');
        if (userData.occupation || userData.profession || userData.job) setOccupation(userData.occupation || userData.profession || userData.job || '');
        
        const userPhone = userData.mobile || userData.phone || userData.phone_number || '';
        if (userPhone) setPhone(userPhone);

        if (userData.email) setEmail(userData.email || '');
        
        const userAddress = userData.address || userData.current_address || userData.present_address || '';
        if (userAddress) setAddress(userAddress);

        const userState = userData.state || userData.state_name || userData.stateName || '';
        if (userState) setStateName(userState);

        const userHobbies = userData.hobbi || userData.hobbies || userData.hobby || userData.interests || '';
        if (userHobbies) setHobbies(userHobbies);

        if (userData.profile_photo || userData.photo || userData.avatar) {
            setCurrentPhoto(userData.profile_photo || userData.photo || userData.avatar || null);
        }
        if (userData.cover_photo || userData.cover) {
            setCurrentCover(userData.cover_photo || userData.cover || null);
        }
    };

    const loadUser = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const localUser = JSON.parse(u);
                setUser(localUser);
                populateUserData(localUser);

                try {
                    const res = await api.get(`/get_user_profile.php?user_id=${localUser.id}`);
                    if (res.data.status === 'success' && res.data.user) {
                        const freshUser = res.data.user;
                        setUser(freshUser);
                        populateUserData(freshUser);
                        const mergedUser = { ...localUser, ...freshUser };
                        await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
                    }
                } catch (error) {
                    console.error("Failed to load profile", error);
                }
            }
        } catch (err) {
            console.error("Failed to read user storage", err);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAvatar(result.assets[0].uri);
                setDeletePhoto(false);
            }
        } catch (e) {
            console.error('ImagePicker avatar error:', e);
        }
    };

    const pickCover = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCover(result.assets[0].uri);
                setDeleteCover(false);
            }
        } catch (e) {
            console.error('ImagePicker cover error:', e);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Required", "Full Name is required.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('user_id', user?.id);
            formData.append('name', name.trim());
            formData.append('city', location.trim());
            formData.append('dob', dob);
            formData.append('cast', cast.trim());
            formData.append('gender', gender.trim());
            formData.append('about', bio.trim());
            formData.append('bio', bio.trim());
            formData.append('maritial_status', maritalStatus.trim());
            formData.append('marital_status', maritalStatus.trim());
            formData.append('education', education.trim());
            formData.append('occupation', occupation.trim());
            formData.append('mobile', phone.trim());
            formData.append('email', email.trim());
            formData.append('address', address.trim());
            formData.append('state', stateName.trim());
            formData.append('state_name', stateName.trim());
            formData.append('hobbi', hobbies.trim());
            formData.append('hobbies', hobbies.trim());

            if (avatar) {
                const filename = avatar.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('photo', { uri: avatar, name: filename, type } as any);
            }

            if (cover) {
                const filename = cover.split('/').pop() || 'cover.jpg';
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('cover', { uri: cover, name: filename, type } as any);
            }

            if (deletePhoto) {
                formData.append('remove_photo', '1');
            }

            if (deleteCover) {
                formData.append('remove_cover', '1');
            }

            const res = await api.post(`${UPLOAD_BASE_URL}update_profile.php`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.status === 'success') {
                const updatedUser = { 
                    ...user, 
                    ...(res.data.user || {}),
                    name: name.trim(),
                    city: location.trim(),
                    dob,
                    cast: cast.trim(),
                    gender: gender.trim(),
                    about: bio.trim(),
                    bio: bio.trim(),
                    maritial_status: maritalStatus.trim(),
                    marital_status: maritalStatus.trim(),
                    education: education.trim(),
                    occupation: occupation.trim(),
                    mobile: phone.trim(),
                    email: email.trim(),
                    address: address.trim(),
                    state: stateName.trim(),
                    hobbi: hobbies.trim(),
                    hobbies: hobbies.trim(),
                };
                if (res.data.profile_photo) updatedUser.profile_photo = res.data.profile_photo;
                if (res.data.cover_photo) updatedUser.cover_photo = res.data.cover_photo;

                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                Alert.alert('Success', 'Profile updated successfully!');
                navigation.goBack();
            } else {
                Alert.alert("Error", res.data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const displayImage = avatar
        ? avatar
        : (currentPhoto && !deletePhoto ? getResolvedPhotoUrl(currentPhoto) : null);

    const displayCover = cover
        ? cover
        : (currentCover && !deleteCover ? getResolvedPhotoUrl(currentCover) : null);

    const initialLetter = name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView style={styles.safeContainer} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* TOP HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color="#475569" />
                    <Text style={styles.cancelText}>{t('cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{t('editProfile') || 'Edit Profile'}</Text>

                <TouchableOpacity 
                    onPress={handleSave} 
                    disabled={loading}
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>{t('save') || 'Save'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── HERO MEDIA SECTION (COVER & AVATAR) ── */}
                    <View style={styles.mediaContainer}>
                        {/* Cover Image Banner */}
                        <View style={styles.coverWrapper}>
                            {displayCover ? (
                                <Image 
                                    source={{ uri: displayCover }} 
                                    style={styles.coverImage} 
                                    contentFit="cover" 
                                />
                            ) : (
                                <LinearGradient 
                                    colors={['#1E3A8A', '#2563EB', '#60A5FA']} 
                                    start={{ x: 0, y: 0 }} 
                                    end={{ x: 1, y: 1 }} 
                                    style={styles.coverGradient}
                                >
                                    <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.4)" />
                                </LinearGradient>
                            )}

                            {/* Cover Edit Pill */}
                            <TouchableOpacity 
                                style={styles.coverEditPill} 
                                onPress={pickCover} 
                                activeOpacity={0.85}
                            >
                                <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                                <Text style={styles.coverEditText}>Edit Cover</Text>
                            </TouchableOpacity>

                            {/* Cover Delete Button */}
                            {displayCover && (
                                <TouchableOpacity 
                                    style={styles.coverDeleteBtn}
                                    onPress={() => {
                                        setCover(null);
                                        setDeleteCover(true);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Avatar (Centered with Overlap) */}
                        <View style={styles.avatarWrapper}>
                            <TouchableOpacity 
                                style={styles.avatarTouchable} 
                                onPress={pickImage} 
                                activeOpacity={0.9}
                            >
                                <View style={styles.avatarBorderRing}>
                                    {displayImage ? (
                                        <Image 
                                            source={{ uri: displayImage }} 
                                            style={styles.avatarImage} 
                                            contentFit="cover" 
                                        />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarInitial}>{initialLetter}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Camera Badge */}
                                <View style={styles.avatarCameraBadge}>
                                    <Ionicons name="camera" size={15} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>

                            {/* Delete Avatar Badge */}
                            {displayImage && (
                                <TouchableOpacity 
                                    style={styles.avatarDeleteBadge}
                                    onPress={() => {
                                        setAvatar(null);
                                        setDeletePhoto(true);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="close" size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* User Tag Below Avatar */}
                        <View style={styles.avatarTextWrap}>
                            <Text style={styles.avatarNameText}>{name || user?.name || 'User Profile'}</Text>
                            <Text style={styles.avatarHintText}>Tap photo or banner to change</Text>
                        </View>
                    </View>

                    {/* ── CARD 1: PERSONAL INFORMATION ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBox}>
                                <Ionicons name="person" size={16} color="#1877F2" />
                            </View>
                            <Text style={styles.cardTitle}>Personal Information</Text>
                        </View>

                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('fullName') || 'Full Name'} *</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* Date of Birth */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('dateOfBirthFull') || 'Date of Birth'}</Text>
                            <TouchableOpacity 
                                style={styles.inputWrap} 
                                onPress={() => setShowDatePicker(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <Text style={[styles.textInput, { paddingTop: 14 }, !dob && { color: '#94A3B8' }]}>
                                    {dob || t('selectDate') || 'Select Date of Birth'}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dob ? new Date(dob) : new Date(2000, 0, 1)}
                                    mode="date"
                                    display="default"
                                    maximumDate={new Date()}
                                    onChange={(event: any, selectedDate?: Date) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) {
                                            setDob(selectedDate.toISOString().split('T')[0]);
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* Gender */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('gender') || 'Gender'}</Text>
                            <View style={styles.chipsRow}>
                                {GENDER_OPTIONS.map((g) => {
                                    const isSelected = gender?.toLowerCase() === g.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.chip, isSelected && styles.chipActive]}
                                            onPress={() => setGender(g)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons 
                                                name={g === 'Male' ? 'male' : g === 'Female' ? 'female' : 'person'} 
                                                size={14} 
                                                color={isSelected ? '#1877F2' : '#64748B'} 
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{g}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Caste */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('cast') || 'Caste / Community'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="shield-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={cast}
                                    onChangeText={setCast}
                                    placeholder="Enter caste or community"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── CARD 2: SOCIAL & LIFESTYLE ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBox}>
                                <Ionicons name="heart" size={16} color="#1877F2" />
                            </View>
                            <Text style={styles.cardTitle}>Social & Lifestyle</Text>
                        </View>

                        {/* Marital Status */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('maritalStatus') || 'Marital Status'}</Text>
                            <View style={styles.chipsRow}>
                                {MARITAL_OPTIONS.map((m) => {
                                    const isSelected = maritalStatus?.toLowerCase() === m.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.chip, isSelected && styles.chipActive]}
                                            onPress={() => setMaritalStatus(m)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{m}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Hobbies / Interests */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('hobbiesInterests') || 'Hobbies & Interests'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="musical-notes-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={hobbies}
                                    onChangeText={setHobbies}
                                    placeholder="e.g. Cricket, Reading, Photography"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── CARD 3: CAREER & EDUCATION ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBox}>
                                <Ionicons name="briefcase" size={16} color="#1877F2" />
                            </View>
                            <Text style={styles.cardTitle}>Education & Career</Text>
                        </View>

                        {/* Education */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('education') || 'Education'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="school-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={education}
                                    onChangeText={setEducation}
                                    placeholder={t('highestQualification') || 'Highest Qualification (e.g. B.Tech, M.A)'}
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* Occupation */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('occupation') || 'Profession / Occupation'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="business-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={occupation}
                                    onChangeText={setOccupation}
                                    placeholder={t('professionJob') || 'e.g. Software Engineer, Business, Journalist'}
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── CARD 4: LOCATION & CONTACT ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBox}>
                                <Ionicons name="location" size={16} color="#1877F2" />
                            </View>
                            <Text style={styles.cardTitle}>Contact & Location</Text>
                        </View>

                        {/* City / District */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('city') || 'City / District'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="navigate-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="Enter your city or district"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* State */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('state') || 'State'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="map-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={stateName}
                                    onChangeText={setStateName}
                                    placeholder="Enter state"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* Address */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('addressPresent') || 'Address (Present)'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="home-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder={t('currentAddress') || 'Enter full present address'}
                                    placeholderTextColor="#94A3B8"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* Phone Number (Verified / Readonly) */}
                        <View style={styles.fieldGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={styles.fieldLabel}>{t('phoneNumberRegistered') || 'Phone Number'}</Text>
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                                    <Text style={styles.verifiedText}>Registered</Text>
                                </View>
                            </View>
                            <View style={[styles.inputWrap, styles.inputDisabled]}>
                                <Ionicons name="call-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    value={phone}
                                    editable={false}
                                    style={[styles.textInput, { color: '#64748B' }]}
                                />
                                <Ionicons name="lock-closed" size={16} color="#94A3B8" style={{ marginRight: 14 }} />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{t('emailId') || 'Email Address'}</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter email address"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.textInput}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── CARD 5: ABOUT / BIODATA ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBox}>
                                <Ionicons name="document-text" size={16} color="#1877F2" />
                            </View>
                            <Text style={styles.cardTitle}>{t('aboutMeBiodata') || 'About Me / Biodata'}</Text>
                        </View>

                        <View style={styles.fieldGroup}>
                            <View style={styles.textareaWrap}>
                                <TextInput
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder={t('yourBio') || 'Write a short description about yourself...'}
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                    style={styles.textareaInput}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCount}>{bio.length}/500</Text>
                            </View>
                        </View>
                    </View>

                    {/* BOTTOM SAVE BUTTON */}
                    <View style={styles.bottomSaveSection}>
                        <TouchableOpacity 
                            onPress={handleSave} 
                            disabled={loading}
                            style={[styles.bigSaveBtn, loading && styles.saveBtnDisabled]}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.bigSaveBtnText}>{t('save') || 'Save Changes'}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.card,
        borderBottomWidth: 1,
        borderColor: theme.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        zIndex: 10,
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    cancelText: {
        fontSize: 15,
        color: theme.subtext,
        fontWeight: '600',
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
    },
    saveBtn: {
        backgroundColor: '#1877F2',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    /* MEDIA CONTAINER */
    mediaContainer: {
        marginBottom: 16,
        backgroundColor: theme.card,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderColor: theme.border,
    },
    coverWrapper: {
        width: '100%',
        height: 155,
        position: 'relative',
        backgroundColor: isDarkMode ? '#1E293B' : '#CBD5E1',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverEditPill: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    coverEditText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    coverDeleteBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },

    /* AVATAR */
    avatarWrapper: {
        alignItems: 'center',
        marginTop: -52,
        position: 'relative',
        alignSelf: 'center',
    },
    avatarTouchable: {
        position: 'relative',
    },
    avatarBorderRing: {
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 4,
        borderColor: theme.card,
        backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 38,
        fontWeight: 'bold',
        color: '#1877F2',
    },
    avatarCameraBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1877F2',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    avatarDeleteBadge: {
        position: 'absolute',
        top: 2,
        right: -4,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    avatarTextWrap: {
        alignItems: 'center',
        marginTop: 8,
    },
    avatarNameText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
    },
    avatarHintText: {
        fontSize: 12,
        color: theme.subtext,
        marginTop: 2,
    },

    /* CARDS */
    card: {
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: theme.border,
    },
    cardIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: isDarkMode ? '#1E3A8A25' : '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.text,
    },

    /* FIELD GROUPS */
    fieldGroup: {
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.subtext,
        marginBottom: 6,
        marginLeft: 2,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        minHeight: 48,
    },
    inputDisabled: {
        backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
        borderColor: theme.border,
    },
    inputIcon: {
        marginLeft: 14,
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: theme.text,
        paddingVertical: 12,
        paddingRight: 14,
    },

    /* CHIPS */
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    chipActive: {
        backgroundColor: isDarkMode ? '#1E3A8A' : '#EFF6FF',
        borderColor: '#1877F2',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.subtext,
    },
    chipTextActive: {
        color: '#1877F2',
        fontWeight: '700',
    },

    /* VERIFIED BADGE */
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#064E3B' : '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#065F46' : '#DCFCE7',
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#16A34A',
        marginLeft: 4,
    },

    /* TEXTAREA */
    textareaWrap: {
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        position: 'relative',
    },
    textareaInput: {
        fontSize: 15,
        color: theme.text,
        minHeight: 90,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: theme.subtext,
        textAlign: 'right',
        marginTop: 4,
    },

    /* BOTTOM SAVE BUTTON */
    bottomSaveSection: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    bigSaveBtn: {
        backgroundColor: '#1877F2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    bigSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default EditProfileScreen;
