import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;

const CommentsScreen = ({ route, navigation }: any) => {
    const { postId } = route.params;
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedComment, setSelectedComment] = useState<any>(null);

    useEffect(() => {
        loadUser();
        fetchComments();
    }, []);

    const loadUser = async () => {
        const u = await AsyncStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`get_posts.php?action=fetch_comments&id=${postId}`);

            if (Array.isArray(res.data)) {
                setComments(res.data);
            } else if (res.data.status === 'success' && Array.isArray(res.data.data)) {
                setComments(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId: string, commentText: string) => {
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
                            const payload = { action: 'delete_comment', post_id: postId, comment_id: commentId, comment: commentText };
                            // Immediately remove from UI
                            setComments(prev => prev.filter(c => c.comment_id !== commentId));
                            await api.post('like_comment_action.php', payload);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (item: any) => {
        setEditingCommentId(item.comment_id);
        setNewComment(item.comment);
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;
        if (!user) {
            Alert.alert("Login Required", "Please login to comment.");
            return;
        }

        setSending(true);
        try {
            if (editingCommentId) {
                // EDIT MODE
                const payload = {
                    action: 'edit_comment',
                    post_id: postId,
                    user_id: user.id,
                    comment_id: editingCommentId,
                    comment: newComment
                };
                
                // Optimistic UI update
                setComments(prev => prev.map(c => String(c.comment_id) === String(editingCommentId) ? { ...c, comment: newComment } : c));
                setNewComment('');
                setEditingCommentId(null);
                
                await api.post('like_comment_action.php', payload);
            } else {
                // CREATE MODE
                const payload = {
                    action: 'comment',
                    id: postId,
                    user_id: user.id,
                    comment: newComment
                };

                const res = await api.post('like_comment_action.php', payload);
                if (res.data.ok || res.data.status === 'success' || res.data.ok === true) {
                    setNewComment('');
                    fetchComments(); // Refresh list
                } else {
                    Alert.alert("Error", "Failed to post comment");
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setSending(false);
        }
    };

    const handleDeleteCommentPrompt = () => {
        setOptionsModalVisible(false);
        if (!selectedComment) return;
        
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
                            const payload = { action: 'delete_comment', post_id: postId, comment_id: selectedComment.comment_id, comment: selectedComment.comment };
                            setComments(prev => prev.filter(c => String(c.comment_id) !== String(selectedComment.comment_id)));
                            await api.post('like_comment_action.php', payload);
                        } catch (e) {
                            console.error(e);
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

    const handleOptions = (item: any) => {
        if (!user || !item.user_id || String(user.id) !== String(item.user_id)) return;
        setSelectedComment(item);
        setOptionsModalVisible(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isOwner = user && item.user_id && String(user.id) === String(item.user_id);
        
        return (
            <View className="flex-row mb-4">
                <Image
                    source={{ uri: item.profile_photo ? `${PHOTO_URL}${item.profile_photo}` : 'https://via.placeholder.com/50' }}
                    className="w-10 h-10 rounded-full bg-gray-200 mr-3"
                />
                <View className="flex-1 bg-gray-100 rounded-xl p-3">
                    <View className="flex-row justify-between items-start mb-1">
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 text-sm">{item.name}</Text>
                            <Text className="text-xs text-gray-500">{item.date}</Text>
                        </View>
                        {isOwner && (
                            <TouchableOpacity onPress={() => handleOptions(item)} className="p-1 -mr-1 -mt-1">
                                <Ionicons name="ellipsis-vertical" size={16} color="gray" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text className="text-gray-700 leading-5">{item.comment}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <View className="flex-row items-center p-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">Comments</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                className="flex-1"
                enabled={true}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#ea580c" className="mt-10" />
                ) : (
                    <FlashList
                        data={comments}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ padding: 16 }}
                        ListEmptyComponent={
                            <View className="items-center mt-10">
                                <Text className="text-gray-400">No comments yet. Be the first!</Text>
                            </View>
                        }
                    />
                )}

                <View className="p-3 bg-white border-t border-gray-100 flex-row items-center">
                    <TextInput
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2 text-base text-gray-800"
                        placeholder="Write a comment..."
                        placeholderTextColor="#9ca3af"
                        value={newComment}
                        onChangeText={setNewComment}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!newComment.trim() || sending}
                        className={`p-3 rounded-full ${newComment.trim() ? "bg-orange-600" : "bg-gray-200"}`}
                    >
                        {sending ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Ionicons name="send" size={20} color={newComment.trim() ? "white" : "gray"} />
                        )}
                    </TouchableOpacity>
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

export default CommentsScreen;
