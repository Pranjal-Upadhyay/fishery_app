/**
 * Unit tests for applyUidDashes (uidFormatter utility)
 *
 * These are pure-function tests — no mocks, no async, no React.
 */

import { applyUidDashes } from '../uidFormatter';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Simulate typing a full UID character-by-character from an empty field. */
function typeUid(chars: string): string {
    let current = '';
    for (const char of chars) {
        current = applyUidDashes(current + char, current);
    }
    return current;
}

/** Simulate pressing backspace n times from a given formatted value. */
function backspace(formatted: string, times: number): string {
    let current = formatted;
    for (let i = 0; i < times; i++) {
        const next = current.slice(0, -1);
        current = applyUidDashes(next, current);
    }
    return current;
}

// ─── typing forward ──────────────────────────────────────────────────────────

describe('applyUidDashes — typing forward', () => {
    it('passes single chars through unchanged', () => {
        expect(applyUidDashes('A', '')).toBe('A');
        expect(applyUidDashes('AB', 'A')).toBe('AB-');
    });

    it('appends a dash after the 2nd character', () => {
        const result = typeUid('AB');
        expect(result).toBe('AB-');
    });

    it('formats 5 alphanumeric chars as XX-XXX-', () => {
        const result = typeUid('ABCDE');
        expect(result).toBe('AB-CDE-');
    });

    it('formats 9 alphanumeric chars as XX-XXX-XXXX', () => {
        const result = typeUid('ABCDE1234');
        expect(result).toBe('AB-CDE-1234');
    });

    it('converts lowercase input to uppercase', () => {
        const result = typeUid('ab');
        expect(result).toBe('AB-');
    });

    it('strips non-alphanumeric characters', () => {
        expect(applyUidDashes('A!B', '')).toBe('AB-');
    });

    it('caps at 9 alphanumeric characters (11 with dashes)', () => {
        const result = typeUid('ABCDE12345EXTRA');
        // max raw = 9 chars → AB-CDE-1234 (9 alphanumeric)
        expect(result).toBe('AB-CDE-1234');
        expect(result.replace(/-/g, '').length).toBe(9);
    });

    it('handles numeric-only UIDs', () => {
        const result = typeUid('123456789');
        expect(result).toBe('12-345-6789');
    });

    it('handles mixed alphanumeric UIDs', () => {
        const result = typeUid('FM123ABCD');
        expect(result).toBe('FM-123-ABCD');
    });
});

// ─── deleting / backspace ─────────────────────────────────────────────────────

describe('applyUidDashes — backspace behaviour', () => {
    it('deletes a normal character without side effects', () => {
        // Simulate: "AB-CDE-1" → backspace (deletes "1") → "AB-CDE"
        // The trailing dash is synthetic and re-applied only when typing forward,
        // so it is NOT preserved when simply deleting a char after it.
        const prev = 'AB-CDE-1';
        const result = applyUidDashes('AB-CDE-', prev);
        expect(result).toBe('AB-CDE');
    });

    it('deletes the char before a dash when backspacing through the dash', () => {
        // Simulate: "AB-CDE-" → backspace → should remove the E as well → "AB-CD"
        const result = backspace('AB-CDE-', 1);
        expect(result).toBe('AB-CD');
    });

    it('deletes the char before the first dash when backspacing through it', () => {
        // "AB-" → backspace → "A"
        const result = backspace('AB-', 1);
        expect(result).toBe('A');
    });

    it('allows clearing back to empty string', () => {
        const result = backspace('AB-', 2);
        expect(result).toBe('');
    });

    it('re-formats correctly after deleting mid-uid and retyping', () => {
        // Type full UID, delete 5 times, then continue typing
        // "AB-CDE-1234" backspace×5:
        //   BS1: "AB-CDE-1234" → "AB-CDE-123"
        //   BS2: "AB-CDE-123"  → "AB-CDE-12"
        //   BS3: "AB-CDE-12"   → "AB-CDE-1"
        //   BS4: "AB-CDE-1"    → "AB-CDE" (trailing dash drops when re-formatted)
        //   BS5: "AB-CDE"      → "AB-CD"
        let uid = typeUid('ABCDE1234');
        uid = backspace(uid, 5);
        expect(uid).toBe('AB-CD');
        // Type 'E' to hit the auto-dash at position 5
        uid = applyUidDashes(uid + 'E', uid);
        expect(uid).toBe('AB-CDE-');
        // Continue typing
        uid = applyUidDashes(uid + '9', uid);
        expect(uid).toBe('AB-CDE-9');
    });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe('applyUidDashes — edge cases', () => {
    it('returns empty string for empty input', () => {
        expect(applyUidDashes('', '')).toBe('');
    });

    it('handles paste of a pre-dashed uid gracefully', () => {
        // If user pastes "FM-PAT-1234", strip dashes and reformat
        const result = applyUidDashes('FM-PAT-1234', '');
        expect(result).toBe('FM-PAT-1234');
    });

    it('handles paste of a raw uid without dashes', () => {
        const result = applyUidDashes('FMPAT1234', '');
        expect(result).toBe('FM-PAT-1234');
    });

    it('is idempotent: applying twice gives the same result', () => {
        const once = applyUidDashes('ABCDE123', '');
        const twice = applyUidDashes(once, '');
        expect(once).toBe(twice);
    });
});
