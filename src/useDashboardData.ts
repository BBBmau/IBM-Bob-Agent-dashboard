import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { adaptAgent, adaptStep, adaptTask } from './adapter'
import { demoAgents, demoSteps, demoTasks } from './demo'
import { getFirebaseServices } from './firebase'
import type {
  AgentRecord,
  ConnectionState,
  DashboardConfig,
  StepRecord,
  TaskRecord,
} from './types'

interface DashboardData {
  tasks: TaskRecord[]
  agents: AgentRecord[]
  state: ConnectionState
  error: string
}

function demoEnabled(): boolean {
  return String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
}

export function useDashboardData(
  config: DashboardConfig | null,
  canRead: boolean,
): DashboardData {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [state, setState] = useState<ConnectionState>('connecting')
  const [error, setError] = useState('')
  const isDemo = demoEnabled()

  useEffect(() => {
    if (!config || isDemo || !canRead) {
      return
    }

    const { db } = getFirebaseServices()
    let taskReady = false
    let agentReady = false
    const markReady = () => {
      if (taskReady && agentReady) {
        setState('live')
        setError('')
      }
    }
    const handleError = (reason: Error) => {
      setError(reason.message)
      setState('error')
    }
    const unsubscribeTasks = onSnapshot(
      collection(db, config.collections.tasks),
      (snapshot) => {
        setTasks(
          snapshot.docs
            .map((document) => adaptTask(document.id, document.data(), config))
            .sort((left, right) => (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0)),
        )
        taskReady = true
        markReady()
      },
      handleError,
    )
    const unsubscribeAgents = onSnapshot(
      collection(db, config.collections.agents),
      (snapshot) => {
        setAgents(
          snapshot.docs
            .map((document) => adaptAgent(document.id, document.data(), config))
            .sort((left, right) => left.title.localeCompare(right.title)),
        )
        agentReady = true
        markReady()
      },
      handleError,
    )
    return () => {
      unsubscribeTasks()
      unsubscribeAgents()
    }
  }, [canRead, config, isDemo])

  if (config && isDemo) {
    return { tasks: demoTasks, agents: demoAgents, state: 'demo', error: '' }
  }
  return { tasks, agents, state, error }
}

export function useTaskSteps(
  config: DashboardConfig | null,
  taskId: string,
  canRead: boolean,
): { steps: StepRecord[]; error: string } {
  const [steps, setSteps] = useState<StepRecord[]>([])
  const [error, setError] = useState('')
  const isDemo = demoEnabled()

  useEffect(() => {
    if (!config || !taskId || isDemo || !canRead) {
      return
    }
    const { db } = getFirebaseServices()
    const stepQuery = query(
      collection(
        db,
        config.collections.tasks,
        taskId,
        config.collections.steps,
      ),
      orderBy('created_at', 'asc'),
    )
    return onSnapshot(
      stepQuery,
      (snapshot) => {
        setSteps(
          snapshot.docs.map((document) => adaptStep(document.id, document.data())),
        )
        setError('')
      },
      (reason) => setError(reason.message),
    )
  }, [canRead, config, isDemo, taskId])

  const visibleSteps = config && taskId && isDemo ? demoSteps : steps
  return useMemo(() => ({ steps: visibleSteps, error }), [error, visibleSteps])
}
