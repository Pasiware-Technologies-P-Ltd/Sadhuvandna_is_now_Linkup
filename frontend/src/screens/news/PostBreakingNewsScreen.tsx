import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const PostBreakingNewsScreen = ({ navigation }: any) => {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [myNews, setMyNews] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const uid = JSON.parse(u).id;
                setCurrentUserId(uid);
                fetchMyBreakingNews(uid);
            }
        });
    }, []);

    const fetchMyBreakingNews = async (uid: string) => {
        setFetching(true);
        try {
            const res = await api.get(`/get_my_breaking_news.php?user_id=${uid}`);
            if (res.data && res.data.status === 'success') {
                setMyNews(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching breaking news', err);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert("Missing Field", "Please enter breaking news text.");
            return;
        }

        if (!currentUserId) {
            Alert.alert("Error", "User not found.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/create_breaking_news.php', {
                title: title,
                user_id: currentUserId
            });

            if (res.data && res.data.status === 'success') {
                Alert.alert("Success", "Breaking news submitted for admin approval.");
                setTitle('');
                fetchMyBreakingNews(currentUserId);
            } else {
                Alert.alert("Error", res.data.message || "Failed to submit.");
            }
        } catch (err) {
            console.error('Error submitting breaking news', err);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.newsCard}>
            <Text style={styles.newsTitle}>{item.title}</Text>
            <View style={styles.newsFooter}>
                <Text style={styles.newsDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                <View style={[styles.statusBadge, item.is_active == 1 ? styles.statusApproved : styles.statusPending]}>
                    <Text style={[styles.statusText, item.is_active == 1 ? styles.statusApprovedText : styles.statusPendingText]}>
                        {item.is_active == 1 ? 'Approved' : 'Pending'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Post Breaking News</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Breaking News Text / Ticker</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter breaking news here..."
                        placeholderTextColor="#9ca3af"
                        value={title}
                        onChangeText={setTitle}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity 
                        style={styles.submitBtn} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit for Approval</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    <Text style={styles.listHeader}>My Breaking News</Text>
                    {fetching ? (
                        <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 20 }} />
                    ) : (
                        <FlashList
                            data={myNews}
                            keyExtractor={item => item.id.toString()}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>You haven't posted any breaking news yet.</Text>
                            }
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#111827',
        backgroundColor: '#f9fafb',
        height: 80,
        marginBottom: 16,
    },
    submitBtn: {
        backgroundColor: '#ea580c',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    listHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 12,
    },
    newsCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    newsTitle: {
        fontSize: 15,
        color: '#1f2937',
        marginBottom: 8,
        fontWeight: '500',
    },
    newsFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    newsDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusApproved: {
        backgroundColor: '#dcfce7',
    },
    statusPending: {
        backgroundColor: '#fef3c7',
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    statusApprovedText: {
        color: '#166534',
    },
    statusPendingText: {
        color: '#92400e',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 40,
        fontSize: 14,
    }
});

export default PostBreakingNewsScreen;
