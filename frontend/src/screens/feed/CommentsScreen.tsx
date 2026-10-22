import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, WEBSITE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

// Global cache for GIFs to make it fast
const gifCache: Record<string, any[]> = {};

const CommentsScreen = ({ route, navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { postId } = route.params;
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedComment, setSelectedComment] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifs, setGifs] = useState<any[]>([]);
    const [gifQuery, setGifQuery] = useState('');
    const [loadingGifs, setLoadingGifs] = useState(false);

    useEffect(() => {
        if (showGifPicker && gifs.length === 0) {
            fetchGifs();
        }
    }, [showGifPicker]);

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
                            const payload = { 
                                action: 'delete_comment', 
                                post_id: postId, 
                                comment_id: commentId, 
                                comment: commentText,
                                user_id: user.id 
                            };
                            // Optimistically remove from UI immediately
                            setComments(prev => prev.filter(c => String(c.comment_id) !== String(commentId)));
                            const res = await api.post('like_comment_action.php', payload);
                            // Re-fetch to ensure UI is in sync with server
                            await fetchComments();
                        } catch (e) {
                            console.error(e);
                            await fetchComments(); // Sync even on error
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
                    await fetchComments(); // Await so real DB IDs are in state
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
                            const payload = { 
                                action: 'delete_comment', 
                                post_id: postId, 
                                comment_id: selectedComment.comment_id, 
                                comment: selectedComment.comment,
                                user_id: user?.id || selectedComment.user_id 
                            };
                            // Optimistically remove from UI immediately
                            setComments(prev => prev.filter(c => String(c.comment_id) !== String(selectedComment.comment_id)));
                            await api.post('like_comment_action.php', payload);
                            // Re-fetch to ensure UI is in sync with server
                            await fetchComments();
                        } catch (e) {
                            console.error(e);
                            await fetchComments(); // Sync even on error
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
                    className="w-10 h-10 rounded-full mr-3"
                    style={{ backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderWidth: 1, borderColor: theme.border }}
                />
                <View 
                    className="flex-1 rounded-2xl p-3.5 border shadow-sm"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                >
                    <View className="flex-row justify-between items-start mb-1">
                        <View className="flex-1">
                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>{item.name}</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 1 }}>{item.date}</Text>
                        </View>
                        {isOwner && (
                            <TouchableOpacity onPress={() => handleOptions(item)} className="p-1 -mr-1 -mt-1">
                                <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {(item.comment && item.comment.startsWith('http') && (item.comment.includes('giphy.com') || item.comment.includes('tenor.com') || item.comment.endsWith('.gif'))) ? (
                        <Image source={{ uri: item.comment }} style={{ width: 120, height: 120, borderRadius: 8, marginTop: 4, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }} contentFit="cover" />
                    ) : (
                        <Text style={{ color: theme.text, lineHeight: 20, fontSize: 14 }}>{item.comment}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
            <View 
                className="flex-row items-center p-4"
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Comments</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                className="flex-1"
                enabled={true}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
                ) : (
                    <FlashList
                        data={comments}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ padding: 16, backgroundColor: theme.background }}
                        ListEmptyComponent={
                            <View className="items-center mt-10">
                                <Text style={{ color: theme.textSecondary }}>No comments yet. Be the first!</Text>
                            </View>
                        }
                    />
                )}

                <View style={{ backgroundColor: theme.card }}>
                    <View 
                        className="p-3 flex-row items-center"
                        style={{ borderTopColor: theme.border, borderTopWidth: 1 }}
                    >
                        <View 
                            className="flex-1 rounded-full px-4 py-1 mr-2 flex-row items-center min-h-[48px] border"
                            style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }}
                        >
                            <TextInput
                                className="flex-1 text-base py-2"
                                style={{ color: theme.text }}
                                placeholder="Write a comment..."
                                placeholderTextColor={theme.textMuted}
                                value={newComment}
                                onChangeText={setNewComment}
                                returnKeyType="send"
                                onSubmitEditing={handleSend}
                                onFocus={() => { setShowEmojiPicker(false); setShowGifPicker(false); }}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setShowEmojiPicker(false);
                                    setShowGifPicker(prev => !prev);
                                }}
                                className="p-2"
                            >
                                <View className={`px-2 py-0.5 rounded ${showGifPicker ? 'bg-blue-600' : (isDarkMode ? 'bg-slate-700' : 'bg-slate-200')}`}>
                                    <Text className={`text-[10px] font-bold ${showGifPicker ? 'text-white' : theme.textSecondary}`}>GIF</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setShowGifPicker(false);
                                    setShowEmojiPicker(prev => !prev);
                                }}
                                className="p-2 -mr-2"
                            >
                                <Ionicons name={showEmojiPicker ? "close-circle-outline" : "happy-outline"} size={22} color={showEmojiPicker ? "#2563EB" : theme.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!newComment.trim() || sending}
                            className="w-12 h-12 rounded-full items-center justify-center"
                            style={{
                                backgroundColor: newComment.trim() ? '#2563EB' : (isDarkMode ? '#334155' : '#E2E8F0')
                            }}
                        >
                            {sending ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Ionicons name="send" size={20} color={newComment.trim() ? "white" : (isDarkMode ? "#64748B" : "gray")} style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {showEmojiPicker && (() => {
                        const emojiRows = [
                            ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '😝', '🤑', '🤗', '😇'],
                            ['😢', '😭', '😤', '😠', '🤪', '😱', '😨', '😰', '😥', '😓', '🙄', '😬', '🤥', '😶', '😐'],
                            ['👍', '👎', '👏', '🙌', '🤝', '✊', '👊', '🤲', '🙏', '💪', '👌', '✌️', '🤞', '🖐️', '👋'],
                            ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖'],
                            ['🔥', '💯', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💎', '🚨']
                        ];
                        return (
                            <View style={{ backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: 10 }}>
                                {emojiRows.map((row, rowIndex) => (
                                    <ScrollView key={rowIndex} horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4 }}>
                                            {row.map((emoji, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => setNewComment(prev => prev + emoji)}
                                                    style={{ padding: 8, marginHorizontal: 2 }}
                                                >
                                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                ))}
                            </View>
                        );
                    })()}

                    {showGifPicker && (
                        <View style={{ backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, height: 250 }}>
                            <View 
                                className="flex-row items-center px-3 py-2 border-b"
                                style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderBottomColor: theme.border }}
                            >
                                <Ionicons name="search" size={16} color={theme.textMuted} />
                                <TextInput
                                    className="flex-1 ml-2 text-sm py-1"
                                    style={{ color: theme.text }}
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
                                <View style={{ flex: 1, backgroundColor: theme.background }}>
                                    <FlashList
                                        data={gifs}
                                        numColumns={3}
                                        keyExtractor={(item: any, index: number) => item.id || String(index)}
                                        keyboardShouldPersistTaps="handled"
                                        renderItem={({ item }: { item: any }) => (
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    const gifUrl = item.images?.fixed_height?.url;
                                                    if(gifUrl) {
                                                        const payload = {
                                                            action: 'comment',
                                                            id: postId,
                                                            user_id: user.id,
                                                            comment: gifUrl
                                                        };
                                                        setSending(true);
                                                        try {
                                                            const res = await api.post('like_comment_action.php', payload);
                                                            if (res.data.ok || res.data.status === 'success' || res.data.ok === true) {
                                                                setShowGifPicker(false);
                                                                setGifQuery('');
                                                                await fetchComments();
                                                            } else {
                                                                Alert.alert("Error", "Failed to post GIF");
                                                            }
                                                        } catch(e) {
                                                            Alert.alert("Error", "Network request failed");
                                                        }
                                                        setSending(false);
                                                    }
                                                }}
                                                style={{ flex: 1/3, aspectRatio: 1, padding: 2 }}
                                            >
                                                <Image 
                                                    source={{ uri: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url }} 
                                                    style={{ flex: 1, borderRadius: 4, backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }} 
                                                    contentFit="cover" 
                                                />
                                            </TouchableOpacity>
                                        )}
                                        {...({ estimatedItemSize: 100 } as any)}
                                    />
                                </View>
                            )}
                        </View>
                    )}
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
                    <View 
                        className="rounded-t-3xl pt-2 pb-8 px-4" 
                        style={{ backgroundColor: theme.card }}
                        onStartShouldSetResponder={() => true}
                    >
                        <View className="w-12 h-1.5 rounded-full self-center mb-6" style={{ backgroundColor: theme.border }} />
                        
                        <TouchableOpacity 
                            onPress={handleEditCommentInit} 
                            className="flex-row items-center py-4 px-2 border-b"
                            style={{ borderBottomColor: theme.border }}
                        >
                            <Ionicons name="pencil-outline" size={24} color="#2563EB" />
                            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginLeft: 16 }}>Edit Comment</Text>
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
