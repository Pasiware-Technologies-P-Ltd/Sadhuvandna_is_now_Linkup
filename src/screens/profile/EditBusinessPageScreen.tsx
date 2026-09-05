import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, WEBSITE_URL, UPLOAD_BASE_URL } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const { width } = Dimensions.get('window');

const categories = [
    "Restaurant", "Retail Store", "Salon & Beauty", "Healthcare", "Professional Services",
    "Home & Repair Services", "Real Estate", "Automotive", "Education", "Travel & Hospitality",
    "Technology", "Manufacturing", "Media & Creative", "Events & Entertainment", "Fitness & Sports",
    "Agriculture", "Logistics & Transportation", "Fashion & Lifestyle", "Religious & Community", "Other"
];

const EditBusinessPageScreen = ({ navigation, route }: any) => {
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [businessName, setBusinessName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const [otherCategory, setOtherCategory] = useState('');
    
    const [phoneNo, setPhoneNo] = useState('');
    const [email, setEmail] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [socialMedia, setSocialMedia] = useState('');
    
    const [country, setCountry] = useState('India');
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [fullAddress, setFullAddress] = useState('');
    const [pincode, setPincode] = useState('');
    
    const [openingHours, setOpeningHours] = useState('');

    const [profilePhoto, setProfilePhoto] = useState<any>(null);
    const [coverPhoto, setCoverPhoto] = useState<any>(null);
    const [existingProfile, setExistingProfile] = useState<string | null>(null);
    const [existingCover, setExistingCover] = useState<string | null>(null);

    const pickImage = async (type: 'profile' | 'cover') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (type === 'profile') setProfilePhoto(result.assets[0]);
            else setCoverPhoto(result.assets[0]);
        }
    };

    useEffect(() => {
        const loadBusinessDetails = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                setBusinessName(user.name || '');
                setExistingProfile(user.profile_photo || null);
                setExistingCover(user.cover_photo || null);
                
                if (categories.includes(user.category)) {
                    setSelectedCategory(user.category);
                } else if (user.category) {
                    setSelectedCategory('Other');
                    setOtherCategory(user.category);
                }

                try {
                    const res = await api.get(`/get_user_profile.php?user_id=${user.id}`);
                    if (res.data.status === 'success' && res.data.business_details) {
                        const bd = res.data.business_details;
                        setPhoneNo(bd.phone_no || '');
                        setEmail(bd.email || '');
                        setWebsiteUrl(bd.website_url || '');
                        setSocialMedia(bd.social_media_account || '');
                        setCountry(bd.country || 'India');
                        setState(bd.state || '');
                        setDistrict(bd.district || '');
                        setFullAddress(bd.full_address || '');
                        setPincode(bd.pincode || '');
                        setOpeningHours(bd.opening_hours || '');
                    }
                } catch (e) {
                    console.log("Failed to fetch business details", e);
                }
            }
        };
        loadBusinessDetails();
    }, []);

    const handleSubmit = async () => {
        if (!businessName) {
            Alert.alert("Required", "Please enter your business name.");
            return;
        }

        const finalCategory = selectedCategory === "Other" ? otherCategory : selectedCategory;
        if (!finalCategory) {
            Alert.alert("Required", "Please provide a category for your business.");
            return;
        }

        setLoading(true);
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const user = JSON.parse(u);
                
                const formData = new FormData();
                formData.append('user_id', user.id);
                formData.append('businessname', businessName);
                formData.append('category', finalCategory);
                formData.append('phone_no', phoneNo);
                formData.append('email', email);
                formData.append('website_url', websiteUrl);
                formData.append('social_media_account', socialMedia);
                formData.append('country', country);
                formData.append('state', state);
                formData.append('district', district);
                formData.append('full_address', fullAddress);
                formData.append('pincode', pincode);
                formData.append('opening_hours', openingHours);

                if (profilePhoto) {
                    formData.append('profile_photo', {
                        uri: profilePhoto.uri,
                        type: 'image/jpeg',
                        name: 'profile.jpg'
                    } as any);
                }

                if (coverPhoto) {
                    formData.append('cover_photo', {
                        uri: coverPhoto.uri,
                        type: 'image/jpeg',
                        name: 'cover.jpg'
                    } as any);
                }

                const response = await axios.post(`${UPLOAD_BASE_URL}api_update_business_page.php`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (response.data.status === 'success') {
                    if (response.data.data) {
                        await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
                    }
                    Alert.alert("Success! 🎉", "Your Business Page has been updated successfully.", [
                        { text: "Awesome", onPress: () => navigation.goBack() }
                    ]);
                } else {
                    Alert.alert("Oops", response.data.message || "Failed to update business page");
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Something went wrong while connecting to the server.");
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (icon: any, placeholder: string, value: string, onChangeText: (t:string)=>void, options: any = {}) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Ionicons name={icon} size={20} color="#9ca3af" style={{ marginRight: 10 }} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1f2937', ...(options.multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}) }}
                {...options}
            />
        </View>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#ffffff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Custom Header with Shadow */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, zIndex: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 20 }}>
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                </TouchableOpacity>
                <View style={{ marginLeft: 16 }}>
                    <Text style={{ fontSize: 19, fontWeight: '900', color: '#111827', letterSpacing: 0.5 }}>Update Page</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Update your business details</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                {/* 0. Photos Section */}
                <View style={{ marginBottom: 30 }}>
                    {/* Cover Photo */}
                    <TouchableOpacity 
                        activeOpacity={0.8} 
                        onPress={() => pickImage('cover')}
                        style={{ height: 160, backgroundColor: '#f3f4f6', position: 'relative' }}
                    >
                        {coverPhoto ? (
                            <Image source={{ uri: coverPhoto.uri }} style={{ width: '100%', height: '100%' }} />
                        ) : existingCover ? (
                            <Image source={{ uri: `${PHOTO_URL}${existingCover}` }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="image-outline" size={32} color="#9ca3af" />
                                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Tap to add Cover Photo</Text>
                            </View>
                        )}
                        <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 }}>
                            <Ionicons name="camera" size={16} color="white" />
                        </View>
                    </TouchableOpacity>

                    {/* Profile Photo */}
                    <View style={{ alignItems: 'center', marginTop: -50 }}>
                        <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => pickImage('profile')}
                            style={{ 
                                width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', 
                                borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
                            }}
                        >
                            {profilePhoto ? (
                                <Image source={{ uri: profilePhoto.uri }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                            ) : existingProfile ? (
                                <Image source={{ uri: `${PHOTO_URL}${existingProfile}` }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                            ) : (
                                <Ionicons name="person" size={40} color="#d1d5db" />
                            )}
                            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#ea580c', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
                                <Ionicons name="camera" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 24 }}>
                    {/* 1. Basic Info Section */}
                    <View style={{ marginBottom: 30 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="briefcase" size={16} color="#ea580c" />
                        </View>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1f2937' }}>Basic Details</Text>
                    </View>

                    {renderInput("business", "Business Name (e.g. Sharma Sweets) *", businessName, setBusinessName)}

                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14 }}>
                            <Ionicons name="grid" size={20} color="#9ca3af" />
                            <Picker
                                selectedValue={selectedCategory}
                                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                                style={{ flex: 1, height: 50, color: '#1f2937' }}
                            >
                                {categories.map((cat, idx) => (
                                    <Picker.Item key={idx} label={cat} value={cat} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {selectedCategory === 'Other' && renderInput("pencil", "Specify Other Category *", otherCategory, setOtherCategory)}
                </View>

                {/* 2. Contact Section */}
                <View style={{ marginBottom: 30 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="call" size={16} color="#3b82f6" />
                        </View>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1f2937' }}>Contact Info</Text>
                    </View>

                    {renderInput("call-outline", "Phone Number", phoneNo, setPhoneNo, { keyboardType: "phone-pad" })}
                    {renderInput("mail-outline", "Email Address", email, setEmail, { keyboardType: "email-address", autoCapitalize: "none" })}
                    {renderInput("globe-outline", "Website URL", websiteUrl, setWebsiteUrl, { autoCapitalize: "none" })}
                    {renderInput("logo-instagram", "Social Media Link", socialMedia, setSocialMedia, { autoCapitalize: "none" })}
                </View>

                {/* 3. Address Section */}
                <View style={{ marginBottom: 30 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="location" size={16} color="#22c55e" />
                        </View>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1f2937' }}>Location & Address</Text>
                    </View>

                    {renderInput("map-outline", "Full Address (Street, Building, Area)", fullAddress, setFullAddress, { multiline: true })}
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 0.48 }}>
                            {renderInput("business-outline", "District", district, setDistrict)}
                        </View>
                        <View style={{ flex: 0.48 }}>
                            {renderInput("navigate-outline", "Pincode", pincode, setPincode, { keyboardType: "number-pad" })}
                        </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 0.48 }}>
                            {renderInput("map", "State", state, setState)}
                        </View>
                        <View style={{ flex: 0.48 }}>
                            {renderInput("earth", "Country", country, setCountry)}
                        </View>
                    </View>
                </View>

                {/* 4. Operations Section */}
                <View style={{ marginBottom: 40 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="time" size={16} color="#d97706" />
                        </View>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1f2937' }}>Operations</Text>
                    </View>

                    {renderInput("time-outline", "Opening Hours (e.g. 9 AM - 8 PM)", openingHours, setOpeningHours)}
                </View>
                </View>
            </ScrollView>

            {/* Floating Submit Button */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderColor: '#f3f4f6' }}>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={{ 
                        backgroundColor: '#ea580c', 
                        paddingVertical: 18, 
                        borderRadius: 16, 
                        alignItems: 'center',
                        shadowColor: '#ea580c',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                        opacity: loading ? 0.7 : 1,
                        flexDirection: 'row',
                        justifyContent: 'center'
                    }}
                >
                    {loading ? (
                        <>
                            <ActivityIndicator color="white" style={{ marginRight: 10 }} />
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Creating Page...</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="save" size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={{ color: 'white', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Update Business Page</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </KeyboardAvoidingView>
    );
};

export default EditBusinessPageScreen;
