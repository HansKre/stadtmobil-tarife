import type { TariffDefinition, VehicleClassInfo } from "./types";

export const TARIFF_SOURCE = {
	label: "stadtmobil Stuttgart Preise & Tarife für Privatkunden",
	url: "https://stuttgart.stadtmobil.de/privatkunden/preise-tarife/",
	validSince: "18.05.2026",
};

export const VEHICLE_CLASSES: VehicleClassInfo[] = [
	{ code: "S", label: "S: shorty", description: "shorty" },
	{ code: "A", label: "A: Mini", description: "Mini" },
	{
		code: "B",
		label: "B: Kleinwagen / Kastenwagen / Elektroauto",
		description: "Klein-, Kastenwagen, E-Auto",
	},
	{
		code: "C",
		label: "C: Kombi / Hochdachkombi",
		description: "Kombi, Hochdach",
	},
	{
		code: "D",
		label: "D: Limousine",
		description: "Limousine",
	},
	{
		code: "F",
		label: "F: Kleinbus / Transporter",
		description: "Kleinbus, Transporter",
	},
];

export const TARIFFS: TariffDefinition[] = [
	{
		id: "shorty",
		name: "Shorty",
		description:
			"Für spontane kurze Fahrten mit shorty-Fahrzeugen in Stuttgart.",
		baseCosts: { admissionFee: 0, monthly: { individual: 0 } },
		notes: [
			"Reservierung 15 Minuten möglich. Bei Nichtantritt kostenpflichtig (Buchungsgebühr).",
			"Maximale Nutzungsdauer 24 Stunden. Fahrzeuge müssen in der shorty-Zone zurückgestellt werden.",
			"Keine Quernutzungsmöglichkeit.",
		],
		rates: shortyOnlyRates(shortyTime(5, 1), 0.7),
	},
	{
		id: "classic",
		name: "Classic",
		description:
			"Für Normalfahrer:innen; rechnet sich ab etwa 2-3 Fahrten im Monat.",
		baseCosts: {
			admissionFee: 60,
			monthly: { individual: 9.5, household: 15 },
			notes: [
				"Ein Haushalt kann aus bis zu drei Personen bestehen. Inklusive zwei Zugangskarten (10,- € pro weitere Karte).",
			],
		},
		crossUseBillingTariffId: "basic",
		notes: [
			"Gilt für Fahrten mit Fahrzeugen der stadtmobil carsharing AG, Stuttgart.",
			"Fahrten im Quernutzungspool werden mit den Fahrtkosten des Tarif Basic abgerechnet.",
		],
		rates: {
			S: { time: shortyTime(2.4, 1), kilometers: flatKilometers(0.32) },
			A: {
				time: durationTieredTime(0, 1.9, 22, 130),
				kilometers: kilometerTiers(0.29, 0.27, 0.27),
			},
			B: {
				time: durationTieredTime(0, 2.4, 26, 155),
				kilometers: kilometerTiers(0.32, 0.29, 0.26),
			},
			C: {
				time: durationTieredTime(0, 3, 33, 170),
				kilometers: kilometerTiers(0.36, 0.31, 0.27),
			},
			D: {
				time: durationTieredTime(1.5, 3.4, 36, 210),
				kilometers: kilometerTiers(0.39, 0.35, 0.35),
			},
			F: {
				time: durationTieredTime(2.5, 4.4, 45, 255),
				kilometers: kilometerTiers(0.43, 0.37, 0.37),
			},
		},
	},
	{
		id: "basic",
		name: "Basic",
		description:
			"Ideal für Kund:innen, die nur ein- bis zweimal pro Monat ein stadtmobil-Fahrzeug benötigen.",
		baseCosts: { admissionFee: 60, monthly: { individual: 4 } },
		notes: [
			"Der Langstrecken-Tarif gilt nur für Fahrzeuge von stadtmobil carsharing AG, Stuttgart.",
		],
		rates: {
			S: { time: shortyTime(2.9, 1), kilometers: flatKilometers(0.37) },
			A: {
				time: durationTieredTime(0.5, 2.1, 27, 145),
				kilometers: kilometerTiers(0.32, 0.28, 0.28),
			},
			B: {
				time: durationTieredTime(0.5, 2.9, 31, 160),
				kilometers: kilometerTiers(0.37, 0.31, 0.26),
			},
			C: {
				time: durationTieredTime(0.5, 3.5, 38, 180),
				kilometers: kilometerTiers(0.41, 0.33, 0.27),
			},
			D: {
				time: durationTieredTime(1.5, 3.9, 40, 215),
				kilometers: kilometerTiers(0.44, 0.35, 0.35),
			},
			F: {
				time: durationTieredTime(2.5, 4.9, 50, 265),
				kilometers: kilometerTiers(0.48, 0.37, 0.37),
			},
		},
	},
	{
		id: "easy",
		name: "Easy",
		description: "Ohne Monatsbeitrag; für wenige Nutzungen pro Jahr.",
		baseCosts: { admissionFee: 60, monthly: { individual: 0 } },
		notes: ["Ohne Monatsbeitrag; Aufnahmegebühr separat ausgewiesen."],
		rates: {
			S: { time: shortyTime(4, 1), kilometers: flatKilometers(0.55) },
			A: { time: flatHourlyTime(3, 40), kilometers: flatKilometers(0.5) },
			B: {
				time: flatHourlyTime(4, 50),
				kilometers: flatKilometers(0.55),
			},
			C: { time: flatHourlyTime(5, 60), kilometers: flatKilometers(0.6) },
			D: {
				time: flatHourlyTime(6, 75),
				kilometers: flatKilometers(0.65),
			},
			F: { time: flatHourlyTime(7, 85), kilometers: flatKilometers(0.7) },
		},
	},
];

function durationTieredTime(
	initialHourly: number,
	followingHourly: number,
	daily: number,
	weekly: number,
) {
	return {
		hourly: [
			{ fromHour: 0, toHour: 7, rate: initialHourly, label: "0-7 Uhr" },
			{ fromHour: 7, rate: followingHourly, label: "7-24 Uhr" },
		],
		daily,
		weekly,
	};
}

function flatHourlyTime(hourly: number, daily: number) {
	return {
		hourly: [{ fromHour: 0, rate: hourly, label: "0-24 Uhr" }],
		daily,
	};
}

function shortyTime(hourly: number, bookingFee: number) {
	return {
		hourly: [{ fromHour: 0, rate: hourly, label: "pro Stunde" }],
		bookingFee,
	};
}

function shortyOnlyRates(
	time: ReturnType<typeof shortyTime>,
	kilometerRate: number,
) {
	return {
		S: { time, kilometers: flatKilometers(kilometerRate) },
		A: unavailableRates(),
		B: unavailableRates(),
		C: unavailableRates(),
		D: unavailableRates(),
		F: unavailableRates(),
	};
}

function unavailableRates() {
	return { time: { hourly: [] }, kilometers: [] };
}

function kilometerTiers(first: number, second: number, third: number) {
	return [
		{ fromKm: 0, upToKm: 100, rate: first, label: "bis 100 km" },
		{ fromKm: 100, upToKm: 700, rate: second, label: "ab 101. km" },
		{
			fromKm: 700,
			rate: third,
			label: "ab 701. km",
			requiresStuttgartVehicle: true,
		},
	];
}

function flatKilometers(rate: number) {
	return [{ fromKm: 0, rate, label: "pro km" }];
}
