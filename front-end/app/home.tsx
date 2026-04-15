import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/constants/api';
import * as FileSystem from 'expo-file-system/legacy';

export default function HomeScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const userEmail = params.email ? String(params.email) : '';
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [categorySelected, setCategorySelected] = useState(false);
  const [scanImageUri, setScanImageUri] = useState<string | null>(null);
  const [scanImageName, setScanImageName] = useState('');
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanImageMimeType, setScanImageMimeType] = useState<string | null>(null);
  const [scanQrText, setScanQrText] = useState('');
  const [scanQrLoading, setScanQrLoading] = useState(false);
  const [scanQrError, setScanQrError] = useState('');
  const [scanQrInfo, setScanQrInfo] = useState<any | null>(null);
  const [scanNote, setScanNote] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'community' | 'treasure'>(
    'home'
  );
  const [txItems, setTxItems] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // --- Community Features ---
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<number[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [communityTab, setCommunityTab] = useState<'feed' | 'ranking'>('feed');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingContent, setEditingContent] = useState('');
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [customConfirm, setCustomConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'delete' | 'update';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'update',
    onConfirm: () => {},
  });

  const formatCommunityTime = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const loadUserInfo = async () => {
    if (!params.email) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/onboarding?email=${encodeURIComponent(String(params.email))}`);
      const data = await response.json();
      if (response.ok && data.exists) {
        // Find user ID from the response or set a default
        setCurrentUser({ ...data.user, id: data.userId || 1 }); 
      }
    } catch (error) {}
  };

  const loadCommunityPosts = async () => {
    if (activeTab !== 'community') return;
    setPostsLoading(true);
    try {
      const uId = currentUser?.id || 1;
      const response = await fetch(`${API_BASE_URL}/api/community/posts?userId=${uId}`);
      const data = await response.json();
      if (response.ok) {
        setCommunityPosts(data.items || []);
      }
    } catch (error) {} finally {
      setPostsLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (response.ok) loadCommunityPosts();
    } catch (error) {}
  };

  const loadRanking = async () => {
    setRankingLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/ranking`);
      if (response.ok) {
        const data = await response.json();
        setRankingData(data.items || []);
        
        // Sync points with header
        const self = data.items.find((item: any) => item.id === currentUser?.id);
        if (self) {
          setCurrentUser((prev: any) => ({ ...prev, points: self.points }));
        }
      }
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setRankingLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content: newPostContent }),
      });
      if (response.ok) {
        setNewPostContent('');
        loadCommunityPosts();
        loadRanking();
      }
    } catch (error) {}
  };

  const openComments = async (post: any) => {
    setSelectedPost(post);
    setIsCommentModalOpen(true);
    setReplyToComment(null);
    loadComments(post.id);
  };

  const loadComments = async (postId: number) => {
    try {
      setCommentsLoading(true);
      const url = `${API_BASE_URL}/api/community/posts/${postId}/comments?userId=${currentUser?.id || 0}`;
      const response = await fetch(url);
      const data = await response.json();
      setComments(data.items || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          content: newComment,
          parentId: replyToComment?.id || null
        }),
      });
      if (response.ok) {
        setNewComment('');
        setReplyToComment(null);
        loadComments(selectedPost.id);
        loadCommunityPosts();
      }
    } catch (error) {}
  };

  const handleLikeComment = async (comment: any) => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/comments/${comment.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (response.ok) {
        loadComments(selectedPost.id);
      }
    } catch (error) {}
  };

  const confirmDeleteComment = (comment: any) => {
    setCustomConfirm({
      visible: true,
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa bình luận này không?",
      type: 'delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/community/comments/${comment.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id }),
          });
          if (response.ok) {
            loadComments(selectedPost.id);
          }
        } catch (error) {}
      }
    });
  };

  const confirmDeletePost = (post: any) => {
    setCustomConfirm({
      visible: true,
      title: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.",
      type: 'delete',
      onConfirm: () => performDelete(post.id)
    });
    setActiveMenuPostId(null);
  };

  const performDelete = async (postId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        loadCommunityPosts();
        setActiveMenuPostId(null);
      } else {
        const msg = data.message || "Không thể xóa bài viết.";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert("Lỗi", msg);
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert("Lỗi kết nối máy chủ.");
      else Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    }
  };

  const startEditPost = (post: any) => {
    setEditingPost(post);
    setEditingContent(post.content);
    setIsEditPostModalOpen(true);
    setActiveMenuPostId(null);
  };

  const handleUpdatePost = async () => {
    if (!editingContent.trim() || !editingPost) return;
    
    setCustomConfirm({
      visible: true,
      title: "Cập nhật chia sẻ",
      message: "Bạn muốn lưu lại nội dung mới cho bài viết này chứ?",
      type: 'update',
      onConfirm: () => performUpdate()
    });
  };

  const performUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content: editingContent })
      });
      const data = await res.json();
      if (res.ok) {
        loadCommunityPosts();
        setIsEditPostModalOpen(false);
        setEditingPost(null);
      } else {
        const msg = data.message || "Không thể cập nhật bài viết.";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert("Lỗi", msg);
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert("Lỗi kết nối máy chủ.");
      else Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    }
  };
  // -------------------------
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [tooltipInfo, setTooltipInfo] = useState<{ index: number, x: number, y: number } | null>(null);
  const [chartLayout, setChartLayout] = useState({ width: 0, height: 0 });
  const [isChartBusy, setIsChartBusy] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 90;

  const fetchOnboarding = useCallback(() => {
    if (userEmail) {
      fetch(`${apiBaseUrl}/api/onboarding?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) setOnboardingData(data.onboarding);
        })
        .catch(() => {});
    }
  }, [userEmail, apiBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      fetchOnboarding();
      loadTransactions();
    }, [fetchOnboarding])
  );

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const { chartData, spendPercent, spendPercentRaw, fullLabels, dailyData, totalIncome, totalExpense, monthlyBudget } = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth - 1, i + 1));
    const labels: string[] = [];
    const fullLabels: string[] = [];
    const spendingData: number[] = [];
    const incomeData: number[] = [];
    const dailyData: { expense: number, income: number }[] = [];
    let cumulativeIncome = 0;
    let totalExpense = 0;

    const byDate = new Map<string, any[]>();
    txItems.forEach((tx) => {
      if (!tx?.occurred_at) return;
      const d = new Date(tx.occurred_at);
      if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear) return;
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const key = `${yStr}-${mStr}-${dStr}`;
      const list = byDate.get(key) ?? [];
      list.push(tx);
      byDate.set(key, list);
    });

    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const key = `${yStr}-${mStr}-${dStr}`;
      const dayTxs = byDate.get(key) ?? [];

      let dayExpense = 0;
      let dayIncome = 0;
      dayTxs.forEach((t) => {
        if (t.type === 'expense') dayExpense += Number(t.amount || 0);
        if (t.type === 'income') dayIncome += Number(t.amount || 0);
      });

      cumulativeIncome += dayIncome;
      totalExpense += dayExpense;

      spendingData.push(dayExpense);
      incomeData.push(cumulativeIncome);
      dailyData.push({ expense: dayExpense, income: dayIncome });

      const dayNum = d.getDate();
      labels.push(dayNum === 1 || dayNum % 5 === 0 ? dayNum.toString() : '');
      fullLabels.push(`${dayNum}/${d.getMonth() + 1}`);
    }

    // Calculate dynamic budget: Salary (income category 'lương') in first 10 days
    const salaryTx = txItems.find(tx => {
      if (tx.type !== 'income') return false;
      const d = new Date(tx.occurred_at);
      if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear) return false;
      // Check if it's 'lương' and date <= 10
      const isSalary = String(tx.category || '').toLowerCase() === 'lương';
      return isSalary && d.getDate() <= 10;
    });

    // Use actual salary transaction if found, otherwise fallback to expected monthly income from onboarding
    const incomeAmount = salaryTx ? Number(salaryTx.amount || 0) : Number(onboardingData?.incomeMonthly || 0);
    const needsPct = onboardingData?.needsPct ?? 50;
    const wantsPct = onboardingData?.wantsPct ?? 30;
    const BUDGET = (incomeAmount * (needsPct + wantsPct)) / 100;

    const pct = BUDGET > 0 ? (totalExpense / BUDGET) * 100 : 0;

    return {
      chartData: {
        labels,
        datasets: [
          { data: incomeData, color: () => 'rgba(34, 197, 94, 0.6)', strokeWidth: 1.5 },
          { data: spendingData, color: () => 'rgba(249, 115, 22, 0.6)', strokeWidth: 1.5 },
          { data: Array(days.length).fill(BUDGET), color: () => 'rgba(14, 165, 233, 0.5)', strokeWidth: 1, withDots: false, dash: [4, 6] },
        ]
      },
      fullLabels,
      dailyData,
      spendPercent: pct.toFixed(0),
      spendPercentRaw: pct,
      totalIncome: cumulativeIncome,
      totalExpense: totalExpense,
      monthlyBudget: BUDGET // Exporting for UI
    };
  }, [txItems, selectedMonth, selectedYear, onboardingData]);

  const chartPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsChartBusy(true);
        const { locationX, locationY } = evt.nativeEvent;
        if (!chartLayout.width) return;
        const clampedX = Math.max(0, Math.min(locationX, chartLayout.width));
        const nextIndex = Math.max(
          0,
          Math.min(
            fullLabels.length - 1,
            Math.round((clampedX / chartLayout.width) * (fullLabels.length - 1))
          )
        );
        setTooltipInfo({ index: nextIndex, x: clampedX, y: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!chartLayout.width) return;
        const clampedX = Math.max(0, Math.min(locationX, chartLayout.width));
        const nextIndex = Math.max(
          0,
          Math.min(
            fullLabels.length - 1,
            Math.round((clampedX / chartLayout.width) * (fullLabels.length - 1))
          )
        );
        setTooltipInfo({ index: nextIndex, x: clampedX, y: locationY });
      },
      onPanResponderRelease: () => {
        setIsChartBusy(false);
        setTooltipInfo(null);
      },
      onPanResponderTerminate: () => {
        setIsChartBusy(false);
        setTooltipInfo(null);
      },
    }),
    [chartLayout.width, fullLabels.length]
  );

  // Trigger loads
  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityPosts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (communityTab === 'feed') {
      loadCommunityPosts();
    } else {
      loadRanking();
    }
  }, [communityTab]);

  useEffect(() => {
    loadUserInfo();
  }, [params.email]);

  const monthFilteredTransactions = useMemo(() => {
    return txItems.filter(tx => {
      if (!tx?.occurred_at) return false;
      const d = new Date(tx.occurred_at);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [txItems, selectedMonth, selectedYear]);

  const itemAnim1 = useRef(new Animated.Value(0)).current;
  const itemAnim2 = useRef(new Animated.Value(0)).current;
  const itemAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isQuickAddOpen) {
      itemAnim1.setValue(0);
      itemAnim2.setValue(0);
      itemAnim3.setValue(0);
      return;
    }

    Animated.stagger(80, [
      Animated.timing(itemAnim1, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(itemAnim2, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(itemAnim3, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isQuickAddOpen, itemAnim1, itemAnim2, itemAnim3]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền để chọn ảnh hóa đơn.');
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
    } catch (error) {
      // Fallback for Expo Go / native mismatch
      result = await ImagePicker.launchImageLibraryAsync();
    }

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setScanImageUri(asset.uri);
    setScanImageName(asset.fileName ?? 'Ảnh đã chọn');

    let base64: string | null = asset.base64 ?? null;
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 900 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      base64 = manipulated.base64 ?? base64;
      setScanImageMimeType('image/jpeg');
    } catch (error) {
      setScanImageMimeType(asset.mimeType ?? guessImageMime(asset.uri));
    }

    if (!base64 && asset.uri) {
      try {
        base64 = await readImageAsBase64(asset.uri);
      } catch (error) {
        base64 = null;
      }
    }
    setScanImageBase64(base64);
    if (base64) {
      await decodeQrPreview(base64);
    } else {
      setScanQrError('Không đọc được ảnh để quét QR.');
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Không hỗ trợ trên web', 'Vui lòng dùng thiết bị di động để chụp ảnh.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền để mở camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setScanImageName(asset.fileName ?? 'Ảnh đã chụp');

    let base64: string | null = asset.base64 ?? null;
    let finalUri = asset.uri;
    let finalMime = asset.mimeType ?? guessImageMime(asset.uri);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      base64 = manipulated.base64 ?? base64;
      finalUri = manipulated.uri;
      finalMime = 'image/jpeg';
    } catch (error) {
      // keep original uri/mime
    }

    if (!base64 && finalUri) {
      try {
        base64 = await readImageAsBase64(finalUri);
      } catch (error) {
        base64 = null;
      }
    }
    setScanImageUri(finalUri);
    setScanImageMimeType(finalMime);
    setScanImageBase64(base64);
    if (base64) {
      await decodeQrPreview(base64);
    } else {
      setScanQrError('Không đọc được ảnh để quét QR.');
    }
  };

  const decodeQrPreview = async (base64: string) => {
    try {
      setScanQrLoading(true);
      setScanQrError('');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${apiBaseUrl}/api/qr/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json();
      if (!response.ok) {
        setScanQrError(data?.message ?? 'Không thể quét QR.');
        setScanQrText('');
        setScanQrInfo(null);
        return;
      }
      const nextText = typeof data?.qrText === 'string' ? data.qrText : '';
      if (!nextText.trim()) {
        setScanQrError('Không tìm thấy QR trong ảnh.');
      }
      setScanQrText(nextText);
      setScanQrInfo(data?.parsed ?? null);
    } catch (error) {
      setScanQrError('Không thể quét QR (timeout hoặc lỗi mạng).');
      setScanQrText('');
      setScanQrInfo(null);
    } finally {
      setScanQrLoading(false);
    }
  };

  const mapCategoryForApi = (key: string, type: 'expense' | 'income') => {
    if (type === 'income') {
      if (key === 'salary') return 'lương';
      if (key === 'bonus') return 'thưởng';
      if (key === 'invest') return 'đầu tư';
      return 'khác';
    }

    switch (key) {
      case 'food':
        return 'ăn uống';
      case 'move':
        return 'di chuyển';
      case 'shop':
        return 'mua sắm';
      case 'fun':
        return 'giải trí';
      case 'bill':
        return 'hóa đơn';
      case 'health':
        return 'sức khỏe';
      case 'edu':
        return 'giáo dục';
      default:
        return 'khác';
    }
  };


  const readImageAsBase64 = async (uri: string) => {
    try {
      return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    } catch (error) {
      const safeName = `image-${Date.now()}.jpg`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        throw error;
      }
      const target = `${baseDir}${safeName}`;
      await FileSystem.copyAsync({ from: uri, to: target });
      return await FileSystem.readAsStringAsync(target, { encoding: 'base64' });
    }
  };

  const guessImageMime = (uri?: string) => {
    if (!uri) return 'image/jpeg';
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
  };

  const formatAmount = (value: number) => {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    try {
      return `${new Intl.NumberFormat('vi-VN').format(safeValue)} đ`;
    } catch (error) {
      return `${safeValue} đ`;
    }
  };
  const formatYAxisLabel = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    if (Math.abs(num) >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return `${num}`;
  };
  const formatCompareAxis = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const inMillions = value / 1_000_000;
    const fixed = inMillions.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  };

  const formatAmountInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return '';
    try {
      return new Intl.NumberFormat('vi-VN').format(Number(digits));
    } catch (error) {
      return digits;
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  };

  const normalizeCategoryKey = (value?: string) => {
    const raw = String(value || 'khac').trim();
    let fixed = raw;
    try {
      fixed = decodeURIComponent(escape(raw));
    } catch (error) {
      fixed = raw;
    }
    return fixed
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const loadTransactions = async () => {
    if (!userEmail) {
      setTxError('Thiếu email người dùng.');
      return;
    }
    try {
      setTxLoading(true);
      setTxError('');
      const response = await fetch(
        `${apiBaseUrl}/api/transactions?email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();
      if (!response.ok) {
        setTxError(data?.message ?? 'Không thể tải giao dịch.');
        setTxItems([]);
        return;
      }
      setTxItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setTxError('Không kết nối được máy chủ.');
      setTxItems([]);
    } finally {
      setTxLoading(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!userEmail) {
      Alert.alert('Thiếu email', 'Vui lòng đăng nhập lại để xóa giao dịch.');
      return;
    }
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/transactions/${id}?email=${encodeURIComponent(userEmail)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Lỗi', data?.message ?? 'Không thể xóa giao dịch.');
        return;
      }
      loadTransactions();
    } catch (error) {
      Alert.alert('Lỗi', 'Không kết nối được máy chủ.');
    }
  };

  const confirmDelete = (item: any) => {
    if (!item?.id) return;
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const saveTransaction = async (payload: Record<string, any>) => {
    if (!userEmail) {
      Alert.alert('Thiếu email', 'Vui lòng đăng nhập lại để lưu giao dịch.');
      return null;
    }
    if (isSavingTx) return false;

    try {
      setIsSavingTx(true);
      const response = await fetch(`${apiBaseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Lỗi', data?.message ?? 'Không thể lưu giao dịch.');
        return null;
      }
      return data;
    } catch (error) {
      Alert.alert('Lỗi', 'Không kết nối được máy chủ.');
      return null;
    } finally {
      setIsSavingTx(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let base = monthFilteredTransactions;
    if (txFilter !== 'all') {
      base = base.filter((item) => item?.type === txFilter);
    }
    return base;
  }, [txFilter, monthFilteredTransactions]);

  const expenseCategoryStats = useMemo(() => {
    const metaByKey: Record<
      string,
      { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }
    > = {
      'an uong': { label: 'Ăn uống', icon: 'food', color: '#F59E0B' },
      'di chuyen': { label: 'Di chuyển', icon: 'car', color: '#3B82F6' },
      'mua sam': { label: 'Mua sắm', icon: 'shopping', color: '#EC4899' },
      'giai tri': { label: 'Giải trí', icon: 'gamepad-variant', color: '#8B5CF6' },
      'hoa don': { label: 'Hóa đơn', icon: 'receipt', color: '#10B981' },
      'suc khoe': { label: 'Sức khỏe', icon: 'heart-pulse', color: '#EF4444' },
      'giao duc': { label: 'Giáo dục', icon: 'school', color: '#0EA5E9' },
      khac: { label: 'Khác', icon: 'dots-horizontal', color: '#64748B' },
    };
    const aliasMap: Record<string, string> = {
      'an uong': 'an uong',
      food: 'an uong',
      eat: 'an uong',
      'di chuyen': 'di chuyen',
      move: 'di chuyen',
      transport: 'di chuyen',
      taxi: 'di chuyen',
      'mua sam': 'mua sam',
      shop: 'mua sam',
      shopping: 'mua sam',
      'giai tri': 'giai tri',
      fun: 'giai tri',
      entertainment: 'giai tri',
      'hoa don': 'hoa don',
      hoadon: 'hoa don',
      'hoa_don': 'hoa don',
      bill: 'hoa don',
      invoice: 'hoa don',
      utilities: 'hoa don',
      'suc khoe': 'suc khoe',
      health: 'suc khoe',
      'giao duc': 'giao duc',
      edu: 'giao duc',
      education: 'giao duc',
      khac: 'khac',
      other: 'khac',
    };
    const resolveKeyFromTx = (tx: any) => {
      const rawKey = tx?.category || tx?.ai_category || 'khac';
      const normalized = normalizeCategoryKey(rawKey);
      const compactKey = normalized.replace(/\s+/g, '');
      const rawLower = String(rawKey || '').toLowerCase();
      const looksHoaDon =
        normalized.includes('hoa don') ||
        normalized.includes('hoadon') ||
        normalized.includes('hoa_don') ||
        compactKey === 'hoadon' ||
        (normalized.includes('hoa') && normalized.includes('don')) ;
      if (looksHoaDon && (rawLower.includes('don') || normalized.includes('don'))) {
        return 'hoa don';
      }

      const mapped = aliasMap[normalized] || aliasMap[compactKey] || normalized;
      if (metaByKey[mapped]) return mapped;

      const desc = normalizeCategoryKey(tx?.description || '');
      if (
        desc.includes('dien') ||
        desc.includes('nuoc') ||
        desc.includes('internet') ||
        desc.includes('wifi') ||
        desc.includes('dien thoai') ||
        desc.includes('cuoc') ||
        desc.includes('gas') ||
        desc.includes('truyen hinh') ||
        desc.includes('ve sinh') ||
        desc.includes('rac')
      ) {
        return 'hoa don';
      }

      return 'khac';
    };
    const expenses = monthFilteredTransactions.filter((t) => t?.type === 'expense');
    const total = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const byCategory = new Map<string, number>();

    expenses.forEach((t) => {
      const key = resolveKeyFromTx(t);
      byCategory.set(key, (byCategory.get(key) || 0) + Number(t.amount || 0));
    });

    const rows = Array.from(byCategory.entries())
      .map(([key, amount]) => {
        const meta = metaByKey[key] || metaByKey.khac;
        const percent = total > 0 ? (amount / total) * 100 : 0;
        return { key, amount, percent, meta };
      })
      .sort((a, b) => b.amount - a.amount);

    return { total, rows, resolveKeyFromTx };
  }, [monthFilteredTransactions]);

  const monthlyCompare = useMemo(() => {
    const base = new Date(selectedYear, selectedMonth - 1, 1);
    const monthsBack = 6;
    const buckets = Array.from({ length: monthsBack }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (monthsBack - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`,
        income: 0,
        expense: 0,
      };
    });
    const map = new Map(buckets.map((b) => [b.key, b]));
    txItems.forEach((t) => {
      if (!t?.occurred_at) return;
      const d = new Date(t.occurred_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const bucket = map.get(key);
      if (!bucket) return;
      if (t.type === 'income') bucket.income += Number(t.amount || 0);
      if (t.type === 'expense') bucket.expense += Number(t.amount || 0);
    });
    const maxValue = Math.max(
      1,
      ...buckets.map((b) => Math.max(b.income, b.expense))
    );
    return { buckets, maxValue };
  }, [txItems, selectedMonth, selectedYear]);

  const compareTicks = useMemo(() => [1, 0.8, 0.6, 0.4, 0.2], []);
  const compareAxisTicks = useMemo(
    () => [1, 0.8, 0.6, 0.4, 0.2, 0, 0.2, 0.4, 0.6, 0.8, 1],
    []
  );

  const selectedCategoryMeta = useMemo(() => {
    if (!selectedCategoryKey) return null;
    return expenseCategoryStats.rows.find((row) => row.key === selectedCategoryKey) || null;
  }, [expenseCategoryStats.rows, selectedCategoryKey]);

  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryKey) return [];
    return monthFilteredTransactions
      .filter((t) => t?.type === 'expense')
      .filter((t) =>
        expenseCategoryStats.resolveKeyFromTx
          ? expenseCategoryStats.resolveKeyFromTx(t) === selectedCategoryKey
          : normalizeCategoryKey(t.category || t.ai_category || 'khác') === selectedCategoryKey
      )
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [expenseCategoryStats, monthFilteredTransactions, selectedCategoryKey]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, userEmail, apiBaseUrl]);


  const handleSaveManual = async () => {
    const mappedCategory = categorySelected ? mapCategoryForApi(category, entryType) : '';
    const ok = await saveTransaction({
      type: entryType,
      amount: Number.isFinite(Number(amount)) ? Number(amount) : 0,
      description: note,
      category: mappedCategory,
      source: 'manual',
    });
    if (!ok) return;
    setIsManualOpen(false);
    setAmount('');
    setNote('');
    setCategory('');
    setCategorySelected(false);
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  };

  const handleSaveScan = async (source: 'scan' | 'upload') => {
    if (!scanImageBase64 || !scanImageMimeType) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chọn hoặc chụp ảnh hóa đơn.');
      return;
    }
    const amountFromQr = scanQrInfo?.amount ? Number(scanQrInfo.amount) : 0;
    const result = await saveTransaction({
      type: 'expense',
      amount: Number.isFinite(amountFromQr) ? amountFromQr : 0,
      description: scanNote,
      category: '',
      source,
      rawText: scanNote,
      imageBase64: scanImageBase64,
      imageMimeType: scanImageMimeType,
      attachmentUrl: scanImageUri ?? '',
    });
    if (!result) return;
    if (typeof result?.qrText === 'string' && result.qrText.trim()) {
      setScanQrText(result.qrText);
      setScanQrInfo(result?.parsed ?? scanQrInfo ?? null);
    } else {
      setScanQrText('');
      setScanQrInfo(null);
    }
    setScanImageUri(null);
    setScanImageName('');
    setScanImageBase64(null);
    setScanImageMimeType(null);
    setScanNote('');
    setScanQrInfo(null);
    if (source === 'scan') setIsScanOpen(false);
    if (source === 'upload') setIsUploadOpen(false);
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top },
        ]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="robot-excited" size={22} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.appName}>Monee</Text>
            <Text style={styles.appSubtitle}>Trợ lý tài chính Gen Z</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.headerScore}>
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={styles.headerScoreText}>
              {currentUser?.points || 1250} điểm
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              const email = params.email ? String(params.email) : '';
              router.push(email ? `/onboarding-summary?email=${encodeURIComponent(email)}` : '/onboarding-summary');
            }}
            activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={activeTab === 'community' ? { display: 'none' } : {}}
        scrollEnabled={!isChartBusy} 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'home' && (
          <>
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <View>
                  <Text style={styles.scoreLabel}>FinScore của bạn</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreValue}>78</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                  </View>
                  <Text style={styles.scoreStatus}>Tốt</Text>
                </View>
                <View style={styles.scoreIcon}>
                  <Ionicons name="pulse" size={26} color="#F8FAFC" />
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '78%' }]} />
              </View>

              <View style={styles.tipRow}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#FBBF24" />
                <Text style={styles.tipText}>Tiếp tục tiết kiệm để tăng điểm!</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Xu hướng tài chính</Text>
                  <TouchableOpacity onPress={() => setIsMonthPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={styles.chartSubtitle}>Tháng {selectedMonth}/{selectedYear}</Text>
                    <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <View style={styles.chartHeaderActions}>
                  <TouchableOpacity
                    onPress={() => setIsCompareOpen(true)}
                    style={styles.chartMore}
                  >
                    <Ionicons name="bar-chart" size={18} color="#0EA5E9" />
                    <Text style={styles.chartMoreText}>Xem thêm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                     onPress={() => {
                       const now = new Date();
                       setSelectedMonth(now.getMonth() + 1);
                       setSelectedYear(now.getFullYear());
                       loadTransactions();
                     }}
                     style={styles.chartRefresh}
                  >
                    <Ionicons name="refresh" size={20} color="#0EA5E9" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.chartSummary}>
                <View style={styles.chartSummaryHeader}>
                  <Text style={styles.chartSummaryLabel}>Chi tiêu / Ngân sách</Text>
                  <Text style={styles.chartSummaryValue}>{spendPercent}%</Text>
                </View>
                <View style={styles.chartProgressTrack}>
                  <View
                    style={[
                      styles.chartProgressFill,
                      {
                        width: `${Math.min(100, spendPercentRaw)}%`,
                        backgroundColor:
                          spendPercentRaw > 90
                            ? '#EF4444'
                            : spendPercentRaw > 70
                              ? '#F97316'
                              : spendPercentRaw > 50
                                ? '#3B82F6'
                                : '#22C55E',
                      },
                    ]}
                  />
                </View>
                <View style={styles.chartSummaryFoot}>
                  <Text style={styles.chartSummaryFootText}>Ngân sách: {formatAmount(monthlyBudget)}</Text>
                  <Text style={styles.chartSummaryFootText}>
                    Đã chi:{' '}
                    {formatAmount(
                      monthFilteredTransactions
                        .filter((t: any) => t.type === 'expense')
                        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.chartArea}>
                <View
                  style={styles.chartInner}
                  onLayout={(evt) => {
                    const { width, height } = evt.nativeEvent.layout;
                    setChartLayout({ width, height });
                  }}
                  {...chartPanResponder.panHandlers}
                >
                  <View pointerEvents="none">
                  <LineChart
                    data={chartData}
                    width={chartWidth}
                    height={200}
                      withVerticalLines={true}
                      withHorizontalLines={true}
                      withShadow={false}
                      withDots={true}
                      formatYLabel={formatYAxisLabel}
                      chartConfig={{
                        backgroundColor: '#FFFFFF',
                        backgroundGradientFrom: '#FFFFFF',
                        backgroundGradientTo: '#FFFFFF',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(148, 163, 184, ${opacity * 0.8})`,
                        labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                        propsForDots: { r: '1', strokeWidth: '0.5', stroke: '#FFFFFF' },
                        propsForBackgroundLines: {
                          strokeDasharray: '3 6',
                          stroke: '#DCE3ED',
                          strokeWidth: 1,
                        },
                      }}
                      bezier
                      style={styles.chartCanvas}
                    />
                  </View>
                </View>
                {tooltipInfo && (
                  <View
                    style={{
                      position: 'absolute',
                      left: Math.max(
                        6,
                        Math.min(
                          tooltipInfo.x > (chartLayout.width || chartWidth) / 2
                            ? tooltipInfo.x - 150  // Show to the left of the finger if on the right side
                            : tooltipInfo.x + 10,  // Show to the right of the finger if on the left side
                          (chartLayout.width || chartWidth) - 146
                        )
                      ),
                      top: tooltipInfo.y > 60 ? tooltipInfo.y - 60 : tooltipInfo.y + 15,
                      backgroundColor: '#0F172A',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      width: 140,
                      zIndex: 100,
                    }}>
                    <Text style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold', marginBottom: 6 }}>
                      {fullLabels[tooltipInfo.index]}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#FDBA74', marginBottom: 4 }}>
                      • Tổng chi: {formatAmount(chartData.datasets[1]?.data[tooltipInfo.index] || 0)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#86EFAC', marginBottom: 4 }}>
                      • Tổng thu: {formatAmount(chartData.datasets[0]?.data[tooltipInfo.index] || 0)}
                    </Text>
                    {dailyData[tooltipInfo.index]?.expense > 0 && (
                      <Text style={{ fontSize: 10, color: '#FDE68A' }}>
                        + Phát sinh chi: {formatAmount(dailyData[tooltipInfo.index].expense)}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                  <Text style={styles.legendText}>Chi tiêu</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.legendText}>Thu nhập</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
                  <Text style={styles.legendText}>Ngân sách</Text>
                </View>
              </View>
            </View>
            <View style={[styles.summaryRow, { paddingHorizontal: 0 }]}>
              <TouchableOpacity 
                style={styles.summaryCardIncome}
                onPress={() => {
                  setTxFilter('income');
                  setActiveTab('transactions');
                }}
              >
                <View style={styles.summaryIconBoxIncome}>
                  <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.summaryLabel}>Thu nhập</Text>
                <Text style={styles.summaryValueIncome}>{formatAmount(totalIncome)}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.summaryCardExpense}
                onPress={() => {
                  setTxFilter('expense');
                  setActiveTab('transactions');
                }}
              >
                <View style={styles.summaryIconBoxExpense}>
                  <Ionicons name="trending-down" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.summaryLabel}>Chi tiêu</Text>
                <Text style={styles.summaryValueExpense}>{formatAmount(totalExpense)}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.txSection}>
            <View style={styles.txHeaderRow}>
              <View>
                <Text style={styles.txTitle}>Chi tiêu & Thu nhập</Text>
              </View>
              <View style={styles.txHeaderActions}>
                <TouchableOpacity
                  onPress={() => setIsMonthPickerOpen(true)}
                  style={styles.txMonthButton}
                >
                  <Text style={styles.txMonthButtonText}>
                    Tháng {selectedMonth}/{selectedYear}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.txRefresh} onPress={loadTransactions}>
                  <Ionicons name="refresh" size={18} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.categoryBreakdownCard}>
              <View style={styles.categoryHeaderRow}>
                <View style={styles.categoryHeaderTitleRow}>
                  <MaterialCommunityIcons name="chart-pie" size={16} color="#0EA5E9" />
                  <Text style={styles.categoryHeaderTitle}>Phân tích theo danh mục</Text>
                </View>
                <Text style={styles.categoryHeaderTotal}>
                  Tổng chi: {formatAmount(expenseCategoryStats.total)}
                </Text>
              </View>

              {expenseCategoryStats.rows.length === 0 ? (
                <Text style={styles.categoryEmptyText}>Chưa có chi tiêu trong tháng này.</Text>
              ) : (
                expenseCategoryStats.rows.map((row) => (
                  <Pressable
                    key={row.key}
                    style={styles.categoryRow}
                    onPress={() => {
                      setSelectedCategoryKey(row.key);
                      setIsCategoryPopupOpen(true);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryRowIcon,
                        { backgroundColor: `${row.meta.color}22` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={row.meta.icon}
                        size={16}
                        color={row.meta.color}
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryTopRow}>
                        <Text style={styles.categoryName}>{row.meta.label}</Text>
                        <Text style={styles.categoryAmount}>{formatAmount(row.amount)}</Text>
                      </View>
                      <View style={styles.categoryBarTrack}>
                        <View
                          style={[
                            styles.categoryBarFill,
                            { width: `${row.percent}%`, backgroundColor: row.meta.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.categoryPercent}>
                        {row.percent.toFixed(1)}% tổng chi tiêu
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.txHistoryRow}>
              <View style={styles.txHistoryHeader}>
                <Text style={styles.txHistoryTitle}>Lịch sử giao dịch</Text>
              </View>
              <View style={styles.txFilterRow}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'expense', label: 'Chi tiêu' },
                  { key: 'income', label: 'Thu nhập' },
                ].map((item) => {
                  const active = txFilter === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.txFilter, active && styles.txFilterActive]}
                      onPress={() => setTxFilter(item.key as 'all' | 'expense' | 'income')}>
                      <Text style={[styles.txFilterText, active && styles.txFilterTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.txCard, { maxHeight: 520, paddingBottom: 0 }]}>
              <ScrollView 
                nestedScrollEnabled={true} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {txLoading && <Text style={styles.txStatus}>Đang tải giao dịch...</Text>}
                {!!txError && !txLoading && <Text style={styles.txError}>{txError}</Text>}
                {!txLoading && !txError && filteredTransactions.length === 0 && (
                  <Text style={styles.txStatus}>Chưa có giao dịch nào.</Text>
                )}
                {!txLoading &&
                  !txError &&
                  filteredTransactions.map((item, index) => {
                    const categoryLabel =
                      item.category ||
                      item.ai_category ||
                      (item.type === 'income' ? 'Thu nhập' : 'Khác');
                    const noteText =
                      (item.description && String(item.description).trim()) || '';
                    const isIncome = item.type === 'income';
                    return (
                      <Pressable
                        key={item.id ?? `${item.type}-${index}`}
                        onLongPress={() => confirmDelete(item)}
                        style={[styles.txItem, index === filteredTransactions.length - 1 && styles.txItemLast]}>
                        <View style={[styles.txBadge, isIncome ? styles.txBadgeIncome : styles.txBadgeExpense]}>
                          <Ionicons
                            name={isIncome ? 'arrow-up' : 'arrow-down'}
                            size={14}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txLabel} numberOfLines={1}>
                            {categoryLabel}
                          </Text>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {noteText
                              ? `${noteText} • ${formatDateTime(item.occurred_at)}`
                              : `${isIncome ? 'Thu nhập' : 'Chi tiêu'} • ${formatDateTime(
                                item.occurred_at
                              )}`}
                          </Text>
                        </View>
                        <Text style={[styles.txAmount, isIncome ? styles.txAmountIncome : styles.txAmountExpense]}>
                          {isIncome ? '+' : '-'}
                          {formatAmount(Number(item.amount))}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        )}

                {activeTab === 'treasure' && (
          <View style={styles.txSection}>
            <View style={styles.placeholderCard}>
              <Ionicons name="trophy" size={28} color="#0EA5E9" />
              <Text style={styles.placeholderTitle}>Kho báu</Text>
              <Text style={styles.placeholderText}>Tính năng này sẽ cập nhật sau.</Text>
            </View>
          </View>
        )}
      </ScrollView>
      {activeTab === 'community' && (
          <View style={[styles.communityContainer, { flex: 1 }]}>
            <View style={styles.communitySubTabs}>
              <TouchableOpacity 
                style={[styles.communitySubTab, communityTab === 'feed' && styles.communitySubTabActive]}
                onPress={() => setCommunityTab('feed')}
              >
                <Text style={[styles.communitySubTabText, communityTab === 'feed' && styles.communitySubTabTextActive]}>Bảng tin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.communitySubTab, communityTab === 'ranking' && styles.communitySubTabActive]}
                onPress={() => setCommunityTab('ranking')}
              >
                <Text style={[styles.communitySubTabText, communityTab === 'ranking' && styles.communitySubTabTextActive]}>Xếp hạng</Text>
              </TouchableOpacity>
            </View>

            {communityTab === 'feed' ? (
              <>
                <View style={styles.createPostCard}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarText}>{currentUser?.fullName?.substring(0, 2).toUpperCase() || 'BN'}</Text>
                  </View>
                  <TextInput
                    style={styles.postInput}
                    placeholder="Chia sẻ kinh nghiệm tài chính của bạn..."
                    placeholderTextColor="#94A3B8"
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                    onSubmitEditing={handleCreatePost}
                  />
                  {newPostContent.trim().length > 0 && (
                    <TouchableOpacity onPress={handleCreatePost}>
                      <Ionicons name="send" size={20} color="#08B0C9" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                  {postsLoading && <Text style={styles.txStatus}>Đang tải bảng tin...</Text>}
                
                {communityPosts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <View style={[styles.avatarSmall, { backgroundColor: '#A855F7' }]}>
                        <Text style={styles.avatarText}>{post.author_name?.substring(0, 2).toUpperCase() || 'MA'}</Text>
                      </View>
                      <View style={styles.postAuthorInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.authorName}>{post.author_name}</Text>
                          {post.likes_count > 20 && <MaterialCommunityIcons name="trophy-variant" size={14} color="#F59E0B" style={{marginLeft: 4}} />}
                        </View>
                        <Text style={styles.postTime}>{formatCommunityTime(post.created_at)}</Text>
                      </View>
                      
                      {currentUser?.id === post.user_id && (
                        <TouchableOpacity 
                          onPress={() => {
                            console.log('Menu button clicked for post:', post.id);
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                          }}
                          style={styles.postMoreBtn}
                          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                          <MaterialCommunityIcons name="dots-vertical" size={20} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Post Menu - Placed here to ensure it's clickable and not clipped by header */}
                    {activeMenuPostId === post.id && currentUser?.id === post.user_id && (
                      <View style={styles.postMenu}>
                        <TouchableOpacity 
                          style={styles.postMenuItem} 
                          onPress={() => {
                            console.log('Edit clicked for post:', post.id);
                            startEditPost(post);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                        >
                          <Ionicons name="create-outline" size={16} color="#0EA5E9" />
                          <Text style={styles.postMenuText}>Sửa bài</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity 
                          style={styles.postMenuItem} 
                          onPress={() => {
                            console.log('Delete clicked for post:', post.id);
                            confirmDeletePost(post);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <Text style={[styles.postMenuText, {color: '#EF4444'}]}>Xóa bài</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <Text style={styles.postContent}>{post.content}</Text>
                    
                    <View style={styles.postDivider} />
                    
                    <View style={styles.postActions}>
                      <TouchableOpacity style={styles.postActionBtn} onPress={() => handleLike(post.id)}>
                        <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={18} color={post.is_liked ? "#EF4444" : "#64748B"} />
                        <Text style={styles.postActionText}>{post.likes_count || 0}</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.postActionBtn} onPress={() => openComments(post)}>
                        <Ionicons name="chatbubble-outline" size={18} color="#64748B" />
                        <Text style={styles.postActionText}>{post.comments_count || 0}</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.postActionBtn}>
                        <Ionicons name="share-social-outline" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                </ScrollView>
              </>
            ) : (
              <ScrollView style={styles.rankingContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.rankingHeaderCard}>
                  <View style={styles.rankingHeaderTitleRow}>
                    <Ionicons name="trophy-outline" size={24} color="#0810C9" />
                    <Text style={styles.rankingHeaderTitle}>Bảng xếp hạng tháng {new Date().getMonth() + 1}</Text>
                  </View>
                  <Text style={styles.rankingHeaderDesc}>
                    Hoàn thành mục tiêu, duy trì streak và tích lũy điểm để leo hạng!
                  </Text>
                </View>

                {rankingLoading ? (
                  <ActivityIndicator size="large" color="#08B0C9" style={{ marginTop: 40 }} />
                ) : (
                  rankingData.map((item, index) => (
                    <View 
                      key={item.id} 
                      style={[
                        styles.rankingItemCard,
                        currentUser?.id === item.id && styles.rankingItemCardSelf
                      ]}
                    >
                      <View style={styles.rankingRankBox}>
                        {index < 3 ? (
                          <MaterialCommunityIcons 
                            name="medal" 
                            size={32} 
                            color={index === 0 ? "#FBBF24" : index === 1 ? "#94A3B8" : "#B45309"} 
                          />
                        ) : (
                          <Text style={styles.rankingRankText}>#{index + 1}</Text>
                        )}
                      </View>

                      <View style={[styles.avatarSmall, { backgroundColor: index === 0 ? '#FBBF24' : '#E2E8F0', width: 44, height: 44 }]}>
                        <Text style={[styles.avatarText, { fontSize: 16 }]}>
                          {item.full_name?.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.rankingInfo}>
                        <Text style={[
                          styles.rankingName,
                          currentUser?.id === item.id && { color: '#22C55E' }
                        ]}>
                          {currentUser?.id === item.id ? 'Bạn' : item.full_name}
                        </Text>
                        <View style={styles.rankingStatsLine}>
                          <View style={styles.rankingStat}>
                            <MaterialCommunityIcons name="star-face" size={14} color="#64748B" />
                            <Text style={styles.rankingStatValue}>{item.points} điểm</Text>
                          </View>
                          <View style={styles.rankingStat}>
                            <MaterialCommunityIcons name="fire" size={14} color="#EF4444" />
                            <Text style={styles.rankingStatValue}>{item.streak_count} ngày</Text>
                          </View>
                        </View>
                      </View>

                      {index < 3 && (
                        <View style={[styles.topTag, { backgroundColor: index === 0 ? '#06B6D4' : '#0EA5E9' }]}>
                          <Text style={styles.topTagText}>Top {index + 1}</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
                <View style={{ height: 100 }} />
              </ScrollView>
            )}
          </View>
        )}



      {isQuickAddOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setIsQuickAddOpen(false)} />
          <View style={styles.quickAddStack}>
            <Animated.View
              style={[
                styles.quickAddItem,
                styles.quickAddAnim,
                {
                  transform: [
                    {
                      translateY: itemAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                  opacity: itemAnim1,
                },
              ]}>
              <TouchableOpacity
                style={styles.quickAddItemInner}
                activeOpacity={0.85}
                onPress={() => {
                  setIsQuickAddOpen(false);
                  setIsManualOpen(true);
                }}>
                <View style={[styles.quickAddIcon, { backgroundColor: '#00B7C8' }]}>
                  <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.quickAddTextBlock}>
                  <Text style={styles.quickAddTitle}>Nhập chi tiêu thủ công</Text>
                  <Text style={styles.quickAddSubtitle}>Tự nhập số tiền và danh mục</Text>
                </View>
                <MaterialCommunityIcons name="star-four-points" size={16} color="#0EA5E9" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.quickAddItem,
                styles.quickAddAnim,
                {
                  transform: [
                    {
                      translateY: itemAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                  opacity: itemAnim2,
                },
              ]}>
              <TouchableOpacity
                style={styles.quickAddItemInner}
                activeOpacity={0.85}
                onPress={() => {
                  setIsQuickAddOpen(false);
                  setIsScanOpen(true);
                }}>
                <View style={[styles.quickAddIcon, { backgroundColor: '#F97316' }]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.quickAddTextBlock}>
                  <Text style={styles.quickAddTitle}>Quét mã QR / hóa đơn</Text>
                  <Text style={styles.quickAddSubtitle}>Bật camera để quét nhanh</Text>
                </View>
                <MaterialCommunityIcons name="star-four-points" size={16} color="#F97316" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.quickAddItem,
                styles.quickAddAnim,
                {
                  transform: [
                    {
                      translateY: itemAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                  opacity: itemAnim3,
                },
              ]}>
              <TouchableOpacity
                style={styles.quickAddItemInner}
                activeOpacity={0.85}
                onPress={() => {
                  setIsQuickAddOpen(false);
                  setIsUploadOpen(true);
                }}>
                <View style={[styles.quickAddIcon, { backgroundColor: '#8B5CF6' }]}>
                  <MaterialCommunityIcons name="image-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.quickAddTextBlock}>
                  <Text style={styles.quickAddTitle}>Tải ảnh hóa đơn từ thư viện</Text>
                  <Text style={styles.quickAddSubtitle}>Chọn ảnh có sẵn để quét</Text>
                </View>
                <MaterialCommunityIcons name="star-four-points" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </Animated.View>

          </View>
        </View>
      )}

      {isManualOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setIsManualOpen(false);
              setCategory('');
              setCategorySelected(false);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
            style={styles.manualModalWrapper}>
            <View style={styles.manualModal}>
              <View style={styles.manualHeader}>
                <View style={styles.manualTitleRow}>
                  <View style={styles.manualSpark}>
                    <MaterialCommunityIcons name="star-four-points" size={16} color="#0EA5E9" />
                  </View>
                  <Text style={styles.manualTitle}>Nhập chi tiêu thủ công</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setIsManualOpen(false);
                    setCategory('');
                    setCategorySelected(false);
                  }}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.segmented}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    entryType === 'expense' && styles.segmentActive,
                  ]}
                  onPress={() => {
                    setEntryType('expense');
                    setCategory('');
                    setCategorySelected(false);
                  }}>
                  <Ionicons
                    name="trending-down"
                    size={16}
                    color={entryType === 'expense' ? '#0F172A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      entryType === 'expense' && styles.segmentTextActive,
                    ]}>
                    Chi tiêu
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    entryType === 'income' && styles.segmentActive,
                  ]}
                  onPress={() => {
                    setEntryType('income');
                    setCategory('');
                    setCategorySelected(false);
                  }}>
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={entryType === 'income' ? '#0F172A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      entryType === 'income' && styles.segmentTextActive,
                    ]}>
                    Thu nhập
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={[
                  styles.manualBody,
                  { paddingBottom: 24 + insets.bottom },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Số tiền (VND)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formatAmountInput(amount)}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^\d]/g, '');
                    setAmount(digits);
                  }}
                />

                <Text style={styles.fieldLabel}>Mô tả</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ví dụ: Cà phê buổi sáng"
                  placeholderTextColor="#94A3B8"
                  value={note}
                  onChangeText={setNote}
                />

                <View style={styles.aiHint}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color="#0EA5E9" />
                  <Text style={styles.aiHintText}>
                    AI đang phân tích... Vui lòng chọn danh mục thủ công
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Danh mục</Text>
                <View style={styles.categoryGrid}>
                  {(entryType === 'income'
                    ? [
                      { key: 'salary', label: 'Lương', icon: 'cash' },
                      { key: 'bonus', label: 'Thưởng', icon: 'gift' },
                      { key: 'invest', label: 'Đầu tư', icon: 'chart-line' },
                      { key: 'other', label: 'Khác', icon: 'cash-multiple' },
                    ]
                    : [
                      { key: 'food', label: 'Ăn uống', icon: 'food' },
                      { key: 'move', label: 'Di chuyển', icon: 'train-car' },
                      { key: 'shop', label: 'Mua sắm', icon: 'shopping' },
                      { key: 'fun', label: 'Giải trí', icon: 'gamepad-variant' },
                      { key: 'bill', label: 'Hóa đơn', icon: 'receipt' },
                      { key: 'health', label: 'Sức khỏe', icon: 'heart-pulse' },
                      { key: 'edu', label: 'Giáo dục', icon: 'school' },
                      { key: 'other', label: 'Khác', icon: 'cube' },
                    ]
                  ).map((item) => {
                    const active = categorySelected && category === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.categoryCard, active && styles.categoryCardActive]}
                        onPress={() => {
                          setCategory(item.key);
                          setCategorySelected(true);
                        }}>
                        <View
                          style={[
                            styles.categoryIcon,
                            active && styles.categoryIconActive,
                          ]}>
                          <MaterialCommunityIcons
                            name={item.icon as never}
                            size={20}
                            color={active ? '#FFFFFF' : '#0EA5E9'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabel,
                            active && styles.categoryLabelActive,
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.manualActions}>
                  <TouchableOpacity
                    style={styles.manualCancel}
                    onPress={() => {
                      setIsManualOpen(false);
                      setCategory('');
                      setCategorySelected(false);
                    }}>
                    <Text style={styles.manualCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualSave} onPress={handleSaveManual}>
                    <Text style={styles.manualSaveText}>Lưu</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {isScanOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setIsScanOpen(false);
              setScanQrText('');
              setScanQrError('');
              setScanNote('');
              setScanQrInfo(null);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
            style={styles.scanModalWrapper}>
            <View style={styles.scanModal}>
              <ScrollView
                contentContainerStyle={[
                  styles.scanBody,
                  { paddingBottom: 24 + insets.bottom },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                <View style={styles.scanHeader}>
                  <Text style={styles.scanTitle}>Quét hóa đơn</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setIsScanOpen(false);
                      setScanQrText('');
                      setScanQrError('');
                      setScanNote('');
                      setScanQrInfo(null);
                    }}>
                    <Ionicons name="close" size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {!isKeyboardVisible && (
                  <View style={styles.scanActionRow}>
                    <TouchableOpacity
                      style={styles.scanActionCard}
                      activeOpacity={0.85}
                      onPress={handleTakePhoto}>
                      <View style={styles.scanActionIcon}>
                        <Ionicons name="camera-outline" size={20} color="#0EA5E9" />
                      </View>
                      <Text style={styles.scanActionText}>Chụp ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.scanActionCard}
                      activeOpacity={0.85}
                      onPress={handlePickImage}>
                      <View style={styles.scanActionIcon}>
                        <Ionicons name="cloud-upload-outline" size={20} color="#0EA5E9" />
                      </View>
                      <Text style={styles.scanActionText}>Tải ảnh lên</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!!scanImageUri && (
                  <View style={[styles.scanSelected, isKeyboardVisible && styles.scanSelectedCompact]}>
                    <MaterialCommunityIcons name="image-check-outline" size={16} color="#0EA5E9" />
                    <Text style={styles.scanSelectedText}>
                      Đã chọn: {scanImageName || 'Ảnh hóa đơn'}
                    </Text>
                    <TouchableOpacity
                      style={styles.scanSelectedClose}
                      onPress={() => {
                        setScanImageUri(null);
                        setScanImageName('');
                        setScanImageBase64(null);
                        setScanImageMimeType(null);
                        setScanQrText('');
                        setScanQrError('');
                        setScanNote('');
                        setScanQrInfo(null);
                      }}>
                      <Ionicons name="close" size={14} color="#0EA5E9" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.scanGuide}>
                  <View style={styles.scanGuideTitleRow}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color="#0EA5E9" />
                    <Text style={styles.scanGuideTitle}>Hướng dẫn quét hóa đơn</Text>
                  </View>
                  <View style={styles.scanResult}>
                    <Text style={styles.scanResultLabel}>Mô tả (dùng để phân loại):</Text>
                    <TextInput
                      style={styles.scanResultInput}
                      placeholder="Ví dụ: Uống cà phê, đóng tiền học..."
                      placeholderTextColor="#94A3B8"
                      value={scanNote}
                      onChangeText={setScanNote}
                      multiline
                    />
                    {scanQrLoading && <Text style={styles.scanResultHint}>Đang quét QR...</Text>}
                    {!!scanQrError && !scanQrLoading && (
                      <Text style={styles.scanResultError}>{scanQrError}</Text>
                    )}
                    {!!scanQrInfo && (
                      <View style={styles.qrInfoBox}>
                        <Text style={styles.qrInfoTitle}>Thông tin từ QR</Text>
                        {!!scanQrInfo.amount && (
                          <Text style={styles.qrInfoText}>Số tiền: {scanQrInfo.amount}</Text>
                        )}
                        {!!scanQrInfo.merchantName && (
                          <Text style={styles.qrInfoText}>Người nhận: {scanQrInfo.merchantName}</Text>
                        )}
                        {!!scanQrInfo.account && (
                          <Text style={styles.qrInfoText}>Tài khoản: {scanQrInfo.account}</Text>
                        )}
                        {!!scanQrInfo.reference && (
                          <Text style={styles.qrInfoText}>Nội dung: {scanQrInfo.reference}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  {!isKeyboardVisible && (
                    <View style={styles.scanGuideList}>
                      {[
                        'Đảm bảo hóa đơn rõ nét, không bị mờ',
                        'Chụp hóa đơn trong điều kiện đủ ánh sáng',
                        'AI sẽ tự động phát hiện và trích xuất thông tin',
                        'Kiểm tra lại thông tin trước khi lưu',
                      ].map((item) => (
                        <View key={item} style={styles.scanGuideItem}>
                          <View style={styles.scanBullet} />
                          <Text style={styles.scanGuideText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.scanActions}>
                  <TouchableOpacity
                    style={styles.scanCancel}
                    onPress={() => {
                      setIsScanOpen(false);
                      setScanQrText('');
                      setScanQrError('');
                      setScanNote('');
                      setScanQrInfo(null);
                    }}>
                    <Text style={styles.scanCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scanSave} onPress={() => handleSaveScan('scan')}>
                    <Text style={styles.scanSaveText}>
                      {scanQrInfo?.amount ? `Lưu ${formatAmount(Number(scanQrInfo.amount))}` : 'Lưu'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {isUploadOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setIsUploadOpen(false);
              setScanQrText('');
              setScanQrError('');
              setScanNote('');
              setScanQrInfo(null);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
            style={styles.uploadModalWrapper}>
            <View style={styles.uploadModal}>
              <ScrollView
                contentContainerStyle={[
                  styles.uploadBody,
                  { paddingBottom: 24 + insets.bottom },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                <View style={styles.scanHeader}>
                  <View style={styles.uploadTitleRow}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#0EA5E9" />
                    <Text style={styles.scanTitle}>Tải ảnh hóa đơn</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setIsUploadOpen(false);
                      setScanQrText('');
                      setScanQrError('');
                      setScanNote('');
                      setScanQrInfo(null);
                    }}>
                    <Ionicons name="close" size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.uploadDropzone,
                    isKeyboardVisible && styles.uploadDropzoneCompact,
                  ]}
                  activeOpacity={0.8}
                  onPress={handlePickImage}>
                  {!!scanImageUri && (
                    <TouchableOpacity
                      style={styles.uploadClearButton}
                      onPress={() => {
                        setScanImageUri(null);
                        setScanImageName('');
                        setScanImageBase64(null);
                        setScanImageMimeType(null);
                        setScanQrText('');
                        setScanQrError('');
                        setScanNote('');
                        setScanQrInfo(null);
                      }}>
                      <Ionicons name="close" size={14} color="#0EA5E9" />
                    </TouchableOpacity>
                  )}
                  <View
                    style={[
                      styles.uploadIconWrap,
                      isKeyboardVisible && styles.uploadIconWrapCompact,
                    ]}>
                    <MaterialCommunityIcons name="image-outline" size={26} color="#0EA5E9" />
                  </View>
                  <Text style={styles.uploadTitle}>Chọn ảnh hóa đơn</Text>
                  {!isKeyboardVisible && (
                    <Text style={styles.uploadSubtitle}>Nhấn để chọn ảnh từ thư viện</Text>
                  )}
                  {!!scanImageUri && (
                    <Text style={styles.uploadSelected}>
                      Đã chọn: {scanImageName || 'Ảnh hóa đơn'}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={styles.scanResult}>
                  <Text style={styles.scanResultLabel}>Mô tả (dùng để phân loại):</Text>
                  <TextInput
                    style={styles.scanResultInput}
                    placeholder="Ví dụ: Uống cà phê, đóng tiền học..."
                    placeholderTextColor="#94A3B8"
                    value={scanNote}
                    onChangeText={setScanNote}
                    multiline
                  />
                  {scanQrLoading && <Text style={styles.scanResultHint}>Đang quét QR...</Text>}
                  {!!scanQrError && !scanQrLoading && (
                    <Text style={styles.scanResultError}>{scanQrError}</Text>
                  )}
                  {!!scanQrInfo && (
                    <View style={styles.qrInfoBox}>
                      <Text style={styles.qrInfoTitle}>Thông tin từ QR</Text>
                      {!!scanQrInfo.amount && (
                        <Text style={styles.qrInfoText}>Số tiền: {scanQrInfo.amount}</Text>
                      )}
                      {!!scanQrInfo.merchantName && (
                        <Text style={styles.qrInfoText}>Người nhận: {scanQrInfo.merchantName}</Text>
                      )}
                      {!!scanQrInfo.account && (
                        <Text style={styles.qrInfoText}>Tài khoản: {scanQrInfo.account}</Text>
                      )}
                      {!!scanQrInfo.reference && (
                        <Text style={styles.qrInfoText}>Nội dung: {scanQrInfo.reference}</Text>
                      )}
                    </View>
                  )}
                </View>

                {!isKeyboardVisible && (
                  <View style={styles.uploadTip}>
                    <View style={styles.uploadTipRow}>
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#F59E0B" />
                      <Text style={styles.uploadTipTitle}>Mẹo để quét tốt hơn:</Text>
                    </View>
                    {[
                      'Chụp rõ nét, đầy đủ thông tin',
                      'Ánh sáng đủ, tránh bóng mờ',
                      'Hóa đơn phẳng, không nhăn',
                    ].map((item) => (
                      <Text key={item} style={styles.uploadTipText}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.scanActions}>
                  <TouchableOpacity
                    style={styles.scanCancel}
                    onPress={() => {
                      setIsUploadOpen(false);
                      setScanQrText('');
                      setScanQrError('');
                      setScanNote('');
                      setScanQrInfo(null);
                    }}>
                    <Text style={styles.scanCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scanSave} onPress={() => handleSaveScan('upload')}>
                    <Text style={styles.scanSaveText}>
                      {scanQrInfo?.amount ? `Lưu ${formatAmount(Number(scanQrInfo.amount))}` : 'Lưu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {isDeleteOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setIsDeleteOpen(false);
              setDeleteTarget(null);
            }}
          />
          <View style={styles.deleteModalWrapper}>
            <View style={styles.deleteModal}>
              <View style={styles.deleteIcon}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#0EA5E9" />
              </View>
              <Text style={styles.deleteTitle}>Xóa giao dịch</Text>
              <Text style={styles.deleteText}>Bạn muốn xóa giao dịch này?</Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.deleteCancel}
                  onPress={() => {
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                  }}>
                  <Text style={styles.deleteCancelText}>Quay lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirm}
                  onPress={async () => {
                    const id = Number(deleteTarget?.id);
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                    if (Number.isFinite(id) && id > 0) {
                      await deleteTransaction(id);
                    }
                  }}>
                  <Text style={styles.deleteConfirmText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {isMonthPickerOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsMonthPickerOpen(false)}
          />
          <View style={[styles.deleteModalWrapper, { justifyContent: 'center', paddingHorizontal: 24 }]}>
            <View style={[styles.deleteModal, { paddingBottom: 20, paddingTop: 20 }]}>
              <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 12 }} />
              <Text style={styles.deleteTitle}>Chọn tháng / năm</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16, gap: 16 }}>
                <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>Năm {selectedYear}</Text>
                <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                {months.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setSelectedMonth(m);
                    }}
                    style={{
                      width: '28%',
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: 12,
                      backgroundColor: selectedMonth === m ? '#08B0C9' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: selectedMonth === m ? '#08B0C9' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: selectedMonth === m ? '#FFFFFF' : '#64748B' }}>Tháng {m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.deleteCancel, { flex: 1 }]}
                  onPress={() => setIsMonthPickerOpen(false)}
                >
                  <Text style={styles.deleteCancelText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {isCompareOpen && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setIsCompareOpen(false)} />
          <View style={styles.compareModalWrapper}>
            <View style={styles.compareModal}>
              <View style={styles.compareHeader}>
                <View>
                  <Text style={styles.compareTitle}>So sánh thu/chi theo tháng</Text>
                  <Text style={styles.compareSubtitle}>Trục giữa là mốc 0</Text>
                </View>
                <TouchableOpacity
                  style={styles.compareClose}
                  onPress={() => setIsCompareOpen(false)}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.compareLegend}>
                <View style={styles.compareLegendItem}>
                  <View style={[styles.compareLegendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.compareLegendText}>Thu nhập</Text>
                </View>
                <View style={styles.compareLegendItem}>
                  <View style={[styles.compareLegendDot, { backgroundColor: '#F97316' }]} />
                  <Text style={styles.compareLegendText}>Chi tiêu</Text>
                </View>
              </View>

              <View style={styles.compareChart}>
                <View style={styles.compareGrid}>
                  {compareTicks.map((t) => (
                    <View
                      key={`top-${t}`}
                      style={[styles.compareGridLine, { top: `${50 - t * 40}%` }]}
                    />
                  ))}
                  {compareTicks.map((t) => (
                    <View
                      key={`bottom-${t}`}
                      style={[styles.compareGridLine, { top: `${50 + t * 40}%` }]}
                    />
                  ))}
                </View>
                <View style={styles.compareContent}>
                  <View style={styles.compareYAxis}>
                    {compareAxisTicks.map((t, index) => {
                      if (t === 0) {
                        return (
                          <Text key={`tick-${index}`} style={styles.compareAxisLabelMid}>
                            0
                          </Text>
                        );
                      }
                      return (
                        <Text key={`tick-${index}`} style={styles.compareAxisLabel}>
                          {formatCompareAxis(monthlyCompare.maxValue * t)}
                        </Text>
                      );
                    })}
                  </View>
                  <View style={styles.compareBarsRow}>
                    {monthlyCompare.buckets.map((b) => {
                      const incomeHeight = Math.round((b.income / monthlyCompare.maxValue) * 70);
                      const expenseHeight = Math.round((b.expense / monthlyCompare.maxValue) * 70);
                      return (
                        <View key={b.key} style={styles.compareBarGroup}>
                          <View style={styles.compareBarTop}>
                            <View
                              style={[
                                styles.compareBar,
                                styles.compareBarIncome,
                                { height: incomeHeight },
                              ]}
                            />
                          </View>
                          <View style={styles.compareLabelWrap}>
                            <Text style={styles.compareLabel}>{b.label}</Text>
                          </View>
                          <View style={styles.compareBarBottom}>
                            <View
                              style={[
                                styles.compareBar,
                                styles.compareBarExpense,
                                { height: expenseHeight },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {isCategoryPopupOpen && selectedCategoryKey && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsCategoryPopupOpen(false)}
          />
          <View style={styles.categoryModalWrapper}>
            <View style={styles.categoryModal}>
              <View style={styles.categoryModalHeader}>
                <View style={styles.categoryModalTitleRow}>
                  <View
                    style={[
                      styles.categoryRowIcon,
                      { backgroundColor: `${selectedCategoryMeta?.meta.color ?? '#64748B'}22` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={selectedCategoryMeta?.meta.icon ?? 'dots-horizontal'}
                      size={16}
                      color={selectedCategoryMeta?.meta.color ?? '#64748B'}
                    />
                  </View>
                  <View style={styles.categoryModalTitleText}>
                    <Text style={styles.categoryModalTitle}>
                      {selectedCategoryMeta?.meta.label ?? 'Khác'}
                    </Text>
                    <Text style={styles.categoryModalSubtitle}>
                      Tổng: {formatAmount(selectedCategoryMeta?.amount || 0)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.categoryModalClose}
                  onPress={() => setIsCategoryPopupOpen(false)}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.categoryModalList}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={true}
              >
                {selectedCategoryTransactions.length === 0 ? (
                  <Text style={styles.categoryModalEmpty}>Chưa có giao dịch trong mục này.</Text>
                ) : (
                  selectedCategoryTransactions.map((item, index) => (
                    <View
                      key={item.id ?? `${selectedCategoryKey}-${index}`}
                      style={styles.categoryModalItem}
                    >
                      <View style={styles.categoryModalItemInfo}>
                        <Text style={styles.categoryModalItemTitle} numberOfLines={1}>
                          {(item.description && String(item.description).trim()) || 'Giao dịch'}
                        </Text>
                        <Text style={styles.categoryModalItemMeta} numberOfLines={1}>
                          {formatDateTime(item.occurred_at)}
                        </Text>
                      </View>
                      <Text style={styles.categoryModalItemAmount}>
                        -{formatAmount(Number(item.amount))}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {customConfirm.visible && (
        <View style={[styles.overlay, { zIndex: 10000 }]} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setCustomConfirm({ ...customConfirm, visible: false })} />
          <View style={styles.customConfirmWrapper}>
            <View style={styles.customConfirmBox}>
              <View style={[styles.confirmIconBox, customConfirm.type === 'delete' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#E0F2FE' }]}>
                <Ionicons 
                  name={customConfirm.type === 'delete' ? "trash" : "checkmark-circle"} 
                  size={28} 
                  color={customConfirm.type === 'delete' ? "#EF4444" : "#0EA5E9"} 
                />
              </View>
              <Text style={styles.confirmTitle}>{customConfirm.title}</Text>
              <Text style={styles.confirmMessage}>{customConfirm.message}</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity 
                  style={styles.confirmCancelBtn} 
                  onPress={() => setCustomConfirm({ ...customConfirm, visible: false })}
                >
                  <Text style={styles.confirmCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmYesBtn, customConfirm.type === 'delete' ? { backgroundColor: '#EF4444' } : { backgroundColor: '#0EA5E9' }]}
                  onPress={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm({ ...customConfirm, visible: false });
                  }}
                >
                  <Text style={styles.confirmYesText}>Đồng ý</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {isEditPostModalOpen && (
        <View style={[styles.overlay, { zIndex: 3000 }]} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setIsEditPostModalOpen(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={styles.editPostModalWrapper}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.editPostModal}>
              <View style={styles.editPostHeader}>
                <Text style={styles.editPostTitle}>Chỉnh sửa bài viết</Text>
                <TouchableOpacity onPress={() => setIsEditPostModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editPostInput}
                value={editingContent}
                onChangeText={setEditingContent}
                multiline
                placeholder="Bạn đang nghĩ gì?"
                autoFocus
              />
              <TouchableOpacity style={styles.updatePostBtn} onPress={handleUpdatePost}>
                <Text style={styles.updatePostBtnText}>Cập nhật chia sẻ</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {isCommentModalOpen && selectedPost && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setIsCommentModalOpen(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentModalWrapper}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.commentModal}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentTitle}>Bình luận</Text>
                <TouchableOpacity onPress={() => setIsCommentModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.commentList}>
                {commentsLoading ? (
                  <Text style={styles.commentStatus}>Đang tải bình luận...</Text>
                ) : comments.length === 0 ? (
                  <Text style={styles.commentStatus}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
                ) : (
                  comments.filter(c => !c.parent_id).map((comment) => {
                    const replies = comments.filter(r => r.parent_id === comment.id);
                    const isExpanded = expandedComments.includes(comment.id);

                    return (
                      <View key={comment.id} style={styles.commentThreadWrapper}>
                        <View style={styles.commentItem}>
                          <View style={[styles.avatarSmall, { width: 30, height: 30 }]}>
                            <Text style={[styles.avatarText, { fontSize: 10 }]}>{comment.author_name?.substring(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={styles.commentContentBox}>
                            <Text style={styles.commentAuthor}>{comment.author_name}</Text>
                            <Text style={styles.commentText}>{comment.content}</Text>
                            
                            <View style={styles.commentActions}>
                              <TouchableOpacity 
                                style={styles.comActionBtn}
                                onPress={() => handleLikeComment(comment)}
                              >
                                <Ionicons 
                                  name={comment.is_liked ? "heart" : "heart-outline"} 
                                  size={14} 
                                  color={comment.is_liked ? "#EF4444" : "#64748B"} 
                                />
                                <Text style={[styles.comActionText, comment.is_liked && { color: "#EF4444" }]}>
                                  {comment.likes_count > 0 ? comment.likes_count : "Thích"}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                style={styles.comActionBtn}
                                onPress={() => {
                                  setReplyToComment(comment);
                                  setNewComment(`@${comment.author_name} `);
                                }}
                              >
                                <MaterialCommunityIcons name="reply" size={14} color="#64748B" />
                                <Text style={styles.comActionText}>Trả lời</Text>
                              </TouchableOpacity>

                              {currentUser?.id === comment.user_id && (
                                <TouchableOpacity 
                                  style={styles.comActionBtn}
                                  onPress={() => confirmDeleteComment(comment)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  <Text style={[styles.comActionText, { color: "#EF4444" }]}>Xóa</Text>
                                </TouchableOpacity>
                              )}
                              
                              <Text style={styles.commentTime}>{formatCommunityTime(comment.created_at)}</Text>
                            </View>

                            {/* Show Replies Link */}
                            {replies.length > 0 && (
                              <TouchableOpacity 
                                style={styles.showRepliesBtn}
                                onPress={() => {
                                  if (isExpanded) {
                                    setExpandedComments(expandedComments.filter(id => id !== comment.id));
                                  } else {
                                    setExpandedComments([...expandedComments, comment.id]);
                                  }
                                }}
                              >
                                <View style={styles.repliesLine} />
                                <Text style={styles.showRepliesText}>
                                  {isExpanded ? 'Ẩn phản hồi' : `Xem ${replies.length} phản hồi`}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Render Replies */}
                        {isExpanded && replies.map(reply => (
                          <View key={reply.id} style={[styles.commentItem, styles.replyItem]}>
                            <View style={[styles.avatarSmall, { width: 24, height: 24 }]}>
                              <Text style={[styles.avatarText, { fontSize: 8 }]}>{reply.author_name?.substring(0, 2).toUpperCase()}</Text>
                            </View>
                            <View style={styles.commentContentBox}>
                              <Text style={styles.commentAuthor}>{reply.author_name}</Text>
                              <Text style={styles.commentText}>{reply.content}</Text>
                              
                              <View style={styles.commentActions}>
                                <TouchableOpacity 
                                  style={styles.comActionBtn}
                                  onPress={() => handleLikeComment(reply)}
                                >
                                  <Ionicons 
                                    name={reply.is_liked ? "heart" : "heart-outline"} 
                                    size={12} 
                                    color={reply.is_liked ? "#EF4444" : "#64748B"} 
                                  />
                                  <Text style={[styles.comActionText, reply.is_liked && { color: "#EF4444" }]}>
                                    {reply.likes_count > 0 ? reply.likes_count : "Thích"}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                  style={styles.comActionBtn}
                                  onPress={() => {
                                    setReplyToComment(comment); // Always reply to main comment thread or handle nested
                                    setNewComment(`@${reply.author_name} `);
                                  }}
                                >
                                  <MaterialCommunityIcons name="reply" size={12} color="#64748B" />
                                  <Text style={styles.comActionText}>Trả lời</Text>
                                </TouchableOpacity>

                                {currentUser?.id === reply.user_id && (
                                  <TouchableOpacity 
                                    style={styles.comActionBtn}
                                    onPress={() => confirmDeleteComment(reply)}
                                  >
                                    <Ionicons name="trash-outline" size={12} color="#EF4444" />
                                    <Text style={[styles.comActionText, { color: "#EF4444" }]}>Xóa</Text>
                                  </TouchableOpacity>
                                )}
                                
                                <Text style={styles.commentTime}>{formatCommunityTime(reply.created_at)}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Viết bình luận..."
                  placeholderTextColor="#94A3B8"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendCommentBtn, !newComment.trim() && { opacity: 0.5 }]} 
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={activeTab === 'home' ? styles.navItemActive : styles.navItem}
          onPress={() => setActiveTab('home')}>
          <Ionicons
            name="home"
            size={20}
            color={activeTab === 'home' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={activeTab === 'home' ? styles.navTextActive : styles.navText}>
            Tổng quan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={activeTab === 'transactions' ? styles.navItemActive : styles.navItem}
          onPress={() => setActiveTab('transactions')}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={20}
            color={activeTab === 'transactions' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={activeTab === 'transactions' ? styles.navTextActive : styles.navText}>
            Chi tiêu
          </Text>
        </TouchableOpacity>
        <View style={styles.fabWrapper}>
          <TouchableOpacity style={styles.fab} onPress={() => setIsQuickAddOpen(true)}>
            <Ionicons name={isQuickAddOpen ? 'close' : 'add'} size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={activeTab === 'community' ? styles.navItemActive : styles.navItem}
          onPress={() => setActiveTab('community')}>
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'community' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={activeTab === 'community' ? styles.navTextActive : styles.navText}>
            Cộng đồng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={activeTab === 'treasure' ? styles.navItemActive : styles.navItem}
          onPress={() => setActiveTab('treasure')}>
          <Ionicons
            name="trophy"
            size={20}
            color={activeTab === 'treasure' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={activeTab === 'treasure' ? styles.navTextActive : styles.navText}>
            Kho báu
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#07B8C8',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerScoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E6F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  appSubtitle: {
    color: '#E0F7FA',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0FCDD9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  scoreCard: {
    backgroundColor: '#04B8C6',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#E0F7FA',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scoreMax: {
    color: '#E0F7FA',
    fontSize: 16,
    paddingBottom: 6,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scoreStatus: {
    color: '#E0F7FA',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scoreIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#1BD0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#0EA5B8',
    borderRadius: 6,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    color: '#E0F7FA',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  chartSummary: {
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  chartSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  chartSummaryValue: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  chartProgressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  chartProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  chartSummaryFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartSummaryFootText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  chartButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
  },
  chartMoreText: {
    fontSize: 11,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  chartRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartArea: {
    height: 232,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  chartInner: {
    paddingLeft: 10,
  },
  chartCanvas: {
    marginVertical: 2,
    paddingRight: 50,
  },
  chartPlaceholder: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
  },
  summaryCardIncome: {
    flex: 1,
    backgroundColor: '#E6F9FC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B0E9F0',
    gap: 4,
  },
  summaryCardExpense: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 4,
  },
  summaryIconBoxIncome: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#08B0C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxExpense: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValueIncome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#08B0C9',
  },
  summaryValueExpense: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  navItemActive: {
    alignItems: 'center',
    gap: 4,
    width: 60,
    backgroundColor: '#06B6D4',
    paddingVertical: 6,
    borderRadius: 12,
  },
  navText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  navTextActive: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  fabWrapper: {
    width: 72,
    alignItems: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  quickAddStack: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    gap: 12,
  },
  quickAddItem: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickAddAnim: {
    overflow: 'hidden',
  },
  quickAddItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  quickAddIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddTextBlock: {
    flex: 1,
    gap: 4,
  },
  quickAddTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  quickAddSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  manualModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  manualModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    maxHeight: '82%',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualSpark: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  segmentTextActive: {
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  manualBody: {
    gap: 10,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  fieldInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  aiHintText: {
    fontSize: 11,
    color: '#0EA5E9',
    flex: 1,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  categoryCard: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    gap: 6,
    marginBottom: 10,
  },
  categoryCardActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryLabel: {
    fontSize: 10,
    color: '#0F172A',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  manualActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  manualCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  manualCancelText: {
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  manualSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7DD3E2',
    alignItems: 'center',
  },
  manualSaveText: {
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scanBody: {
    paddingBottom: 10,
    gap: 12,
  },
  scanModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scanTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  scanActionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  scanActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanActionText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanGuide: {
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 12,
    gap: 8,
  },
  scanGuideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanGuideTitle: {
    fontSize: 12,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanGuideList: {
    gap: 6,
  },
  scanGuideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  scanBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
    marginTop: 6,
  },
  scanGuideText: {
    flex: 1,
    fontSize: 11,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanResult: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#EFF6FF',
    padding: 10,
  },
  scanResultLabel: {
    fontSize: 11,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanResultText: {
    marginTop: 4,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanResultInput: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 54,
    textAlignVertical: 'top',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanResultHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanResultError: {
    marginTop: 6,
    fontSize: 11,
    color: '#EF4444',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  qrInfoBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF3',
    padding: 10,
    gap: 4,
  },
  qrInfoTitle: {
    fontSize: 12,
    color: '#059669',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  qrInfoText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  scanCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scanCancelText: {
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanSave: {
    flex: 1,
    backgroundColor: '#08B0C9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scanSaveText: {
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scanSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#E0F7FA',
    marginBottom: 8,
  },
  scanSelectedCompact: {
    paddingVertical: 4,
    marginBottom: 6,
  },
  scanSelectedText: {
    flex: 1,
    fontSize: 11,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  scanSelectedClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  uploadBody: {
    paddingBottom: 10,
    gap: 12,
  },
  uploadModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  uploadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadDropzone: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#67E8F9',
    backgroundColor: '#F0F9FF',
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  uploadDropzoneCompact: {
    paddingVertical: 10,
  },
  uploadClearButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  uploadIconWrapCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  uploadTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  uploadSelected: {
    marginTop: 6,
    fontSize: 11,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  uploadSelectedRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadTip: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    padding: 12,
    gap: 4,
  },
  uploadTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadTipTitle: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  uploadTipText: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txSection: {
    marginTop: 10,
    gap: 12,
  },
  categoryBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  categoryHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryHeaderTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  categoryHeaderTotal: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 6,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  categoryAmount: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  categoryBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  categoryPercent: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  categoryModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '70%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryModalTitleText: {
    gap: 2,
  },
  categoryModalTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  categoryModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  categoryModalList: {
    maxHeight: 360,
  },
  categoryModalEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryModalItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  categoryModalItemTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  categoryModalItemMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  categoryModalItemAmount: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  compareModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  compareModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compareTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  compareSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  compareClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  compareLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compareLegendText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  compareChart: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 10,
    height: 220,
  },
  compareGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  compareGridLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: '#E6ECF5',
  },
  compareGridLineStrong: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: '#D8E0EC',
  },
  compareContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  compareYAxis: {
    width: 44,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  compareAxisLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  compareAxisLabelMid: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'right',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  compareBarsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compareBarGroup: {
    width: '14%',
    alignItems: 'center',
  },
  compareBarTop: {
    height: 70,
    justifyContent: 'flex-end',
  },
  compareLabelWrap: {
    height: 24,
    justifyContent: 'center',
  },
  compareBarBottom: {
    height: 70,
    justifyContent: 'flex-start',
  },
  compareBar: {
    width: 10,
    borderRadius: 0,
  },
  compareBarIncome: {
    backgroundColor: '#22C55E',
  },
  compareBarExpense: {
    backgroundColor: '#F97316',
  },
  compareLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  txHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  txSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMonthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txMonthButtonText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  txHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  txHistoryHeader: {
    marginTop: 2,
  },
  txHistoryTitle: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  txFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E0F7FA',
    borderWidth: 1,
    borderColor: '#D6F0F6',
  },
  txFilterActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  txFilterText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  txFilterTextActive: {
    color: '#FFFFFF',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  txStatus: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txError: {
    textAlign: 'center',
    fontSize: 12,
    color: '#EF4444',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  txItemLast: {
    borderBottomWidth: 0,
  },
  txBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBadgeExpense: {
    backgroundColor: '#F97316',
  },
  txBadgeIncome: {
    backgroundColor: '#22C55E',
  },
  txInfo: {
    flex: 1,
  },
  txLabel: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  txMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  txAmount: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  txAmountExpense: {
    color: '#EF4444',
  },
  txAmountIncome: {
    color: '#16A34A',
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  placeholderText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  deleteModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  deleteText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 12,
  },
  deleteCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  deleteConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  communityContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 12,
    paddingBottom: 20,
  },
  communitySubTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    padding: 4,
    marginBottom: 8,
  },
  communitySubTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  communitySubTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  communitySubTabText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  communitySubTabTextActive: {
    color: '#08B0C9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  createPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  postInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 6,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  postContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  postDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  postActionText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  // Comment Modal Styles
  commentModalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  commentList: {
    flex: 1,
  },
  commentStatus: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentContentBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
  },
  commentAuthor: {
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  commentText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  commentTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 'auto',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  comActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comActionText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 15 : 0, // Đẩy lên 15px khi chạm mép bàn phím Android
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#08B0C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyItem: {
    marginLeft: 46,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 12,
    marginTop: 8,
  },
  showRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  repliesLine: {
    width: 20,
    height: 1,
    backgroundColor: '#CBD5E1',
    marginRight: 8,
  },
  showRepliesText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  commentThreadWrapper: {
    marginBottom: 16,
  },
  postMoreBtn: {
    padding: 10,
    marginRight: -10,
    marginTop: -10,
  },
  postMenu: {
    position: 'absolute',
    right: 16,
    top: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 9999,
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  postMenuText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  editPostModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editPostModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  editPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editPostTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  editPostInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: '#0F172A',
    textAlignVertical: 'top',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  updatePostBtn: {
    backgroundColor: '#08B0C9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updatePostBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  // Custom Confirm Popup Styles
  customConfirmWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  customConfirmBox: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  confirmTitle: {
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  confirmMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmCancelText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  confirmYesBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#08B0C9',
  },
  confirmYesText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  // Ranking Styles
  rankingContainer: {
    padding: 20,
  },
  rankingHeaderCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  rankingHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rankingHeaderTitle: {
    fontSize: 16,
    color: '#164E63',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  rankingHeaderDesc: {
    fontSize: 12,
    color: '#0891B2',
    lineHeight: 18,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  rankingItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 12, // Dịch toàn bộ content sang trái bằng cách giảm padding
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  rankingItemCardSelf: {
    borderColor: '#08B0C9',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
  },
  rankingRankBox: {
    width: 32, // Tối ưu chiều rộng để huy chương gọn hơn
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6, // Thu nhỏ khoảng cách giữa huy chương và avatar
  },
  rankingRankText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 10, // Kéo phần text dịch sang trái (gần avatar hơn)
  },
  rankingName: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  rankingStatsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingStatValue: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  topTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
});
