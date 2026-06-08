import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import database from '../database';
import { yojanaService } from '../services/apiService';

interface Milestone {
  name: string;
  pct: number;
  verified: boolean;
}

interface Transaction {
  id: string;
  milestone_index: number;
  utr_number: string;
  amount: number;
  status: string;
  farmer_confirmed: boolean;
  farmer_confirmed_at: string | null;
  processed_at: string;
}

interface Application {
  id: string;
  pond_id: string;
  pond_name: string;
  yojana_code: string;
  yojana_name: string;
  status: 'AWAITING_REVIEW' | 'DLC_QUEUE' | 'APPROVED' | 'MILESTONE_1_MET' | 'MILESTONE_2_MET' | 'REJECTED';
  approved_subsidy_amount: number;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
  transactions: Transaction[];
}

interface Scheme {
  code: string;
  name: string;
  subsidy: string;
  description: string;
  milestones: string[];
}

const SCHEMES: Scheme[] = [
  {
    code: 'JKSY',
    name: 'Jalkrishi Saurikaran (Solar Pump)',
    subsidy: '80% Subsidy (Up to ₹4,33,600)',
    description: 'Provides solar powered irrigation pumps for aquaculture operations, eliminating fossil fuel costs and reducing grid dependence.',
    milestones: [
      'Borewell & Foundation (40%)',
      'Solar panel & pump mount (40%)',
      'Post-Stocking validation (20%)',
    ],
  },
  {
    code: 'TMVSY',
    name: 'Talab Matsyiki Vishesh Sahayata',
    subsidy: '50% Subsidy (Up to ₹5,65,600)',
    description: 'Special assistance for pond development, dyke renovation, water supply installation, and seed/feed inputs.',
    milestones: [
      'Excavation & Dykes Renovation (50%)',
      'Water filling & Seed stocking (50%)',
    ],
  },
  {
    code: 'MPVY',
    name: 'Species Diversification Hatchery',
    subsidy: '60% Subsidy (Up to ₹3,000,000)',
    description: 'Assistance for setting up modern hatcheries for high-value species diversification (e.g. Scampi, Catfish, Sea Bass).',
    milestones: [
      'Initial Infrastructure Setup (50%)',
      'Stocking & Input Validation (50%)',
    ],
  },
];

export default function YojanaApplicationsScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const styles = getStyles(theme, isDark);

  const [activeTab, setActiveTab] = useState<'my_apps' | 'schemes'>('my_apps');
  const [applications, setApplications] = useState<Application[]>([]);
  const [ponds, setPonds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);

  // Apply Modal state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [selectedPondId, setSelectedPondId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch applications from backend
      const res = await yojanaService.listApplications();
      if (res.success) {
        setApplications(res.data);
      }

      // Fetch user ponds from local WatermelonDB
      const localPonds = await database.get<any>('ponds').query().fetch();
      setPonds(localPonds);
    } catch (err) {
      console.warn('[Yojana] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleApply = async () => {
    if (!selectedScheme || !selectedPondId) return;

    // Check if there is already an active application for this scheme on this pond
    const exists = applications.some(
      app => app.pond_id === selectedPondId && app.yojana_code === selectedScheme.code && app.status !== 'REJECTED'
    );

    if (exists) {
      Alert.alert(
        t('yojana.already_exists_title', 'Application Exists'),
        t('yojana.already_exists_msg', 'An active application for this scheme on this pond already exists.')
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await yojanaService.apply({
        pondId: selectedPondId,
        yojanaCode: selectedScheme.code,
      });

      if (res.success) {
        Alert.alert(
          t('yojana.apply_success_title', 'Application Submitted'),
          t('yojana.apply_success_msg', 'Your application has been received and is awaiting document review.')
        );
        setApplyModalVisible(false);
        setSelectedPondId('');
        setSelectedScheme(null);
        setActiveTab('my_apps');
        loadData();
      } else {
        Alert.alert(t('common.error', 'Error'), res.error || t('yojana.apply_failed', 'Failed to submit application.'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceipt = async (transactionId: string) => {
    setConfirmingTxId(transactionId);
    try {
      const res = await yojanaService.confirmReceipt(transactionId);
      if (res.success) {
        Alert.alert(
          t('yojana.confirm_success_title', 'Receipt Confirmed'),
          t('yojana.confirm_success_msg', 'Thank you! The Direct Benefit Transfer (DBT) receipt has been successfully verified.')
        );
        loadData();
      } else {
        Alert.alert(t('common.error', 'Error'), res.error || t('yojana.confirm_failed', 'Failed to confirm receipt.'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.response?.data?.error || err.message);
    } finally {
      setConfirmingTxId(null);
    }
  };

  const getStatusStyle = (status: Application['status']) => {
    switch (status) {
      case 'AWAITING_REVIEW':
        return { bg: '#fef3c7', text: '#d97706', label: 'Awaiting Review' };
      case 'DLC_QUEUE':
        return { bg: '#e0f2fe', text: '#0284c7', label: 'DLC Queue' };
      case 'APPROVED':
        return { bg: '#dcfce7', text: '#16a34a', label: 'Approved' };
      case 'MILESTONE_1_MET':
        return { bg: '#ccfbf1', text: '#0d9488', label: 'Milestone 1 Met' };
      case 'MILESTONE_2_MET':
        return { bg: '#dcfce7', text: '#15803d', label: 'Completed' };
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', label: status };
    }
  };

  const renderApplicationCard = ({ item }: { item: Application }) => {
    const statusStyle = getStatusStyle(item.status);
    const unconfirmedTx = item.transactions.find(tx => tx.status === 'SUCCESS' && !tx.farmer_confirmed);

    return (
      <View style={styles.appCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.schemeCodeText}>{item.yojana_code}</Text>
            <Text style={styles.yojanaNameText}>{item.yojana_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetail}>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.detailLabel}>Pond: <Text style={styles.detailValue}>{item.pond_name}</Text></Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.detailLabel}>Sanctioned Amount: <Text style={styles.detailValue}>₹{item.approved_subsidy_amount.toLocaleString('en-IN')}</Text></Text>
          </View>
        </View>

        {/* Milestones Checklists */}
        <View style={styles.milestonesSection}>
          <Text style={styles.sectionTitle}>Verification Milestones</Text>
          {item.milestones.map((m, idx) => (
            <View key={idx} style={styles.milestoneRow}>
              <View style={[styles.checkboxCircle, m.verified && styles.checkboxCircleChecked]}>
                {m.verified ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <View style={styles.checkboxCircleInner} />
                )}
              </View>
              <Text style={[styles.milestoneName, m.verified && styles.milestoneNameCompleted]}>
                {m.name} ({m.pct}%)
              </Text>
              {m.verified && (
                <Text style={styles.verifiedLabel}>Verified</Text>
              )}
            </View>
          ))}
        </View>

        {/* DBT Payout Warning Notification (Two-way Confirmation Loop) */}
        {unconfirmedTx && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertIconBg}>
                <Ionicons name="wallet" size={20} color={theme.colors.accent} />
              </View>
              <Text style={styles.alertTitle}>Direct Benefit Transfer Alert</Text>
            </View>
            <Text style={styles.alertBody}>
              Government record shows DBT payout of <Text style={styles.alertHighlight}>₹{unconfirmedTx.amount.toLocaleString('en-IN')}</Text> was released to your linked bank account (UTR: {unconfirmedTx.utr_number}).
            </Text>
            <Text style={styles.alertQuestion}>Have you received this payment in your bank?</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.8}
              onPress={() => handleConfirmReceipt(unconfirmedTx.id)}
              disabled={confirmingTxId !== null}
            >
              {confirmingTxId === unconfirmedTx.id ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textInverse} />
                  <Text style={styles.confirmBtnText}>Yes, Confirm Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Confirmed Transactions History */}
        {item.transactions.filter(tx => tx.farmer_confirmed).length > 0 && (
          <View style={styles.receiptsSection}>
            <Text style={styles.receiptsTitle}>Confirmed Receipts</Text>
            {item.transactions.filter(tx => tx.farmer_confirmed).map(tx => (
              <View key={tx.id} style={styles.receiptRow}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptText}>
                    ₹{tx.amount.toLocaleString('en-IN')} Received
                  </Text>
                  <Text style={styles.receiptSubText}>
                    UTR: {tx.utr_number} • Confirmed
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSchemeCard = ({ item }: { item: Scheme }) => {
    return (
      <View style={styles.schemeCard}>
        <View style={styles.schemeHeader}>
          <Text style={styles.schemeTitle}>{item.name}</Text>
          <View style={styles.subsidyBadge}>
            <Text style={styles.subsidyBadgeText}>{item.subsidy}</Text>
          </View>
        </View>
        <Text style={styles.schemeDesc}>{item.description}</Text>
        <View style={styles.schemeMilestones}>
          <Text style={styles.milestonesLabel}>Payout Milestones:</Text>
          {item.milestones.map((milestone, idx) => (
            <View key={idx} style={styles.schemeMilestoneRow}>
              <View style={styles.dot} />
              <Text style={styles.schemeMilestoneText}>{milestone}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.applyBtn}
          activeOpacity={0.8}
          onPress={() => {
            setSelectedScheme(item);
            if (ponds.length === 0) {
              Alert.alert(
                t('yojana.no_ponds_title', 'No Ponds Found'),
                t('yojana.no_ponds_msg', 'You need to add a pond in your profile before you can apply for a scheme.')
              );
              return;
            }
            setSelectedPondId(ponds[0].id);
            setApplyModalVisible(true);
          }}
        >
          <Ionicons name="open-outline" size={16} color={theme.colors.textInverse} />
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Scheme & DBT Tracker"
        onBack={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_apps' && styles.activeTab]}
          onPress={() => setActiveTab('my_apps')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'my_apps' && styles.activeTabText]}>
            My Applications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schemes' && styles.activeTab]}
          onPress={() => setActiveTab('schemes')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'schemes' && styles.activeTabText]}>
            Available Schemes
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Fetching live server logs...</Text>
        </View>
      ) : activeTab === 'my_apps' ? (
        <FlatList
          data={applications}
          keyExtractor={item => item.id}
          renderItem={renderApplicationCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Applications Yet</Text>
              <Text style={styles.emptyStateSub}>
                Explore available aquaculture schemes and apply for subsidies to develop your fish farm.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                activeOpacity={0.8}
                onPress={() => setActiveTab('schemes')}
              >
                <Text style={styles.browseBtnText}>Browse Schemes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={SCHEMES}
          keyExtractor={item => item.code}
          renderItem={renderSchemeCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Apply Modal */}
      <Modal
        visible={applyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Scheme</Text>
              <TouchableOpacity
                onPress={() => setApplyModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedScheme && (
              <>
                <Text style={styles.modalSchemeName}>{selectedScheme.name}</Text>
                <Text style={styles.modalSchemeSubsidy}>{selectedScheme.subsidy}</Text>

                <Text style={styles.fieldLabel}>Select Pond for Project</Text>
                <View style={styles.pickerContainer}>
                  {ponds.map(pond => (
                    <TouchableOpacity
                      key={pond.id}
                      style={[
                        styles.pondOption,
                        selectedPondId === pond.id && styles.pondOptionSelected,
                      ]}
                      onPress={() => setSelectedPondId(pond.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, selectedPondId === pond.id && styles.radioCircleSelected]}>
                        {selectedPondId === pond.id && <View style={styles.radioCircleInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pondOptionName}>{pond.name}</Text>
                        <Text style={styles.pondOptionDetail}>
                          {pond.areaHectares} Ha • {pond.systemType}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  onPress={handleApply}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color={theme.colors.textInverse} />
                      <Text style={styles.submitBtnText}>Submit Project Application</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      padding: 6,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
    },
    activeTab: {
      backgroundColor: theme.colors.primaryLight,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 16,
    },
    emptyStateSub: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
    },
    browseBtn: {
      marginTop: 20,
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: theme.borderRadius.lg,
    },
    browseBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '700',
      fontSize: 14,
    },

    // App Card
    appCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      paddingBottom: 12,
      marginBottom: 12,
    },
    schemeCodeText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 1,
    },
    yojanaNameText: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    cardDetail: {
      gap: 6,
      marginBottom: 14,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },

    // Milestones
    milestonesSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      paddingTop: 12,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 10,
    },
    checkboxCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: theme.colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxCircleChecked: {
      borderColor: theme.colors.secondary,
      backgroundColor: theme.colors.secondary,
    },
    checkboxCircleInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'transparent',
    },
    milestoneName: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    milestoneNameCompleted: {
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    verifiedLabel: {
      fontSize: 11,
      color: theme.colors.secondary,
      fontWeight: '700',
    },

    // DBT Alert Box
    alertCard: {
      backgroundColor: isDark ? 'rgba(255, 185, 95, 0.08)' : 'rgba(255, 185, 95, 0.12)',
      borderColor: theme.colors.accent,
      borderWidth: 1.5,
      borderRadius: theme.borderRadius.md,
      padding: 14,
      marginTop: 10,
      gap: 8,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    alertIconBg: {
      backgroundColor: theme.colors.accentSoft,
      padding: 6,
      borderRadius: 8,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#ffd090' : '#855300',
    },
    alertBody: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    alertHighlight: {
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    alertQuestion: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 4,
    },
    confirmBtnText: {
      color: '#000000',
      fontWeight: '800',
      fontSize: 13,
    },

    // Receipts Section
    receiptsSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      paddingTop: 12,
      marginTop: 8,
    },
    receiptsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    receiptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    receiptText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    receiptSubText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 1,
    },

    // Scheme Card
    schemeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    schemeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    schemeTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    subsidyBadge: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    subsidyBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    schemeDesc: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 19,
      marginBottom: 14,
    },
    schemeMilestones: {
      backgroundColor: theme.colors.surfaceLow,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    milestonesLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    schemeMilestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 3,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    schemeMilestoneText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
    },
    applyBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '800',
      fontSize: 14,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      gap: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    modalSchemeName: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    modalSchemeSubsidy: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 6,
    },
    pickerContainer: {
      gap: 8,
      maxHeight: 200,
    },
    pondOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      padding: 12,
    },
    pondOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: theme.colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: theme.colors.primary,
    },
    radioCircleInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    pondOptionName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    pondOptionDetail: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.md,
      marginTop: 10,
    },
    submitBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '800',
      fontSize: 14,
    },
  });
