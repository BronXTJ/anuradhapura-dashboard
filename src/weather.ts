/** Open-Meteo readings for one lat/lng. Air quality can fail without dropping the weather. */

export const DISTRICT_CENTER = { latitude: 8.3694, longitude: 80.43987 }

export type HourPoint = {
  label: string
  temp: number
  feels: number
  rain: number
}

export type WeatherReading = {
  temperature: string
  feelsLike: string
  humidity: string
  wind: string
  rainfall: string
  uvIndex: string
  aqi: string
  pm25: string
  aqError: boolean
  hourly: HourPoint[]
}

type ForecastResponse = {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    precipitation?: number
    uv_index?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    apparent_temperature?: number[]
    precipitation?: number[]
  }
}

type AirResponse = {
  current?: {
    us_aqi?: number
    pm2_5?: number
  }
}

function formatNumber(value: number | undefined, digits: number): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function hourLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(11, 16)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function airWithTimeout(url: string, signal: AbortSignal): Promise<Response | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 5000)
    fetch(url, { signal, cache: 'no-store' })
      .then((response) => {
        window.clearTimeout(timer)
        resolve(response)
      })
      .catch(() => {
        window.clearTimeout(timer)
        resolve(null)
      })
  })
}

export async function loadWeather(latitude: number, longitude: number, signal: AbortSignal): Promise<WeatherReading> {
  const point = `latitude=${latitude}&longitude=${longitude}&timezone=Asia%2FColombo`
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?${point}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,uv_index' +
    '&hourly=temperature_2m,apparent_temperature,precipitation&forecast_hours=24&wind_speed_unit=kmh'
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${point}&current=us_aqi,pm2_5`

  const [forecastResponse, airResponse] = await Promise.all([
    fetch(forecastUrl, { signal, cache: 'no-store' }),
    airWithTimeout(airUrl, signal),
  ])
  if (!forecastResponse.ok) throw new Error('Weather request failed')
  const forecast = (await forecastResponse.json()) as ForecastResponse
  const current = forecast.current
  const times = forecast.hourly?.time ?? []
  const temps = forecast.hourly?.temperature_2m ?? []
  const feels = forecast.hourly?.apparent_temperature ?? []
  const rain = forecast.hourly?.precipitation ?? []
  const hourly = times.slice(0, 24).flatMap((time, index) => {
    const temp = temps[index]
    if (temp == null || Number.isNaN(temp)) return []
    return [
      {
        label: hourLabel(time),
        temp: Number(temp),
        feels: Number(feels[index] ?? temp),
        rain: Number(rain[index] ?? 0),
      },
    ]
  })
  if (current?.temperature_2m == null) throw new Error('Weather response was incomplete')

  let aqi = '—'
  let pm25 = '—'
  let aqError = true
  if (airResponse?.ok) {
    const air = (await airResponse.json()) as AirResponse
    if (air.current?.us_aqi != null) aqi = String(Math.round(air.current.us_aqi))
    if (air.current?.pm2_5 != null) pm25 = formatNumber(air.current.pm2_5, 1)
    aqError = aqi === '—' && pm25 === '—'
  }

  return {
    temperature: formatNumber(current.temperature_2m, 1),
    feelsLike: formatNumber(current.apparent_temperature, 1),
    humidity: current.relative_humidity_2m == null ? '—' : String(Math.round(current.relative_humidity_2m)),
    wind: formatNumber(current.wind_speed_10m, 1),
    rainfall: formatNumber(current.precipitation, 1),
    uvIndex: formatNumber(current.uv_index, 1),
    aqi,
    pm25,
    aqError,
    hourly,
  }
}
