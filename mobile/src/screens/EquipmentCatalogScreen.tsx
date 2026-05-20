import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image, Modal, ScrollView, Linking, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { economicsService } from '../services/apiService';

const LOCAL_EQUIPMENT_IMAGES: Record<string, any> = {
    '550W Vortex Blower': require('../assets/equipment/blower.jpg'),
};

function getLocalEquipmentImage(item: any): any | null {
    return LOCAL_EQUIPMENT_IMAGES[item.name] || null;
}

function getEquipmentFallbackIcon(item: any): keyof typeof Ionicons.glyphMap {
    const name = String(item?.name || '').toLowerCase();
    const category = String(item?.category || '').toUpperCase();

    if (name.includes('paddle') || name.includes('aerator') || category === 'AERATION') return 'refresh-circle-outline';
    if (name.includes('blower') || name.includes('air blower')) return 'speedometer-outline';
    if (name.includes('tank') || name.includes('tarpaulin')) return 'ellipse-outline';
    if (name.includes('pump') || category === 'CIRCULATION') return 'water-outline';
    if (name.includes('uv') || category === 'FILTRATION') return 'sunny-outline';
    if (name.includes('meter') || name.includes('test kit') || category === 'MONITORING') return 'pulse-outline';
    if (name.includes('net')) return 'grid-outline';
    if (name.includes('crate')) return 'cube-outline';
    if (name.includes('feeder')) return 'restaurant-outline';
    if (name.includes('generator')) return 'flash-outline';
    // Biofloc-specific items
    if (name.includes('inverter') || name.includes('battery')) return 'battery-charging-outline';
    if (name.includes('air stone') || name.includes('oxygen pipe') || name.includes('distribution pipe')) return 'git-branch-outline';
    if (name.includes('pvc') || name.includes('pipe')) return 'remove-outline';
    if (name.includes('ammonia') || name.includes('nitrite') || name.includes('nitrate') || name.includes('ph test') || name.includes('alkalinity') || name.includes('dissolved oxygen') || name.includes('do test')) return 'flask-outline';
    if (name.includes('probiotic')) return 'leaf-outline';
    if (name.includes('calcium') || name.includes('molasses') || name.includes('salt')) return 'beaker-outline';
    if (name.includes('imhoff') || name.includes('cone')) return 'funnel-outline';
    if (name.includes('thermometer')) return 'thermometer-outline';
    if (name.includes('iron mesh') || name.includes('frame')) return 'apps-outline';
    if (category === 'BIOFLOC') return 'water-outline';
    if (name.includes('venturi')) return 'git-merge-outline';
    if (name.includes('bio-filter') || name.includes('bioreactor') || name.includes('bio filter')) return 'leaf-outline';
    if (name.includes('floating cage') || name.includes('cage')) return 'apps-outline';
    if (name.includes('float')) return 'radio-button-on-outline';
    if (category === 'RAS') return 'sync-circle-outline';
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
        case 'BIOFLOC': return 'Biofloc';
        case 'RAS': return 'RAS';
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
    const { t } = useTranslation();
    const styles = getStyles(theme);
    const navigation = useNavigation<any>();
    const [equipment, setEquipment] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const categories = ['ALL', 'AERATION', 'TANK', 'CIRCULATION', 'FILTRATION', 'MONITORING', 'BIOFLOC', 'RAS'];

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
        // MONITORING filter: show both MONITORING category AND biofloc test kits
        // BIOFLOC filter: show all BIOFLOC items (including test kits)
        // ALL: show everything
        const BIOFLOC_TEST_KIT_NAMES = [
            'ammonia test kit',
            'nitrite test kit',
            'nitrate test kit',
            'ph test kit',
            'alkalinity test kit',
            'dissolved oxygen',
            'do test kit',
        ];

        const isBioflocTestKit = (e: any) => {
            const n = String(e.name || '').toLowerCase();
            return e.category === 'BIOFLOC' && BIOFLOC_TEST_KIT_NAMES.some(k => n.includes(k));
        };

        let base: any[];
        if (activeCategory === 'ALL') {
            base = equipment;
        } else if (activeCategory === 'MONITORING') {
            // Show MONITORING items + biofloc test kits (they are also testing equipment)
            base = equipment.filter(e => e.category === 'MONITORING' || isBioflocTestKit(e));
        } else {
            base = equipment.filter(e => e.category === activeCategory);
        }

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
                <Text style={styles.headerTitle}>{t('equipment.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Search bar — rounded-full, height 48, surfaceLow bg, borderWidth 1.5 */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('equipment.searchPlaceholder')}
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

            {/* Biofloc warning banner — shown only when BIOFLOC filter is active */}
            {activeCategory === 'BIOFLOC' && (
                <View style={styles.bioflocBanner}>
                    <Ionicons name="warning-outline" size={18} color={theme.colors.error} />
                    <Text style={styles.bioflocBannerText}>
                        <Text style={{ fontWeight: '800', color: theme.colors.error }}>24/7 Aeration Required. </Text>
                        If power fails, immediately remove 50% of tank water and replace with fresh water to prevent total fish mortality.
                    </Text>
                </View>
            )}

            {/* RAS info banner — shown only when RAS filter is active */}
            {activeCategory === 'RAS' && (
                <View style={styles.rasBanner}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.rasBannerText}>
                        <Text style={{ fontWeight: '800', color: theme.colors.primary }}>Backyard RAS Unit. </Text>
                        Standard setup: 90,000-litre tank + 3 floating cages (30 m³ each) + 1 pump + 4 Venturi aerators + bio-filter. Produces 1,620 kg per 6-month cycle.
                    </Text>
                </View>
            )}

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
                        <Text style={styles.emptyText}>{t('equipment.noResults')}</Text>
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
                        {/* Biofloc badge — shown on all items when in ALL view if category is BIOFLOC */}
                        {item.category === 'BIOFLOC' && (activeCategory === 'ALL' || activeCategory === 'MONITORING') && (
                            <View style={styles.bioflocBadge}>
                                <Text style={styles.bioflocBadgeText}>BIOFLOC</Text>
                            </View>
                        )}
                        {/* RAS badge — shown on all items when in ALL view if category is RAS */}
                        {item.category === 'RAS' && activeCategory === 'ALL' && (
                            <View style={[styles.bioflocBadge, styles.rasBadge]}>
                                <Text style={styles.bioflocBadgeText}>RAS</Text>
                            </View>
                        )}
                        {/* Category — uppercase, textMuted, letterSpacing 2, fontSize 11 */}
                        <Text style={styles.cardCategory}>{formatEquipmentCategory(item.category).toUpperCase()}</Text>
                        {/* Product name — bold, textPrimary */}
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                        {/* Price — secondary (lime) bold, monospace-style letterSpacing */}
                        <Text style={styles.cardPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>₹{parseFloat(item.cost_inr).toLocaleString('en-IN')}</Text>
                        {/* "View Details" button — secondary outline style */}
                        <TouchableOpacity
                            style={styles.cardBtn}
                            onPress={() => setSelectedItem(item)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.cardBtnText}>{t('common.view')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />

            {/* Detail Modal */}
            <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {selectedItem && (() => {
                            const suppliers = (() => {
                                if (!selectedItem.supplier_info) return [];
                                try {
                                    return typeof selectedItem.supplier_info === 'string'
                                        ? JSON.parse(selectedItem.supplier_info)
                                        : selectedItem.supplier_info;
                                } catch (e) {
                                    console.error('Failed to parse supplier_info', e);
                                    return [];
                                }
                            })();
                            const hasGovSuppliers = Array.isArray(suppliers) && suppliers.length > 0;

                            return (
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

                                    {/* Empanelled Government Suppliers Card List */}
                                    {hasGovSuppliers && (
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={styles.supplierTitle}>GOVERNMENT EMPANELLED SUPPLIERS</Text>
                                            {suppliers.map((sup: any, index: number) => (
                                                <View key={index} style={styles.supplierCard}>
                                                    <View style={styles.supplierHeader}>
                                                        <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success || '#10B981'} />
                                                        <Text style={styles.supplierName}>{sup.name}</Text>
                                                    </View>
                                                    
                                                    {sup.validity ? (
                                                        <View style={styles.validityBadge}>
                                                            <Text style={styles.validityText}>{sup.validity}</Text>
                                                        </View>
                                                    ) : null}

                                                    {sup.scope ? (
                                                        <Text style={styles.scopeText}>{sup.scope}</Text>
                                                    ) : null}

                                                    {sup.address ? (
                                                        <View style={styles.addressRow}>
                                                            <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
                                                            <Text style={styles.addressText}>{sup.address}</Text>
                                                        </View>
                                                    ) : null}

                                                    <View style={styles.contactRow}>
                                                        {sup.phone ? (
                                                            <TouchableOpacity 
                                                                style={styles.contactButton}
                                                                onPress={() => Linking.openURL(`tel:${sup.phone}`)}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Ionicons name="call-outline" size={14} color={theme.colors.textPrimary} />
                                                                <Text style={styles.contactButtonText}>Call</Text>
                                                            </TouchableOpacity>
                                                        ) : null}
                                                        {sup.email ? (
                                                            <TouchableOpacity 
                                                                style={styles.contactButton}
                                                                onPress={() => Linking.openURL(`mailto:${sup.email}`)}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Ionicons name="mail-outline" size={14} color={theme.colors.textPrimary} />
                                                                <Text style={styles.contactButtonText}>Email</Text>
                                                            </TouchableOpacity>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* IndiaMart warning banner */}
                                    {!hasGovSuppliers && (
                                        <View style={styles.warningBanner}>
                                            <Ionicons name="warning-outline" size={18} color={theme.colors.error} />
                                            <Text style={styles.warningBannerText}>
                                                This is not a government backed supplier, it's from Indiamart
                                            </Text>
                                        </View>
                                    )}

                                    {/* Primary/Secondary IndiaMart Action Button */}
                                    <TouchableOpacity
                                        style={hasGovSuppliers ? styles.modalButtonSecondary : styles.modalButton}
                                        onPress={() => {
                                            const url = selectedItem.specifications?.indiamart_url
                                                || `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(selectedItem.name || '')}`;
                                            Linking.openURL(url);
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons 
                                            name="search-outline" 
                                            size={18} 
                                            color={hasGovSuppliers ? theme.colors.primary : theme.colors.textInverse} 
                                        />
                                        <Text style={hasGovSuppliers ? styles.modalButtonSecondaryText : styles.modalButtonText}>
                                            {t('equipment.shopOnline')}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Close Button */}
                                    <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedItem(null)} activeOpacity={0.82}>
                                        <Text style={styles.modalCloseText}>Close</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            );
                        })()}
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
    categoryRow: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2, gap: 8 },
    categoryChip: {
        minHeight: 36,
        borderRadius: 9999,
        paddingHorizontal: 14,
        paddingVertical: 8,
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

    // Biofloc warning banner
    bioflocBanner: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.error + '50',
        backgroundColor: theme.colors.error + '15',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bioflocBannerText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },

    // Biofloc badge on cards in ALL view
    bioflocBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    bioflocBadgeText: {
        color: theme.colors.textInverse,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // RAS badge — teal/secondary colour to distinguish from Biofloc
    rasBadge: {
        backgroundColor: theme.colors.secondary,
    },

    // RAS info banner
    rasBanner: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.primary + '50',
        backgroundColor: theme.colors.primaryLight,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    rasBannerText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.60)' },
    modalCard: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
        flex: 0,
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
    supplierTitle: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 18,
        marginBottom: 10,
    },
    supplierCard: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1.5,
        borderColor: theme.colors.success || '#10B981',
        padding: 14,
        marginBottom: 14,
        ...theme.shadows.sm,
    },
    supplierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    supplierName: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 20,
    },
    validityBadge: {
        alignSelf: 'flex-start',
        backgroundColor: (theme.colors.success || '#10B981') + '15',
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: (theme.colors.success || '#10B981') + '30',
    },
    validityText: {
        color: theme.colors.success || '#10B981',
        fontSize: 11,
        fontWeight: '700',
    },
    scopeText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18,
        marginBottom: 10,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 12,
    },
    addressText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    contactRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 10,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 38,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    contactButtonText: {
        color: theme.colors.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    warningBanner: {
        marginBottom: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1.5,
        borderColor: theme.colors.error + '40',
        backgroundColor: theme.colors.error + '10',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    warningBannerText: {
        flex: 1,
        color: theme.colors.error,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    modalButtonSecondary: {
        height: 50,
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    modalButtonSecondaryText: {
        color: theme.colors.primary,
        fontWeight: '800',
        fontSize: 15,
    },
});
