import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { paymentAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const response = await paymentAPI.getUserPayments(session.userId);
      const data = response.payments || response.data || response || [];
      const sorted = [...data].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(sorted);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.userId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return <CheckCircle size={20} color={Colors.successGreen} />;
      case 'failed': return <XCircle size={20} color={Colors.errorRed} />;
      default: return <Clock size={20} color={Colors.warningYellow} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: Colors.successBg, text: Colors.successGreen };
      case 'failed': return { bg: Colors.errorBg, text: Colors.errorRed };
      default: return { bg: Colors.warningBg, text: Colors.warningYellow };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderPayment = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.paymentIcon}>
            <CreditCard size={24} color={Colors.primaryOrange} />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentType}>
              {item.paymentType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Payment'}
            </Text>
            <View style={styles.dateRow}>
              <Calendar size={14} color={Colors.textMuted} />
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₱{item.amount?.toFixed(2) || '0.00'}</Text>
          </View>
          {item.method && (
            <View style={styles.methodRow}>
              <Text style={styles.methodLabel}>Method:</Text>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>{item.method.toUpperCase()}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <Header title="Payment History" showBack onRefresh={loadPayments} />
      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={payments}
          keyExtractor={item => item._id}
          renderItem={renderPayment}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} tintColor={Colors.primaryOrange} />}
          ListEmptyComponent={
            <EmptyState
              icon={<CreditCard size={64} color="#cbd5e0" />}
              title="No Payment History"
              message="You haven't made any payments yet"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgLight },
  listContent: { padding: 20 },
  card: { backgroundColor: Colors.bgWhite, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 12, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  paymentIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.lightOrangeBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentType: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textDark },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dateText: { fontSize: FontSize.sm, color: Colors.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'capitalize' },
  cardDetails: { borderTopWidth: 1, borderTopColor: Colors.borderColor, paddingTop: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  amountLabel: { fontSize: FontSize.md, color: Colors.textMuted },
  amountValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textDark },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodLabel: { fontSize: FontSize.md, color: Colors.textMuted },
  methodBadge: { backgroundColor: Colors.bgLight, paddingHorizontal: 10, paddingVertical: 2, borderRadius: BorderRadius.full },
  methodText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textDark },
});
