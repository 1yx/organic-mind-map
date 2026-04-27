/**
 * Sentence-like concept detection.
 *
 * Rejects concepts that look like prose sentences rather than
 * concise cognitive concept units.
 */

// Sentence-like punctuation patterns that indicate prose, not concept units
const SENTENCE_PATTERNS: RegExp[] = [
  /\.{3}/,           // ellipsis in any language
  /…/,               // Unicode ellipsis
  /[。！？；，、]/,   // Chinese sentence punctuation
  /[.,;!?]\s/,       // ASCII sentence punctuation followed by space
  /\bbecause\b/i,
  /\btherefore\b/i,
  /\bhence\b/i,
  /\bso\b\s+\w/i,    // "so we..." pattern
  /\bif\b.*\bthen\b/i,
  /\bdue to\b/i,
  /\bin order to\b/i,
  /\bwe need to\b/i,
  // Chinese sentence patterns (no \b — CJK has no word boundaries)
  /因为.*所以/,
  /虽然.*但是/,
  /如果.*那么/,
  /首先.*其次/,
  /一方面.*另一方面/,
  /需要.*分析/,
  /需要.*为什么/,
  /用户.*为什么/,
  /会.*流失/,
  /先.*然后/,
  /通过.*实现/,
  /为了.*需要/,
  /不仅.*而且/,
  /与其.*不如/,
  /如果.*，/,         // conditional with comma
  /因为.*，/,         // causal with comma
  /因为.*影响/,       // causal with effect verb
  /如果.*下降/,       // conditional with result
  /[^，。！？]{10,}[，。！？]/,  // long clause ending with punctuation
];

/**
 * Check whether a concept string looks like a sentence.
 * Returns true if it appears to be sentence-like prose.
 */
export function isSentenceLike(concept: string): boolean {
  return SENTENCE_PATTERNS.some((pattern) => pattern.test(concept));
}
