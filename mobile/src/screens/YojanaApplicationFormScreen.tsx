import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import database from '../database';
import { yojanaService } from '../services/apiService';
import { loadProfile } from '../services/profileService';
import DocumentUploadRow from '../components/DocumentUploadRow';

// District and category list for form dropdowns
const DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar',
  'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar',
  'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur',
  'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura',
  'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'
];

const CATEGORIES = ['GENERAL', 'EBC', 'SC', 'ST', 'WOMEN'];

interface DocumentConfig {
  docType: string;
  label: string;
  required: boolean;
  acceptType: 'pdf' | 'image';
}

// Map scheme codes to required/optional documents (Fallback cache)
const SCHEME_DOCUMENTS: Record<string, DocumentConfig[]> = {
  JKSY: [
    { docType: 'AADHAAR', label: 'Aadhaar Card', required: true, acceptType: 'pdf' },
    { docType: 'LAND_DEED', label: 'Land Deed / LPC (Min 9yr Lease)', required: true, acceptType: 'pdf' },
    { docType: 'BANK_PASSBOOK', label: 'Bank Passbook (Aadhaar Seeded)', required: true, acceptType: 'pdf' },
    { docType: 'POWER_PROOF', label: 'Electricity Bill / Power Proof', required: true, acceptType: 'pdf' },
    { docType: 'POND_PHOTO', label: 'Geo-tagged Pond Photos (4)', required: true, acceptType: 'image' }
  ],
  TMVSY: [
    { docType: 'AADHAAR', label: 'Aadhaar Card', required: true, acceptType: 'pdf' },
    { docType: 'CASTE_CERT', label: 'Caste Certificate (SC/ST/EBC)', required: true, acceptType: 'pdf' },
    { docType: 'LAND_DEED', label: 'Land Deed or Lease Agreement', required: true, acceptType: 'pdf' },
    { docType: 'BANK_PASSBOOK', label: 'Bank Passbook (Front Page)', required: true, acceptType: 'pdf' },
    { docType: 'PASSPORT_PHOTO', label: 'Passport Size Photographs (2)', required: true, acceptType: 'image' },
    { docType: 'POND_PHOTO', label: 'Geo-tagged Pond Photos (4)', required: true, acceptType: 'image' }
  ],
  MPVY: [
    { docType: 'AADHAAR', label: 'Aadhaar Card', required: true, acceptType: 'pdf' },
    { docType: 'LAND_DEED', label: 'Land Deed or Lease Agreement', required: true, acceptType: 'pdf' },
    { docType: 'BANK_PASSBOOK', label: 'Bank Passbook (Front Page)', required: true, acceptType: 'pdf' },
    { docType: 'TRAINING_CERT', label: 'Aquaculture Training Certificate', required: true, acceptType: 'pdf' },
    { docType: 'POND_PHOTO', label: 'Geo-tagged Pond Photos (4)', required: true, acceptType: 'image' }
  ]
};

const ALL_DOCUMENTS_META: Record<string, { label: string; required: boolean; acceptType: 'pdf' | 'image' }> = {
  AADHAAR: { label: 'Aadhaar Card', required: true, acceptType: 'pdf' },
  CASTE_CERT: { label: 'Caste Certificate (SC/ST/EBC)', required: true, acceptType: 'pdf' },
  LAND_DEED: { label: 'Land Deed or Lease Agreement', required: true, acceptType: 'pdf' },
  BANK_PASSBOOK: { label: 'Bank Passbook (Aadhaar Seeded)', required: true, acceptType: 'pdf' },
  PASSPORT_PHOTO: { label: 'Passport Size Photograph', required: true, acceptType: 'image' },
  POND_PHOTO: { label: 'Geo-tagged Pond Photos (4)', required: true, acceptType: 'image' },
  POWER_PROOF: { label: 'Electricity Bill / Power Proof', required: true, acceptType: 'pdf' },
  TRAINING_CERT: { label: 'Aquaculture Training Certificate', required: true, acceptType: 'pdf' },
  CROP_RECORD: { label: 'Crop Cycle / Production Records', required: true, acceptType: 'pdf' },
  DIVERSIFICATION_PLAN: { label: 'Species Diversification Plan', required: true, acceptType: 'pdf' },
  INCOME_CERT: { label: 'Income Certificate', required: true, acceptType: 'pdf' },
};

export default function YojanaApplicationFormScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const styles = getStyles(theme, isDark);

  const { schemeCode, schemeName, editMode, applicationData, requiredDocuments, formFields } = route.params || {};

  const [step, setStep] = useState(1);
  const [ponds, setPonds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [applicantName, setApplicantName] = useState('');
  const [applicantDistrict, setApplicantDistrict] = useState('Madhubani');
  const [applicantCategory, setApplicantCategory] = useState('GENERAL');
  const [applicantLandArea, setApplicantLandArea] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedPondId, setSelectedPondId] = useState('');
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  // Dropdown options visibility
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeDropdownField, setActiveDropdownField] = useState<string | null>(null);

  // Document Uploads State
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { filePath: string; fileName: string }>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

  const documentConfigList = (() => {
    if (Array.isArray(requiredDocuments) && requiredDocuments.length > 0) {
      return requiredDocuments.map((code: string) => {
        const meta = ALL_DOCUMENTS_META[code] || { label: code, required: true, acceptType: 'pdf' as const };
        return {
          docType: code,
          label: meta.label,
          required: meta.required,
          acceptType: meta.acceptType
        };
      });
    }
    return SCHEME_DOCUMENTS[schemeCode] || SCHEME_DOCUMENTS.JKSY;
  })();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Fetch user ponds from local WatermelonDB
      const localPonds = await database.get<any>('ponds').query().fetch();
      setPonds(localPonds);

      if (editMode && applicationData) {
        // Pre-fill fields for editing
        setApplicantName(applicationData.applicantName || '');
        setApplicantDistrict(applicationData.district || 'Madhubani');
        setApplicantCategory(applicationData.caste || 'GENERAL');
        setApplicantLandArea(applicationData.landArea ? String(applicationData.landArea).replace(/[^0-9.]/g, '') : '');
        setProjectDescription(applicationData.projectDescription || '');
        setSelectedPondId(applicationData.pond_id || '');
        setDynamicValues(applicationData.dynamicFields || applicationData.dynamic_fields || {});
        
        // Match existing documents mapping
        const docsMap: Record<string, { filePath: string; fileName: string }> = {};
        if (Array.isArray(applicationData.documents)) {
          applicationData.documents.forEach((d: any) => {
            docsMap[d.doc_type] = { filePath: d.filePath, fileName: d.fileName };
          });
        }
        setUploadedDocs(docsMap);
      } else {
        // 2. Fetch profile for pre-filling
        const profile = await loadProfile();
        setApplicantName(profile.name || '');
        if (profile.districtName) setApplicantDistrict(profile.districtName);
        if (profile.farmerCategory) setApplicantCategory(profile.farmerCategory);

        if (localPonds.length > 0) {
          setSelectedPondId(localPonds[0].id);
          // Set initial land area based on the first pond (converted to acres)
          const acres = (parseFloat(localPonds[0].areaHectares || '0') * 2.471).toFixed(1);
          setApplicantLandArea(acres);
        }
      }
    } catch (err) {
      console.warn('[YojanaForm] Error loading init data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Adjust land area automatically when selected pond changes
  const handlePondChange = (pondId: string) => {
    setSelectedPondId(pondId);
    const selectedPond = ponds.find(p => p.id === pondId);
    if (selectedPond) {
      const acres = (parseFloat(selectedPond.areaHectares || '0') * 2.471).toFixed(1);
      setApplicantLandArea(acres);
    }
  };

  const handleDocumentPick = async (config: DocumentConfig) => {
    try {
      let result;
      if (config.acceptType === 'pdf') {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
      } else {
        // Request gallery permissions first
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
      const fileName = (asset as any).name || (asset as any).fileName || `${config.docType.toLowerCase()}_upload.jpg`;
      const fileUri = asset.uri;
      const mimeType = asset.mimeType || (config.acceptType === 'pdf' ? 'application/pdf' : 'image/jpeg');

      // 1. Mark loading
      setUploadingDocs(prev => ({ ...prev, [config.docType]: true }));

      // 2. Fetch upload token from backend
      const tokenRes = await yojanaService.getUploadToken(config.docType, fileName);
      if (!tokenRes.success || !tokenRes.data?.signedUrl) {
        throw new Error(tokenRes.error || 'Failed to get upload authorization');
      }

      const { signedUrl, filePath } = tokenRes.data;

      // 3. Upload file directly to Supabase storage URL
      const fileResponse = await fetch(fileUri);
      const fileBlob = await fileResponse.blob();

      await axios.put(signedUrl, fileBlob, {
        headers: { 'Content-Type': mimeType }
      });

      // 4. Update local docs status
      setUploadedDocs(prev => ({
        ...prev,
        [config.docType]: { filePath, fileName }
      }));

      Alert.alert('Success', `${config.label} uploaded successfully.`);
    } catch (err: any) {
      console.warn('[DocUpload] Upload failed:', err);
      Alert.alert('Upload Failed', err.message || 'Unable to upload file at this time.');
    } finally {
      setUploadingDocs(prev => ({ ...prev, [config.docType]: false }));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!applicantName.trim()) {
        Alert.alert('Validation Error', 'Please enter applicant name.');
        return;
      }
      if (!applicantDistrict) {
        Alert.alert('Validation Error', 'Please select district.');
        return;
      }
      if (!applicantLandArea || isNaN(parseFloat(applicantLandArea))) {
        Alert.alert('Validation Error', 'Please enter a valid land area in acres.');
        return;
      }
      // Validate dynamic fields
      if (Array.isArray(formFields)) {
        for (const field of formFields) {
          if (field.required) {
            const val = dynamicValues[field.name];
            if (val === undefined || val === null || String(val).trim() === '') {
              Alert.alert('Validation Error', `Please fill in: ${field.label || field.name}`);
              return;
            }
          }
        }
      }

      setStep(2);
    } else if (step === 2) {
      if (!selectedPondId) {
        Alert.alert('Validation Error', 'Please select a pond for the project.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Validate all required documents are uploaded
      const missingDocs = documentConfigList
        .filter(doc => doc.required && !uploadedDocs[doc.docType])
        .map(doc => doc.label);

      if (missingDocs.length > 0) {
        Alert.alert(
          'Missing Documents',
          `Please upload the following required documents:\n\n• ${missingDocs.join('\n• ')}`
        );
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const docsArray = Object.entries(uploadedDocs).map(([docType, val]) => ({
        docType,
        filePath: val.filePath,
        fileName: val.fileName,
      }));

      const payload = {
        pondId: selectedPondId,
        yojanaCode: schemeCode,
        applicantName,
        applicantDistrict,
        applicantCategory,
        applicantLandArea: parseFloat(applicantLandArea),
        projectDescription,
        documents: docsArray,
        dynamicFields: Object.keys(dynamicValues).length > 0 ? dynamicValues : undefined,
      };

      let res;
      if (editMode && applicationData) {
        // Edit application fields
        res = await yojanaService.edit(applicationData.id, {
          applicantName,
          applicantDistrict,
          applicantCategory,
          applicantLandArea: parseFloat(applicantLandArea),
          projectDescription,
          dynamicFields: Object.keys(dynamicValues).length > 0 ? dynamicValues : undefined,
        });

        if (res.success) {
          Alert.alert(
            'Application Updated',
            'Your changes have been saved successfully.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Error', res.error || 'Failed to update application.');
        }
      } else {
        // Submit new application
        res = await yojanaService.apply(payload);

        if (res.success) {
          Alert.alert(
            'Application Submitted',
            'Your application and documents have been successfully queued for Block Officer review.',
            [{ text: 'OK', onPress: () => navigation.navigate('YojanaApplications') }]
          );
        } else {
          Alert.alert('Error', res.error || 'Failed to submit application.');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err.message || 'An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={editMode ? 'Edit Application' : 'Yojana Application'}
        onBack={() => {
          if (step > 1) setStep(step - 1);
          else navigation.goBack();
        }}
      />

      {/* Progress Tracker bar */}
      <View style={styles.stepProgressRow}>
        {[1, 2, 3, 4].map(num => (
          <React.Fragment key={num}>
            <View style={[styles.stepDot, step >= num && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= num && styles.stepDotTextActive]}>{num}</Text>
            </View>
            {num < 4 && <View style={[styles.stepLine, step > num && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: Applicant profile details */}
        {step === 1 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Step 1: Applicant Details</Text>
            
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>APPLICANT NAME *</Text>
              <TextInput
                style={styles.input}
                value={applicantName}
                onChangeText={setApplicantName}
                placeholder="Enter full name"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>DISTRICT *</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setShowDistrictDropdown(!showDistrictDropdown);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={styles.dropdownSelectorText}>{applicantDistrict}</Text>
                <Ionicons name={showDistrictDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              
              {showDistrictDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {DISTRICTS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setApplicantDistrict(d);
                          setShowDistrictDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>SOCIAL CATEGORY *</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowDistrictDropdown(false);
                }}
              >
                <Text style={styles.dropdownSelectorText}>{applicantCategory}</Text>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              
              {showCategoryDropdown && (
                <View style={styles.dropdownList}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setApplicantCategory(c);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>PROJECT LAND AREA (ACRES) *</Text>
              <TextInput
                style={styles.input}
                value={applicantLandArea}
                onChangeText={setApplicantLandArea}
                keyboardType="decimal-pad"
                placeholder="e.g. 1.2"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Text style={styles.fieldHint}>Auto-calculated from selected pond size but editable if needed.</Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>PROJECT DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={projectDescription}
                onChangeText={setProjectDescription}
                placeholder="Describe your aquaculture plan or infrastructure targets..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* ── Dynamic form fields from server-driven schema ─────────────── */}
            {Array.isArray(formFields) && formFields.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.sectionHeader, { marginBottom: 8 }]}>
                  Scheme-Specific Details
                </Text>
                {formFields.map((field: any) => {
                  const fieldKey = field.name || field.key;
                  const label = `${(field.label || fieldKey).toUpperCase()}${field.required ? ' *' : ''}`;
                  const currentVal = dynamicValues[fieldKey] !== undefined ? String(dynamicValues[fieldKey]) : '';

                  if (field.type === 'select' && Array.isArray(field.options)) {
                    const isOpen = activeDropdownField === fieldKey;
                    return (
                      <View key={fieldKey} style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>{label}</Text>
                        <TouchableOpacity
                          style={styles.dropdownSelector}
                          onPress={() => {
                            setActiveDropdownField(isOpen ? null : fieldKey);
                            setShowDistrictDropdown(false);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownSelectorText}>
                            {currentVal || field.placeholder || 'Select...'}
                          </Text>
                          <Ionicons
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={theme.colors.textPrimary}
                          />
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                              {field.options.map((opt: any) => {
                                const optValue = typeof opt === 'object' ? opt.value : opt;
                                const optLabel = typeof opt === 'object' ? opt.label : opt;
                                return (
                                  <TouchableOpacity
                                    key={String(optValue)}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                      setDynamicValues(prev => ({ ...prev, [fieldKey]: optValue }));
                                      setActiveDropdownField(null);
                                    }}
                                  >
                                    <Text style={styles.dropdownItemText}>{optLabel}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                        {field.hint ? <Text style={styles.fieldHint}>{field.hint}</Text> : null}
                      </View>
                    );
                  }

                  return (
                    <View key={fieldKey} style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{label}</Text>
                      <TextInput
                        style={styles.input}
                        value={currentVal}
                        onChangeText={text =>
                          setDynamicValues(prev => ({ ...prev, [fieldKey]: text }))
                        }
                        keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                        placeholder={field.placeholder || `Enter ${field.label || fieldKey}`}
                        placeholderTextColor={theme.colors.textMuted}
                        multiline={field.type === 'textarea'}
                        numberOfLines={field.type === 'textarea' ? 3 : 1}
                      />
                      {field.hint ? <Text style={styles.fieldHint}>{field.hint}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Selected Pond */}
        {step === 2 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Step 2: Select Pond for Project</Text>
            <Text style={styles.helperText}>Select which pond development yojana is intended for.</Text>

            {ponds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="water-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyStateText}>No active ponds found. Please add a pond in your profile first.</Text>
              </View>
            ) : (
              ponds.map(pond => (
                <TouchableOpacity
                  key={pond.id}
                  style={[
                    styles.pondCard,
                    selectedPondId === pond.id && styles.pondCardSelected,
                  ]}
                  onPress={() => handlePondChange(pond.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, selectedPondId === pond.id && styles.radioCircleSelected]}>
                    {selectedPondId === pond.id && <View style={styles.radioCircleInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pondName}>{pond.name}</Text>
                    <Text style={styles.pondDetails}>
                      Area: {pond.areaHectares} Ha • Water Source: {pond.waterSourceType} • System: {pond.systemType}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* STEP 3: Document uploads */}
        {step === 3 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Step 3: Document Uploads</Text>
            <Text style={styles.helperText}>
              All documents are stored privately in your secure government folder. Only PDFs or high-res photographs are accepted.
            </Text>

            {editMode ? (
              <View style={styles.editNotice}>
                <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
                <Text style={styles.editNoticeText}>
                  Documents cannot be modified in edit mode. To re-upload a rejected document, please use the re-upload button on your applications list.
                </Text>
              </View>
            ) : (
              documentConfigList.map(config => (
                <DocumentUploadRow
                  key={config.docType}
                  label={config.label}
                  required={config.required}
                  value={uploadedDocs[config.docType] || null}
                  onUploadPress={() => handleDocumentPick(config)}
                  isUploading={uploadingDocs[config.docType] || false}
                />
              ))
            )}
          </View>
        )}

        {/* STEP 4: Review and submit */}
        {step === 4 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Step 4: Review Application</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{schemeName}</Text>
              <Text style={styles.reviewCode}>Code: {schemeCode}</Text>

              <View style={styles.divider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Applicant Name:</Text>
                <Text style={styles.reviewValue}>{applicantName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>District:</Text>
                <Text style={styles.reviewValue}>{applicantDistrict}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Social Category:</Text>
                <Text style={styles.reviewValue}>{applicantCategory}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Project Land Area:</Text>
                <Text style={styles.reviewValue}>{applicantLandArea} Acres</Text>
              </View>
              {projectDescription ? (
                <View style={styles.reviewCol}>
                  <Text style={styles.reviewLabel}>Project Description:</Text>
                  <Text style={styles.reviewValueText}>{projectDescription}</Text>
                </View>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.reviewLabelHeader}>Uploaded Documents:</Text>
              {documentConfigList.map(doc => {
                const uploaded = uploadedDocs[doc.docType];
                return (
                  <View key={doc.docType} style={styles.reviewDocRow}>
                    <Ionicons 
                      name={uploaded ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={uploaded ? "#16a34a" : "#dc2626"} 
                    />
                    <Text style={[styles.reviewDocText, !uploaded && { color: '#dc2626' }]}>
                      {doc.label} {uploaded ? `(${uploaded.fileName})` : '— Missing'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.consentNotice}>
              ⚠️ By submitting, you certify that the above documents and declarations are correct. Providing fraudulent information will result in immediate disqualification and block-listing under DBT policies.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer navigation button */}
      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
            <Text style={styles.actionBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionBtn, submitting && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Text style={styles.actionBtnText}>{editMode ? 'Confirm & Save Changes' : 'Confirm & Submit Application'}</Text>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.textInverse} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    stepProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    stepDot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    stepDotText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textSecondary,
    },
    stepDotTextActive: {
      color: theme.colors.textInverse,
    },
    stepLine: {
      width: 40,
      height: 2.5,
      backgroundColor: theme.colors.border,
    },
    stepLineActive: {
      backgroundColor: theme.colors.primary,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    formSection: {
      gap: 14,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    helperText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    fieldWrap: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldHint: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      fontSize: 14,
    },
    textArea: {
      height: 100,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    dropdownSelector: {
      height: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
    },
    dropdownSelectorText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    dropdownList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    dropdownItemText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    pondCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
      marginBottom: 10,
    },
    pondCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
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
    pondName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    pondDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 10,
    },
    emptyStateText: {
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontSize: 13,
    },
    editNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primaryLight,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    editNoticeText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.primary,
      lineHeight: 16,
      fontWeight: '600',
    },
    reviewCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      gap: 8,
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    reviewCode: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderGlass,
      marginVertical: 6,
    },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewCol: {
      gap: 4,
      marginTop: 2,
    },
    reviewLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    reviewLabelHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    reviewValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    reviewValueText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    reviewDocRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
    },
    reviewDocText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    consentNotice: {
      fontSize: 11,
      color: theme.colors.textMuted,
      lineHeight: 15,
      marginTop: 6,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    actionBtn: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
    },
    actionBtnText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '800',
    },
  });
