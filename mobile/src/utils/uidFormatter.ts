/**
 * uidFormatter.ts
 * Pure utility for formatting a Buyer/Farmer UID into XX-XXX-XXXX format.
 *
 * Rules:
 *   - Strip everything except A-Z and 0-9 (forces uppercase)
 *   - Max 9 alphanumeric chars → displayed as XX-XXX-XXXX (11 chars with dashes)
 *   - Dashes are inserted automatically after the 2nd and 5th alphanumeric chars
 *   - Backspacing through a dash removes the character before it as well (smart delete)
 */

/**
 * Apply UID dash-formatting given the new raw text from a TextInput and the
 * previous formatted value held in state.
 *
 * @param newText        - The string the TextInput onChange provides (may include
 *                         partially-typed dashes inserted by a previous call).
 * @param previousFormatted - The formatted UID currently in state (used only to
 *                         detect whether the user is deleting vs typing).
 * @returns The newly formatted UID string, ready to store in state.
 */
export function applyUidDashes(newText: string, previousFormatted: string): string {
    const isDeleting = newText.length < previousFormatted.length;

    // Strip non-alphanumeric and cap at 9 chars
    let raw = newText.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);

    // Smart delete: if the previous value ended with a dash and user backspaced,
    // also remove the char before the dash position.
    if (isDeleting && previousFormatted.endsWith('-')) {
        raw = raw.slice(0, -1);
    }

    return buildFormatted(raw, isDeleting);
}

/** Re-apply dashes to a raw (no-dash) string and an isDeleting flag. */
function buildFormatted(raw: string, isDeleting: boolean): string {
    // Auto-append dash right after typing the 2nd or 5th char (not when deleting)
    if (raw.length === 2 && !isDeleting) return raw + '-';
    if (raw.length === 5 && !isDeleting) return raw.slice(0, 2) + '-' + raw.slice(2, 5) + '-';

    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return raw.slice(0, 2) + '-' + raw.slice(2);
    return raw.slice(0, 2) + '-' + raw.slice(2, 5) + '-' + raw.slice(5);
}
