export interface TrailEvent {
  id: number
  title: string
  date: string
  quarter: number
  happen: string[]
  emotion: string
  like: string
  dislike: string
  value: string
  quote: string
  signals: InsightSignal[]
  dashboard: DashboardProfile
  isNew?: boolean
}

export type InsightFramework = 'riasec' | 'disc' | 'schein'

export interface InsightSignal {
  framework: InsightFramework
  dimension: string
  strength: number
  evidenceQuote: string
}

export interface DashboardProfile {
  persona: { headline: string; summaries: string[]; quote: string }
  anchor: {
    primary: string
    ability: string[]
    motivation: string[]
    values: string[]
  }
  keywords: { text: string; weight: number }[]
  patterns: { title: string; evidenceQuote: string }[]
  northStar: {
    primaryAnchor: string
    tagline: string
    desires: string[]
    bottomLine: string
    nextSteps: string[]
  }
}

export interface Message {
  role: 'user' | 'echo'
  text: string
}
