import { Image } from 'expo-image';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUpload } from '../context/UploadContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UploadProgressBanner = () => {
    const { isUploading, progress, thumbnail } = useUpload();
    const insets = useSafeAreaInsets();

    if (!isUploading) return null;

    return (
        <View style={[styles.container, { top: insets.top + 10 }]}>
            {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
            ) : (
                <View style={styles.placeholder} />
            )}
            <View style={styles.infoContainer}>
                <Text style={styles.title}>Uploading post...</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#172554',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    thumbnail: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#374151',
    },
    placeholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#374151',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 3,
    },
    progressText: {
        position: 'absolute',
        right: 0,
        top: -20,
        color: '#9ca3af',
        fontSize: 12,
    }
});

export default UploadProgressBanner;
