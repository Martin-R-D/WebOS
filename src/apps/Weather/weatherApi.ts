export interface GeoResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface DailyWeather {
  date: string;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather[];
}

export async function geocode(city: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  if (!data.results?.length) throw new Error(`City "${city}" not found`);
  const r = data.results[0];
  return { name: r.name, country: r.country, latitude: r.latitude, longitude: r.longitude };
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "5",
    timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Weather request failed");
  const d = await res.json();
  const c = d.current;
  return {
    current: {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      weatherCode: c.weather_code,
    },
    daily: (d.daily.time as string[]).map((date: string, i: number) => ({
      date,
      tempMin: Math.round(d.daily.temperature_2m_min[i]),
      tempMax: Math.round(d.daily.temperature_2m_max[i]),
      weatherCode: d.daily.weather_code[i],
    })),
  };
}

// WMO weather code mappings
export function weatherLabel(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

export function weatherIcon(code: number): string {
  if (code === 0) return "Sun";
  if (code <= 2) return "CloudSun";
  if (code === 3) return "Cloud";
  if (code <= 49) return "CloudFog";
  if (code <= 57) return "CloudDrizzle";
  if (code <= 67) return "CloudRain";
  if (code <= 77) return "CloudSnow";
  if (code <= 82) return "CloudRain";
  if (code <= 86) return "CloudSnow";
  if (code <= 99) return "CloudLightning";
  return "Cloud";
}

export function toF(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}
