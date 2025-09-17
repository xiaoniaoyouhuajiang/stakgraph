import { Results } from './types'
import { Action } from './actionModel'

export interface ScenarioMeta {
  baseOrigin: string
  startedAt: number
  completedAt: number
  durationMs: number
  userAgent?: string
  viewport?: { width: number; height: number }
  url?: string
}

export interface Scenario {
  version: number
  meta: ScenarioMeta
  actions: Action[]
}

export function buildScenario(results: Results, actions: Action[]): Scenario {
  const startedAt = results?.time?.startedAt || (actions[0]?.timestamp || Date.now())
  const completedAt = results?.time?.completedAt || (actions[actions.length - 1]?.timestamp || startedAt)
  return {
    version: 1,
    meta: {
      baseOrigin: (typeof window !== 'undefined' ? window.location.origin : ''),
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : undefined,
      url: results?.userInfo?.url
    },
    actions
  }
}

export function serializeScenario(s: Scenario): string {
  return JSON.stringify(s)
}