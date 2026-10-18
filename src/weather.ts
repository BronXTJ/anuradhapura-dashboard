export const DISTRICT_CENTER = { latitude: 8.3694, longitude: 80.43987 }

export type WeatherReading = {
  temperature: string
  feelsLike: string
  humidity: string
  wind: string
  rainfall: string
  uvIndex: string
  aqi: string
  pm25: string
  hourly: number[]
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
    temperature_2m?: number[]
  }
}

type AirResponse = {
  current?: {
    us_aqi?: number
    pm2_5?: number
  }
}

function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits)
}

export async function loadWeather(latitude: number, longitude: number, signal: AbortSignal): Promise<WeatherReading> {
  const point = `latitude=${latitude}&longitude=${longitude}&timezone=Asia%2FColombo`
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?${point}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,uv_index' +
    '&hourly=temperature_2m&forecast_hours=24&wind_speed_unit=kmh'
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${point}&current=us_aqi,pm2_5`

  const [forecastResponse, airResponse] = await Promise.all([
    fetch(forecastUrl, { signal }),
    fetch(airUrl, { signal }),
  ])
  if (!forecastResponse.ok || !airResponse.ok) {
    throw new Error('Weather request failed')
  }
  const forecast = (await forecastResponse.json()) as ForecastResponse
  const air = (await airResponse.json()) as AirResponse
  const current = forecast.current
  const hourly = forecast.hourly?.temperature_2m?.slice(0, 24) ?? []
  if (
    current?.temperature_2m == null ||
    current.apparent_temperature == null ||
    current.relative_humidity_2m == null ||
    current.wind_speed_10m == null ||
    current.precipitation == null ||
    current.uv_index == null ||
    air.current?.us_aqi == null ||
    air.current.pm2_5 == null ||
    hourly.length < 2
  ) {
    throw new Error('Weather response was incomplete')
  }

  return {
    temperature: `${formatNumber(current.temperature_2m, 1)}°C`,
    feelsLike: `${formatNumber(current.apparent_temperature, 1)}°C`,
    humidity: `${Math.round(current.relative_humidity_2m)}%`,
    wind: `${formatNumber(current.wind_speed_10m, 1)} km/h`,
    rainfall: `${formatNumber(current.precipitation, 1)} mm`,
    uvIndex: formatNumber(current.uv_index, 1),
    aqi: String(Math.round(air.current.us_aqi)),
    pm25: `${formatNumber(air.current.pm2_5, 1)} µg/m³`,
    hourly,
  }
}
