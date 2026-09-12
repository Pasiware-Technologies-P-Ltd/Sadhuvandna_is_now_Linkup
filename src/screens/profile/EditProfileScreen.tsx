import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { UPLOAD_BASE_URL, WEBSITE_URL } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../../context/LanguageContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const EditProfileScreen = ({ navigation }: any) => {
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
        
        // Handle bio aliases: about, bio, about_me, biodata, description
        const userBio = userData.about || userData.bio || userData.about_me || userData.biodata || userData.description || '';
        if (userBio) setBio(userBio);

        // Handle marital status aliases: maritial_status (DB column typo), marital_status, maritalStatus
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

        // Handle hobbies aliases: hobbi (DB column name), hobbies, hobby, interests
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
                // Prefill immediately from local stored user cache
                populateUserData(localUser);

                // Fetch fresh data from backend
                try {
                    const res = await api.get(`/get_user_profile.php?user_id=${localUser.id}`);
                    if (res.data.status === 'success' && res.data.user) {
                        const freshUser = res.data.user;
                        setUser(freshUser);
                        populateUserData(freshUser);
                        // Save merged latest user into local storage
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
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
            setDeletePhoto(false);
        }
    };

    const pickCover = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true, // Cover usually wider, maybe [16, 9]?
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setCover(result.assets[0].uri);
            setDeleteCover(false);
        }
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert("Error", "Name is required");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('user_id', user?.id);
            formData.append('name', name);
            formData.append('city', location);
            formData.append('dob', dob);
            formData.append('cast', cast);
            formData.append('gender', gender);
            formData.append('about', bio);
            formData.append('bio', bio);
            formData.append('maritial_status', maritalStatus);
            formData.append('marital_status', maritalStatus);
            formData.append('education', education);
            formData.append('occupation', occupation);
            formData.append('mobile', phone);
            formData.append('email', email);
            formData.append('address', address);
            formData.append('state', stateName);
            formData.append('state_name', stateName);
            formData.append('hobbi', hobbies);
            formData.append('hobbies', hobbies);

            if (avatar) {
                const filename = avatar.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('photo', { uri: avatar, name: filename, type } as any);
            }

            if (cover) {
                const filename = cover.split('/').pop();
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

            // Use UPLOAD_BASE_URL to directly upload to the production server
            const res = await api.post(`${UPLOAD_BASE_URL}update_profile.php`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.status === 'success') {
                const updatedUser = { 
                    ...user, 
                    ...(res.data.user || {}),
                    name,
                    city: location,
                    dob,
                    cast,
                    gender,
                    about: bio,
                    bio,
                    maritial_status: maritalStatus,
                    marital_status: maritalStatus,
                    education,
                    occupation,
                    mobile: phone,
                    email,
                    address,
                    state: stateName,
                    hobbi: hobbies,
                    hobbies,
                };
                if (res.data.profile_photo) updatedUser.profile_photo = res.data.profile_photo;
                if (res.data.cover_photo) updatedUser.cover_photo = res.data.cover_photo;

                await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); // Update local session
                Alert.alert('Success', 'Profile updated successfully');
                navigation.goBack();
            } else {
                Alert.alert("Error", res.data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    const displayImage = avatar
        ? avatar
        : (currentPhoto && !deletePhoto ? (currentPhoto.startsWith('http') ? currentPhoto : `${PHOTO_URL}${currentPhoto}`) : null);

    const displayCover = cover
        ? cover
        : (currentCover && !deleteCover ? (currentCover.startsWith('http') ? currentCover : `${PHOTO_URL}${currentCover}`) : null);

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text className="text-lg text-gray-500">{t('cancel')}</Text>
                </TouchableOpacity>
                <Text className="font-bold text-lg text-gray-900">{t('editProfile')}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#ea580c" /> : <Text className="text-lg font-bold text-orange-600">{t('save')}</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 30 }}>
                    {/* Cover Photo */}
                    <View className="relative">
                        <TouchableOpacity onPress={pickCover} className="h-40 bg-gray-200 w-full relative">
                            {displayCover && (
                                <Image source={{ uri: displayCover }} className="w-full h-full" resizeMode="cover" />
                            )}
                            <View className="absolute inset-0 items-center justify-center bg-black/20">
                                <View className="bg-black/50 p-2 rounded-full">
                                    <Ionicons name="camera" size={24} color="white" />
                                </View>
                            </View>
                        </TouchableOpacity>
                        {displayCover && (
                            <TouchableOpacity 
                                className="absolute top-2 right-2 bg-white/80 rounded-full shadow-md p-1 border border-gray-100"
                                onPress={() => {
                                    setCover(null);
                                    setDeleteCover(true);
                                }}
                            >
                                <Ionicons name="close-circle" size={24} color="#ea580c" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Profile Photo - Overlapping */}
                    <View className="items-center -mt-12 mb-4">
                        <View className="relative">
                            <TouchableOpacity onPress={pickImage}>
                                {displayImage ? (
                                    <Image source={{ uri: displayImage }} className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white" />
                                ) : (
                                    <View className="w-24 h-24 rounded-full bg-orange-200 items-center justify-center border-4 border-white">
                                        <Text className="text-4xl text-orange-700">{name?.[0]?.toUpperCase() || 'U'}</Text>
                                    </View>
                                )}
                                <View className="absolute bottom-0 right-0 bg-orange-600 p-1.5 rounded-full border-2 border-white">
                                    <Ionicons name="camera" size={16} color="white" />
                                </View>
                            </TouchableOpacity>
                            {displayImage && (
                                <TouchableOpacity 
                                    className="absolute -top-1 -right-1 bg-white rounded-full shadow-md p-1 border border-gray-100"
                                    onPress={() => {
                                        setAvatar(null);
                                        setDeletePhoto(true);
                                    }}
                                >
                                    <Ionicons name="close-circle" size={24} color="#ea580c" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View className="px-5 space-y-6 mt-4">
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('fullName')}</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('city')}</Text>
                            <TextInput
                                value={location} // Using location state for city
                                onChangeText={setLocation}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('dateOfBirthFull')}</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <View pointerEvents="none">
                                    <TextInput
                                        value={dob}
                                        editable={false}
                                        placeholder={t('selectDate')}
                                        className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                                    />
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dob ? new Date(dob) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event: any, selectedDate?: Date) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) {
                                            setDob(selectedDate.toISOString().split('T')[0]);
                                        }
                                    }}
                                />
                            )}
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('cast')}</Text>
                            <TextInput
                                value={cast}
                                onChangeText={setCast}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('gender')}</Text>
                            <TextInput
                                value={gender}
                                onChangeText={setGender}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('maritalStatus')}</Text>
                            <TextInput
                                value={maritalStatus}
                                onChangeText={setMaritalStatus}
                                placeholder={t('selectMaritalStatus')}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('education')}</Text>
                            <TextInput
                                value={education}
                                onChangeText={setEducation}
                                placeholder={t('highestQualification')}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('occupation')}</Text>
                            <TextInput
                                value={occupation}
                                onChangeText={setOccupation}
                                placeholder={t('professionJob')}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('phoneNumberRegistered')}</Text>
                            <TextInput
                                value={phone}
                                editable={false}
                                className="bg-gray-200 p-4 rounded-xl text-gray-500 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('emailId')}</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('addressPresent')}</Text>
                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder={t('currentAddress')}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('state')}</Text>
                            <TextInput
                                value={stateName}
                                onChangeText={setStateName}
                                placeholder="State"
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('hobbiesInterests')}</Text>
                            <TextInput
                                value={hobbies}
                                onChangeText={setHobbies}
                                placeholder="Singing, Reading..."
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100"
                            />
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1 ml-1">{t('aboutMeBiodata')}</Text>
                            <TextInput
                                value={bio}
                                onChangeText={setBio}
                                placeholder={t('yourBio')}
                                multiline
                                numberOfLines={4}
                                className="bg-gray-50 p-4 rounded-xl text-gray-800 text-base border border-gray-100 min-h-[100px]"
                                style={{ textAlignVertical: 'top' }}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default EditProfileScreen;
