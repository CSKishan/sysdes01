// UI-layer icon lookup for component kinds. Deliberately kept out of
// src/engine/ -- the engine has zero React imports by design, so any
// React-based icon set (lucide-react) lives here instead, keyed by the
// same ComponentKind the engine already uses.

import { Users, Server, Waypoints, Database, Copy, Split, type LucideIcon } from 'lucide-react'
import type { ComponentKind } from '@/engine/types'

export const COMPONENT_ICONS: Record<ComponentKind, LucideIcon> = {
  client: Users,
  server: Server,
  loadBalancer: Waypoints,
  cache: Database,
  database: Database,
  replica: Copy,
  shardRouter: Split,
}
