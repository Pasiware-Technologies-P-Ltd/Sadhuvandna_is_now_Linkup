import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const categories = [
    "Restaurant", "Retail Store", "Salon & Beauty", "Healthcare", "Professional Services",
    "Home & Repair Services", "Real Estate", "Automotive", "Education", "Travel & Hospitality",
    "Technology", "Manufacturing", "Media & Creative", "Events & Entertainment", "Fitness & Sports",
    "Agriculture", "Logistics & Transportation", "Fashion & Lifestyle", "Religious & Community", "Other"
];

const CreateBusinessPageScreen = ({ navigation }: any) => {
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
                
                const payload = {
                    user_id: user.id,
                    businessname: businessName,
                    category: finalCategory,
                    phone_no: phoneNo,
                    email: email,
                    website_url: websiteUrl,
                    social_media_account: socialMedia,
                    country: country,
                    state: state,
                    district: district,
                    full_address: fullAddress,
                    pincode: pincode,
                    opening_hours: openingHours
                };

                const response = await api.post('/api_create_business_page.php', payload);
                if (response.data.status === 'success') {
                    Alert.alert("Congratulations! 🎉", "Your Business Page has been created successfully.", [
                        { text: "Awesome", onPress: () => navigation.goBack() }
                    ]);
                } else {
                    Alert.alert("Oops", response.data.message || "Failed to create business page");
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
                    <Text style={{ fontSize: 19, fontWeight: '900', color: '#111827', letterSpacing: 0.5 }}>Create Page</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Expand your business reach</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
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
                            <Ionicons name="rocket" size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={{ color: 'white', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Create Business Page</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </KeyboardAvoidingView>
    );
};

export default CreateBusinessPageScreen;
