import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../services/api';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const GALLERY_URL = `${API_BASE_URL.replace('/Api', '')}/uploads/gallery/`;

const GalleryScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [images, setImages] = useState<any[]>([]); // Formatted for ImageViewer {url: ''}
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        try {
            const res = await api.get('/get_gallery.php');
            if (res.data.status === 'success') {
                // Map to ImageViewer format: { url: '...' }
                const formattedImages = res.data.data
                    .map((item: any) => {
                        const imgFile = item.image || item.photo;
                        if (!imgFile) return null;

                        const url = imgFile.startsWith('http')
                            ? imgFile
                            : `${GALLERY_URL}${imgFile}`;
                        return { url };
                    })
                    .filter((item: any) => item !== null);

                setImages(formattedImages);
            }
        } catch (error) {
            console.error("Gallery fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    const openImage = (index: number) => {
        setCurrentImageIndex(index);
        setVisible(true);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity
            className="m-0.5 relative"
            style={{ 
                width: width / 3 - 4, 
                height: width / 3 - 4,
                backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9'
            }}
            onPress={() => openImage(index)}
        >
            <Image
                source={{ uri: item.url }}
                className="w-full h-full"
                contentFit="cover"
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <View 
                className="flex-row items-center p-4" 
                style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Gallery</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlashList
                    data={images}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={3}
                    contentContainerStyle={{ padding: 2, backgroundColor: theme.background }}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Ionicons name="images-outline" size={48} color={theme.textMuted} />
                            <Text style={{ color: theme.textSecondary, marginTop: 16 }}>No photos available</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={visible} transparent={true} onRequestClose={() => setVisible(false)}>
                <ImageViewer
                    imageUrls={images}
                    index={currentImageIndex}
                    onSwipeDown={() => setVisible(false)}
                    enableSwipeDown={true}
                    renderHeader={() => (
                        <TouchableOpacity
                            onPress={() => setVisible(false)}
                            style={{ position: 'absolute', top: 40, right: 20, zIndex: 9999 }}
                        >
                            <Ionicons name="close-circle" size={32} color="white" />
                        </TouchableOpacity>
                    )}
                />
            </Modal>
        </SafeAreaView>
    );
};

export default GalleryScreen;
