import { describe, expect, it } from "vitest";

import { calculateTariffs } from "./calculator";
import type { TripInput } from "./types";

const baseInput: TripInput = {
	vehicleClass: "A",
	start: new Date(2026, 5, 15, 9, 0),
	end: new Date(2026, 5, 15, 11, 0),
	distanceKm: 20,
	usageContext: "stuttgart",
	customerType: "individual",
};

describe("calculateTariffs", () => {
	it("calculates and ranks all private tariffs", () => {
		const result = calculateTariffs(baseInput);

		expect(result.results).toHaveLength(3);
		expect(result.results.map((entry) => entry.rank)).toEqual([1, 2, 3]);
		expect(result.results[0]?.highlight).toBe("best");
		expect(result.results[1]?.highlight).toBe("second");
	});

	it("rounds non-half-hour times up before calculating", () => {
		const result = calculateTariffs({
			...baseInput,
			start: new Date(2026, 5, 15, 9, 10),
			end: new Date(2026, 5, 15, 11, 10),
		});

		expect(result.input.normalizedStart.getHours()).toBe(9);
		expect(result.input.normalizedStart.getMinutes()).toBe(30);
		expect(result.input.normalizedEnd.getHours()).toBe(11);
		expect(result.input.normalizedEnd.getMinutes()).toBe(30);
		expect(
			result.messages.some((message) =>
				message.message.includes("aufgerundet"),
			),
		).toBe(true);
	});

	it("rejects bookings shorter than one hour", () => {
		const result = calculateTariffs({
			...baseInput,
			start: new Date(2026, 5, 15, 9, 0),
			end: new Date(2026, 5, 15, 9, 30),
		});

		expect(result.results).toHaveLength(0);
		expect(
			result.messages.some((message) => message.severity === "error"),
		).toBe(true);
	});

	it("uses Basic Fahrtkosten for Classic in cross-use context", () => {
		const result = calculateTariffs({ ...baseInput, usageContext: "crossUse" });
		const classic = result.results.find(
			(entry) => entry.tariff.id === "classic",
		);

		expect(classic?.billedTariff.id).toBe("basic");
		expect(classic?.isCrossUseSubstitution).toBe(true);
		expect(classic?.notes.some((note) => note.includes("Basic"))).toBe(true);
	});

	it("does not add monthly base costs to the trip total", () => {
		const result = calculateTariffs(baseInput);

		expect(
			result.results.every((entry) => entry.totalWithBaseCosts === null),
		).toBe(true);
		expect(
			result.results.every((entry) => entry.baseCostMonthly !== undefined),
		).toBe(true);
	});

	it("uses actual clock time for hourly time costs", () => {
		const result = calculateTariffs({
			...baseInput,
			start: new Date(2026, 5, 15, 23, 0),
			end: new Date(2026, 5, 16, 7, 0),
			distanceKm: 0,
		});
		const classic = result.results.find(
			(entry) => entry.tariff.id === "classic",
		);

		expect(classic?.timeCost.segments).toEqual([
			expect.objectContaining({
				label: "7-24 Uhr",
				hours: 1,
				rate: 1.9,
				cost: 1.9,
			}),
			expect.objectContaining({ label: "0-7 Uhr", hours: 7, rate: 0, cost: 0 }),
		]);
		expect(classic?.timeCost.total).toBe(1.9);
	});

	it("uses the 24h price when hourly pricing is more expensive", () => {
		const result = calculateTariffs({
			...baseInput,
			start: new Date(2026, 5, 15, 7, 0),
			end: new Date(2026, 5, 15, 23, 0),
			distanceKm: 0,
		});
		const classic = result.results.find(
			(entry) => entry.tariff.id === "classic",
		);

		expect(classic?.timeCost.selectedKind).toBe("daily");
		expect(classic?.timeCost.total).toBe(22);
	});

	it("caps multi-day bookings at the cheaper 24h price", () => {
		const result = calculateTariffs({
			...baseInput,
			vehicleClass: "B",
			start: new Date(2026, 5, 20, 6, 30),
			end: new Date(2026, 5, 21, 21, 0),
			distanceKm: 0,
		});
		const classic = result.results.find(
			(entry) => entry.tariff.id === "classic",
		);

		expect(classic?.timeCost.selectedKind).toBe("daily");
		expect(classic?.timeCost.selectedLabel).toBe("2 × 24h-Preis");
		expect(classic?.timeCost.total).toBe(52);
	});

	it("applies kilometer tiers", () => {
		const result = calculateTariffs({
			...baseInput,
			vehicleClass: "B",
			distanceKm: 150,
		});
		const classic = result.results.find(
			(entry) => entry.tariff.id === "classic",
		);

		expect(classic?.kilometerCost.segments).toEqual([
			expect.objectContaining({ kilometers: 100, rate: 0.32 }),
			expect.objectContaining({ kilometers: 50, rate: 0.29 }),
		]);
	});

	it("calculates shorty class with booking fee and shorty-zone note", () => {
		const result = calculateTariffs({
			...baseInput,
			vehicleClass: "S",
			distanceKm: 10,
		});
		const shorty = result.results.find((entry) => entry.tariff.id === "shorty");

		expect(result.results.map((entry) => entry.tariff.id)).toContain("shorty");
		expect(shorty?.timeCost.bookingFee).toBe(1);
		expect(shorty?.notes).toContain(
			"Maximale Nutzungsdauer 24 Stunden. Fahrzeuge müssen in der shorty-Zone zurückgestellt werden.",
		);
	});
});
