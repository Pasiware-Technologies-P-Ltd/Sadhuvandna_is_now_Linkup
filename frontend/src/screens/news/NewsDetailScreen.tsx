import { Image } from 'expo-image';
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Share, Alert, ActivityIndicator, TouchableWithoutFeedback, TextInput, KeyboardAvoidingView, Platform, Modal, Keyboard, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import api, { WEBSITE_URL, BASE_URL_ROOT } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const NEWS_URL = `${WEBSITE_URL}/uploads/news/`;
const USER_PHOTO_URL = `${BASE_URL_ROOT}/uploads/users/`;

const gifCache: Record<string, any[]> = {};

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

    // User & Interaction states
    const [user, setUser] = useState<any>(null);
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(0);
    const likeScale = useRef(new Animated.Value(1)).current;

    // Comments states
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState<boolean>(true);
    const [newComment, setNewComment] = useState<string>('');
    const [sending, setSending] = useState<boolean>(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState<boolean>(false);
    const [selectedComment, setSelectedComment] = useState<any>(null);

    // Emoji & GIF pickers
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
    const [showGifPicker, setShowGifPicker] = useState<boolean>(false);
    const [gifs, setGifs] = useState<any[]>([]);
    const [gifQuery, setGifQuery] = useState<string>('');
    const [loadingGifs, setLoadingGifs] = useState<boolean>(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const commentInputRef = useRef<TextInput>(null);

    useEffect(() => {
        loadUserAndInit();
    }, [newsId]);

    const loadUserAndInit = async () => {
        let loggedUser: any = null;
        try {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                loggedUser = JSON.parse(uStr);
                setUser(loggedUser);
            }
        } catch (e) {
            console.error(e);
        }

        const targetId = currentNews?.id || newsId;
        if (targetId) {
            fetchSingleNews(targetId, loggedUser?.id);
            fetchNewsComments(targetId);
        }
    };

    const fetchSingleNews = async (id: string, uid?: string | number) => {
        try {
            setLoading(true);
            const userParam = uid ? `&user_id=${uid}` : '';
            const res = await api.get(`get_news.php?id=${id}${userParam}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            if (data.length > 0) {
                const item = data[0];
                setCurrentNews(item);
                setIsLiked(item.user_liked === true || item.user_liked === 1 || item.user_liked === '1');
                setLikeCount(Number(item.likes) || 0);
            } else if (!currentNews) {
                Alert.alert("Error", "News not found");
                navigation.goBack();
            }
        } catch (e) {
            if (!currentNews) {
                Alert.alert("Error", "Failed to load news");
                navigation.goBack();
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchNewsComments = async (nid: string | number) => {
        try {
            setLoadingComments(true);
            const res = await api.get(`like_comment_action.php?action=fetch_news_comments&news_id=${nid}`);
            if (Array.isArray(res.data)) {
                setComments(res.data);
            } else if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
                setComments(res.data.data);
            } else {
                setComments([]);
            }
        } catch (err) {
            console.error("fetchNewsComments error:", err);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleLikeToggle = async () => {
        if (!currentNews) return;
        if (!user) {
            Alert.alert("Login Required", "Please login to like this news.");
            return;
        }

        Animated.sequence([
            Animated.timing(likeScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
            Animated.timing(likeScale, { toValue: 1, duration: 120, useNativeDriver: true })
        ]).start();

        const previousLiked = isLiked;
        const previousCount = likeCount;
        const nextLiked = !previousLiked;
        const nextCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

        setIsLiked(nextLiked);
        setLikeCount(nextCount);

        try {
            const payload = {
                action: 'like',
                id: currentNews.id,
                user_id: user.id
            };
            const res = await api.post('like_comment_action.php', payload);
            if (res.data && res.data.likes !== undefined) {
                setLikeCount(Number(res.data.likes));
            }
        } catch (e) {
            setIsLiked(previousLiked);
            setLikeCount(previousCount);
        }
    };

    const fetchGifs = async (query = '') => {
        const cacheKey = query.trim().toLowerCase() || 'trending';
        if (gifCache[cacheKey]) {
            setGifs(gifCache[cacheKey]);
            return;
        }

        setLoadingGifs(true);
        try {
            const url = query 
                ? `https://api.giphy.com/v1/gifs/search?api_key=DThQZEbYuZK5ZL0OXdM3de2gZ5vSBrDi&q=${encodeURIComponent(query)}&limit=21`
                : `https://api.giphy.com/v1/gifs/trending?api_key=DThQZEbYuZK5ZL0OXdM3de2gZ5vSBrDi&limit=21`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.data) {
                gifCache[cacheKey] = data.data;
                setGifs(data.data);
            }
        } catch(e) {
            console.error("GIF Fetch Error:", e);
        }
        setLoadingGifs(false);
    };

    useEffect(() => {
        if (showGifPicker && gifs.length === 0) {
            fetchGifs();
        }
    }, [showGifPicker]);

    const handleSendComment = async (gifUrl?: string) => {
        const textToSend = gifUrl || newComment.trim();
        if (!textToSend || !currentNews) return;
        if (!user) {
            Alert.alert("Login Required", "Please login to comment.");
            return;
        }

        setSending(true);
        try {
            if (editingCommentId && !gifUrl) {
                // EDIT MODE
                const payload = {
                    action: 'edit_news_comment',
                    news_id: currentNews.id,
                    user_id: user.id,
                    comment_id: editingCommentId,
                    comment: textToSend
                };

                setComments(prev => prev.map(c => String(c.comment_id) === String(editingCommentId) ? { ...c, comment: textToSend } : c));
                setNewComment('');
                setEditingCommentId(null);

                await api.post('like_comment_action.php', payload);
                fetchNewsComments(currentNews.id);
            } else {
                // CREATE MODE
                const payload = {
                    action: 'news_comment',
                    news_id: currentNews.id,
                    user_id: user.id,
                    comment: textToSend
                };

                const res = await api.post('like_comment_action.php', payload);
                if (res.data && (res.data.status === 'success' || res.data.ok)) {
                    setNewComment('');
                    setShowEmojiPicker(false);
                    setShowGifPicker(false);
                    fetchNewsComments(currentNews.id);
                    setCurrentNews((prev: any) => prev ? ({ ...prev, comments: (Number(prev.comments) || 0) + 1 }) : prev);
                } else {
                    Alert.alert("Error", res.data?.message || "Failed to post comment");
                }
            }
        } catch (e) {
            Alert.alert("Error", "Network request failed");
        } finally {
            setSending(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!selectedComment || !currentNews || !user) return;
        setOptionsModalVisible(false);

        Alert.alert(
            "Delete Comment",
            "Are you sure you want to delete this comment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const payload = {
                                action: 'delete_news_comment',
                                news_id: currentNews.id,
                                user_id: user.id,
                                comment_id: selectedComment.comment_id
                            };
                            setComments(prev => prev.filter(c => String(c.comment_id) !== String(selectedComment.comment_id)));
                            setCurrentNews((prev: any) => prev ? ({ ...prev, comments: Math.max(0, (Number(prev.comments) || 1) - 1) }) : prev);
                            await api.post('like_comment_action.php', payload);
                            fetchNewsComments(currentNews.id);
                        } catch (e) {
                            fetchNewsComments(currentNews.id);
                        }
                    }
                }
            ]
        );
    };

    const handleEditCommentInit = () => {
        if (selectedComment) {
            setEditingCommentId(selectedComment.comment_id);
            setNewComment(selectedComment.comment);
            commentInputRef.current?.focus();
        }
        setOptionsModalVisible(false);
    };

    const handleCommentOptions = (item: any) => {
        if (!user || !item.user_id || String(user.id) !== String(item.user_id)) return;
        setSelectedComment(item);
        setOptionsModalVisible(true);
    };

    const scrollToComments = () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        commentInputRef.current?.focus();
    };

    const rawImages: string[] = currentNews?.images && currentNews.images.length > 0
        ? currentNews.images
        : (currentNews?.image ? currentNews.image.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    let parsedAspectRatio: number | undefined = undefined;
    let cleanDescription = currentNews?.description || "";
    
    const aspectMatch = cleanDescription.match(/\[aspect:([^\]]+)\]/);
    if (aspectMatch && aspectMatch[1]) {
        parsedAspectRatio = Number(aspectMatch[1]);
        cleanDescription = cleanDescription.replace(aspectMatch[0], "").trim();
    }

    const paragraphs = React.useMemo(() => {
        if (!cleanDescription) return [];
        const rawParagraphs = cleanDescription.split(/\r?\n\s*\r?\n/);
        const result: string[] = [];
        
        rawParagraphs.forEach((rawP: string) => {
            const trimmed = rawP.trim();
            if (!trimmed) return;
            
            // Join lines inside a paragraph with a space so Android doesn't terminate justification on each sentence
            const lines = trimmed.split(/\r?\n/);
            let currentBlock = '';
            lines.forEach((line: string) => {
                const lineTrimmed = line.trim();
                if (!lineTrimmed) return;
                if (lineTrimmed.startsWith('•') || lineTrimmed.startsWith('-') || /^\d+[\.\)]/.test(lineTrimmed)) {
                    if (currentBlock) {
                        result.push(currentBlock);
                        currentBlock = '';
                    }
                    result.push(lineTrimmed);
                } else {
                    if (currentBlock) {
                        currentBlock += ' ' + lineTrimmed;
                    } else {
                        currentBlock = lineTrimmed;
                    }
                }
            });
            if (currentBlock) {
                result.push(currentBlock);
            }
        });
        
        return result.length > 0 ? result : [cleanDescription.trim()];
    }, [cleanDescription]);

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

    const isVideo = (filename: string) => /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(filename);
    
    const isAdmin = !currentNews.user_id || 
                    String(currentNews.user_id) === '0' || 
                    currentNews.user_name?.toLowerCase() === 'admin' || 
                    currentNews.posted_by?.toLowerCase() === 'admin';

    const handleShare = async () => {
        try {
            if (!currentNews) return;
            const newsUrl = `${WEBSITE_URL}/view_news.php?id=${currentNews.id}`;
            const message = `${currentNews.title}\n\n${cleanDescription?.substring(0, 100)}...\n\nOpen in App: ${newsUrl}`;
            await Share.share({ message, url: newsUrl });
        } catch (error: any) {}
    };

    const renderCommentItem = (item: any, idx: number) => {
        const isOwner = user && item.user_id && String(user.id) === String(item.user_id);
        const isGif = item.comment && item.comment.startsWith('http') && (item.comment.includes('giphy.com') || item.comment.includes('tenor.com') || item.comment.endsWith('.gif'));

        return (
            <View key={item.comment_id || idx} style={{ flexDirection: 'row', marginBottom: 14 }}>
                <Image
                    source={{ uri: item.profile_photo ? `${USER_PHOTO_URL}${item.profile_photo}` : 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                    style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 1, borderColor: theme.border }}
                />
                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: theme.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                        <View style={{ flex: 1, marginRight: 4 }}>
                            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{item.name || 'User'}</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 1 }}>{item.date || 'Just now'}</Text>
                        </View>
                        {isOwner && (
                            <TouchableOpacity onPress={() => handleCommentOptions(item)} style={{ padding: 4 }}>
                                <Ionicons name="ellipsis-vertical" size={14} color={theme.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isGif ? (
                        <Image
                            source={{ uri: item.comment }}
                            style={{ width: 140, height: 120, borderRadius: 8, marginTop: 4, backgroundColor: isDarkMode ? '#0F172A' : '#E2E8F0' }}
                            contentFit="cover"
                        />
                    ) : (
                        <Text style={{ color: theme.text, fontSize: 13.5, lineHeight: 19, marginTop: 2 }}>{item.comment}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView 
                    ref={scrollViewRef}
                    contentContainerStyle={{ paddingBottom: 24 }} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

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
                    <Text
                        style={{ fontSize: 22, fontWeight: '800', color: theme.text, lineHeight: 32, paddingHorizontal: 16, marginBottom: 16, textAlign: 'justify' }}
                        textBreakStrategy="highQuality"
                        android_hyphenationFrequency="normal"
                    >
                        {currentNews.title}
                    </Text>

                    {/* Media: horizontal paged scroll */}
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
                                                backgroundColor: i === activeIndex ? '#2563EB' : isDarkMode ? '#475569' : '#CBD5E1',
                                            }}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Action Bar (Like, Comment, Share) */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        marginHorizontal: 16,
                        marginBottom: 18,
                        paddingVertical: 10,
                        backgroundColor: theme.card,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: theme.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1
                    }}>
                        {/* Like Button */}
                        <TouchableOpacity
                            onPress={handleLikeToggle}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                <Ionicons
                                    name={isLiked ? "heart" : "heart-outline"}
                                    size={24}
                                    color={isLiked ? "#EF4444" : theme.text}
                                />
                            </Animated.View>
                            <Text style={{
                                marginLeft: 7,
                                fontSize: 14,
                                fontWeight: '700',
                                color: isLiked ? "#EF4444" : theme.text
                            }}>
                                {likeCount > 0 ? likeCount : 'लाइक'}
                            </Text>
                        </TouchableOpacity>

                        {/* Comment Button */}
                        <TouchableOpacity
                            onPress={scrollToComments}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chatbubble-outline" size={22} color={theme.text} />
                            <Text style={{
                                marginLeft: 7,
                                fontSize: 14,
                                fontWeight: '700',
                                color: theme.text
                            }}>
                                {comments.length > 0 ? comments.length : (currentNews.comments || 'कमेंट')}
                            </Text>
                        </TouchableOpacity>

                        {/* Share Button */}
                        <TouchableOpacity
                            onPress={handleShare}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="paper-plane-outline" size={22} color={theme.text} />
                            <Text style={{
                                marginLeft: 7,
                                fontSize: 14,
                                fontWeight: '700',
                                color: theme.text
                            }}>
                                शेयर
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Article Body */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                        {/* Newspaper Dateline Header if location is present */}
                        {(currentNews.district || currentNews.user_city || currentNews.state) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                                <Ionicons name="newspaper-outline" size={15} color="#2563EB" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#93C5FD' : '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {currentNews.district || currentNews.user_city || currentNews.state}
                                </Text>
                                <Text style={{ fontSize: 13, color: theme.textMuted, marginHorizontal: 6 }}>•</Text>
                                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
                                    विशेष समाचार
                                </Text>
                            </View>
                        )}

                        {paragraphs.length > 0 ? (
                            paragraphs.map((para: string, idx: number) => (
                                <Text
                                    key={idx}
                                    style={{
                                        fontSize: 16.5,
                                        color: theme.text,
                                        lineHeight: 28,
                                        marginBottom: 14,
                                        textAlign: 'justify',
                                        letterSpacing: 0.2,
                                    }}
                                    textBreakStrategy="highQuality"
                                    android_hyphenationFrequency="normal"
                                >
                                    {para}
                                </Text>
                            ))
                        ) : (
                            <Text
                                style={{
                                    fontSize: 16.5,
                                    color: theme.text,
                                    lineHeight: 28,
                                    textAlign: 'justify',
                                    letterSpacing: 0.2,
                                }}
                                textBreakStrategy="highQuality"
                                android_hyphenationFrequency="normal"
                            >
                                {cleanDescription}
                            </Text>
                        )}
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
                                                const u = JSON.parse(uStr);
                                                const res = await api.post('api_follow.php', {
                                                    action: 'follow',
                                                    current_user_id: u.id,
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

                    {/* Comments Section Header */}
                    <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chatbubbles" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>
                                कमेंट्स ({comments.length})
                            </Text>
                        </View>
                        {editingCommentId && (
                            <TouchableOpacity onPress={() => { setEditingCommentId(null); setNewComment(''); }}>
                                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>कैंसिल एडिट</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Comments List */}
                    <View style={{ paddingHorizontal: 16 }}>
                        {loadingComments ? (
                            <ActivityIndicator size="small" color="#2563EB" style={{ paddingVertical: 20 }} />
                        ) : comments.length > 0 ? (
                            comments.map((item, idx) => renderCommentItem(item, idx))
                        ) : (
                            <View style={{ paddingVertical: 24, alignItems: 'center', backgroundColor: isDarkMode ? '#1E293B55' : '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 12 }}>
                                <Ionicons name="chatbox-ellipses-outline" size={36} color={theme.textMuted} style={{ marginBottom: 6 }} />
                                <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>अभी तक कोई कमेंट नहीं है।</Text>
                                <Text style={{ color: theme.textMuted, fontSize: 12 }}>पहला कमेंट लिखकर अपनी राय बताएं!</Text>
                            </View>
                        )}
                    </View>

                </ScrollView>

                {/* Comment Input Bar */}
                <View style={{ backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
                        <View style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 24,
                            paddingHorizontal: 12,
                            paddingVertical: 2,
                            minHeight: 44,
                            marginRight: 8,
                            backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: theme.border
                        }}>
                            <TextInput
                                ref={commentInputRef}
                                style={{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: 6, maxHeight: 90 }}
                                placeholder={editingCommentId ? "Edit your comment..." : "कमेंट लिखें..."}
                                placeholderTextColor={theme.textMuted}
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                onFocus={() => { setShowEmojiPicker(false); setShowGifPicker(false); }}
                            />

                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setShowEmojiPicker(false);
                                    setShowGifPicker(prev => !prev);
                                }}
                                style={{ padding: 6 }}
                            >
                                <View style={{
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    backgroundColor: showGifPicker ? '#2563EB' : (isDarkMode ? '#334155' : '#CBD5E1')
                                }}>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: showGifPicker ? 'white' : (isDarkMode ? '#CBD5E1' : '#475569') }}>GIF</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setShowGifPicker(false);
                                    setShowEmojiPicker(prev => !prev);
                                }}
                                style={{ padding: 6 }}
                            >
                                <Ionicons name={showEmojiPicker ? "close-circle-outline" : "happy-outline"} size={22} color={showEmojiPicker ? "#2563EB" : theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            onPress={() => handleSendComment()} 
                            disabled={!newComment.trim() || sending}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: newComment.trim() ? '#2563EB' : (isDarkMode ? '#334155' : '#CBD5E1')
                            }}
                        >
                            {sending ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Ionicons name="send" size={18} color={newComment.trim() ? 'white' : 'gray'} style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Emoji Picker Tray */}
                    {showEmojiPicker && (() => {
                        const emojiRows = [
                            ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '😝', '🤑', '🤗', '😇'],
                            ['👍', '👎', '👏', '🙌', '🤝', '✊', '👊', '🤲', '🙏', '💪', '👌', '✌️', '🤞', '🖐️', '👋'],
                            ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖'],
                            ['🔥', '💯', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💎', '🚨']
                        ];
                        return (
                            <View style={{ backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: 8 }}>
                                {emojiRows.map((row, rowIndex) => (
                                    <ScrollView key={rowIndex} horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 2 }}>
                                            {row.map((emoji, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => setNewComment(prev => prev + emoji)}
                                                    style={{ padding: 6, marginHorizontal: 2 }}
                                                >
                                                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                ))}
                            </View>
                        );
                    })()}

                    {/* GIF Picker Tray */}
                    {showGifPicker && (
                        <View style={{ backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, height: 230 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                                <Ionicons name="search" size={16} color={theme.textMuted} />
                                <TextInput
                                    style={{ flex: 1, marginLeft: 8, fontSize: 13, color: theme.text, paddingVertical: 2 }}
                                    placeholder="Search GIFs..."
                                    placeholderTextColor={theme.textMuted}
                                    value={gifQuery}
                                    onChangeText={(t) => { setGifQuery(t); fetchGifs(t); }}
                                    returnKeyType="search"
                                />
                                {gifQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => { setGifQuery(''); fetchGifs(''); }}>
                                        <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {loadingGifs ? (
                                <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 20 }} />
                            ) : (
                                <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 6 }}>
                                    {gifs.map((item: any, gIdx: number) => {
                                        const gifUrl = item.images?.fixed_height?.url;
                                        if (!gifUrl) return null;
                                        return (
                                            <TouchableOpacity
                                                key={item.id || gIdx}
                                                onPress={() => handleSendComment(gifUrl)}
                                                style={{ width: '31%', margin: '1%', height: 75, borderRadius: 6, overflow: 'hidden' }}
                                            >
                                                <Image source={{ uri: gifUrl }} style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0' }} contentFit="cover" />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Comment Options Modal (Edit / Delete) */}
            <Modal
                transparent
                visible={optionsModalVisible}
                animationType="fade"
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
                    activeOpacity={1} 
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={{ width: '82%', backgroundColor: theme.card, borderRadius: 16, padding: 6, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 }}>
                        <TouchableOpacity
                            onPress={handleEditCommentInit}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
                        >
                            <Ionicons name="pencil" size={18} color={theme.text} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>कमेंट बदलें (Edit)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleDeleteComment}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                        >
                            <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444' }}>कमेंट हटाएं (Delete)</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

export default NewsDetailScreen;
