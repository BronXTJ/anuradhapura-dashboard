import { divisionLabel, type Division, type DivisionMode } from '../divisions.ts'
import { ConditionsPanel } from './ConditionsPanel.tsx'
import { DivisionSearch } from './DivisionSearch.tsx'
import { StatGrid } from './StatGrid.tsx'

type OverviewPanelProps = {
  mode: DivisionMode
  query: string
  selected: Division | null
  onModeChange: (mode: DivisionMode) => void
  onQueryChange: (value: string) => void
  onSelect: (division: Division) => void
  onBack: () => void
}

export function OverviewPanel({
  mode,
  query,
  selected,
  onModeChange,
  onQueryChange,
  onSelect,
  onBack,
}: OverviewPanelProps) {
  const subtitle = selected
    ? `Showing ${mode === 'ds' ? 'DS' : 'GN'} division data for ${divisionLabel(selected)}`
    : 'District overview'

  return (
    <section className="overview" aria-label="Overview">
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
        <div className="mode-switch" role="group" aria-label="View by">
          <button type="button" aria-pressed={mode === 'ds'} onClick={() => onModeChange('ds')}>
            DS divisions
          </button>
          <button type="button" aria-pressed={mode === 'gn'} onClick={() => onModeChange('gn')}>
            GN divisions
          </button>
        </div>
        <DivisionSearch key={mode} mode={mode} query={query} onQueryChange={onQueryChange} onSelect={onSelect} />
      </div>
      <StatGrid />
      <ConditionsPanel />
    </section>
  )
}
