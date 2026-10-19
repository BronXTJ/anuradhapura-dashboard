/**
 * District map.
 * A click selects the DS or GN under the cursor (GN wins) and reports that point for live weather.
 * Streets are OpenStreetMap. Satellite is Esri World Imagery.
 */

import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { loadDivisions, type BoundaryCollection, type Division, type DivisionMode } from '../divisions.ts'

const layers = [
  { id: 'district', label: 'District', color: '#ef4444', defaultOn: true },
  { id: 'ds', label: 'DS', color: '#c084fc', defaultOn: true },
  { id: 'gn', label: 'GN', color: '#fb923c', defaultOn: false },
  { id: 'roads', label: 'Roads', color: '#facc15', defaultOn: false },
  { id: 'buildings', label: 'Buildings', color: '#94a3b8', defaultOn: false },
  { id: 'pois', label: 'POIs', color: '#f472b6', defaultOn: false },
] as const

type LayerId = (typeof layers)[number]['id']
type BasemapId = 'streets' | 'satellite'

const STREETS_TILES = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
]
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

async function fetchBoundary(url: string): Promise<BoundaryCollection> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} failed (${response.status})`)
  return response.json() as Promise<BoundaryCollection>
}

function setLineVisibility(map: Map, layerId: string, visible: boolean) {
  const value = visible ? 'visible' : 'none'
  const fillId = layerId.replace('boundary', 'fill')
  for (const id of [layerId, `${layerId}-glow`, fillId]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', value)
  }
}

function beforeBoundary(map: Map): string | undefined {
  for (const id of ['gn-boundary-glow', 'gn-boundary', 'ds-boundary-glow', 'ds-boundary', 'district-boundary']) {
    if (map.getLayer(id)) return id
  }
  return undefined
}

function addBoundaryLine(
  map: Map,
  sourceId: string,
  layerId: string,
  data: BoundaryCollection,
  color: string,
  visible: boolean,
  width: number,
  promoteId?: string,
  glow = false,
) {
  map.addSource(sourceId, { type: 'geojson', data, ...(promoteId ? { promoteId } : {}) })
  if (promoteId) {
    map.addLayer({
      id: layerId.replace('boundary', 'fill'),
      type: 'fill',
      source: sourceId,
      layout: { visibility: visible ? 'visible' : 'none' },
      paint: { 'fill-color': color, 'fill-opacity': 0.01 },
    })
  }
  if (promoteId && glow) {
    map.addLayer({
      id: `${layerId}-glow`,
      type: 'line',
      source: sourceId,
      layout: { visibility: visible ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#38bdf8',
        'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 8, 0],
        'line-blur': 3,
        'line-opacity': 0.45,
      },
    })
  }
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: { visibility: visible ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': color,
      'line-width': promoteId ? ['case', ['boolean', ['feature-state', 'selected'], false], 3.5, width] : width,
    },
  })
}

type MapPaneProps = {
  mode: DivisionMode
  selectedPcode: string | null
  selectedName: string | null
  onProbe: (latitude: number, longitude: number) => void
  onSelect: (division: Division) => void
}

export function MapPane({ mode, selectedPcode, selectedName, onProbe, onSelect }: MapPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const basemapRef = useRef<BasemapId>('streets')
  const districtOnRef = useRef(true)
  const dsOnRef = useRef(true)
  const gnOnRef = useRef(false)
  const seenModeRef = useRef(mode)
  const districtBoundsRef = useRef<LngLatBounds | null>(null)
  const highlightedRef = useRef<{ mode: DivisionMode; pcode: string } | null>(null)
  const onSelectRef = useRef(onSelect)
  const onProbeRef = useRef(onProbe)
  const [basemap, setBasemap] = useState<BasemapId>('streets')
  const [layersOpen, setLayersOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [coords, setCoords] = useState<{ x: number; y: number; label: string } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOn])) as Record<LayerId, boolean>,
  )

  useEffect(() => {
    basemapRef.current = basemap
  }, [basemap])

  useEffect(() => {
    onSelectRef.current = onSelect
    onProbeRef.current = onProbe
  }, [onSelect, onProbe])

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
    const map = mapRef.current
    if (!mapReady || !map) return
    map.resize()
  }, [expanded, mapReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const map = new Map({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0b1220' } }],
      },
      center: [80.4399, 8.3694],
      zoom: 8,
      maxZoom: 19,
      attributionControl: { compact: false },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    mapRef.current = map

    const onClick = (event: { point: [number, number] | { x: number; y: number }; lngLat?: { lat: number; lng: number } }) => {
      setCoords(null)
      if (event.lngLat) onProbeRef.current(event.lngLat.lat, event.lngLat.lng)
      const layerIds = ['gn-fill', 'ds-fill'].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none')
      if (layerIds.length === 0) return
      const hits = map.queryRenderedFeatures(event.point, { layers: layerIds })
      const hit = hits.find((feature) => feature.layer.id === 'gn-fill') ?? hits.find((feature) => feature.layer.id === 'ds-fill')
      if (!hit) return
      const pickedMode: DivisionMode = hit.layer.id === 'gn-fill' ? 'gn' : 'ds'
      const pcode = String(hit.id ?? hit.properties?.pcode ?? '')
      if (!pcode) return
      void loadDivisions().then((catalog) => {
        const division = catalog[pickedMode].find((item) => item.pcode === pcode)
        if (division) onSelectRef.current(division)
      })
    }

    const onContextMenu = (event: { originalEvent?: MouseEvent; lngLat: { lat: number; lng: number }; point: { x: number; y: number } }) => {
      event.originalEvent?.preventDefault()
      setCoords({
        x: event.point.x,
        y: event.point.y,
        label: `${event.lngLat.lat.toFixed(6)}, ${event.lngLat.lng.toFixed(6)}`,
      })
    }

    const onDomContext = (event: MouseEvent) => {
      event.preventDefault()
      const rect = map.getCanvas().getBoundingClientRect()
      const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]
      const lngLat = map.unproject(point)
      setCoords({ x: point[0], y: point[1], label: `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}` })
    }

    map.on('load', () => {
      if (cancelled) return
      map.addSource('streets', {
        type: 'raster',
        tiles: STREETS_TILES,
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      })
      map.addLayer({
        id: 'streets',
        type: 'raster',
        source: 'streets',
        layout: { visibility: basemapRef.current === 'streets' ? 'visible' : 'none' },
      })
      map.addSource('satellite', {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      })
      map.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: basemapRef.current === 'satellite' ? 'visible' : 'none' },
      })

      void Promise.allSettled([loadDivisions(), fetchBoundary('/data/district.geojson')]).then((results) => {
        if (cancelled || !mapRef.current) return
        const [catalogResult, districtResult] = results
        if (catalogResult.status === 'fulfilled') {
          addBoundaryLine(map, 'gn', 'gn-boundary', catalogResult.value.gnCollection, '#fb923c', gnOnRef.current, 1, 'pcode', true)
          addBoundaryLine(map, 'ds', 'ds-boundary', catalogResult.value.dsCollection, '#c084fc', dsOnRef.current, 1.5, 'pcode', true)
        } else {
          console.error(catalogResult.reason)
        }
        if (districtResult.status === 'fulfilled') {
          addBoundaryLine(map, 'district', 'district-boundary', districtResult.value, '#ef4444', districtOnRef.current, 2.2)
          const bounds = new LngLatBounds()
          for (const feature of districtResult.value.features) {
            if (feature.geometry) extendBounds(bounds, feature.geometry.coordinates)
          }
          districtBoundsRef.current = bounds
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 32, duration: 0 })
        } else {
          console.error(districtResult.reason)
        }
        map.resize()
        setMapReady(true)
      })
    })

    map.on('click', onClick)
    map.on('contextmenu', onContextMenu)
    map.on('movestart', () => setCoords(null))
    map.on('zoomstart', () => setCoords(null))
    map.getContainer().addEventListener('contextmenu', onDomContext)

    return () => {
      cancelled = true
      map.getContainer().removeEventListener('contextmenu', onDomContext)
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
    if (!mapReady || !map) return
    setLineVisibility(map, 'district-boundary', enabled.district)
  }, [enabled.district, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    setLineVisibility(map, 'ds-boundary', enabled.ds)
  }, [enabled.ds, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    setLineVisibility(map, 'gn-boundary', enabled.gn)
  }, [enabled.gn, mapReady])

  useEffect(() => {
    if (seenModeRef.current === mode) return
    seenModeRef.current = mode
    setEnabled((current) => ({ ...current, [mode]: true }))
  }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    let cancelled = false
    void loadDivisions().then((catalog) => {
      if (cancelled || mapRef.current !== map) return
      const previous = highlightedRef.current
      if (previous && map.getSource(previous.mode)) map.removeFeatureState({ source: previous.mode, id: previous.pcode })
      if (!selectedPcode) {
        highlightedRef.current = null
        if (previous && districtBoundsRef.current && !districtBoundsRef.current.isEmpty()) {
          map.fitBounds(districtBoundsRef.current, { padding: 32, duration: 0 })
        }
        return
      }
      const division = catalog[mode].find((item) => item.pcode === selectedPcode)
      if (!division || !map.getSource(mode)) return
      setEnabled((current) => (current[mode] ? current : { ...current, [mode]: true }))
      map.setFeatureState({ source: mode, id: division.pcode }, { selected: true })
      highlightedRef.current = { mode, pcode: division.pcode }
      const bounds = new LngLatBounds()
      extendBounds(bounds, division.geometry.coordinates)
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, duration: 400, maxZoom: 13 })
    })
    return () => {
      cancelled = true
    }
  }, [mapReady, mode, selectedPcode])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    let cancelled = false
    if (!enabled.roads) {
      if (map.getLayer('roads-line')) map.setLayoutProperty('roads-line', 'visibility', 'none')
      return
    }
    if (map.getLayer('roads-line')) {
      map.setLayoutProperty('roads-line', 'visibility', 'visible')
      return
    }
    void fetchBoundary('/data/roads.geojson')
      .then((data) => {
        if (cancelled || mapRef.current !== map || map.getSource('roads')) return
        map.addSource('roads', { type: 'geojson', data })
        map.addLayer({ id: 'roads-line', type: 'line', source: 'roads', paint: { 'line-color': '#facc15', 'line-width': 1.4, 'line-opacity': 0.9 } }, beforeBoundary(map))
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [enabled.roads, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    let cancelled = false
    if (!enabled.pois) {
      if (map.getLayer('pois-circle')) map.setLayoutProperty('pois-circle', 'visibility', 'none')
      return
    }
    if (map.getLayer('pois-circle')) {
      map.setLayoutProperty('pois-circle', 'visibility', 'visible')
      return
    }
    void fetchBoundary('/data/pois.geojson')
      .then((data) => {
        if (cancelled || mapRef.current !== map || map.getSource('pois')) return
        map.addSource('pois', { type: 'geojson', data })
        map.addLayer(
          {
            id: 'pois-circle',
            type: 'circle',
            source: 'pois',
            paint: { 'circle-color': '#f472b6', 'circle-radius': 3.5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 0.6 },
          },
          beforeBoundary(map),
        )
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [enabled.pois, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    let cancelled = false
    const hide = () => {
      for (const id of ['buildings-fill', 'buildings-line']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
      }
    }
    if (!enabled.buildings) {
      hide()
      return
    }
    if (map.getLayer('buildings-fill')) {
      map.setLayoutProperty('buildings-fill', 'visibility', 'visible')
      if (map.getLayer('buildings-line')) map.setLayoutProperty('buildings-line', 'visibility', 'visible')
      return
    }
    void loadDivisions()
      .then((catalog) =>
        Promise.all(
          catalog.ds.map(async (division) => {
            const response = await fetch(`/data/buildings/${division.pcode}.geojson`)
            if (!response.ok) return null
            return response.json() as Promise<BoundaryCollection>
          }),
        ),
      )
      .then((collections) => {
        if (cancelled || mapRef.current !== map || map.getSource('buildings')) return
        const data: BoundaryCollection = {
          type: 'FeatureCollection',
          features: collections.flatMap((collection) => collection?.features ?? []),
        }
        if (data.features.length === 0) return
        map.addSource('buildings', { type: 'geojson', data })
        map.addLayer({ id: 'buildings-fill', type: 'fill', source: 'buildings', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.45 } }, beforeBoundary(map))
        map.addLayer({ id: 'buildings-line', type: 'line', source: 'buildings', paint: { 'line-color': '#cbd5e1', 'line-width': 0.4, 'line-opacity': 0.7 } }, beforeBoundary(map))
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [enabled.buildings, mapReady])

  return (
    <section className={expanded ? 'map-pane is-expanded' : 'map-pane'} aria-label="Map">
      <div ref={containerRef} className="map-canvas" />
      <button
        type="button"
        className="map-expand"
        aria-pressed={expanded}
        aria-label={expanded ? 'Restore the map' : 'Expand the map'}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? '⤢' : '⛶'}
      </button>
      <div className="map-fab">
        <button type="button" className="fab-button" aria-expanded={layersOpen} aria-label="Toggle map layers panel" onClick={() => setLayersOpen((open) => !open)}>
          {layersOpen ? '×' : '☰'}
        </button>
        {layersOpen ? (
          <div className="map-layer-panel">
            <p className="map-layer-title">Map layers</p>
            <p className="basemap-label">Basemap</p>
            <div className="basemap-switch" role="group" aria-label="Basemap">
              <button type="button" aria-pressed={basemap === 'streets'} onClick={() => setBasemap('streets')}>Streets</button>
              <button type="button" aria-pressed={basemap === 'satellite'} onClick={() => setBasemap('satellite')}>Satellite</button>
            </div>
            {layers.map((layer) => (
              <label key={layer.id} className="layer-switch">
                <span>
                  <span className="layer-dot" style={{ background: layer.color }} />
                  {layer.label}
                </span>
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={enabled[layer.id]}
                    onChange={() => setEnabled((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
                  />
                  <span className="switch-track" />
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
      {coords ? (
        <div className="coord-popup" style={{ left: coords.x, top: coords.y }} onContextMenu={(event) => event.preventDefault()}>
          <button type="button" onClick={() => void navigator.clipboard.writeText(coords.label)}>{coords.label}</button>
          <button type="button" aria-label="Copy coordinates" onClick={() => void navigator.clipboard.writeText(coords.label)}>Copy</button>
        </div>
      ) : null}
      <div className="map-legend-card">
        <p>Legend</p>
        <ul>
          {layers.filter((layer) => enabled[layer.id]).map((layer) => (
            <li key={layer.id}>
              <span className="layer-dot" style={{ background: layer.color }} />
              {layer.label}
            </li>
          ))}
          {selectedName ? (
            <li>
              <span className="layer-dot is-selected" />
              Selected: {selectedName}
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  )
}
