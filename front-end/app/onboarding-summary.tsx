import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { API_BASE_URL } from '@/constants/api';

const GOAL_OPTIONS = [
  { code: 'emergency', label: 'Quỹ khẩn cấp' },
  { code: 'home', label: 'Mua nhà/đất' },
  { code: 'travel', label: 'Du lịch' },
  { code: 'learn', label: 'Học tập/Nâng cao kỹ năng' },
  { code: 'invest', label: 'Đầu tư tài chính' },
  { code: 'retire', label: 'Hưu trí' },
  { code: 'debt', label: 'Trả nợ' },
  { code: 'startup', label: 'Khởi nghiệp' },
];

const TONE_OPTIONS = [
  { code: 'friendly', label: 'Bạn thân' },
  { code: 'pro', label: 'Chuyên nghiệp' },
  { code: 'mentor', label: 'Mentor' },
];

const AUTH_OPTIONS = [
  { code: 'biometric', label: 'Sinh trắc học' },
  { code: 'pin', label: 'Mã PIN 6 số' },
  { code: 'none', label: 'Tắt MFA' },
];

export default function OnboardingSummaryScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // States for Edits
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editType, setEditType] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Double Confirm States
  const [confirmModal, setConfirmModal] = useState({ visible: false, step: 1 });

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const fetchData = async () => {
    const email = params.email ? String(params.email) : '';
    if (!email) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/onboarding?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      if (response.ok && data?.exists) {
        setSummary(data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiBaseUrl, params.email]);

  const handleEdit = (type: string) => {
    setEditType(type);
    if (type === 'account') {
      setEditData({ fullName: summary.user.fullName });
    } else if (type === 'income') {
      setEditData({ incomeMonthly: String(summary.onboarding.incomeMonthly) });
    } else if (type === 'goals') {
      setEditData({ goals: summary.goals || [] });
    } else if (type === 'ai') {
      setEditData({ 
        aiName: summary.onboarding.aiName, 
        aiTone: summary.onboarding.aiTone 
      });
    } else if (type === 'budget') {
      setEditData({
        needsPct: summary.onboarding.needsPct,
        wantsPct: summary.onboarding.wantsPct,
        savingsPct: summary.onboarding.savingsPct,
      });
    } else if (type === 'security') {
      setEditData({
        mfaEnabled: summary.onboarding.mfaEnabled,
        authMethod: summary.onboarding.authMethod,
      });
    }
    setIsEditModalOpen(true);
  };

  // Slider change logic
  const handleNeedsChange = (value: number) => {
    const nextNeeds = Math.round(value);
    let nextWants = editData.wantsPct || 0;
    if (nextNeeds + nextWants > 100) {
      nextWants = Math.max(0, 100 - nextNeeds);
    }
    const nextSavings = Math.max(0, 100 - nextNeeds - nextWants);
    setEditData({ ...editData, needsPct: nextNeeds, wantsPct: nextWants, savingsPct: nextSavings });
  };

  const handleWantsChange = (value: number) => {
    const nextWants = Math.round(value);
    let nextNeeds = editData.needsPct || 0;
    if (nextNeeds + nextWants > 100) {
      nextNeeds = Math.max(0, 100 - nextWants);
    }
    const nextSavings = Math.max(0, 100 - nextNeeds - nextWants);
    setEditData({ ...editData, needsPct: nextNeeds, wantsPct: nextWants, savingsPct: nextSavings });
  };

  const startSaveProcess = () => {
    setConfirmModal({ visible: true, step: 1 });
  };

  const executeSave = async () => {
    setConfirmModal({ visible: false, step: 1 });
    setSaving(true);
    try {
      const email = summary.user.email;
      let endpoint = `${apiBaseUrl}/api/onboarding`;
      let payload: any = { email };

      if (editType === 'account') {
        endpoint = `${apiBaseUrl}/api/user/update-info`;
        payload.fullName = editData.fullName;
      } else {
        payload = {
          ...summary.onboarding,
          email,
          goals: summary.goals,
          ...editData,
        };
        if (payload.incomeMonthly) payload.incomeMonthly = Number(payload.incomeMonthly);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchData();
        setIsEditModalOpen(false);
      } else {
        const err = await response.json();
        Alert.alert('Lỗi', err.message || 'Cập nhật thất bại.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const renderSectionContent = (type: string) => {
    if (!summary) return null;
    
    switch(type) {
      case 'account':
        return (
          <View style={styles.sectionInner}>
            <Text style={styles.rowLabel}>Họ tên</Text>
            <Text style={styles.rowValue}>{summary.user.fullName}</Text>
            <Text style={styles.rowLabel}>Email (Không thể sửa)</Text>
            <Text style={styles.rowValueDisabled}>{summary.user.email}</Text>
            <Text style={styles.rowLabel}>Số điện thoại (Không thể sửa)</Text>
            <Text style={styles.rowValueDisabled}>{summary.user.phone}</Text>
          </View>
        );
      case 'income':
        return (
          <View style={styles.sectionInner}>
            <Text style={styles.rowLabel}>Thu nhập trung bình/tháng</Text>
            <Text style={styles.rowValue}>{Number(summary.onboarding.incomeMonthly).toLocaleString()} VND</Text>
          </View>
        );
      case 'goals':
        return (
          <View style={styles.sectionInner}>
            <Text style={styles.rowLabel}>Mục tiêu tài chính</Text>
            <View style={styles.tagRow}>
              {(summary.goals || []).map((g: string) => (
                <View key={g} style={styles.tag}>
                  <Text style={styles.tagText}>{GOAL_OPTIONS.find(o => o.code === g)?.label || g}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      case 'ai':
        return (
          <View style={styles.sectionInner}>
            <Text style={styles.rowLabel}>Tên Trợ lý AI</Text>
            <Text style={styles.rowValue}>{summary.onboarding.aiName}</Text>
            <Text style={styles.rowLabel}>Giọng điệu</Text>
            <Text style={styles.rowValue}>{TONE_OPTIONS.find(o => o.code === summary.onboarding.aiTone)?.label || '-'}</Text>
          </View>
        );
      case 'budget':
        return (
          <View style={styles.sectionInner}>
            <View style={styles.pctRow}>
              <View style={styles.pctBox}>
                <Text style={styles.pctLabel}>Thiết yếu</Text>
                <Text style={styles.pctValue}>{summary.onboarding.needsPct}%</Text>
              </View>
              <View style={styles.pctBox}>
                <Text style={styles.pctLabel}>Cá nhân</Text>
                <Text style={styles.pctValue}>{summary.onboarding.wantsPct}%</Text>
              </View>
              <View style={styles.pctBox}>
                <Text style={styles.pctLabel}>Tiết kiệm</Text>
                <Text style={styles.pctValue}>{summary.onboarding.savingsPct}%</Text>
              </View>
            </View>
          </View>
        );
      case 'security':
        return (
          <View style={styles.sectionInner}>
            <Text style={styles.rowLabel}>Xác thực 2 lớp (MFA)</Text>
            <Text style={styles.rowValue}>{summary.onboarding.mfaEnabled ? 'Đang bật' : 'Đang tắt'}</Text>
            <Text style={styles.rowLabel}>Phương thức bảo mật</Text>
            <Text style={styles.rowValue}>{AUTH_OPTIONS.find(o => o.code === summary.onboarding.authMethod)?.label || '-'}</Text>
          </View>
        );
      default: return null;
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backToHomeBtn}>
          <Ionicons name="chevron-back" size={22} color="#08B0C9" />
          <Text style={styles.backToHomeText}>Về trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 100 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#08B0C9" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.profileSummary}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{summary?.user?.fullName?.substring(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.profileName}>{summary?.user?.fullName}</Text>
              <Text style={styles.profileEmail}>{summary?.user?.email}</Text>
            </View>

            <View style={styles.menuList}>
              {[
                { id: 'account', label: 'Thông tin tài khoản', icon: 'account-circle-outline' },
                { id: 'income', label: 'Thu nhập', icon: 'cash-multiple' },
                { id: 'goals', label: 'Mục tiêu tài chính', icon: 'bullseye-arrow' },
                { id: 'ai', label: 'Cài đặt AI Coach', icon: 'robot-outline' },
                { id: 'budget', label: 'Ngân sách & Tỉ lệ', icon: 'chart-pie' },
                { id: 'security', label: 'Bảo mật & MFA', icon: 'shield-lock-outline' },
              ].map((item) => (
                <View key={item.id} style={styles.menuItemContainer}>
                  <TouchableOpacity 
                    style={[styles.menuItem, activeSection === item.id && styles.menuItemOpen]}
                    onPress={() => toggleSection(item.id)}
                  >
                    <View style={styles.menuItemLeft}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color="#08B0C9" />
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </View>
                    <Ionicons 
                      name={activeSection === item.id ? "chevron-up" : "chevron-forward"} 
                      size={18} 
                      color="#94A3B8" 
                    />
                  </TouchableOpacity>
                  
                  {activeSection === item.id && (
                    <View style={styles.collapsedContent}>
                      {renderSectionContent(item.id)}
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item.id)}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#08B0C9" />
                        <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
              <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chỉnh sửa</Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {editType === 'account' && (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Họ và tên</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={editData.fullName}
                      onChangeText={(val) => setEditData({...editData, fullName: val})}
                    />
                  </View>
                )}
                
                {editType === 'income' && (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Thu nhập mỗi tháng (VND)</Text>
                    <TextInput 
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={editData.incomeMonthly}
                      onChangeText={(val) => setEditData({...editData, incomeMonthly: val})}
                    />
                  </View>
                )}

                {editType === 'goals' && (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Chọn mục tiêu (Tối đa 3)</Text>
                    <View style={styles.optionsGrid}>
                      {GOAL_OPTIONS.map(opt => {
                        const isSelected = editData.goals?.includes(opt.code);
                        return (
                          <TouchableOpacity 
                            key={opt.code}
                            style={[styles.optBtn, isSelected && styles.optBtnActive]}
                            onPress={() => {
                              let newGoals = [...(editData.goals || [])];
                              if (isSelected) newGoals = newGoals.filter(g => g !== opt.code);
                              else if (newGoals.length < 3) newGoals.push(opt.code);
                              setEditData({...editData, goals: newGoals});
                            }}
                          >
                            <Text style={[styles.optBtnText, isSelected && styles.optBtnTextActive]}>{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {editType === 'ai' && (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Tên Trợ lý AI</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={editData.aiName}
                      onChangeText={(val) => setEditData({...editData, aiName: val})}
                    />
                    <Text style={[styles.inputLabel, {marginTop: 15}]}>Giọng điệu</Text>
                    <View style={styles.optionsRow}>
                      {TONE_OPTIONS.map(opt => (
                        <TouchableOpacity 
                          key={opt.code}
                          style={[styles.optBtn, editData.aiTone === opt.code && styles.optBtnActive]}
                          onPress={() => setEditData({...editData, aiTone: opt.code})}
                        >
                          <Text style={[styles.optBtnText, editData.aiTone === opt.code && styles.optBtnTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {editType === 'budget' && (
                  <View style={styles.editForm}>
                    <Text style={[styles.subtitle, {textAlign: 'left', marginBottom: 10}]}>Quy tắc ngân sách 50-30-20</Text>
                    
                    <View style={styles.sliderBlock}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Nhu cầu thiết yếu</Text>
                        <Text style={styles.sliderValue}>{editData.needsPct}%</Text>
                      </View>
                      <Slider
                        value={editData.needsPct}
                        onValueChange={handleNeedsChange}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        minimumTrackTintColor="#08B0C9"
                        maximumTrackTintColor="#E2E8F0"
                        thumbTintColor="#08B0C9"
                      />
                    </View>

                    <View style={[styles.sliderBlock, {marginTop: 10}]}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Nhu cầu cá nhân</Text>
                        <Text style={styles.sliderValue}>{editData.wantsPct}%</Text>
                      </View>
                      <Slider
                        value={editData.wantsPct}
                        onValueChange={handleWantsChange}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        minimumTrackTintColor="#08B0C9"
                        maximumTrackTintColor="#E2E8F0"
                        thumbTintColor="#08B0C9"
                      />
                    </View>

                    <View style={[styles.sliderBlock, {marginTop: 10}]}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Tiết kiệm (Tự động)</Text>
                        <Text style={styles.sliderValue}>{editData.savingsPct}%</Text>
                      </View>
                      <Slider
                        value={editData.savingsPct}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        disabled
                        minimumTrackTintColor="#94A3B8"
                        maximumTrackTintColor="#E2E8F0"
                        thumbTintColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}

                {editType === 'security' && (
                  <View style={styles.editForm}>
                    <TouchableOpacity 
                      style={styles.switchRow}
                      onPress={() => setEditData({...editData, mfaEnabled: !editData.mfaEnabled})}
                    >
                      <Text style={styles.inputLabel}>Bật Xác thực 2 lớp (MFA)</Text>
                      <MaterialCommunityIcons 
                        name={editData.mfaEnabled ? "toggle-switch" : "toggle-switch-off"} 
                        size={40} 
                        color={editData.mfaEnabled ? "#08B0C9" : "#CBD5E1"} 
                      />
                    </TouchableOpacity>
                    
                    {editData.mfaEnabled && (
                      <View style={{marginTop: 15}}>
                        <Text style={styles.inputLabel}>Phương thức xác thực</Text>
                        {AUTH_OPTIONS.map(opt => (
                          <TouchableOpacity 
                            key={opt.code}
                            style={[styles.optBtnLarge, editData.authMethod === opt.code && styles.optBtnActive]}
                            onPress={() => setEditData({...editData, authMethod: opt.code})}
                          >
                            <Text style={[styles.optBtnText, editData.authMethod === opt.code && styles.optBtnTextActive]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.saveBtn} onPress={startSaveProcess} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Double Confirmation Modal */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmHeader}>
              <MaterialCommunityIcons 
                name={confirmModal.step === 1 ? "help-circle-outline" : "alert-circle-outline"} 
                size={48} 
                color={confirmModal.step === 1 ? "#08B0C9" : "#EF4444"} 
              />
            </View>
            <Text style={styles.confirmTitle}>Xác nhận cập nhật?</Text>
            <Text style={styles.confirmDesc}>
              Bạn có chắc chắn muốn thay đổi thông tin này trong hệ thống không?
            </Text>
            
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setConfirmModal({ visible: false, step: 1 })}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn} 
                onPress={executeSave}
              >
                <Text style={styles.confirmBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  backToHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    width: 100, // Matching the placeholder on the right for symmetry
  },
  backToHomeText: {
    fontSize: 13,
    color: '#08B0C9',
    marginLeft: -4,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSummary: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#08B0C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#08B0C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarLargeText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  menuList: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  menuItemContainer: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemOpen: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  collapsedContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionInner: {
    gap: 12,
    marginBottom: 16,
  },
  rowLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  rowValue: {
    fontSize: 15,
    color: '#1E293B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  rowValueDisabled: {
    fontSize: 15,
    color: '#94A3B8',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  tagText: {
    fontSize: 12,
    color: '#0891B2',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  pctRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pctBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  pctLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  pctValue: {
    fontSize: 18,
    color: '#08B0C9',
    fontWeight: 'bold',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#08B0C9',
  },
  editBtnText: {
    color: '#08B0C9',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  editForm: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    fontSize: 15,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optBtnLarge: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  optBtnActive: {
    backgroundColor: '#08B0C9',
    borderColor: '#08B0C9',
  },
  optBtnText: {
    fontSize: 14,
    color: '#64748B',
  },
  optBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#08B0C9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderBlock: {
    gap: 6,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#475569',
  },
  sliderValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },

  // Confirmation Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 30,
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  confirmHeader: {
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  confirmDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#08B0C9',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
