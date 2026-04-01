import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { API_BASE_URL } from '@/constants/api';

const GOALS = [
  { code: 'emergency', label: 'Quỹ khẩn cấp', icon: 'shield' },
  { code: 'home', label: 'Mua nhà/đất', icon: 'home' },
  { code: 'travel', label: 'Du lịch', icon: 'airplane' },
  { code: 'learn', label: 'Học tập/Nâng cao kỹ năng', icon: 'school' },
  { code: 'invest', label: 'Đầu tư tài chính', icon: 'trending-up' },
  { code: 'retire', label: 'Hưu trí', icon: 'hourglass' },
  { code: 'debt', label: 'Trả nợ', icon: 'card' },
  { code: 'startup', label: 'Khởi nghiệp', icon: 'briefcase' },
];

const TONES = [
  { value: 'friendly', label: 'Bạn thân', desc: 'Thân thiện, gần gũi' },
  { value: 'pro', label: 'Chuyên nghiệp', desc: 'Lịch sự, chính thống' },
  { value: 'mentor', label: 'Mentor', desc: 'Động viên, truyền cảm hứng' },
];

const AUTH_METHODS = [
  { value: 'biometric', label: 'Sinh trắc học', desc: 'Vân tay hoặc Face ID (Khuyến nghị)' },
  { value: 'pin', label: 'Mã PIN 6 số', desc: 'Tạo mã PIN để bảo vệ tài khoản' },
];

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState(1);
  const [incomeMonthly, setIncomeMonthly] = useState('');
  const [email, setEmail] = useState(() => (params.email ? String(params.email) : ''));
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [aiName, setAiName] = useState('MoneeBot');
  const [aiTone, setAiTone] = useState('friendly');
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const savingsPct = useMemo(() => Math.max(0, 100 - needsPct - wantsPct), [needsPct, wantsPct]);
  const [authMethod, setAuthMethod] = useState('biometric');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const progress = useMemo(() => Math.round((step / 4) * 100), [step]);
  const isIOS = Platform.OS === 'ios';

  const toggleGoal = (code: string) => {
    setSelectedGoals((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const handleNext = async () => {
    if (step < 4) {
      setMessage('');
      setStep((prev) => prev + 1);
      return;
    }

    if (isSubmitting) return;
    setMessage('');
    if (!email.trim()) {
      setMessage('Vui lòng nhập email tài khoản.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          incomeMonthly: Number.isFinite(Number(incomeMonthly)) ? Number(incomeMonthly) : 0,
          goals: selectedGoals,
          aiName,
          aiTone,
          needsPct,
          wantsPct,
          savingsPct,
          authMethod: mfaEnabled ? authMethod : 'none',
          mfaEnabled,
          pin: mfaEnabled && authMethod === 'pin' && /^\\d{6}$/.test(pin) ? pin : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? 'Không lưu được lựa chọn.');
        return;
      }

      setMessage('Hoàn tất thiết lập.');
      const encodedEmail = encodeURIComponent(email);
      setTimeout(() => router.replace(`/home?email=${encodedEmail}`), 1200);
    } catch (error) {
      setMessage('Không kết nối được máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      return;
    }
    router.replace('/');
  };

  const handleNeedsChange = (value: number) => {
    const nextNeeds = Math.round(value);
    let nextWants = wantsPct;
    if (nextNeeds + nextWants > 100) {
      nextWants = Math.max(0, 100 - nextNeeds);
    }
    setNeedsPct(nextNeeds);
    setWantsPct(nextWants);
  };

  const handleWantsChange = (value: number) => {
    const nextWants = Math.round(value);
    let nextNeeds = needsPct;
    if (nextNeeds + nextWants > 100) {
      nextNeeds = Math.max(0, 100 - nextWants);
    }
    setNeedsPct(nextNeeds);
    setWantsPct(nextWants);
  };

  const content = (
    <>
      <View style={styles.progressRow}>
          <Text style={styles.progressText}>Bước {step} / 4</Text>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.card}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <View style={styles.stepBlock}>
              <View style={styles.centerIcon}>
                <Ionicons name="sparkles" size={22} color="#0EA5E9" />
              </View>
              <Text style={styles.title}>Chào mừng đến với Monee!</Text>
              <Text style={styles.subtitle}>
                Để Mon tư vấn chính xác hơn, hãy cho mình biết thu nhập của bạn
              </Text>

              <Text style={styles.label}>Thu nhập trung bình/tháng (VND)</Text>
              <TextInput
                style={styles.input}
                value={incomeMonthly}
                onChangeText={setIncomeMonthly}
                keyboardType="numeric"
                placeholder="15000000"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Email tài khoản</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="example@email.com"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.noteRow}>
                <MaterialCommunityIcons name="lock-outline" size={16} color="#0EA5E9" />
                <Text style={styles.noteText}>
                  Thông tin của bạn được mã hóa và bảo mật tuyệt đối
                </Text>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepBlock}>
              <View style={styles.centerIcon}>
                <Ionicons name="radio-button-on" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.title}>Mục tiêu tài chính</Text>
              <Text style={styles.subtitle}>Bạn có thể chọn bao nhiêu mục tiêu tùy thích</Text>

              <View style={styles.goalGrid}>
                {GOALS.map((goal) => {
                  const isActive = selectedGoals.includes(goal.code);
                  return (
                    <TouchableOpacity
                      key={goal.code}
                      style={[styles.goalCard, isActive && styles.goalCardActive]}
                      onPress={() => toggleGoal(goal.code)}>
                      <Ionicons
                        name={goal.icon as never}
                        size={20}
                        color={isActive ? '#0EA5E9' : '#94A3B8'}
                      />
                      <Text style={[styles.goalText, isActive && styles.goalTextActive]}>
                        {goal.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.goalCount}>Đã chọn: {selectedGoals.length}</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepBlock}>
              <View style={styles.centerIcon}>
                <Ionicons name="sparkles-outline" size={22} color="#06B6D4" />
              </View>
              <Text style={styles.title}>Cài đặt & Nhắc nhở</Text>
              <Text style={styles.subtitle}>Cá nhân hóa trợ lý AI và thông báo</Text>

              <Text style={styles.label}>Tên của AI Coach</Text>
              <TextInput
                style={styles.input}
                value={aiName}
                onChangeText={setAiName}
                placeholder="MoneeBot"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Giọng điệu</Text>
              <View style={styles.toneList}>
                {TONES.map((tone) => {
                  const isActive = tone.value === aiTone;
                  return (
                    <TouchableOpacity
                      key={tone.value}
                      style={[styles.toneCard, isActive && styles.toneCardActive]}
                      onPress={() => setAiTone(tone.value)}>
                      <View style={styles.toneHeader}>
                        <View style={[styles.dot, isActive && styles.dotActive]} />
                        <Text style={styles.toneTitle}>{tone.label}</Text>
                      </View>
                      <Text style={styles.toneDesc}>{tone.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Quy tắc ngân sách 50-30-20</Text>
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Nhu cầu thiết yếu</Text>
                  <Text style={styles.sliderValue}>{needsPct}%</Text>
                </View>
                <Slider
                  value={needsPct}
                  onValueChange={handleNeedsChange}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E2E8F0"
                  thumbTintColor="#0EA5E9"
                />
              </View>
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Nhu cầu cá nhân</Text>
                  <Text style={styles.sliderValue}>{wantsPct}%</Text>
                </View>
                <Slider
                  value={wantsPct}
                  onValueChange={handleWantsChange}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E2E8F0"
                  thumbTintColor="#0EA5E9"
                />
              </View>
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Tiết kiệm</Text>
                  <Text style={styles.sliderValue}>{savingsPct}%</Text>
                </View>
                <Slider
                  value={savingsPct}
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

          {step === 4 && (
            <View style={styles.stepBlock}>
              <View style={styles.centerIcon}>
                <Ionicons name="shield-checkmark" size={22} color="#F97316" />
              </View>
              <Text style={styles.title}>Bảo mật tài khoản</Text>
              <Text style={styles.subtitle}>Chọn phương thức xác thực</Text>

              <View style={styles.toneList}>
                {AUTH_METHODS.filter((method) => mfaEnabled || method.value !== 'biometric').map(
                  (method) => {
                    const isActive = method.value === authMethod;
                    return (
                      <TouchableOpacity
                        key={method.value}
                        style={[styles.toneCard, isActive && styles.toneCardActive]}
                        onPress={() => setAuthMethod(method.value)}>
                        <View style={styles.toneHeader}>
                          <View style={[styles.dot, isActive && styles.dotActive]} />
                          <Text style={styles.toneTitle}>{method.label}</Text>
                        </View>
                        <Text style={styles.toneDesc}>{method.desc}</Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <TouchableOpacity
                style={[styles.mfaCard, mfaEnabled && styles.mfaCardActive]}
                onPress={() => {
                  setMfaEnabled((prev) => {
                    const next = !prev;
                    if (!next) {
                      setAuthMethod('none');
                      setPin('');
                    } else if (authMethod === 'none') {
                      setAuthMethod('biometric');
                    }
                    return next;
                  });
                }}>
                <MaterialCommunityIcons
                  name="shield-star-outline"
                  size={20}
                  color={mfaEnabled ? '#F59E0B' : '#94A3B8'}
                />
                <Text style={styles.mfaText}>
                  Bật xác thực 2 lớp (MFA) để bảo vệ tài khoản tốt hơn
                </Text>
              </TouchableOpacity>

              {mfaEnabled && authMethod === 'pin' && (
                <View style={styles.pinBlock}>
                  <Text style={styles.label}>Mã PIN 6 số</Text>
                  <TextInput
                    style={styles.input}
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="******"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleNext}
              disabled={isSubmitting}>
              <Text style={styles.primaryText}>
                {step < 4 ? 'Tiếp tục' : isSubmitting ? 'Đang lưu...' : 'Hoàn tất'}
              </Text>
            </TouchableOpacity>
          </View>

          {!!message && <Text style={styles.message}>{message}</Text>}
        </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isIOS ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={12}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.container}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBFD',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F172A',
  },
  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  stepBlock: {
    gap: 12,
  },
  centerIcon: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  label: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  noteText: {
    fontSize: 12,
    color: '#0EA5E9',
    flex: 1,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  goalCardActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  goalText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  goalTextActive: {
    color: '#0EA5E9',
  },
  goalCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  toneList: {
    gap: 10,
  },
  toneCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  toneCardActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  toneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dotActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  toneTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  toneDesc: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
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
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  sliderValue: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  mfaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  mfaCardActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  mfaText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  pinBlock: {
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#08B0C9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  message: {
    textAlign: 'center',
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
});

