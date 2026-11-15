interface Unit {
  id: string;
  label: string;
  factor: number;
  offset?: number;
}

export const categories: Record<string, { label: string; units: Unit[] }> = {
  length: {
    label: "Length",
    units: [
      { id: "mm", label: "Millimeters", factor: 0.001 },
      { id: "cm", label: "Centimeters", factor: 0.01 },
      { id: "m", label: "Meters", factor: 1 },
      { id: "km", label: "Kilometers", factor: 1000 },
      { id: "in", label: "Inches", factor: 0.0254 },
      { id: "ft", label: "Feet", factor: 0.3048 },
      { id: "yd", label: "Yards", factor: 0.9144 },
      { id: "mi", label: "Miles", factor: 1609.344 },
    ],
  },
  weight: {
    label: "Weight",
    units: [
      { id: "mg", label: "Milligrams", factor: 0.001 },
      { id: "g", label: "Grams", factor: 1 },
      { id: "kg", label: "Kilograms", factor: 1000 },
      { id: "oz", label: "Ounces", factor: 28.349523125 },
      { id: "lb", label: "Pounds", factor: 453.59237 },
    ],
  },
  temperature: {
    label: "Temperature",
    units: [
      { id: "C", label: "Celsius", factor: 1, offset: 273.15 },
      {
        id: "F",
        label: "Fahrenheit",
        factor: 5 / 9,
        offset: 273.15 - (32 * 5) / 9,
      },
      { id: "K", label: "Kelvin", factor: 1 },
    ],
  },
  data: {
    label: "Data size",
    units: [
      { id: "B", label: "Bytes", factor: 1 },
      ...["KB", "MB", "GB", "TB"].map((id, index) => ({
        id,
        label: `${id} (decimal)`,
        factor: 1000 ** (index + 1),
      })),
      ...["KiB", "MiB", "GiB", "TiB"].map((id, index) => ({
        id,
        label: `${id} (binary)`,
        factor: 1024 ** (index + 1),
      })),
    ],
  },
};

export function convert(
  input: string,
  category: string,
  from: string,
  to: string,
): { value?: number; error?: string } {
  const trimmed = input.trim();
  if (!trimmed || ["-", "+", ".", "-.", "+."].includes(trimmed)) return {};
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed))
    return { error: "Enter a valid number." };
  const amount = Number(trimmed);
  const source = categories[category]?.units.find((unit) => unit.id === from);
  const target = categories[category]?.units.find((unit) => unit.id === to);
  if (!source || !target) return { error: "Select valid units." };
  const base = amount * source.factor + (source.offset ?? 0);
  if (category === "temperature" && base < -1e-10)
    return { error: "Temperature cannot be below absolute zero." };
  const value =
    from === to
      ? amount
      : ((category === "temperature" ? Math.max(0, base) : base) -
          (target.offset ?? 0)) /
        target.factor;
  if (!Number.isFinite(amount) || !Number.isFinite(value))
    return { error: "This value is outside the supported range." };
  return { value: Object.is(value, -0) ? 0 : value };
}

export function formatConversion(value: number): string {
  return String(Number(value.toPrecision(12)));
}
