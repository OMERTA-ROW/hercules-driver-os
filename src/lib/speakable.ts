/**
 * Turns an on-screen HERCULES line into text that sounds right read aloud:
 * no markdown symbols, bullets, links or code fences spoken as characters,
 * tidy whitespace. The on-screen text is never changed — only what is sent to
 * the voice.
 *
 * Meaning-bearing symbols are kept (or put into words), never blanket-stripped:
 * comparisons (>, <, >=, <=), negative numbers, decimals, dollar amounts and
 * part / load IDs such as "#A-1234" or "PN_88-2".
 */
export function speakable(text: string): string {
  return (
    text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Markdown structure — only at the start of a line.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s*[-*•]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+(?=\D)/gm, "")
      .replace(/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*$/gm, "") // table rules
      // Emphasis markers, not the words (and not snake_case IDs).
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?]|$)/g, "$1$2")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/(^|\s)\*+(?=\s|$)/g, "$1")
      // Comparisons read as words; the numbers themselves stay untouched.
      .replace(/\s*(>=|≥)\s*/g, " at least ")
      .replace(/\s*(<=|≤)\s*/g, " at most ")
      .replace(/(^|\s)>\s*(?=[-$\d])/g, "$1over ")
      .replace(/(^|\s)<\s*(?=[-$\d])/g, "$1under ")
      // "#A-1234" / "# 12" → "number A-1234"; a lone # left over is dropped.
      .replace(/#\s?(?=[A-Za-z0-9])/g, "number ")
      .replace(/(^|\s)#+(?=\s|$)/g, "$1")
      // Table cells → a spoken pause.
      .replace(/\s*\|\s*/g, ", ")
      .replace(/\s*\n+\s*/g, ". ")
      .replace(/^[,.\s]+|[,\s]+$/g, "")
      .replace(/,\s*\./g, ".")
      .replace(/\.\s*\./g, ".")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
