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

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const TEMPLE_IMAGE_URL = `${BASE_URL_ROOT}/uploads/temple/`;

const TempleScreen = ({ navigation }: any) => {
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
        <View className="bg-white mb-5 rounded-xl border border-orange-100 shadow-sm overflow-hidden mx-4">
            {item.photo && (
                <Image
                    source={{ uri: ImageService.getFeedImageUrl(`${TEMPLE_IMAGE_URL}${item.photo}`, 800) }}
                    className="w-full h-72 bg-slate-50"
                    contentFit="contain"
                />
            )}
            <View className="p-4">
                <Text className="text-xl font-bold text-blue-950 mb-1">{item.mahant_name}</Text>
                <Text className="text-sm text-slate-500 mb-2">
                    <Ionicons name="call" size={14} color="gray" /> {item.mobile}
                </Text>

                <View className="space-y-1 mb-3">
                    <Text className="text-xs text-slate-500">{t('village')}: {item.village}</Text>
                    <Text className="text-xs text-slate-500">Taluka: {item.taluka}</Text>
                    <Text className="text-xs text-slate-500">District: {item.district}</Text>
                </View>

                {item.description && (
                    <Text className="text-slate-600 text-sm leading-5" numberOfLines={3}>
                        {item.description}
                    </Text>
                )}
            </View>
        </View>
    );

    if (loading) {
        return <View className="flex-1 justify-center items-center bg-white"><ActivityIndicator color="#2563EB" /></View>;
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center p-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900">{t('temples')}</Text>
            </View>

            <FlashList
                data={temples}
                renderItem={renderItem}
                keyExtractor={item => item.temple_id.toString()}
                contentContainerStyle={{ paddingVertical: 10 }}
                // @ts-ignore: IDE erroneously flags this property
                estimatedItemSize={300}
                onEndReached={() => fetchTemples(true)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />
                }
                ListEmptyComponent={
                    <View className="items-center mt-20 p-4">
                        <Text className="text-slate-500 text-center text-lg">{t('noJobs') ?? "No temples found"}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default TempleScreen;
