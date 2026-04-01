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
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [activeMethod, setActiveMethod] = useState<'email' | 'phone'>('email');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const isIOS = Platform.OS === 'ios';

  const methodLabel = useMemo(
    () => (activeMethod === 'email' ? 'Email' : 'Số điện thoại'),
    [activeMethod]
  );

  const handleLogin = async () => {
    if (isSubmitting) return;
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginValue,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? 'Đăng nhập thất bại.');
        return;
      }

      setMessage('Đăng nhập thành công.');
      const resolvedEmail = data?.email ?? loginValue;
      const encodedEmail = encodeURIComponent(resolvedEmail);

      const onboardingResponse = await fetch(
        `${apiBaseUrl}/api/onboarding?email=${encodedEmail}`
      );
      const onboardingData = await onboardingResponse.json();

      if (onboardingResponse.ok && onboardingData?.exists) {
        router.replace(`/home?email=${encodedEmail}`);
        return;
      }

      setTimeout(() => {
        router.replace(`/onboarding?email=${encodedEmail}`);
      }, 200);
  } catch (error) {
      setMessage(`Không kết nối được máy chủ. ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: (Platform.OS === 'web' ? 48 : 36) + insets.top },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Ionicons name="sparkles" size={20} color="#13B6D3" />
            <Text style={styles.logoText}>Monee</Text>
          </View>
          <Text style={styles.subtitle}>Trợ lý tài chính thông minh của bạn</Text>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segmentButton, activeMethod === 'email' && styles.segmentActive]}
            onPress={() => setActiveMethod('email')}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={activeMethod === 'email' ? '#0F172A' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentText,
                activeMethod === 'email' && styles.segmentTextActive,
              ]}>
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeMethod === 'phone' && styles.segmentActive]}
            onPress={() => setActiveMethod('phone')}>
            <Ionicons
              name="call-outline"
              size={16}
              color={activeMethod === 'phone' ? '#0F172A' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentText,
                activeMethod === 'phone' && styles.segmentTextActive,
              ]}>
              Số điện thoại
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{methodLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#94A3B8"
            keyboardType={activeMethod === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            value={loginValue}
            onChangeText={setLoginValue}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible((prev) => !prev)}>
              <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>
        </View>

        {!!message && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.debugText}>API: {apiBaseUrl}</Text>

        <View style={styles.securityBadge}>
          <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#0EA5E9" />
          <Text style={styles.securityText}>Bảo mật bằng mã hóa AES-256</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản?</Text>
          <Link href="/register" style={styles.footerLink}>
            Đăng ký ngay
          </Link>
        </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <View style={styles.bgOrbLarge} />
        <View style={styles.bgOrbSmall} />
      </View>

      {isIOS ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={12}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBFD',
  },
  flex: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E3F5FA',
    top: -110,
    right: -110,
  },
  bgOrbSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EAF7FA',
    bottom: -80,
    left: -70,
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#EAF4F8',
    borderRadius: 20,
    padding: 4,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 16,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentText: {
    fontSize: 13,
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
  form: {
    gap: 10,
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
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#08B0C9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  message: {
    marginTop: 14,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 13,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  debugText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  securityBadge: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  securityText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  footerLink: {
    fontSize: 13,
    color: '#0EA5E9',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
});
