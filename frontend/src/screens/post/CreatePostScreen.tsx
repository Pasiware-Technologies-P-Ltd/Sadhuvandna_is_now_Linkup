import { Image } from 'expo-image';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Dimensions, Modal, StyleSheet, KeyboardAvoidingView, Pressable, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import api, { API_BASE_URL, UPLOAD_BASE_URL, BASE_URL_ROOT, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUpload } from '../../context/UploadContext';
import { getVideoThumbnail } from '../../utils/thumbnailHelper';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');
const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

const CreatePostScreen = ({ navigation, route }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { startUpload } = useUpload();
    const params = route.params || {};
    // Node.js server for audio streams (Agora/ytdl)
    const NODE_SERVER = __DEV__ ? (process.env.EXPO_PUBLIC_NODE_DEV_URL || 'http://192.168.31.124:3000') : WEBSITE_URL;
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{uri: string, aspect: number}[]>([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [selectedMusic, setSelectedMusic] = useState<any>(null);
    const [startTime, setStartTime] = useState(0);
    const [musicModalVisible, setMusicModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
    const [musicDuration, setMusicDuration] = useState(30);
    const musicDurationRef = useRef(30);
    const startTimeRef = useRef(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [recordingSpeed, setRecordingSpeed] = useState(1);
    const [isScrolling, setIsScrolling] = useState(false);

    const YOUTUBE_API_KEY = 'AIzaSyB7wJ4Dl0-ClqgDwqrTLOJJYsAweo1QX5w';
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [postAspectRatio, setPostAspectRatio] = useState<number | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);

    const WAVEFORM_DATA = useRef(Array.from({ length: 151 }).map((_, i) => ({
        height: 15 + (Math.sin(i * 0.3) * 12) + (Math.cos(i * 0.7) * 8) + 10,
        id: i
    }))).current;

    useEffect(() => {
        if (musicModalVisible && searchResults.length === 0) {
            searchMusic('');
        }
    }, [musicModalVisible]);

    useEffect(() => {
        const load = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
        };
        load();
    }, []);

    useEffect(() => {
        if (params.videoUri) {
            setImages([{ uri: params.videoUri, aspect: 1.777 }]); // Guessing 16:9 for param video
        }
        if (params.preSelectedMusic) {
            setSelectedMusic(params.preSelectedMusic);
            loadAndPlayAudio(params.preSelectedMusic, params.isReel ? false : true);
        }
        if (params.isReel && params.recordedDuration) {
            setMusicDuration(params.recordedDuration);
            musicDurationRef.current = params.recordedDuration;
        }
        if (params.recordingSpeed) {
            setRecordingSpeed(params.recordingSpeed);
        }
    }, [params.videoUri, params.preSelectedMusic, params.recordedDuration, params.recordingSpeed, params.filterId]);

    useEffect(() => { musicDurationRef.current = musicDuration; }, [musicDuration]);
    useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

    // Audio Management
    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            if (status.isPlaying) {
                const currentPos = status.positionMillis / 1000;
                setPlaybackTime(currentPos);

                if (selectedMusic && !isScrolling) {
                    const start = startTimeRef.current;
                    const duration = musicDurationRef.current;
                    const endPos = start + duration;

                    // Only loop if we are actually past the segment and duration is valid
                    if (duration > 0 && currentPos >= endPos) {
                        soundRef.current?.setPositionAsync(start * 1000);
                        console.log(`[Audio] Looping back to: ${start}`);
                    }

                    // Sync waveform scroll
                    if (scrollRef.current) {
                        scrollRef.current.scrollTo({ x: currentPos * 12, animated: false });
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (selectedMusic) {
            startTimeRef.current = 0;
            setStartTime(0);

            // For Reels, don't auto-play on enter to avoid background sound confusion
            const shouldAutoPlay = params.isReel ? false : true;
            setIsPreviewPlaying(shouldAutoPlay);
            loadAndPlayAudio(selectedMusic, shouldAutoPlay);
        } else {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
                soundRef.current = null;
            }
        }
    }, [selectedMusic?.id]);

    const loadAndPlayAudio = async (musicObj: any, autoPlay: boolean = true) => {
        try {
            setIsAudioLoading(true);
            if (autoPlay) setIsPreviewPlaying(true);

            const streamUrl = musicObj.file_url;
            console.log(`[Audio] Loading: ${streamUrl} | AutoPlay: ${autoPlay}`);

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            if (!streamUrl) throw new Error("No audio URL found");

            const { sound } = await Audio.Sound.createAsync(
                { uri: streamUrl },
                {
                    shouldPlay: autoPlay,
                    positionMillis: startTimeRef.current * 1000,
                    volume: 1.0,
                },
                onPlaybackStatusUpdate
            );

            soundRef.current = sound;
            console.log("[Audio] Success");
        } catch (error: any) {
            console.error("Audio Load Error:", error.message);
        } finally {
            setIsAudioLoading(false);
        }
    };

    useEffect(() => {
        if (soundRef.current) {
            if (isPreviewPlaying) {
                soundRef.current.playAsync();
            } else {
                soundRef.current.pauseAsync();
            }
        }
    }, [isPreviewPlaying]);

    const searchMusic = async (overrideQuery?: string) => {
        const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
        try {
            setSearching(true);
            const response = await axios.get(`${API_BASE_URL}get_music.php?search=${query}`);
            if (response.data.status === 'success') {
                setSearchResults(response.data.data);
            }
        } catch (error) {
            console.error("Search Error:", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, aspect: a.width / a.height }))]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!content && images.length === 0 && !selectedMusic && !params.filterId) return;
        try {
            const formData = new FormData();
            formData.append('user_id', user?.id);
            formData.append('status', content);
            if (selectedMusic || params.filterId || postAspectRatio) {
                const linkData: any = {};
                if (selectedMusic) {
                    linkData.id = selectedMusic.id || '';
                    linkData.title = selectedMusic.title || '';
                    linkData.artist = selectedMusic.artist || '';
                    linkData.thumbnail = selectedMusic.thumbnail || '';
                    linkData.music_url = selectedMusic.file_url || '';
                    linkData.startTime = startTime;
                    linkData.duration = musicDuration;
                    linkData.type = 'custom_music';
                } else {
                    linkData.type = 'none';
                }
                linkData.filterId = params.filterId || 'none';
                if (postAspectRatio) {
                    linkData.aspectRatio = postAspectRatio;
                }
                
                formData.append('link', JSON.stringify(linkData));
            }
            // Process images if aspect ratio is selected
            let finalImages = [...images.map(img => typeof img === 'string' ? img : img.uri)];
            if (postAspectRatio) {
                finalImages = await Promise.all(images.map(async (imgObj) => {
                    const uri = typeof imgObj === 'string' ? imgObj : imgObj.uri;
                    if (!uri) return '';
                    if (uri.toLowerCase().endsWith('.mp4')) return uri; // Don't crop videos
                    
                    return new Promise<string>((resolve) => {
                        RNImage.getSize(uri, async (w: number, h: number) => {
                            const imgAspect = w / h;
                            let cropOriginX = 0;
                            let cropOriginY = 0;
                            let cropWidth = w;
                            let cropHeight = h;

                            if (imgAspect > postAspectRatio) {
                                // Image is wider than target aspect ratio (crop sides)
                                cropWidth = Math.round(h * postAspectRatio);
                                cropOriginX = Math.round((w - cropWidth) / 2);
                            } else if (imgAspect < postAspectRatio) {
                                // Image is taller than target aspect ratio (crop top/bottom)
                                cropHeight = Math.round(w / postAspectRatio);
                                cropOriginY = Math.round((h - cropHeight) / 2);
                            } else {
                                resolve(uri);
                                return;
                            }

                            try {
                                const manipResult = await ImageManipulator.manipulateAsync(
                                    uri,
                                    [{ crop: { originX: cropOriginX, originY: cropOriginY, width: cropWidth, height: cropHeight } }],
                                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                                );
                                resolve(manipResult.uri);
                            } catch (e) {
                                resolve(uri); // Fallback on failure
                            }
                        }, () => resolve(uri)); // Fallback if size fetch fails
                    });
                }));
            }

            finalImages.forEach((uri, index) => {
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                let type = match ? `image/${match[1]}` : `image/jpeg`;
                if (filename?.toLowerCase().endsWith('.mp4')) type = 'video/mp4';
                formData.append('media[]', { uri, name: filename, type } as any);
            });
            
            let thumbUri = finalImages.length > 0 ? finalImages[0] : null;
            if (thumbUri && /\.(mp4|mov|avi|wmv|flv|mkv)$/i.test(thumbUri)) {
                try {
                    const generated = await getVideoThumbnail(thumbUri);
                    if (generated) {
                        thumbUri = generated;
                        formData.append('thumbnail', {
                            uri: generated,
                            name: `thumb_${Date.now()}.jpg`,
                            type: 'image/jpeg'
                        } as any);
                    }
                } catch (e) {}
            }
            
            startUpload('create_post.php', formData, thumbUri);
            
            navigation.goBack();
        } catch (error) {
            Alert.alert("Error", "Failed to prepare upload");
        }
    };

    const PREVIEW_JS = ''; // No longer used

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, color: theme.text, fontWeight: 'bold' }}>Create Post</Text>
                </View>
                <TouchableOpacity
                    style={[styles.postButton, (content || images.length > 0 || selectedMusic || params.filterId) ? styles.postButtonActive : isDarkMode ? { backgroundColor: '#334155' } : styles.postButtonDisabled]}
                    disabled={(!content && images.length === 0 && !selectedMusic && !params.filterId) || loading}
                    onPress={handlePost}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> :
                        <Text style={[styles.postButtonText, (content || images.length > 0 || selectedMusic || params.filterId) ? { color: 'white' } : { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>POST</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ flexGrow: 1, padding: 16 }} 
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
                    <View style={[styles.userAvatar, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                        {user?.profile_photo ? (
                            <Image source={{ uri: `${PHOTO_URL}${user.profile_photo}` }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={[styles.userAvatarPlaceholder, { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }]}><Text style={[styles.userAvatarText, { color: isDarkMode ? '#93C5FD' : '#172554' }]}>{user?.name?.[0]}</Text></View>
                        )}
                    </View>
                    <View>
                        <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 18 }}>{user?.name || 'User'}</Text>
                        <View style={[styles.publicBadge, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderColor: theme.border }]}><Ionicons name="earth" size={12} color={theme.subtext} /><Text style={[styles.publicBadgeText, { color: theme.subtext }]}>Public</Text></View>
                    </View>
                </View>

                {/* Tappable full canvas for text input */}
                <Pressable
                    style={{ flex: 1, minHeight: 220, width: '100%', marginBottom: 16 }}
                    onPress={() => inputRef.current?.focus()}
                >
                    <TextInput
                        ref={inputRef}
                        style={[styles.contentInput, { color: theme.text, flex: 1 }]}
                        placeholder={t('whatsOnYourMind') || "What's on your mind?"}
                        placeholderTextColor={theme.subtext}
                        multiline
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical="top"
                    />
                </Pressable>

                {selectedMusic && !params.isReel && (
                    <View style={{ marginBottom: 24 }}>
                        <View style={[styles.musicCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Image source={require('../../../assets/icon.png')} style={styles.musicThumbnail} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: 'bold', color: theme.text }} numberOfLines={1}>{selectedMusic.title}</Text>
                                <Text style={{ color: theme.subtext, fontSize: 12 }}>{selectedMusic.artist}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setSelectedMusic(null); setStartTime(0); setPlaybackTime(0); }}><Ionicons name="close-circle" size={24} color={theme.subtext} /></TouchableOpacity>
                        </View>

                        <View style={styles.trimmerContainer}>
                            <View style={styles.trimmerHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 }}>
                                    <View style={{ backgroundColor: '#172554', padding: 2, borderRadius: 10 }}>
                                        <Image source={require('../../../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 8 }} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{selectedMusic.title}</Text>
                                        <Text style={{ color: '#9ca3af', fontSize: 11 }}>{selectedMusic.artist}</Text>
                                    </View>
                                </View>
                                <View style={styles.timeBadge}><Text style={styles.timeBadgeText}>{Math.floor(playbackTime / 60)}:{(Math.floor(playbackTime % 60)).toString().padStart(2, '0')}</Text></View>
                            </View>

                            <View style={styles.waveformArea}>
                                <ScrollView
                                    ref={scrollRef}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={12}
                                    decelerationRate="fast"
                                    onScrollBeginDrag={() => setIsScrolling(true)}
                                    onScroll={(e) => {
                                        if (isScrolling) {
                                            const sec = Math.floor(e.nativeEvent.contentOffset.x / 12);
                                            if (sec !== startTime) {
                                                setStartTime(sec);
                                                setPlaybackTime(sec);
                                            }
                                        }
                                    }}
                                    onMomentumScrollEnd={(e) => {
                                        setIsScrolling(false);
                                        const sec = Math.floor(e.nativeEvent.contentOffset.x / 12);
                                        soundRef.current?.setPositionAsync(sec * 1000);
                                    }}
                                    onScrollEndDrag={(e) => {
                                        setIsScrolling(false);
                                        const sec = Math.floor(e.nativeEvent.contentOffset.x / 12);
                                        soundRef.current?.setPositionAsync(sec * 1000);
                                    }}
                                    onScrollAnimationEnd={() => setIsScrolling(false)}
                                    scrollEventThrottle={32}
                                    contentContainerStyle={{ paddingHorizontal: width / 2 - 6 }}
                                >
                                    {WAVEFORM_DATA.map((item, i) => {
                                        const isInSegment = i >= startTime && i < startTime + musicDuration;
                                        const isAlreadyPlayed = i < Math.floor(playbackTime);

                                        let barColor = '#374151'; // Gray for out of segment
                                        let barOpacity = 0.3;

                                        if (isInSegment) {
                                            if (isAlreadyPlayed) {
                                                barColor = '#64748B'; // Dimmed gray for played segment
                                                barOpacity = 0.5;
                                            } else {
                                                barColor = '#93C5FD'; // Vivid orange for upcoming segment
                                                barOpacity = 1;
                                            }
                                        }

                                        return (
                                            <View key={i} style={{
                                                width: 4, height: item.height,
                                                backgroundColor: barColor,
                                                marginHorizontal: 4, borderRadius: 2, alignSelf: 'center',
                                                opacity: barOpacity
                                            }} />
                                        );
                                    })}
                                </ScrollView>
                                <View style={styles.centerCursor}><View style={styles.cursorDotTop} /><View style={styles.cursorDotBottom} /></View>
                            </View>

                            <View style={styles.trimmerFooter}>
                                <View style={{ flexDirection: 'column', width: '100%', paddingHorizontal: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 'bold', marginRight: 12 }}>DURATION:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {[15, 30, 45, 60, 90].map(d => (
                                                <TouchableOpacity
                                                    key={d}
                                                    onPress={() => setMusicDuration(d)}
                                                    style={[styles.durationBadge, musicDuration === d ? { backgroundColor: '#2563EB' } : { backgroundColor: '#172554' }]}
                                                >
                                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>{d}s</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => setIsPreviewPlaying(!isPreviewPlaying)} style={[styles.playButton, isPreviewPlaying ? { backgroundColor: '#2563EB' } : { backgroundColor: '#374151' }]}>
                                            <Ionicons name={isPreviewPlaying ? "pause" : "play"} size={22} color="white" />
                                        </TouchableOpacity>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 16 }}>
                                            {[0, 15, 30, 45, 60, 120, 180].map(val => (
                                                <TouchableOpacity key={val} style={[styles.presetButton, startTime === val ? styles.presetButtonActive : styles.presetButtonInactive]}
                                                    onPress={() => {
                                                        setStartTime(val);
                                                        setPlaybackTime(val);
                                                        scrollRef.current?.scrollTo({ x: val * 12, animated: true });
                                                        soundRef.current?.setPositionAsync(val * 1000);
                                                    }}
                                                ><Text style={[styles.presetText, startTime === val ? { color: 'white' } : { color: '#9ca3af' }]}>{val === 0 ? 'START' : val < 60 ? `${val}s` : `${Math.floor(val / 60)}m`}</Text></TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.hiddenPreview}>
                                {isAudioLoading && <ActivityIndicator size="large" color="#2563EB" />}
                            </View>
                        </View>
                    </View>
                )}

                {images.length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {images.map((imgObj, index) => {
                                const img = typeof imgObj === 'string' ? imgObj : imgObj.uri;
                                if (!img) return null;
                                const currentAspect = postAspectRatio || (typeof imgObj === 'string' ? 1.33 : imgObj.aspect) || 1.33;
                                return (
                                <View key={index} style={[styles.imageItemContainer, { height: 256 / currentAspect }]}>
                                    {img.toLowerCase().endsWith('.mp4') ? (
                                        <Video
                                            source={{ uri: img }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={false}
                                            useNativeControls
                                            rate={recordingSpeed}
                                            isMuted={false}
                                            volume={1.0}
                                        />
                                    ) : (
                                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode={postAspectRatio ? "cover" : "contain"} />
                                    )}
                                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}><Ionicons name="close" size={20} color="white" /></TouchableOpacity>
                                </View>
                            )})}
                        </ScrollView>

                        <View style={{ marginTop: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 8 }}>FRAME & ASPECT RATIO</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <TouchableOpacity onPress={() => setPostAspectRatio(1)} style={[styles.frameBtn, postAspectRatio === 1 ? styles.frameBtnActive : null]}>
                                    <Ionicons name="square-outline" size={20} color={postAspectRatio === 1 ? 'white' : '#64748B'} />
                                    <Text style={[styles.frameBtnText, postAspectRatio === 1 ? {color: 'white'} : null]}>1:1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(0.8)} style={[styles.frameBtn, postAspectRatio === 0.8 ? styles.frameBtnActive : null]}>
                                    <Ionicons name="tablet-portrait-outline" size={20} color={postAspectRatio === 0.8 ? 'white' : '#64748B'} />
                                    <Text style={[styles.frameBtnText, postAspectRatio === 0.8 ? {color: 'white'} : null]}>4:5</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(1.777)} style={[styles.frameBtn, postAspectRatio === 1.777 ? styles.frameBtnActive : null]}>
                                    <Ionicons name="tablet-landscape-outline" size={20} color={postAspectRatio === 1.777 ? 'white' : '#64748B'} />
                                    <Text style={[styles.frameBtnText, postAspectRatio === 1.777 ? {color: 'white'} : null]}>16:9</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(null)} style={[styles.frameBtn, postAspectRatio === null ? styles.frameBtnActive : null]}>
                                    <Ionicons name="image-outline" size={20} color={postAspectRatio === null ? 'white' : '#64748B'} />
                                    <Text style={[styles.frameBtnText, postAspectRatio === null ? {color: 'white'} : null]}>Original</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                )}
            </ScrollView>

                <View style={[styles.bottomActions, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TouchableOpacity style={styles.actionItem} onPress={pickImage}><Ionicons name="images" size={28} color="#45bd62" /><Text style={[styles.actionText, { color: theme.text }]}>Photo/Video</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionItem, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setMusicModalVisible(true)}><Ionicons name="musical-notes" size={28} color="#2563EB" /><Text style={[styles.actionText, { color: theme.text }]}>Music Library</Text></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={musicModalVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Search Music</Text>
                        <TouchableOpacity onPress={() => setMusicModalVisible(false)}>
                            <Text style={{ color: theme.subtext, fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.searchBarContainer, { backgroundColor: theme.background }]}>
                        <TextInput 
                            style={[styles.searchInput, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', color: theme.text }]} 
                            placeholder="Search songs..." 
                            placeholderTextColor={theme.subtext} 
                            value={searchQuery} 
                            onChangeText={setSearchQuery} 
                            onSubmitEditing={() => searchMusic()} 
                        />
                        <TouchableOpacity style={styles.searchBtn} onPress={() => searchMusic()}><Ionicons name="search" size={20} color="white" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                        {searching ? (<ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />) : (
                            searchResults.map((song) => (
                                <View key={song.id} style={[styles.searchItem, { borderBottomColor: theme.border }]}>
                                    <Image source={require('../../../assets/icon.png')} style={styles.searchThumbnail} />
                                    <View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold', color: theme.text }} numberOfLines={1}>{song.title}</Text><Text style={{ color: theme.subtext, fontSize: 12 }}>{song.artist}</Text></View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={[styles.previewBtn, playingId === song.id ? { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' } : { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                                            onPress={async () => {
                                                if (playingId === song.id) {
                                                    setPlayingId(null);
                                                    await soundRef.current?.stopAsync();
                                                } else {
                                                    setPlayingId(song.id);
                                                    await loadAndPlayAudio(song);
                                                }
                                            }}
                                        >
                                            <Ionicons name={playingId === song.id ? "stop-circle" : "play"} size={24} color="#2563EB" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedMusic(song);
                                            setPlayingId(null);
                                            setMusicModalVisible(false);
                                        }}>
                                            <Ionicons name="add-circle" size={32} color="#2563EB" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    postButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
    postButtonActive: { backgroundColor: '#2563EB' },
    postButtonDisabled: { backgroundColor: '#E2E8F0' },
    postButtonText: { fontWeight: 'bold', fontSize: 16 },
    userAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E2E8F0', marginRight: 12 },
    userAvatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#DBEAFE' },
    userAvatarText: { color: '#172554', fontWeight: 'bold', fontSize: 18 },
    publicBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    publicBadgeText: { fontSize: 12, color: '#64748B', marginLeft: 4 },
    contentInput: { fontSize: 18, color: '#172554', minHeight: 180, textAlignVertical: 'top' },
    musicCard: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
    musicThumbnail: { width: 48, height: 48, borderRadius: 12, marginRight: 12, borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: '#2563EB', overflow: 'hidden' },
    trimmerContainer: { backgroundColor: '#172554', borderRadius: 24, overflow: 'hidden', elevation: 10 },
    trimmerHeader: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#172554', backgroundColor: 'rgba(31, 41, 55, 0.5)' },
    timeBadge: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    timeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    waveformArea: { paddingVertical: 40, backgroundColor: 'black', position: 'relative', alignItems: 'center', justifyContent: 'center' },
    centerCursor: { position: 'absolute', left: '50%', top: 20, bottom: 20, width: 2, backgroundColor: 'white', borderRadius: 1, marginLeft: -1, zIndex: 20 },
    cursorDotTop: { position: 'absolute', top: -6, left: -5, width: 12, height: 12, borderRadius: 6, backgroundColor: 'white', borderWidth: 2, borderColor: '#2563EB' },
    cursorDotBottom: { position: 'absolute', bottom: -6, left: -5, width: 12, height: 12, borderRadius: 6, backgroundColor: 'white', borderWidth: 2, borderColor: '#2563EB' },
    trimmerFooter: { backgroundColor: '#172554', padding: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#172554' },
    playButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    presetButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
    presetButtonActive: { backgroundColor: '#2563EB' },
    presetButtonInactive: { backgroundColor: '#172554' },
    presetText: { fontWeight: 'bold', fontSize: 11 },
    durationBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 8 },
    imageItemContainer: { width: 256, height: 192, marginRight: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20, zIndex: 10 },
    bottomActions: { borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 8, backgroundColor: 'white' },
    actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
    actionText: { marginLeft: 16, fontWeight: '500', color: '#374151', fontSize: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    searchBarContainer: { padding: 16, flexDirection: 'row' },
    searchInput: { flex: 1, backgroundColor: '#E2E8F0', padding: 12, borderRadius: 12, marginRight: 8, color: '#172554' },
    searchBtn: { backgroundColor: '#2563EB', width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    searchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    searchThumbnail: { width: 56, height: 56, borderRadius: 12, marginRight: 16, backgroundColor: '#2563EB', borderWidth: 1.5, borderColor: '#2563EB', overflow: 'hidden' },
    previewBtn: { marginRight: 12, padding: 8, borderRadius: 24 },
    hiddenPreview: { height: 10, width: 10, position: 'absolute', bottom: -100, right: -100, zIndex: -1, opacity: 0.1 },
    frameBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    frameBtnActive: { backgroundColor: '#2563EB', borderColor: '#c2410c' },
    frameBtnText: { marginLeft: 6, fontWeight: 'bold', color: '#64748B', fontSize: 13 },
});

export default CreatePostScreen;
