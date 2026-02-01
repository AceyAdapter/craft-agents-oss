/**
 * UsagePanel - Claude subscription usage display
 *
 * Shows 5-hour window and weekly limit utilization for OAuth subscription users.
 * Displays progress bars with color coding based on utilization level.
 *
 * Only visible for OAuth subscription users (Pro/Max).
 * API key users do not see this panel.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useClaudeUsage } from '@/hooks/useClaudeUsage'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@craft-agent/ui'

interface UsagePanelProps {
  className?: string
}

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
 * Get text color class based on utilization percentage
 */
function getUtilizationTextColor(utilization: number): string {
  if (utilization >= 95) return 'text-destructive'
  if (utilization >= 80) return 'text-info'
  return 'text-foreground/60'
}

interface UsageBarProps {
  label: string
  utilization: number
  resetsAt: string | null
  tooltip: string
}

function UsageBar({ label, utilization, resetsAt, tooltip }: UsageBarProps) {
  const colorClass = getUtilizationColor(utilization)
  const textColorClass = getUtilizationTextColor(utilization)
  const timeUntilReset = formatTimeUntilReset(resetsAt)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            {/* Label */}
            <span className="text-[11px] text-foreground/50 w-8 shrink-0">{label}</span>

            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', colorClass)}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>

            {/* Percentage */}
            <span className={cn('text-[11px] w-8 text-right tabular-nums', textColorClass)}>
              {Math.round(utilization)}%
            </span>
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

export function UsagePanel({ className }: UsagePanelProps) {
  const { usage, isLoading, isAvailable } = useClaudeUsage()

  // Don't render if not available (API key user) or still loading with no data
  if (!isAvailable && !isLoading) return null
  if (isLoading && !usage) return null

  // Skeleton while loading
  if (!usage) {
    return (
      <div className={cn('px-3 py-2 space-y-2', className)}>
        <div className="h-3 bg-foreground/5 rounded animate-pulse" />
        <div className="h-3 bg-foreground/5 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('px-3 py-2 space-y-1.5', className)}>
      <UsageBar
        label="5h"
        utilization={usage.fiveHour.utilization}
        resetsAt={usage.fiveHour.resetsAt}
        tooltip="5-hour rolling window usage"
      />
      <UsageBar
        label="Week"
        utilization={usage.sevenDay.utilization}
        resetsAt={usage.sevenDay.resetsAt}
        tooltip="Weekly usage limit"
      />
    </div>
  )
}
