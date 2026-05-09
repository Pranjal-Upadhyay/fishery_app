import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image, Modal, ScrollView, Linking, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { economicsService } from '../services/apiService';

const LOCAL_EQUIPMENT_IMAGES: Record<string, any> = {
    AERATION: require('../assets/equipment/aeration.jpg'),
    FEEDING: require('../assets/equipment/feeding.jpg'),
    TANK: require('../assets/equipment/tank.jpg'),
    CIRCULATION: require('../assets/equipment/circulation.jpg'),
    FILTRATION: require('../assets/equipment/filtration.jpg'),
    MONITORING: require('../assets/equipment/monitoring.jpg'),
    POWER: require('../assets/equipment/power.jpg'),
    '550W Vortex Blower': require('../assets/equipment/blower.jpg'),
};

function getLocalEquipmentImage(item: any): any | null {
    return LOCAL_EQUIPMENT_IMAGES[item.name] || LOCAL_EQUIPMENT_IMAGES[item.category] || null;
}

function getEquipmentFallbackIcon(item: any): keyof typeof Ionicons.glyphMap {
    const name = String(item?.name || '').toLowerCase();
    const category = String(item?.category || '').toUpperCase();

    if (name.includes('paddle') || name.includes('aerator') || category === 'AERATION') return 'refresh-circle-outline';
    if (name.includes('blower')) return 'speedometer-outline';
    if (name.includes('tank')) return 'ellipse-outline';
    if (name.includes('pump') || category === 'CIRCULATION') return 'water-outline';
    if (name.includes('uv') || category === 'FILTRATION') return 'sunny-outline';
    if (name.includes('meter') || name.includes('test kit') || category === 'MONITORING') return 'pulse-outline';
    if (name.includes('net')) return 'grid-outline';
    if (name.includes('crate')) return 'cube-outline';
    if (name.includes('feeder')) return 'restaurant-outline';
    if (name.includes('generator')) return 'flash-outline';
    return 'construct-outline';
}

function formatEquipmentCategory(category: string): string {
    switch (String(category || '').toUpperCase()) {
        case 'ALL': return 'All';
        case 'AERATION': return 'Aeration';
        case 'TANK': return 'Tanks';
        case 'CIRCULATION': return 'Water Flow';
        case 'FILTRATION': return 'Filtration';
        case 'MONITORING': return 'Testing';
        case 'FEEDING': return 'Feeding';
        case 'POWER': return 'Power';
        default:
            return String(category || 'Equipment')
                .toLowerCase()
                .split('_')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
    }
}

function EquipmentImage({ item, style, fallbackStyle, theme }: { item: any; style: any; fallbackStyle: any; theme: any }) {
    const localImage = getLocalEquipmentImage(item);
    const [failed, setFailed] = useState(false);

    if (localImage) {
        return <Image source={localImage} style={style} resizeMode="cover" />;
    }

    if (failed || !item.image_url) {
        // Fallback: surfaceAlt bg with centered Ionicons icon in primary color
        return (
            <View style={[fallbackStyle, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Ionicons name={getEquipmentFallbackIcon(item)} size={44} color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: item.image_url }}
            style={style}
            resizeMode="cover"
            onError={() => setFailed(true)}
        />
    );
}

export default function EquipmentCatalogScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const [equipment, setEquipment] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const categories = ['ALL', 'AERATION', 'TANK', 'CIRCULATION', 'FILTRATION', 'MONITORING'];

    const loadData = async () => {
        try {
            const res = await economicsService.getEquipment();
            if (res.success) {
                setEquipment(res.data);
                setFiltered(res.data);
            }
        } catch (err) {
            console.error('Failed to load equipment', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let base = activeCategory === 'ALL' ? equipment : equipment.filter(e => e.category === activeCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            base = base.filter(e =>
                String(e.name || '').toLowerCase().includes(q) ||
                String(e.category || '').toLowerCase().includes(q)
            );
        }
        setFiltered(base);
    }, [activeCategory, equipment, searchQuery]);

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
                <Text style={styles.headerTitle}>Equipment Catalog</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Search bar — rounded-full, height 48, surfaceLow bg, borderWidth 1.5 */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search equipment..."
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
                data={categories}
                keyExtractor={item => item}
                contentContainerStyle={styles.categoryRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
                        onPress={() => setActiveCategory(item)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.categoryChipText, activeCategory === item && styles.categoryChipTextActive]}>
                            {formatEquipmentCategory(item)}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Section header — uppercase, textMuted, letterSpacing 2, fontSize 11 */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>{filtered.length} ITEMS</Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="construct-outline" size={48} color={theme.colors.textMuted} />
                        <Text style={styles.emptyText}>No equipment found.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)} activeOpacity={0.85}>
                        {/* Product image at top, height 140, resizeMode cover */}
                        <EquipmentImage
                            item={item}
                            style={styles.cardImage}
                            fallbackStyle={styles.cardImageFallback}
                            theme={theme}
                        />
                        {/* Category — uppercase, textMuted, letterSpacing 2, fontSize 11 */}
                        <Text style={styles.cardCategory}>{formatEquipmentCategory(item.category).toUpperCase()}</Text>
                        {/* Product name — bold, textPrimary */}
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                        {/* Price — secondary (lime) bold, monospace-style letterSpacing */}
                        <Text style={styles.cardPrice}>₹{parseFloat(item.cost_inr).toLocaleString('en-IN')}</Text>
                        {/* "View Details" button — secondary outline style */}
                        <TouchableOpacity
                            style={styles.cardBtn}
                            onPress={() => setSelectedItem(item)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.cardBtnText}>View Details</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />

            {/* Detail Modal */}
            <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {selectedItem && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Modal image */}
                                <EquipmentImage
                                    item={selectedItem}
                                    style={styles.modalImage}
                                    fallbackStyle={styles.modalImageFallback}
                                    theme={theme}
                                />
                                {/* Category label */}
                                <Text style={styles.modalCategory}>{formatEquipmentCategory(selectedItem.category).toUpperCase()}</Text>
                                <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                                {/* Price — secondary (lime) bold, monospace letterSpacing */}
                                <Text style={styles.modalPrice}>₹{parseFloat(selectedItem.cost_inr).toLocaleString('en-IN')}</Text>

                                <View style={styles.modalInfoCard}>
                                    <ModalInfoRow icon="time-outline" label="Expected Lifespan" value={`${selectedItem.lifespan_years} years`} theme={theme} styles={styles} />
                                    {selectedItem.maintenance_cost_annual_inr ? (
                                        <ModalInfoRow icon="build-outline" label="Annual Maintenance" value={`₹${parseFloat(selectedItem.maintenance_cost_annual_inr).toLocaleString('en-IN')}`} theme={theme} styles={styles} last />
                                    ) : null}
                                </View>

                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => Linking.openURL(`https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(selectedItem.name || '')}`)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="search-outline" size={18} color={theme.colors.textInverse} />
                                    <Text style={styles.modalButtonText}>Search Suppliers</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedItem(null)} activeOpacity={0.82}>
                                    <Text style={styles.modalCloseText}>Close</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function ModalInfoRow({ icon, label, value, theme, styles, last }: any) {
    return (
        <View style={[styles.modalInfoRow, last && styles.modalInfoRowLast]}>
            <Ionicons name={icon} size={16} color={theme.colors.primary} />
            <Text style={styles.modalInfoLabel}>{label}</Text>
            <Text style={styles.modalInfoValue}>{value}</Text>
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

    list: { paddingHorizontal: 10, paddingBottom: 120 },

    // Product card — image at top height 140, then name/brand/price
    card: {
        flex: 1,
        margin: 6,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        paddingBottom: 12,
        ...theme.shadows.sm,
    },
    // Image: height 140, resizeMode cover
    cardImage: { width: '100%', height: 140, resizeMode: 'cover' },
    cardImageFallback: {
        width: '100%',
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Category — uppercase, textMuted, letterSpacing 2, fontSize 11
    cardCategory: {
        marginTop: 10,
        marginHorizontal: 10,
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    // Product name — bold, textPrimary
    cardTitle: {
        marginHorizontal: 10,
        marginTop: 4,
        color: theme.colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    // Price — secondary (lime) bold, monospace-style letterSpacing 0.5
    cardPrice: {
        marginHorizontal: 10,
        marginTop: 6,
        color: theme.colors.secondary,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    // "View Details" button — secondary outline style: border=primary, bg=transparent, text=primary
    cardBtn: {
        marginHorizontal: 10,
        marginTop: 10,
        height: 34,
        borderRadius: theme.borderRadius.full,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBtnText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
    },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { color: theme.colors.textMuted, marginTop: 12, fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.60)' },
    modalCard: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
        borderTopWidth: 1,
        borderColor: theme.colors.border,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: theme.borderRadius.lg,
        marginBottom: 16,
        resizeMode: 'cover',
    },
    modalImageFallback: {
        width: '100%',
        height: 200,
        borderRadius: theme.borderRadius.lg,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Category — uppercase, textMuted, letterSpacing 2, fontSize 11
    modalCategory: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    modalTitle: {
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    // Price — secondary (lime) bold, monospace letterSpacing
    modalPrice: {
        color: theme.colors.secondary,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 4,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    modalInfoCard: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16,
        overflow: 'hidden',
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalInfoRowLast: { borderBottomWidth: 0 },
    modalInfoLabel: { flex: 1, color: theme.colors.textSecondary, fontWeight: '600', fontSize: 14 },
    modalInfoValue: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
    // Primary action button
    modalButton: {
        height: 50,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    modalButtonText: { color: theme.colors.textInverse, fontWeight: '800', fontSize: 15 },
    // Close button — outline style
    modalClose: {
        height: 46,
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
});
