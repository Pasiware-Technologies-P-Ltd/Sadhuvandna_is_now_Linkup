import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  DeviceEventEmitter,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { API_BASE_URL } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";
import { ImageService } from "../../services/ImageService";

import { ChatDBService } from "../../services/ChatDBService";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;
const QUICK_TAGS = [
  "All",
  "Delhi",
  "Mumbai",
  "B.Tech",
  "MBA",
  "Doctor",
  "B.Sc",
  "MCA",
];

const MarriageScreen = ({ navigation }: any) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfileId, setMyProfileId] = useState<number>(0);
  const [myProfilePhoto, setMyProfilePhoto] = useState<string>("");
  const [requestCount, setRequestCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userPhoto, setUserPhoto] = useState<string>("");
  const { t } = useLanguage();

  // Filters
  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (filterVisible) {
      filterAnim.setValue(0);
      Animated.spring(filterAnim, {
        toValue: 1,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [filterVisible]);

  const toggleFilter = () => {
    if (filterVisible) {
      Animated.timing(filterAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setFilterVisible(false);
      });
    } else {
      setFilterVisible(true);
    }
  };

  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  // Pagination
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const cursorRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  // Premium states
  const [activeTag, setActiveTag] = useState("All");
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1.0,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.4,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      shimmerAnim.setValue(0.4);
    }
  }, [loading]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProfiles();
    }
  }, [userId]);

  const loadCachedProfiles = async (uid: string) => {
    try {
      const cached = await AsyncStorage.getItem(`cached_matrimony_${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setProfiles(parsed.profiles);
        if (parsed.myProfileId) setMyProfileId(parsed.myProfileId);
        if (parsed.myProfilePhoto) setMyProfilePhoto(parsed.myProfilePhoto);
        if (parsed.requestCount) setRequestCount(parsed.requestCount);
        setLoading(false);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const loadUnreadCount = async (uid: string | number) => {
    try {
      const chats = await ChatDBService.getConversations(
        String(uid),
        "marriage",
      );
      let totalUnread = 0;
      chats.forEach((c: any) => {
        totalUnread += c.unread_count || 0;
      });
      setUnreadCount(totalUnread);
    } catch (e) {}
  };

  const loadUser = async () => {
    const u = await AsyncStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      const parsedId = parsed.id;
      setUserId(parsedId);
      if (parsed.profile_photo) {
        setUserPhoto(parsed.profile_photo);
      }
      const hasCache = await loadCachedProfiles(parsedId);
      await loadUnreadCount(parsedId);
      fetchProfiles(false, undefined, false, hasCache);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (userId) {
        fetchProfiles(false, undefined, false, true); // silent refresh on focus
        loadUnreadCount(userId);
      }
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    });

    const notifListener = DeviceEventEmitter.addListener(
      "new_notification",
      () => {
        if (userId) {
          loadUnreadCount(userId);
        }
      },
    );

    return () => {
      unsubscribe();
      unsubscribeBlur();
      notifListener.remove();
    };
  }, [navigation, userId]);

  const fetchProfiles = async (
    isMore = false,
    overrideFilters?: { gender?: string; city?: string; education?: string },
    isRefresh = false,
    isSilent = false
  ) => {
    if (isMore && (isLoadMoreLoading || !hasMore)) return;

    if (isMore) setIsLoadMoreLoading(true);
    else if (isRefresh) setRefreshing(true);
    else if (!isSilent && profiles.length === 0) setLoading(true);

    const activeGender =
      overrideFilters?.gender !== undefined ? overrideFilters.gender : gender;
    const activeCity =
      overrideFilters?.city !== undefined ? overrideFilters.city : city;
    const activeEducation =
      overrideFilters?.education !== undefined
        ? overrideFilters.education
        : education;

    if (!isMore) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }

    try {
      const params = new URLSearchParams();
      params.append("user_id", userId || "0");
      params.append("limit", "20");
      
      if (isMore && cursorRef.current) {
        params.append("cursor", cursorRef.current.toString());
      }

      if (search) params.append("city", search);
      if (activeGender) params.append("gender", activeGender);
      if (minAge && maxAge) params.append("age", `${minAge}-${maxAge}`);
      if (activeCity) params.append("city", activeCity);
      if (activeEducation) params.append("education", activeEducation);

      const res = await api.get(
        `/get_matrimony_profiles.php?${params.toString()}`,
        { signal: isMore ? undefined : abortControllerRef.current?.signal }
      );
      if (res.data.status === "success") {
        const newData = res.data.data || [];

        setHasMore(res.data.has_more);
        cursorRef.current = res.data.next_cursor;

        if (isMore) {
          setProfiles((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const uniqueNewData = newData.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...uniqueNewData];
          });
        } else {
          const cacheObj = {
            profiles: newData,
            myProfileId: res.data.my_profile_id,
            myProfilePhoto: res.data.my_profile_photo,
            requestCount: res.data.request_count,
          };
          const newStringified = JSON.stringify(cacheObj);
          
          if (!search && !activeGender && !activeCity && !activeEducation) {
            AsyncStorage.getItem(`cached_matrimony_${userId || "0"}`).then(cachedStr => {
              if (!isSilent || cachedStr !== newStringified) {
                setProfiles(newData);
                AsyncStorage.setItem(
                  `cached_matrimony_${userId || "0"}`,
                  newStringified,
                );
              }
            });
          } else {
            setProfiles(newData);
          }
        }

        setMyProfileId(res.data.my_profile_id);
        setMyProfilePhoto(res.data.my_profile_photo || "");
        setRequestCount(res.data.request_count);
      }
      setLoading(false);
      setRefreshing(false);
      setIsLoadMoreLoading(false);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error(error);
      setLoading(false);
      setRefreshing(false);
      setIsLoadMoreLoading(false);
    }
  };

  const onRefresh = () => {
    cursorRef.current = null;
    fetchProfiles(false, undefined, true);
  };

  const handleGenderSegmentPress = (selectedGender: string) => {
    setGender(selectedGender);
    fetchProfiles(false, { gender: selectedGender, city, education });
  };

  const handleTagPress = (tag: string) => {
    setActiveTag(tag);
    let nextCity = "";
    let nextEducation = "";

    if (tag === "All") {
      nextCity = "";
      nextEducation = "";
      setCity("");
      setEducation("");
    } else if (["Delhi", "Mumbai"].includes(tag)) {
      nextCity = tag;
      nextEducation = "";
      setCity(tag);
      setEducation("");
    } else {
      nextCity = "";
      nextEducation = tag;
      setCity("");
      setEducation(tag);
    }

    fetchProfiles(false, { gender, city: nextCity, education: nextEducation });
  };

  const renderSkeletonCard = () => {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "white",
          margin: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#f3f4f6",
          overflow: "hidden",
          opacity: shimmerAnim,
        }}
      >
        <View
          style={{ width: "100%", height: 160, backgroundColor: "#e5e7eb" }}
        />
        <View style={{ padding: 12 }}>
          <View
            style={{
              width: "70%",
              height: 14,
              backgroundColor: "#e5e7eb",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              width: "90%",
              height: 10,
              backgroundColor: "#e5e7eb",
              borderRadius: 4,
            }}
          />
        </View>
        <View
          style={{
            width: "100%",
            height: 36,
            backgroundColor: "#f9fafb",
            borderTopWidth: 1,
            borderColor: "#f3f4f6",
          }}
        />
      </Animated.View>
    );
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!userId) {
      Alert.alert("Notice", "Please login.");
      return;
    }
    if (!myProfileId) {
      Alert.alert(
        "Profile Required",
        "Please create your marriage profile first.",
        [
          { text: "Cancel" },
          {
            text: "Create Now",
            onPress: () => navigation.navigate("CreateMarriageProfile"),
          },
        ],
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("action", "send_request");
      formData.append("user_id", userId);
      formData.append("receiver_id", receiverId);

      // using api_connect.php for unified connection handling
      const res = await api.post("/api_connect.php", formData);
      if (res.data.status === "success") {
        Alert.alert("Success", "Proposal Sent Successfully");
        fetchProfiles(); // Refresh status
      } else {
        Alert.alert("Notice", res.data.message || "Failed to send request");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    }
  };

  const renderProfile = ({ item }: { item: any }) => {
    const isSender = item.is_sender;
    const status = item.proposal_status;

    // Generate a deterministic compatibility score based on name & ID
    const scoreHash =
      (item.full_name?.charCodeAt(0) || 0) + (parseInt(item.id) || 0);
    const compatibilityScore = 78 + (scoreHash % 21); // Generates a percentage between 78% and 98%

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("MarriageDetail", { profile: item })}
        style={{
          flex: 1,
          backgroundColor: "white",
          margin: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#f3f4f6",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
          elevation: 2,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{
              uri: item.photo
                ? ImageService.getFeedImageUrl(`${PHOTO_URL}${item.photo}`, 300)
                : "https://via.placeholder.com/150",
            }}
            style={{ width: "100%", height: 160, backgroundColor: "#f9fafb" }}
            contentFit="cover"
          />
          {/* Flame compatibility score badge */}
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "900", color: "#ea580c" }}>
              🔥 {compatibilityScore}%
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#ea580c",
                fontSize: 8,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {item.status || "UNMARRIED"}
            </Text>
          </View>
        </View>

        <View style={{ padding: 12 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "bold", color: "#1f2937" }}
            numberOfLines={1}
          >
            {item.full_name}, {item.age}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "500",
              color: "#6b7280",
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {item.city || "Location"} • {item.education || "Not specified"}
          </Text>
        </View>

        {/* Card Footer Action Strip */}
        <View style={{ marginTop: "auto" }}>
          {(!status || status === "rejected") && (
            <View
              style={{
                width: "100%",
                backgroundColor: "#fff7ed",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#ffedd5",
              }}
            >
              <Text
                style={{
                  color: "#ea580c",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("viewProfileMatrimony")}
              </Text>
            </View>
          )}

          {(status === "pending" || status === "sent" || status === "received") && (
            <View
              style={{
                width: "100%",
                backgroundColor: "#fff7ed",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#ffedd5",
              }}
            >
              <Text
                style={{
                  color: "#ea580c",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("requested")} • {t("viewProfileMatrimony")}
              </Text>
            </View>
          )}

          {(status === "accepted" || status === "friend") && (
            <TouchableOpacity
              style={{
                width: "100%",
                backgroundColor: "#f0fdf4",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#dcfce7",
              }}
              onPress={() =>
                navigation.navigate("Chat", {
                  receiver: item,
                  platform: "marriage",
                })
              }
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "#16a34a",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("message")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
        {/* Top Row: Logo, Search, Chat, Bell */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: "#ea580c",
                letterSpacing: -0.5,
              }}
            >
              MATRIMONY
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Search / Filter Button */}
            <TouchableOpacity
              onPress={toggleFilter}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f9fafb",
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 10,
                  fontWeight: "600",
                  marginRight: 4,
                }}
              >
                Search
              </Text>
              <Ionicons name="funnel-outline" size={11} color="#ea580c" />
            </TouchableOpacity>

            {/* Chat Icon */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ChatList", { platform: "marriage" })
              }
              style={{ position: "relative" }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#16a34a"
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -5,
                    backgroundColor: "#ef4444",
                    minWidth: 12,
                    height: 12,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    borderWidth: 1,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 6, fontWeight: "bold" }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Bell (Requests) Icon */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Requests")}
              style={{ position: "relative" }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#db2777"
              />
              {requestCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    backgroundColor: "#ef4444",
                    minWidth: 12,
                    height: 12,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    borderWidth: 1,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 6, fontWeight: "bold" }}
                  >
                    {requestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading && myProfileId === 0 ? (
        <View style={{ flex: 1, backgroundColor: "#f9fafb", paddingTop: 16 }}>
          <FlashList
            data={[1, 2, 3, 4, 5, 6]}
            renderItem={renderSkeletonCard}
            keyExtractor={(item) => item.toString()}
            numColumns={2}
            contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 6 }}
          />
        </View>
      ) : !myProfileId ? (
        // Gate: No profile created yet
        <View className="flex-1 items-center justify-center px-8 bg-gray-50">
          <View className="bg-white rounded-3xl p-8 items-center shadow-md border border-gray-100 w-full">
            <View className="bg-orange-100 p-5 rounded-full mb-5">
              <Ionicons name="heart-circle-outline" size={52} color="#ea580c" />
            </View>
            <Text className="text-xl font-extrabold text-gray-800 mb-2 text-center">
              {t("welcomeMatrimony")}
            </Text>
            <Text className="text-gray-500 text-sm text-center leading-5 mb-6">
              {t("browseProfilesMsg")}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateMarriageProfile", { profile: null })
              }
              className="bg-orange-600 w-full py-3.5 rounded-2xl items-center shadow-sm mb-3"
            >
              <Text className="text-white font-extrabold text-base">
                {t("createMyProfile")}
              </Text>
            </TouchableOpacity>
            <Text className="text-gray-400 text-xs text-center">
              {t("afterCreatingMsg")}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, position: "relative" }}>
          {/* Segment Switcher & Profile Button Row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              marginTop: 12,
              marginBottom: 12,
              gap: 12,
            }}
          >
            {/* Segment Switcher */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: "#f3f4f6",
                borderRadius: 24,
                padding: 3,
              }}
            >
              <TouchableOpacity
                onPress={() => handleGenderSegmentPress("")}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: gender === "" ? "white" : "transparent",
                  borderRadius: 20,
                  shadowColor: gender === "" ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: gender === "" ? 2 : 0,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: gender === "" ? "#ea580c" : "#4b5563",
                  }}
                >
                  {t("allMatches") || "All Matches"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleGenderSegmentPress("Male")}
                style={{
                  flex: 1,
                  paddingVertical: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: gender === "Male" ? "white" : "transparent",
                  borderRadius: 20,
                  shadowColor: gender === "Male" ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: gender === "Male" ? 2 : 0,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: gender === "Male" ? "#ea580c" : "#4b5563",
                  }}
                >
                  {t("grooms") || "Grooms"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleGenderSegmentPress("Female")}
                style={{
                  flex: 1,
                  paddingVertical: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    gender === "Female" ? "white" : "transparent",
                  borderRadius: 20,
                  shadowColor: gender === "Female" ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: gender === "Female" ? 2 : 0,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: gender === "Female" ? "#ea580c" : "#4b5563",
                  }}
                >
                  {t("brides") || "Brides"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile Button */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateMarriageProfile", {
                  profile: myProfileId ? { id: myProfileId } : null,
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "white",
                paddingLeft: 8,
                paddingRight: 2,
                paddingVertical: 2,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#ea580c",
                shadowColor: "#ea580c",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: "#ea580c",
                  fontSize: 9,
                  fontWeight: "bold",
                  marginRight: 4,
                  letterSpacing: 0.5,
                }}
              >
                PROFILE
              </Text>
              <Image
                source={{
                  uri: myProfilePhoto
                    ? `${PHOTO_URL}${myProfilePhoto}`
                    : (userPhoto ? `${PHOTO_URL}${userPhoto}` : "https://via.placeholder.com/100"),
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#f3f4f6",
                }}
              />
            </TouchableOpacity>
          </View>

          {/* Quick Tags Filter Carousel */}
          <View style={{ marginBottom: 6 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                gap: 8,
                paddingBottom: 6,
              }}
            >
              {QUICK_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => handleTagPress(tag)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      activeTag === tag ? "#ea580c" : "transparent",
                    borderWidth: 1,
                    borderColor: activeTag === tag ? "#ea580c" : "#e5e7eb",
                    shadowColor: activeTag === tag ? "#ea580c" : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: activeTag === tag ? 3 : 0,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: activeTag === tag ? "white" : "#6b7280",
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <FlashList
              data={[1, 2, 3, 4, 5, 6]}
              renderItem={renderSkeletonCard}
              keyExtractor={(item) => item.toString()}
              numColumns={2}
              contentContainerStyle={{
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            />
          ) : (
            <FlashList
              data={profiles}
              renderItem={renderProfile}
              keyExtractor={(item, index) =>
                item.id ? item.id.toString() + "_" + index : index.toString()
              }
              numColumns={2}
              // @ts-ignore: IDE erroneously flags this property
              estimatedItemSize={350}
              onEndReached={() => fetchProfiles(true)}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} tintColor="#ea580c" />
              }
              ListFooterComponent={
                isLoadMoreLoading ? (
                  <View className="py-4">
                    <ActivityIndicator color="#ea580c" />
                  </View>
                ) : null
              }
              contentContainerStyle={{
                paddingHorizontal: 6,
                paddingVertical: 10,
                paddingBottom: 80,
              }}
              className="bg-gray-50"
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Image
                    source={{
                      uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png",
                    }}
                    className="w-20 h-20 opacity-30 mb-4"
                  />
                  <Text className="text-gray-500 font-bold text-lg">
                    {t("noProfilesFound")}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center w-64">
                    {t("tryChangingFilters")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => fetchProfiles()}
                    className="mt-6 bg-orange-100 px-6 py-2 rounded-full"
                  >
                    <Text className="text-orange-600 font-bold text-xs">
                      {t("refresh")}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}

          {filterVisible && (
            <>
              {/* Backdrop overlay */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  zIndex: 90,
                  opacity: filterAnim,
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={toggleFilter}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              {/* Floating Filter Panel */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: 8,
                  left: 12,
                  right: 12,
                  backgroundColor: "white",
                  padding: 20,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#f3f4f6",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                  zIndex: 100,
                  opacity: filterAnim,
                  transform: [
                    {
                      translateY: filterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                    {
                      scale: filterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("genderLabel")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}
                >
                  <TouchableOpacity
                    onPress={() => setGender("Male")}
                    style={{
                      flex: 1,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: gender === "Male" ? "#ea580c" : "#e5e7eb",
                      backgroundColor:
                        gender === "Male" ? "#ea580c" : "#f9fafb",
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        color: gender === "Male" ? "white" : "#4b5563",
                      }}
                    >
                      {t("groomMale")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setGender("Female")}
                    style={{
                      flex: 1,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: gender === "Female" ? "#db2777" : "#e5e7eb",
                      backgroundColor:
                        gender === "Female" ? "#db2777" : "#f9fafb",
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        color: gender === "Female" ? "white" : "#4b5563",
                      }}
                    >
                      {t("brideFemale")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("ageRange")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#f9fafb",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <TextInput
                      placeholder={t("minAge")}
                      value={minAge}
                      onChangeText={setMinAge}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#111827",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#f9fafb",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <TextInput
                      placeholder={t("maxAge")}
                      value={maxAge}
                      onChangeText={setMaxAge}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#111827",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("locationEducation")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#f9fafb",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#9ca3af"
                      style={{ marginRight: 4 }}
                    />
                    <TextInput
                      placeholder={t("cityPlaceholder")}
                      value={city}
                      onChangeText={setCity}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#111827",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#f9fafb",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <Ionicons
                      name="school-outline"
                      size={16}
                      color="#9ca3af"
                      style={{ marginRight: 4 }}
                    />
                    <TextInput
                      placeholder={t("degreePlaceholder")}
                      value={education}
                      onChangeText={setEducation}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#111827",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderColor: "#f3f4f6",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setGender("");
                      setCity("");
                      setEducation("");
                      setMinAge("");
                      setMaxAge("");
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: "#ea580c",
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {t("resetAll")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      toggleFilter();
                      fetchProfiles();
                    }}
                    style={{
                      backgroundColor: "#ea580c",
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      borderRadius: 24,
                      shadowColor: "#ea580c",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {t("applyFilters")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default MarriageScreen;
