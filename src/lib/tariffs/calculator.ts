import { TARIFFS } from "./data";
import { durationHours, roundUpToHalfHour } from "./dates";
import type {
	CalculationResult,
	KilometerCostBreakdown,
	NormalizedTripInput,
	TariffCalculationResult,
	TariffDefinition,
	TimeCostBreakdown,
	TimePriceKind,
	TimeRates,
	TripInput,
	ValidationMessage,
} from "./types";

const HALF_HOUR = 0.5;
const DAY_HOURS = 24;
const WEEK_HOURS = 168;

export function calculateTariffs(input: TripInput): CalculationResult {
	const normalizedStart = roundUpToHalfHour(input.start);
	const normalizedEnd = roundUpToHalfHour(input.end);
	const normalized: NormalizedTripInput = {
		...input,
		normalizedStart,
		normalizedEnd,
		durationHours: durationHours(normalizedStart, normalizedEnd),
	};
	const messages = validateInput(input, normalized);

	if (messages.some((message) => message.severity === "error")) {
		return { input: normalized, messages, results: [] };
	}

	const sorted = TARIFFS.filter(
		(tariff) => tariff.id !== "shorty" || normalized.vehicleClass === "S",
	)
		.map((tariff) => calculateTariff(tariff, normalized))
		.sort((left, right) => left.variableTotal - right.variableTotal)
		.map(
			(result, index) =>
				({
					...result,
					rank: index + 1,
					highlight: index === 0 ? "best" : "none",
				}) satisfies TariffCalculationResult,
		);

	return { input: normalized, messages, results: sorted };
}

function validateInput(
	input: TripInput,
	normalized: NormalizedTripInput,
): ValidationMessage[] {
	const messages: ValidationMessage[] = [];

	if (input.end <= input.start) {
		messages.push({
			severity: "error",
			message: "Das Buchungsende muss nach dem Buchungsbeginn liegen.",
		});
	}

	if (input.distanceKm < 0) {
		messages.push({
			severity: "error",
			message: "Die Entfernung muss mindestens 0 km betragen.",
		});
	}

	if (normalized.durationHours > 0 && normalized.durationHours < 1) {
		messages.push({
			severity: "error",
			message: "Die Mindestbuchungszeit beträgt 1 Stunde.",
		});
	}

	if (normalized.vehicleClass === "S") {
		if (normalized.durationHours > 24) {
			messages.push({
				severity: "error",
				message: "Maximale Nutzungsdauer 24 Stunden.",
			});
		} else {
			messages.push({
				severity: "warning",
				message: "Maximale Nutzungsdauer 24 Stunden.",
			});
		}
	}

	if (
		input.start.getTime() !== normalized.normalizedStart.getTime() ||
		input.end.getTime() !== normalized.normalizedEnd.getTime()
	) {
		messages.push({
			severity: "info",
			message:
				"Nicht-halbstündige Zeiten wurden automatisch auf die nächste halbe Stunde aufgerundet.",
		});
	}

	messages.push({
		severity: "info",
		message:
			"Zeitkosten werden pro angefangene halbe Stunde berechnet; die günstigste Kombination aus Stunden-, 24h- und ggf. Wochentarif wird angesetzt.",
	});

	return messages;
}

function calculateTariff(
	tariff: TariffDefinition,
	input: NormalizedTripInput,
): TariffCalculationResult {
	const billedTariff = getBilledTariff(tariff, input);
	const rates = billedTariff.rates[input.vehicleClass];
	const timeCost = calculateTimeCost(
		input.normalizedStart,
		input.normalizedEnd,
		rates.time,
	);
	const kilometerCost = calculateKilometerCost(
		input.distanceKm,
		rates.kilometers,
		input.usageContext === "stuttgart",
	);
	const baseCostMonthly =
		tariff.baseCosts.monthly[input.customerType] ??
		tariff.baseCosts.monthly.individual ??
		null;
	const variableTotal = roundMoney(
		timeCost.total + timeCost.bookingFee + kilometerCost.total,
	);
	const notes = [
		...tariff.notes,
		...(tariff.baseCosts.monthly[input.customerType] === undefined &&
		input.customerType === "household"
			? [
					"Für Haushalt wird bei diesem Tarif kein eigener Monatsbeitrag ausgewiesen; angezeigt wird Einzelperson.",
				]
			: []),
		...(tariff.id !== billedTariff.id
			? [
					`Im Quernutzungspool werden die Fahrtkosten von ${billedTariff.name} verwendet.`,
				]
			: []),
		...(input.usageContext === "crossUse" &&
		billedTariff.notes.some((note) => note.includes("Langstrecken"))
			? [
					"Der Langstrecken-Tarif gilt nur für Fahrzeuge von stadtmobil carsharing AG, Stuttgart; bei Quernutzung läuft die vorherige km-Stufe weiter.",
				]
			: []),
	];

	return {
		tariff,
		billedTariff,
		isCrossUseSubstitution: tariff.id !== billedTariff.id,
		baseCostMonthly,
		timeCost,
		kilometerCost,
		variableTotal,
		totalWithBaseCosts: null,
		rank: 0,
		highlight: "none",
		notes,
	};
}

function getBilledTariff(tariff: TariffDefinition, input: NormalizedTripInput) {
	if (input.usageContext !== "crossUse" || !tariff.crossUseBillingTariffId) {
		return tariff;
	}

	return (
		TARIFFS.find(
			(candidate) => candidate.id === tariff.crossUseBillingTariffId,
		) ?? tariff
	);
}

function calculateTimeCost(
	start: Date,
	end: Date,
	rates: TimeRates,
): TimeCostBreakdown {
	const duration = durationHours(start, end);
	const roundedDuration = Math.ceil(duration / HALF_HOUR) * HALF_HOUR;
	const hourlyCost = calculateHourlySegments(start, roundedDuration, rates);
	const candidates: Array<{
		kind: TimePriceKind;
		label: string;
		cost: number;
	}> = [
		{
			kind: "hourly",
			label: "Stundenpreis nach Uhrzeit",
			cost: hourlyCost.total,
		},
	];

	if (rates.daily !== undefined) {
		candidates.push({
			kind: "daily",
			label: `${Math.ceil(roundedDuration / DAY_HOURS)} × 24h-Preis`,
			cost: Math.ceil(roundedDuration / DAY_HOURS) * rates.daily,
		});
		candidates.push(findBestPackageCombination(start, roundedDuration, rates));
	}

	if (rates.weekly !== undefined) {
		candidates.push({
			kind: "weekly",
			label: `${Math.ceil(roundedDuration / WEEK_HOURS)} × Wochentarif`,
			cost: Math.ceil(roundedDuration / WEEK_HOURS) * rates.weekly,
		});
	}

	const selected = [...candidates].sort(
		(left, right) => left.cost - right.cost,
	)[0];
	const bookingFee = rates.bookingFee ?? 0;

	return {
		selectedKind: selected.kind,
		segments: hourlyCost.segments,
		selectedLabel: selected.label,
		candidateCosts: candidates.map((candidate) => ({
			...candidate,
			cost: roundMoney(candidate.cost),
		})),
		total: roundMoney(selected.cost),
		bookingFee,
	};
}

function calculateHourlySegments(
	start: Date,
	duration: number,
	rates: TimeRates,
) {
	const totals = new Map<
		string,
		{ label: string; hours: number; rate: number }
	>();

	for (let offset = 0; offset < duration; offset += HALF_HOUR) {
		const slotStart = new Date(start.getTime() + offset * 60 * 60 * 1000);
		const tier = findHourlyTier(slotStart, rates);
		if (!tier) {
			continue;
		}

		const key = `${tier.label}-${tier.rate}`;
		const current = totals.get(key) ?? {
			label: tier.label,
			hours: 0,
			rate: tier.rate,
		};
		current.hours += HALF_HOUR;
		totals.set(key, current);
	}

	const segments = [...totals.values()].map((segment) => ({
		...segment,
		cost: roundMoney(segment.hours * segment.rate),
	}));

	return {
		segments,
		total: roundMoney(segments.reduce((sum, segment) => sum + segment.cost, 0)),
	};
}

function findHourlyTier(slotStart: Date, rates: TimeRates) {
	const hour = slotStart.getHours() + slotStart.getMinutes() / 60;
	return rates.hourly.find((tier) => {
		const tierEnd = tier.toHour ?? DAY_HOURS;
		return hour >= tier.fromHour && hour < tierEnd;
	});
}

function findBestPackageCombination(
	start: Date,
	duration: number,
	rates: TimeRates,
) {
	let best = {
		kind: "combined" as TimePriceKind,
		label: "Kombination aus Woche/24h/Stunden",
		cost: Number.POSITIVE_INFINITY,
	};
	const maxWeeks = Math.ceil(duration / WEEK_HOURS);

	for (let weeks = 0; weeks <= maxWeeks; weeks += 1) {
		const hoursAfterWeeks = Math.max(0, duration - weeks * WEEK_HOURS);
		const maxDays = Math.ceil(hoursAfterWeeks / DAY_HOURS);
		for (let days = 0; days <= maxDays; days += 1) {
			const remainingHours = Math.max(0, hoursAfterWeeks - days * DAY_HOURS);
			const remainderStart = new Date(
				start.getTime() +
					(weeks * WEEK_HOURS + days * DAY_HOURS) * 60 * 60 * 1000,
			);
			const hourlyRemainder = calculateHourlySegments(
				remainderStart,
				remainingHours,
				rates,
			).total;
			const cost =
				weeks * (rates.weekly ?? Number.POSITIVE_INFINITY) +
				days * (rates.daily ?? Number.POSITIVE_INFINITY) +
				hourlyRemainder;

			if (cost < best.cost) {
				const parts = [
					weeks > 0 ? `${weeks} × Woche` : null,
					days > 0 ? `${days} × 24h` : null,
					remainingHours > 0
						? `${remainingHours.toLocaleString("de-DE")} h nach Stundenpreis`
						: null,
				].filter(Boolean);
				best = { ...best, label: parts.join(" + ") || "0 h", cost };
			}
		}
	}

	return best;
}

function calculateKilometerCost(
	distanceKm: number,
	tiers: TariffDefinition["rates"]["A"]["kilometers"],
	isStuttgartVehicle: boolean,
): KilometerCostBreakdown {
	const usableTiers = tiers.filter(
		(tier) => isStuttgartVehicle || !tier.requiresStuttgartVehicle,
	);
	const segments = [];

	for (const [index, tier] of usableTiers.entries()) {
		const nextTier = usableTiers[index + 1];
		const upperBound =
			tier.upToKm ?? nextTier?.fromKm ?? Number.POSITIVE_INFINITY;
		const kilometers = Math.max(
			0,
			Math.min(distanceKm, upperBound) - tier.fromKm,
		);

		if (kilometers > 0) {
			segments.push({
				label: tier.label,
				kilometers,
				rate: tier.rate,
				cost: roundMoney(kilometers * tier.rate),
			});
		}
	}

	return {
		segments,
		total: roundMoney(segments.reduce((sum, segment) => sum + segment.cost, 0)),
	};
}

function roundMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
