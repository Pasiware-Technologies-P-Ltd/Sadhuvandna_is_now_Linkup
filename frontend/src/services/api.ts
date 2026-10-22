import axios from 'axios';

// Core Base URLs
export const BASE_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sadhuvandna.co.in/';
export const API_BASE_URL = BASE_API_URL;
export const WEBSITE_URL = (process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://sadhuvandna.co.in/').replace(/\/+$/, '');
export const BASE_URL_ROOT = WEBSITE_URL;
export const WEBSOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://ws.sadhuvandna.co.in/';
export const SOCKET_URL = WEBSOCKET_URL;
export const UPLOAD_BASE_URL = API_BASE_URL;

export const resolveMediaUrl = (path?: string | null): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.replace(/^\/+/, '');
    return `${WEBSITE_URL}/${clean}`;
};

export const getFullPaymentUrl = (paymentUrl: string): string => {
    if (!paymentUrl) return '';
    if (paymentUrl.startsWith('http://') || paymentUrl.startsWith('https://')) {
        return paymentUrl;
    }
    const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    if (paymentUrl.startsWith('/')) {
        const rootUrl = API_BASE_URL.replace(/\/Api\/?$/, '');
        return `${rootUrl}${paymentUrl}`;
    }
    return `${cleanBase}${paymentUrl}`;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000, // Increased timeout to 5 minutes for slower server responses/networks
});

// Request Interceptor for logging
api.interceptors.request.use(
    (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        return config;
    },
    (error) => {
        console.warn('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Response Interceptor for logging
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} from ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.warn(`[API Response Error] ${error.response.status} from ${error.config.url}`, error.response.data || '');
        } else if (error.request) {
            console.warn(`[API Network Error] No response received from ${error.config.url}. Check server status or URL.`, error.message);
        } else {
            console.warn('[API Error]', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;

