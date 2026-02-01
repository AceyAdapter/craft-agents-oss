/**
 * AnalyticsSessionDetailPage
 *
 * Wrapper page component for displaying session details in the main content area.
 * Used when navigating to analytics/session/{sessionId}.
 */

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { SessionDetailPanel } from './SessionDetailPanel'
import { useNavigation, routes } from '@/contexts/NavigationContext'

interface AnalyticsSessionDetailPageProps {
  sessionId: string
}

export function AnalyticsSessionDetailPage({ sessionId }: AnalyticsSessionDetailPageProps) {
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const session = sessionMetaMap.get(sessionId) ?? null
  const { navigate } = useNavigation()

  const handleClose = React.useCallback(() => {
    navigate(routes.view.analytics())
  }, [navigate])

  return (
    <SessionDetailPanel
      session={session}
      onClose={handleClose}
      className="h-full"
    />
  )
}

export default AnalyticsSessionDetailPage
