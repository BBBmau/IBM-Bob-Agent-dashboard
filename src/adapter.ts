import type {
  AgentRecord,
  DashboardConfig,
  FieldMap,
  StatusGroup,
  StepRecord,
  TaskRecord,
} from './types'

type RawDocument = Record<string, unknown>

interface TimestampLike {
  toDate(): Date
}

function valueAtPath(data: RawDocument, path: string): unknown {
  if (!path) {
    return undefined
  }
  return path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') {
      return undefined
    }
    return (value as RawDocument)[segment]
  }, data)
}

function text(data: RawDocument, path: string): string {
  const value = valueAtPath(data, path)
  return value === null || value === undefined ? '' : String(value)
}

function number(data: RawDocument, path: string): number {
  const value = Number(valueAtPath(data, path) ?? 0)
  return Number.isFinite(value) ? value : 0
}

function date(data: RawDocument, path: string): Date | null {
  const value = valueAtPath(data, path)
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'object' && 'toDate' in value) {
    return (value as TimestampLike).toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function statusGroup(status: string, config: DashboardConfig): StatusGroup {
  const normalized = status.toLowerCase()
  for (const group of [
    'queued',
    'active',
    'completed',
    'failed',
    'review',
  ] as const) {
    if (config.statusGroups[group].map((item) => item.toLowerCase()).includes(normalized)) {
      return group
    }
  }
  return 'other'
}

export function adaptTask(
  id: string,
  data: RawDocument,
  config: DashboardConfig,
): TaskRecord {
  const fields = config.fields.task
  const status = text(data, fields.status) || 'unknown'
  return {
    id,
    title: text(data, fields.title) || id,
    status,
    statusGroup: statusGroup(status, config),
    result: text(data, fields.result),
    summary: text(data, fields.summary),
    currentStep: text(data, fields.currentStep),
    currentStepNumber: number(data, fields.currentStepNumber),
    currentStepDescription: text(data, fields.currentStepDescription),
    currentStepDetails: text(data, fields.currentStepDetails),
    stepsCompleted: number(data, fields.stepsCompleted),
    attempts: number(data, fields.attempts),
    priority: number(data, fields.priority),
    agentId: text(data, fields.agentId),
    updatedAt: date(data, fields.updatedAt),
    createdAt: date(data, fields.createdAt),
    completedAt: date(data, fields.completedAt),
    prUrl: text(data, fields.prUrl),
    prNumber: text(data, fields.prNumber),
    commitSha: text(data, fields.commitSha),
    ciConclusion: text(data, fields.ciConclusion),
    humanReviewReason: text(data, fields.humanReviewReason),
  }
}

export function adaptAgent(
  id: string,
  data: RawDocument,
  config: DashboardConfig,
  now = new Date(),
): AgentRecord {
  const fields: FieldMap = config.fields.agent
  const heartbeatAt = date(data, fields.heartbeatAt)
  const stale =
    heartbeatAt === null ||
    now.getTime() - heartbeatAt.getTime() > config.staleAgentSeconds * 1000
  return {
    id,
    title: text(data, fields.title) || id,
    status: text(data, fields.status) || 'unknown',
    currentTaskId: text(data, fields.agentId),
    currentStep: text(data, fields.currentStep),
    currentStepNumber: number(data, fields.currentStepNumber),
    currentStepDescription: text(data, fields.currentStepDescription),
    currentStepDetails: text(data, fields.currentStepDetails),
    heartbeatAt,
    updatedAt: date(data, fields.updatedAt),
    stale,
  }
}

export function adaptStep(id: string, data: RawDocument): StepRecord {
  return {
    id,
    node: text(data, 'node'),
    description: text(data, 'description'),
    details: text(data, 'details'),
    status: text(data, 'status'),
    result: text(data, 'result'),
    error: text(data, 'error'),
    createdAt: date(data, 'created_at'),
  }
}
