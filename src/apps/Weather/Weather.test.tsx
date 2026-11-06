import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Weather } from "./Weather";
import { useWeatherStore } from "../../stores/useWeatherStore";
import { weatherLabel, weatherIcon, toF } from "./weatherApi";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

// ---- Unit tests for helpers ----

describe("weatherLabel", () => {
  it("maps code 0 to Clear Sky", () => expect(weatherLabel(0)).toBe("Clear Sky"));
  it("maps code 3 to Overcast", () => expect(weatherLabel(3)).toBe("Overcast"));
  it("maps code 61 to Rain", () => expect(weatherLabel(61)).toBe("Rain"));
  it("maps code 95 to Thunderstorm", () => expect(weatherLabel(95)).toBe("Thunderstorm"));
});

describe("weatherIcon", () => {
  it("returns Sun for clear sky", () => expect(weatherIcon(0)).toBe("Sun"));
  it("returns CloudRain for rain", () => expect(weatherIcon(61)).toBe("CloudRain"));
  it("returns CloudSnow for snow", () => expect(weatherIcon(71)).toBe("CloudSnow"));
  it("returns CloudLightning for thunderstorm", () => expect(weatherIcon(95)).toBe("CloudLightning"));
});

describe("toF", () => {
  it("converts 0°C to 32°F", () => expect(toF(0)).toBe(32));
  it("converts 100°C to 212°F", () => expect(toF(100)).toBe(212));
  it("converts 20°C to 68°F", () => expect(toF(20)).toBe(68));
});

// ---- Component tests with mocked fetch ----

const MOCK_GEO = {
  results: [{ name: "London", country: "United Kingdom", latitude: 51.5, longitude: -0.1 }],
};

const MOCK_WEATHER = {
  current: {
    temperature_2m: 15,
    apparent_temperature: 13,
    relative_humidity_2m: 72,
    wind_speed_10m: 20,
    weather_code: 3,
  },
  daily: {
    time: ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    weather_code: [3, 61, 0, 3, 71],
    temperature_2m_max: [16, 14, 18, 15, 10],
    temperature_2m_min: [8, 10, 11, 9, 4],
  },
};

function mockFetch(geoData = MOCK_GEO, weatherData = MOCK_WEATHER) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: RequestInfo | URL) => {
    const str = String(url);
    const data = str.includes("geocoding") ? geoData : weatherData;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
  });
}

function renderWeather() {
  const winId = useWindowStore.getState().openWindow({
    appId: "weather", title: "Weather", icon: "CloudSun", width: 380, height: 480,
  });
  return render(<Weather windowId={winId} />);
}

describe("Weather component", () => {
  beforeEach(() => {
    resetAllStores();
    useWeatherStore.setState({ weather: null, loading: false, error: null, unit: "C", city: "Sofia", country: "Bulgaria" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetches and displays current temperature and label", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => expect(screen.getByText("15°C")).toBeInTheDocument());
    expect(screen.getByText("Overcast")).toBeInTheDocument();
  });

  it("shows the city and country in the toolbar", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => expect(screen.getByText("Sofia, Bulgaria")).toBeInTheDocument());
  });

  it("shows feels like, humidity and wind details", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => {
      expect(screen.getByText(/Feels like 13°C/)).toBeInTheDocument();
      expect(screen.getByText(/Humidity 72%/)).toBeInTheDocument();
      expect(screen.getByText(/Wind 20 km\/h/)).toBeInTheDocument();
    });
  });

  it("toggles temperature unit to °F", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => screen.getByText("15°C"));
    await userEvent.click(screen.getByText("°F"));
    expect(screen.getByText("59°F")).toBeInTheDocument();
  });

  it("shows the config panel when location button is clicked", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => screen.getByText("15°C"));
    const configBtn = screen.getByTitle("Configure location");
    await userEvent.click(configBtn);
    expect(screen.getByPlaceholderText("Enter city name…")).toBeInTheDocument();
  });

  it("searches for a new city and updates the display", async () => {
    mockFetch();
    renderWeather();
    await waitFor(() => screen.getByText("15°C"));
    await userEvent.click(screen.getByTitle("Configure location"));
    await userEvent.type(screen.getByPlaceholderText("Enter city name…"), "London{Enter}");
    await waitFor(() => expect(screen.getByText("London, United Kingdom")).toBeInTheDocument());
  });

  it("sets an error in the store when city is not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: () => Promise.resolve({ results: [] }),
    } as Response);
    await useWeatherStore.getState().searchCity("Nowhere");
    expect(useWeatherStore.getState().error).toMatch(/not found/i);
  });
});
