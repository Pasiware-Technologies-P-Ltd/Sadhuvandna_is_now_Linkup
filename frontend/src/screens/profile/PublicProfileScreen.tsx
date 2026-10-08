import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Dimensions, Alert, Modal, TextInput, RefreshControl, Animated, Platform, DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import { CompatVideo as Video, ResizeMode } from '../../components/CompatVideo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostImage from '../../components/PostImage';
import PostCard from '../../components/PostCard'; // IMPORTED POSTCARD
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';
import * as ScreenCapture from 'expo-screen-capture';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';
import { ImageService } from '../../services/ImageService';

// Fix: Point to Root uploads, not Api/uploads
const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;
// Matched with FamilyScreen.tsx pattern which seems to be the working one
const FAMILY_PHOTO_URL = `${BASE_URL_ROOT}/uploads/family/`;
const POST_IMAGE_URL = `${BASE_URL_ROOT}/uploads/posts/`;

const { width } = Dimensions.get('window');

const PublicProfileScreen = ({ route, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { userId } = route.params;
    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [photoPosts, setPhotoPosts] = useState<any[]>([]);
    const [reelPosts, setReelPosts] = useState<any[]>([]);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'photos' | 'reels' | 'saved'>('photos');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<any>(null);

    const [followStats, setFollowStats] = useState<any>({
        followers: 0,
        following: 0,
        posts: 0,
        is_following: false,
        is_requested: false,
        is_connected: false,
        follows_me: false,
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [togglingFollow, setTogglingFollow] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Family Add State
    const [modalVisible, setModalVisible] = useState(false);
    const [famName, setFamName] = useState('');
    const [famRelation, setFamRelation] = useState('');
    const [famGender, setFamGender] = useState('Male');
    const [famDob, setFamDob] = useState('');
    const [famOccupation, setFamOccupation] = useState('');
    const [famMaritalStatus, setFamMaritalStatus] = useState('Unmarried');
    const [famHeight, setFamHeight] = useState('');
    const [famWeight, setFamWeight] = useState('');
    const [famEducation, setFamEducation] = useState('');
    const [famIncome, setFamIncome] = useState('');
    const [famCaste, setFamCaste] = useState('');
    const [famKuldevi, setFamKuldevi] = useState('');

    const [famPhoto, setFamPhoto] = useState<string | null>(null);
    const [submittingFam, setSubmittingFam] = useState(false);

    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [editFamId, setEditFamId] = useState<string | null>(null);

    // Image Viewer State
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState<any[]>([]);

    const [activePostId, setActivePostId] = useState<string | null>(null);
    const tabFadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loadCurrentUser = async () => {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                const u = JSON.parse(uStr);
                setCurrentUser(u);
                setCurrentUserId(u.id);
            } else {
                // Not logged in, still fetch with userId=0
                setCurrentUser(null);
                setCurrentUserId('0');
            }
        };
        loadCurrentUser();
    }, []);

    const loadCachedPublicProfile = async (uid: string) => {
        try {
            const cached = await AsyncStorage.getItem(`cached_public_profile_${uid}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.profile) setProfile(parsed.profile);
                if (parsed.posts) setPosts(parsed.posts);
                if (parsed.photoPosts) setPhotoPosts(parsed.photoPosts);
                if (parsed.reelPosts) setReelPosts(parsed.reelPosts);
                if (parsed.savedPosts) setSavedPosts(parsed.savedPosts);
                if (parsed.followStats) setFollowStats(parsed.followStats);
                setLoading(false);
                setStatsLoading(false);
            }
        } catch (e) {}
    };

    useEffect(() => {
        // Only fire once currentUserId is confirmed loaded (not null)
        if (currentUserId !== null) {
            const uid = userId || currentUserId;
            if (uid) {
                loadCachedPublicProfile(uid.toString()).then(() => {
                    fetchProfileData();
                });
            }
        }
    }, [userId, currentUserId]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUserId !== null || userId) {
                fetchProfileData();
            }
        });
        return unsubscribe;
    }, [navigation, currentUserId, userId]);

    const fetchProfileData = async () => {
        try {
            const uid = userId || currentUserId;
            if (!uid) return;

            setStatsLoading(true);

            const promises: Promise<any>[] = [
                api.get(`get_user_profile.php?user_id=${uid}`),
                api.get(`get_posts.php?filter_user_id=${uid}&user_id=${currentUserId || 0}`),
                api.post(`api_follow.php?action=get_counts`, { current_user_id: currentUserId || 0, user_id: uid }, {
                    headers: { 'Content-Type': 'application/json' }
                })
            ];

            const isCurrentOwner = currentUserId && uid.toString() === currentUserId.toString();
            if (isCurrentOwner) {
                promises.push(api.get(`get_posts.php?filter_saved=1&user_id=${currentUserId}`));
            }

            const results = await Promise.all(promises);
            const profileRes = results[0];
            const postsRes = results[1];
            const followRes = results[2];
            const savedRes = isCurrentOwner ? results[3] : null;

            if (profileRes.data.status === 'success') {
                setProfile(profileRes.data);
            }
            if (postsRes.data.status === 'success') {
                const allPosts = postsRes.data.data || [];
                const photos = allPosts.filter((p: any) => {
                    const isReel = ['mp4', 'mov', 'avi', 'mkv', '3gp'].some(ext => p.media?.some((m: string) => m.toLowerCase().endsWith(ext)));
                    return !isReel;
                });
                const reels = allPosts.filter((p: any) => {
                    const isReel = ['mp4', 'mov', 'avi', 'mkv', '3gp'].some(ext => p.media?.some((m: string) => m.toLowerCase().endsWith(ext)));
                    return isReel;
                });
                setPhotoPosts(photos);
                setReelPosts(reels);
                setPosts(allPosts);
            }
            if (savedRes && savedRes.data?.status === 'success') {
                setSavedPosts(savedRes.data.data || []);
            }
            if (followRes.data.ok) {
                setFollowStats(followRes.data);
            }

            const allPosts = postsRes.data.status === 'success' ? (postsRes.data.data || []) : posts;
            const photos = postsRes.data.status === 'success' ? allPosts.filter((p: any) => !['mp4', 'mov', 'avi', 'mkv', '3gp'].some(ext => p.media?.some((m: string) => m.toLowerCase().endsWith(ext)))) : photoPosts;
            const reels = postsRes.data.status === 'success' ? allPosts.filter((p: any) => ['mp4', 'mov', 'avi', 'mkv', '3gp'].some(ext => p.media?.some((m: string) => m.toLowerCase().endsWith(ext)))) : reelPosts;
            const savedList = (savedRes && savedRes.data?.status === 'success') ? (savedRes.data.data || []) : savedPosts;

            AsyncStorage.setItem(`cached_public_profile_${uid}`, JSON.stringify({
                profile: profileRes.data.status === 'success' ? profileRes.data : profile,
                posts: allPosts,
                photoPosts: photos,
                reelPosts: reels,
                savedPosts: savedList,
                followStats: followRes.data.ok ? followRes.data : followStats
            }));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    };

    const isFemale = profile?.user?.gender === 'Female' || profile?.user?.gender === 'female' || profile?.user?.gender === 'F';

    useFocusEffect(
        React.useCallback(() => {
            if (isFemale) {
                ScreenCapture.preventScreenCaptureAsync().catch(console.warn);
            }
            return () => {
                if (isFemale) {
                    ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
                }
            };
        }, [isFemale])
    );

    useEffect(() => {
        const uid = userId || currentUserId;

        const onFollowUpdated = (data: any) => {
            if (String(data.following_id) === String(uid)) {
                setFollowStats((prev: any) => ({
                    ...prev,
                    followers: data.status === 'connected' ? Number(prev.followers || 0) + 1 : Math.max(0, Number(prev.followers || 0) - 1)
                }));
            }
        };

        const handleCommentAdded = (data: any) => {
            const updatePosts = (prev: any[]) => prev.map(p => {
                if (p.id == data.post_id) {
                    if (Array.isArray(p.comments)) {
                        return { ...p, comments: [data.comment, ...p.comments] };
                    }
                    return { ...p, comments: Number(p.comments || 0) + 1 };
                }
                return p;
            });
            setPosts(updatePosts);
            setPhotoPosts(updatePosts);
            setReelPosts(updatePosts);
        };

        const handlePostDeleted = (data: any) => {
            const filterPosts = (prev: any[]) => prev.filter(p => p.id !== data.postId);
            setPosts(filterPosts);
            setPhotoPosts(filterPosts);
            setReelPosts(filterPosts);
        };

        const handleCommentDeleted = (data: any) => {
            const updatePosts = (prev: any[]) => prev.map(p => {
                if (p.id == data.post_id) {
                    if (Array.isArray(p.comments)) {
                        return { ...p, comments: p.comments.filter((c: any) => c.comment_id != data.comment_id) };
                    }
                    return { ...p, comments: Math.max(0, Number(p.comments || 0) - 1) };
                }
                return p;
            });
            setPosts(updatePosts);
            setPhotoPosts(updatePosts);
            setReelPosts(updatePosts);
        };

        const handleLikeUpdated = (data: any) => {
            const updatePosts = (prev: any[]) => prev.map(p => {
                if (p.id == data.post_id) {
                    const newLikes = data.status === 'liked'
                        ? Number(p.likes || 0) + 1
                        : Math.max(0, Number(p.likes || 0) - 1);
                    if (currentUserId && data.user_id && String(data.user_id) === String(currentUserId)) {
                        return {
                            ...p,
                            likes: newLikes,
                            isLiked: data.status === 'liked',
                            user_liked: data.status === 'liked'
                        };
                    }
                    return { ...p, likes: newLikes };
                }
                return p;
            });
            setPosts(updatePosts);
            setPhotoPosts(updatePosts);
            setReelPosts(updatePosts);
        };

        const followSub = DeviceEventEmitter.addListener('follow_counts_updated', onFollowUpdated);
        const commentAddedSub = DeviceEventEmitter.addListener('post_comment_added', handleCommentAdded);
        const commentDeletedSub = DeviceEventEmitter.addListener('post_comment_deleted', handleCommentDeleted);
        const likeUpdatedSub = DeviceEventEmitter.addListener('post_like_updated', handleLikeUpdated);
        const postDeletedSub = DeviceEventEmitter.addListener('postDeleted', handlePostDeleted);

        return () => {
            followSub.remove();
            commentAddedSub.remove();
            commentDeletedSub.remove();
            likeUpdatedSub.remove();
            postDeletedSub.remove();
        };
    }, [userId, currentUserId]);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProfileData();
        setRefreshing(false);
    };

    const handleToggleFollow = async () => {
        if (!currentUserId) return;
        const uid = userId || currentUserId;
        if (uid === currentUserId) return;

        setTogglingFollow(true);
        try {
            const formData = new FormData();
            formData.append('current_user_id', currentUserId);
            formData.append('user_id', uid);
            const res = await api.post('api_follow.php?action=follow', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.ok) {
                await fetchProfileData();
            } else {
                Alert.alert("Notice", res.data.message || "Failed to follow");
            }
        } catch (error) {
            Alert.alert("Error", "Network error while updating connection status.");
        } finally {
            setTogglingFollow(false);
        }
    };

    const handleDelete = async (postId: string) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const formData = new FormData();
                            formData.append('post_id', postId);
                            formData.append('user_id', profile?.user?.id || '');
                            const res = await api.post('remove_post.php', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.status === 'success') {
                                setPosts(prev => prev.filter(p => p.id !== postId));
                                import('react-native').then(({ DeviceEventEmitter }) => {
                                    DeviceEventEmitter.emit('postDeleted', { postId });
                                });
                                Alert.alert("Success", "Post deleted");
                            } else {
                                Alert.alert("Error", res.data.message || "Failed to delete");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Network request failed");
                        }
                    }
                }
            ]
        );
    };

    const pickFamilyImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setFamPhoto(result.assets[0].uri);
        }
    };

    const handleEditMember = (member: any) => {
        setEditFamId(member.id);
        setFamName(member.name);
        setFamRelation(member.relation);
        setFamGender(member.gender || 'Male');
        setFamDob(member.dob || '');
        setFamOccupation(member.occupation || '');
        setFamMaritalStatus(member.marital_status || 'Unmarried');
        setFamHeight(member.height || '');
        setFamWeight(member.weight || '');
        setFamEducation(member.education || '');
        setFamIncome(member.income || '');
        setFamCaste(member.caste || '');
        setFamKuldevi(member.kuldevi || '');
        setFamPhoto(member.photo ? `${FAMILY_PHOTO_URL}${member.photo}` : null);
        setModalVisible(true);
        setViewModalVisible(false);
    };

    const resetFamForm = () => {
        setEditFamId(null);
        setFamName('');
        setFamRelation('');
        setFamGender('Male');
        setFamOccupation('');
        setFamDob('');
        setFamMaritalStatus('Unmarried');
        setFamHeight('');
        setFamWeight('');
        setFamEducation('');
        setFamIncome('');
        setFamCaste('');
        setFamKuldevi('');
        setFamPhoto(null);
    };

    const handleAddMember = async () => {
        if (!famName || !famRelation || !currentUserId) {
            Alert.alert("Error", "Name and Relation are required");
            return;
        }

        setSubmittingFam(true);
        try {
            const formData = new FormData();
            formData.append('action', editFamId ? 'update' : 'add');
            if (editFamId) formData.append('id', editFamId);
            formData.append('user_id', currentUserId);
            formData.append('name', famName);
            formData.append('relation', famRelation);
            formData.append('gender', famGender);
            formData.append('dob', famDob);
            formData.append('occupation', famOccupation);
            formData.append('marital_status', famMaritalStatus);
            formData.append('height', famHeight);
            formData.append('weight', famWeight);
            formData.append('education', famEducation);
            formData.append('income', famIncome);
            formData.append('caste', famCaste);
            formData.append('kuldevi', famKuldevi);

            if (famPhoto && !famPhoto.startsWith('http')) {
                const filename = famPhoto.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('photo', { uri: famPhoto, name: filename, type } as any);
            }

            const res = await api.post('manage_family.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.status === 'success') {
                Alert.alert("Success", editFamId ? "Member Updated" : "Member Added");
                setModalVisible(false);
                resetFamForm();
                fetchProfileData();
            } else {
                Alert.alert("Error", res.data.message || "Failed to save member");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setSubmittingFam(false);
        }
    };

    const handleDeleteMember = async (memberId: string) => {
        Alert.alert("Confirm Delete", "Delete this family member?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'delete');
                        formData.append('id', memberId);
                        await api.post('manage_family.php', formData);
                        fetchProfileData();
                    } catch (error) { console.error(error); }
                }
            }
        ]);
    };

    const getImageUrl = (photo: string | undefined | null, baseUrl: string) => {
        if (!photo) return 'https://via.placeholder.com/100';
        if (photo.startsWith('http')) return photo;
        return `${baseUrl}${photo}`;
    };

    const openImageViewer = (url: string) => {
        setViewerImages([{ url: ImageService.getDetailImageUrl(url) }]);
        setImageModalVisible(true);
    };

    const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setActivePostId(viewableItems[0].key);
        } else {
            setActivePostId(null);
        }
    }).current;

    const viewabilityConfig = React.useRef({
        itemVisiblePercentThreshold: 70,
    }).current;

    const user = profile?.user || {};
    const family = profile?.family || [];
    const marriage_profile = profile?.marriage_profile || null;
    const isOwner = currentUserId == user.id;
    const isCurrentViewerBusiness = currentUser?.is_business == 1 || currentUser?.is_business === '1';
    const isTargetBusiness = user?.is_business == 1 || user?.is_business === '1';
    const canShowMatrimony = !isCurrentViewerBusiness && !isTargetBusiness;

    const renderHeader = () => (
        <>
            <View style={{ height: 155, backgroundColor: '#ea580c', position: 'relative', overflow: 'hidden' }}>
                {user.cover_photo ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => user.cover_photo && openImageViewer(getImageUrl(user.cover_photo, PHOTO_URL))}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <Image
                            source={{ uri: getImageUrl(user.cover_photo, PHOTO_URL) }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    </TouchableOpacity>
                ) : (
                    <>
                        {/* Decorative background glass bubbles */}
                        <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)', top: -110, right: -50 }} />
                        <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -45, left: -25 }} />
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="images-outline" size={30} color="rgba(255,255,255,0.35)" />
                        </View>
                    </>
                )}
            </View>

            {/* Profile Card Overlay Wrapper */}
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Avatar & Stats Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => user.profile_photo && openImageViewer(getImageUrl(user.profile_photo, PHOTO_URL))}
                        style={{
                            marginTop: -55,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 5
                        }}
                    >
                        <Image
                            source={{ uri: getImageUrl(user.profile_photo, PHOTO_URL) }}
                            style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: 'white', backgroundColor: '#f3f4f6' }}
                        />
                    </TouchableOpacity>

                    {/* Stats Bar */}
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 16 }}>
                        <View style={{ alignItems: 'center' }}>
                            {statsLoading ? (
                                <View style={{ width: 32, height: 16, backgroundColor: '#f3f4f6', borderRadius: 4 }} />
                            ) : (
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats?.posts || 0}</Text>
                            )}
                            <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('posts')}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_followers', title: 'Followers' })}
                            style={{ alignItems: 'center' }}
                            activeOpacity={0.7}
                        >
                            {statsLoading ? (
                                <View style={{ width: 32, height: 16, backgroundColor: '#f3f4f6', borderRadius: 4 }} />
                            ) : (
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats?.followers || 0}</Text>
                            )}
                            <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('followers')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.push('FollowList', { userId: user.id, action: 'fetch_following', title: 'Following' })}
                            style={{ alignItems: 'center' }}
                            activeOpacity={0.7}
                        >
                            {statsLoading ? (
                                <View style={{ width: 32, height: 16, backgroundColor: '#f3f4f6', borderRadius: 4 }} />
                            ) : (
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{followStats?.following || 0}</Text>
                            )}
                            <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('following')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* User Info Details */}
                <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginRight: 8 }}>
                            {user.name || "Community Member"}
                        </Text>
                        {followStats.follows_me && (
                            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 9, color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('followsYou')}</Text>
                            </View>
                        )}
                    </View>
                    {user.is_business == 1 && user.category ? (
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pricetag-outline" size={13} color="#ea580c" />
                            <Text style={{ fontSize: 13, color: '#ea580c', marginLeft: 4, fontWeight: '600' }}>{user.category}</Text>
                        </View>
                    ) : null}
                    {user.joined_date && !user.joined_date.startsWith('0000') && (
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Joined {new Date(user.joined_date).toLocaleDateString()}</Text>
                    )}
                    {user.about ? <Text style={{ fontSize: 13, color: '#4b5563', fontStyle: 'italic', marginTop: 6 }}>{user.about}</Text> : null}
                    {user.city ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <Ionicons name="location-outline" size={14} color="#6b7280" />
                            <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{user.city}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Action Shortcuts */}
                <View style={{ marginVertical: 16 }}>
                    {isOwner ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate(user.is_business == 1 ? 'EditBusinessPage' : 'EditProfile')}
                            style={{ backgroundColor: '#f3f4f6', borderRadius: 14, height: 42, alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{t('editProfile')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                disabled={togglingFollow}
                                onPress={handleToggleFollow}
                                style={{
                                    flex: 2,
                                    borderRadius: 14,
                                    height: 42,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: followStats.is_following || followStats.is_connected
                                        ? '#f0fdf4'
                                        : (followStats.is_requested && !user.is_business) ? '#f3f4f6' : '#ea580c',
                                    borderWidth: 1,
                                    borderColor: followStats.is_following || followStats.is_connected
                                        ? '#dcfce7'
                                        : (followStats.is_requested && !user.is_business) ? '#e5e7eb' : '#ea580c',
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: 'bold',
                                    color: followStats.is_following || followStats.is_connected
                                        ? '#16a34a'
                                        : (followStats.is_requested && !user.is_business) ? '#6b7280' : 'white'
                                }}>
                                    {togglingFollow ? t('updating') :
                                        user.is_business
                                            // Business page: Follow / Following
                                            ? (followStats.is_following || followStats.is_connected || followStats.is_requested ? t('following') : `+ ${t('followers')}`)
                                            // Personal: Connect flow
                                            : (followStats.is_connected ? t('connected') :
                                                followStats.is_requested ? t('requested') :
                                                    followStats.follows_me ? t('acceptRequest') :
                                                        followStats.is_following ? t('connected') : t('connect'))}
                                </Text>
                            </TouchableOpacity>

                            {(followStats.is_connected || followStats.is_following) && !user.is_business && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Chat', {
                                        receiver: {
                                            id: user.id,
                                            name: user.name,
                                            profile_photo: user.profile_photo
                                        },
                                        platform: 'community'
                                    })}
                                    style={{ flex: 1, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', borderRadius: 14, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={16} color="#ea580c" />
                                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ea580c' }}>{t('message')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Business Details Card - only for business profiles */}
                {user.is_business == 1 && profile?.business_details && (
                    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10, marginBottom: 12 }}>
                            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#0064e015', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="briefcase" size={15} color="#0064e0" />
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>Business Details</Text>
                        </View>
                        <View style={{ gap: 10 }}>
                            {profile.business_details.phone_no ? (
                                <TouchableOpacity onPress={() => Linking.openURL(`tel:${profile.business_details.phone_no}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#10b98115', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="call-outline" size={15} color="#10b981" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Phone</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0064e0' }}>{profile.business_details.phone_no}</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                            {profile.business_details.email ? (
                                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${profile.business_details.email}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#3b82f615', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="mail-outline" size={15} color="#3b82f6" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Email</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0064e0' }}>{profile.business_details.email}</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                            {profile.business_details.website_url ? (
                                <TouchableOpacity onPress={() => Linking.openURL(profile.business_details.website_url.startsWith('http') ? profile.business_details.website_url : `https://${profile.business_details.website_url}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#8b5cf615', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="globe-outline" size={15} color="#8b5cf6" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Website</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0064e0' }}>{profile.business_details.website_url}</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                            {profile.business_details.full_address ? (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#ea580c15', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="location-outline" size={15} color="#ea580c" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Address</Text>
                                        <Text style={{ fontSize: 13, color: '#374151' }}>{profile.business_details.full_address}{profile.business_details.district ? `, ${profile.business_details.district}` : ''}{profile.business_details.state ? `, ${profile.business_details.state}` : ''}{profile.business_details.pincode ? ` - ${profile.business_details.pincode}` : ''}</Text>
                                    </View>
                                </View>
                            ) : null}
                            {profile.business_details.opening_hours ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eab30815', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="time-outline" size={15} color="#eab308" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Working Hours</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>{profile.business_details.opening_hours}</Text>
                                    </View>
                                </View>
                            ) : null}
                            {profile.business_details.social_media_account ? (
                                <TouchableOpacity onPress={() => Linking.openURL(profile.business_details.social_media_account.startsWith('http') ? profile.business_details.social_media_account : `https://${profile.business_details.social_media_account}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f43f5e15', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="share-social-outline" size={15} color="#f43f5e" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Social Media</Text>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0064e0' }}>{profile.business_details.social_media_account}</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                )}

                {/* Personal Details Section Card - only for personal profiles */}
                {!user.is_business && (
                <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 6, elevation: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', borderBottomWidth: 1, borderBottomColor: '#f9fafb', paddingBottom: 8, marginBottom: 12 }}>Personal Details</Text>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {user.education && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#3b82f612', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="school-outline" size={14} color="#3b82f6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Education</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.education}</Text>
                                </View>
                            </View>
                        )}
                        {user.gender && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#8b5cf612', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="male-female-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Gender</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.gender}</Text>
                                </View>
                            </View>
                        )}
                        {user.dob && !user.dob.startsWith('0000') && !isNaN(new Date(user.dob).getTime()) && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#f59e0b12', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="calendar-outline" size={14} color="#f59e0b" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>DOB</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>
                                        {new Date(user.dob).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        )}
                        {user.state && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#14b8a612', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="map-outline" size={14} color="#14b8a6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>State</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.state}</Text>
                                </View>
                            </View>
                        )}
                        {user.occupation && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#10b98112', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="briefcase-outline" size={14} color="#10b981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Occupation</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.occupation}</Text>
                                </View>
                            </View>
                        )}
                        {user.maritial_status && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ec489912', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="heart-outline" size={14} color="#ec4899" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.maritial_status}</Text>
                                </View>
                            </View>
                        )}
                        {user.cast && (
                            <View style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ea580c12', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="people-outline" size={14} color="#ea580c" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Caste</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }} numberOfLines={1}>{user.cast}</Text>
                                </View>
                            </View>
                        )}
                        {user.hobbi && (
                            <View style={{ width: '97%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#8b5cf612', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="sparkles-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Hobbies</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }}>{user.hobbi}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
                )}
            </View>

            {/* Family & Marriage Info Section Card - only for personal profiles */}
            {!user.is_business && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb', paddingBottom: 8, marginBottom: 12 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ea580c12', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="people" size={16} color="#ea580c" />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 }}>Family & Marriage Info</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Family Members</Text>
                        {isOwner && (
                            <TouchableOpacity onPress={() => { resetFamForm(); setModalVisible(true); }}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ea580c' }}>+ Add Member</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {family && family.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {family.map((member: any, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ marginRight: 16, alignItems: 'center', width: 64, position: 'relative' }}
                                    onPress={() => {
                                        setSelectedMember(member);
                                        setViewModalVisible(true);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={{ uri: member.photo ? `${FAMILY_PHOTO_URL}${member.photo}` : 'https://via.placeholder.com/100' }}
                                        style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#ffedd5', backgroundColor: '#f9fafb' }}
                                    />
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#374151', textAlign: 'center', marginTop: 4 }} numberOfLines={1}>{member.name}</Text>
                                    <Text style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>{member.relation}</Text>
                                    {isOwner && (
                                        <>
                                            <TouchableOpacity
                                                style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fee2e2', zIndex: 10 }}
                                                onPress={() => handleDeleteMember(member.id)}
                                            >
                                                <Ionicons name="close" size={10} color="#ef4444" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ position: 'absolute', bottom: 12, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe', zIndex: 10 }}
                                                onPress={() => handleEditMember(member)}
                                            >
                                                <Ionicons name="pencil" size={10} color="#3b82f6" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>No family members added.</Text>
                    )}

                    {canShowMatrimony && (
                        marriage_profile ? (
                            <View style={{ backgroundColor: '#fff7ed', borderRadius: 14, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#ffedd5', flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => navigation.navigate('MarriageDetail', { profile: marriage_profile })}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Ionicons name="heart" size={20} color="#ea580c" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#7c2d12' }}>Marriage Profile</Text>
                                        <Text style={{ fontSize: 11, color: '#c2410c' }}>{marriage_profile.city} • {marriage_profile.caste}</Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ea580c', marginRight: 4 }}>VIEW</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#ea580c" />
                                </TouchableOpacity>
                            </View>
                        ) : isOwner ? (
                            <TouchableOpacity
                                style={{ backgroundColor: '#fff7ed', borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#ffedd5', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                                onPress={() => navigation.navigate('CreateMarriageProfile')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="heart-outline" size={18} color="#ea580c" />
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ea580c' }}>{t('createMatrimonyProfile')}</Text>
                            </TouchableOpacity>
                        ) : null
                    )}
                </View>
            </View>
            )}

            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: 'white', marginTop: 8 }}>
                <TouchableOpacity
                    onPress={() => setActiveTab('photos')}
                    style={{ flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: activeTab === 'photos' ? 2 : 0, borderBottomColor: '#ea580c' }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="images-outline" size={18} color={activeTab === 'photos' ? "#ea580c" : "#6b7280"} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'photos' ? '#ea580c' : '#6b7280' }}>
                        {t('photos')} ({photoPosts.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('reels')}
                    style={{ flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: activeTab === 'reels' ? 2 : 0, borderBottomColor: '#ea580c' }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="film-outline" size={18} color={activeTab === 'reels' ? "#ea580c" : "#6b7280"} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'reels' ? '#ea580c' : '#6b7280' }}>
                        {t('reels')} ({reelPosts.length})
                    </Text>
                </TouchableOpacity>
                {isOwner && (
                    <TouchableOpacity
                        onPress={() => setActiveTab('saved')}
                        style={{ flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: activeTab === 'saved' ? 2 : 0, borderBottomColor: '#ea580c' }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={activeTab === 'saved' ? "bookmark" : "bookmark-outline"} size={18} color={activeTab === 'saved' ? "#ea580c" : "#6b7280"} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeTab === 'saved' ? '#ea580c' : '#6b7280' }}>
                            {t('saved')} ({savedPosts.length})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </>
    );

    const reelRows = useMemo(() => {
        const result = [];
        for (let i = 0; i < reelPosts.length; i += 3) {
            result.push(reelPosts.slice(i, i + 3));
        }
        return result;
    }, [reelPosts]);

    useEffect(() => {
        // Smooth Fade and Scroll
        Animated.sequence([
            Animated.timing(tabFadeAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
            Animated.timing(tabFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start();

        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, [activeTab]);

    const renderPostItem = useCallback(({ item, index }: { item: any, index: number }) => (
        <PostCard
            key={item.id || index}
            post={{
                id: item.id,
                user: {
                    id: item.user_id,
                    name: item.name || user.name,
                    avatar: item.profile_photo ? getImageUrl(item.profile_photo, PHOTO_URL) : (getImageUrl(user.profile_photo, PHOTO_URL) || ''),
                },
                content: item.description,
                media: item.media,
                image: item.image,
                likes: parseInt(item.likes) || 0,
                comments: item.comments?.length || 0,
                timeAgo: item.date ? 
                    (() => {
                        const d = new Date(item.date);
                        return isNaN(d.getTime()) ? item.date : d.toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: 'numeric', minute: 'numeric', hour12: true
                        });
                    })() : '',
                isLiked: item.user_liked,
                isSaved: item.user_saved === 1 || item.is_saved === 1 || activeTab === 'saved',
                link: item.link
            }}
            currentUserId={currentUserId || ''}
            onDeletePress={() => handleDelete(item.id)}
            shouldPlay={activePostId === item.id}
        />
    ), [user, currentUserId, activePostId, activeTab]);

    const renderReelRow = useCallback(({ item: row, index: rowIndex }: { item: any[], index: number }) => {
        return (
            <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', paddingHorizontal: 2 }}>
                {row.map((item, index) => {
                    let meta: any = null;
                    try {
                        if (item.link) {
                            if (typeof item.link === 'object') meta = item.link;
                            else if (typeof item.link === 'string' && item.link.startsWith('{')) meta = JSON.parse(item.link);
                        }
                    } catch (e) {}

                    const thumbnail = meta?.thumbnail || (item.media?.[0] ? `${POST_IMAGE_URL}${item.media[0]}` : null);
                    const isVideoMedia = item.media?.[0] ? ['mp4', 'mov', 'avi', 'mkv'].some(ext => item.media[0].toLowerCase().endsWith(ext)) : false;

                    return (
                        <TouchableOpacity 
                            key={item.id || index}
                            style={{ width: (width - 4) / 3, height: ((width - 4) / 3) * 1.5, padding: 1 }}
                            onPress={() => {
                                // @ts-ignore
                                navigation.navigate('ReelsViewer', {
                                    startPostId: item.id,
                                    filter_user_id: user.id
                                });
                            }}
                        >
                            <View style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                {isVideoMedia ? (
                                    <Video
                                        source={{ uri: `${POST_IMAGE_URL}${item.media[0]}` }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={false}
                                        usePoster={true}
                                    />
                                ) : meta?.thumbnail ? (
                                    <Image source={{ uri: meta.thumbnail }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }}>
                                        <Ionicons name="film-outline" size={24} color="#9ca3af" />
                                    </View>
                                )}
                                <View style={{ position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="play-outline" size={12} color="white" />
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 2 }}>{item.likes || 0}</Text>
                                </View>
                                {String(currentUserId) === String(item.user_id) && (
                                    <TouchableOpacity 
                                        style={{ position: 'absolute', top: 4, right: 4, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 }}
                                        onPress={() => handleDelete(item.id)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {row.length < 3 && Array(3 - row.length).fill(0).map((_, i) => (
                    <View key={`filler-${i}`} style={{ width: (width - 4) / 3, height: ((width - 4) / 3) * 1.5, padding: 1 }} />
                ))}
            </View>
        );
    }, [navigation, width, currentUserId, handleDelete]);

    const renderItem = useCallback(({ item, index }: any) => {
        if (activeTab === 'reels') return renderReelRow({ item, index });
        return renderPostItem({ item, index });
    }, [activeTab, renderPostItem, renderReelRow]);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#ea580c" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-500">User not found</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar style="light" translucent={true} backgroundColor="#0000004d" />
            {/* Floating Back Button Overlay */}
            <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={{ 
                    position: 'absolute', 
                    top: Math.max(insets.top + 8, 16), 
                    left: 16, 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: 'rgba(0, 0, 0, 0.45)', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 100 
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            <Animated.View style={{ flex: 1, opacity: tabFadeAnim }}>
                <FlashList
                    ref={flatListRef}
                    data={activeTab === 'photos' ? photoPosts : activeTab === 'reels' ? reelRows : savedPosts}
                    renderItem={renderItem}
                    keyExtractor={(item: any, index) => (Array.isArray(item) ? item[0]?.id : item.id)?.toString() || index.toString()}
                    numColumns={1}
                    ListHeaderComponent={renderHeader}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <Text className="text-center text-gray-500 py-10">
                            {activeTab === 'saved' ? (t('noSavedPosts') || 'No saved posts yet.') : `No ${activeTab} shared yet.`}
                        </Text>
                    }
                    contentContainerStyle={{ paddingBottom: 40 }}
                    className="bg-gray-50"
                />
            </Animated.View>

            {/* Add Family Member Modal */}
            <Modal animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)} presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">{editFamId ? 'Edit Family Member' : 'Add Family Member'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text className="text-gray-500 text-lg">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-5">

                        <View className="items-center mb-6">
                            <TouchableOpacity onPress={pickFamilyImage}>
                                {famPhoto ? (
                                    <Image source={{ uri: famPhoto }} className="w-24 h-24 rounded-full" />
                                ) : (
                                    <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center border border-gray-300">
                                        <Ionicons name="camera" size={24} color="gray" />
                                        <Text className="text-xs text-gray-500 mt-1">Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4 mb-20">
                            <View>
                                <Text className="mb-1 text-gray-600">Name *</Text>
                                <TextInput value={famName} onChangeText={setFamName} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholderTextColor="#9ca3af" />
                            </View>
                            <View>
                                <Text className="mb-1 text-gray-600">Relation *</Text>
                                <TextInput value={famRelation} onChangeText={setFamRelation} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholder="e.g. Brother" placeholderTextColor="#9ca3af" />
                            </View>
                            <View>
                                <Text className="mb-1 text-gray-600">Gender</Text>
                                <View className="flex-row gap-4">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <TouchableOpacity key={g} onPress={() => setFamGender(g)} className={`px-4 py-2 rounded-full border ${famGender === g ? 'bg-orange-50 border-orange-500' : 'border-gray-200'}`}>
                                            <Text className={famGender === g ? 'text-orange-600' : 'text-gray-600'}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Marital Status</Text>
                                <View className="flex-row gap-2 flex-wrap">
                                    {['Unmarried', 'Married', 'Divorced', 'Widow'].map(s => (
                                        <TouchableOpacity key={s} onPress={() => setFamMaritalStatus(s)} className={`px-3 py-1.5 rounded-full border ${famMaritalStatus === s ? 'bg-orange-50 border-orange-500' : 'border-gray-200'}`}>
                                            <Text className={`text-xs ${famMaritalStatus === s ? 'text-orange-600' : 'text-gray-600'}`}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Occupation</Text>
                                <TextInput value={famOccupation} onChangeText={setFamOccupation} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholder="e.g. Engineer" placeholderTextColor="#9ca3af" />
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">DOB (YYYY-MM-DD)</Text>
                                <TextInput value={famDob} onChangeText={setFamDob} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholder="2000-01-01" placeholderTextColor="#9ca3af" />
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="mb-1 text-gray-600">Height</Text>
                                    <TextInput value={famHeight} onChangeText={setFamHeight} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholder="e.g. 5.9" placeholderTextColor="#9ca3af" />
                                </View>
                                <View className="flex-1">
                                    <Text className="mb-1 text-gray-600">Weight</Text>
                                    <TextInput value={famWeight} onChangeText={setFamWeight} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholder="e.g. 70kg" placeholderTextColor="#9ca3af" />
                                </View>
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Education</Text>
                                <TextInput value={famEducation} onChangeText={setFamEducation} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholderTextColor="#9ca3af" />
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Monthly Income</Text>
                                <TextInput value={famIncome} onChangeText={setFamIncome} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" keyboardType="numeric" placeholderTextColor="#9ca3af" />
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Caste / Samaj</Text>
                                <TextInput value={famCaste} onChangeText={setFamCaste} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholderTextColor="#9ca3af" />
                            </View>

                            <View>
                                <Text className="mb-1 text-gray-600">Kuldevi</Text>
                                <TextInput value={famKuldevi} onChangeText={setFamKuldevi} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-900" placeholderTextColor="#9ca3af" />
                            </View>

                        </View>
                    </ScrollView>
                    <View className="p-4 border-t border-gray-100">
                        <TouchableOpacity onPress={handleAddMember} disabled={submittingFam} className="bg-orange-600 py-4 rounded-xl items-center">
                            {submittingFam ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Member</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* View Member Details Modal */}
            <Modal animationType="fade" visible={viewModalVisible} onRequestClose={() => setViewModalVisible(false)} transparent={true}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <View className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-bold text-gray-900">Family Member Details</Text>
                            <TouchableOpacity onPress={() => setViewModalVisible(false)} className="bg-gray-100 p-1 rounded-full">
                                <Ionicons name="close" size={20} color="gray" />
                            </TouchableOpacity>
                        </View>

                        {selectedMember && (
                            <ScrollView className="max-h-[80%]">
                                <View className="items-center mb-4">
                                    <Image
                                        source={{ uri: selectedMember.photo ? `${FAMILY_PHOTO_URL}${selectedMember.photo}` : 'https://via.placeholder.com/100' }}
                                        className="w-24 h-24 rounded-full bg-gray-200 mb-2 border-2 border-orange-100"
                                    />
                                    <Text className="text-xl font-bold text-gray-800">{selectedMember.name}</Text>
                                    <Text className="text-orange-600 font-medium">{selectedMember.relation}</Text>
                                </View>

                                <View className="space-y-3">
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Gender</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.gender || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Marital Status</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.marital_status || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Occupation</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.occupation || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">DOB</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.dob || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Education</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.education || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Income</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.income ? `₹${selectedMember.income}` : 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Height</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.height || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Weight</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.weight || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Caste</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.caste || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row border-b border-gray-100 py-2">
                                        <Text className="w-28 text-gray-500">Kuldevi</Text>
                                        <Text className="flex-1 text-gray-800">{selectedMember.kuldevi || 'N/A'}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        )}

                        <TouchableOpacity onPress={() => setViewModalVisible(false)} className="mt-6 bg-orange-600 py-3 rounded-xl items-center">
                            <Text className="text-white font-bold">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Profile/Cover Image Viewer Modal */}
            <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)}>
                <ImageViewer
                    imageUrls={viewerImages}
                    onSwipeDown={() => setImageModalVisible(false)}
                    enableSwipeDown={true}
                    renderHeader={() => (
                        <TouchableOpacity
                            onPress={() => setImageModalVisible(false)}
                            style={{ position: 'absolute', top: 50, right: 20, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 }}
                        >
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                />
            </Modal>

        </View>
    );
};

export default PublicProfileScreen;
