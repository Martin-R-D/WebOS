import { create } from "zustand";
import { persist } from "zustand/middleware";
import { geocode, fetchWeather } from "../apps/Weather/weatherApi";
import type { WeatherData } from "../apps/Weather/weatherApi";

interface WeatherState {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  unit: "C" | "F";
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  setUnit: (unit: "C" | "F") => void;
  searchCity: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      city: "Sofia",
      country: "Bulgaria",
      latitude: 42.6977,
      longitude: 23.3219,
      unit: "C",
      weather: null,
      loading: false,
      error: null,

      setUnit: (unit) => set({ unit }),

      searchCity: async (name: string) => {
        set({ loading: true, error: null });
        try {
          const geo = await geocode(name);
          const weather = await fetchWeather(geo.latitude, geo.longitude);
          set({ city: geo.name, country: geo.country, latitude: geo.latitude, longitude: geo.longitude, weather, loading: false });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },

      refresh: async () => {
        const { latitude, longitude } = get();
        set({ loading: true, error: null });
        try {
          const weather = await fetchWeather(latitude, longitude);
          set({ weather, loading: false });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },
    }),
    {
      name: "webos-weather",
      partialize: (s) => ({ city: s.city, country: s.country, latitude: s.latitude, longitude: s.longitude, unit: s.unit }),
    },
  ),
);
