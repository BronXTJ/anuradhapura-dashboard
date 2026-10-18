export type DivisionMode = 'ds' | 'gn'

export type Division = {
  mode: DivisionMode
  name: string
  pcode: string
  parentName: string
  parentPcode: string
  centerLat: number
  centerLon: number
  geometry: { type: string; coordinates: unknown }
}

type BoundaryFeature = {
  properties?: Record<string, unknown> | null
  geometry?: { type: string; coordinates: unknown } | null
}

export type BoundaryCollection = {
  type: string
  features: BoundaryFeature[]
}

export type DivisionCatalog = {
  dsCollection: BoundaryCollection
  gnCollection: BoundaryCollection
  ds: Division[]
  gn: Division[]
}

function readDivision(mode: DivisionMode, feature: BoundaryFeature): Division | null {
  const properties = feature.properties ?? {}
  const name = String(properties.name ?? '')
  const pcode = String(properties.pcode ?? '')
  const centerLat = Number(properties.center_lat)
  const centerLon = Number(properties.center_lon)
  if (!name || !pcode || !feature.geometry || !Number.isFinite(centerLat) || !Number.isFinite(centerLon)) return null
  return {
    mode,
    name,
    pcode,
    parentName: String(properties.parent_name ?? ''),
    parentPcode: String(properties.parent_pcode ?? ''),
    centerLat,
    centerLon,
    geometry: feature.geometry,
  }
}

async function fetchCollection(url: string): Promise<BoundaryCollection> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} failed (${response.status})`)
  return response.json() as Promise<BoundaryCollection>
}

function byName(left: Division, right: Division): number {
  return left.name.localeCompare(right.name) || left.parentName.localeCompare(right.parentName) || left.pcode.localeCompare(right.pcode)
}

let catalogPromise: Promise<DivisionCatalog> | null = null

export function loadDivisions(): Promise<DivisionCatalog> {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      fetchCollection('/data/ds.geojson'),
      fetchCollection('/data/gn.geojson'),
    ]).then(([dsCollection, gnCollection]) => ({
      dsCollection,
      gnCollection,
      ds: dsCollection.features.map((feature) => readDivision('ds', feature)).filter((division) => division !== null).sort(byName),
      gn: gnCollection.features.map((feature) => readDivision('gn', feature)).filter((division) => division !== null).sort(byName),
    }))
  }
  return catalogPromise
}

export function divisionLabel(division: Division): string {
  if (division.mode === 'gn') return `${division.name} — ${division.parentName}`
  return division.name
}
