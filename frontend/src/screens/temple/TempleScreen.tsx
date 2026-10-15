import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { ImageService } from '../../services/ImageService';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const TEMPLE_IMAGE_URL = `${BASE_URL_ROOT}/uploads/temple/`;

const TempleScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [temples, setTemples] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const cursorRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { t } = useLanguage();

    const loadCachedTemples = async () => {
        try {
            const cached = await AsyncStorage.getItem('cached_temples_v1');
            if (cached) {
                setTemples(JSON.parse(cached));
                setLoading(false);
                return true;
            }
        } catch (e) {}
        return false;
    };

    useEffect(() => {
        loadCachedTemples().then((hasCache) => {
            fetchTemples(false, false, hasCache);
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        });
        return unsubscribeBlur;
    }, [navigation]);

    const fetchTemples = async (isMore = false, isRefresh = false, isSilent = false) => {
        if (isMore && (isFetchingMore || !hasMore)) return;

        if (isMore) setIsFetchingMore(true);
        else if (isRefresh) setRefreshing(true);
        else if (!isSilent) setLoading(true);

        if (!isMore) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
        }

        try {
            const cursorParam = (isMore && cursorRef.current) ? `?limit=20&cursor=${cursorRef.current}` : '?limit=20';
            const res = await api.get(`/get_temples.php${cursorParam}`, {
                signal: isMore ? undefined : abortControllerRef.current?.signal
            });
            if (res.data.status === 'success') {
                const newTemples = res.data.data || [];
                if (isMore) {
                    setTemples(prev => {
                        const existingIds = new Set(prev.map((p) => p.id));
                        const uniqueNew = newTemples.filter((p: any) => !existingIds.has(p.id));
                        return [...prev, ...uniqueNew];
                    });
                } else {
                    const newStringified = JSON.stringify(newTemples);
                    const cachedStr = await AsyncStorage.getItem('cached_temples_v1');
                    
                    if (!isSilent || cachedStr !== newStringified) {
                        setTemples(newTemples);
                        AsyncStorage.setItem('cached_temples_v1', newStringified);
                    }
                }
                
                setHasMore(res.data.has_more);
                cursorRef.current = res.data.next_cursor;
            }
            setLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.message === 'canceled') {
                // Request was canceled, do nothing
                return;
            }
            console.error(error);
            setLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
        }
    };

    const onRefresh = () => {
        cursorRef.current = null;
        fetchTemples(false, true);
    };

    const renderFooter = () => {
        if (!isFetchingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} color="#2563EB" />;
    };

    const renderItem = ({ item }: { item: any }) => (
        <View 
            className="mb-5 rounded-2xl shadow-sm overflow-hidden mx-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}
        >
            {item.photo && (
                <Image
                    source={{ uri: ImageService.getFeedImageUrl(`${TEMPLE_IMAGE_URL}${item.photo}`, 800) }}
                    className="w-full h-72"
                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }}
                    contentFit="contain"
                />
            )}
            <View className="p-4">
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{item.mahant_name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 8 }}>
                    <Ionicons name="call" size={14} color={theme.textMuted} /> {item.mobile}
                </Text>

                <View className="space-y-1 mb-3">
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('village')}: {item.village}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Taluka: {item.taluka}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>District: {item.district}</Text>
                </View>

                {item.description && (
                    <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }} numberOfLines={3}>
                        {item.description}
                    </Text>
                )}
            </View>
        </View>
    );

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
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{t('temples')}</Text>
            </View>

            <FlashList
                data={temples}
                renderItem={renderItem}
                keyExtractor={item => item.temple_id.toString()}
                contentContainerStyle={{ paddingVertical: 10, backgroundColor: theme.background }}
                onEndReached={() => fetchTemples(true)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />
                }
                ListEmptyComponent={
                    <View className="items-center mt-20 p-4">
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 16 }}>{t('noJobs') ?? "No temples found"}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default TempleScreen;
