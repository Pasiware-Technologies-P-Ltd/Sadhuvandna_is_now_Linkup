import { Image } from 'expo-image';
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Share, Alert, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import api, { WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const NEWS_URL = `${BASE_URL_ROOT}/uploads/news/`;

const isVideo = (filename: string) => /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(filename.trim());

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
    style
}: {
    uri: string;
    shouldPlay: boolean;
    style?: any;
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

    useEffect(() => {
        if (isPlaying) {
            resetControlsTimer();
        }
    }, [isPlaying]);

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

    const skipForward = async () => {
        if (!videoRef.current || !status.durationMillis) return;
        const newPos = Math.min(status.positionMillis + 10000, status.durationMillis);
        await videoRef.current.setPositionAsync(newPos);
        resetControlsTimer();
    };

    const skipBackward = async () => {
        if (!videoRef.current) return;
        const newPos = Math.max((status.positionMillis || 0) - 10000, 0);
        await videoRef.current.setPositionAsync(newPos);
        resetControlsTimer();
    };

    const [progressWidth, setProgressWidth] = useState(0);

    const handleSeek = async (e: any) => {
        if (!videoRef.current || !status.durationMillis || progressWidth === 0) return;
        const x = e.nativeEvent.locationX;
        const seekTo = (x / progressWidth) * status.durationMillis;
        await videoRef.current.setPositionAsync(seekTo);
        resetControlsTimer();
    };

    const progress = (status.positionMillis && status.durationMillis)
        ? (status.positionMillis / status.durationMillis) * 100
        : 0;

    return (
        <TouchableWithoutFeedback onPress={resetControlsTimer}>
            <View style={[{ position: 'relative', overflow: 'hidden', backgroundColor: 'black' }, style]}>
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
                    <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={skipBackward} style={{ padding: 8 }}>
                            <Ionicons name="play-back" size={28} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>

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
                                marginHorizontal: 24,
                            }}
                        >
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={26}
                                color="white"
                                style={{ marginLeft: isPlaying ? 0 : 3 }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={skipForward} style={{ padding: 8 }}>
                            <Ionicons name="play-forward" size={28} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>
                    </View>
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
                        paddingVertical: 8,
                    }}
                >
                    <TouchableOpacity 
                        activeOpacity={1}
                        onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
                        onPress={handleSeek}
                        style={{ paddingVertical: 10, marginTop: -10, marginBottom: -4 }}
                    >
                        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#2563EB' }} />
                        </View>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                            {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
                        </Text>
                    </View>
                </View>
            )}
        </View>
        </TouchableWithoutFeedback>
    );
};

const NewsDetailScreen = ({ route, navigation }: any) => {
    const isFocused = useIsFocused();
    const { isDarkMode, theme } = useTheme();
    const { news, newsId } = route.params || {};
    const [currentNews, setCurrentNews] = React.useState<any>(news || null);
    const [loading, setLoading] = React.useState(!news && !!newsId);
    const [activeIndex, setActiveIndex] = useState(0);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    React.useEffect(() => {
        if (!currentNews && newsId) {
            fetchSingleNews(newsId);
        }
    }, [newsId]);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const fetchSingleNews = async (id: string) => {
        try {
            setLoading(true);
            const res = await api.get(`get_news.php?id=${id}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            if (data.length > 0) {
                setCurrentNews(data[0]);
            } else {
                Alert.alert("Error", "News not found");
                navigation.goBack();
            }
        } catch (e) {
            Alert.alert("Error", "Failed to load news");
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            if (!currentNews) return;
            const newsUrl = `${WEBSITE_URL}/view_news.php?id=${currentNews.id}`;
            const message = `${currentNews.title}\n\n${cleanDescription?.substring(0, 100)}...\n\nOpen in App: ${newsUrl}`;
            await Share.share({ message, url: newsUrl });
        } catch (error: any) {}
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
        </View>
    );
    if (!currentNews) return (
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted }}>News not found</Text>
        </View>
    );

    const rawImages: string[] = currentNews.images && currentNews.images.length > 0
        ? currentNews.images
        : (currentNews.image ? currentNews.image.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    let parsedAspectRatio: number | undefined = undefined;
    let cleanDescription = currentNews.description || "";
    
    const aspectMatch = cleanDescription.match(/\[aspect:([^\]]+)\]/);
    if (aspectMatch && aspectMatch[1]) {
        parsedAspectRatio = Number(aspectMatch[1]);
        cleanDescription = cleanDescription.replace(aspectMatch[0], "").trim();
    }

    const isVideo = (filename: string) => /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(filename);
    
    const isAdmin = !currentNews.user_id || 
                    String(currentNews.user_id) === '0' || 
                    currentNews.user_name?.toLowerCase() === 'admin' || 
                    currentNews.posted_by?.toLowerCase() === 'admin';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            {/* Custom Toast */}
            {toastMsg && (
                <View style={{ position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#10b981', padding: 12, borderRadius: 8, zIndex: 1000, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 }}>
                    <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginRight: 10 }} />
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{toastMsg}</Text>
                </View>
            )}

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ fontWeight: '700', fontSize: 16, color: theme.text, flex: 1 }} numberOfLines={1}>
                    {currentNews.category || 'News Detail'}
                </Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

                {/* Category + Date */}
                <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {currentNews.category && (
                        <View style={{ backgroundColor: isDarkMode ? 'rgba(37,99,235,0.18)' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: isDarkMode ? '#1D4ED8' : '#DBEAFE' }}>
                            <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '800' }}>{currentNews.category}</Text>
                        </View>
                    )}
                    {(currentNews.state || currentNews.district) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="location-outline" size={12} color={theme.textMuted} />
                            <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
                                {currentNews.state}{currentNews.district ? ` · ${currentNews.district}` : ''}
                            </Text>
                        </View>
                    )}
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 'auto' }}>
                        {currentNews.created_at?.split(' ')[0]}
                    </Text>
                </View>

                {/* Title */}
                <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, lineHeight: 30, paddingHorizontal: 16, marginBottom: 16, textAlign: 'justify' }}>
                    {currentNews.title}
                </Text>

                {/* Media: horizontal paged scroll — supports both images and videos */}
                {rawImages.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            style={{ width }}
                            onScroll={(e) => {
                                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                                setActiveIndex(idx);
                            }}
                            scrollEventThrottle={16}
                        >
                            {rawImages.map((filename: string, index: number) => {
                                const uri = `${NEWS_URL}${filename.trim()}`;
                                if (isVideo(filename)) {
                                    return (
                                        <ProfessionalVideoPlayer
                                            key={index}
                                            uri={uri}
                                            style={{ width, height: parsedAspectRatio ? undefined : 320, aspectRatio: parsedAspectRatio || undefined }}
                                            shouldPlay={isFocused && index === activeIndex}
                                        />
                                    );
                                }
                                return (
                                    <Image
                                        key={index}
                                        source={{ uri }}
                                        style={{ width, height: parsedAspectRatio ? undefined : 320, aspectRatio: parsedAspectRatio || undefined, backgroundColor: '#E2E8F0' }}
                                        resizeMode={parsedAspectRatio ? "cover" : "contain"}
                                    />
                                );
                            })}
                        </ScrollView>

                        {/* Dots / counter */}
                        {rawImages.length > 1 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 }}>
                                {rawImages.map((_: any, i: number) => (
                                    <View
                                        key={i}
                                        style={{
                                            width: i === activeIndex ? 20 : 7,
                                            height: 7,
                                            borderRadius: 4,
                                            backgroundColor: i === activeIndex ? '#2563EB' : '#d1d5db',
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Full Description */}
                <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                    <Text style={{ fontSize: 16, color: theme.textSecondary, lineHeight: 28, textAlign: 'justify' }}>
                        {cleanDescription}
                    </Text>
                </View>

                {/* Reporter Details Section */}
                <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'space-between', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                        
                        {/* Avatar & Info */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1.6, paddingRight: 4 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isAdmin ? '#2563EB' : '#E2E8F0', marginRight: 10, borderWidth: 1.5, borderColor: isAdmin ? '#2563EB' : '#E2E8F0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                <Image 
                                    source={isAdmin ? require('../../../assets/icon.png') : { uri: currentNews.user_image ? `${BASE_URL_ROOT}/uploads/users/${currentNews.user_image}` : 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
                                    style={[{ width: '100%', height: '100%' }, isAdmin && { transform: [{ scale: 1.18 }] }]} 
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginRight: 2 }}>रिपोर्टर</Text>
                                        <Ionicons name="checkmark-circle" size={10} color="white" />
                                    </View>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 }} numberOfLines={1}>
                                    {currentNews.user_name || currentNews.posted_by || 'Admin'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="location-outline" size={12} color={theme.textMuted} />
                                    <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 2 }} numberOfLines={1}>
                                        {currentNews.user_city || currentNews.district || currentNews.state || 'India'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={{ flex: 1, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="camera-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '500' }}>{currentNews.news_count || '0'} न्यूज़</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="people-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '500' }}>{currentNews.followers_count || '0'} फॉलोअर्स</Text>
                            </View>
                        </View>
                        
                        {/* Buttons */}
                        {!isAdmin && (
                        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 6 }}>
                            <TouchableOpacity 
                                onPress={async () => {
                                    try {
                                        const uStr = await AsyncStorage.getItem('user');
                                        if (uStr) {
                                            const user = JSON.parse(uStr);
                                            const res = await api.post('api_follow.php', {
                                                action: 'follow',
                                                current_user_id: user.id,
                                                user_id: currentNews.user_id
                                            });
                                            if (res.data.ok) {
                                                let toastText = 'सफलतापूर्वक फॉलो किया गया';
                                                if (res.data.status === 'requested') toastText = 'फॉलो रिक्वेस्ट भेजी गई';
                                                if (res.data.status === 'unfollowed') toastText = 'अनफॉलो किया गया';
                                                showToast(toastText);
                                            } else {
                                                Alert.alert('Error', res.data.message || 'Could not follow user');
                                            }
                                        } else {
                                            Alert.alert('Login Required', 'Please login to follow users');
                                        }
                                    } catch (e) {
                                        Alert.alert('Error', 'Something went wrong');
                                    }
                                }}
                                style={{ borderWidth: 1, borderColor: '#2563eb', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 8, width: '100%', alignItems: 'center' }}>
                                <Text style={{ color: '#2563eb', fontSize: 11, fontWeight: '600' }}>फॉलो करें</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('PublicProfile', { user: { id: currentNews.user_id, name: currentNews.user_name, profile_photo: currentNews.user_image } })}
                                style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, width: '100%', alignItems: 'center', backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }}>
                                <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>प्रोफाइल देखें</Text>
                            </TouchableOpacity>
                        </View>
                        )}

                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default NewsDetailScreen;
