import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../services/api';
import PostCard, { PostType } from '../../components/PostCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const PostDetailScreen = ({ route, navigation }: any) => {
    const { post, postId, focusedComment } = route.params;
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);
    const [loadingPost, setLoadingPost] = useState(!post && !!postId);
    const [user, setUser] = useState<any>(null);
    const [currentPost, setCurrentPost] = useState<PostType | null>(post || null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedComment, setSelectedComment] = useState<any>(null);

    useEffect(() => {
        loadUserAndInit();
    }, [postId]);

    const loadUserAndInit = async () => {
        let currentU: any = null;
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                currentU = JSON.parse(u);
                setUser(currentU);
            }
        } catch (e) {
            console.error(e);
        }

        const targetPostId = post?.id || postId;
        if (targetPostId) {
            fetchComments(String(targetPostId));
        }

        if (!post && postId) {
            fetchSinglePost(postId, currentU?.id);
        }
    };

    const fetchSinglePost = async (id: string, uid?: string | number) => {
        try {
            setLoadingPost(true);
            const userParam = uid ? `&user_id=${uid}` : '';
            const res = await api.get(`get_posts.php?post_id=${id}${userParam}`);
            if (res.data.status === 'success' && res.data.data && res.data.data.length > 0) {
                const item = res.data.data[0];
                const transformedPost: PostType = {
                    id: String(item.id),
                    user: {
                        id: String(item.user_id),
                        name: item.name || 'User',
                        avatar: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/50'
                    },
                    content: item.description || item.status || '',
                    media: item.media || [],
                    likes: parseInt(item.likes) || 0,
                    comments: Array.isArray(item.comments) ? item.comments.length : (parseInt(item.comments) || 0),
                    timeAgo: item.date || '',
                    isLiked: !!item.user_liked,
                    isSaved: Boolean(item.user_saved || item.is_saved),
                    link: item.link
                };
                setCurrentPost(transformedPost);
            } else {
                Alert.alert("Error", "Post not found");
                navigation.goBack();
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load post");
        } finally {
            setLoadingPost(false);
        }
    };

    const loadUser = async () => {
        const u = await AsyncStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
    };

    const fetchComments = async (id: string) => {
        try {
            const res = await api.get(`get_posts.php?action=fetch_comments&id=${id}`);
            if (Array.isArray(res.data)) {
                setComments(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleDeleteCommentPrompt = () => {
        setOptionsModalVisible(false);
        if (!selectedComment || !currentPost) return;
        
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
                            const payload = { action: 'delete_comment', post_id: currentPost.id, comment_id: selectedComment.comment_id, comment: selectedComment.comment, user_id: user?.id || selectedComment.user_id };
                            setComments(prev => prev.filter(c => String(c.comment_id) !== String(selectedComment.comment_id)));
                            setCurrentPost(prev => prev ? ({ ...prev, comments: Math.max(0, prev.comments - 1) }) : null);
                            await api.post('like_comment_action.php', payload);
                            await fetchComments(String(currentPost.id));
                        } catch (e) {
                            console.error(e);
                            await fetchComments(String(currentPost?.id));
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
        }
        setOptionsModalVisible(false);
    };

    const handleCommentOptions = (item: any) => {
        if (!user || !item.user_id || String(user.id) !== String(item.user_id)) return;
        setSelectedComment(item);
        setOptionsModalVisible(true);
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !currentPost) return;
        if (!user) { Alert.alert("Login Required"); return; }

        try {
            if (editingCommentId) {
                const payload = {
                    action: 'edit_comment',
                    post_id: currentPost.id,
                    user_id: user.id,
                    comment_id: editingCommentId,
                    comment: newComment
                };
                
                setComments(prev => prev.map(c => String(c.comment_id) === String(editingCommentId) ? { ...c, comment: newComment } : c));
                setNewComment('');
                setEditingCommentId(null);
                
                await api.post('like_comment_action.php', payload);
            } else {
                const payload = {
                    id: currentPost.id,
                    user_id: user.id,
                    action: 'comment',
                    comment: newComment
                };
                await api.post('like_comment_action.php', payload);
                setNewComment('');
                fetchComments(currentPost.id);
                setCurrentPost(prev => prev ? ({ ...prev, comments: prev.comments + 1 }) : null);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to post comment");
        }
    };

    const renderComment = ({ item }: { item: any }) => {
        const isOwner = user && item.user_id && String(user.id) === String(item.user_id);
        
        return (
            <View className="flex-row p-3 border-b border-gray-100 bg-white">
                <Image
                    source={{ uri: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/50' }}
                    className="w-8 h-8 rounded-full bg-gray-200 mt-1"
                />
                <View className="ml-3 flex-1 pr-2">
                    <View className="flex-row items-center">
                        <View className="bg-gray-100 rounded-2xl px-3 py-2 self-start flex-shrink">
                            <Text className="font-bold text-gray-900 text-xs">{item.name}</Text>
                            <Text className="text-gray-800 text-sm mt-0.5">{item.comment}</Text>
                        </View>
                        {isOwner && (
                            <TouchableOpacity onPress={() => handleCommentOptions(item)} className="p-2 ml-1">
                                <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text className="text-gray-400 text-[10px] ml-2 mt-1">{item.date}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <View className="flex-row items-center border-b border-gray-200 p-2">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="font-bold text-lg ml-2">{currentPost?.user?.name || 'Post'}'s Post</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View className="flex-1">
                    {loadingPost ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#ea580c" />
                        </View>
                    ) : currentPost ? (
                        <FlashList
                            data={comments}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={renderComment}
                            ListHeaderComponent={
                                <View className="mb-2">
                                    <PostCard
                                        post={currentPost}
                                        currentUserId={user ? String(user.id) : undefined}
                                        shouldPlay={true}
                                        onUserPress={() => navigation.navigate('PublicProfile', { userId: currentPost.user?.id })}
                                    />
                                    <Text className="p-3 font-bold text-gray-500 text-sm">Comments</Text>
                                </View>
                            }
                            ListEmptyComponent={
                                !loadingComments ? (
                                    <Text className="text-center text-gray-400 py-10">No comments yet. Be the first!</Text>
                                ) : (
                                    <ActivityIndicator className="py-10" color="orange" />
                                )
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    ) : null}
                </View>

                <View className="bg-white border-t border-gray-200 p-2">
                    <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-1">
                        <TextInput
                            className="flex-1 py-2 text-gray-700 max-h-24"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim()}>
                            <Ionicons name="send" size={20} color={newComment.trim() ? '#ea580c' : '#bdc3c7'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Instagram style Bottom Sheet Modal for Comment Options */}
            <Modal
                visible={optionsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} 
                    activeOpacity={1} 
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View className="bg-white rounded-t-3xl pt-2 pb-8 px-4" onStartShouldSetResponder={() => true}>
                        <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6" />
                        
                        <TouchableOpacity onPress={handleEditCommentInit} className="flex-row items-center py-4 px-2 border-b border-gray-100">
                            <Ionicons name="pencil-outline" size={24} color="#374151" />
                            <Text className="text-gray-800 text-base font-semibold ml-4">Edit Comment</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={handleDeleteCommentPrompt} className="flex-row items-center py-4 px-2">
                            <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            <Text className="text-red-500 text-base font-semibold ml-4">Delete Comment</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

export default PostDetailScreen;
