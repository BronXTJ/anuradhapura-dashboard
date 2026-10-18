import { useState } from 'react'
import { divisionLabel, type Division, type DivisionMode } from './divisions.ts'
import { MapPane } from './components/MapPane.tsx'
import { OverviewPanel } from './components/OverviewPanel.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import './styles/overview.css'

export default function App() {
  const [mode, setMode] = useState<DivisionMode>('ds')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Division | null>(null)

  function changeMode(next: DivisionMode) {
    setMode(next)
    setQuery('')
    setSelected(null)
  }

  return (
    <main className="app-frame">
      <Sidebar />
      <OverviewPanel
        mode={mode}
        query={query}
        selected={selected}
        onModeChange={changeMode}
        onQueryChange={(value) => {
          setQuery(value)
          setSelected(null)
        }}
        onSelect={(division) => {
          setSelected(division)
          setQuery(divisionLabel(division))
        }}
        onBack={() => {
          setQuery('')
          setSelected(null)
        }}
      />
      <MapPane mode={mode} selectedPcode={selected?.pcode ?? null} />
    </main>
  )
}
