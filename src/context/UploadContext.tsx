import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { UPLOAD_BASE_URL } from '../services/api';

interface UploadContextType {
    isUploading: boolean;
    progress: number;
    thumbnail: string | null;
    startUpload: (endpoint: string, formData: FormData, thumbUri: string | null) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const startUpload = async (endpoint: string, formData: FormData, thumbUri: string | null) => {
        setIsUploading(true);
        setProgress(0);
        setThumbnail(thumbUri);

        try {
            const response = await axios.post(`${UPLOAD_BASE_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 0, // 0 means no timeout (infinite), let it take as long as it needs on slow networks
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        // Prevent percentage from exceeding 99 before the request completes
                        if (percentCompleted > 99) percentCompleted = 99;
                        setProgress(percentCompleted);
                    }
                },
            });

            if (response.data && response.data.status === 'success') {
                // Keep the progress banner at 100% for a second before hiding
                setProgress(100);
                setTimeout(() => {
                    setIsUploading(false);
                    setThumbnail(null);
                    setProgress(0);
                }, 1000);
            } else {
                setIsUploading(false);
                Alert.alert("Error", response.data?.message || "Failed to upload");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            setIsUploading(false);
            Alert.alert("Error", "Network request failed during upload");
        }
    };

    return (
        <UploadContext.Provider value={{ isUploading, progress, thumbnail, startUpload }}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (context === undefined) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};
