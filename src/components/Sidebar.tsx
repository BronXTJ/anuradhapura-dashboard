/** Left menu. Only Overview is a working page. The other rows are labels for later sections. */

import { useEffect, useState } from 'react'

const focusItems = [
  'Centrality Analysis',
  'Density Analysis',
  'Urban Maturation',
  'Walk Accessibility',
  'Network Form',
]

type MenuRow = {
  label: string
  tone?: 'amber' | 'emerald' | 'guide' | 'developer'
  current?: boolean
}

const menuRows: MenuRow[] = [
  { label: 'Movement & Behaviour' },
  { label: 'Land Cover Change' },
  { label: 'Environmental Analysis' },
  { label: 'Synthesis', tone: 'amber' },
  { label: 'Issues & Potentials' },
  { label: 'Export Maps', tone: 'emerald' },
  { label: 'User Guide', tone: 'guide' },
  { label: 'Developer', tone: 'developer' },
]

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
    </svg>
  )
}

export function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const [focusOpen, setFocusOpen] = useState(true)

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', expanded ? '240px' : '64px')
  }, [expanded])

  return (
    <aside className={expanded ? 'sidebar' : 'sidebar is-collapsed'}>
      <div className="city-card">
        <p className="city-live">
          <span className="city-identity-pulse-dot" />
          Live
        </p>
        <p className="city-title">Urban Analytics</p>
        <p className="city-kicker">Dashboard</p>
        <p className="city-place">Anuradhapura District</p>
      </div>
      <nav className="sidebar-nav" aria-label="Primary">
        <button type="button" className="menu-row is-active" aria-current="page">
          <span className="menu-label">Overview</span>
        </button>
        <button
          type="button"
          className="menu-row"
          aria-expanded={focusOpen}
          onClick={() => setFocusOpen((open) => !open)}
        >
          <span className="menu-label">Focus Area</span>
          <svg className="menu-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d={focusOpen ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6'} />
          </svg>
        </button>
        {focusOpen ? (
          <div className="focus-pocket">
            {focusItems.map((label) => (
              <button key={label} type="button" className="focus-row">
                <span className="focus-dot" />
                <span className="menu-label">{label}</span>
              </button>
            ))}
          </div>
        ) : null}
        {menuRows.map((row) => (
          <button key={row.label} type="button" className={row.tone ? `menu-row is-${row.tone}` : 'menu-row'}>
            {row.tone === 'developer' ? (
              <span className="dev-sidebar-icon-glitch">
                <CodeIcon />
              </span>
            ) : null}
            <span className="menu-label">{row.label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar-edge"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => setExpanded((open) => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={expanded ? 'M14 6 8 12l6 6' : 'M10 6l6 6-6 6'} />
        </svg>
      </button>
    </aside>
  )
}
