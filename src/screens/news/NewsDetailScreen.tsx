import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import api, { WEBSITE_URL } from '../../services/api';

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
    const videoRef = useRef<Video>(null);
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
                        justify: 'space-between',
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
                            width: 56,
                            height: 56,
                            borderRadius: 28,
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
                            size={28}
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
                        paddingVertical: 8,
                    }}
                >
                    <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#ea580c' }} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                            {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
                        </Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

const NewsDetailScreen = ({ route, navigation }: any) => {
    const isFocused = useIsFocused();
    const { news, newsId } = route.params || {};
    const [currentNews, setCurrentNews] = React.useState<any>(news || null);
    const [loading, setLoading] = React.useState(!news && !!newsId);
    const [activeIndex, setActiveIndex] = useState(0);

    React.useEffect(() => {
        if (!currentNews && newsId) {
            fetchSingleNews(newsId);
        }
    }, [newsId]);

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
            const message = `${currentNews.title}\n\n${currentNews.description?.substring(0, 100)}...\n\nOpen in App: ${newsUrl}`;
            await Share.share({ message, url: newsUrl });
        } catch (error: any) {}
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#ea580c" />
        </View>
    );
    if (!currentNews) return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <Text>News not found</Text>
        </View>
    );

    const rawImages: string[] = currentNews.images && currentNews.images.length > 0
        ? currentNews.images
        : (currentNews.image ? currentNews.image.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#111827', flex: 1 }} numberOfLines={1}>
                    {currentNews.category || 'News Detail'}
                </Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

                {/* Category + Date */}
                <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {currentNews.category && (
                        <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#ffedd5' }}>
                            <Text style={{ fontSize: 11, color: '#ea580c', fontWeight: '800' }}>{currentNews.category}</Text>
                        </View>
                    )}
                    {(currentNews.state || currentNews.district) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="location-outline" size={12} color="#6b7280" />
                            <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>
                                {currentNews.state}{currentNews.district ? ` · ${currentNews.district}` : ''}
                            </Text>
                        </View>
                    )}
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                        {currentNews.created_at?.split(' ')[0]}
                    </Text>
                </View>

                {/* Title */}
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30, paddingHorizontal: 16, marginBottom: 16 }}>
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
                                            style={{ width, height: 320 }}
                                            shouldPlay={isFocused && index === activeIndex}
                                        />
                                    );
                                }
                                return (
                                    <Image
                                        key={index}
                                        source={{ uri }}
                                        style={{ width, height: 320, backgroundColor: '#f3f4f6' }}
                                        resizeMode="contain"
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
                                            backgroundColor: i === activeIndex ? '#ea580c' : '#d1d5db',
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Full Description */}
                <View style={{ paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 16, color: '#374151', lineHeight: 28 }}>
                        {currentNews.description}
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default NewsDetailScreen;
