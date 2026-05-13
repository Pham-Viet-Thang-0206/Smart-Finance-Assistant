import React, { useMemo } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface CategoryData {
  name: string;
  amount: number;
  percent: number;
}

interface TransactionData {
  occurred_at: string;
  category: string;
  amount: number | string;
  note?: string;
  type: 'income' | 'expense';
}

interface ReportData {
  year: number;
  month: number;
  tIncome: number;
  tExpense: number;
  savings: number;
  avgDaily: number;
  categories: CategoryData[];
  topTxs: TransactionData[];
  monthTxs: TransactionData[];
}

interface FinancialReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  userName: string;
}

export function FinancialReportModal({ visible, onClose, reportData, userName }: FinancialReportModalProps) {
  if (!reportData) return null;

  // Process data for charts
  const { dailyLabels, dailyValues, incomeValues, budgetValues, pieData } = useMemo(() => {
    const daysInMonth = new Date(reportData.year, reportData.month, 0).getDate();
    const dailyMap = new Map<number, number>();
    const incomeMap = new Map<number, number>();
    
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap.set(i, 0);
      incomeMap.set(i, 0);
    }

    let cumulativeIncome = 0;
    reportData.monthTxs.forEach(tx => {
      const d = new Date(tx.occurred_at);
      const day = d.getDate();
      if (tx.type === 'expense') {
        dailyMap.set(day, (dailyMap.get(day) || 0) + Number(tx.amount));
      } else if (tx.type === 'income') {
        incomeMap.set(day, (incomeMap.get(day) || 0) + Number(tx.amount));
      }
    });

    const incomeValues: number[] = [];
    const dailyValues: number[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      cumulativeIncome += incomeMap.get(i) || 0;
      incomeValues.push(cumulativeIncome);
      dailyValues.push(dailyMap.get(i) || 0);
    }

    const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return day === 1 || day % 5 === 0 || day === daysInMonth ? day.toString() : '';
    });

    // Budget line: using total income or a standard reference
    const budgetValues = new Array(daysInMonth).fill(reportData.tIncome * 0.8);

    const colors = ['#07B8C8', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];
    const pieData = reportData.categories.map((c, i) => ({
      name: `${c.name} (${c.percent.toFixed(1)}%)`,
      population: c.amount,
      color: colors[i % colors.length],
      legendFontColor: '#475569',
      legendFontSize: 12,
    }));

    return { dailyLabels, dailyValues, incomeValues, budgetValues, pieData };
  }, [reportData]);

  const formatYAxisLabel = (value: string) => {
    const num = Number(value);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return value;
  };

  const exportToPdf = async () => {
    const categoryLabels = JSON.stringify(reportData.categories.map(c => `${c.name} (${c.percent.toFixed(1)}%)`));
    const categoryValues = JSON.stringify(reportData.categories.map(c => c.amount));
    const daysInMonth = dailyValues.length;
    const dailyChartLabels = JSON.stringify(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    // HTML Template for A4 PDF with Chart.js
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1E293B; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #F1F5F9; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #07B8C8; margin: 0; font-size: 24px; }
            .header p { color: #64748B; margin: 5px 0 0 0; font-size: 14px; }
            .section-title { font-size: 18px; font-weight: 700; margin: 30px 0 15px 0; border-left: 4px solid #07B8C8; padding-left: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .card { background: #F8FAFC; border: 1px solid #F1F5F9; padding: 15px; border-radius: 12px; }
            .card-label { font-size: 12px; color: #64748B; }
            .card-value { font-size: 18px; font-weight: 700; margin-top: 5px; }
            .chart-container { margin-bottom: 40px; height: 350px; width: 100%; position: relative; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
            th { background: #F8FAFC; color: #64748B; font-weight: 600; }
            .ai-box { background: #ECFEFF; border: 1px solid #A5F3FC; padding: 20px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>BÁO CÁO CHI TIÊU</h1>
              <p>Tháng ${String(reportData.month).padStart(2, '0')}/${reportData.year}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-weight: 600; margin: 0;">Người dùng: ${userName}</p>
              <p style="font-size: 12px; color: #64748B; margin-top: 4px;">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div class="section-title">1. Tổng quan tài chính</div>
          <div class="grid">
            <div class="card"><div class="card-label">Tổng thu nhập</div><div class="card-value" style="color:#10B981">+${new Intl.NumberFormat('vi-VN').format(reportData.tIncome)}₫</div></div>
            <div class="card"><div class="card-label">Tổng chi tiêu</div><div class="card-value" style="color:#EF4444">-${new Intl.NumberFormat('vi-VN').format(reportData.tExpense)}₫</div></div>
            <div class="card"><div class="card-label">Tiết kiệm ròng</div><div class="card-value" style="color:#0EA5E9">${new Intl.NumberFormat('vi-VN').format(reportData.savings)}₫</div></div>
            <div class="card"><div class="card-label">Trung bình ngày</div><div class="card-value">${new Intl.NumberFormat('vi-VN').format(Math.round(reportData.avgDaily))}₫</div></div>
          </div>

          <div class="section-title">2. Phân bổ theo danh mục</div>
          <div class="chart-container">
            <canvas id="categoryChart"></canvas>
          </div>

          <div class="section-title">3. Giao dịch tiêu biểu</div>
          <table>
            <thead><tr><th>Ngày</th><th>Danh mục</th><th style="text-align:right">Số tiền</th></tr></thead>
            <tbody>
              ${reportData.topTxs.map(t => `
                <tr>
                  <td>${new Date(t.occurred_at).getDate()}/${new Date(t.occurred_at).getMonth() + 1}</td>
                  <td>${t.category}</td>
                  <td style="text-align:right; color:#EF4444">-${new Intl.NumberFormat('vi-VN').format(Number(t.amount))}₫</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">4. Xu hướng tài chính</div>
          <div class="chart-container">
            <canvas id="trendChart"></canvas>
          </div>

          <div class="section-title">Phân tích từ MoneeBot</div>
          <div class="ai-box">
            <p>• Danh mục <b>${reportData.categories[0]?.name || 'Khác'}</b> chiếm <b>${reportData.categories[0]?.percent.toFixed(1) || 0}%</b> tổng chi tiêu.</p>
            <p>• Bạn tiết kiệm được <b>${reportData.tIncome > 0 ? ((reportData.savings / reportData.tIncome) * 100).toFixed(1) : 0}%</b> thu nhập tháng này.</p>
            <p>• ${reportData.tExpense > reportData.tIncome ? '⚠️ <b>Cảnh báo:</b> Chi tiêu của bạn đang vượt quá thu nhập.' : '✅ <b>Tích cực:</b> Tình hình tài chính của bạn đang ổn định.'}</p>
          </div>

          <script>
            const catCtx = document.getElementById('categoryChart').getContext('2d');
            new Chart(catCtx, {
              type: 'pie',
              data: {
                labels: ${categoryLabels},
                datasets: [{
                  data: ${categoryValues},
                  backgroundColor: ['#07B8C8', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                }]
              },
              options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { 
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 10 } }
                  } 
                } 
              }
            });

            const trendCtx = document.getElementById('trendChart').getContext('2d');
            new Chart(trendCtx, {
              type: 'line',
              data: {
                labels: ${dailyChartLabels},
                datasets: [
                  {
                    label: 'Thu nhập',
                    data: ${JSON.stringify(incomeValues)},
                    borderColor: 'rgba(34, 197, 94, 0.6)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                  },
                  {
                    label: 'Chi tiêu',
                    data: ${JSON.stringify(dailyValues)},
                    borderColor: 'rgba(249, 115, 22, 0.6)',
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    fill: true,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0
                  },
                  {
                    label: 'Ngân sách',
                    data: ${JSON.stringify(budgetValues)},
                    borderColor: 'rgba(14, 165, 233, 0.5)',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                  }
                ]
              },
              options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }
                } 
              }
            });
          </script>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xuất PDF.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xem trước Báo cáo</Text>
          <TouchableOpacity onPress={exportToPdf} style={styles.shareBtn}>
            <LinearGradient colors={['#07B8C8', '#0EA5E9']} style={styles.shareGradient}>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareText}>PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageCard}>
            <View style={styles.reportTitleRow}>
              <View>
                <Text style={styles.reportMainTitle}>BÁO CÁO THÁNG {String(reportData.month).padStart(2, '0')}/{reportData.year}</Text>
                <View style={styles.userRow}>
                  <Ionicons name="person-circle" size={16} color="#64748B" />
                  <Text style={styles.userText}>{userName}</Text>
                  <Text style={styles.dateText}> • {new Date().toLocaleDateString('vi-VN')}</Text>
                </View>
              </View>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>1. Tổng quan tài chính</Text>
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Tổng thu</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>+{new Intl.NumberFormat('vi-VN').format(reportData.tIncome)}₫</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Tổng chi</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>-{new Intl.NumberFormat('vi-VN').format(reportData.tExpense)}₫</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Tiết kiệm</Text>
                <Text style={[styles.statValue, { color: '#0EA5E9' }]}>{new Intl.NumberFormat('vi-VN').format(reportData.savings)}₫</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TB ngày</Text>
                <Text style={styles.statValue}>{new Intl.NumberFormat('vi-VN').format(Math.round(reportData.avgDaily))}₫</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>2. Phân bổ danh mục</Text>
            <PieChart
              data={pieData}
              width={screenWidth - 40}
              height={300}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />

            <Text style={styles.sectionTitle}>3. Giao dịch tiêu biểu</Text>
            <View style={styles.table}>
              {reportData.topTxs.map((t, index) => {
                const d = new Date(t.occurred_at);
                return (
                  <View key={index} style={[styles.tableRow, index === reportData.topTxs.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.dateCell}>{String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}</Text>
                    <Text style={styles.catCell} numberOfLines={1}>{t.category}</Text>
                    <Text style={styles.amountCell}>-{new Intl.NumberFormat('vi-VN').format(Number(t.amount))}₫</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>4. Xu hướng tài chính</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: dailyLabels,
                  datasets: [
                    { data: incomeValues, color: () => 'rgba(34, 197, 94, 0.8)', strokeWidth: 2 },
                    { data: dailyValues, color: () => 'rgba(249, 115, 22, 0.8)', strokeWidth: 2 },
                    { data: budgetValues, color: () => 'rgba(14, 165, 233, 0.6)', strokeWidth: 1, withDots: false },
                  ]
                }}
                width={(screenWidth * 3) / 5} 
                height={275}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                  propsForDots: { r: "0" },
                  propsForBackgroundLines: { strokeDasharray: '3 6', stroke: '#E2E8F0', strokeWidth: 1 },
                }}
                formatYLabel={formatYAxisLabel}
                bezier
                style={{ marginVertical: 10, borderRadius: 16, backgroundColor: '#ffffff' }}
                withDots={false}
                withShadow={false}
                withHorizontalLines={true}
                withVerticalLines={false}
              />

              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 197, 94, 0.8)' }]} />
                  <Text style={styles.legendText}>Thu nhập</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(249, 115, 22, 0.8)' }]} />
                  <Text style={styles.legendText}>Chi tiêu</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(14, 165, 233, 0.6)', borderRadius: 0, height: 2, width: 12 }]} />
                  <Text style={styles.legendText}>Ngân sách</Text>
                </View>
              </View>
            </View>

            <View style={styles.aiBox}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={16} color="#0891B2" />
                <Text style={styles.aiTitle}>Phân tích từ MoneeBot</Text>
              </View>
              <Text style={styles.aiText}>• Chi tiêu "{reportData.categories[0]?.name || 'Khác'}" chiếm {reportData.categories[0]?.percent.toFixed(1) || 0}%.</Text>
              <Text style={styles.aiText}>• Bạn tiết kiệm được {reportData.tIncome > 0 ? ((reportData.savings / reportData.tIncome) * 100).toFixed(1) : 0}% thu nhập.</Text>
              <Text style={[styles.aiText, { fontWeight: '600', color: reportData.tExpense > reportData.tIncome ? '#BE123C' : '#0891B2' }]}>
                {reportData.tExpense > reportData.tIncome ? '⚠️ Bạn đang chi tiêu vượt mức thu nhập.' : '✅ Tài chính của bạn đang rất ổn định.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { borderRadius: 20, overflow: 'hidden' },
  shareGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  shareText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  pageCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  reportTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reportMainTitle: { fontSize: 20, color: '#0F172A', fontWeight: '800' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  userText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  dateText: { fontSize: 13, color: '#94A3B8' },
  premiumBadge: { backgroundColor: '#07B8C8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  premiumBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  sectionTitle: { fontSize: 15, color: '#0F172A', fontWeight: '700', marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  table: { backgroundColor: '#F8FAFC', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dateCell: { flex: 1, fontSize: 12, color: '#64748B' },
  catCell: { flex: 2, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  amountCell: { flex: 1.5, fontSize: 13, textAlign: 'right', color: '#EF4444', fontWeight: '600' },
  aiBox: { backgroundColor: '#ECFEFF', padding: 16, borderRadius: 12, gap: 6, marginTop: 10 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  aiTitle: { fontSize: 14, color: '#0891B2', fontWeight: '700' },
  aiText: { fontSize: 12, color: '#155E75', lineHeight: 18 },
  chartContainer: { alignItems: 'center', width: '100%' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#475569', fontWeight: '600' },
});
