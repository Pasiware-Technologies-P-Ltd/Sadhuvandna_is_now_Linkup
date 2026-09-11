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

    const loadUser = async () => {
        const u = await AsyncStorage.getItem('user');
        if (u) {
            const localUser = JSON.parse(u);
            setUser(localUser);
            // Fetch fresh data
            try {
                const res = await api.get(`/get_user_profile.php?user_id=${localUser.id}`);
                if (res.data.status === 'success') {
                    const freshUser = res.data.user;
                    setUser(freshUser);
                    setName(freshUser.name || '');
                    setLocation(freshUser.city || '');
                    
                    // Parse DOB gracefully since it could be garbage data initially
                    let parsedDob = '';
                    if (freshUser.dob) {
                        const d = new Date(freshUser.dob);
                        if (!isNaN(d.getTime())) {
                            parsedDob = d.toISOString().split('T')[0];
                        }
                    }
                    setDob(parsedDob);

                    setCast(freshUser.cast || '');
                    setGender(freshUser.gender || '');
                    setBio(freshUser.bio || freshUser.about_me || '');
                    setMaritalStatus(freshUser.marital_status || '');
                    setEducation(freshUser.education || '');
                    setOccupation(freshUser.occupation || '');
                    setPhone(freshUser.mobile || freshUser.phone || freshUser.phone_number || localUser.mobile || localUser.phone || localUser.phone_number || '');
                    setEmail(freshUser.email || '');
                    setAddress(freshUser.address || freshUser.current_address || '');
                    setStateName(freshUser.state || '');
                    setHobbies(freshUser.hobbies || freshUser.interests || '');
                    setCurrentPhoto(freshUser.profile_photo);
                    setCurrentCover(freshUser.cover_photo);
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            }
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
            formData.append('maritial_status', maritalStatus);
            formData.append('education', education);
            formData.append('occupation', occupation);
            formData.append('mobile', phone);
            formData.append('email', email);
            formData.append('address', address);
            formData.append('state', stateName);
            formData.append('hobbi', hobbies);

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
                const updatedUser = { ...user, ...res.data.user };
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
