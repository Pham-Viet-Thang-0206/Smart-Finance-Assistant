import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';

const GOAL_LABELS: Record<string, string> = {
  emergency: 'Quỹ khẩn cấp',
  home: 'Mua nhà/đất',
  travel: 'Du lịch',
  learn: 'Học tập/Nâng cao kỹ năng',
  invest: 'Đầu tư tài chính',
  retire: 'Hưu trí',
  debt: 'Trả nợ',
  startup: 'Khởi nghiệp',
};

const TONE_LABELS: Record<string, string> = {
  friendly: 'Bạn thân',
  pro: 'Chuyên nghiệp',
  mentor: 'Mentor',
};

const AUTH_LABELS: Record<string, string> = {
  biometric: 'Sinh trắc học',
  pin: 'Mã PIN 6 số',
  none: 'Tắt MFA',
};

export default function OnboardingSummaryScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  useEffect(() => {
    const fetchData = async () => {
      const email = params.email ? String(params.email) : '';

      if (!email) {
        setMessage('Thiếu email người dùng.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/onboarding?email=${encodeURIComponent(email)}`
        );
        const data = await response.json();
        if (!response.ok || !data?.exists) {
          setMessage(data?.message ?? 'Chưa có dữ liệu khảo sát.');
          return;
        }
        setSummary(data);
      } catch (error) {
        setMessage('Không kết nối được máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, params.email]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Thông tin khảo sát</Text>
          <Text style={styles.subtitle}>Dưới đây là dữ liệu bạn đã hoàn tất</Text>
        </View>

        {loading && <Text style={styles.message}>Đang tải...</Text>}
        {!loading && message && <Text style={styles.message}>{message}</Text>}

        {!loading && summary && (
          <View style={styles.card}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
              <Text style={styles.rowText}>Họ tên: {summary.user?.fullName ?? '-'}</Text>
              <Text style={styles.rowText}>Email: {summary.user?.email ?? '-'}</Text>
              <Text style={styles.rowText}>Số điện thoại: {summary.user?.phone ?? '-'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thu nhập & Mục tiêu</Text>
              <Text style={styles.rowText}>
                Thu nhập trung bình/tháng: {summary.onboarding?.incomeMonthly ?? 0} VND
              </Text>
              <Text style={styles.rowText}>
                Mục tiêu:{' '}
                {(summary.goals ?? []).map((g: string) => GOAL_LABELS[g] ?? g).join(', ') || '-'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cài đặt AI & Ngân sách</Text>
              <Text style={styles.rowText}>AI Coach: {summary.onboarding?.aiName ?? '-'}</Text>
              <Text style={styles.rowText}>
                Giọng điệu: {TONE_LABELS[summary.onboarding?.aiTone] ?? '-'}
              </Text>
              <Text style={styles.rowText}>
                Nhu cầu thiết yếu: {summary.onboarding?.needsPct ?? 0}%
              </Text>
              <Text style={styles.rowText}>
                Nhu cầu cá nhân: {summary.onboarding?.wantsPct ?? 0}%
              </Text>
              <Text style={styles.rowText}>
                Tiết kiệm: {summary.onboarding?.savingsPct ?? 0}%
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bảo mật</Text>
              <Text style={styles.rowText}>
                MFA: {summary.onboarding?.mfaEnabled ? 'Bật' : 'Tắt'}
              </Text>
              <Text style={styles.rowText}>
                Phương thức: {AUTH_LABELS[summary.onboarding?.authMethod] ?? '-'}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            const email = params.email ? String(params.email) : '';
            router.replace(email ? `/home?email=${encodeURIComponent(email)}` : '/home');
          }}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Quay lại trang chính</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            router.replace('/(tabs)');
          }}>
          <MaterialCommunityIcons name="logout" size={18} color="#0F172A" />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBFD',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
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
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  message: {
    textAlign: 'center',
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  rowText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'Avenir Next',
    }),
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#08B0C9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
  logoutButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'Avenir Next',
    }),
  },
});
