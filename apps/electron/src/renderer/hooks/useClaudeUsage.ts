/**
 * Claude Usage Hook
 *
 * Fetches and manages Claude subscription usage data.
 * Shows 5-hour window and weekly limit utilization for OAuth subscription users.
 *
 * - Polls every 60 seconds when visible
 * - Refreshes on manual trigger (e.g., after a chat turn completes)
 * - Returns null if not using OAuth subscription (API key users)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ClaudeUsageData } from '@craft-agent/shared/auth'

const POLL_INTERVAL_MS = 60 * 1000 // 60 seconds

interface UseClaudeUsageResult {
  /** Usage data or null if unavailable */
  usage: ClaudeUsageData | null
  /** Whether usage is currently loading */
  isLoading: boolean
  /** Whether usage data is available (OAuth subscription user) */
  isAvailable: boolean
  /** Refresh usage data manually */
  refresh: () => Promise<void>
}

export function useClaudeUsage(): UseClaudeUsageResult {
  const [usage, setUsage] = useState<ClaudeUsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch usage data
  const fetchUsage = useCallback(async () => {
    try {
      const data = await window.electronAPI.getClaudeUsage()
      setUsage(data)
      setIsAvailable(data !== null)
    } catch (error) {
      console.error('[useClaudeUsage] Failed to fetch usage:', error)
      setUsage(null)
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchUsage()
  }, [fetchUsage])

  // Initial fetch and polling
  useEffect(() => {
    // Initial fetch
    fetchUsage()

    // Set up polling interval
    pollIntervalRef.current = setInterval(fetchUsage, POLL_INTERVAL_MS)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [fetchUsage])

  return {
    usage,
    isLoading,
    isAvailable,
    refresh,
  }
}
