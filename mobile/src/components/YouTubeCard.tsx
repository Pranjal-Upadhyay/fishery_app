import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export interface YouTubeLinkItem {
    video_id?: string;
    search_query?: string;
    title: string;
    hint?: string;
}

interface Props {
    item: YouTubeLinkItem;
}

export default function YouTubeCard({ item }: Props) {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const thumbnailUri = item.video_id
        ? { uri: `https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg` }
        : null;

    const handlePress = () => {
        const url = item.video_id
            ? `https://www.youtube.com/watch?v=${item.video_id}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(item.search_query || item.title)}`;
        Linking.openURL(url);
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.82}>
            {/* Thumbnail or search banner */}
            <View style={styles.thumbWrap}>
                {thumbnailUri ? (
                    <Image source={thumbnailUri} style={styles.thumb} resizeMode="cover" />
                ) : (
                    <View style={styles.searchBanner}>
                        <Ionicons name="search-outline" size={28} color="#fff" />
                        <Text style={styles.searchLabel}>FIND ON YOUTUBE</Text>
                    </View>
                )}
                {/* YouTube play button overlay */}
                <View style={styles.playOverlay}>
                    <View style={styles.playBtn}>
                        <Ionicons name="play" size={14} color="#fff" />
                    </View>
                </View>
            </View>

            {/* Text content */}
            <View style={styles.textBlock}>
                {/* YouTube logo row */}
                <View style={styles.ytLogoRow}>
                    <View style={styles.ytBadge}>
                        <Ionicons name="logo-youtube" size={13} color="#FF0000" />
                        <Text style={styles.ytBadgeText}>YouTube</Text>
                    </View>
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.hint ? (
                    <Text style={styles.hint} numberOfLines={1}>{item.hint}</Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        flexDirection: 'row',
        marginBottom: 12,
        ...theme.shadows.sm,
    },
    thumbWrap: {
        width: 110,
        height: 82,
        position: 'relative',
        backgroundColor: theme.colors.surfaceAlt,
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    searchBanner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FF0000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    searchLabel: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1,
    },
    playOverlay: {
        position: 'absolute',
        bottom: 6,
        right: 6,
    },
    playBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    textBlock: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
        gap: 4,
    },
    ytLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    ytBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    ytBadgeText: {
        color: '#FF0000',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    title: {
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 17,
    },
    hint: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontStyle: 'italic',
    },
});
