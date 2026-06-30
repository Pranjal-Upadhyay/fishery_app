import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

interface DocumentUploadRowProps {
  label: string;
  required: boolean;
  value: { filePath: string; fileName: string } | null;
  onUploadPress: () => void;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
  rejectionReason?: string | null;
  isUploading?: boolean;
}

export default function DocumentUploadRow({
  label,
  required,
  value,
  onUploadPress,
  verificationStatus,
  rejectionReason,
  isUploading = false,
}: DocumentUploadRowProps) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const renderStatusBadge = () => {
    if (!value) return null;

    switch (verificationStatus) {
      case 'VERIFIED':
        return (
          <View style={[styles.statusBadge, styles.badgeVerified]}>
            <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
            <Text style={[styles.statusText, { color: '#16a34a' }]}>Verified</Text>
          </View>
        );
      case 'REJECTED':
        return (
          <View style={[styles.statusBadge, styles.badgeRejected]}>
            <Ionicons name="alert-circle" size={12} color="#dc2626" />
            <Text style={[styles.statusText, { color: '#dc2626' }]}>Rejected</Text>
          </View>
        );
      case 'PENDING':
      default:
        return (
          <View style={[styles.statusBadge, styles.badgePending]}>
            <Ionicons name="time" size={12} color="#d97706" />
            <Text style={[styles.statusText, { color: '#d97706' }]}>Awaiting Review</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelCol}>
          <Text style={styles.labelText}>{label}</Text>
          {required && <Text style={styles.requiredText}>* Required</Text>}
        </View>

        {isUploading ? (
          <View style={styles.uploadingState}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : value ? (
          <TouchableOpacity 
            style={[styles.button, styles.buttonUploaded]} 
            onPress={onUploadPress}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.buttonTextUploaded}>Re-upload</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={onUploadPress}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.textInverse} />
            <Text style={styles.buttonText}>Upload</Text>
          </TouchableOpacity>
        )}
      </View>

      {value && (
        <View style={styles.fileDetails}>
          <View style={styles.fileNameRow}>
            <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.fileNameText} numberOfLines={1}>
              {value.fileName}
            </Text>
            {renderStatusBadge()}
          </View>

          {verificationStatus === 'REJECTED' && rejectionReason && (
            <View style={styles.rejectionReasonBox}>
              <Text style={styles.rejectionReasonTitle}>REJECTION REASON:</Text>
              <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const getStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceLow || theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass || theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: 12,
      marginBottom: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    labelCol: {
      flex: 1,
      gap: 2,
    },
    labelText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    requiredText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.md || 8,
    },
    buttonUploaded: {
      backgroundColor: theme.colors.primaryLight || 'rgba(20, 184, 166, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    buttonText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: '800',
    },
    buttonTextUploaded: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    uploadingState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    uploadingText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    fileDetails: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass || 'rgba(0,0,0,0.05)',
      paddingTop: 8,
      gap: 4,
    },
    fileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fileNameText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeVerified: {
      backgroundColor: '#dcfce7',
    },
    badgeRejected: {
      backgroundColor: '#fee2e2',
    },
    badgePending: {
      backgroundColor: '#fef3c7',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
    },
    rejectionReasonBox: {
      marginTop: 6,
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2',
      borderColor: '#fee2e2',
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      gap: 2,
    },
    rejectionReasonTitle: {
      fontSize: 9,
      fontWeight: '900',
      color: '#dc2626',
      letterSpacing: 0.5,
    },
    rejectionReasonText: {
      fontSize: 11,
      color: theme.colors.textPrimary,
      lineHeight: 15,
    },
  });
