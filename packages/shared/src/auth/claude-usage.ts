/**
 * Claude OAuth Usage API
 *
 * Fetches subscription usage data (5-hour window and weekly limits)
 * for users authenticated via OAuth (Pro/Max subscription).
 */

/** Usage data for a time window (normalized for UI) */
export interface UsageWindow {
  /** Utilization percentage (0-100) */
  utilization: number;
  /** ISO timestamp when the window resets, or null if not applicable */
  resetsAt: string | null;
}

/** Raw API response window (snake_case) */
interface ApiUsageWindow {
  utilization: number;
  resets_at: string | null;
}

/** Response from the Claude OAuth usage API (raw) */
interface ClaudeUsageApiResponse {
  five_hour: ApiUsageWindow;
  seven_day: ApiUsageWindow;
  seven_day_opus?: ApiUsageWindow;
  seven_day_oauth_apps?: ApiUsageWindow | null;
}

/** Normalized usage data for the UI */
export interface ClaudeUsageData {
  fiveHour: UsageWindow;
  sevenDay: UsageWindow;
  sevenDayOpus?: UsageWindow;
}

const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage';
const ANTHROPIC_BETA_HEADER = 'oauth-2025-04-20';

/**
 * Fetch Claude subscription usage data
 *
 * @param accessToken - OAuth access token with user:profile scope
 * @returns Usage data or null if the request fails
 */
export async function fetchClaudeUsage(accessToken: string): Promise<ClaudeUsageData | null> {
  try {
    const response = await fetch(USAGE_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'anthropic-beta': ANTHROPIC_BETA_HEADER,
        'User-Agent': 'CraftAgent/1.0',
      },
    });

    if (!response.ok) {
      // 403 = missing user:profile scope or not a subscription user
      // 401 = token expired or invalid
      if (response.status === 403 || response.status === 401) {
        return null;
      }
      throw new Error(`Usage API error: ${response.status}`);
    }

    const data = await response.json() as ClaudeUsageApiResponse;

    // Normalize the response
    return {
      fiveHour: {
        utilization: data.five_hour?.utilization ?? 0,
        resetsAt: data.five_hour?.resets_at ?? null,
      },
      sevenDay: {
        utilization: data.seven_day?.utilization ?? 0,
        resetsAt: data.seven_day?.resets_at ?? null,
      },
      sevenDayOpus: data.seven_day_opus ? {
        utilization: data.seven_day_opus.utilization ?? 0,
        resetsAt: data.seven_day_opus.resets_at ?? null,
      } : undefined,
    };
  } catch (error) {
    console.error('[claude-usage] Failed to fetch usage:', error);
    return null;
  }
}
