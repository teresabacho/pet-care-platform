/**
 * Нормалізує "ім'я" — будь-який рядок, де очікується людське ім'я або кличка тваринки.
 *
 * Поведінка:
 * - "ольга"     → "Ольга"
 * - "ОЛЬГА"     → "Ольга"
 * - "оЛьГа"     → "Ольга"
 * - "анна-марія" → "Анна-Марія" (з великої — після пробілу або дефісу)
 * - "  vasyl  " → "Vasyl"     (зайві пробіли по краях обрізаються)
 *
 * Літера після апострофа не капіталізується (українські імена на кшталт «Дʼякова»).
 */
export function capitalizeName(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.toLowerCase().replace(
        /(^|[\s-])(\p{L})/gu,
        (_match, sep: string, char: string) => sep + char.toUpperCase(),
    );
}
