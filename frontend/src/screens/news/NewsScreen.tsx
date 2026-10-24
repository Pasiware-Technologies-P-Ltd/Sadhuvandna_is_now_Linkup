import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Share,
    Modal,
    RefreshControl,
    Animated,
    Easing,
    Alert,
    Linking,
    ScrollView,
    TextInput,
    StyleSheet,
    Platform,
    StatusBar,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsFocused } from '@react-navigation/native';
import api, { API_BASE_URL, WEBSITE_URL, getFullPaymentUrl } from '../../services/api';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import { ImageService } from '../../services/ImageService';
import { useTabSwipe } from '../../utils/useTabSwipe';
import LinkUpHeader, { TOP_HEADER_COLLAPSE } from '../../components/LinkUpHeader';
import { getVideoThumbnail } from '../../utils/thumbnailHelper';

const { width } = Dimensions.get('window');
const NEWS_URL = `${WEBSITE_URL}/uploads/news/`;

const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatViews = (item: any) => {
    if (item?.views || item?.view_count) {
        const v = Number(item.views || item.view_count);
        if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
        return `${v}`;
    }
    const pseudo = ((Number(item?.id || 1) * 739) % 18000) + 1400;
    return `${(pseudo / 1000).toFixed(1)}K`;
};

const getCategoryInfo = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('national') || cat.includes('राष्ट्रीय')) {
        return { label: 'National', color: '#0284C7', bg: '#E0F2FE', icon: 'flash' as const };
    }
    if (cat.includes('state') || cat.includes('राज्य')) {
        return { label: 'State', color: '#1877F2', bg: '#EFF6FF', icon: 'business' as const };
    }
    if (cat.includes('district') || cat.includes('जिला') || cat.includes('local') || cat.includes('स्थानीय')) {
        return { label: 'Local', color: '#EF4444', bg: '#FEF2F2', icon: 'location' as const };
    }
    if (cat.includes('crime') || cat.includes('अपराध') || cat.includes('accident') || cat.includes('दुर्घटना')) {
        return { label: 'Alert', color: '#DC2626', bg: '#FEE2E2', icon: 'warning' as const };
    }
    return { label: category || 'News', color: '#0284C7', bg: '#E0F2FE', icon: 'flash' as const };
};

const getItemVisuals = (item: any) => {
    const title = (item?.title || '').toLowerCase();
    if (title.includes('murari') || title.includes('national') || title.includes('bapu')) {
        return {
            category: 'National',
            badgeBg: '#E0F2FE',
            badgeColor: '#0284C7',
            icon: 'flash' as const,
            views: '12.4K Views',
        };
    }
    if (title.includes('मस्जिद') || title.includes('fir') || title.includes('राज्य')) {
        return {
            category: 'State',
            badgeBg: '#EFF6FF',
            badgeColor: '#1877F2',
            icon: 'business' as const,
            views: '8.7K Views',
        };
    }
    if (title.includes('बारिश') || title.includes('ncr') || title.includes('जलभराव') || title.includes('local')) {
        return {
            category: 'Local',
            badgeBg: '#FEF2F2',
            badgeColor: '#EF4444',
            icon: 'location' as const,
            views: '15.2K Views',
        };
    }

    const cat = getCategoryInfo(item?.category);
    return {
        category: cat.label,
        badgeBg: cat.bg,
        badgeColor: cat.color,
        icon: cat.icon,
        views: `${formatViews(item)} Views`,
    };
};

const CATEGORY_MAP = [
    { id: 'All', nameEn: 'All', nameHi: 'सभी', icon: '🌐' },
    { id: 'ताज़ा खबर', nameEn: 'Latest News', nameHi: 'ताज़ा खबर', icon: '⚡' },
    { id: 'राष्ट्रीय', nameEn: 'National', nameHi: 'राष्ट्रीय', icon: '🇮🇳' },
    { id: 'राज्य', nameEn: 'State', nameHi: 'राज्य', icon: '🏛️' },
    { id: 'जिला', nameEn: 'Local', nameHi: 'जिला', icon: '📍' },
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
    { id: 'विज्ञापन', nameEn: 'Advertisement', nameHi: 'विज्ञापन', icon: '📢' },
];

const isVideoFile = (filename: string) => /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(filename || '');

const BreakingNewsMarquee = React.memo(({
    tickerData,
    onPress,
}: {
    tickerData: string[];
    onPress?: () => void;
}) => {
    const { isDarkMode, theme } = useTheme();
    const scrollAnim = useRef(new Animated.Value(0)).current;
    const contentWidthRef = useRef(0);
    const [contentWidth, setContentWidth] = useState(0);

    const safeTicker = useMemo(() => {
        return tickerData && tickerData.length > 0
            ? tickerData
            : [
                'उज्जैन में सड़क चौड़ीकरण के लिए शाही मस्जिद का हिस्सा हटाने पर बवाल',
                'लद्दाख में 5 अगस्त को बंद का आह्वान: जनजीवन प्रभावित',
                'UN में स्थायी सीट के लिए 4 यूरोपीय देशों ने किया भारत का समर्थन'
            ];
    }, [tickerData]);

    const tickerKey = useMemo(() => safeTicker.join('|||'), [safeTicker]);

    // Ensure base chain is wide enough for seamless infinite scrolling
    const itemsToRender = useMemo(() => {
        const base = safeTicker.length < 3 ? [...safeTicker, ...safeTicker, ...safeTicker] : safeTicker;
        return [...base, ...base];
    }, [safeTicker]);

    useEffect(() => {
        setContentWidth(0);
        contentWidthRef.current = 0;
    }, [tickerKey]);

    useEffect(() => {
        if (contentWidth <= 0) return;
        scrollAnim.setValue(0);
        const halfWidth = contentWidth / 2;
        // Broadcast speed: ~32ms per pixel for comfortable reading
        const duration = Math.max(Math.round(halfWidth * 32), 6000);
        const anim = Animated.loop(
            Animated.timing(scrollAnim, {
                toValue: -halfWidth,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        anim.start();
        return () => anim.stop();
    }, [contentWidth, tickerKey]);

    return (
        <TouchableOpacity
            style={[styles.breakingTickerBanner, { backgroundColor: isDarkMode ? '#0F172A' : '#071F46', borderColor: isDarkMode ? theme.border : 'rgba(255, 255, 255, 0.08)' }]}
            activeOpacity={0.9}
            onPress={onPress}
        >
            {/* Left Static Badge */}
            <View style={styles.breakingPillTag}>
                <Ionicons name="flash" size={13} color="white" style={{ marginRight: 5 }} />
                <Text style={styles.breakingPillTagText}>BREAKING</Text>
            </View>

            {/* Marquee Viewport with Horizontal Scroll to guarantee single line on Android */}
            <View style={styles.marqueeViewport}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    contentContainerStyle={{ alignItems: 'center' }}
                >
                    <Animated.View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            transform: [{ translateX: scrollAnim }],
                        }}
                        onLayout={(e) => {
                            const w = e.nativeEvent.layout.width;
                            // Only set width once, or if there's a major change (>100px) when ticker changes
                            if (w > 0 && (contentWidthRef.current === 0 || Math.abs(w - contentWidthRef.current) > 100)) {
                                contentWidthRef.current = w;
                                setContentWidth(w);
                            }
                        }}
                    >
                        {itemsToRender.map((item: string, idx: number) => {
                            const clean = (item || '').replace(/[\r\n\t]+/g, ' ').trim();
                            return (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                                    <Text
                                        style={styles.marqueeItemText}
                                        numberOfLines={1}
                                        ellipsizeMode="clip"
                                    >
                                        {clean}
                                    </Text>
                                    <Text style={styles.marqueeBullet}>•</Text>
                                </View>
                            );
                        })}
                    </Animated.View>
                </ScrollView>
            </View>

            {/* Right Static Chevron */}
            <View style={styles.marqueeChevronWrap}>
                <Ionicons name="chevron-forward" size={18} color="white" />
            </View>
        </TouchableOpacity>
    );
});

// Lightweight cached video thumbnail to avoid heavy Video player instances in lists
const NewsVideoThumbnail = React.memo(({ videoUri }: { videoUri: string }) => {
    const [thumbUri, setThumbUri] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        getVideoThumbnail(videoUri).then((thumb) => {
            if (isMounted && thumb) {
                setThumbUri(thumb);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [videoUri]);

    return (
        <ExpoImage
            source={{ uri: thumbUri || videoUri }}
            style={styles.newsCardThumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
        />
    );
});

// Google Banner Ad Card with dedicated space and label
const NewsAdBanner = React.memo(({ theme }: { theme: any }) => {
    return (
        <View style={[styles.adContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.adHeaderRow}>
                <Ionicons name="sparkles" size={10} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text style={styles.adHeaderText}>SPONSORED / ADVERTISEMENT</Text>
            </View>
            <BannerAd
                unitId="ca-app-pub-3506685647762869/7649518863"
                size={BannerAdSize.BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
        </View>
    );
});

// Self-contained Hero Card so high-frequency video status updates don't re-render NewsScreen
const HeroNewsCard = React.memo(({
    heroItem,
    navigation,
}: {
    heroItem: any;
    navigation: any;
}) => {
    const [isHeroMuted, setIsHeroMuted] = useState(false);
    const [isHeroPlaying, setIsHeroPlaying] = useState(false);
    const [heroStatus, setHeroStatus] = useState<any>({});
    const heroVideoRef = useRef<any>(null);

    const heroImages = heroItem?.images || [];
    const isHeroVideo = isVideoFile(heroImages[0] || '');
    const heroMediaUrl = heroImages.length > 0
        ? (isHeroVideo ? `${NEWS_URL}${heroImages[0]}` : ImageService.getFeedImageUrl(`${NEWS_URL}${heroImages[0]}`, 800))
        : 'https://via.placeholder.com/600x340?text=News';

    return (
        <View style={styles.heroCardContainer}>
            <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('NewsDetail', { news: heroItem })}
            >
                {isHeroVideo ? (
                    <Video
                        ref={heroVideoRef}
                        source={{ uri: heroMediaUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={isHeroPlaying}
                        isMuted={isHeroMuted}
                        onPlaybackStatusUpdate={(s: any) => {
                            if (s.isLoaded) setHeroStatus(s);
                        }}
                    />
                ) : (
                    <ExpoImage
                        source={{ uri: heroMediaUrl }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Top Overlay: Breaking News Badge + Sound Icon */}
                <View style={styles.heroTopRow}>
                    <View style={styles.heroBreakingBadge}>
                        <Ionicons name="flash" size={11} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.heroBreakingBadgeText}>Breaking News</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.heroSoundButton}
                        onPress={() => setIsHeroMuted(!isHeroMuted)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isHeroMuted ? "volume-mute" : "volume-high"} size={16} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Center Play Button Overlay */}
                <TouchableOpacity
                    style={styles.heroCenterPlay}
                    onPress={() => {
                        if (isHeroVideo) {
                            setIsHeroPlaying(!isHeroPlaying);
                        } else {
                            navigation.navigate('NewsDetail', { news: heroItem });
                        }
                    }}
                    activeOpacity={0.85}
                >
                    <View style={styles.heroPlayCircle}>
                        <Ionicons name={isHeroPlaying ? "pause" : "play"} size={26} color="white" style={{ marginLeft: isHeroPlaying ? 0 : 3 }} />
                    </View>
                </TouchableOpacity>

                {/* Bottom Overlay Info */}
                <View style={styles.heroBottomOverlay}>
                    <Text
                        style={styles.heroTitle}
                        numberOfLines={2}
                        textBreakStrategy="highQuality"
                        android_hyphenationFrequency="normal"
                    >
                        {heroItem.title}
                    </Text>

                    {/* Blue Video Progress Line */}
                    <View style={styles.heroProgressBar}>
                        <View
                            style={[
                                styles.heroProgressFill,
                                heroStatus.durationMillis
                                    ? { width: `${(heroStatus.positionMillis / heroStatus.durationMillis) * 100}%` }
                                    : null,
                            ]}
                        />
                    </View>

                    {/* Meta row: Date and Duration */}
                    <View style={styles.heroMetaRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={13} color="white" style={{ marginRight: 5 }} />
                            <Text style={styles.heroMetaText}>
                                {heroItem.created_at?.split(' ')[0] || '2026-10-11'}  |  {heroItem.district || heroItem.state || 'न्यूज़'}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.heroMetaText}>
                                {isHeroVideo && heroStatus.positionMillis
                                    ? `${formatTime(heroStatus.positionMillis)} / ${formatTime(heroStatus.durationMillis || 55000)}`
                                    : '0:01 / 0:55'}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('NewsDetail', { news: heroItem })}>
                                <Ionicons name="expand" size={15} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Carousel Dots */}
            <View style={styles.carouselDotsRow}>
                <View style={[styles.carouselDot, styles.carouselDotActive]} />
                <View style={styles.carouselDot} />
                <View style={styles.carouselDot} />
                <View style={styles.carouselDot} />
            </View>
        </View>
    );
});

const NewsScreen = ({ navigation }: any) => {
    const { language, t } = useLanguage();
    const { isDarkMode, theme } = useTheme();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top;

    const [user, setUser] = useState<any>(null);
    const tabSwipe = useTabSwipe({ currentTab: 'News', isBusiness: user?.is_business == 1 });

    const [activeTab, setActiveTab] = useState<'apna' | 'ddnews' | 'aastha'>('apna');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);

    // States & Districts
    const [statesList, setStatesList] = useState<any[]>([]);
    const [districtsList, setDistrictsList] = useState<any[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    // Data States
    const [news, setNews] = useState<any[]>([]);
    const [tickerData, setTickerData] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const cursorRef = useRef<number | null>(null);

    // DD News & Aastha
    const [ytNews, setYtNews] = useState<any[]>([]);
    const [ytLoading, setYtLoading] = useState(false);
    const [ytRefreshing, setYtRefreshing] = useState(false);

    const [aasthaNews, setAasthaNews] = useState<any[]>([]);
    const [aasthaLoading, setAasthaLoading] = useState(false);
    const [aasthaRefreshing, setAasthaRefreshing] = useState(false);

    // Video modal & menu
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [menuNewsItem, setMenuNewsItem] = useState<any | null>(null);
    const [bookmarks, setBookmarks] = useState<string[]>([]);

    // Anchor status
    const [userId, setUserId] = useState<number | null>(null);
    const [anchorStatus, setAnchorStatus] = useState<string | null>(null);
    const [isAnchorPaid, setIsAnchorPaid] = useState<boolean>(false);
    const [anchorFee, setAnchorFee] = useState<number>(100);
    const [anchorPaymentUrl, setAnchorPaymentUrl] = useState<string>('');

    // Facebook-style smooth auto-collapsing header (native driver)
    const headerAnim = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const accumulatedScroll = useRef(0);
    const isHeaderHidden = useRef(false);
    const listRef = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMounted = useRef(true);

    const animateHeader = useCallback((toHide: boolean) => {
        if (isHeaderHidden.current === toHide) return;
        isHeaderHidden.current = toHide;
        Animated.timing(headerAnim, {
            toValue: toHide ? -TOP_HEADER_COLLAPSE : 0,
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
        }).start();
    }, [headerAnim]);

    const handleFeedScroll = useCallback((event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        if (currentY <= 10) {
            accumulatedScroll.current = 0;
            animateHeader(false);
            return;
        }

        if (diff > 0) {
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current > 40) {
                animateHeader(true);
            }
        } else if (diff < 0) {
            accumulatedScroll.current += diff;
            if (accumulatedScroll.current < -30) {
                animateHeader(false);
            }
        }
    }, [animateHeader]);

    const fetchAnchorStatus = async () => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            const u = uStr ? JSON.parse(uStr) : null;
            if (u) {
                setUser(u);
                if (u.id) {
                    setUserId(u.id);
                    const res = await api.get(`/check_anchor_status.php?user_id=${u.id}`);
                    if (res.data && res.data.status === 'success') {
                        setAnchorStatus(res.data.anchor_status);
                        setIsAnchorPaid(!!res.data.paid);
                        if (res.data.fee) setAnchorFee(res.data.fee);
                        if (res.data.payment_url) setAnchorPaymentUrl(res.data.payment_url);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to check anchor status', e);
        }
    };

    const loadBookmarks = async () => {
        try {
            const saved = await AsyncStorage.getItem('bookmarked_news');
            if (saved) setBookmarks(JSON.parse(saved));
        } catch (e) { }
    };

    const toggleBookmark = async (id: string) => {
        try {
            const updated = bookmarks.includes(id)
                ? bookmarks.filter((b) => b !== id)
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

    const handleShare = async (item: any) => {
        try {
            const newsUrl = `${WEBSITE_URL}/view_news.php?id=${item.id}`;
            const message = `${item.title}\n\n${item.description?.substring(0, 100)}...\n\nOpen in LinkUp: ${newsUrl}`;
            await Share.share({ message, url: newsUrl });
        } catch (error: any) { }
    };

    const fetchStates = async () => {
        try {
            const res = await api.get('/get_states.php');
            if (res.data && res.data.status === 'success') {
                setStatesList(res.data.data);
            }
        } catch (err) { }
    };

    const fetchDistricts = async (stateId: string) => {
        try {
            const res = await api.get(`/get_districts.php?state_id=${stateId}`);
            if (res.data && res.data.status === 'success') {
                setDistrictsList(res.data.data);
            }
        } catch (err) { }
    };

    const handleStateChange = (stateName: string, stateId: string) => {
        setSelectedState(stateName);
        setSelectedDistrict('');
        setDistrictsList([]);
        if (stateId) fetchDistricts(stateId);
    };

    const loadCachedData = async () => {
        let hasNewsCache = false;
        try {
            const cachedNews = await AsyncStorage.getItem('cached_news_v1');
            if (cachedNews) {
                const parsed = JSON.parse(cachedNews);
                setNews(parsed);
                setTickerData(parsed.slice(0, 5).map((n: any) => n.title));
                setLoading(false);
                hasNewsCache = true;
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
        } catch (e) { }
        return hasNewsCache;
    };

    const fetchNews = async (isMore = false, isRefresh = false, isSilent = false) => {
        if (isMore && (isFetchingMore || !hasMore)) return;

        if (isMore) setIsFetchingMore(true);
        else if (isRefresh) setRefreshing(true);
        else if (!isSilent) setLoading(true);

        if (!isMore) {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();
        }

        try {
            const cursorParam = isMore && cursorRef.current ? `?limit=20&cursor=${cursorRef.current}` : '?limit=20';
            const res = await api.get(`/get_news.php${cursorParam}`, {
                signal: isMore ? undefined : abortControllerRef.current?.signal,
            });
            if (isMounted.current && res.data.status === 'success') {
                const newsList = res.data.data || [];
                setHasMore(res.data.has_more);
                cursorRef.current = res.data.next_cursor;

                if (isMore) {
                    setNews((prev) => {
                        const existingIds = new Set(prev.map((n) => n.id));
                        const uniqueNew = newsList.filter((n: any) => !existingIds.has(n.id));
                        return [...prev, ...uniqueNew];
                    });
                } else {
                    const newStringified = JSON.stringify(newsList);
                    const cachedStr = await AsyncStorage.getItem('cached_news_v1');
                    if (!isSilent || cachedStr !== newStringified) {
                        setNews(newsList);
                        AsyncStorage.setItem('cached_news_v1', newStringified);
                    }
                }

                if (res.data.ticker && res.data.ticker.length > 0) {
                    setTickerData(res.data.ticker);
                } else if (newsList && newsList.length > 0) {
                    setTickerData(newsList.slice(0, 5).map((n: any) => n.title));
                }
            }
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.message === 'canceled') return;
            console.error('Failed to fetch news', error);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
                setIsFetchingMore(false);
            }
        }
    };

    const onRefreshApna = async () => {
        cursorRef.current = null;
        await Promise.all([fetchNews(false, true), fetchAnchorStatus()]);
    };

    const fetchYTNews = async (isRefresh = false) => {
        if (!isRefresh && ytNews.length === 0) setYtLoading(true);
        try {
            const res = await api.get('/get_video_news.php', {
                signal: abortControllerRef.current?.signal,
            });
            if (isMounted.current && res.data.status === 'success') {
                setYtNews(res.data.data);
                AsyncStorage.setItem('cached_yt_news_v1', JSON.stringify(res.data.data));
            }
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.message === 'canceled') return;
            console.error('Failed to fetch DD news', error);
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
            const res = await api.get('/get_aastha.php', {
                signal: abortControllerRef.current?.signal,
            });
            if (isMounted.current && res.data.status === 'success') {
                setAasthaNews(res.data.data);
                AsyncStorage.setItem('cached_aastha_news_v1', JSON.stringify(res.data.data));
            }
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.message === 'canceled') return;
            console.error('Failed to fetch Aastha news', error);
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
        const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (shortMatch) return shortMatch[1];
        return null;
    };

    useEffect(() => {
        isMounted.current = true;
        loadBookmarks();
        fetchAnchorStatus();
        fetchStates();

        loadCachedData().then((hasCache) => {
            fetchNews(false, false, hasCache);
            fetchYTNews(true);
            fetchAasthaNews(true);
        });

        const unsubscribe = navigation.addListener('focus', () => {
            loadBookmarks();
            fetchAnchorStatus();
            fetchNews(false, false, true);
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
            unsubscribeBlur();
        };
    }, [navigation]);

    // Filtered news calculation
    const filteredNews = (selectedCategory === 'All'
        ? news
        : news.filter((item: any) => {
            const catObj = CATEGORY_MAP.find((c) => c.id === selectedCategory);
            if (!catObj) return item.category === selectedCategory;
            return item.category === catObj.id || item.category === catObj.nameEn || item.category === catObj.nameHi;
        })
    )
        .filter((item: any) => {
            if (selectedCategory === 'State' || selectedCategory === 'राज्य') {
                return !selectedState || item.state === selectedState;
            }
            if (selectedCategory === 'District' || selectedCategory === 'जिला' || selectedCategory === 'Local') {
                return (!selectedState || item.state === selectedState) && (!selectedDistrict || item.district === selectedDistrict);
            }
            return true;
        })
        .filter(
            (item: any) =>
                !searchQuery.trim() ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Hero news item (first item)
    const heroItem = filteredNews.length > 0 ? filteredNews[0] : null;

    // List news items (from index 1 onwards so hero isn't duplicated)
    const listNewsItems = filteredNews.length > 1 ? filteredNews.slice(1) : [];

    const checkAnchorPaymentAndProceed = async (title: string, message: string) => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            const u = uStr ? JSON.parse(uStr) : null;
            if (!u || !u.id) {
                Alert.alert('Login Required', 'Please login to continue.');
                return;
            }

            const res = await api.get(`/check_anchor_status.php?user_id=${u.id}`);
            if (res.data && res.data.status === 'success') {
                const paid = !!res.data.paid;
                const fee = res.data.fee || 100;
                const pUrl = res.data.payment_url ? getFullPaymentUrl(res.data.payment_url) : '';

                if (!paid) {
                    Alert.alert(
                        'Application Fee Required',
                        `To apply for News Anchor verification, a one-time registration fee of ₹${fee} is required. Would you like to pay now?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Pay Now',
                                onPress: () => {
                                    if (pUrl) {
                                        Linking.openURL(pUrl);
                                    } else {
                                        Alert.alert('Error', 'Payment URL is not available. Please try again.');
                                    }
                                }
                            }
                        ]
                    );
                    return;
                }

                // If already paid, navigate to the application form
                navigation.navigate('ApplyJob', { jobId: 'anchor', jobTitle: 'News Anchor', isAnchorApplication: true });
            } else {
                Alert.alert('Error', res.data?.message || 'Failed to verify anchor status.');
            }
        } catch (e) {
            console.error('Error verifying anchor payment:', e);
            Alert.alert('Error', 'Unable to check application payment status.');
        }
    };

    // Handlers for Anchor buttons
    const handleBreakingPress = () => {
        if (anchorStatus === 'Approved') {
            navigation.navigate('PostBreakingNews');
        } else {
            Alert.alert(
                'Breaking News',
                'Only verified news anchors can post live breaking news. Would you like to apply?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Apply', onPress: () => checkAnchorPaymentAndProceed('Breaking News', 'Only verified news anchors can post live breaking news.') },
                ]
            );
        }
    };

    const handlePostNewsPress = () => {
        if (anchorStatus === 'Approved') {
            navigation.navigate('CreateNews');
        } else if (anchorStatus === 'Pending') {
            Alert.alert(t('pendingApproval'), t('pendingApprovalMsg'));
        } else {
            Alert.alert(
                'News Anchor Required',
                'Posting news requires anchor verification. Would you like to apply?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Apply', onPress: () => checkAnchorPaymentAndProceed('News Anchor Required', 'Posting news requires anchor verification.') },
                ]
            );
        }
    };

    // Subheader & Controls rendered in ListHeaderComponent
    const renderListHeader = useCallback(() => (
        <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
            {/* 1. News & Updates Title Row (Sleek, balanced layout with no awkward wrap) */}
            <View style={styles.titleRow}>
                <View style={styles.titleTextWrap}>
                    <Text style={[styles.screenHeading, { color: theme.text }]}>News & Updates</Text>
                    <Text style={[styles.screenSubheading, { color: theme.textMuted }]} numberOfLines={1}>
                        Stay Informed • Stay Connected
                    </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                        style={styles.breakingButton}
                        onPress={handleBreakingPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="flash" size={12} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.breakingButtonText}>Breaking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.postNewsButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={handlePostNewsPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="create-outline" size={13} color="#1877F2" style={{ marginRight: 4 }} />
                        <Text style={styles.postNewsButtonText}>Post News</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 2. Source / Channel Tabs Capsule (Matches cropped screenshot 100%) */}
            <View style={[styles.channelTabsCapsule, { backgroundColor: isDarkMode ? '#1E293B' : '#F3F8FD', borderColor: theme.border }]}>
                <TouchableOpacity
                    style={[activeTab === 'apna' ? styles.channelPillActive : styles.channelPillInactive, activeTab === 'apna' && { backgroundColor: isDarkMode ? '#334155' : 'white' }]}
                    onPress={() => setActiveTab('apna')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="newspaper"
                        size={17}
                        color={activeTab === 'apna' ? '#1877F2' : theme.textMuted}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[activeTab === 'apna' ? styles.channelTextActive : styles.channelTextInactive, { color: activeTab === 'apna' ? theme.text : theme.textMuted }]}>
                        Apna News
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[activeTab === 'ddnews' ? styles.channelPillActive : styles.channelPillInactive, activeTab === 'ddnews' && { backgroundColor: isDarkMode ? '#334155' : 'white' }]}
                    onPress={() => setActiveTab('ddnews')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="logo-youtube"
                        size={16}
                        color={activeTab === 'ddnews' ? '#DC2626' : theme.textMuted}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[activeTab === 'ddnews' ? styles.channelTextActive : styles.channelTextInactive, { color: activeTab === 'ddnews' ? theme.text : theme.textMuted }]}>
                        DD News
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[activeTab === 'aastha' ? styles.channelPillActive : styles.channelPillInactive, activeTab === 'aastha' && { backgroundColor: isDarkMode ? '#334155' : 'white' }]}
                    onPress={() => setActiveTab('aastha')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="flower-outline"
                        size={16}
                        color={activeTab === 'aastha' ? '#D97706' : theme.textMuted}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[activeTab === 'aastha' ? styles.channelTextActive : styles.channelTextInactive, { color: activeTab === 'aastha' ? theme.text : theme.textMuted }]}>
                        Aastha
                    </Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity
                    style={styles.capsuleSearchBtn}
                    onPress={() => setIsSearchActive(!isSearchActive)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="search" size={20} color={theme.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Search Input Box */}
            {isSearchActive && (
                <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="search" size={18} color={theme.textMuted} style={{ marginHorizontal: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={t('searchNewsUpdates')}
                        placeholderTextColor={theme.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    <TouchableOpacity
                        onPress={() => {
                            setIsSearchActive(false);
                            setSearchQuery('');
                        }}
                        style={{ padding: 6 }}
                    >
                        <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                </View>
            )}

            {/* 3. Live Animated Breaking News Marquee Banner */}
            {activeTab === 'apna' && (
                <BreakingNewsMarquee
                    tickerData={tickerData}
                    onPress={() => {
                        if (heroItem) navigation.navigate('NewsDetail', { news: heroItem });
                    }}
                />
            )}

            {/* 4. Category Filter Chips (Horizontal Scroll) */}
            {activeTab === 'apna' && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryChipsContainer}
                >
                    {CATEGORY_MAP.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const label = language === 'en' ? cat.nameEn : cat.nameHi;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setSelectedCategory(cat.id)}
                                style={[styles.categoryChip, { backgroundColor: isDarkMode ? '#1E293B' : 'white', borderColor: theme.border }, isSelected && styles.categoryChipActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={{ marginRight: 6, fontSize: 13 }}>{cat.icon}</Text>
                                <Text style={[styles.categoryChipText, { color: theme.text }, isSelected && styles.categoryChipTextActive]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* State & District Dropdown Pickers */}
            {(selectedCategory === 'State' || selectedCategory === 'राज्य' || selectedCategory === 'District' || selectedCategory === 'जिला' || selectedCategory === 'Local') && activeTab === 'apna' && (
                <View style={styles.locationPickersContainer}>
                    <View style={[styles.pickerBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                            style={{ height: 46, color: theme.text }}
                            dropdownIconColor={theme.text}
                        >
                            <Picker.Item label="Select State" value="" style={{ fontSize: 13, color: theme.text, backgroundColor: theme.card }} />
                            {statesList.map((st, idx) => (
                                <Picker.Item key={idx} label={st.name} value={st.name} style={{ fontSize: 13, color: theme.text, backgroundColor: theme.card }} />
                            ))}
                        </Picker>
                    </View>

                    {(selectedCategory === 'District' || selectedCategory === 'जिला' || selectedCategory === 'Local') && (
                        <View style={[styles.pickerBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Picker
                                selectedValue={selectedDistrict}
                                onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                                style={{ height: 46, color: theme.text }}
                                enabled={districtsList.length > 0}
                                dropdownIconColor={theme.text}
                            >
                                <Picker.Item label="Select District" value="" style={{ fontSize: 13, color: theme.text, backgroundColor: theme.card }} />
                                {districtsList.map((dst, idx) => (
                                    <Picker.Item key={idx} label={dst.name} value={dst.name} style={{ fontSize: 13, color: theme.text, backgroundColor: theme.card }} />
                                ))}
                            </Picker>
                        </View>
                    )}
                </View>
            )}

            {/* 5. Hero Breaking News Video/Image Card */}
            {activeTab === 'apna' && heroItem && (
                <HeroNewsCard
                    heroItem={heroItem}
                    navigation={navigation}
                />
            )}
        </View>
    ), [
        activeTab,
        selectedCategory,
        searchQuery,
        isSearchActive,
        statesList,
        districtsList,
        selectedState,
        selectedDistrict,
        heroItem,
        tickerData,
        anchorStatus,
        language,
        navigation,
        isDarkMode,
        theme
    ]);

    // News item card renderer (matching the cards in the screenshot)
    const renderNewsItem = ({ item, index }: { item: any; index: number }) => {
        if (!item) return null;
        const images = item.images || [];
        const isVideo = isVideoFile(images[0] || '');
        const displayMediaUrl = images.length > 0
            ? (isVideo ? `${NEWS_URL}${images[0]}` : ImageService.getFeedImageUrl(`${NEWS_URL}${images[0]}`, 400))
            : 'https://via.placeholder.com/300x200?text=News';
        const visuals = getItemVisuals(item);
        const cleanDesc = (item.description || '')
            .replace(/\[aspect:[^\]]+\]/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return (
            <View key={item.id || index}>
                <TouchableOpacity
                    style={[styles.newsCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('NewsDetail', { news: item })}
                >
                    {/* Left Thumbnail with Play Button */}
                    <View style={styles.newsCardThumbnailWrapper}>
                        {isVideo ? (
                            <NewsVideoThumbnail videoUri={displayMediaUrl} />
                        ) : (
                            <ExpoImage
                                source={{ uri: displayMediaUrl }}
                                style={styles.newsCardThumbnail}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        )}
                        <View style={styles.thumbnailPlayCircle}>
                            <Ionicons name="play" size={15} color="white" style={{ marginLeft: 2 }} />
                        </View>
                    </View>

                    {/* Right Details */}
                    <View style={styles.newsCardBody}>
                        {/* Top: Category Tag + 3 Dots Menu */}
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.cardCategoryBadge, { backgroundColor: isDarkMode ? `${visuals.badgeColor}22` : visuals.badgeBg }]}>
                                <Ionicons name={visuals.icon} size={10} color={visuals.badgeColor} style={{ marginRight: 3 }} />
                                <Text style={[styles.cardCategoryText, { color: visuals.badgeColor }]}>
                                    {visuals.category}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setMenuNewsItem(item)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Title (Bold Headline) */}
                        <Text
                            style={[styles.cardTitle, { color: theme.text }]}
                            numberOfLines={cleanDesc ? 1 : 2}
                            textBreakStrategy="highQuality"
                            android_hyphenationFrequency="normal"
                        >
                            {item.title}
                        </Text>

                        {/* News Content / Description Snippet (Justified) */}
                        {cleanDesc ? (
                            <Text
                                style={[styles.cardContent, { color: isDarkMode ? '#94A3B8' : '#475569' }]}
                                numberOfLines={2}
                                textBreakStrategy="highQuality"
                                android_hyphenationFrequency="normal"
                            >
                                {cleanDesc}
                            </Text>
                        ) : null}

                        {/* Bottom Metadata: Date & Views */}
                        <View style={styles.cardMetaRow}>
                            <View style={styles.cardMetaItem}>
                                <Ionicons name="calendar-outline" size={12} color={theme.textMuted} style={{ marginRight: 4 }} />
                                <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                                    {item.created_at?.split(' ')[0] || '2026-10-11'}
                                </Text>
                            </View>

                            <View style={styles.cardMetaItem}>
                                <Ionicons name="eye-outline" size={13} color={theme.textMuted} style={{ marginRight: 4 }} />
                                <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                                    {visuals.views}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Dedicated Google Ad Banner slot after every 4 items */}
                {(index + 1) % 4 === 0 && (
                    <NewsAdBanner theme={theme} />
                )}
            </View>
        );
    };

    // YouTube News Item (DD News & Aastha)
    const renderYTNewsItem = ({ item }: { item: any }) => {
        if (!item) return null;
        const videoId = item.videoId || extractVideoId(item.link);
        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/300x200?text=Video';

        return (
            <TouchableOpacity
                style={[styles.newsCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.88}
                onPress={() => {
                    if (videoId) setSelectedVideoId(videoId);
                    else if (item.link) Linking.openURL(item.link);
                }}
            >
                <View style={styles.newsCardThumbnailWrapper}>
                    <ExpoImage
                        source={{ uri: thumbnailUrl }}
                        style={styles.newsCardThumbnail}
                        contentFit="cover"
                    />
                    <View style={styles.thumbnailPlayCircle}>
                        <Ionicons name="play" size={15} color="white" style={{ marginLeft: 2 }} />
                    </View>
                </View>

                <View style={styles.newsCardBody}>
                    <View style={styles.cardHeaderRow}>
                        <View style={[styles.cardCategoryBadge, { backgroundColor: isDarkMode ? 'rgba(220,38,38,0.2)' : '#FEE2E2' }]}>
                            <Ionicons name="logo-youtube" size={10} color="#DC2626" style={{ marginRight: 3 }} />
                            <Text style={[styles.cardCategoryText, { color: '#DC2626' }]}>
                                {item.isLive ? 'LIVE' : 'Video'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => handleShare({ id: item.videoId, title: item.title, description: item.title })}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="share-social-outline" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text
                        style={[styles.cardTitle, { color: theme.text }]}
                        numberOfLines={2}
                        textBreakStrategy="highQuality"
                        android_hyphenationFrequency="normal"
                    >
                        {item.title}
                    </Text>

                    <View style={styles.cardMetaRow}>
                        <View style={styles.cardMetaItem}>
                            <Ionicons name="time-outline" size={12} color={theme.textMuted} style={{ marginRight: 4 }} />
                            <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>{item.pubDate || 'Latest'}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={[]} {...tabSwipe.panHandlers}>
            {/* LinkUp Global Header with Floating Tabs */}
            <LinkUpHeader
                currentTab="News"
                headerAnim={headerAnim}
                user={user}
                onTabPress={(tab) => {
                    if (tab === 'News') {
                        animateHeader(false);
                        listRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }
                }}
                onPlusPress={() => {
                    if (anchorStatus === 'Approved') {
                        navigation.navigate('CreateNews');
                    } else {
                        navigation.navigate('CreatePost');
                    }
                }}
                tabSwipeHandlers={tabSwipe.panHandlers}
                statusBarHeight={statusBarHeight}
            />

            {/* Main Content Area */}
            {activeTab === 'apna' && (
                <FlashList
                    ref={listRef}
                    data={listNewsItems}
                    keyExtractor={(item: any, index: number) => item?.id?.toString() || index.toString()}
                    renderItem={renderNewsItem}
                    // @ts-ignore
                    estimatedItemSize={120}
                    ListHeaderComponent={renderListHeader}
                    contentContainerStyle={{
                        paddingTop: statusBarHeight + 116,
                        paddingBottom: 40,
                        backgroundColor: theme.background,
                    }}
                    onScroll={handleFeedScroll}
                    scrollEventThrottle={16}
                    onEndReached={() => fetchNews(true)}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefreshApna}
                            colors={['#1877F2']}
                            tintColor="#1877F2"
                            progressViewOffset={statusBarHeight + 116}
                        />
                    }
                    ListEmptyComponent={
                        loading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#1877F2" />
                            </View>
                        ) : filteredNews.length === 0 ? (
                            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                                <Ionicons name="newspaper-outline" size={48} color="#CBD5E1" />
                                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14, fontWeight: '500' }}>
                                    {t('noNewsAvailable') || 'No news articles found'}
                                </Text>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={
                        isFetchingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator color="#1877F2" />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* DD News Tab Content */}
            {activeTab === 'ddnews' && (
                <FlashList
                    data={ytNews}
                    keyExtractor={(item: any, index: number) => item?.videoId || item?.link || index.toString()}
                    renderItem={renderYTNewsItem}
                    // @ts-ignore
                    estimatedItemSize={120}
                    ListHeaderComponent={renderListHeader}
                    contentContainerStyle={{
                        paddingTop: statusBarHeight + 116,
                        paddingBottom: 40,
                        backgroundColor: theme.background,
                    }}
                    onScroll={handleFeedScroll}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={ytRefreshing}
                            onRefresh={onRefreshYT}
                            colors={['#DC2626']}
                            tintColor="#DC2626"
                            progressViewOffset={statusBarHeight + 116}
                        />
                    }
                    ListEmptyComponent={
                        ytLoading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#DC2626" />
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                                <Ionicons name="logo-youtube" size={48} color="#CBD5E1" />
                                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14 }}>
                                    {t('noVideosAvailable') || 'No DD News videos found'}
                                </Text>
                            </View>
                        )
                    }
                />
            )}

            {/* Aastha Tab Content */}
            {activeTab === 'aastha' && (
                <FlashList
                    data={aasthaNews}
                    keyExtractor={(item: any, index: number) => item?.videoId || item?.link || index.toString()}
                    renderItem={renderYTNewsItem}
                    // @ts-ignore
                    estimatedItemSize={120}
                    ListHeaderComponent={renderListHeader}
                    contentContainerStyle={{
                        paddingTop: statusBarHeight + 116,
                        paddingBottom: 40,
                        backgroundColor: theme.background,
                    }}
                    onScroll={handleFeedScroll}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={aasthaRefreshing}
                            onRefresh={onRefreshAastha}
                            colors={['#D97706']}
                            tintColor="#D97706"
                            progressViewOffset={statusBarHeight + 116}
                        />
                    }
                    ListEmptyComponent={
                        aasthaLoading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#D97706" />
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                                <Ionicons name="flower-outline" size={48} color="#CBD5E1" />
                                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14 }}>
                                    {t('noStreamsAvailable') || 'No Aastha feeds found'}
                                </Text>
                            </View>
                        )
                    }
                />
            )}

            {/* More Options Modal Sheet */}
            <Modal
                visible={!!menuNewsItem}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuNewsItem(null)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setMenuNewsItem(null)}
                >
                    <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalSheetTitle, { color: theme.text }]} numberOfLines={1}>
                            {menuNewsItem?.title}
                        </Text>
                        <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

                        <TouchableOpacity
                            style={styles.modalActionRow}
                            onPress={() => {
                                const item = menuNewsItem;
                                setMenuNewsItem(null);
                                if (item) handleShare(item);
                            }}
                        >
                            <Ionicons name="share-social-outline" size={20} color="#1877F2" />
                            <Text style={[styles.modalActionText, { color: theme.text }]}>{t('share') || 'Share News'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalActionRow}
                            onPress={() => {
                                const item = menuNewsItem;
                                setMenuNewsItem(null);
                                if (item) toggleBookmark(item.id?.toString());
                            }}
                        >
                            <Ionicons
                                name={bookmarks.includes(menuNewsItem?.id?.toString()) ? 'bookmark' : 'bookmark-outline'}
                                size={20}
                                color="#1877F2"
                            />
                            <Text style={[styles.modalActionText, { color: theme.text }]}>
                                {bookmarks.includes(menuNewsItem?.id?.toString()) ? 'Remove Bookmark' : 'Save / Bookmark'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalCancelButton, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                            onPress={() => setMenuNewsItem(null)}
                        >
                            <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* In-App YouTube Player Modal */}
            <Modal
                visible={!!selectedVideoId}
                animationType="slide"
                onRequestClose={() => setSelectedVideoId(null)}
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
                    <View style={styles.ytModalHeader}>
                        <Text style={styles.ytModalTitle}>{t('videoNewsPlayer')}</Text>
                        <TouchableOpacity onPress={() => setSelectedVideoId(null)} style={styles.ytCloseBtn}>
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'black' }}>
                        {selectedVideoId && (
                            <View style={{ width: '100%', aspectRatio: 16 / 9 }}>
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
                                                src="https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&playsinline=1&rel=0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowfullscreen>
                                            </iframe>
                                        </body>
                                        </html>
                                        `,
                                    }}
                                    allowsFullscreenVideo={true}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    mediaPlaybackRequiresUserAction={false}
                                    style={{ flex: 1, backgroundColor: 'black' }}
                                />
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#F0F6FF',
        paddingBottom: 4,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 6,
    },
    titleTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    screenHeading: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
    },
    screenSubheading: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 1.5,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    breakingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1877F2',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    breakingButtonText: {
        color: 'white',
        fontSize: 11.5,
        fontWeight: '700',
    },
    postNewsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 10,
        paddingVertical: 5.5,
        borderRadius: 16,
    },
    postNewsButtonText: {
        color: '#1877F2',
        fontSize: 11.5,
        fontWeight: '700',
    },
    channelTabsCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F8FD',
        marginHorizontal: 16,
        marginTop: 6,
        borderRadius: 24,
        height: 48,
        padding: 4,
        borderWidth: 1.5,
        borderColor: '#D8E6F7',
    },
    channelPillActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        height: '100%',
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.08,
        shadowRadius: 3.5,
    },
    channelPillInactive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: '100%',
    },
    channelTextActive: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    channelTextInactive: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    capsuleSearchBtn: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        marginHorizontal: 16,
        marginTop: 8,
        height: 42,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
        padding: 0,
    },
    breakingTickerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#071F46',
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 22,
        height: 44,
        paddingRight: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 4,
    },
    breakingPillTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F04438',
        height: 38,
        marginLeft: 3,
        paddingHorizontal: 16,
        borderRadius: 19,
        zIndex: 2,
    },
    breakingPillTagText: {
        color: 'white',
        fontSize: 11.5,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    marqueeViewport: {
        flex: 1,
        overflow: 'hidden',
        marginHorizontal: 10,
        justifyContent: 'center',
    },
    marqueeItemText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    marqueeBullet: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '900',
        marginHorizontal: 20,
    },
    marqueeChevronWrap: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    categoryChipsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    categoryChipActive: {
        backgroundColor: '#1877F2',
        borderColor: '#1877F2',
        elevation: 2,
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    categoryChipText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#334155',
    },
    categoryChipTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    locationPickersContainer: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    pickerBox: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 46,
        justifyContent: 'center',
    },
    heroCardContainer: {
        marginHorizontal: 16,
        marginTop: 2,
        marginBottom: 6,
    },
    heroCard: {
        width: '100%',
        aspectRatio: 16 / 9.6,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        position: 'relative',
        justifyContent: 'space-between',
        padding: 12,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroBreakingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 12,
    },
    heroBreakingBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    },
    heroSoundButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroCenterPlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroPlayCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroBottomOverlay: {
        paddingTop: 10,
    },
    heroTitle: {
        color: 'white',
        fontSize: 15.5,
        fontWeight: '800',
        lineHeight: 22,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
        textAlign: 'justify',
    },
    heroProgressBar: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    heroProgressFill: {
        width: '35%',
        height: '100%',
        backgroundColor: '#1877F2',
    },
    heroMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroMetaText: {
        color: '#E2E8F0',
        fontSize: 11.5,
        fontWeight: '500',
    },
    carouselDotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        marginBottom: 6,
    },
    carouselDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#94A3B8',
    },
    carouselDotActive: {
        width: 16,
        backgroundColor: '#1877F2',
    },
    newsCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1.5,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
    },
    newsCardThumbnailWrapper: {
        width: 120,
        height: 88,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        position: 'relative',
    },
    newsCardThumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlayCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -16,
        marginLeft: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsCardBody: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
        paddingVertical: 1,
        minHeight: 88,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    cardCategoryText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 18.5,
        marginTop: 3,
        marginBottom: 2,
    },
    cardContent: {
        fontSize: 12,
        lineHeight: 16.5,
        color: '#64748B',
        textAlign: 'justify',
        marginBottom: 5,
        letterSpacing: 0.1,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardMetaText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 76,
    },
    adHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    adHeaderText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.8,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalSheetTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 14,
    },
    modalActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    modalActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    modalCancelButton: {
        marginTop: 10,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    ytModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'black',
    },
    ytModalTitle: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
    },
    ytCloseBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});

export default NewsScreen;
