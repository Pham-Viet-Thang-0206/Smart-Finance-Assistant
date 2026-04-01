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
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const router = useRouter();

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const isIOS = Platform.OS === 'ios';

  const validate = () => {
    const nextErrors = {
      fullName: fullName.trim() ? '' : 'Vui lòng nhập họ và tên.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Email không hợp lệ.',
      phone: /^\+?\d{9,15}$/.test(phone.replace(/[\s\-().]/g, ''))
        ? ''
        : 'Số điện thoại không hợp lệ.',
      password:
        password.length >= 8 && password.length <= 72
          ? ''
          : 'Mật khẩu phải từ 8 đến 72 ký tự.',
      passwordConfirm: passwordConfirm === password ? '' : 'Mật khẩu nhập lại không khớp.',
    };

    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => value === '');
  };

  const handleRegister = async () => {
    if (isSubmitting) return;
    setMessage('');
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
          passwordConfirm,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? 'Đăng ký thất bại.');
        return;
      }

      setMessage('Đăng ký thành công. Hãy đăng nhập.');
      setPassword('');
      setPasswordConfirm('');
      setTimeout(() => {
        router.replace('/');
      }, 1200);
    } catch (error) {
      setMessage('Không kết nối được máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitle}>Vui lòng điền đầy đủ thông tin để đăng ký</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={[styles.input, fieldErrors.fullName && styles.inputError]}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
          />
          {!!fieldErrors.fullName && <Text style={styles.errorText}>{fieldErrors.fullName}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            placeholder="example@email.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {!!fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={[styles.input, fieldErrors.phone && styles.inputError]}
            placeholder="0901234567"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {!!fieldErrors.phone && <Text style={styles.errorText}>{fieldErrors.phone}</Text>}

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={[styles.passwordField, fieldErrors.password && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

          <Text style={styles.label}>Nhập lại mật khẩu</Text>
          <View style={[styles.passwordField, fieldErrors.passwordConfirm && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirmPassword}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.passwordConfirm && (
            <Text style={styles.errorText}>{fieldErrors.passwordConfirm}</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
            </Text>
          </TouchableOpacity>
        </View>

        {!!message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản?</Text>
          <Link href="/" style={styles.footerLink}>
            Đăng nhập
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
    paddingTop: 26,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 20,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    marginTop: -2,
    color: '#EF4444',
    fontSize: 12,
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
