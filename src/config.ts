import type { DashboardConfig } from './types'

const requiredFieldKeys = [
  'title',
  'status',
  'result',
  'summary',
  'currentStep',
  'currentStepNumber',
  'currentStepDescription',
  'currentStepDetails',
  'stepsCompleted',
  'attempts',
  'priority',
  'agentId',
  'updatedAt',
  'createdAt',
  'completedAt',
  'heartbeatAt',
  'prUrl',
  'prNumber',
  'commitSha',
  'ciConclusion',
  'humanReviewReason',
] as const

function assertConfig(value: unknown): asserts value is DashboardConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('dashboard.config.json must contain an object')
  }

  const config = value as Partial<DashboardConfig>
  if (!config.brand?.name || !config.collections?.tasks || !config.collections?.agents) {
    throw new Error('Dashboard config requires brand and task/agent collections')
  }
  for (const kind of ['task', 'agent'] as const) {
    const fields = config.fields?.[kind]
    if (!fields) {
      throw new Error(`Dashboard config is missing fields.${kind}`)
    }
    for (const key of requiredFieldKeys) {
      if (typeof fields[key] !== 'string') {
        throw new Error(`Dashboard config is missing fields.${kind}.${key}`)
      }
    }
  }
}

export async function loadDashboardConfig(): Promise<DashboardConfig> {
  const response = await fetch('/dashboard.config.json', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Could not load dashboard.config.json (${response.status})`)
  }
  const value: unknown = await response.json()
  assertConfig(value)
  return value
}
