/**
 * CalendarPickerModal
 * Reusable bottom-sheet date picker that matches the existing AddEditPondScreen
 * calendar UI. Supports min/max date bounds and year-jump arrows for fields
 * like Date-of-Birth that span decades.
 *
 * Usage:
 *   <CalendarPickerModal
 *     visible={open}
 *     value="1990-06-15"            // optional ISO YYYY-MM-DD
 *     onSelect={(iso) => ...}        // called with selected ISO date
 *     onClose={() => setOpen(false)}
 *     title="Date of Birth"
 *     subtitle="Pick your date of birth"
 *     maxDate={new Date()}           // optional — default today
 *     minDate={...}                  // optional
 *   />
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Date helpers ────────────────────────────────────────────────────────────

export function formatDateISO(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseDateISO(value: string): Date | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

export function formatDateLabel(value: string): string {
    const parsed = parseDateISO(value);
    if (!parsed) return '';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildCalendarDays(monthDate: Date, maxDate: Date | null, minDate: Date | null) {
    const monthStart = getMonthStart(monthDate);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    const maxStart = maxDate ? startOfDay(maxDate) : null;
    const minStart = minDate ? startOfDay(minDate) : null;

    return Array.from({ length: 42 }, (_, index) => {
        const date = addDays(gridStart, index);
        const inMonth = date.getMonth() === monthStart.getMonth();
        const isAfterMax = maxStart ? date.getTime() > maxStart.getTime() : false;
        const isBeforeMin = minStart ? date.getTime() < minStart.getTime() : false;
        return {
            date,
            inMonth,
            isDisabled: isAfterMax || isBeforeMin,
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        };
    });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    value?: string;            // ISO YYYY-MM-DD
    onSelect: (iso: string) => void;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    maxDate?: Date;            // default today
    minDate?: Date;            // optional
    /** Default month to show if `value` is empty. Defaults to today. */
    defaultMonth?: Date;
}

export default function CalendarPickerModal({
    visible,
    value,
    onSelect,
    onClose,
    title = 'Pick a date',
    subtitle = 'Tap a day to select',
    maxDate = new Date(),
    minDate,
    defaultMonth,
}: Props) {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const selectedDate = useMemo(() => parseDateISO(value || ''), [value]);

    const [monthCursor, setMonthCursor] = useState<Date>(() =>
        selectedDate ? getMonthStart(selectedDate)
            : defaultMonth ? getMonthStart(defaultMonth)
            : getMonthStart(new Date())
    );

    // Re-sync the cursor when the modal opens or the external value changes.
    useEffect(() => {
        if (!visible) return;
        if (selectedDate) {
            setMonthCursor(getMonthStart(selectedDate));
        } else if (defaultMonth) {
            setMonthCursor(getMonthStart(defaultMonth));
        }
    }, [visible, selectedDate, defaultMonth]);

    const days = buildCalendarDays(monthCursor, maxDate, minDate ?? null);
    const monthLabel = new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
    }).format(monthCursor);

    const maxStart = startOfDay(maxDate);
    const minStart = minDate ? startOfDay(minDate) : null;

    const canGoNextMonth = getMonthStart(monthCursor).getTime() <
        getMonthStart(maxStart).getTime();
    const canGoPrevMonth = !minStart ||
        getMonthStart(monthCursor).getTime() > getMonthStart(minStart).getTime();

    const canGoNextYear = monthCursor.getFullYear() < maxStart.getFullYear();
    const canGoPrevYear = !minStart || monthCursor.getFullYear() > minStart.getFullYear();

    const goNextMonth = () => canGoNextMonth &&
        setMonthCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    const goPrevMonth = () => canGoPrevMonth &&
        setMonthCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    const goNextYear = () => canGoNextYear &&
        setMonthCursor(c => new Date(c.getFullYear() + 1, c.getMonth(), 1));
    const goPrevYear = () => canGoPrevYear &&
        setMonthCursor(c => new Date(c.getFullYear() - 1, c.getMonth(), 1));

    const handleSelect = (date: Date) => {
        onSelect(formatDateISO(date));
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.subtitle}>{subtitle}</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                            <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Year + month nav */}
                    <View style={styles.monthRow}>
                        <TouchableOpacity
                            style={[styles.arrowBtn, !canGoPrevYear && styles.arrowBtnDisabled]}
                            onPress={goPrevYear}
                            disabled={!canGoPrevYear}
                        >
                            <Ionicons name="play-skip-back" size={14}
                                color={canGoPrevYear ? theme.colors.textPrimary : theme.colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.arrowBtn, !canGoPrevMonth && styles.arrowBtnDisabled]}
                            onPress={goPrevMonth}
                            disabled={!canGoPrevMonth}
                        >
                            <Ionicons name="chevron-back" size={18}
                                color={canGoPrevMonth ? theme.colors.textPrimary : theme.colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={styles.monthLabel}>{monthLabel}</Text>
                        <TouchableOpacity
                            style={[styles.arrowBtn, !canGoNextMonth && styles.arrowBtnDisabled]}
                            onPress={goNextMonth}
                            disabled={!canGoNextMonth}
                        >
                            <Ionicons name="chevron-forward" size={18}
                                color={canGoNextMonth ? theme.colors.textPrimary : theme.colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.arrowBtn, !canGoNextYear && styles.arrowBtnDisabled]}
                            onPress={goNextYear}
                            disabled={!canGoNextYear}
                        >
                            <Ionicons name="play-skip-forward" size={14}
                                color={canGoNextYear ? theme.colors.textPrimary : theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday header */}
                    <View style={styles.weekdayRow}>
                        {WEEKDAY_LABELS.map(label => (
                            <Text key={label} style={styles.weekdayLabel}>{label}</Text>
                        ))}
                    </View>

                    {/* Day grid */}
                    <View style={styles.grid}>
                        {days.map(day => {
                            const isSelected = selectedDate ? isSameDay(day.date, selectedDate) : false;
                            const isToday = isSameDay(day.date, new Date());
                            return (
                                <TouchableOpacity
                                    key={day.key}
                                    style={[
                                        styles.day,
                                        !day.inMonth && styles.dayOutside,
                                        isSelected && styles.daySelected,
                                        isToday && !isSelected && styles.dayToday,
                                        day.isDisabled && styles.dayDisabled,
                                    ]}
                                    onPress={() => handleSelect(day.date)}
                                    disabled={day.isDisabled}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        !day.inMonth && styles.dayTextOutside,
                                        isSelected && styles.dayTextSelected,
                                        day.isDisabled && styles.dayTextDisabled,
                                    ]}>
                                        {day.date.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.todayBtn}
                            onPress={() => handleSelect(new Date())}
                            disabled={startOfDay(new Date()).getTime() > maxStart.getTime()}
                        >
                            <Text style={styles.todayBtnText}>Use today</Text>
                        </TouchableOpacity>
                        {value ? (
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={() => { onSelect(''); onClose(); }}
                            >
                                <Text style={styles.clearBtnText}>Clear date</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 18,
        paddingBottom: 28,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    title: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800' },
    subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    iconBtn: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    monthLabel: {
        flex: 1,
        textAlign: 'center',
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },
    arrowBtn: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowBtnDisabled: { opacity: 0.4 },
    weekdayRow: { flexDirection: 'row', marginBottom: 6 },
    weekdayLabel: {
        flex: 1,
        textAlign: 'center',
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    day: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    dayOutside: { opacity: 0.4 },
    dayDisabled: { opacity: 0.3 },
    daySelected: {
        backgroundColor: theme.colors.primary,
        borderRadius: 999,
    },
    dayToday: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 999,
        backgroundColor: theme.colors.primaryLight,
    },
    dayText: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    dayTextOutside: { color: theme.colors.textMuted },
    dayTextSelected: { color: theme.colors.textInverse },
    dayTextDisabled: { color: theme.colors.textMuted },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    todayBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 999,
    },
    todayBtnText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '800' },
    clearBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    clearBtnText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800' },
});
