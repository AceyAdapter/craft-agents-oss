/**
 * AnalyticsPanel
 *
 * Displays usage analytics for Claude subscription users.
 * Shows current usage (5-hour and weekly), usage deltas per session,
 * and aggregated statistics across all sessions.
 */

import * as React from 'react'
import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { BarChart3, Clock, Calendar, Zap, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClaudeUsage } from '@/hooks/useClaudeUsage'
import { sessionMetaMapAtom, type SessionMeta } from '@/atoms/sessions'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@craft-agent/ui'
import { useNavigation, useNavigationState, routes, isAnalyticsNavigation } from '@/contexts/NavigationContext'

/**
 * Format time until reset as human-readable string
 */
function formatTimeUntilReset(resetsAt: string | null): string {
  if (!resetsAt) return ''

  const now = new Date()
  const reset = new Date(resetsAt)
  const diffMs = reset.getTime() - now.getTime()

  if (diffMs <= 0) return 'resets soon'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    const remainingHours = diffHours % 24
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`
  }
  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`
  }
  return `${diffMinutes}m`
}

/**
 * Get color class based on utilization percentage
 */
function getUtilizationColor(utilization: number): string {
  if (utilization >= 95) return 'bg-destructive'
  if (utilization >= 80) return 'bg-info'
  return 'bg-accent'
}

/**
 * Format a number with appropriate precision
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

/**
 * Format a delta percentage
 */
function formatDelta(delta: number): string {
  if (delta === 0) return '0%'
  return `+${Math.round(delta)}%`
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================================
// Sub-components
// ============================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  className?: string
}

function StatCard({ icon, label, value, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('flex flex-col gap-1 p-4 rounded-lg bg-foreground/5', className)}>
      <div className="flex items-center gap-2 text-foreground/50">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-foreground/40">{subtitle}</div>}
    </div>
  )
}

interface UsageBarProps {
  label: string
  utilization: number
  resetsAt: string | null
  tooltip: string
}

function UsageBar({ label, utilization, resetsAt, tooltip }: UsageBarProps) {
  const colorClass = getUtilizationColor(utilization)
  const timeUntilReset = formatTimeUntilReset(resetsAt)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 cursor-default">
            <span className="text-sm text-foreground/60 w-16 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', colorClass)}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right tabular-nums">
              {Math.round(utilization)}%
            </span>
            {timeUntilReset && (
              <span className="text-xs text-foreground/40 w-16 text-right">{timeUntilReset}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div>{tooltip}</div>
          {timeUntilReset && <div className="text-foreground/60">Resets in {timeUntilReset}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface SessionRowProps {
  session: SessionMeta
  isSelected?: boolean
  onClick?: () => void
}

function SessionRow({ session, isSelected, onClick }: SessionRowProps) {
  const delta = session.tokenUsage?.usageDelta
  const hasUsageData = delta && (delta.fiveHourDelta > 0 || delta.sevenDayDelta > 0)

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
        onClick && 'cursor-pointer',
        isSelected ? 'bg-accent/10' : 'hover:bg-foreground/5'
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {session.name || session.preview || 'Untitled'}
        </div>
        <div className="text-xs text-foreground/40">
          {session.lastMessageAt ? formatDate(session.lastMessageAt) : 'No messages'}
          {session.model && <span className="ml-2">{session.model}</span>}
        </div>
      </div>
      {hasUsageData ? (
        <div className="text-right w-16">
          <div className="text-sm font-medium tabular-nums text-accent">
            {formatDelta(delta.fiveHourDelta)}
          </div>
          <div className="text-[10px] text-foreground/40">5h</div>
        </div>
      ) : (
        <div className="text-xs text-foreground/30 w-16 text-right">No usage data</div>
      )}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function AnalyticsPanel() {
  const { usage, isLoading, isAvailable } = useClaudeUsage()
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const { navigate } = useNavigation()
  const navState = useNavigationState()

  // Get selected session ID from navigation state
  const selectedSessionId = isAnalyticsNavigation(navState) && navState.details
    ? navState.details.sessionId
    : null

  // Compute aggregated statistics
  const stats = useMemo(() => {
    const sessions = Array.from(sessionMetaMap.values()).filter(s => !s.hidden)

    let totalFiveHourDelta = 0
    let totalSevenDayDelta = 0
    let totalTokens = 0
    let sessionsWithUsage = 0

    for (const session of sessions) {
      if (session.tokenUsage) {
        totalTokens += session.tokenUsage.totalTokens || 0
        if (session.tokenUsage.usageDelta) {
          totalFiveHourDelta += session.tokenUsage.usageDelta.fiveHourDelta || 0
          totalSevenDayDelta += session.tokenUsage.usageDelta.sevenDayDelta || 0
          sessionsWithUsage++
        }
      }
    }

    // Sort sessions by usage (5-hour delta descending)
    const sortedSessions = sessions
      .filter(s => s.tokenUsage?.usageDelta)
      .sort((a, b) => {
        const aDelta = a.tokenUsage?.usageDelta?.fiveHourDelta ?? 0
        const bDelta = b.tokenUsage?.usageDelta?.fiveHourDelta ?? 0
        return bDelta - aDelta
      })
      .slice(0, 10) // Top 10

    return {
      totalSessions: sessions.length,
      sessionsWithUsage,
      totalFiveHourDelta,
      totalSevenDayDelta,
      totalTokens,
      topSessions: sortedSessions,
    }
  }, [sessionMetaMap])

  // Not a subscription user
  if (!isAvailable && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title="Analytics" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
            <h3 className="text-lg font-medium mb-2">Subscription Required</h3>
            <p className="text-sm text-foreground/50 max-w-xs">
              Usage analytics are only available for Claude subscription users (Pro/Max).
              API key users can track token usage in individual sessions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Analytics" />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Current Usage Section */}
          {usage && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground/70">Current Usage</h3>
              <div className="p-4 rounded-lg bg-foreground/5 space-y-3">
                <UsageBar
                  label="5-Hour"
                  utilization={usage.fiveHour.utilization}
                  resetsAt={usage.fiveHour.resetsAt}
                  tooltip="Rolling 5-hour usage window"
                />
                <UsageBar
                  label="Weekly"
                  utilization={usage.sevenDay.utilization}
                  resetsAt={usage.sevenDay.resetsAt}
                  tooltip="7-day usage limit"
                />
                {usage.sevenDayOpus && (
                  <UsageBar
                    label="Opus"
                    utilization={usage.sevenDayOpus.utilization}
                    resetsAt={usage.sevenDayOpus.resetsAt}
                    tooltip="Weekly Opus usage (Max plan)"
                  />
                )}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground/70">Session Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="5-Hour Usage"
                value={formatDelta(stats.totalFiveHourDelta)}
                subtitle="Accumulated across sessions"
              />
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="Weekly Usage"
                value={formatDelta(stats.totalSevenDayDelta)}
                subtitle="Accumulated across sessions"
              />
              <StatCard
                icon={<Zap className="w-4 h-4" />}
                label="Total Tokens"
                value={formatNumber(stats.totalTokens)}
                subtitle="All sessions"
              />
              <StatCard
                icon={<MessageSquare className="w-4 h-4" />}
                label="Sessions"
                value={String(stats.totalSessions)}
                subtitle={`${stats.sessionsWithUsage} with usage data`}
              />
            </div>
          </div>

          {/* Top Sessions by Usage */}
          {stats.topSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground/70">Top Sessions by Usage</h3>
              <div className="rounded-lg border border-foreground/10 overflow-hidden">
                <div className="divide-y divide-foreground/5">
                  {stats.topSessions.map(session => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      isSelected={session.id === selectedSessionId}
                      onClick={() => navigate(
                        session.id === selectedSessionId
                          ? routes.view.analytics()
                          : routes.view.analytics(session.id)
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state for sessions */}
          {stats.topSessions.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 text-foreground/20" />
              <p className="text-sm text-foreground/50">
                No session usage data yet. Usage will be tracked as you chat.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default AnalyticsPanel
