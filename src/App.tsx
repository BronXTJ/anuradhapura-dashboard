/**
 * Selection updates the census cards.
 * The weather probe is the clicked map point, or the selected division's center.
 */

import { useState } from 'react'
import { divisionLabel, type Division, type DivisionMode } from './divisions.ts'
import type { WeatherPoint } from './components/ConditionsPanel.tsx'
import { MapPane } from './components/MapPane.tsx'
import { OverviewPanel } from './components/OverviewPanel.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import './styles/overview.css'

export default function App() {
  const [mode, setMode] = useState<DivisionMode>('ds')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Division | null>(null)
  const [probe, setProbe] = useState<WeatherPoint | null>(null)

  function changeMode(next: DivisionMode) {
    setMode(next)
    setQuery('')
    setSelected(null)
    setProbe(null)
  }

  return (
    <main className="app-frame">
      <Sidebar />
      <MapPane
        mode={mode}
        selectedPcode={selected?.pcode ?? null}
        selectedName={selected ? divisionLabel(selected) : null}
        onProbe={(latitude, longitude) => setProbe({ latitude, longitude })}
        onSelect={(division) => {
          setMode(division.mode)
          setSelected(division)
          setQuery(divisionLabel(division))
        }}
      />
      <OverviewPanel
        mode={mode}
        query={query}
        selected={selected}
        probe={probe}
        onModeChange={changeMode}
        onQueryChange={(value) => {
          setQuery(value)
          setSelected(null)
          setProbe(null)
        }}
        onSelect={(division) => {
          setSelected(division)
          setQuery(divisionLabel(division))
          setProbe({ latitude: division.centerLat, longitude: division.centerLon })
        }}
        onBack={() => {
          setQuery('')
          setSelected(null)
          setProbe(null)
        }}
      />
    </main>
  )
}
