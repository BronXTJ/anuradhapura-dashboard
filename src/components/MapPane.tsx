import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const layers = [
  { id: 'district', label: 'Anuradhapura district boundary', color: '#f87171', defaultOn: true },
  { id: 'ds', label: 'DS boundaries', color: '#c084fc', defaultOn: true },
  { id: 'gn', label: 'GN boundaries', color: '#fb923c', defaultOn: false },
  { id: 'roads', label: 'Road network', color: '#facc15', defaultOn: false },
  { id: 'buildings', label: 'Buildings', color: '#94a3b8', defaultOn: false },
  { id: 'pois', label: 'POIs', color: '#f472b6', defaultOn: false },
] as const

type LayerId = (typeof layers)[number]['id']
type BasemapId = 'streets' | 'satellite'

const STREETS_TILES = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
const SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function extendBounds(bounds: LngLatBounds, coordinates: unknown): void {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    bounds.extend([coordinates[0], coordinates[1]])
    return
  }
  for (const child of coordinates) extendBounds(bounds, child)
}

type BoundaryCollection = {
  features: Array<{ geometry: { coordinates: unknown } | null }>
}

async function fetchBoundary(url: string): Promise<BoundaryCollection> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} failed (${response.status})`)
  return response.json() as Promise<BoundaryCollection>
}

function addBoundaryLine(
  map: Map,
  sourceId: string,
  layerId: string,
  data: BoundaryCollection,
  color: string,
  visible: boolean,
  width: number,
) {
  map.addSource(sourceId, { type: 'geojson', data })
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'line-color': color,
      'line-width': width,
    },
  })
}

export function MapPane() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const basemapRef = useRef<BasemapId>('streets')
  const districtOnRef = useRef(true)
  const dsOnRef = useRef(true)
  const gnOnRef = useRef(false)
  const [basemap, setBasemap] = useState<BasemapId>('streets')
  const [mapReady, setMapReady] = useState(false)
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOn])) as Record<LayerId, boolean>,
  )

  useEffect(() => {
    basemapRef.current = basemap
  }, [basemap])

  useEffect(() => {
    districtOnRef.current = enabled.district
  }, [enabled.district])

  useEffect(() => {
    dsOnRef.current = enabled.ds
  }, [enabled.ds])

  useEffect(() => {
    gnOnRef.current = enabled.gn
  }, [enabled.gn])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    const map = new Map({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0b1220' },
          },
        ],
      },
      center: [80.4399, 8.3694],
      zoom: 8,
      maxZoom: 19,
      attributionControl: { compact: false },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    mapRef.current = map

    map.on('load', () => {
      if (cancelled) return
      map.addSource('streets', {
        type: 'raster',
        tiles: [STREETS_TILES],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      })
      map.addSource('satellite', {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        attribution:
          'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      })
      map.addLayer({
        id: 'streets',
        type: 'raster',
        source: 'streets',
        layout: { visibility: basemapRef.current === 'streets' ? 'visible' : 'none' },
      })
      map.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: basemapRef.current === 'satellite' ? 'visible' : 'none' },
      })

      void Promise.allSettled([
        fetchBoundary('/data/gn.geojson'),
        fetchBoundary('/data/ds.geojson'),
        fetchBoundary('/data/district.geojson'),
      ]).then((results) => {
        if (cancelled || !mapRef.current) return
        const [gnData, dsData, districtData] = results
        if (gnData.status === 'fulfilled') {
          addBoundaryLine(map, 'gn', 'gn-boundary', gnData.value, '#fb923c', gnOnRef.current, 1)
        } else {
          console.error(gnData.reason)
        }
        if (dsData.status === 'fulfilled') {
          addBoundaryLine(map, 'ds', 'ds-boundary', dsData.value, '#c084fc', dsOnRef.current, 1.5)
        } else {
          console.error(dsData.reason)
        }
        if (districtData.status === 'fulfilled') {
          addBoundaryLine(
            map,
            'district',
            'district-boundary',
            districtData.value,
            '#f87171',
            districtOnRef.current,
            2,
          )
          const bounds = new LngLatBounds()
          for (const feature of districtData.value.features) {
            if (feature.geometry) extendBounds(bounds, feature.geometry.coordinates)
          }
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 32, duration: 0 })
          }
        } else {
          console.error(districtData.reason)
        }
        map.resize()
        setMapReady(true)
      })
    })

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('streets') || !map.getLayer('satellite')) return
    map.setLayoutProperty('streets', 'visibility', basemap === 'streets' ? 'visible' : 'none')
    map.setLayoutProperty('satellite', 'visibility', basemap === 'satellite' ? 'visible' : 'none')
  }, [basemap, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('district-boundary')) return
    map.setLayoutProperty('district-boundary', 'visibility', enabled.district ? 'visible' : 'none')
  }, [enabled.district, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('ds-boundary')) return
    map.setLayoutProperty('ds-boundary', 'visibility', enabled.ds ? 'visible' : 'none')
  }, [enabled.ds, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('gn-boundary')) return
    map.setLayoutProperty('gn-boundary', 'visibility', enabled.gn ? 'visible' : 'none')
  }, [enabled.gn, mapReady])

  return (
    <section className="map-pane" aria-label="Map">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-controls">
        <div className="basemap-switch" role="group" aria-label="Basemap">
          <button type="button" aria-pressed={basemap === 'streets'} onClick={() => setBasemap('streets')}>
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
