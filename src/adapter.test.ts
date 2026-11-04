import { describe, expect, it } from 'vitest'
import { adaptAgent, adaptTask } from './adapter'
import type { DashboardConfig } from './types'

const fields = {
  title: 'name',
  status: 'lifecycle.status',
  result: 'result',
  summary: 'message',
  currentStep: 'progress.step',
  currentStepNumber: 'progress.number',
  currentStepDescription: 'progress.description',
  currentStepDetails: 'progress.details',
  stepsCompleted: 'steps',
  attempts: 'attempts',
  priority: 'priority',
  agentId: 'owner',
  updatedAt: 'updated',
  createdAt: 'created',
  completedAt: 'completed',
  heartbeatAt: 'heartbeat',
  prUrl: 'delivery.url',
  prNumber: 'delivery.number',
  commitSha: 'delivery.commit',
  ciConclusion: 'delivery.ci',
  humanReviewReason: 'review.reason',
}

const config: DashboardConfig = {
  brand: {
    name: 'Test',
    eyebrow: 'Test',
    description: 'Test',
    accent: '#000000',
  },
  collections: { tasks: 'jobs', agents: 'workers', steps: 'events' },
  fields: { task: fields, agent: fields },
  statusGroups: {
    queued: ['waiting'],
    active: ['running'],
    completed: ['done'],
    failed: ['error'],
    review: ['blocked'],
  },
  staleAgentSeconds: 60,
  requireAuthentication: true,
  links: {},
}

describe('Firestore schema adapter', () => {
  it('maps nested task fields without coupling to a specific agent schema', () => {
    const updated = new Date('2026-11-03T22:00:00Z')
    const task = adaptTask(
      'task-1',
      {
        name: 'Generate provider',
        lifecycle: { status: 'running' },
        progress: {
          step: 'validate',
          number: 4,
          description: 'Validate generated output',
          details: 'Running acceptance tests',
        },
        delivery: {
          url: 'https://github.com/example/repo/pull/42',
          number: 42,
          commit: 'abc123',
          ci: 'pending',
        },
        steps: 4,
        attempts: 2,
        priority: 10,
        owner: 'worker-1',
        updated: { toDate: () => updated },
      },
      config,
    )

    expect(task.title).toBe('Generate provider')
    expect(task.statusGroup).toBe('active')
    expect(task.currentStepDescription).toBe('Validate generated output')
    expect(task.prNumber).toBe('42')
    expect(task.updatedAt).toEqual(updated)
  })

  it('marks agents stale using the configured heartbeat threshold', () => {
    const now = new Date('2026-11-03T22:10:00Z')
    const agent = adaptAgent(
      'worker-1',
      {
        name: 'Worker one',
        lifecycle: { status: 'working' },
        owner: 'task-1',
        heartbeat: new Date('2026-11-03T22:08:00Z'),
      },
      config,
      now,
    )

    expect(agent.currentTaskId).toBe('task-1')
    expect(agent.stale).toBe(true)
  })
})
