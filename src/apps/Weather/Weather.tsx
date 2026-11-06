import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { RefreshCw, MapPin, Search, Thermometer, Droplets, Wind, ChevronRight } from "lucide-react";
import { useWeatherStore } from "../../stores/useWeatherStore";
import { weatherLabel, weatherIcon, toF } from "./weatherApi";
import type { AppProps } from "../../types";
import "./Weather.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Weather({}: AppProps) {
  const { city, country, unit, weather, loading, error, setUnit, searchCity, refresh } = useWeatherStore();
  const [configOpen, setConfigOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!weather) refresh();
  }, []);

  async function handleSearch() {
    if (!searchInput.trim()) return;
    setSearchError("");
    try {
      await searchCity(searchInput.trim());
      setSearchInput("");
      setConfigOpen(false);
    } catch {
      setSearchError("City not found");
    }
  }

  function temp(c: number) {
    return unit === "C" ? `${c}°C` : `${toF(c)}°F`;
  }

  const IconComp = (code: number) => {
    const name = weatherIcon(code);
    const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Cloud;
    return <I size={48} />;
  };

  const SmallIcon = (code: number, size = 20) => {
    const name = weatherIcon(code);
    const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Cloud;
    return <I size={size} />;
  };

  return (
    <div className="weather">
      {/* Toolbar */}
      <div className="weather__bar">
        <div className="weather__location">
          <MapPin size={13} />
          <span>{city}, {country}</span>
        </div>
        <div className="weather__bar-actions">
          <button
            className={`weather__unit-btn ${unit === "C" ? "weather__unit-btn--active" : ""}`}
            onClick={() => setUnit("C")}
          >°C</button>
          <button
            className={`weather__unit-btn ${unit === "F" ? "weather__unit-btn--active" : ""}`}
            onClick={() => setUnit("F")}
          >°F</button>
          <button className="weather__icon-btn" onClick={refresh} title="Refresh" disabled={loading}>
            <RefreshCw size={14} className={loading ? "weather__spin" : undefined} />
          </button>
          <button
            className={`weather__icon-btn ${configOpen ? "weather__icon-btn--active" : ""}`}
            onClick={() => setConfigOpen((v) => !v)}
            title="Configure location"
          >
            <MapPin size={14} />
            <ChevronRight size={12} style={{ transform: configOpen ? "rotate(90deg)" : undefined, transition: "transform 0.2s" }} />
          </button>
        </div>
      </div>

      {/* Config panel */}
      {configOpen && (
        <div className="weather__config">
          <div className="weather__config-search">
            <Search size={14} />
            <input
              className="weather__config-input"
              placeholder="Enter city name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              autoFocus
            />
            <button className="weather__config-go" onClick={handleSearch} disabled={loading}>
              {loading ? <RefreshCw size={13} className="weather__spin" /> : <Search size={13} />}
            </button>
          </div>
          {searchError && <div className="weather__config-error">{searchError}</div>}
          {error && <div className="weather__config-error">{error}</div>}
        </div>
      )}

      {/* Loading */}
      {loading && !weather && (
        <div className="weather__loading">
          <RefreshCw size={28} className="weather__spin" />
          <span>Fetching weather…</span>
        </div>
      )}

      {/* Error (no weather yet) */}
      {error && !weather && (
        <div className="weather__loading weather__error">
          <Icons.CloudOff size={28} />
          <span>{error}</span>
        </div>
      )}

      {/* Main content */}
      {weather && (
        <div className="weather__content">
          {/* Current */}
          <div className="weather__current">
            <div className="weather__current-icon">
              {IconComp(weather.current.weatherCode)}
            </div>
            <div className="weather__current-info">
              <div className="weather__temp">{temp(weather.current.temp)}</div>
              <div className="weather__label">{weatherLabel(weather.current.weatherCode)}</div>
            </div>
          </div>

          {/* Details */}
          <div className="weather__details">
            <div className="weather__detail">
              <Thermometer size={14} />
              <span>Feels like {temp(weather.current.feelsLike)}</span>
            </div>
            <div className="weather__detail">
              <Droplets size={14} />
              <span>Humidity {weather.current.humidity}%</span>
            </div>
            <div className="weather__detail">
              <Wind size={14} />
              <span>Wind {weather.current.windSpeed} km/h</span>
            </div>
          </div>

          {/* 5-day forecast */}
          <div className="weather__forecast">
            {weather.daily.map((day, i) => {
              const d = new Date(day.date + "T12:00:00");
              const label = i === 0 ? "Today" : DAYS[d.getDay()];
              return (
                <div key={day.date} className="weather__forecast-day">
                  <span className="weather__forecast-label">{label}</span>
                  {SmallIcon(day.weatherCode, 18)}
                  <span className="weather__forecast-range">
                    {temp(day.tempMin)} / {temp(day.tempMax)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
