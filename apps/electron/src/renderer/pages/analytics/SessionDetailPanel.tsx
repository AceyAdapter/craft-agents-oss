/**
 * SessionDetailPanel
 *
 * Displays detailed analytics for a selected session.
 * Shows token usage, cost estimates, subscription impact, and session metadata.
 */

import * as React from 'react'
import { X, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Info_Section } from '@/components/info/Info_Section'
import { Info_Table } from '@/components/info/Info_Table'
import { Info_Badge, type BadgeColor } from '@/components/info/Info_Badge'
import type { SessionMeta } from '@/atoms/sessions'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format USD cost with appropriate precision
 * - $0.0001 for very small costs
 * - $0.01 for small costs
 * - $1.23 for normal costs
 */
function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00'
  if (costUsd < 0.001) return `$${costUsd.toFixed(4)}`
  if (costUsd < 0.01) return `$${costUsd.toFixed(3)}`
  return `$${costUsd.toFixed(2)}`
}

/**
 * Format token counts with commas or abbreviation
 * - 1,234 for smaller numbers
 * - 1.2M for millions
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  return tokens.toLocaleString()
}

/**
 * Format subscription percentage delta
 */
function formatDelta(delta: number): string {
  if (delta === 0) return '0%'
  return `+${delta.toFixed(1)}%`
}

/**
 * Format relative date
 */
function formatRelativeDate(timestamp: number | undefined): string {
  if (!timestamp) return '—'

  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get status badge color
 */
function getStatusColor(isProcessing?: boolean): BadgeColor {
  if (isProcessing) return 'warning'
  return 'success'
}

// ============================================
// Component
// ============================================

interface SessionDetailPanelProps {
  session: SessionMeta | null
  onClose?: () => void
  className?: string
}

export function SessionDetailPanel({ session, onClose, className }: SessionDetailPanelProps) {
  // Empty state - no session selected
  if (!session) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              Select a session to view details
            </p>
          </div>
        </div>
      </div>
    )
  }

  const tokenUsage = session.tokenUsage
  const usageDelta = tokenUsage?.usageDelta

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold truncate flex-1 min-w-0">
          {session.name || session.preview || 'Untitled Session'}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-md hover:bg-foreground/10 transition-colors"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Overview Section */}
          <Info_Section title="Overview">
            <Info_Table labelWidth={100}>
              <Info_Table.Row label="Session" value={session.name || session.preview || 'Untitled'} />
              <Info_Table.Row label="Created" value={formatRelativeDate(session.createdAt)} />
              <Info_Table.Row label="Last Active" value={formatRelativeDate(session.lastMessageAt)} />
              <Info_Table.Row label="Model" value={session.model || 'Default'} />
              <Info_Table.Row label="Status">
                <Info_Badge color={getStatusColor(session.isProcessing)}>
                  {session.isProcessing ? 'Processing' : 'Idle'}
                </Info_Badge>
              </Info_Table.Row>
              {session.messageCount !== undefined && (
                <Info_Table.Row label="Messages" value={session.messageCount.toLocaleString()} />
              )}
            </Info_Table>
          </Info_Section>

          {/* Token Usage Section */}
          {tokenUsage && (
            <Info_Section title="Token Usage">
              <Info_Table labelWidth={120}>
                <Info_Table.Row label="Input Tokens" value={formatTokens(tokenUsage.inputTokens)} />
                <Info_Table.Row label="Output Tokens" value={formatTokens(tokenUsage.outputTokens)} />
                <Info_Table.Row label="Total Tokens" value={formatTokens(tokenUsage.totalTokens)} />
                {tokenUsage.contextTokens > 0 && (
                  <Info_Table.Row label="Context Tokens" value={formatTokens(tokenUsage.contextTokens)} />
                )}
              </Info_Table>
            </Info_Section>
          )}

          {/* Cost Section */}
          {tokenUsage && tokenUsage.costUsd > 0 && (
            <Info_Section title="Cost">
              <Info_Table labelWidth={120}>
                <Info_Table.Row label="Estimated Cost" value={formatCost(tokenUsage.costUsd)} />
              </Info_Table>
            </Info_Section>
          )}

          {/* Subscription Usage Section */}
          {usageDelta && (usageDelta.fiveHourDelta > 0 || usageDelta.sevenDayDelta > 0) && (
            <Info_Section title="Subscription Usage">
              <Info_Table labelWidth={120}>
                <Info_Table.Row label="5-Hour Impact" value={formatDelta(usageDelta.fiveHourDelta)} />
                <Info_Table.Row label="Weekly Impact" value={formatDelta(usageDelta.sevenDayDelta)} />
                {usageDelta.sevenDayOpusDelta !== undefined && usageDelta.sevenDayOpusDelta > 0 && (
                  <Info_Table.Row label="Opus Impact" value={formatDelta(usageDelta.sevenDayOpusDelta)} />
                )}
              </Info_Table>
            </Info_Section>
          )}

          {/* No token data message */}
          {!tokenUsage && (
            <div className="text-center py-6">
              <p className="text-sm text-foreground/50">
                No token usage data available for this session.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default SessionDetailPanel
