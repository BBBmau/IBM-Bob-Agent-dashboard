export type StatusGroup =
  | 'queued'
  | 'active'
  | 'completed'
  | 'failed'
  | 'review'
  | 'other'

export interface FieldMap {
  title: string
  status: string
  result: string
  summary: string
  currentStep: string
  currentStepNumber: string
  currentStepDescription: string
  currentStepDetails: string
  stepsCompleted: string
  attempts: string
  priority: string
  agentId: string
  updatedAt: string
  createdAt: string
  completedAt: string
  heartbeatAt: string
  prUrl: string
  prNumber: string
  commitSha: string
  ciConclusion: string
  humanReviewReason: string
}

export interface DashboardConfig {
  brand: {
    name: string
    eyebrow: string
    description: string
    accent: string
  }
  collections: {
    tasks: string
    agents: string
    steps: string
  }
  fields: {
    task: FieldMap
    agent: FieldMap
  }
  statusGroups: Record<Exclude<StatusGroup, 'other'>, string[]>
  staleAgentSeconds: number
  requireAuthentication: boolean
  links: {
    sourceRepository?: string
  }
}

export interface TaskRecord {
  id: string
  title: string
  status: string
  statusGroup: StatusGroup
  result: string
  summary: string
  currentStep: string
  currentStepNumber: number
  currentStepDescription: string
  currentStepDetails: string
  stepsCompleted: number
  attempts: number
  priority: number
  agentId: string
  updatedAt: Date | null
  createdAt: Date | null
  completedAt: Date | null
  prUrl: string
  prNumber: string
  commitSha: string
  ciConclusion: string
  humanReviewReason: string
}

export interface AgentRecord {
  id: string
  title: string
  status: string
  currentTaskId: string
  currentStep: string
  currentStepNumber: number
  currentStepDescription: string
  currentStepDetails: string
  heartbeatAt: Date | null
  updatedAt: Date | null
  stale: boolean
}

export interface StepRecord {
  id: string
  node: string
  description: string
  details: string
  status: string
  result: string
  error: string
  createdAt: Date | null
}

export type ConnectionState = 'connecting' | 'live' | 'demo' | 'error'
