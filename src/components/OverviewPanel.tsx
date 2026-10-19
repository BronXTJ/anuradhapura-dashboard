/** Right column: search, census cards, then live readings. The 24-hour chart is below the fold. */

import { divisionLabel, type Division, type DivisionMode } from '../divisions.ts'
import { ConditionsOutlook, ConditionsSummary, useConditions, type WeatherPoint } from './ConditionsPanel.tsx'
import { DivisionSearch } from './DivisionSearch.tsx'
import { StatGrid } from './StatGrid.tsx'

type OverviewPanelProps = {
  mode: DivisionMode
  query: string
  selected: Division | null
  probe: WeatherPoint | null
  onModeChange: (mode: DivisionMode) => void
  onQueryChange: (value: string) => void
  onSelect: (division: Division) => void
  onBack: () => void
}

export function OverviewPanel({
  mode,
  query,
  selected,
  probe,
  onModeChange,
  onQueryChange,
  onSelect,
  onBack,
}: OverviewPanelProps) {
  const weather = useConditions(selected, probe)
  const subtitle = selected
    ? `Showing ${mode === 'ds' ? 'DS' : 'GN'} division data for ${divisionLabel(selected)}`
    : 'District overview'

  return (
    <section className="overview" aria-label="Overview">
      <div className="overview-fold">
        <header className="overview-head">
          <p className="eyebrow">Primary study area</p>
          <h1>Anuradhapura District</h1>
          <div className="subtitle-row">
            <p className="subtitle">{subtitle}</p>
            {selected ? (
              <button type="button" className="back-button" onClick={onBack}>
                Back to district
              </button>
            ) : null}
          </div>
        </header>
        <div className="view-row">
          <div className={mode === 'gn' ? 'mode-switch is-gn' : 'mode-switch'} role="group" aria-label="View by">
            <span className="mode-pill" aria-hidden="true" />
            <button type="button" aria-pressed={mode === 'ds'} onClick={() => onModeChange('ds')}>
              DS divisions
            </button>
            <button type="button" aria-pressed={mode === 'gn'} onClick={() => onModeChange('gn')}>
              GN divisions
            </button>
          </div>
          <DivisionSearch key={mode} mode={mode} query={query} onQueryChange={onQueryChange} onSelect={onSelect} />
        </div>
        <StatGrid mode={mode} selectedPcode={selected?.pcode ?? null} />
        <ConditionsSummary state={weather} />
      </div>
      <ConditionsOutlook state={weather} />
    </section>
  )
}
