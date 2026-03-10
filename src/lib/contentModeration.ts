/**
 * Client-side content moderation utilities.
 * Placeholder until Perspective API is integrated server-side.
 */

/** Keywords that auto-flag content as potentially unsafe. */
export const BLOCKED_KEYWORDS: string[] = [
  // Crypto / financial scams
  'crypto', 'bitcoin', 'ethereum', 'wire transfer', 'western union',
  'moneygram', 'investment opportunity', 'guaranteed returns',
  'forex trading', 'binary options', 'pump and dump',
  // MLM / recruitment
  'mlm', 'multi-level marketing', 'network marketing', 'downline',
  'be your own boss', 'passive income opportunity', 'join my team',
  // Spam / phishing
  'click here now', 'act fast', 'limited time offer', 'free money',
  'congratulations you won', 'nigerian prince', 'send money',
  // Explicit solicitation
  'escort', 'sugar daddy', 'sugar mommy', 'pay per meet',
  // Substance-related
  'buy drugs', 'sell drugs', 'cocaine', 'heroin', 'meth',
  // Sexual exploitation
  'nudes', 'onlyfans', 'xxx', 'hookup app',
  // Violence / threats
  'kill you', 'death threat', 'bomb threat',
];

/** Domains commonly used for off-platform recruitment. */
const BLOCKED_LINK_PATTERNS: RegExp[] = [
  /telegram\.me\//i,
  /t\.me\//i,
  /wa\.me\//i,
  /bit\.ly\//i,
  /tinyurl\.com\//i,
];

/**
 * Checks whether text contains links to blocked recruitment platforms.
 */
export function containsBlockedLink(text: string): boolean {
  return BLOCKED_LINK_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Runs a basic client-side safety check on user-submitted text.
 * Returns `{ safe: true }` if no issues detected, otherwise
 * `{ safe: false, reason }` explaining the flag.
 *
 * This is intentionally coarse-grained — the server-side
 * Perspective API integration will handle nuanced moderation.
 */
export async function checkTextSafety(
  text: string,
): Promise<{ safe: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) {
    return { safe: true };
  }

  const lower = text.toLowerCase();

  // Check for blocked recruitment links
  if (containsBlockedLink(text)) {
    return {
      safe: false,
      reason: 'Message contains a link to a blocked platform.',
    };
  }

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return {
        safe: false,
        reason: `Message flagged for containing "${keyword}".`,
      };
    }
  }

  return { safe: true };
}
