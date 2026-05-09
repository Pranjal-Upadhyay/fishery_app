import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking, Image, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { economicsService } from '../services/apiService';
import { getFeedImageUri, getFeedTypeColor } from '../utils/feedImages';

// Feed type category filter options
const FEED_CATEGORIES = ['ALL', 'FLOATING', 'SINKING', 'POWDER', 'CRUMBLES'];

function formatFeedCategory(category: string): string {
    if (category === 'ALL') return 'All';
    return String(category).charAt(0) + String(category).slice(1).toLowerCase();
}

export default function FeedCatalogScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const [feeds, setFeeds] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = async () => {
        try {
            const res = await economicsService.getFeed();
            if (res.success) {
                setFeeds(res.data);
                setFiltered(res.data);
            }
        } catch (err) {
            console.error('Failed to load feed catalog', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let base = activeCategory === 'ALL'
            ? feeds
            : feeds.filter(f => String(f.feed_type || '').toUpperCase() === activeCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            base = base.filter(f =>
                String(f.name || '').toLowerCase().includes(q) ||
                String(f.brand || '').toLowerCase().includes(q) ||
                String(f.suitable_for || '').toLowerCase().includes(q)
            );
        }
        setFiltered(base);
    }, [activeCategory, feeds, searchQuery]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.navigate('Main', { screen: 'Home' })}
                >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Feed & Nutrition</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Search bar — rounded-full, height 48, surfaceLow bg, borderWidth 1.5 */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search feed, brand, species..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>
            </View>

            {/* Category filter chips — horizontal scroll, pill shape */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={FEED_CATEGORIES}
                keyExtractor={item => item}
                contentContainerStyle={styles.categoryRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
                        onPress={() => setActiveCategory(item)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.categoryChipText, activeCategory === item && styles.categoryChipTextActive]}>
                            {formatFeedCategory(item)}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Section header — uppercase, textMuted, letterSpacing 2, fontSize 11 */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>{filtered.length} PRODUCTS</Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
                renderItem={({ item }) => <FeedCard item={item} theme={theme} styles={styles} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="nutrition-outline" size={48} color={theme.colors.textMuted} />
                        <Text style={styles.emptyText}>No feed products found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

function FeedCard({ item, theme, styles }: { item: any; theme: any; styles: any }) {
    const [imageError, setImageError] = useState(false);
    const imageSource = (item.image_url && !imageError)
        ? { uri: item.image_url }
        : getFeedImageUri(item.feed_type, item.brand, item.suitable_for, item.name);
    const typeColor = getFeedTypeColor(item.feed_type);

    // Stock / availability badge
    const inStock = item.in_stock !== false; // treat undefined as in stock

    return (
        <View style={styles.card}>
            {/* Product image at top — height 140, resizeMode cover */}
            {(item.image_url && !imageError) ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.feedImage}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                />
            ) : imageSource ? (
                <Image
                    source={imageSource}
                    style={styles.feedImage}
                    resizeMode="cover"
                />
            ) : (
                /* Image error fallback: surfaceAlt bg with centered Ionicons icon in primary color */
                <View style={[styles.feedImageFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Ionicons name="leaf-outline" size={44} color={theme.colors.primary} />
                </View>
            )}

            <View style={styles.cardBody}>
                {/* Header row: feed-type badge + brand + stock badge */}
                <View style={styles.cardHeader}>
                    {/* Type badge (uses getFeedTypeColor palette, preserving existing logic) */}
                    <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>{item.feed_type}</Text>
                    </View>

                    {/* Available/Stock badge */}
                    <View style={[styles.stockBadge, inStock ? styles.stockBadgeIn : styles.stockBadgeOut]}>
                        <Text style={[styles.stockBadgeText, inStock ? styles.stockBadgeTextIn : styles.stockBadgeTextOut]}>
                            {inStock ? 'In Stock' : 'Out of Stock'}
                        </Text>
                    </View>
                </View>

                {/* Brand — textMuted small */}
                <Text style={styles.brandText}>{item.brand}</Text>

                {/* Product name — bold, textPrimary */}
                <Text style={styles.nameText} numberOfLines={2}>{item.name}</Text>

                {/* Price — secondary (lime) bold, monospace-style letterSpacing 0.5 */}
                <Text style={styles.priceText}>₹{parseFloat(item.cost_per_kg_inr).toFixed(2)} / kg</Text>

                {/* Unit info */}
                {item.packaging_size_kg ? (
                    <Text style={styles.unitInfo}>Pack size: {item.packaging_size_kg} kg</Text>
                ) : null}

                {/* 3-col metrics grid */}
                <View style={styles.metricsGrid}>
                    <MetricCell label="PROTEIN" value={`${item.protein_percent}%`} styles={styles} theme={theme} />
                    <MetricCell label="FAT" value={`${item.fat_percent}%`} styles={styles} theme={theme} borderSides />
                    <MetricCell label="PACK" value={`${item.packaging_size_kg}kg`} styles={styles} theme={theme} />
                </View>

                {/* Suitable for */}
                <View style={styles.suitableRow}>
                    <Ionicons name="fish-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.suitableText}>For: {item.suitable_for}</Text>
                </View>

                {/* "More Info" / CTA — secondary outline pill */}
                <TouchableOpacity
                    style={styles.cta}
                    onPress={() => Linking.openURL(item.shop_url || `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(`${item.brand} ${item.name}`)}`)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.ctaText}>{item.shop_url ? 'Shop Now' : 'Search Suppliers'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function MetricCell({ label, value, styles, theme, borderSides }: any) {
    return (
        <View style={[styles.metricCell, borderSides && styles.metricCellBorderSides]}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    // Search bar — rounded-full, height 48, surfaceLow bg, borderWidth 1.5
    searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
    searchBar: {
        height: 48,
        borderRadius: 9999,
        backgroundColor: theme.colors.surfaceLow,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },

    // Category filter chips — horizontal scroll, pill shape
    categoryRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    categoryChip: {
        height: 34,
        borderRadius: 9999,
        paddingHorizontal: 14,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Active chip: primary bg + textInverse
    categoryChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryChipText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
    categoryChipTextActive: { color: theme.colors.textInverse },

    // Section header — uppercase, textMuted, letterSpacing 2, fontSize 11
    sectionHeaderRow: { paddingHorizontal: 16, paddingBottom: 6 },
    sectionHeader: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    list: { padding: 16, paddingTop: 4, paddingBottom: 110 },

    // Feed card
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    // Product image — height 140, resizeMode cover
    feedImage: {
        width: '100%',
        height: 140,
        resizeMode: 'cover',
    },
    // Image error fallback — surfaceAlt bg, centered icon in primary color
    feedImageFallback: {
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },

    cardBody: { padding: 16 },

    // Header row: type badge + stock badge
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    typeBadge: {
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    typeBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Available/Stock badge: secondaryLight + secondary for In Stock, errorSoft + error for Out
    stockBadge: {
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    stockBadgeIn: { backgroundColor: theme.colors.secondaryLight },
    stockBadgeOut: { backgroundColor: theme.colors.errorSoft },
    stockBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    stockBadgeTextIn: { color: theme.colors.secondary },
    stockBadgeTextOut: { color: theme.colors.error },

    // Brand — textMuted, small
    brandText: {
        color: theme.colors.textMuted,
        fontWeight: '600',
        fontSize: 12,
        marginBottom: 2,
    },
    // Product name — bold, textPrimary
    nameText: {
        color: theme.colors.textPrimary,
        fontSize: 19,
        fontWeight: '800',
        marginTop: 4,
        letterSpacing: -0.2,
        lineHeight: 24,
    },
    // Price — secondary (lime) bold, monospace-style letterSpacing 0.5
    priceText: {
        color: theme.colors.secondary,
        fontSize: 24,
        fontWeight: '900',
        marginTop: 6,
        letterSpacing: 0.5,
    },
    unitInfo: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },

    // 3-col metrics grid
    metricsGrid: {
        flexDirection: 'row',
        marginTop: 16,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    metricCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        gap: 4,
    },
    metricCellBorderSides: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
    },
    // Metric label — uppercase, textMuted, letterSpacing 2, fontSize 11
    metricLabel: {
        color: theme.colors.textMuted,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    metricValue: {
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },

    // Suitable for
    suitableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
    },
    suitableText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        flex: 1,
    },

    // CTA — secondary outline pill (border=primary, bg=transparent, text=primary)
    cta: {
        height: 48,
        borderRadius: 9999,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        marginTop: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    ctaText: { color: theme.colors.primary, fontWeight: '800', fontSize: 15 },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: theme.colors.textMuted,
        marginTop: 12,
        fontSize: 14,
    },
});
