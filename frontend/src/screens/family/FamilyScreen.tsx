import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';

const FAMILY_PHOTO_URL = `${WEBSITE_URL}/uploads/family/`;

const FamilyScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [gender, setGender] = useState('Male');
    const [occupation, setOccupation] = useState('');
    const [dob, setDob] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('Unmarried');
    // New Fields
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [education, setEducation] = useState('');
    const [income, setIncome] = useState('');
    const [caste, setCaste] = useState('');
    const [kuldevi, setKuldevi] = useState('');

    const [photo, setPhoto] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerDay, setPickerDay] = useState(1);
    const [pickerMonth, setPickerMonth] = useState(1);
    const [pickerYear, setPickerYear] = useState(2000);

    const loadCachedFamily = async (uid: string) => {
        try {
            const cached = await AsyncStorage.getItem(`cached_family_${uid}`);
            if (cached) {
                setMembers(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        AsyncStorage.getItem('user').then(async (u) => {
            if (u) {
                const user = JSON.parse(u);
                setUserId(user.id);
                await loadCachedFamily(user.id);
                fetchMembers(user.id);
            }
        });
    }, []);

    const fetchMembers = async (uid: string) => {
        try {
            const res = await api.get(`/manage_family.php?action=fetch&user_id=${uid}`);
            if (res.data.status === 'success') {
                setMembers(res.data.data);
                AsyncStorage.setItem(`cached_family_${uid}`, JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleEdit = (item: any) => {
        setEditId(item.id);
        setName(item.name);
        setRelation(item.relation);
        setGender(item.gender || 'Male');
        setOccupation(item.occupation || '');
        setDob(item.dob || '');
        setMaritalStatus(item.marital_status || 'Unmarried');
        setHeight(item.height || '');
        setWeight(item.weight || '');
        setEducation(item.education || '');
        setIncome(item.income || '');
        setCaste(item.caste || '');
        setKuldevi(item.kuldevi || '');
        setPhoto(item.photo ? `${FAMILY_PHOTO_URL}${item.photo}` : null);
        setModalVisible(true);
    };

    const handleAddOrUpdateMember = async () => {
        if (!name || !relation || !userId) {
            Alert.alert("Error", "Name and Relation are required");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('action', editId ? 'update' : 'add');
            if (editId) formData.append('id', editId);
            formData.append('user_id', userId);
            formData.append('name', name);
            formData.append('relation', relation);
            formData.append('gender', gender);
            formData.append('occupation', occupation);
            formData.append('dob', dob);
            formData.append('marital_status', maritalStatus);
            formData.append('height', height);
            formData.append('weight', weight);
            formData.append('education', education);
            formData.append('income', income);
            formData.append('caste', caste);
            formData.append('kuldevi', kuldevi);

            if (photo && !photo.startsWith('http')) {
                const filename = photo.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('photo', { uri: photo, name: filename, type } as any);
            }

            const res = await api.post('/manage_family.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.status === 'success') {
                Alert.alert("Success", editId ? "Member Updated" : "Member Added");
                setModalVisible(false);
                resetForm();
                fetchMembers(userId);
            } else {
                Alert.alert("Error", res.data.message || "Failed to save member");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditId(null);
        setName('');
        setRelation('');
        setGender('Male');
        setOccupation('');
        setDob('');
        setMaritalStatus('Unmarried');
        setHeight('');
        setWeight('');
        setEducation('');
        setIncome('');
        setCaste('');
        setKuldevi('');
        setPhoto(null);
    };

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
    const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

    const openDatePicker = () => {
        // Pre-fill picker from current dob value if set
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
        setDob(`${y}-${m}-${d}`);
        setShowDatePicker(false);
    };

    const formatDisplayDate = (val: string) => {
        if (!val) return '';
        const parts = val.split('-');
        if (parts.length === 3) {
            return `${parts[2]} ${MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}`;
        }
        return val;
    };

    const handleDelete = async (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this member?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'delete');
                        formData.append('id', id);

                        const res = await api.post('/manage_family.php', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });

                        if (res.data.status === 'success') {
                            fetchMembers(userId!);
                        }
                    } catch (error) { console.error(error); }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View 
            className="mb-4 p-4 rounded-2xl shadow-sm flex-row items-center gap-4 mx-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}
        >
            <Image
                source={{ uri: item.photo ? `${FAMILY_PHOTO_URL}${item.photo}` : 'https://via.placeholder.com/100' }}
                className="w-16 h-16 rounded-full"
                style={{ backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 1, borderColor: theme.border }}
            />
            <View className="flex-1">
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
                <View className="flex-row flex-wrap gap-2 mt-1">
                    <Text className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{item.relation}</Text>
                    <Text 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', color: theme.textSecondary }}
                    >
                        {item.gender}
                    </Text>
                    {item.occupation ? (
                        <Text 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF', color: '#3B82F6' }}
                        >
                            {item.occupation}
                        </Text>
                    ) : null}
                    {item.marital_status ? (
                        <Text 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: isDarkMode ? 'rgba(168,85,247,0.2)' : '#FAF5FF', color: '#A855F7' }}
                        >
                            {item.marital_status}
                        </Text>
                    ) : null}
                    {item.dob && (
                        <Text 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', color: theme.textSecondary }}
                        >
                            DOB: {item.dob}
                        </Text>
                    )}
                    {item.education ? (
                        <Text 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: isDarkMode ? 'rgba(99,102,241,0.2)' : '#EEF2FF', color: '#6366F1' }}
                        >
                            {item.education}
                        </Text>
                    ) : null}
                </View>
            </View>
            <View className="flex-col gap-2">
                <TouchableOpacity 
                    onPress={() => handleEdit(item)} 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF' }}
                >
                    <Ionicons name="create-outline" size={20} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => handleDelete(item.id)} 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2' }}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View 
                className="flex-row items-center justify-between p-4"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Family Members</Text>
                </View>
                <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
                    <Ionicons name="add-circle" size={32} color="#2563EB" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center"><ActivityIndicator color="#2563EB" /></View>
            ) : (
                <FlashList
                    data={members}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingVertical: 10, backgroundColor: theme.background }}
                    ListEmptyComponent={
                        <View className="items-center mt-20 p-4">
                            <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16 }}>No family members added.</Text>
                            <TouchableOpacity 
                                onPress={() => { resetForm(); setModalVisible(true); }} 
                                className="mt-4 px-4 py-2 rounded-xl"
                                style={{ backgroundColor: isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF', borderWidth: 1, borderColor: '#2563EB' }}
                            >
                                <Text className="text-blue-500 font-bold">Add Member</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)} presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <View 
                        className="flex-row items-center justify-between p-4"
                        style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
                    >
                        <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{editId ? 'Edit Member' : 'Add Member'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-5">
                        <View className="items-center mb-6">
                            <TouchableOpacity onPress={pickImage}>
                                {photo ? (
                                    <Image source={{ uri: photo }} className="w-24 h-24 rounded-full" />
                                ) : (
                                    <View 
                                        className="w-24 h-24 rounded-full items-center justify-center border"
                                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }}
                                    >
                                        <Ionicons name="camera" size={24} color={theme.textMuted} />
                                        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4 mb-20">
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Name *</Text>
                                <TextInput 
                                    value={name} 
                                    onChangeText={setName} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Relation *</Text>
                                <TextInput 
                                    value={relation} 
                                    onChangeText={setRelation} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholder="e.g. Brother" 
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Gender</Text>
                                <View className="flex-row gap-4">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <TouchableOpacity 
                                            key={g} 
                                            onPress={() => setGender(g)} 
                                            className="px-4 py-2 rounded-full border"
                                            style={{
                                                backgroundColor: gender === g ? (isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF') : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                                                borderColor: gender === g ? '#2563EB' : theme.border
                                            }}
                                        >
                                            <Text style={{ color: gender === g ? '#2563EB' : theme.textSecondary, fontWeight: gender === g ? 'bold' : 'normal' }}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Marital Status</Text>
                                <View className="flex-row gap-2 flex-wrap">
                                    {['Unmarried', 'Married', 'Divorced', 'Widow'].map(s => (
                                        <TouchableOpacity 
                                            key={s} 
                                            onPress={() => setMaritalStatus(s)} 
                                            className="px-3 py-1.5 rounded-full border"
                                            style={{
                                                backgroundColor: maritalStatus === s ? (isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF') : (isDarkMode ? '#1E293B' : '#F8FAFC'),
                                                borderColor: maritalStatus === s ? '#2563EB' : theme.border
                                            }}
                                        >
                                            <Text style={{ color: maritalStatus === s ? '#2563EB' : theme.textSecondary, fontSize: 12, fontWeight: maritalStatus === s ? 'bold' : 'normal' }}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Occupation</Text>
                                <TextInput 
                                    value={occupation} 
                                    onChangeText={setOccupation} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholder="e.g. Engineer" 
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Date of Birth</Text>
                                <TouchableOpacity
                                    onPress={openDatePicker}
                                    style={{ 
                                        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
                                        borderWidth: 1, 
                                        borderColor: theme.border, 
                                        borderRadius: 8, 
                                        padding: 12, 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between' 
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: dob ? theme.text : theme.textMuted, fontSize: 15 }}>
                                        {dob ? formatDisplayDate(dob) : 'Select Date of Birth'}
                                    </Text>
                                    <Text style={{ fontSize: 18 }}>📅</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Height</Text>
                                    <TextInput 
                                        value={height} 
                                        onChangeText={setHeight} 
                                        className="p-3 rounded-lg border"
                                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                        placeholder="e.g. 5.9" 
                                        placeholderTextColor={theme.textMuted}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Weight</Text>
                                    <TextInput 
                                        value={weight} 
                                        onChangeText={setWeight} 
                                        className="p-3 rounded-lg border"
                                        style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                        placeholder="e.g. 70kg" 
                                        placeholderTextColor={theme.textMuted}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Education</Text>
                                <TextInput 
                                    value={education} 
                                    onChangeText={setEducation} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>

                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Monthly Income</Text>
                                <TextInput 
                                    value={income} 
                                    onChangeText={setIncome} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    keyboardType="numeric" 
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>

                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Caste / Samaj</Text>
                                <TextInput 
                                    value={caste} 
                                    onChangeText={setCaste} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>

                            <View>
                                <Text style={{ color: theme.textSecondary, marginBottom: 4 }}>Kuldevi</Text>
                                <TextInput 
                                    value={kuldevi} 
                                    onChangeText={setKuldevi} 
                                    className="p-3 rounded-lg border"
                                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, color: theme.text }}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View 
                        className="p-4 border-t"
                        style={{ backgroundColor: theme.card, borderTopColor: theme.border }}
                    >
                        <TouchableOpacity onPress={handleAddOrUpdateMember} disabled={submitting} className="bg-blue-600 py-4 rounded-xl items-center">
                            {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{editId ? 'Update Member' : 'Save Member'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 }}>
                            {/* Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={{ fontSize: 16, color: theme.textSecondary }}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>Select Date of Birth</Text>
                                <TouchableOpacity onPress={confirmDate}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#2563EB' }}>Done</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Picker Columns */}
                            <View style={{ flexDirection: 'row', height: 200, paddingHorizontal: 8 }}>
                                {/* Day */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>DAY</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {DAYS.map(d => (
                                            <TouchableOpacity key={d} onPress={() => setPickerDay(d)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerDay === d ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerDay === d ? '700' : '400', color: pickerDay === d ? '#2563EB' : theme.text }}>{String(d).padStart(2,'0')}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                {/* Month */}
                                <View style={{ flex: 1.4 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>MONTH</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {MONTHS.map((m, i) => (
                                            <TouchableOpacity key={m} onPress={() => setPickerMonth(i + 1)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerMonth === i+1 ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerMonth === i+1 ? '700' : '400', color: pickerMonth === i+1 ? '#2563EB' : theme.text }}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                {/* Year */}
                                <View style={{ flex: 1.4 }}>
                                    <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600', paddingVertical: 6 }}>YEAR</Text>
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {YEARS.map(y => (
                                            <TouchableOpacity key={y} onPress={() => setPickerYear(y)}
                                                style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: pickerYear === y ? (isDarkMode ? 'rgba(37,99,235,0.25)' : '#EFF6FF') : 'transparent', borderRadius: 8, marginHorizontal: 4, marginVertical: 2 }}>
                                                <Text style={{ fontSize: 16, fontWeight: pickerYear === y ? '700' : '400', color: pickerYear === y ? '#2563EB' : theme.text }}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

export default FamilyScreen;
