import sys

def modify_file():
    path = 'd:/bangosambadApp/src/screens/news/NewsScreen.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    if 'import { Picker }' not in content:
        content = content.replace(
            "import * as Sharing from 'expo-sharing';",
            "import * as Sharing from 'expo-sharing';\nimport { Picker } from '@react-native-picker/picker';\nimport { Video, ResizeMode } from 'expo-av';"
        )

    # 2. States
    if 'const [districtsList' not in content:
        content = content.replace(
            "const [selectedCategory, setSelectedCategory] = useState<string>('All');",
            "const [selectedCategory, setSelectedCategory] = useState<string>('All');\n    const [statesList, setStatesList] = useState<any[]>([]);\n    const [districtsList, setDistrictsList] = useState<any[]>([]);\n    const [selectedState, setSelectedState] = useState('');\n    const [selectedDistrict, setSelectedDistrict] = useState('');\n\n    useEffect(() => {\n        const fetchStates = async () => {\n            try {\n                const res = await api.get('/get_states.php');\n                if (res.data && res.data.status === 'success') setStatesList(res.data.data);\n            } catch (err) {}\n        };\n        fetchStates();\n    }, []);\n\n    const fetchDistricts = async (stateId: string) => {\n        try {\n            const res = await api.get(/get_districts.php?state_id=\);\n            if (res.data && res.data.status === 'success') setDistrictsList(res.data.data);\n        } catch (err) {}\n    };\n\n    const handleStateChange = (stateName: string, stateId: string) => {\n        setSelectedState(stateName);\n        setSelectedDistrict('');\n        setDistrictsList([]);\n        if (stateId) fetchDistricts(stateId);\n    };"
        )

    # 3. Filtered News
    if 'item.state === selectedState' not in content:
        content = content.replace(
            "const filteredNews = (selectedCategory === 'All'\n        ? news\n        : news.filter((item: any) => item.category === selectedCategory)\n    ).filter((item: any) => \n        !searchQuery.trim() || \n        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || \n        item.description?.toLowerCase().includes(searchQuery.toLowerCase())\n    );",
            "const filteredNews = (selectedCategory === 'All'\n        ? news\n        : news.filter((item: any) => item.category === selectedCategory)\n    ).filter((item: any) => {\n        if (selectedCategory === 'State') return !selectedState || item.state === selectedState;\n        if (selectedCategory === 'District') return (!selectedState || item.state === selectedState) && (!selectedDistrict || item.district === selectedDistrict);\n        return true;\n    }).filter((item: any) => \n        !searchQuery.trim() || \n        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || \n        item.description?.toLowerCase().includes(searchQuery.toLowerCase())\n    );"
        )

    # 4. Animated Header States
    if 'const [headerHeight' not in content:
        content = content.replace(
            "const shimmerAnim = useRef(new Animated.Value(0.4)).current;",
            "const shimmerAnim = useRef(new Animated.Value(0.4)).current;\n    const [headerHeight, setHeaderHeight] = useState(230);\n    const scrollY = useRef(new Animated.Value(0)).current;\n    const scrollYClamped = Animated.diffClamp(scrollY, 0, headerHeight);\n    const headerTranslateY = scrollYClamped.interpolate({ inputRange: [0, headerHeight], outputRange: [0, -headerHeight], extrapolate: 'clamp' });"
        )

    # 5. Wrapping Header in Animated.View
    if '<Animated.View' not in content.split('{/* Header & Tabs */}')[1][:100]:
        content = content.replace(
            '<View className="bg-white pt-4 border-b border-gray-100 shadow-sm z-10">',
            '<Animated.View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} style={{ position: \'absolute\', top: 0, left: 0, right: 0, zIndex: 10, transform: [{ translateY: headerTranslateY }], backgroundColor: \'white\', borderBottomWidth: 1, borderBottomColor: \'#f3f4f6\', shadowColor: \'#000\', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3, paddingTop: 45 }}>'
        )
        content = content.replace(
            '{activeTab === \'apna\' && showTicker && (\n                    <NewsTicker tickerData={tickerData} onClose={() => setShowTicker(false)} />\n                )}\n            </View>',
            "{activeTab === 'apna' && showTicker && (\n                    <NewsTicker tickerData={tickerData} onClose={() => setShowTicker(false)} />\n                )}\n\n            {(selectedCategory === 'State' || selectedCategory === 'District') && activeTab === 'apna' && (\n                <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>\n                    <View style={{ flexDirection: 'row', gap: 10 }}>\n                        <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', height: 40, justifyContent: 'center' }}>\n                            <Picker\n                                selectedValue={selectedState}\n                                onValueChange={(itemValue, itemIndex) => {\n                                    if (itemIndex > 0) {\n                                        const st = statesList[itemIndex - 1];\n                                        handleStateChange(st.name, st.id);\n                                    } else handleStateChange('', '');\n                                }}\n                                style={{ height: 40 }}\n                            >\n                                <Picker.Item label=\"Select State\" value=\"\" style={{ fontSize: 13 }} />\n                                {statesList.map((st, idx) => (\n                                    <Picker.Item key={idx} label={st.name} value={st.name} style={{ fontSize: 13 }} />\n                                ))}\n                            </Picker>\n                        </View>\n\n                        {selectedCategory === 'District' && (\n                            <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', height: 40, justifyContent: 'center' }}>\n                                <Picker\n                                    selectedValue={selectedDistrict}\n                                    onValueChange={(itemValue) => setSelectedDistrict(itemValue)}\n                                    style={{ height: 40 }}\n                                    enabled={districtsList.length > 0}\n                                >\n                                    <Picker.Item label=\"Select District\" value=\"\" style={{ fontSize: 13 }} />\n                                    {districtsList.map((dst, idx) => (\n                                        <Picker.Item key={idx} label={dst.name} value={dst.name} style={{ fontSize: 13 }} />\n                                    ))}\n                                </Picker>\n                            </View>\n                        )}\n                    </View>\n                </View>\n            )}\n            </Animated.View>"
        )

    # 6. FlatList to Animated.FlatList
    if '<Animated.FlatList' not in content:
        content = content.replace(
            "<FlatList\n                        data={Array.isArray(filteredNews) ? filteredNews : []}",
            "<Animated.FlatList\n                        data={Array.isArray(filteredNews) ? filteredNews : []}"
        )
        content = content.replace(
            "contentContainerStyle={{ paddingVertical: 12 }}",
            "contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 12 }}\n                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}\n                        scrollEventThrottle={16}"
        )
        content = content.replace(
            "refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshApna} colors={['#ea580c']} tintColor=\"#ea580c\" />}",
            "refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshApna} colors={['#ea580c']} tintColor=\"#ea580c\" progressViewOffset={headerHeight} />}"
        )
        # Make skeleton also Animated.FlatList
        content = content.replace(
            "loading ? (\n                    <FlatList\n                        data={[1, 2, 3, 4]}",
            "loading ? (\n                    <Animated.FlatList\n                        data={[1, 2, 3, 4]}"
        )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

modify_file()
