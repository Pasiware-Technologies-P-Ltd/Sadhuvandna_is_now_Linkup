import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Share, Modal, RefreshControl, Animated, Easing, Alert, Linking, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';

const { width } = Dimensions.get('window');
const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const NEWS_URL = `${BASE_URL_ROOT}/uploads/news/`;
import { useLanguage } from '../../context/LanguageContext';
import { useIsFocused } from '@react-navigation/native';

const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const ProfessionalVideoPlayer = ({
    uri,
    shouldPlay,
    style,
    onExpand
}: {
    uri: string;
    shouldPlay: boolean;
    style?: any;
    onExpand?: () => void;
}) => {
    const videoRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState<any>({});
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef<any>(null);

    const resetControlsTimer = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
            setShowControls(false);
        }, 3500);
    };

    useEffect(() => {
        return () => {
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        };
    }, []);

    const togglePlay = async () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        resetControlsTimer();
    };

    const toggleMute = async () => {
        if (!videoRef.current) return;
        await videoRef.current.setIsMutedAsync(!isMuted);
        setIsMuted(!isMuted);
        resetControlsTimer();
    };

    const progress = (status.positionMillis && status.durationMillis)
        ? (status.positionMillis / status.durationMillis) * 100
        : 0;

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={resetControlsTimer}
            style={[{ position: 'relative', overflow: 'hidden', backgroundColor: 'black' }, style]}
        >
            <Video
                ref={videoRef}
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={shouldPlay}
                isMuted={isMuted}
                onPlaybackStatusUpdate={(s: any) => {
                    if (s.isLoaded) {
                        setStatus(s);
                        setIsPlaying(s.isPlaying);
                    }
                }}
            />

            {/* Top Bar: Badge + Mute Button */}
            {showControls && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.4)'
                    }}
                >
                    <View style={{ backgroundColor: '#ea580c', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="videocam" size={11} color="white" style={{ marginRight: 4 }} />
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>VIDEO NEWS</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Center Play/Pause Circle Control */}
            {showControls && (
                <View
                    pointerEvents="box-none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <TouchableOpacity
                        onPress={togglePlay}
                        activeOpacity={0.8}
                        style={{
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            borderWidth: 1.5,
                            borderColor: 'rgba(255,255,255,0.4)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                    >
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={26}
                            color="white"
                            style={{ marginLeft: isPlaying ? 0 : 3 }}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Bar: Progress Line + Time Code */}
            {showControls && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                    }}
                >
                    <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#ea580c' }} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                            {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
                        </Text>
                        {onExpand && (
                            <TouchableOpacity onPress={onExpand} style={{ padding: 2 }}>
                                <Ionicons name="expand" size={15} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

const TickerItem = ({ text }: { text: string }) => {
    const cleanText = (text || '').replace(/[\r\n]+/g, ' ');
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 32 }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginRight: 8 }}>📰</Text>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13, flexShrink: 0 }}>{cleanText}</Text>
        </View>
    );
};

const NewsTicker = ({ tickerData }: { tickerData: string[] }) => {
    const scrollAnim = useRef(new Animated.Value(0)).current;
    const [contentWidth, setContentWidth] = useState(0);

    useEffect(() => {
        if (contentWidth <= 0) return;
        scrollAnim.setValue(0);
        const anim = Animated.loop(
            Animated.timing(scrollAnim, {
                toValue: -contentWidth / 2,
                duration: Math.max(contentWidth * 22, 6000),
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        anim.start();
        return () => anim.stop();
    }, [contentWidth, tickerData]);

    if (!tickerData || tickerData.length === 0) return null;

    const itemsToRender = [...tickerData, ...tickerData];

    return (
        <View style={{ backgroundColor: '#dc2626', flexDirection: 'row', alignItems: 'center', height: 36, overflow: 'hidden', width: '100%' }}>
            <View style={{ backgroundColor: '#b91c1c', height: '100%', justifyContent: 'center', paddingHorizontal: 10, borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.25)', zIndex: 10 }}>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>BREAKING</Text>
            </View>
            <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'center' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
                    <Animated.View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            transform: [{ translateX: scrollAnim }]
                        }}
                        onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0 && Math.abs(w - contentWidth) > 5) {
                            setContentWidth(w);
                        }
                    }}
                >
                    {itemsToRender.map((item, index) => (
                        <TickerItem key={index} text={item} />
                    ))}
                </Animated.View>
                </ScrollView>
            </View>
        </View>
    );
};

const CATEGORY_MAP = [
    { id: 'All', nameEn: 'All', nameHi: 'सभी', icon: '🌐' },
    { id: 'ताज़ा खबर', nameEn: 'Latest News', nameHi: 'ताज़ा खबर', icon: '⚡' },
    { id: 'राष्ट्रीय', nameEn: 'National', nameHi: 'राष्ट्रीय', icon: '🇮🇳' },
    { id: 'राज्य', nameEn: 'State', nameHi: 'राज्य', icon: '🏛️' },
    { id: 'जिला', nameEn: 'District', nameHi: 'जिला', icon: '📍' },
    { id: 'राजनीति', nameEn: 'Politics', nameHi: 'राजनीति', icon: '🗳️' },
    { id: 'धर्म', nameEn: 'Religion', nameHi: 'धर्म', icon: '🛕' },
    { id: 'शिक्षा', nameEn: 'Education', nameHi: 'शिक्षा', icon: '🎓' },
    { id: 'खेल', nameEn: 'Sports', nameHi: 'खेल', icon: '🏆' },
    { id: 'व्यापार', nameEn: 'Business', nameHi: 'व्यापार', icon: '💼' },
    { id: 'कृषि', nameEn: 'Agriculture', nameHi: 'कृषि', icon: '🌾' },
    { id: 'मनोरंजन', nameEn: 'Entertainment', nameHi: 'मनोरंजन', icon: '🎬' },
    { id: 'सामाजिक', nameEn: 'Social', nameHi: 'सामाजिक', icon: '🤝' },
    { id: 'दुर्घटना', nameEn: 'Accident', nameHi: 'दुर्घटना', icon: '⚠️' },
    { id: 'मृत्यु/श्रद्धांजलि', nameEn: 'Tribute', nameHi: 'मृत्यु/श्रद्धांजलि', icon: '🕯️' },
    { id: 'विज्ञापन', nameEn: 'Advertisement', nameHi: 'विज्ञापन', icon: '📢' }
];

const NewsScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<'apna' | 'ddnews' | 'aastha'>('apna');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // States and Districts
    const [statesList, setStatesList] = useState<any[]>([]);
    const [districtsList, setDistrictsList] = useState<any[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    useEffect(() => {
        const fetchStates = async () => {
            try {
                const res = await api.get('/get_states.php');
                if (res.data && res.data.status === 'success') {
                    setStatesList(res.data.data);
                }
            } catch (err) {}
        };
        fetchStates();
    }, []);

    const fetchDistricts = async (stateId: string) => {
        try {
            const res = await api.get(`/get_districts.php?state_id=${stateId}`);
            if (res.data && res.data.status === 'success') {
                setDistrictsList(res.data.data);
            }
        } catch (err) {}
    };

    const handleStateChange = (stateName: string, stateId: string) => {
        setSelectedState(stateName);
        setSelectedDistrict('');
        setDistrictsList([]);
        if (stateId) fetchDistricts(stateId);
    };
    
    // Apna News State
    const [news, setNews] = useState<any[]>([]);
    const [tickerData, setTickerData] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    
    // DD News State
    const [ytNews, setYtNews] = useState<any[]>([]);
    const [ytLoading, setYtLoading] = useState(false);
    
    // Aastha State
    const [aasthaNews, setAasthaNews] = useState<any[]>([]);
    const [aasthaLoading, setAasthaLoading] = useState(false);
    
    // Refreshing State
    const [refreshing, setRefreshing] = useState(false);
    const [ytRefreshing, setYtRefreshing] = useState(false);
    const [aasthaRefreshing, setAasthaRefreshing] = useState(false);
    
    // Video Player Modal State
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    // Premium UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [bookmarks, setBookmarks] = useState<string[]>([]);
    const shimmerAnim = useRef(new Animated.Value(0.4)).current;
    const { language, t } = useLanguage();
    
    // Auto-hiding header state
    const [headerHeight, setHeaderHeight] = useState(250);
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollYClamped = Animated.diffClamp(scrollY, 0, headerHeight);
    const headerTranslateY = scrollYClamped.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [0, -headerHeight],
        extrapolate: 'clamp',
    });
    
    const insets = useSafeAreaInsets();
    const [tickerY, setTickerY] = useState(150); // Fallback until onLayout fires
    const safeTop = insets.top || 0; // Use exact inset to avoid white gap
    const stickyThreshold = Math.max(0, tickerY - safeTop);
    
    // We use the raw scrollY (not clamped) to calculate absolute position
    const tickerAbsoluteTranslateY = scrollY.interpolate({
        inputRange: [-1, 0, stickyThreshold],
        outputRange: [tickerY + 1, tickerY, safeTop],
        extrapolateRight: 'clamp',
    });

    // Visible item tracking for video auto-pause
    const [visibleItemId, setVisibleItemId] = useState<string | null>(null);
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setVisibleItemId(viewableItems[0].item?.id?.toString() || null);
        } else {
            setVisibleItemId(null);
        }
    }).current;

    useEffect(() => {
        const loadingActive = loading || ytLoading || aasthaLoading;
        if (loadingActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1.0,
                        duration: 850,
                        useNativeDriver: true
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0.4,
                        duration: 850,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            shimmerAnim.setValue(0.4);
        }
    }, [loading, ytLoading, aasthaLoading]);

    const filteredNews = (selectedCategory === 'All'
        ? news
        : news.filter((item: any) => {
            const catObj = CATEGORY_MAP.find(c => c.id === selectedCategory);
            if (!catObj) return item.category === selectedCategory;
            return item.category === catObj.id || item.category === catObj.nameEn || item.category === catObj.nameHi;
        })
    ).filter((item: any) => {
        if (selectedCategory === 'State' || selectedCategory === 'राज्य') return !selectedState || item.state === selectedState;
        if (selectedCategory === 'District' || selectedCategory === 'जिला') return (!selectedState || item.state === selectedState) && (!selectedDistrict || item.district === selectedDistrict);
        return true;
    }).filter((item: any) => 
        !searchQuery.trim() || 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isMounted = useRef(true);

    // Anchor application status
    const [userId, setUserId] = useState<number | null>(null);
    const [anchorStatus, setAnchorStatus] = useState<string | null>(null);
    const [isAnchorPaid, setIsAnchorPaid] = useState<boolean>(false);
    const [anchorFee, setAnchorFee] = useState<number>(100);
    const [anchorPaymentUrl, setAnchorPaymentUrl] = useState<string>('');

    const fetchAnchorStatus = async () => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            const user = uStr ? JSON.parse(uStr) : null;
            if (user && user.id) {
                setUserId(user.id);
                const res = await api.get(`/check_anchor_status.php?user_id=${user.id}`);
                if (res.data && res.data.status === 'success') {
                    setAnchorStatus(res.data.anchor_status); // Pending, Approved, Rejected, null
                    setIsAnchorPaid(!!res.data.paid);
                    if (res.data.fee) setAnchorFee(res.data.fee);
                    if (res.data.payment_url) setAnchorPaymentUrl(res.data.payment_url);
                }
            }
        } catch (e) {
            console.error("Failed to check anchor status", e);
        }
    };

    const loadBookmarks = async () => {
        try {
            const saved = await AsyncStorage.getItem('bookmarked_news');
            if (saved) {
                setBookmarks(JSON.parse(saved));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleBookmark = async (id: string) => {
        try {
            const updated = bookmarks.includes(id)
                ? bookmarks.filter(b => b !== id)
                : [...bookmarks, id];
            setBookmarks(updated);
            await AsyncStorage.setItem('bookmarked_news', JSON.stringify(updated));
            Alert.alert(
                bookmarks.includes(id) ? 'Removed' : 'Bookmarked', 
                bookmarks.includes(id) ? 'Article removed from offline bookmarks.' : 'Article saved to read offline later.'
            );
        } catch (e) {
            Alert.alert('Error', 'Failed to update bookmarks');
        }
    };

    const renderApnaNewsSkeleton = () => {
        return (
            <Animated.View
                style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    padding: 16,
                    opacity: shimmerAnim
                }}
            >
                <View style={{ width: '80%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
                <View style={{ width: '40%', height: 10, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <View style={{ width: '100%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: '90%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: '95%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ width: 50, height: 10, backgroundColor: '#e5e7eb', borderRadius: 4 }} />
                            <View style={{ width: 40, height: 10, backgroundColor: '#e5e7eb', borderRadius: 4 }} />
                        </View>
                    </View>
                    <View style={{ width: 112, height: 80, backgroundColor: '#e5e7eb', borderRadius: 12 }} />
                </View>
            </Animated.View>
        );
    };

    const renderVideoNewsSkeleton = () => {
        return (
            <Animated.View
                style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    opacity: shimmerAnim
                }}
            >
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#d1d5db' }} />
                </View>
                <View style={{ padding: 16 }}>
                    <View style={{ width: '90%', height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
                    <View style={{ width: '70%', height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ width: 60, height: 10, backgroundColor: '#e5e7eb', borderRadius: 4 }} />
                        <View style={{ width: 50, height: 24, backgroundColor: '#e5e7eb', borderRadius: 12 }} />
                    </View>
                </View>
            </Animated.View>
        );
    };

    const loadCachedData = async () => {
        try {
            const cachedNews = await AsyncStorage.getItem('cached_news_v1');
            if (cachedNews) {
                const parsed = JSON.parse(cachedNews);
                setNews(parsed);
                setTickerData(parsed.slice(0, 5).map((n: any) => n.title));
                setLoading(false);
            }
            const cachedYT = await AsyncStorage.getItem('cached_yt_news_v1');
            if (cachedYT) {
                setYtNews(JSON.parse(cachedYT));
                setYtLoading(false);
            }
            const cachedAastha = await AsyncStorage.getItem('cached_aastha_news_v1');
            if (cachedAastha) {
                setAasthaNews(JSON.parse(cachedAastha));
                setAasthaLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        isMounted.current = true;
        loadBookmarks();
        fetchAnchorStatus();
        
        // Load cache first for zero-loading time, then silently update
        loadCachedData().then(() => {
            fetchNews();
            fetchYTNews();
            fetchAasthaNews();
        });

        const unsubscribe = navigation.addListener('focus', () => {
            loadBookmarks();
            fetchAnchorStatus();
            fetchNews();
        });

        return () => { 
            isMounted.current = false; 
            unsubscribe();
        };
    }, [navigation]);

    const fetchNews = async () => {
        try {
            const res = await api.get('/get_news.php');
            if (isMounted.current && res.data.status === 'success') {
                const newsList = res.data.data;
                setNews(newsList);
                AsyncStorage.setItem('cached_news_v1', JSON.stringify(newsList));
                if (res.data.ticker && res.data.ticker.length > 0) {
                    setTickerData(res.data.ticker);
                } else if (newsList && newsList.length > 0) {
                    setTickerData(newsList.slice(0, 5).map((n: any) => n.title));
                }
            }
        } catch (error) {
            console.error("Failed to fetch news", error);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const onRefreshApna = async () => {
        setRefreshing(true);
        await Promise.all([fetchNews(), fetchAnchorStatus()]);
        setRefreshing(false);
    };

    const fetchYTNews = async (isRefresh = false) => {
        if (!isRefresh && ytNews.length === 0) setYtLoading(true);
        try {
            const res = await api.get('/get_video_news.php');
            if (isMounted.current && res.data.status === 'success') {
                setYtNews(res.data.data);
                AsyncStorage.setItem('cached_yt_news_v1', JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error("Failed to fetch DD news", error);
        } finally {
            if (isMounted.current) setYtLoading(false);
        }
    };

    const onRefreshYT = async () => {
        setYtRefreshing(true);
        await fetchYTNews(true);
        setYtRefreshing(false);
    };

    const fetchAasthaNews = async (isRefresh = false) => {
        if (!isRefresh && aasthaNews.length === 0) setAasthaLoading(true);
        try {
            const res = await api.get('/get_aastha.php');
            if (isMounted.current && res.data.status === 'success') {
                setAasthaNews(res.data.data);
                AsyncStorage.setItem('cached_aastha_news_v1', JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error("Failed to fetch Aastha news", error);
        } finally {
            if (isMounted.current) setAasthaLoading(false);
        }
    };

    const onRefreshAastha = async () => {
        setAasthaRefreshing(true);
        await fetchAasthaNews(true);
        setAasthaRefreshing(false);
    };

    const extractVideoId = (url: string) => {
        if (!url) return null;
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) return match[1];
        
        // Sometimes short forms are used
        const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (shortMatch) return shortMatch[1];
        
        return null;
    };

    const isFocused = useIsFocused();

    const renderNewsItem = ({ item, index }: { item: any, index?: number }) => {
        if (!item) return null;
        const images = item.images || [];
        const isBookmarked = bookmarks.includes(item.id?.toString());
        const isVisible = isFocused && visibleItemId === item.id?.toString();

        const handleShare = async () => {
            try {
                const newsUrl = `${WEBSITE_URL}/view_news.php?id=${item.id}`;
                const message = `${item.title}\n\n${item.description?.substring(0, 100)}...\n\nOpen in App: ${newsUrl}`;
                await Share.share({ message, url: newsUrl });
            } catch (error: any) {}
        };

        const isVideo = (filename: string) => /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(filename);

        const THUMB_WIDTH = width * 0.72; // 72% width per item in scroll

        if (index === 0) {
            const displayImage = images.length > 0 ? `${NEWS_URL}${images[0]}` : 'https://via.placeholder.com/400x250?text=News';
            return (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('NewsDetail', { news: item })}
                    style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', height: 260 }}
                >
                    {images.length > 0 && isVideo(images[0]) ? (
                        <ProfessionalVideoPlayer
                            uri={displayImage}
                            style={{ width: '100%', height: '100%' }}
                            shouldPlay={isVisible}
                            onExpand={() => navigation.navigate('NewsDetail', { news: item })}
                        />
                    ) : (
                        <Image
                            source={{ uri: displayImage }}
                            style={{ width: '100%', height: '100%', opacity: 0.9 }}
                            contentFit="cover"
                        />
                    )}
                    
                    {/* Dark overlay for text readability */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 16 }}>
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}>
                            {item.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600' }}>
                                {item.created_at?.split(' ')[0] || 'Recently'} | {item.district || item.state || 'न्यूज़'}
                            </Text>
                        </View>
                    </View>
                    
                    {item.category && (
                        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{item.category}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        // For index > 0, show compact row layout
        const displayImage = images.length > 0 ? `${NEWS_URL}${images[0]}` : 'https://via.placeholder.com/150?text=News';
        
        return (
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('NewsDetail', { news: item })}
                style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
            >
                {/* Left side: Image */}
                <View style={{ width: 130, height: 85, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f3f4f6', marginRight: 14 }}>
                    {images.length > 0 && isVideo(images[0]) ? (
                        <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                            <Ionicons name="play-circle" size={32} color="white" />
                        </View>
                    ) : (
                        <Image source={{ uri: displayImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    )}
                </View>
                
                {/* Right side: Content */}
                <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 22 }} numberOfLines={3}>
                        {item.title}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                            {item.created_at?.split(' ')[0] || 'Recently'}
                            {item.district || item.state ? `  |  ${item.district || item.state}` : ''}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };


    const renderYTNewsItem = ({ item }: { item: any }) => {
        if (!item) return null;
        const videoId = item.videoId || extractVideoId(item.link);
        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/300x200?text=Video';
        
        const handleShareYT = async () => {
            try {
                const message = `Watch this Video News update:\n${item.title}\n${item.link}`;
                await Share.share({ message });
            } catch (error: any) {}
        };

        return (
            <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 16, backgroundColor: 'white', overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => setSelectedVideoId(videoId)}
                    style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#e5e7eb', position: 'relative' }}
                >
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
                            <Ionicons name="play" size={24} color="#ea580c" style={{ marginLeft: 4 }} />
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', lineHeight: 20, marginBottom: 8 }} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {item.isLive && (
                                <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 }}>
                                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>LIVE</Text>
                                </View>
                            )}
                            <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '500' }}>{item.pubDate}</Text>
                        </View>
                        <TouchableOpacity onPress={handleShareYT} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' }}>
                            <Ionicons name="share-social" size={14} color="#4b5563" />
                            <Text style={{ color: '#4b5563', fontSize: 12, fontWeight: 'bold', marginLeft: 6 }}>{t('share')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#f9fafb]" edges={['top']}>
            {/* Header & Tabs */}
            <Animated.View 
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    transform: [{ translateY: headerTranslateY }],
                    backgroundColor: 'white',
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 3,
                    paddingTop: 45 // safe area top padding approximation
                }}
            >
                <View className="flex-row justify-between items-center px-5 mb-4">
                    <Text className="text-xl font-extrabold text-gray-900">{t('newsUpdates')}</Text>
                    {anchorStatus === 'Approved' ? (
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('PostBreakingNews')}
                                className="bg-red-600 px-3.5 py-1.5 rounded-full flex-row items-center shadow-sm"
                                activeOpacity={0.7}
                            >
                                <Ionicons name="flash-outline" size={14} color="white" />
                                <Text className="text-white font-bold text-xs ml-1">Breaking</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('CreateNews')}
                                className="bg-orange-600 px-3.5 py-1.5 rounded-full flex-row items-center shadow-sm"
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={14} color="white" />
                                <Text className="text-white font-bold text-xs ml-1">{t('postNews')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : anchorStatus === 'Pending' ? (
                        <TouchableOpacity 
                            onPress={() => Alert.alert(t('pendingApproval'), t('pendingApprovalMsg'))}
                            className="bg-gray-400 px-3.5 py-1.5 rounded-full flex-row items-center shadow-sm"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="time-outline" size={14} color="white" />
                            <Text className="text-white font-bold text-xs ml-1">{t('pendingApproval')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            onPress={() => {
                                if (isAnchorPaid) {
                                    navigation.navigate('ApplyJob', { jobId: 'anchor', jobTitle: 'News Anchor', isAnchorApplication: true });
                                } else {
                                    Alert.alert(
                                        "Payment Required",
                                        `Applying for News Anchor requires a fee of ₹${anchorFee}. Pay now to proceed.`,
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { 
                                                text: "Pay Now", 
                                                onPress: () => {
                                                    const path = anchorPaymentUrl || `payment_anchor.php?user_id=${userId}`;
                                                    const fullPaymentUrl = `${API_BASE_URL}${path}`;
                                                    Linking.openURL(fullPaymentUrl).catch(err => 
                                                        console.error("Couldn't open URL", err)
                                                    );
                                                }
                                            }
                                        ]
                                    );
                                }
                            }}
                            className="bg-orange-600 px-3.5 py-1.5 rounded-full flex-row items-center shadow-sm"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="mic-outline" size={14} color="white" />
                            <Text className="text-white font-bold text-xs ml-1">{anchorStatus === 'Rejected' ? t('reapplyAnchor') : t('applyForNewsAnchor')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {isSearchActive ? (
                    <View className="flex-row items-center bg-white p-1 rounded-2xl mx-5 mb-4 border border-gray-200" style={{ height: 44 }}>
                        <Ionicons name="search" size={18} color="#9ca3af" style={{ marginHorizontal: 10 }} />
                        <TextInput 
                            style={{ flex: 1, fontSize: 13, color: '#1f2937', padding: 0 }}
                            placeholder={t('searchNewsUpdates')}
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        <TouchableOpacity 
                            onPress={() => { setIsSearchActive(false); setSearchQuery(''); }} 
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex-row bg-gray-100 p-1 rounded-2xl mx-5 mb-4 border border-gray-200">
                        <TouchableOpacity 
                            onPress={() => setActiveTab('apna')}
                            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                            style={activeTab === 'apna' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : null}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="newspaper-outline" size={15} color={activeTab === 'apna' ? '#ea580c' : '#6b7280'} />
                            <Text className={`ml-1.5 font-bold text-xs ${activeTab === 'apna' ? 'text-gray-900' : 'text-gray-500'}`}>{t('apnaNews')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setActiveTab('ddnews')}
                            className="flex-1 flex-row items-center justify-center py-2.5 mx-1 rounded-xl"
                            style={activeTab === 'ddnews' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : null}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="logo-youtube" size={15} color={activeTab === 'ddnews' ? '#dc2626' : '#6b7280'} />
                            <Text className={`ml-1.5 font-bold text-xs ${activeTab === 'ddnews' ? 'text-gray-900' : 'text-gray-500'}`}>{t('ddNews')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setActiveTab('aastha')}
                            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                            style={activeTab === 'aastha' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : null}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="flower-outline" size={15} color={activeTab === 'aastha' ? '#d97706' : '#6b7280'} />
                            <Text className={`ml-1.5 font-bold text-xs ${activeTab === 'aastha' ? 'text-gray-900' : 'text-gray-500'}`}>{t('aastha')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setIsSearchActive(true)}
                            className="flex-row items-center justify-center px-3 rounded-xl ml-1"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="search" size={18} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'apna' && tickerData.length > 0 && (
                    <View 
                        onLayout={(e) => setTickerY(e.nativeEvent.layout.y)}
                        style={{ 
                            marginBottom: 12,
                            height: 36 // Placeholder height to take up space where ticker normally is
                        }}
                    />
                )}

                {activeTab === 'apna' && (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 }}
                        className="bg-white"
                    >
                        {CATEGORY_MAP.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            const label = language === 'en' ? cat.nameEn : cat.nameHi;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    className="flex-row items-center rounded-full px-3.5 py-1.5 mr-2 border"
                                    activeOpacity={0.8}
                                    style={{
                                        backgroundColor: isSelected ? '#ea580c' : '#f9fafb',
                                        borderColor: isSelected ? '#ea580c' : '#f3f4f6',
                                        shadowColor: isSelected ? '#f97316' : '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: isSelected ? 0.2 : 0.02,
                                        shadowRadius: 5,
                                        elevation: isSelected ? 3 : 1
                                    }}
                                >
                                    <Text className="mr-1.5 text-sm">{cat.icon}</Text>
                                    <Text
                                        className={`text-xs font-bold tracking-wide ${
                                            isSelected ? 'text-white' : 'text-gray-700'
                                        }`}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {/* State/District Pickers */}
                {(selectedCategory === 'State' || selectedCategory === 'राज्य' || selectedCategory === 'District' || selectedCategory === 'जिला') && activeTab === 'apna' && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', height: 50, justifyContent: 'center' }}>
                                <Picker
                                    selectedValue={selectedState}
                                    onValueChange={(itemValue, itemIndex) => {
                                        if (itemIndex > 0) {
                                            const st = statesList[itemIndex - 1];
                                            handleStateChange(st.name, st.id);
                                        } else {
                                            handleStateChange('', '');
                                        }
                                    }}
                                    style={{ height: 50 }}
                                >
                                    <Picker.Item label="Select State" value="" style={{ fontSize: 13 }} />
                                    {statesList.map((st, idx) => (
                                        <Picker.Item key={idx} label={st.name} value={st.name} style={{ fontSize: 13 }} />
                                    ))}
                                </Picker>
                            </View>

                            {(selectedCategory === 'District' || selectedCategory === 'जिला') && (
                                <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', height: 50, justifyContent: 'center' }}>
                                    <Picker
                                        selectedValue={selectedDistrict}
                                        onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                                        style={{ height: 50 }}
                                        enabled={districtsList.length > 0}
                                    >
                                        <Picker.Item label="Select District" value="" style={{ fontSize: 13 }} />
                                        {districtsList.map((dst, idx) => (
                                            <Picker.Item key={idx} label={dst.name} value={dst.name} style={{ fontSize: 13 }} />
                                        ))}
                                    </Picker>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </Animated.View>

            {/* Sibling Sticky Ticker (to bypass Android culling when header goes off-screen) */}
            {activeTab === 'apna' && tickerData.length > 0 && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        zIndex: 30,
                        transform: [{ translateY: tickerAbsoluteTranslateY }],
                    }}
                >
                    <NewsTicker tickerData={tickerData} />
                </Animated.View>
            )}

            {/* List Content */}
            {activeTab === 'apna' && (
                loading ? (
                    <Animated.FlatList
                        key="apna-skeleton-list"
                        data={[1, 2, 3, 4]}
                        keyExtractor={(item: any) => item.toString()}
                        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 12 }}
                        renderItem={renderApnaNewsSkeleton}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                    />
                ) : (
                    <Animated.FlatList
                        key="apna-data-list"
                        data={Array.isArray(filteredNews) ? filteredNews : []}
                        keyExtractor={(item: any, index: number) => item?.id?.toString() || index.toString()}
                        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 12 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshApna} colors={['#ea580c']} tintColor="#ea580c" progressViewOffset={headerHeight} />}
                        renderItem={renderNewsItem}
                        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">{t('noNewsAvailable')}</Text>}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                    />
                )
            )}
            
            {activeTab === 'ddnews' && (
                ytLoading ? (
                    <FlashList
                        data={[1, 2]}
                        keyExtractor={(item) => item.toString()}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        renderItem={renderVideoNewsSkeleton}
                    />
                ) : (
                    <FlashList
                        data={Array.isArray(ytNews) ? ytNews.filter((item: any) => !searchQuery.trim() || item.title?.toLowerCase().includes(searchQuery.toLowerCase())) : []}
                        keyExtractor={(item, index) => item?.videoId || item?.link || index.toString()}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        refreshControl={<RefreshControl refreshing={ytRefreshing} onRefresh={onRefreshYT} colors={['#dc2626']} tintColor="#dc2626" />}
                        renderItem={renderYTNewsItem}
                        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">{t('noVideosAvailable')}</Text>}
                    />
                )
            )}

            {activeTab === 'aastha' && (
                aasthaLoading ? (
                    <FlashList
                        data={[1, 2]}
                        keyExtractor={(item) => item.toString()}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        renderItem={renderVideoNewsSkeleton}
                    />
                ) : (
                    <FlashList
                        data={Array.isArray(aasthaNews) ? aasthaNews.filter((item: any) => !searchQuery.trim() || item.title?.toLowerCase().includes(searchQuery.toLowerCase())) : []}
                        keyExtractor={(item, index) => item?.videoId || item?.link || index.toString()}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        refreshControl={<RefreshControl refreshing={aasthaRefreshing} onRefresh={onRefreshAastha} colors={['#d97706']} tintColor="#d97706" />}
                        renderItem={renderYTNewsItem}
                        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">{t('noStreamsAvailable')}</Text>}
                    />
                )
            )}

            {/* In-App Video Player Modal using WebView */}
            <Modal
                visible={!!selectedVideoId}
                animationType="slide"
                onRequestClose={() => setSelectedVideoId(null)}
                // In iOS pageSheet makes it easily swipeable, on Android it opens fully
                presentationStyle="pageSheet"
            >
                <SafeAreaView className="flex-1 bg-black">
                    <View className="flex-row items-center justify-between p-4 bg-black">
                        <Text className="text-white font-bold text-lg">{t('videoNewsPlayer')}</Text>
                        <TouchableOpacity onPress={() => setSelectedVideoId(null)} className="p-1.5 rounded-full bg-white/20">
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1 justify-center bg-black">
                        {selectedVideoId && (
                            <View style={{ width: '100%', aspectRatio: 16/9 }}>
                                <WebView
                                    source={{ 
                                        html: `
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                            <style>
                                                body { margin: 0; padding: 0; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; width: 100vw; overflow: hidden; }
                                                iframe { width: 100%; height: 100%; border: none; }
                                            </style>
                                        </head>
                                        <body>
                                            <iframe 
                                                src="https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&playsinline=1&rel=0&origin=https://sadhuvandna.com" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                allowfullscreen>
                                            </iframe>
                                        </body>
                                        </html>
                                        `,
                                        baseUrl: 'https://sadhuvandna.com/'
                                     }}
                                    allowsFullscreenVideo={true}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    mediaPlaybackRequiresUserAction={false}
                                    style={{ flex: 1, backgroundColor: 'black' }}
                                    scrollEnabled={false}
                                    bounces={false}
                                />
                            </View>
                        )}
                        <Text className="text-gray-400 text-center mt-6 px-6 leading-5 text-sm">
                            You are watching this video securely without leaving the app. Wait for the video to buffer.
                        </Text>
                    </View>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

export default NewsScreen;
