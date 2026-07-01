import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import database from '../database';
import { yojanaService } from '../services/apiService';
import DocumentUploadRow from '../components/DocumentUploadRow';

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

interface Document {
  id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejection_reason?: string | null;
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
  applicant_name: string;
  applicant_district: string;
  applicant_category: string;
  applicant_land_area: number;
  project_description?: string;
  application_rejection_reason?: string | null;
  transactions: Transaction[];
  documents: Document[];
}

interface Scheme {
  code: string;
  name: string;
  subsidy: string;
  description: string;
  milestones: string[];
}

interface Scheme {
  code: string;
  name: string;
  subsidy: string;
  description: string;
  milestones: string[];
  requiredDocumentsRaw?: string[];
  formFields?: any[];
}

const FALLBACK_SCHEMES: Scheme[] = [
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
    requiredDocumentsRaw: ['AADHAAR', 'LAND_DEED', 'BANK_PASSBOOK', 'POWER_PROOF', 'POND_PHOTO']
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
    requiredDocumentsRaw: ['AADHAAR', 'CASTE_CERT', 'LAND_DEED', 'BANK_PASSBOOK', 'PASSPORT_PHOTO', 'POND_PHOTO']
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
    requiredDocumentsRaw: ['AADHAAR', 'LAND_DEED', 'BANK_PASSBOOK', 'TRAINING_CERT', 'POND_PHOTO']
  },
];

const STATUS_STAGES = [
  { key: 'AWAITING_REVIEW', label: 'Review' },
  { key: 'DLC_QUEUE', label: 'DLC Queue' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'MILESTONE_1_MET', label: 'Milestone 1' },
  { key: 'MILESTONE_2_MET', label: 'Milestone 2' }
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
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>(FALLBACK_SCHEMES);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await yojanaService.listApplications();
      if (res.success) {
        setApplications(res.data);
      }

      const localPonds = await database.get<any>('ponds').query().fetch();
      setPonds(localPonds);

      // Fetch schemes dynamically from the server
      try {
        const schemesRes = await yojanaService.listSchemes();
        if (schemesRes.success && schemesRes.data && schemesRes.data.length > 0) {
          const mapped: Scheme[] = schemesRes.data.map((item: any) => {
            const maxSubsidy = Math.max(...Object.values(item.subsidyByCategory || {}).map(v => typeof v === 'number' ? v : 0));
            return {
              code: item.code,
              name: item.nameEn,
              description: item.description || '',
              subsidy: `${maxSubsidy}% Subsidy (Up to ₹${item.maxSubsidyLakh}L)`,
              milestones: (item.milestones || []).map((m: any) => `${m.name} (${m.pct}%)`),
              requiredDocumentsRaw: item.requiredDocuments
            };
          });
          setSchemes(mapped);
        }
      } catch (schemesErr) {
        console.warn('[Yojana] Failed to fetch schemes, using fallback:', schemesErr);
      }

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

  const handleConfirmReceipt = async (transactionId: string) => {
    setConfirmingTxId(transactionId);
    try {
      const res = await yojanaService.confirmReceipt(transactionId);
      if (res.success) {
        Alert.alert(
          t('yojana.receipt_confirmed_title', 'Receipt Confirmed'),
          t('yojana.receipt_confirmed_msg', 'Thank you for confirming. Your ledger has been updated.')
        );
        loadData();
      }
    } catch (err) {
      console.warn('[Yojana] Confirm receipt failed:', err);
      Alert.alert('Error', 'Unable to confirm receipt. Please check your internet connection.');
    } finally {
      setConfirmingTxId(null);
    }
  };

  const handleEditApplication = (app: Application) => {
    const matchingScheme = schemes.find(s => s.code === app.yojana_code);
    Alert.alert(
      'Edit Application',
      'Editing your application details will require the block officer to re-review it. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Edit',
          onPress: () => {
            navigation.navigate('YojanaApplicationForm', {
              schemeCode: app.yojana_code,
              schemeName: app.yojana_name,
              editMode: true,
              applicationData: app,
              requiredDocuments: matchingScheme ? matchingScheme.requiredDocumentsRaw : undefined
            });
          }
        }
      ]
    );
  };

  const handleDocReupload = async (appId: string, docType: string, label: string) => {
    try {
      const acceptType = docType === 'POND_PHOTO' || docType === 'PASSPORT_PHOTO' ? 'image' : 'pdf';
      let result;

      if (acceptType === 'pdf') {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Please grant library access to upload photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const fileName = (asset as any).name || (asset as any).fileName || `${docType.toLowerCase()}_reupload.jpg`;
      const fileUri = asset.uri;
      const mimeType = asset.mimeType || (acceptType === 'pdf' ? 'application/pdf' : 'image/jpeg');

      // Set loading
      setUploadingDocType(docType);

      // Fetch signed upload URL
      const tokenRes = await yojanaService.getUploadToken(docType, fileName);
      if (!tokenRes.success || !tokenRes.data?.signedUrl) {
        throw new Error(tokenRes.error || 'Failed to get upload authorization');
      }

      const { signedUrl, filePath } = tokenRes.data;

      // Upload file directly to Supabase storage URL
      const fileResponse = await fetch(fileUri);
      const fileBlob = await fileResponse.blob();

      await axios.put(signedUrl, fileBlob, {
        headers: { 'Content-Type': mimeType }
      });

      // Submit re-upload reference to backend
      const reuploadRes = await yojanaService.reuploadDocument(appId, docType, filePath, fileName, mimeType);
      if (reuploadRes.success) {
        Alert.alert('Success', `${label} has been re-uploaded and is now awaiting review.`);
        loadData();
      } else {
        throw new Error(reuploadRes.error || 'Failed to sync reupload with server');
      }

    } catch (err: any) {
      console.warn('[DocReupload] Failed:', err);
      Alert.alert('Upload Failed', err.message || 'Unable to re-upload document.');
    } finally {
      setUploadingDocType(null);
    }
  };

  const renderVisualPipeline = (currentStatus: string) => {
    if (currentStatus === 'REJECTED') {
      return (
        <View style={styles.rejectedPipelineRow}>
          <Ionicons name="close-circle" size={16} color="#dc2626" />
          <Text style={styles.rejectedPipelineText}>Application Rejected by Administrative Committee</Text>
        </View>
      );
    }

    const currentIndex = STATUS_STAGES.findIndex(s => s.key === currentStatus);
    const resolvedIndex = currentIndex === -1 ? 0 : currentIndex;

    return (
      <View style={styles.pipelineContainer}>
        <View style={styles.pipelineTrackRow}>
          {STATUS_STAGES.map((stage, idx) => {
            const isActive = resolvedIndex === idx;
            const isCompleted = resolvedIndex > idx;
            return (
              <React.Fragment key={stage.key}>
                <View style={[
                  styles.pipelineDot,
                  isCompleted && styles.pipelineDotCompleted,
                  isActive && styles.pipelineDotActive
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : isActive ? (
                    <View style={styles.pipelineDotInner} />
                  ) : null}
                </View>
                {idx < STATUS_STAGES.length - 1 && (
                  <View style={[
                    styles.pipelineLine,
                    resolvedIndex > idx && styles.pipelineLineCompleted
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <View style={styles.pipelineLabelsRow}>
          {STATUS_STAGES.map((stage, idx) => {
            const isActive = resolvedIndex === idx;
            return (
              <Text key={stage.key} style={[
                styles.pipelineLabel,
                isActive && styles.pipelineLabelActive
              ]}>
                {stage.label}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  const renderApplicationCard = ({ item }: { item: Application }) => {
    const dbtPendingTx = item.transactions?.find(t => t.status === 'SUCCESS' && !t.farmer_confirmed);
    const dbtSuccessTx = item.transactions?.filter(t => t.status === 'SUCCESS' && t.farmer_confirmed) || [];
    const isExpanded = expandedAppId === item.id;

    // Check if documents list has rejected elements
    const hasRejectedDocs = item.documents?.some(d => d.verification_status === 'REJECTED');

    return (
      <View style={[styles.appCard, item.status === 'REJECTED' && styles.appCardRejected]}>
        {/* Header Block */}
        <View style={styles.appCardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.yojanaRow}>
              <Text style={styles.yojanaNameText}>{item.yojana_name}</Text>
            </View>
            <Text style={styles.pondSubText}>Pond: {item.pond_name}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            item.status === 'APPROVED' && styles.statusApproved,
            item.status === 'REJECTED' && styles.statusRejected,
            (item.status.includes('MET')) && styles.statusMet,
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'APPROVED' && { color: '#0f766e' },
              item.status === 'REJECTED' && { color: '#dc2626' },
              (item.status.includes('MET')) && { color: '#2563eb' },
            ]}>
              {item.status === 'AWAITING_REVIEW' ? 'Reviewing Docs' :
               item.status === 'DLC_QUEUE' ? 'DLC Queue' :
               item.status === 'APPROVED' ? 'Approved' :
               item.status === 'MILESTONE_1_MET' ? 'Milestone 1 Released' :
               item.status === 'MILESTONE_2_MET' ? 'Complete' : 'Rejected'}
            </Text>
          </View>
        </View>

        {/* Visual Pipeline */}
        {renderVisualPipeline(item.status)}

        {/* Rejection Alert Banner */}
        {item.status === 'REJECTED' && (
          <View style={styles.rejectionReasonBanner}>
            <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionReasonTitle}>REJECTION EXPLANATION:</Text>
              <Text style={styles.rejectionReasonText}>
                {item.application_rejection_reason || 'Please contact the Block Fisheries Officer for document validation details.'}
              </Text>
            </View>
          </View>
        )}

        {/* Application details block */}
        <View style={styles.appStatsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sanctioned Subsidy</Text>
            <Text style={styles.statValue}>₹{item.approved_subsidy_amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Land Area</Text>
            <Text style={styles.statValue}>{item.applicant_land_area || '0'} Acres</Text>
          </View>
        </View>

        {/* Action button row (Edit / Collapse) */}
        <View style={styles.cardActionsRow}>
          {item.status === 'AWAITING_REVIEW' && (
            <TouchableOpacity 
              style={styles.editCardBtn} 
              onPress={() => handleEditApplication(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.editCardBtnText}>Edit Details</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.collapseToggleBtn}
            onPress={() => setExpandedAppId(isExpanded ? null : item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.collapseToggleText}>
              {isExpanded ? 'Hide Documents' : `Show Documents (${item.documents?.length || 0})`}
            </Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={14} 
              color={theme.colors.primary} 
            />
            {hasRejectedDocs && !isExpanded && (
              <View style={styles.alertIndicatorDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Collapsible Documents Section */}
        {isExpanded && (
          <View style={styles.expandedDocsSection}>
            <Text style={styles.expandedDocsHeader}>Uploaded Application Documents</Text>
            {item.documents && item.documents.length > 0 ? (
              item.documents.map(doc => {
                let name = doc.doc_type;
                if (doc.doc_type === 'AADHAAR') name = 'Aadhaar Card';
                else if (doc.doc_type === 'CASTE_CERT') name = 'Caste Certificate';
                else if (doc.doc_type === 'LAND_DEED') name = 'Land Deed / LPC';
                else if (doc.doc_type === 'BANK_PASSBOOK') name = 'Bank Passbook (Seeded)';
                else if (doc.doc_type === 'INCOME_CERT') name = 'Income Certificate';
                else if (doc.doc_type === 'POND_PHOTO') name = 'Geo-tagged Pond Photos';
                else if (doc.doc_type === 'POWER_PROOF') name = 'Electricity Bill';
                else if (doc.doc_type === 'TRAINING_CERT') name = 'Aquaculture Training Certificate';
                else if (doc.doc_type === 'PASSPORT_PHOTO') name = 'Passport Size Photo';

                const canReupload = item.status === 'AWAITING_REVIEW' && doc.verification_status === 'REJECTED';

                return (
                  <DocumentUploadRow
                    key={doc.id}
                    label={name}
                    required={true}
                    value={{ filePath: doc.file_path, fileName: doc.file_name }}
                    onUploadPress={() => {
                      if (canReupload) {
                        handleDocReupload(item.id, doc.doc_type, name);
                      } else {
                        Alert.alert('Document Locked', 'This document has already been verified or the application is currently locked in processing.');
                      }
                    }}
                    verificationStatus={doc.verification_status}
                    rejectionReason={doc.rejection_reason}
                    isUploading={uploadingDocType === doc.doc_type}
                  />
                );
              })
            ) : (
              <Text style={styles.noDocsText}>No documents found for this application.</Text>
            )}
          </View>
        )}

        {/* DBT Payout Alerts */}
        {dbtPendingTx && (
          <View style={styles.dbtAlertBox}>
            <View style={styles.dbtAlertHeader}>
              <Ionicons name="wallet" size={20} color="#0f766e" />
              <Text style={styles.dbtAlertTitle}>Direct Benefit Transfer Released</Text>
            </View>
            <Text style={styles.dbtAlertMsg}>
              A payout of <Text style={{ fontWeight: '800' }}>₹{Number(dbtPendingTx.amount).toLocaleString('en-IN')}</Text> has been processed to your Aadhaar-seeded bank account.
            </Text>
            <Text style={styles.utrText}>Bank Reference UTR: {dbtPendingTx.utr_number}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.8}
              onPress={() => handleConfirmReceipt(dbtPendingTx.id)}
              disabled={confirmingTxId === dbtPendingTx.id}
            >
              {confirmingTxId === dbtPendingTx.id ? (
                <ActivityIndicator color={theme.colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color={theme.colors.textInverse} />
                  <Text style={styles.confirmBtnText}>Yes, Confirm Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Confirmed Transactions History */}
        {dbtSuccessTx.length > 0 && (
          <View style={styles.txHistoryBox}>
            <Text style={styles.txHistoryHeader}>Released Payouts Ledger</Text>
            {dbtSuccessTx.map(tx => (
              <View key={tx.id} style={styles.txHistoryRow}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txHistoryText}>
                    Milestone {tx.milestone_index + 1} Released: ₹{Number(tx.amount).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.txHistorySub}>UTR: {tx.utr_number} • Confirmed by you</Text>
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
            if (ponds.length === 0) {
              Alert.alert(
                t('yojana.no_ponds_title', 'No Ponds Found'),
                t('yojana.no_ponds_msg', 'You need to add a pond in your profile before you can apply for a scheme.')
              );
              return;
            }
            navigation.navigate('YojanaApplicationForm', {
              schemeCode: item.code,
              schemeName: item.name,
              requiredDocuments: item.requiredDocumentsRaw,
              formFields: (item as any).formFields,
            });
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
          <Text style={[styles.tabText, activeTab === 'schemes' && styles.activeTab]} />
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
          data={schemes}
          keyExtractor={item => item.code}
          renderItem={renderSchemeCard}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 3,
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 80,
      gap: 12,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    emptyStateSub: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    browseBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
    },
    browseBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '800',
      fontSize: 14,
    },
    appCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
      marginBottom: 16,
      gap: 12,
      ...theme.shadows.glow,
    },
    appCardRejected: {
      borderColor: '#fca5a5',
      backgroundColor: isDark ? 'rgba(220,38,38,0.02)' : '#fffafb',
    },
    appCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    yojanaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    yojanaNameText: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    pondSubText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceAlt,
    },
    statusApproved: {
      backgroundColor: '#ccfbf1',
    },
    statusRejected: {
      backgroundColor: '#fee2e2',
    },
    statusMet: {
      backgroundColor: '#dbeafe',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.textSecondary,
    },
    pipelineContainer: {
      backgroundColor: theme.colors.surfaceLow,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    pipelineTrackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
    },
    pipelineDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pipelineDotCompleted: {
      backgroundColor: theme.colors.primary,
    },
    pipelineDotActive: {
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.primaryLight,
    },
    pipelineDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textInverse,
    },
    pipelineLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.border,
      marginHorizontal: 2,
    },
    pipelineLineCompleted: {
      backgroundColor: theme.colors.primary,
    },
    pipelineLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    pipelineLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.colors.textMuted,
      width: 45,
      textAlign: 'center',
    },
    pipelineLabelActive: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    rejectedPipelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#fee2e2',
      padding: 10,
      borderRadius: 8,
    },
    rejectedPipelineText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#dc2626',
    },
    rejectionReasonBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#fee2e2',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#fca5a5',
    },
    rejectionReasonTitle: {
      fontSize: 9,
      fontWeight: '900',
      color: '#dc2626',
      letterSpacing: 0.5,
    },
    rejectionReasonText: {
      fontSize: 12,
      color: '#dc2626',
      lineHeight: 16,
      fontWeight: '600',
      marginTop: 2,
    },
    appStatsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.colors.surfaceLow,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    statValue: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 2,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      paddingTop: 12,
      marginTop: 4,
    },
    editCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    editCardBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    collapseToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 'auto',
    },
    collapseToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    alertIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#dc2626',
      position: 'absolute',
      right: -8,
      top: -2,
    },
    expandedDocsSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      paddingTop: 12,
      marginTop: 4,
      gap: 4,
    },
    expandedDocsHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    noDocsText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    dbtAlertBox: {
      backgroundColor: '#ccfbf1',
      borderWidth: 1.5,
      borderColor: '#2dd4bf',
      borderRadius: 14,
      padding: 14,
      gap: 8,
      marginTop: 4,
    },
    dbtAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dbtAlertTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0f766e',
    },
    dbtAlertMsg: {
      fontSize: 13,
      color: '#115e59',
      lineHeight: 18,
    },
    utrText: {
      fontSize: 11,
      color: '#0f766e',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontWeight: '700',
    },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#0f766e',
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 4,
    },
    confirmBtnText: {
      color: theme.colors.textInverse,
      fontWeight: '800',
      fontSize: 13,
    },
    txHistoryBox: {
      backgroundColor: theme.colors.surfaceLow,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginTop: 4,
    },
    txHistoryHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    txHistoryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 2,
    },
    txHistoryText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    txHistorySub: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    schemeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows.glow,
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
  });
