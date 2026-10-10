import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { ImageService } from '../../services/ImageService';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";

const JobScreen = ({ navigation }: any) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const cursorRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { t } = useLanguage();

    const loadCachedJobs = async () => {
        try {
            const cached = await AsyncStorage.getItem('cached_jobs_v1');
            if (cached) {
                setJobs(JSON.parse(cached));
                setLoading(false);
                return true;
            }
        } catch (e) {}
        return false;
    };

    useEffect(() => {
        loadCachedJobs().then((hasCache) => {
            fetchJobs(false, false, hasCache);
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        });
        return unsubscribeBlur;
    }, [navigation]);

    const fetchJobs = async (isMore = false, isRefresh = false, isSilent = false) => {
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
            const res = await api.get(`/get_jobs.php${cursorParam}`, {
                signal: isMore ? undefined : abortControllerRef.current?.signal
            });
            if (res.data.status === 'success') {
                const newJobs = res.data.data || [];
                if (isMore) {
                    setJobs(prev => {
                        const existingIds = new Set(prev.map((p) => p.id));
                        const uniqueNew = newJobs.filter((p: any) => !existingIds.has(p.id));
                        return [...prev, ...uniqueNew];
                    });
                } else {
                    const newStringified = JSON.stringify(newJobs);
                    const cachedStr = await AsyncStorage.getItem('cached_jobs_v1');
                    
                    if (!isSilent || cachedStr !== newStringified) {
                        setJobs(newJobs);
                        AsyncStorage.setItem('cached_jobs_v1', newStringified);
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
        fetchJobs(false, true);
    };

    const renderFooter = () => {
        if (!isFetchingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} color="#2563EB" />;
    };

    const renderItem = ({ item }: { item: any }) => (
        <JobCard item={item} navigation={navigation} />
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
                <Text className="text-xl font-bold text-blue-900">{t('jobsEducation')}</Text>
            </View>

            <FlashList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString()}
                contentContainerStyle={{ paddingVertical: 10 }}
                // @ts-ignore: IDE erroneously flags this property
                estimatedItemSize={250}
                onEndReached={() => fetchJobs(true)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />
                }
                ListEmptyComponent={
                    <View className="items-center mt-20 p-4">
                        <Text className="text-slate-500 text-center text-lg">{t('noUpdatesAvailable')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const JobCard = ({ item, navigation }: { item: any, navigation: any }) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useLanguage();
    const description = item.description || '';
    const isLong = description.length > 150;

    const handleApply = () => {
        navigation.navigate('ApplyJob', { jobId: item.id, jobTitle: item.title });
    };

    const handleLink = () => {
        if (item.link) {
            Linking.openURL(item.link).catch(err => console.error("Couldn't load page", err));
        }
    };

    const getImageUrl = (imagePath: string) => {
        if (!imagePath) return null;
        let finalUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            // Strip leading slash if present
            const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
            // If the path already has 'uploads/', just append it to root, else assume uploads/jobs/
            if (cleanPath.includes('uploads/')) {
                finalUrl = `${BASE_URL_ROOT}/${cleanPath}`;
            } else {
                finalUrl = `${BASE_URL_ROOT}/uploads/jobs/${cleanPath}`;
            }
        }
        return ImageService.getFeedImageUrl(finalUrl, 800);
    };

    const imageUrl = getImageUrl(item.image);

    const renderDescription = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <Text 
                        key={index} 
                        className="text-blue-600 underline"
                        onPress={() => Linking.openURL(part).catch(err => console.error("Error opening URL", err))}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    return (
        <View className="bg-white mb-4 mx-4 p-5 rounded-xl border border-gray-100 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className={`text-xs font-bold px-2 py-1 rounded self-start mb-2 ${item.type === 'job' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {item.type ? item.type.toUpperCase() : t('updateBadge')}
                    </Text>
                    <Text className="text-lg font-bold text-blue-950 leading-6">{item.title}</Text>
                </View>
                <Text className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>

            <Text className="text-slate-500 text-sm leading-5 mb-2">
                {expanded ? renderDescription(description) : renderDescription(description.substring(0, 150) + (isLong ? '...' : ''))}
            </Text>

            {isLong && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)} className="mb-4">
                    <Text className="text-blue-600 font-bold text-xs">{expanded ? t('readLess') : t('readMore')}</Text>
                </TouchableOpacity>
            )}

            {imageUrl && (
                <View className="mb-4 w-full h-48 rounded-lg overflow-hidden bg-slate-100">
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
            )}



            <View className="flex-row gap-3 mt-2 flex-wrap">
                {item.type === 'job' && (
                    <TouchableOpacity
                        className="bg-blue-600 py-2.5 px-4 rounded-lg flex-row items-center"
                        onPress={handleApply}
                    >
                        <Text className="text-white font-bold text-sm">{t('applyNow')}</Text>
                    </TouchableOpacity>
                )}

                {!!item.link && (
                    <TouchableOpacity
                        className="bg-blue-600 py-2.5 px-4 rounded-lg flex-row items-center space-x-2"
                        onPress={handleLink}
                    >
                        <Ionicons name="link" size={16} color="white" />
                        <Text className="text-white font-bold text-sm ml-1">{t('visitLink')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default JobScreen;
