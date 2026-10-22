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
import { useTheme } from '../../context/ThemeContext';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";

const JobScreen = ({ navigation }: any) => {
    const { isDarkMode, theme } = useTheme();
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
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}><ActivityIndicator color="#2563EB" /></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t('jobsEducation')}</Text>
            </View>

            <FlashList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString()}
                contentContainerStyle={{ paddingVertical: 12, backgroundColor: theme.background }}
                // @ts-ignore: IDE erroneously flags this property
                estimatedItemSize={250}
                onEndReached={() => fetchJobs(true)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 80, padding: 16 }}>
                        <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: 16, fontWeight: '500' }}>{t('noUpdatesAvailable')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const JobCard = ({ item, navigation }: { item: any, navigation: any }) => {
    const { isDarkMode, theme } = useTheme();
    const [expanded, setExpanded] = useState(false);
    const { t } = useLanguage();
    const description = item.description || '';
    const isLong = description.length > 150;

    const handleLink = () => {
        if (item.link) {
            Linking.openURL(item.link).catch(err => console.error("Couldn't load page", err));
        }
    };

    const getImageUrl = (imagePath: string) => {
        if (!imagePath) return null;
        let finalUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
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
                        style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
                        onPress={() => Linking.openURL(part).catch(err => console.error("Error opening URL", err))}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index} style={{ color: theme.textSecondary }}>{part}</Text>;
        });
    };

    return (
        <View style={{ backgroundColor: theme.card, marginBottom: 14, marginHorizontal: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                        marginBottom: 6,
                        backgroundColor: item.type === 'job' ? (isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7') : (isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE'),
                        color: item.type === 'job' ? '#16A34A' : '#2563EB'
                    }}>
                        {item.type ? item.type.toUpperCase() : t('updateBadge')}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: theme.text, lineHeight: 24 }}>{item.title}</Text>
                </View>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>

            <Text
                style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 8, textAlign: 'justify' }}
                textBreakStrategy="highQuality"
                android_hyphenationFrequency="normal"
            >
                {expanded ? renderDescription(description) : renderDescription(description.substring(0, 150) + (isLong ? '...' : ''))}
            </Text>

            {isLong && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 12 }}>{expanded ? t('readLess') : t('readMore')}</Text>
                </TouchableOpacity>
            )}

            {imageUrl && (
                <View style={{ marginBottom: 14, width: '100%', height: 190, borderRadius: 12, overflow: 'hidden', backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }}>
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
            )}

            {!!item.link && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                        style={{ backgroundColor: '#2563EB', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}
                        onPress={handleLink}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="link" size={15} color="white" />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>{t('visitLink')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default JobScreen;
