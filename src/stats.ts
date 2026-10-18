export type StatRecord = {
  name: string
  pcode: string
  area_sqkm: number
  population: number
  housing: number
  population_density: number
  housing_density: number
}

type StatsFile = {
  district: StatRecord
  ds: StatRecord[]
  gn: StatRecord[]
}

export type StatCatalog = {
  district: StatRecord
  ds: Map<string, StatRecord>
  gn: Map<string, StatRecord>
}

function indexRows(rows: StatRecord[]): Map<string, StatRecord> {
  return new Map(rows.map((row) => [row.pcode, row]))
}

let statsPromise: Promise<StatCatalog> | null = null

export function loadStats(): Promise<StatCatalog> {
  if (!statsPromise) {
    statsPromise = fetch('/data/stats.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Stats request failed (${response.status})`)
        return response.json() as Promise<StatsFile>
      })
      .then((file) => ({
        district: file.district,
        ds: indexRows(file.ds),
        gn: indexRows(file.gn),
      }))
  }
  return statsPromise
}
