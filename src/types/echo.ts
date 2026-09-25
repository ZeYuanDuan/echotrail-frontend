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
  careerAnchorType: CareerAnchorType
  signals?: InsightSignal[]
  dashboard?: DashboardProfile
  isNew?: boolean
}

export type CareerAnchorType =
  | '專家達人'
  | '專業經理人'
  | '自主工作者'
  | '安穩可靠者'
  | '創造者'
  | '俠客奉獻者'
  | '挑戰者'
  | '樂活族'
  | '無法明確歸類'

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
