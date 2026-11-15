import { expect, it } from "vitest";
import { convert, formatConversion } from "./conversion";
import { useConverterStore } from "../../stores/useConverterStore";

it.each([
  ["1", "length", "in", "cm", 2.54],
  ["1", "weight", "lb", "g", 453.59237],
  ["0", "temperature", "C", "F", 32],
  ["-273.15", "temperature", "C", "K", 0],
  ["1", "data", "KB", "B", 1000],
  ["1", "data", "KiB", "B", 1024],
  ["1e3", "length", "m", "km", 1],
])("converts %s %s %s to %s", (value, category, from, to, expected) => {
  expect(convert(value, category, from, to).value).toBeCloseTo(expected, 9);
});
it("handles partial input, range errors, absolute zero and round trips", () => {
  expect(convert("-", "length", "m", "cm")).toEqual({});
  expect(convert("bad", "length", "m", "cm").error).toBeDefined();
  expect(convert("1e999", "length", "m", "cm").error).toBeDefined();
  expect(convert("-1", "temperature", "K", "C").error).toMatch(/absolute zero/);
  const first = convert("12.345", "length", "m", "ft").value!;
  expect(convert(String(first), "length", "ft", "m").value).toBeCloseTo(
    12.345,
    10,
  );
  expect(formatConversion(0.1 + 0.2)).toBe("0.3");
});
it("repairs invalid saved preferences and retains valid unit pairs", async () => {
  localStorage.setItem(
    "webos-converter",
    JSON.stringify({
      version: 1,
      state: {
        category: "missing",
        pairs: {
          length: { from: "bad", to: "m" },
          temperature: { from: "F", to: "C" },
        },
      },
    }),
  );
  await useConverterStore.persist.rehydrate();
  expect(useConverterStore.getState().category).toBe("length");
  expect(useConverterStore.getState().pairs.length.from).toBe("mm");
  expect(useConverterStore.getState().pairs.temperature).toEqual({
    from: "F",
    to: "C",
  });
});
