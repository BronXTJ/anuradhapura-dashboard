import { useState } from 'react'

const layers = [
  { id: 'district', label: 'Anuradhapura district boundary', color: '#f87171', defaultOn: true },
  { id: 'ds', label: 'DS boundaries', color: '#c084fc', defaultOn: true },
  { id: 'gn', label: 'GN boundaries', color: '#fb923c', defaultOn: false },
  { id: 'roads', label: 'Road network', color: '#facc15', defaultOn: false },
  { id: 'buildings', label: 'Buildings', color: '#94a3b8', defaultOn: false },
  { id: 'pois', label: 'POIs', color: '#f472b6', defaultOn: false },
] as const

type LayerId = (typeof layers)[number]['id']

export function MapPane() {
  const [basemap, setBasemap] = useState<'streets' | 'satellite'>('streets')
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOn])) as Record<LayerId, boolean>,
  )

  return (
    <section className="map-pane" aria-label="Map preview">
      <div className="map-canvas">
        <p>Map preview</p>
      </div>
      <div className="map-controls">
        <div className="basemap-switch" role="group" aria-label="Basemap">
          <button
            type="button"
            aria-pressed={basemap === 'streets'}
            onClick={() => setBasemap('streets')}
          >
            Streets
          </button>
          <button
            type="button"
            aria-pressed={basemap === 'satellite'}
            onClick={() => setBasemap('satellite')}
          >
            Satellite
          </button>
        </div>
        <ul className="layer-list">
          {layers.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                className="layer-toggle"
                aria-pressed={enabled[layer.id]}
                onClick={() =>
                  setEnabled((current) => ({ ...current, [layer.id]: !current[layer.id] }))
                }
              >
                <span className="layer-dot" style={{ background: layer.color }} />
                <span>{layer.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
