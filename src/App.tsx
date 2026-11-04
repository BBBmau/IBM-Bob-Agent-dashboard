import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  LayoutDashboard,
  ListFilter,
  LogIn,
  LogOut,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { User } from 'firebase/auth'
import { loadDashboardConfig } from './config'
import {
  firebaseIsConfigured,
  observeUser,
  signInWithGoogle,
  signOutUser,
} from './firebase'
import type {
  AgentRecord,
  DashboardConfig,
  StatusGroup,
  TaskRecord,
} from './types'
import { useDashboardData, useTaskSteps } from './useDashboardData'

const groupLabels: Record<StatusGroup, string> = {
  queued: 'Queued',
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
  review: 'Needs review',
  other: 'Other',
}

const groupColors: Record<StatusGroup, string> = {
  queued: '#f59e0b',
  active: '#8b5cf6',
  completed: '#10b981',
  failed: '#ef4444',
  review: '#f97316',
  other: '#64748b',
}

function isDemo(): boolean {
  return String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
}

function timeAgo(value: Date | null): string {
  if (!value) {
    return 'No timestamp'
  }
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000))
  if (seconds < 60) {
    return `${seconds}s ago`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

function shortCommit(value: string): string {
  return value ? value.slice(0, 8) : ''
}

function StatusBadge({ group, status }: { group: StatusGroup; status: string }) {
  return (
    <span className={`status-badge status-${group}`}>
      <span className="status-dot" />
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  detail: string
  tone: StatusGroup
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  )
}

function AgentCard({ agent }: { agent: AgentRecord }) {
  const working = agent.status === 'working' || Boolean(agent.currentTaskId)
  return (
    <article className={`agent-card ${agent.stale ? 'agent-stale' : ''}`}>
      <div className="agent-card-top">
        <div className="agent-avatar">
          <Bot size={19} />
          {!agent.stale && <span className="presence-dot" />}
        </div>
        <div className="agent-title">
          <strong>{agent.title}</strong>
          <span>{agent.stale ? 'Stale heartbeat' : working ? 'Working now' : 'Ready'}</span>
        </div>
        <StatusBadge
          group={agent.stale ? 'failed' : working ? 'active' : 'completed'}
          status={agent.stale ? 'stale' : agent.status}
        />
      </div>
      <div className="agent-work">
        <p>{agent.currentTaskId || 'No task assigned'}</p>
        <span>{agent.currentStepDescription || 'Waiting for the next eligible task.'}</span>
      </div>
      <div className="agent-meta">
        <span>
          <Radio size={13} />
          Heartbeat {timeAgo(agent.heartbeatAt)}
        </span>
        {agent.currentStepNumber > 0 && <span>Step {agent.currentStepNumber}</span>}
      </div>
    </article>
  )
}

function TaskDrawer({
  task,
  config,
  canRead,
  onClose,
}: {
  task: TaskRecord
  config: DashboardConfig
  canRead: boolean
  onClose(): void
}) {
  const { steps, error } = useTaskSteps(config, task.id, canRead)
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="task-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${task.title} details`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Task detail</p>
            <h2>{task.title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-status">
          <StatusBadge group={task.statusGroup} status={task.status} />
          <span>Updated {timeAgo(task.updatedAt)}</span>
        </div>

        <section className="drawer-section">
          <h3>Current state</h3>
          <div className="current-state">
            <div className="state-number">{task.currentStepNumber || '—'}</div>
            <div>
              <strong>{task.currentStepDescription || task.summary || 'No step reported'}</strong>
              <p>{task.currentStepDetails || 'Waiting for additional agent context.'}</p>
            </div>
          </div>
        </section>

        <section className="drawer-section">
          <h3>Execution</h3>
          <div className="detail-grid">
            <div><span>Attempts</span><strong>{task.attempts}</strong></div>
            <div><span>Steps</span><strong>{task.stepsCompleted}</strong></div>
            <div><span>Priority</span><strong>{task.priority}</strong></div>
            <div><span>CI</span><strong>{task.ciConclusion || '—'}</strong></div>
          </div>
        </section>

        {(task.prUrl || task.commitSha) && (
          <section className="drawer-section">
            <h3>Code delivery</h3>
            <div className="delivery-links">
              {task.prUrl && (
                <a href={task.prUrl} target="_blank" rel="noreferrer">
                  <GitPullRequest size={16} />
                  PR #{task.prNumber || 'open'}
                  <ExternalLink size={13} />
                </a>
              )}
              {task.commitSha && (
                <span>
                  <GitCommitHorizontal size={16} />
                  {shortCommit(task.commitSha)}
                </span>
              )}
            </div>
          </section>
        )}

        {task.humanReviewReason && (
          <section className="review-callout">
            <CircleAlert size={18} />
            <div>
              <strong>Human review required</strong>
              <p>{task.humanReviewReason}</p>
            </div>
          </section>
        )}

        <section className="drawer-section timeline-section">
          <div className="section-title-row">
            <h3>Step timeline</h3>
            <span>{steps.length} events</span>
          </div>
          {error && <p className="inline-error">{error}</p>}
          <ol className="timeline">
            {steps.map((step, index) => (
              <li key={step.id}>
                <div className="timeline-marker">
                  {step.status === 'failed' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                </div>
                <div className="timeline-copy">
                  <div>
                    <strong>{step.description || step.node}</strong>
                    <time>{timeAgo(step.createdAt)}</time>
                  </div>
                  <p>{step.details || step.error || 'No additional detail reported.'}</p>
                  <span>Step {index + 1} · {step.node}</span>
                </div>
              </li>
            ))}
            {!steps.length && !error && (
              <li className="empty-timeline">No step records are available yet.</li>
            )}
          </ol>
        </section>
      </aside>
    </div>
  )
}

function SetupScreen({
  config,
  error,
  onSignIn,
}: {
  config: DashboardConfig
  error: string
  onSignIn(): void
}) {
  const configured = firebaseIsConfigured()
  return (
    <main className="setup-shell">
      <div className="setup-card">
        <div className="brand-mark large"><Sparkles size={27} /></div>
        <p className="eyebrow">{config.brand.eyebrow}</p>
        <h1>{config.brand.name}</h1>
        <p>{configured ? 'Sign in to view live Firestore operations.' : 'Connect this dashboard to Firebase to begin.'}</p>
        {configured ? (
          <button type="button" className="primary-button" onClick={onSignIn}>
            <LogIn size={17} />
            Continue with Google
          </button>
        ) : (
          <div className="setup-instructions">
            <code>cp .env.example .env.local</code>
            <span>Then add the Firebase web application configuration.</span>
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
        <div className="read-only-note">
          <ShieldCheck size={16} />
          This dashboard never writes to Firestore.
        </div>
      </div>
    </main>
  )
}

function App() {
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [queryText, setQueryText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusGroup | 'all'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const demo = isDemo()

  useEffect(() => {
    loadDashboardConfig()
      .then(setConfig)
      .catch((error: unknown) =>
        setConfigError(error instanceof Error ? error.message : String(error)),
      )
  }, [])

  useEffect(() => {
    if (!config) {
      return
    }
    if (demo || !config.requireAuthentication || !firebaseIsConfigured()) {
      return
    }
    return observeUser((nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [config, demo])

  const canRead = Boolean(
    config &&
      (demo || !config.requireAuthentication || (firebaseIsConfigured() && user)),
  )
  const { tasks, agents, state, error } = useDashboardData(config, canRead)

  const counts = useMemo(() => {
    const result: Record<StatusGroup, number> = {
      queued: 0,
      active: 0,
      completed: 0,
      failed: 0,
      review: 0,
      other: 0,
    }
    tasks.forEach((task) => {
      result[task.statusGroup] += 1
    })
    return result
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const needle = queryText.trim().toLowerCase()
    return tasks.filter(
      (task) =>
        (statusFilter === 'all' || task.statusGroup === statusFilter) &&
        (!needle ||
          task.title.toLowerCase().includes(needle) ||
          task.status.toLowerCase().includes(needle) ||
          task.currentStepDescription.toLowerCase().includes(needle)),
    )
  }, [queryText, statusFilter, tasks])

  const activeTasks = tasks.filter((task) => task.statusGroup === 'active')
  const reviewTasks = tasks.filter((task) => task.statusGroup === 'review')
  const chartData = (Object.keys(groupLabels) as StatusGroup[])
    .filter((group) => counts[group] > 0)
    .map((group) => ({ name: groupLabels[group], value: counts[group], group }))
  const chartGradient = useMemo(() => {
    if (!tasks.length) {
      return '#252a38'
    }
    let start = 0
    const segments = chartData.map((item) => {
      const end = start + (item.value / tasks.length) * 360
      const segment = `${groupColors[item.group]} ${start}deg ${end}deg`
      start = end
      return segment
    })
    return `conic-gradient(${segments.join(', ')})`
  }, [chartData, tasks.length])

  const handleSignIn = async () => {
    try {
      setAuthError('')
      await signInWithGoogle()
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  if (configError) {
    return <div className="fatal-error"><CircleAlert />{configError}</div>
  }
  const authenticationSettled = config
    ? demo ||
      !config.requireAuthentication ||
      !firebaseIsConfigured() ||
      authReady
    : false
  if (!config || !authenticationSettled) {
    return <div className="loading-screen"><div className="loading-ring" />Loading dashboard…</div>
  }
  if (!canRead) {
    return <SetupScreen config={config} error={authError} onSignIn={handleSignIn} />
  }

  const style = { '--accent': config.brand.accent } as CSSProperties
  return (
    <div className="app-shell" style={style}>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div><strong>{config.brand.name}</strong><span>Firestore live</span></div>
          <button type="button" className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav>
          <a className="active" href="#overview"><LayoutDashboard size={18} />Overview</a>
          <a href="#agents"><Bot size={18} />Agents<span>{agents.length}</span></a>
          <a href="#tasks"><ListFilter size={18} />Tasks<span>{tasks.length}</span></a>
          <a href="#review"><UserRoundCheck size={18} />Human review<span>{reviewTasks.length}</span></a>
        </nav>
        <div className="sidebar-foot">
          <div className="read-only-pill"><ShieldCheck size={14} />Read-only</div>
          {config.links.sourceRepository && (
            <a href={config.links.sourceRepository} target="_blank" rel="noreferrer">
              Agent source <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button type="button" className="menu-button" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className={`connection-pill connection-${state}`}>
            <span />
            {state === 'live' ? 'Live Firestore' : state === 'demo' ? 'Template preview' : state}
          </div>
          <div className="topbar-actions">
            <span className="last-sync">Synced just now</span>
            {user && (
              <>
                <img src={user.photoURL ?? ''} alt="" className="user-avatar" />
                <button type="button" className="icon-button" onClick={() => void signOutUser()} aria-label="Sign out">
                  <LogOut size={17} />
                </button>
              </>
            )}
          </div>
        </header>

        <main className="dashboard">
          <section className="hero-section" id="overview">
            <div>
              <p className="eyebrow">{config.brand.eyebrow}</p>
              <h1>Agent operations, clearly.</h1>
              <p>{config.brand.description}</p>
            </div>
            <div className="hero-status">
              <Radio size={18} />
              <div><strong>{agents.filter((agent) => !agent.stale).length} agents online</strong><span>{activeTasks.length} tasks moving now</span></div>
            </div>
          </section>

          {(error || state === 'error') && (
            <div className="error-banner"><CircleAlert size={17} />{error || 'Firestore connection failed.'}</div>
          )}

          <section className="metric-grid" aria-label="Task summary">
            <MetricCard icon={<Zap />} label="In progress" value={counts.active} detail="Actively leased" tone="active" />
            <MetricCard icon={<Clock3 />} label="Queued" value={counts.queued} detail="Waiting for agents" tone="queued" />
            <MetricCard icon={<CheckCircle2 />} label="Completed" value={counts.completed} detail="Terminal success" tone="completed" />
            <MetricCard icon={<CircleAlert />} label="Needs review" value={counts.review} detail="Human decision" tone="review" />
          </section>

          <section className="dashboard-grid">
            <article className="panel live-panel">
              <div className="panel-header">
                <div><p className="eyebrow">Live execution</p><h2>Work happening now</h2></div>
                <Activity size={20} />
              </div>
              <div className="live-task-list">
                {activeTasks.map((task) => (
                  <button type="button" className="live-task" key={task.id} onClick={() => setSelectedTask(task)}>
                    <div className="live-task-head">
                      <div><span className="pulse-ring" /><strong>{task.title}</strong></div>
                      <span>Step {task.currentStepNumber || task.stepsCompleted}</span>
                    </div>
                    <p>{task.currentStepDescription || task.summary}</p>
                    <div className="progress-track"><span style={{ width: `${Math.min(96, Math.max(12, task.currentStepNumber * 11))}%` }} /></div>
                    <div className="live-task-foot">
                      <span>{task.agentId || 'Agent assigned'}</span>
                      <span>{timeAgo(task.updatedAt)}<ChevronRight size={14} /></span>
                    </div>
                  </button>
                ))}
                {!activeTasks.length && <div className="empty-state"><CheckCircle2 /><strong>No active tasks</strong><span>All agents are ready for work.</span></div>}
              </div>
            </article>

            <article className="panel distribution-panel">
              <div className="panel-header"><div><p className="eyebrow">Portfolio</p><h2>Task distribution</h2></div></div>
              <div className="chart-wrap">
                <div className="donut-chart" style={{ background: chartGradient }}>
                  <div className="chart-center"><strong>{tasks.length}</strong><span>total tasks</span></div>
                </div>
              </div>
              <div className="chart-legend">
                {chartData.map((item) => <div key={item.group}><span style={{ background: groupColors[item.group] }} /><p>{item.name}</p><strong>{item.value}</strong></div>)}
              </div>
            </article>
          </section>

          <section className="section-block" id="agents">
            <div className="section-heading">
              <div><p className="eyebrow">Worker fleet</p><h2>Agents</h2></div>
              <span><UsersRound size={15} />{agents.filter((agent) => !agent.stale).length} healthy</span>
            </div>
            <div className="agent-grid">
              {agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
              {!agents.length && <div className="empty-panel">No agent documents found.</div>}
            </div>
          </section>

          <section className="panel tasks-panel" id="tasks">
            <div className="task-toolbar">
              <div><p className="eyebrow">Canonical queue</p><h2>Tasks</h2></div>
              <div className="task-controls">
                <label className="search-box"><Search size={16} /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search tasks" /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusGroup | 'all')}>
                  <option value="all">All statuses</option>
                  {(Object.keys(groupLabels) as StatusGroup[]).map((group) => <option value={group} key={group}>{groupLabels[group]}</option>)}
                </select>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Task</th><th>Status</th><th>Current work</th><th>Delivery</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)}>
                      <td><strong>{task.title}</strong><span>{task.id}</span></td>
                      <td><StatusBadge group={task.statusGroup} status={task.status} /></td>
                      <td><strong>{task.currentStepDescription || task.summary || 'Waiting to start'}</strong><span>{task.currentStepDetails}</span></td>
                      <td>{task.prUrl ? <a href={task.prUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><GitPullRequest size={14} />#{task.prNumber}</a> : <span className="muted">—</span>}</td>
                      <td>{timeAgo(task.updatedAt)}</td>
                      <td><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredTasks.length && <div className="table-empty">No tasks match the current filters.</div>}
          </section>

          <section className="section-block" id="review">
            <div className="section-heading">
              <div><p className="eyebrow">Decision queue</p><h2>Human review</h2></div>
              <span>{reviewTasks.length} items</span>
            </div>
            <div className="review-grid">
              {reviewTasks.map((task) => (
                <button type="button" className="review-card" key={task.id} onClick={() => setSelectedTask(task)}>
                  <div className="review-icon"><CircleAlert size={19} /></div>
                  <div><strong>{task.title}</strong><p>{task.humanReviewReason || task.summary || 'Agent requested human review.'}</p><span>Updated {timeAgo(task.updatedAt)}</span></div>
                  <ChevronRight size={17} />
                </button>
              ))}
              {!reviewTasks.length && <div className="empty-panel"><UserRoundCheck size={20} />No tasks need human review.</div>}
            </div>
          </section>
        </main>
      </div>

      {selectedTask && <TaskDrawer task={selectedTask} config={config} canRead={canRead} onClose={() => setSelectedTask(null)} />}
    </div>
  )
}

export default App
