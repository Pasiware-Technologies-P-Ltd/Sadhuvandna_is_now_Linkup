import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Dimensions, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import api, { WEBSITE_URL } from '../../services/api';
import { Asset } from 'expo-asset';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const LOGO_ASSET = require('../../../assets/icon.png');
const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;
const FRAME_URL = `${WEBSITE_URL}/uploads/festival_frames/`;

const FestivalPosterScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [frames, setFrames] = useState<any[]>([]);
    
    // Form Inputs
    const [festivalName, setFestivalName] = useState('Happy Deepawali');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    
    // Image Data (Base64)
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [frameBase64, setFrameBase64] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);

    const [selectedFrameId, setSelectedFrameId] = useState<string>('default');
    const [selectedLayout, setSelectedLayout] = useState(1);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            const uStr = await AsyncStorage.getItem('user');
            if (uStr) {
                const u = JSON.parse(uStr);
                setUser(u);
                setName(u.name || '');
                setMobile(u.phone || '');
                setAddress(u.city || '');
                if (u.profile_photo) {
                    downloadAndConvert(`${PHOTO_URL}${u.profile_photo}`, setPhotoBase64);
                }
            }

            // Always pre-load logo
            try {
                const asset = Asset.fromModule(LOGO_ASSET);
                await asset.downloadAsync();
                if (asset.localUri) {
                    const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 });
                    setLogoBase64(`data:image/png;base64,${base64}`);
                }
            } catch (e) {
                console.error("Failed to load local logo asset:", e);
            }

            const res = await api.get('/api_festival.php?action=fetch_frames');
            if (res.data.status === 'success') {
                setFrames(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const downloadAndConvert = async (url: string, setter: (base64: string | null) => void) => {
        try {
            const filename = url.split('/').pop() || 'temp.png';
            const result = await FileSystem.downloadAsync(url, FileSystem.cacheDirectory + filename);
            const base64 = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
            const mime = url.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            setter(`data:${mime};base64,${base64}`);
        } catch (e) {
            console.error("Failed to download image:", url, e);
        }
    };

    const handleFrameSelect = async (item: any) => {
        setSelectedFrameId(item.id);
        if (!item.frame_image) {
            setFrameBase64(null);
            return;
        }
        setIsDownloading(true);
        try {
            const url = `${FRAME_URL}${item.frame_image}`;
            await downloadAndConvert(url, setFrameBase64);
        } finally {
            setIsDownloading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    // Push data to WebView whenever inputs change
    useEffect(() => {
        const data = { festivalName, name, mobile, address, photo: photoBase64, selectedFrame: frameBase64, logo: logoBase64, selectedLayout };
        webViewRef.current?.injectJavaScript(`
            if (window.updateCanvas) {
                window.updateCanvas(${JSON.stringify(data)});
            }
        `);
    }, [festivalName, name, mobile, address, photoBase64, frameBase64, logoBase64, selectedLayout]);

    const handleGenerate = () => {
        setIsGenerating(true);
        webViewRef.current?.injectJavaScript(`
            (function() {
                const canvas = document.getElementById("canvas");
                // Wait for any pending renders
                setTimeout(() => {
                    try {
                        const dataUrl = canvas.toDataURL("image/png", 1.0);
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'export', data: dataUrl }));
                    } catch (e) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: "Security Error: " + e.message + " - Please ensure CORS is enabled on server." }));
                    }
                }, 500);
            })();
        `);
    };

    const onMessage = async (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'export') {
                const base64Code = message.data.split("data:image/png;base64,")[1];
                const filename = FileSystem.cacheDirectory + `poster_${Date.now()}.png`;
                await FileSystem.writeAsStringAsync(filename, base64Code, { encoding: FileSystem.EncodingType.Base64 });
                setIsGenerating(false);
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(filename);
                }
            } else if (message.type === 'init_ready') {
                const data = { festivalName, name, mobile, address, photo: photoBase64, selectedFrame: frameBase64, logo: logoBase64, selectedLayout };
                webViewRef.current?.injectJavaScript(`window.updateCanvas(${JSON.stringify(data)})`);
            } else if (message.type === 'error') {
                setIsGenerating(false);
                Alert.alert("Generation Failed", message.data);
            }
        } catch (e) {
            setIsGenerating(false);
        }
    };

    const htmlContent = `
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700\u0026display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #fff; overflow: hidden; }
            canvas { width: 100vw; height: 100vw; background: #fff; }
        </style>
    </head>
    <body>
        <canvas id="canvas" width="1080" height="1080"></canvas>
        <script>
            const canvas = document.getElementById("canvas");
            const ctx = canvas.getContext("2d");
            const COLORS = { bg: "#1a4658", gold: "#d4af37", accent: "#ffcc00", white: "#ffffff", dark: "#222222", red: "#cc0000" };

            function roundRect(ctx, x, y, w, h, r, fill = true) {
                if (typeof r === 'number') r = {tl: r, tr: r, br: r, bl: r};
                ctx.beginPath(); ctx.moveTo(x + r.tl, y); ctx.lineTo(x + w - r.tr, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr); ctx.lineTo(x + w, y + h - r.br);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h); ctx.lineTo(x + r.bl, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl); ctx.lineTo(x, y + r.tl);
                ctx.quadraticCurveTo(x, y, x + r.tl, y); ctx.closePath();
                if (fill) ctx.fill(); else ctx.stroke();
            }

            function drawWrapped(txt, x, y, maxW, maxL, fS, align) {
                ctx.save(); ctx.textAlign = align; ctx.fillStyle = "white";
                let curY = y, size = fS;
                const min = 24, lh = 1.1;
                const measure = (t, s) => { ctx.font = "bold " + s + "px sans-serif"; return ctx.measureText(t).width; };
                let words = txt.split(' '), lines = [];
                while (size >= min) {
                    lines = []; let cur = words[0] || '';
                    for (let i = 1; i < words.length; i++) {
                        if (measure(cur + ' ' + words[i], size) <= maxW) cur += ' ' + words[i];
                        else { lines.push(cur); cur = words[i]; }
                    }
                    lines.push(cur); if (lines.length <= maxL) break; size -= 2;
                }
                if (lines.length > maxL) lines = lines.slice(0, maxL);
                ctx.font = "bold " + size + "px sans-serif";
                lines.forEach(l => { ctx.fillText(l, x, curY); curY += size * lh; });
                ctx.restore(); return curY - (size * lh) + (size * 0.8);
            }

            function drawCircle(img, x, y, r, bC = "white") {
                ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
                ctx.fillStyle = "#eee"; ctx.fillRect(x-r, y-r, r*2, r*2);
                if (img \u0026\u0026 img.complete) {
                    const s = Math.max((r*2)/img.width, (r*2)/img.height);
                    ctx.drawImage(img, x - (img.width*s)/2, y - (img.height*s)/2, img.width*s, img.height*s);
                }
                ctx.restore(); ctx.strokeStyle = bC; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
            }

            window.updateCanvas = function(data) {
                const draw = (pImg, fImg, lImg) => {
                    ctx.clearRect(0,0,1080,1080);
                    if (fImg) ctx.drawImage(fImg, 0, 0, 1080, 1080);
                    else { 
                        ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, 1080, 1080);
                        // Subtle gradient overlay for plain background
                        const grad = ctx.createLinearGradient(0,0,0,1080);
                        grad.addColorStop(0, "rgba(255,255,255,0.05)");
                        grad.addColorStop(1, "rgba(0,0,0,0.2)");
                        ctx.fillStyle = grad; ctx.fillRect(0,0,1080,1080);
                    }

                    if (lImg) { 
                        ctx.save();
                        ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 10;
                        ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(980, 100, 70, 0, Math.PI*2); ctx.fill(); 
                        ctx.restore();
                        ctx.drawImage(lImg, 925, 45, 110, 110); 
                    }

                    ctx.save(); ctx.fillStyle="white"; ctx.textAlign="center"; 
                    ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=20;
                    ctx.font="bold 95px 'Playfair Display', serif";
                    let msg = data.festivalName;
                    if (msg.includes(" ")) {
                        let lines = msg.split(" ");
                        ctx.fillText(lines[0], 540, 260);
                        ctx.font="italic 110px serif"; ctx.fillText(lines.slice(1).join(" "), 540, 380);
                    } else ctx.fillText(msg, 540, 320);
                    ctx.restore();

                    const { name, mobile, address, selectedLayout: lid } = data;
                    
                    if (lid === 1) {
                        // Layout 1: Red Branding Bar (Bottom RIGHT)
                        ctx.save();
                        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 15;
                        ctx.fillStyle = COLORS.red; roundRect(ctx, 320, 840, 720, 180, 30);
                        ctx.restore();

                        // User Info (Right Aligned)
                        let nY = drawWrapped(name, 1000, 905, 600, 1, 65, 'right');
                        
                        ctx.font = "bold 38px sans-serif"; ctx.fillStyle = COLORS.accent; ctx.textAlign = "right";
                        ctx.fillText("Phone: " + (mobile || 'N/A'), 1000, 960);
                        
                        ctx.fillStyle = "white"; ctx.font = "500 28px sans-serif"; ctx.textAlign = "right";
                        ctx.fillText("Location: " + (address || 'N/A'), 1000, 1005);
                        
                        drawCircle(pImg, 240, 860, 175, "white");
                    } else if (lid === 2) {
                        // Layout 2: Modern Dark Bar (Bottom Full)
                        ctx.fillStyle = "rgba(15, 23, 42, 0.95)"; 
                        ctx.beginPath(); ctx.moveTo(0, 900); ctx.lineTo(1080, 900); ctx.lineTo(1080, 1080); ctx.lineTo(0, 1080); ctx.fill();
                        
                        ctx.fillStyle = COLORS.accent; ctx.fillRect(0, 895, 1080, 5);
                        
                        let nY = drawWrapped(name, 380, 965, 650, 1, 70, 'left');
                        ctx.font = "500 32px sans-serif"; ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left";
                        ctx.fillText((mobile || 'N/A') + "  |  " + (address || 'N/A'), 380, 1025);
                        
                        drawCircle(pImg, 190, 890, 170, "#0f172a");
                    } else if (lid === 3) {
                        // Layout 3: Centered Floating Card
                        ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 20;
                        ctx.fillStyle = "rgba(14, 165, 233, 0.95)"; roundRect(ctx, 80, 840, 920, 200, 40);
                        ctx.restore();
                        
                        drawCircle(pImg, 540, 780, 150, "white");
                        let nY = drawWrapped(name, 540, 955, 850, 1, 70, 'center');
                        ctx.font = "600 32px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "center";
                        ctx.fillText((mobile || 'N/A') + "  \u2022  " + (address || 'N/A'), 540, 1015);
                    } else if (lid === 4) {
                        // Layout 4: Wave Style
                        ctx.save();
                        ctx.fillStyle = "#be123c"; ctx.beginPath(); ctx.moveTo(0, 820); ctx.bezierCurveTo(340, 940, 680, 780, 1080, 900); ctx.lineTo(1080, 1080); ctx.lineTo(0, 1080); ctx.fill();
                        ctx.fillStyle = "#881337"; ctx.beginPath(); ctx.moveTo(0, 900); ctx.bezierCurveTo(400, 1050, 700, 880, 1080, 980); ctx.lineTo(1080, 1080); ctx.lineTo(0, 1080); ctx.fill();
                        ctx.restore();

                        let nY = drawWrapped(name, 60, 945, 700, 1, 65, 'left');
                        ctx.font = "500 28px sans-serif"; ctx.fillStyle = "#ffe4e6"; ctx.textAlign = "left";
                        ctx.fillText("\ud83d\udccd " + address, 60, 1010);
                        
                        ctx.textAlign = "right"; ctx.font = "bold 44px sans-serif"; ctx.fillStyle = "#fbbf24";
                        ctx.fillText("\ud83d\udcde " + mobile, 1020, 1010);
                        
                        drawCircle(pImg, 910, 810, 160, "white");
                    } else if (lid === 5) {
                        // Layout 5: Magenta Oval
                        ctx.fillStyle = "#701a75"; roundRect(ctx, 40, 880, 780, 160, 80);
                        let nY = drawWrapped(name, 120, 950, 640, 1, 65, 'left');
                        ctx.font = "400 30px sans-serif"; ctx.fillStyle = "#f5d0fe"; ctx.textAlign = "left";
                        ctx.fillText(mobile + "  |  " + address, 120, 1005);
                        drawCircle(pImg, 900, 900, 178, "#701a75");
                    } else {
                        // Layout 6: Classic Blue
                        ctx.fillStyle = "#1e40af"; ctx.fillRect(0, 880, 1080, 200);
                        ctx.fillStyle = "#2563EB"; ctx.fillRect(0, 880, 540, 12); ctx.fillStyle = "#93C5FD"; ctx.fillRect(540, 880, 540, 12);
                        let nY = drawWrapped(name, 1040, 960, 700, 1, 70, 'right');
                        ctx.font = "400 32px sans-serif"; ctx.fillStyle = "#dbeafe"; ctx.textAlign = "right";
                        ctx.fillText(mobile + "  \u2022  " + address, 1040, 1020);
                        drawCircle(pImg, 180, 880, 175, "white");
                    }
                };

                const load = (src) => new Promise(r => {
                    if (!src) return r(null);
                    const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src;
                });

                Promise.all([load(data.photo), load(data.selectedFrame), load(data.logo)]).then(i => draw(...i));
            };
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'init_ready' }));
        </script>
    </body>
    </html>
    `;

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ marginTop: 16, color: theme.textSecondary, fontWeight: 'bold' }}>Opening Studio...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <KeyboardAwareScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                extraScrollHeight={100}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View 
                    className="flex-row items-center px-4 py-4 justify-between"
                    style={{ backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>Poster Designer</Text>
                    <TouchableOpacity 
                        onPress={handleGenerate} 
                        disabled={isGenerating || isDownloading}
                        className={`px-4 py-2 rounded-xl flex-row items-center ${isGenerating || isDownloading ? 'bg-slate-300' : 'bg-blue-600 shadow-md'}`}
                    >
                        {isGenerating ? <ActivityIndicator size="small" color="#fff" /> : (
                            <>
                                <Ionicons name="cloud-download-outline" size={18} color="white" />
                                <Text className="text-white font-bold ml-1.5">Done</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Visual Preview */}
                <View 
                    className="p-4 items-center justify-center"
                    style={{ backgroundColor: isDarkMode ? '#0B1120' : '#F8FAFC' }}
                >
                    <View style={styles.shadowBox}>
                         {isDownloading && (
                             <View className="absolute z-10 w-full h-full items-center justify-center bg-black/40 rounded-[30px]">
                                 <ActivityIndicator color="#2563EB" />
                             </View>
                         )}
                        <View style={styles.previewFrame}>
                            <WebView
                                ref={webViewRef}
                                originWhitelist={['*']}
                                source={{ html: htmlContent }}
                                style={styles.webView}
                                scrollEnabled={false}
                                onMessage={onMessage}
                                javaScriptEnabled={true}
                            />
                        </View>
                    </View>
                    <View className="mt-3 flex-row items-center opacity-60">
                         <Ionicons name="scan-outline" size={12} color={theme.textMuted} />
                         <Text style={{ fontSize: 10, marginLeft: 4, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>Live 1080p Studio Preview</Text>
                    </View>
                </View>

                {/* Inputs */}
                <View className="px-5 pt-6 pb-20">
                    {/* Frame Selection */}
                    <View className="mb-8">
                        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 16 }}>Choose Frame</Text>
                        <FlashList
                            data={[{ id: 'default', title: 'Solid', frame_image: '' }, ...frames]}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleFrameSelect(item)}
                                    className="mr-4 rounded-2xl overflow-hidden p-0.5"
                                    style={{ 
                                        width: 85, 
                                        height: 85,
                                        borderWidth: 2,
                                        borderColor: selectedFrameId === item.id ? '#2563EB' : theme.border
                                    }}
                                >
                                    {item.frame_image ? (
                                        <Image source={{ uri: `${FRAME_URL}${item.frame_image}` }} className="w-full h-full rounded-2xl" />
                                    ) : (
                                        <View 
                                            className="flex-1 items-center justify-center rounded-2xl"
                                            style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }}
                                        >
                                            <Ionicons name="color-filter-outline" size={28} color={theme.textMuted} />
                                            <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: 'bold', marginTop: 4 }}>Plain</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    {/* Styles */}
                    <View className="mb-8">
                        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 16 }}>Branding Style</Text>
                        <View className="flex-row flex-wrap justify-between">
                            {[1, 2, 3, 4, 5, 6].map((id) => (
                                <TouchableOpacity
                                    key={id}
                                    onPress={() => setSelectedLayout(id)}
                                    className="w-[48%] py-4 rounded-2xl mb-3 items-center justify-center"
                                    style={{
                                        backgroundColor: selectedLayout === id 
                                            ? (isDarkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF')
                                            : theme.card,
                                        borderWidth: 2,
                                        borderColor: selectedLayout === id ? '#2563EB' : theme.border
                                    }}
                                >
                                    <Text 
                                        style={{ 
                                            fontWeight: 'bold', 
                                            color: selectedLayout === id ? '#2563EB' : theme.textSecondary 
                                        }}
                                    >
                                        Layout {id}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Text Content */}
                    <View 
                        className="rounded-3xl p-6"
                        style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}
                    >
                         <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 20 }}>Personalize Poster</Text>
                         
                         <View className="space-y-5">
                             <View>
                                 <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>Message / Festival</Text>
                                 <TextInput 
                                     value={festivalName} 
                                     onChangeText={setFestivalName} 
                                     className="p-4 rounded-2xl font-bold"
                                     style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, borderWidth: 1, color: theme.text }}
                                     placeholderTextColor={theme.textMuted}
                                 />
                             </View>
                             <View>
                                 <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>Your Name</Text>
                                 <TextInput 
                                     value={name} 
                                     onChangeText={setName} 
                                     className="p-4 rounded-2xl font-bold"
                                     style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, borderWidth: 1, color: theme.text }}
                                     placeholderTextColor={theme.textMuted}
                                 />
                             </View>
                             <View>
                                 <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>Mobile Number</Text>
                                 <TextInput 
                                     value={mobile} 
                                     onChangeText={setMobile} 
                                     keyboardType="phone-pad" 
                                     className="p-4 rounded-2xl font-bold"
                                     style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, borderWidth: 1, color: theme.text }}
                                     placeholderTextColor={theme.textMuted}
                                 />
                             </View>
                             <View>
                                 <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>Location (City)</Text>
                                 <TextInput 
                                     value={address} 
                                     onChangeText={setAddress} 
                                     className="p-4 rounded-2xl font-bold"
                                     style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border, borderWidth: 1, color: theme.text }}
                                     placeholderTextColor={theme.textMuted}
                                 />
                             </View>
                             <TouchableOpacity onPress={pickImage} className="mt-4 bg-blue-600 p-4 rounded-2xl flex-row items-center justify-center">
                                  <Ionicons name="image" size={20} color="white" />
                                  <Text className="text-white font-bold ml-2">Update Photo</Text>
                             </TouchableOpacity>
                         </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    shadowBox: {
        width: width * 0.88,
        height: width * 0.88,
        borderRadius: 30,
        backgroundColor: 'white',
        elevation: 15,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    previewFrame: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        overflow: 'hidden',
    },
    webView: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    }
});

export default FestivalPosterScreen;
