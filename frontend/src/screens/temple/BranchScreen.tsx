import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const BRANCH_IMAGE_URL = `${WEBSITE_URL}/uploads/branches/`;

const BranchScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    const loadCachedBranches = async () => {
        try {
            const cached = await AsyncStorage.getItem('cached_branches_v1');
            if (cached) {
                setBranches(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        loadCachedBranches().then(() => {
            fetchBranches();
        });
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await api.get('/get_branches.php');
            if (res.data.status === 'success') {
                setBranches(res.data.data);
                AsyncStorage.setItem('cached_branches_v1', JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => <BranchCard item={item} t={t} theme={theme} isDarkMode={isDarkMode} />;

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View 
                className="flex-row items-center p-4"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{t('branches')}</Text>
            </View>

            <FlashList
                data={branches}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ paddingVertical: 10, backgroundColor: theme.background }}
                ListEmptyComponent={
                    <View className="items-center mt-20 p-4">
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16 }}>No branches found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const BranchCard = ({ item, t, theme, isDarkMode }: { item: any, t: any, theme: any, isDarkMode: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    const hasLongText = item.details && item.details.length > 100;

    return (
        <View 
            className="mb-5 rounded-2xl shadow-sm overflow-hidden mx-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}
        >
            {item.photo && (
                <Image
                    source={{ uri: `${BRANCH_IMAGE_URL}${item.photo}` }}
                    className="w-full h-72"
                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }}
                    contentFit="contain"
                />
            )}
            <View className="p-4">
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{item.branch_name}</Text>
                <Text style={{ color: '#2563EB', fontSize: 15, fontWeight: '600', marginBottom: 8 }}>{item.mahant_name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 8 }}>
                    <Ionicons name="call" size={14} color={theme.textMuted} /> {item.mahant_mobile}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>{t('location')}: {item.branch_village}</Text>

                {item.details && (
                    <View>
                        <Text
                            style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}
                            numberOfLines={expanded ? undefined : 3}
                        >
                            {item.details}
                        </Text>
                        {hasLongText && (
                            <TouchableOpacity onPress={() => setExpanded(!expanded)} className="mt-1">
                                <Text className="text-blue-500 font-bold text-xs">
                                    {expanded ? t('seeLess') : t('seeMore')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

export default BranchScreen;
