import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, StyleSheet, Modal, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import api, { API_BASE_URL } from '../../services/api';
import { useUpload } from '../../context/UploadContext';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORY_MAP = [
    { name: 'Breaking News', icon: '⚡' },
    { name: 'National', icon: '🇮🇳' },
    { name: 'State', icon: '🏛️' },
    { name: 'District', icon: '📍' },
    { name: 'Politics', icon: '🗳️' },
    { name: 'Religion', icon: '🛕' },
    { name: 'Education', icon: '🎓' },
    { name: 'Sports', icon: '🏆' },
    { name: 'Business', icon: '💼' },
    { name: 'Agriculture', icon: '🌾' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Social', icon: '🤝' },
    { name: 'Accident', icon: '⚠️' },
    { name: 'Obituary/Tribute', icon: '🕯️' },
    { name: 'Advertisement', icon: '📢' }
];

const CreateNewsScreen = ({ navigation }: any) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Breaking News');
    const [mediaFiles, setMediaFiles] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [postAspectRatio, setPostAspectRatio] = useState<number | null>(null);

    const { startUpload } = useUpload();
    const { language } = useLanguage();

    // State & District Selectors
    const [statesList, setStatesList] = useState<any[]>([]);
    const [districtsList, setDistrictsList] = useState<any[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    useEffect(() => {
        fetchStates();
    }, []);

    const fetchStates = async () => {
        try {
            const res = await api.get('/get_states.php');
            if (res.data && res.data.status === 'success') {
                setStatesList(res.data.data);
            }
        } catch (err) {
            console.error("Error fetching states:", err);
        }
    };

    const fetchDistricts = async (stateId: string) => {
        try {
            const res = await api.get(`/get_districts.php?state_id=${stateId}`);
            if (res.data && res.data.status === 'success') {
                setDistrictsList(res.data.data);
            }
        } catch (err) {
            console.error("Error fetching districts:", err);
        }
    };

    const handleStateChange = (stateName: string, stateId: string) => {
        setSelectedState(stateName);
        setSelectedDistrict('');
        setDistrictsList([]);
        if (stateId) {
            fetchDistricts(stateId);
        }
    };

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) setCurrentUserId(JSON.parse(u).id);
        });
    }, []);

    // AI Writer States
    const [aiModalVisible, setAiModalVisible] = useState(false);
    const [aiKeywords, setAiKeywords] = useState('');
    const [generating, setGenerating] = useState(false);

    // Terms and Policies States
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const [termsModalVisible, setTermsModalVisible] = useState(false);
    const [policyModalVisible, setPolicyModalVisible] = useState(false);

    const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
    const [policyScrolledToBottom, setPolicyScrolledToBottom] = useState(false);

    const pickMedia = async () => {
        try {
            // Request permission first
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Please allow access to your files to upload news media.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets) {
                const selectedMedia = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: (asset.type === 'video' ? 'video' : 'image') as 'video' | 'image'
                }));
                setMediaFiles(prev => [...prev, ...selectedMedia]);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to select media files.");
        }
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const generateAiNews = (keywords: string, selectedCat: string, lang: string) => {
        const cleanKw = keywords.trim();
        const rand = Math.floor(Math.random() * 3);

        if (lang === 'en') {
            return {
                title: `Breaking News: New updates on ${cleanKw}`,
                description: `Recent reports have surfaced regarding ${cleanKw}. The situation is developing rapidly and authorities are monitoring the changes closely. Stay tuned for more detailed information as the story unfolds.`
            };
        } else if (lang === 'bn') {
            return {
                title: `ব্রেকিং নিউজ: ${cleanKw} নিয়ে নতুন আপডেট`,
                description: `${cleanKw} সম্পর্কে নতুন তথ্য সামনে এসেছে। স্থানীয় প্রশাসন বিষয়টি গুরুত্বের সাথে দেখছে। এ বিষয়ে বিস্তারিত প্রতিবেদন খুব শীঘ্রই প্রকাশিত হবে।`
            };
        }

        const intros = [
            `हाल ही में सामने आई जानकारी के अनुसार,`,
            `विश्वसनीय सूत्रों के हवाले से खबर है कि`,
            `आज की सबसे बड़ी और अहम खबर यह है कि`
        ];
        const intro = intros[rand];

        switch (selectedCat) {
            case 'Breaking News':
                return {
                    title: `बड़ी खबर: ${cleanKw} को लेकर आया नया अपडेट`,
                    description: `${intro} ${cleanKw} को लेकर एक बड़ी घोषणा हुई है। इस फैसले से क्षेत्र में काफी हलचल है और जल्द ही विस्तृत ब्यौरा साझा किया जाएगा।`
                };
            case 'National':
                return {
                    title: `राष्ट्रीय स्तर पर बड़ा फैसला: ${cleanKw} को लेकर आई अहम खबर`,
                    description: `${intro} ${cleanKw} को लेकर देश भर में चर्चाओं का बाज़ार गर्म है। केंद्र सरकार और संबंधित विभागों ने इस पर कड़ा रुख अपनाया है, जिससे भविष्य में बड़े बदलाव की उम्मीद की जा रही है।`
                };
            case 'State':
                return {
                    title: `राज्य ब्रेकिंग: ${cleanKw} पर मुख्यमंत्री कार्यालय का सख्त निर्देश`,
                    description: `${intro} राज्य सरकार ने ${cleanKw} के संबंध में नई योजना और दिशा-निर्देशों की घोषणा की है। इस कदम से राज्य की जनता को सीधा लाभ पहुंचने की संभावना जताई जा रही है।`
                };
            case 'District':
                return {
                    title: `जिला विशेष: ${cleanKw} को लेकर प्रशासन अलर्ट, जारी किए आदेश`,
                    description: `हमारे संवाददाता के अनुसार, जिले में ${cleanKw} का मुद्दा गरमाया हुआ है। जिला अधिकारी ने मामले का संज्ञान लेते हुए संबंधित अधिकारियों को तुरंत आवश्यक कार्रवाई करने के निर्देश दिए हैं।`
                };
            case 'Politics':
                return {
                    title: `राजनीतिक सरगर्मी: ${cleanKw} पर नेताओं के बीच तीखी बहस`,
                    description: `आगामी चुनावों को देखते हुए ${cleanKw} का मुद्दा राजनीति के केंद्र में आ गया है। विपक्षी दलों ने सरकार पर जमकर निशाना साधा है, वहीं सत्ता पक्ष ने इसे जनता के हित में उठाया गया कदम बताया है।`
                };
            case 'Religion':
                return {
                    title: `धार्मिक आयोजन: ${cleanKw} के पावन पर्व पर उमड़ा आस्था का जनसैलाब`,
                    description: `धार्मिक स्थलों पर ${cleanKw} को लेकर भव्य तैयारियां की गई हैं। दूर-दराज से आए श्रद्धालुओं ने पूजा-अर्चना कर देश में शांति और समृद्धि की कामना की। प्रशासन ने सुरक्षा के पुख्ता इंतजाम किए हैं।`
                };
            case 'Education':
                return {
                    title: `शिक्षा जगत: ${cleanKw} को लेकर नई नीति लागू, छात्रों को मिलेगी राहत`,
                    description: `शिक्षा विभाग ने ${cleanKw} से जुड़े अहम बदलावों को मंजूरी दे दी है। इस फैसले से लाखों छात्रों के भविष्य को नई दिशा मिलेगी। शिक्षक संघ ने भी सरकार के इस कदम की सराहना की है।`
                };
            case 'Sports':
                return {
                    title: `खेल समाचार: ${cleanKw} के रोमांचक मैच में बना नया रिकॉर्ड`,
                    description: `खचाखच भरे स्टेडियम में ${cleanKw} को लेकर दर्शकों में गजब का उत्साह दिखा। खिलाड़ियों ने शानदार प्रदर्शन करते हुए न सिर्फ मैच जीता, बल्कि कई पुराने रिकॉर्ड भी ध्वस्त कर दिए।`
                };
            case 'Business':
                return {
                    title: `व्यापार व अर्थव्यवस्था: ${cleanKw} से शेयर बाजार में हलचल`,
                    description: `आर्थिक विशेषज्ञों के मुताबिक ${cleanKw} का असर सीधे तौर पर बाजार पर देखने को मिल रहा है। नए निवेश और योजनाओं के चलते व्यापारियों और निवेशकों के बीच उम्मीद की एक नई लहर दौड़ गई है।`
                };
            case 'Agriculture':
                return {
                    title: `कृषि अपडेट: ${cleanKw} को लेकर किसानों के लिए नई सौगात`,
                    description: `किसानों की आय बढ़ाने और आधुनिक खेती को बढ़ावा देने के लिए ${cleanKw} पर कृषि विभाग ने नई योजना पेश की है। इससे बीज और खाद की उपलब्धता में सुधार होने की उम्मीद है।`
                };
            case 'Entertainment':
                return {
                    title: `मनोरंजन की दुनिया: ${cleanKw} को लेकर फैंस में जबरदस्त क्रेज`,
                    description: `सोशल मीडिया पर ${cleanKw} लगातार ट्रेंड कर रहा है। मेकर्स और सितारों ने दर्शकों के लिए कुछ खास पेश किया है, जिसे देखकर फैंस सिनेमाघरों की ओर खिंचे चले आ रहे हैं।`
                };
            case 'Social':
                return {
                    title: `सामाजिक जागरूकता: ${cleanKw} अभियान में लोगों ने बढ़-चढ़कर लिया हिस्सा`,
                    description: `समाज को बेहतर बनाने के उद्देश्य से ${cleanKw} पर एक विशाल रैली का आयोजन किया गया। विभिन्न स्वयंसेवी संस्थाओं और स्थानीय लोगों ने मिलकर इसे सफल बनाने का संकल्प लिया।`
                };
            case 'Accident':
                return {
                    title: `दर्दनाक हादसा: ${cleanKw} के पास भीषण दुर्घटना, कई घायल`,
                    description: `आज सुबह ${cleanKw} के समीप एक वाहन अनियंत्रित होकर हादसे का शिकार हो गया। स्थानीय लोगों और पुलिस की मदद से घायलों को अस्पताल पहुंचाया गया। हादसे के कारणों की जांच जारी है।`
                };
            case 'Obituary/Tribute':
                return {
                    title: `शोक संदेश: ${cleanKw} का आकस्मिक निधन, क्षेत्र में मातम`,
                    description: `समाज के एक प्रतिष्ठित चेहरे ${cleanKw} ने आज अंतिम सांस ली। उनके निधन की खबर से पूरे इलाके में शोक की लहर दौड़ गई है। उनके किए गए सामाजिक कार्यों को हमेशा याद रखा जाएगा।`
                };
            case 'Advertisement':
                return {
                    title: `विशेष ऑफर: ${cleanKw} पर मिल रही है बंपर छूट, मौका हाथ से न जाने दें`,
                    description: `क्या आप बेहतरीन डील की तलाश में हैं? ${cleanKw} पर अब तक का सबसे बड़ा डिस्काउंट मिल रहा है। यह सेल सिर्फ सीमित समय के लिए है, तो आज ही अपनी पसंदीदा चीजें घर लाएं।`
                };
            default:
                return {
                    title: `विशेष रिपोर्ट: ${cleanKw} के बारे में ताजा अपडेट`,
                    description: `${intro} ${cleanKw} को लेकर कुछ नई जानकारियां सामने आई हैं। हमारी टीम इस पूरी खबर पर पैनी नजर बनाए हुए है और जल्द ही विस्तृत रिपोर्ट पेश करेगी।`
                };
        }
    };

    const handleAiGenerate = async () => {
        if (!aiKeywords.trim()) {
            Alert.alert("Keywords Required", "Please enter a few keywords first.");
            return;
        }
        setGenerating(true);

        const langMap: Record<string, string> = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' };
        const targetLang = langMap[language] || 'Hindi';

        // ⚠️ Replace this with your actual Gemini API Key
        const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 

        try {
            if (!GEMINI_API_KEY) {
                throw new Error("No API Key");
            }

            const prompt = `Write a short, engaging news title and description in ${targetLang} language about: "${aiKeywords}". Category: ${category}. Return JSON strictly in this format: {"title": "your title", "description": "your description"}. Do not include markdown formatting.`;

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const text = response.data.candidates[0].content.parts[0].text;
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            setTitle(data.title);
            setDescription(data.description);
            setAiModalVisible(false);
            setAiKeywords('');
            Alert.alert("Draft Applied", "News generated successfully by Gemini AI!");
        } catch (error) {
            console.log("Gemini generation failed, using local fallback", error);
            const draft = generateAiNews(aiKeywords, category, language);
            setTitle(draft.title);
            setDescription(draft.description);
            setAiModalVisible(false);
            setAiKeywords('');
            if (GEMINI_API_KEY) {
                Alert.alert("Notice", "Gemini API failed, used local generator instead.");
            } else {
                Alert.alert("Notice", "API key missing. Used local generator instead. Add your Gemini API key in code!");
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleScroll = (event: any, setScrolledState: (val: boolean) => void) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        // Verify user reaches the bottom (within 25 pixels boundary margin)
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 25;
        if (isCloseToBottom) {
            setScrolledState(true);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert("Missing Fields", "Please enter a news title and description.");
            return;
        }

        if (!termsAccepted || !policyAccepted) {
            Alert.alert("Consent Required", "Please read and accept both the Disclaimer/Terms and the Privacy Policy to submit news.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);

            // Append hidden tag if we have an aspect ratio
            let finalDescription = description;
            if (postAspectRatio) {
                finalDescription = `${description}\n[aspect:${postAspectRatio}]`;
            }
            formData.append('description', finalDescription);

            formData.append('category', category);
            formData.append('state', selectedState);
            formData.append('district', selectedDistrict);
            if (currentUserId) formData.append('user_id', currentUserId);

            const finalImages = await Promise.all(mediaFiles.map(async (file) => {
                let fileUri = file.uri;
                if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
                    fileUri = `file://${fileUri}`;
                }

                // If it's a video or we don't have an aspect ratio, just return original
                if (file.type === 'video' || !postAspectRatio) {
                    return { uri: fileUri, type: file.type };
                }

                // Crop image
                return new Promise<{ uri: string, type: string }>((resolve) => {
                    Image.getSize(fileUri, async (w, h) => {
                        const imgAspect = w / h;
                        let cropOriginX = 0;
                        let cropOriginY = 0;
                        let cropWidth = w;
                        let cropHeight = h;

                        if (imgAspect > postAspectRatio) {
                            cropWidth = Math.round(h * postAspectRatio);
                            cropOriginX = Math.round((w - cropWidth) / 2);
                        } else if (imgAspect < postAspectRatio) {
                            cropHeight = Math.round(w / postAspectRatio);
                            cropOriginY = Math.round((h - cropHeight) / 2);
                        } else {
                            resolve({ uri: fileUri, type: file.type });
                            return;
                        }

                        try {
                            const manipResult = await ImageManipulator.manipulateAsync(
                                fileUri,
                                [{ crop: { originX: cropOriginX, originY: cropOriginY, width: cropWidth, height: cropHeight } }],
                                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                            );
                            resolve({ uri: manipResult.uri, type: file.type });
                        } catch (e) {
                            resolve({ uri: fileUri, type: file.type });
                        }
                    }, () => resolve({ uri: fileUri, type: file.type }));
                });
            }));

            finalImages.forEach((file, index) => {
                const filename = file.uri.split('/').pop()?.split('?')[0] || `news_media_${index}.${file.type === 'video' ? 'mp4' : 'jpg'}`;
                const match = /\.(\w+)$/.exec(filename);
                let type = '';
                if (file.type === 'video') {
                    type = match ? `video/${match[1]}` : `video/mp4`;
                } else {
                    type = match ? `image/${match[1]}` : `image/jpeg`;
                }
                formData.append('media[]', {
                    uri: file.uri,
                    name: filename,
                    type
                } as any);
            });

            const thumbUri = finalImages.length > 0 ? finalImages[0].uri : null;
            startUpload('create_news.php', formData, thumbUri);

            Alert.alert("Success", "News is posting in the background!");
            navigation.goBack();
        } catch (error: any) {
            console.error('[CreateNews] Error posting news:', error);
            Alert.alert("Error", "Failed to prepare news upload: " + (error?.message || "Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add New News</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('MyNews')}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
                            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="newspaper-outline" size={15} color="#ea580c" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ea580c' }}>My News</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>News Media (Photos & Videos)</Text>

                    {/* Dotted upload container */}
                    <View
                        style={[
                            styles.uploadPlaceholder,
                            mediaFiles.length > 0 ? styles.uploadPlaceholderWithImages : {}
                        ]}
                    >
                        {mediaFiles.length === 0 ? (
                            <TouchableOpacity onPress={pickMedia} style={styles.uploadPlaceholderInner} activeOpacity={0.8}>
                                <Ionicons name="cloud-upload-outline" size={44} color="#9ca3af" />
                                <Text style={styles.uploadText}>Tap to select news images or videos</Text>
                            </TouchableOpacity>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewsScroll}>
                                {mediaFiles.map((file, index) => (
                                    <View key={index} style={styles.imageItemContainer}>
                                        <Image source={{ uri: file.uri }} style={styles.imagePreview} />
                                        {file.type === 'video' && (
                                            <View style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: 'rgba(0,0,0,0.35)',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <Ionicons name="play-circle" size={32} color="white" />
                                            </View>
                                        )}
                                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeMedia(index)}>
                                            <Ionicons name="close" size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Choose Files Button */}
                    <TouchableOpacity onPress={pickMedia} style={styles.chooseFilesBtn}>
                        <Ionicons name="cloud-upload-outline" size={18} color="#4b5563" />
                        <Text style={styles.chooseFilesText}>Choose Photos & Videos</Text>
                    </TouchableOpacity>

                    {/* Aspect Ratio / Frame Selection */}
                    {mediaFiles.length > 0 && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Frame</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                <TouchableOpacity onPress={() => setPostAspectRatio(null)} style={[styles.aspectBtn, postAspectRatio === null && styles.aspectBtnSelected]}>
                                    <Ionicons name="image-outline" size={20} color={postAspectRatio === null ? '#ea580c' : '#6b7280'} />
                                    <Text style={[styles.aspectBtnText, postAspectRatio === null && { color: '#ea580c', fontWeight: 'bold' }]}>Original</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(1)} style={[styles.aspectBtn, postAspectRatio === 1 && styles.aspectBtnSelected]}>
                                    <View style={[styles.aspectIcon, { width: 18, height: 18, borderColor: postAspectRatio === 1 ? '#ea580c' : '#6b7280' }]} />
                                    <Text style={[styles.aspectBtnText, postAspectRatio === 1 && { color: '#ea580c', fontWeight: 'bold' }]}>1:1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(4 / 5)} style={[styles.aspectBtn, postAspectRatio === 4 / 5 && styles.aspectBtnSelected]}>
                                    <View style={[styles.aspectIcon, { width: 16, height: 20, borderColor: postAspectRatio === 4 / 5 ? '#ea580c' : '#6b7280' }]} />
                                    <Text style={[styles.aspectBtnText, postAspectRatio === 4 / 5 && { color: '#ea580c', fontWeight: 'bold' }]}>4:5</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPostAspectRatio(16 / 9)} style={[styles.aspectBtn, postAspectRatio === 16 / 9 && styles.aspectBtnSelected]}>
                                    <View style={[styles.aspectIcon, { width: 22, height: 12, borderColor: postAspectRatio === 16 / 9 ? '#ea580c' : '#6b7280' }]} />
                                    <Text style={[styles.aspectBtnText, postAspectRatio === 16 / 9 && { color: '#ea580c', fontWeight: 'bold' }]}>16:9</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
                                Frames keep your post looking consistent. Videos will automatically crop.
                            </Text>
                        </View>
                    )}

                    {/* Category Selector */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Select Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {CATEGORY_MAP.map((cat) => (
                                <TouchableOpacity
                                    key={cat.name}
                                    onPress={() => setCategory(cat.name)}
                                    style={[
                                        styles.categoryBadge,
                                        category === cat.name ? styles.categoryBadgeSelected : {}
                                    ]}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                    <Text style={[
                                        styles.categoryBadgeText,
                                        category === cat.name ? styles.categoryBadgeTextSelected : {}
                                    ]}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* State & District Selectors (Conditional) */}
                    {(category === 'State' || category === 'District') && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select State</Text>
                            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', marginBottom: 12 }}>
                                <Picker
                                    selectedValue={selectedState}
                                    onValueChange={(itemValue, itemIndex) => {
                                        if (itemIndex > 0) {
                                            const st = statesList[itemIndex - 1];
                                            handleStateChange(st.name, st.id);
                                        } else {
                                            handleStateChange('', '');
                                        }
                                    }}
                                >
                                    <Picker.Item label="Select State" value="" />
                                    {statesList.map((st, idx) => (
                                        <Picker.Item key={idx} label={st.name} value={st.name} />
                                    ))}
                                </Picker>
                            </View>

                            {category === 'District' && (
                                <>
                                    <Text style={styles.label}>Select District</Text>
                                    <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb' }}>
                                        <Picker
                                            selectedValue={selectedDistrict}
                                            onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                                            enabled={districtsList.length > 0}
                                        >
                                            <Picker.Item label="Select District" value="" />
                                            {districtsList.map((dst, idx) => (
                                                <Picker.Item key={idx} label={dst.name} value={dst.name} />
                                            ))}
                                        </Picker>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {/* AI Assistant Button */}
                    <TouchableOpacity
                        onPress={() => setAiModalVisible(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ea580c12',
                            borderWidth: 1.5,
                            borderColor: '#ea580c',
                            borderRadius: 24,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            marginBottom: 20,
                            gap: 8,
                            shadowColor: '#ea580c',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 1
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="sparkles" size={18} color="#ea580c" />
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ea580c' }}>🤖 Generate Title & Description by AI</Text>
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>News Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter news title"
                            placeholderTextColor="#9ca3af"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>News Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter news description"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={6}
                            value={description}
                            onChangeText={setDescription}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Consent Checkboxes */}
                    <View style={{ marginVertical: 15, gap: 12 }}>
                        {/* Checkbox 1: Terms */}
                        <TouchableOpacity
                            onPress={() => {
                                if (!termsAccepted) {
                                    setTermsScrolledToBottom(false);
                                    setTermsModalVisible(true);
                                } else {
                                    setTermsAccepted(false);
                                }
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            activeOpacity={0.8}
                        >
                            <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                borderWidth: 1.5,
                                borderColor: '#ea580c',
                                backgroundColor: termsAccepted ? '#ea580c' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                {termsAccepted && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                                I agree to the <Text style={{ fontWeight: 'bold', color: '#ea580c', textDecorationLine: 'underline' }}>Disclaimer & Terms and Conditions</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Checkbox 2: Policy */}
                        <TouchableOpacity
                            onPress={() => {
                                if (!policyAccepted) {
                                    setPolicyScrolledToBottom(false);
                                    setPolicyModalVisible(true);
                                } else {
                                    setPolicyAccepted(false);
                                }
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            activeOpacity={0.8}
                        >
                            <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                borderWidth: 1.5,
                                borderColor: '#ea580c',
                                backgroundColor: policyAccepted ? '#ea580c' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                {policyAccepted && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                                I agree to the <Text style={{ fontWeight: 'bold', color: '#ea580c', textDecorationLine: 'underline' }}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={[styles.submitBtn, loading ? styles.submitBtnDisabled : {}]}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit News</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* AI Assistant Modal */}
            <Modal
                visible={aiModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAiModalVisible(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    onPress={() => setAiModalVisible(false)}
                >
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                        {/* Handle bar */}
                        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 16 }} />

                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="sparkles" size={20} color="#ea580c" />
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>AI News Assistant</Text>
                            </View>
                            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                Enter topic keywords / मुख्य शब्द दर्ज करें:
                            </Text>

                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#ea580c',
                                    borderRadius: 12,
                                    paddingHorizontal: 14,
                                    paddingVertical: 12,
                                    fontSize: 15,
                                    color: '#1f2937',
                                    backgroundColor: '#fff7ed',
                                    marginBottom: 16,
                                    textAlignVertical: 'top',
                                    height: 80
                                }}
                                placeholder="जैसे: दिल्ली में बारिश, खेल प्रतियोगिता जीत, सड़क हादसा आदि..."
                                placeholderTextColor="#fdba74"
                                value={aiKeywords}
                                onChangeText={setAiKeywords}
                                multiline
                            />

                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
                                Selected Category / चयनित श्रेणी: <Text style={{ fontWeight: 'bold', color: '#ea580c' }}>{category}</Text>
                            </Text>

                            <TouchableOpacity
                                onPress={handleAiGenerate}
                                disabled={generating}
                                style={{
                                    backgroundColor: '#ea580c',
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                    shadowColor: '#ea580c',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 6,
                                    elevation: 3
                                }}
                                activeOpacity={0.8}
                            >
                                {generating ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="flash" size={18} color="white" />
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Generate Draft / ड्राफ्ट लिखें</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Terms & Disclaimer Modal */}
            <Modal
                visible={termsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTermsModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 24, flex: 0.85, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                                Disclaimer & Terms
                            </Text>
                            <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 15 }}
                            onScroll={(e) => handleScroll(e, setTermsScrolledToBottom)}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={true}
                        >
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 }}>Disclaimer</Text>
                            <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 16 }}>
                                LinkUp is a User-Generated Content Platform.{"\n\n"}
                                All news, posts, reels, photos, videos, matrimony profiles, comments, chat messages, voice calls, and video calls available on the platform are created, uploaded, or shared by users.{"\n\n"}
                                The respective user is solely responsible for the accuracy, legality, authenticity, ownership, and copyright compliance of the content they publish.{"\n\n"}
                                LinkUp, its owners, developers, employees, administrators, and affiliates shall not be held responsible or liable for any user-generated content, copyright infringement, false information, defamatory material, or illegal activities conducted by users.{"\n\n"}
                                Upon receiving a valid complaint or legal notice, LinkUp reserves the right to remove content, restrict access, suspend accounts, or take appropriate action without prior notice.{"\n\n"}
                                The views and opinions expressed by users do not represent the views of LinkUp.
                            </Text>

                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ea580c', marginBottom: 8, marginTop: 8 }}>Terms and Conditions</Text>
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>Last Updated: June 25, 2026</Text>
                            <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 16 }}>
                                By using LinkUp, you agree to the following terms and conditions:{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>1. User Responsibility</Text>{"\n"}
                                Users are solely responsible for all content uploaded, posted, shared, or transmitted through the platform.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>2. Prohibited Content</Text>{"\n"}
                                Users must not upload, publish, or distribute:{"\n"}
                                • Copyright-infringing content{"\n"}
                                • False or misleading news{"\n"}
                                • Obscene, abusive, or offensive material{"\n"}
                                • Hate speech or discriminatory content{"\n"}
                                • Illegal or harmful content{"\n"}
                                • Defamatory material{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>3. News Section</Text>{"\n"}
                                Users are responsible for the accuracy and legality of news content they publish.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>4. Matrimony Section</Text>{"\n"}
                                • Users are responsible for the accuracy of their profiles.{"\n"}
                                • LinkUp does not guarantee any marriage proposal, relationship, or match.{"\n"}
                                • Users interact with others at their own risk.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>5. Chat, Group Chat, Voice Call & Video Call</Text>{"\n"}
                                Users are solely responsible for their communications and interactions on the platform.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>6. Account Suspension</Text>{"\n"}
                                LinkUp reserves the right to suspend or terminate any account that violates these Terms.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>7. Limitation of Liability</Text>{"\n"}
                                LinkUp shall not be liable for any loss, damage, dispute, or legal claim arising from user-generated content or user interactions.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>8. Modification of Services</Text>{"\n"}
                                LinkUp may modify, suspend, or discontinue any service without prior notice.
                            </Text>
                        </ScrollView>

                        {/* Button control */}
                        {termsScrolledToBottom ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setTermsAccepted(true);
                                    setTermsModalVisible(false);
                                }}
                                style={{
                                    backgroundColor: '#ea580c',
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Accept and Continue</Text>
                            </TouchableOpacity>
                        ) : (
                            <View
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                <Ionicons name="arrow-down-circle-outline" size={18} color="#9ca3af" />
                                <Text style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: 13 }}>Scroll down to accept / नीचे तक स्क्रॉल करें</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                visible={policyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPolicyModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 24, flex: 0.85, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                                Privacy Policy
                            </Text>
                            <TouchableOpacity onPress={() => setPolicyModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 15 }}
                            onScroll={(e) => handleScroll(e, setPolicyScrolledToBottom)}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={true}
                        >
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 }}>Privacy Policy</Text>
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>Last Updated: June 25, 2026</Text>
                            <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 16 }}>
                                Welcome to LinkUp. LinkUp is a Social Media, News, Matrimony, Chat, Group Chat, Voice Call, and Video Call platform. We respect your privacy and are committed to protecting your personal information.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>1. Information We Collect</Text>{"\n"}
                                • Name, mobile number, email address{"\n"}
                                • Profile photos and profile information{"\n"}
                                • News, posts, reels, photos, videos, comments{"\n"}
                                • Matrimony profile information{"\n"}
                                • Chat and group chat information{"\n"}
                                • Voice call and video call related technical data{"\n"}
                                • Device information, IP address, and log data{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>2. How We Use Information</Text>{"\n"}
                                • To create and manage user accounts{"\n"}
                                • To provide social media, news, and matrimony services{"\n"}
                                • To enable chat, voice call, and video call features{"\n"}
                                • To improve platform performance and user experience{"\n"}
                                • To maintain security and prevent fraud{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>3. Information Sharing</Text>{"\n"}
                                We do not sell users' personal information. Information may be shared if required by law, court order, or government authority.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>4. Data Security</Text>{"\n"}
                                We implement reasonable security measures to protect user data. However, no internet-based service can guarantee 100% security.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>5. Children's Privacy</Text>{"\n"}
                                Users under the age of 18 are not permitted to use Matrimony services.{"\n\n"}
                                <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>6. Changes to Policy</Text>{"\n"}
                                LinkUp reserves the right to modify this Privacy Policy at any time.
                            </Text>
                        </ScrollView>

                        {/* Button control */}
                        {policyScrolledToBottom ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setPolicyAccepted(true);
                                    setPolicyModalVisible(false);
                                }}
                                style={{
                                    backgroundColor: '#ea580c',
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Accept and Continue</Text>
                            </TouchableOpacity>
                        ) : (
                            <View
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                <Ionicons name="arrow-down-circle-outline" size={18} color="#9ca3af" />
                                <Text style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: 13 }}>Scroll down to accept / नीचे तक स्क्रॉल करें</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: 'white',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    uploadPlaceholder: {
        width: '100%',
        height: 150,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    uploadPlaceholderInner: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
    },
    uploadPlaceholderWithImages: {
        borderStyle: 'solid',
        borderColor: '#e5e7eb',
        height: 120,
    },

    uploadText: {
        color: '#6b7280',
        fontSize: 13,
        marginTop: 6,
    },
    previewsScroll: {
        padding: 10,
        width: '100%',
    },
    imageItemContainer: {
        width: 100,
        height: 100,
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 4,
        borderRadius: 12,
    },
    chooseFilesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: 'white',
        gap: 8,
        marginBottom: 20,
    },
    chooseFilesText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        backgroundColor: '#fafafa',
    },
    textArea: {
        height: 130,
    },
    submitBtn: {
        backgroundColor: '#ea580c',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    categoryScroll: {
        flexDirection: 'row',
        paddingVertical: 5,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 10,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    categoryBadgeSelected: {
        backgroundColor: '#ea580c',
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    categoryIcon: {
        marginRight: 6,
        fontSize: 14,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
    },
    categoryBadgeTextSelected: {
        color: 'white',
    },
    aspectBtn: {
        flex: 1,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    aspectBtnSelected: {
        backgroundColor: '#fff7ed',
        borderColor: '#ea580c'
    },
    aspectIcon: {
        borderWidth: 2,
        borderRadius: 2
    },
    aspectBtnText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600'
    },
});

export default CreateNewsScreen;
