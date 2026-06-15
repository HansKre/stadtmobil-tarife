import { addHours } from "./dates";
import type { TripInput } from "./types";

export interface ExampleScenario {
	id: string;
	name: string;
	description: string;
	getInput: (baseStart: Date) => TripInput;
}

export const EXAMPLE_SCENARIOS: ExampleScenario[] = [
	{
		id: "short-trip",
		name: "Kurzstrecke",
		description: "2 Stunden, 18 km, Klasse A",
		getInput: (baseStart) => ({
			vehicleClass: "A",
			start: baseStart,
			end: addHours(baseStart, 2),
			distanceKm: 18,
			usageContext: "stuttgart",
			customerType: "individual",
			costDisplayMode: "variableOnly",
		}),
	},
	{
		id: "day-trip",
		name: "Tagesausflug",
		description: "10 Stunden, 180 km, Klasse B",
		getInput: (baseStart) => ({
			vehicleClass: "B",
			start: baseStart,
			end: addHours(baseStart, 10),
			distanceKm: 180,
			usageContext: "stuttgart",
			customerType: "individual",
			costDisplayMode: "variableOnly",
		}),
	},
	{
		id: "weekend",
		name: "Wochenendfahrt",
		description: "56 Stunden, 420 km, Klasse C",
		getInput: (baseStart) => ({
			vehicleClass: "C",
			start: baseStart,
			end: addHours(baseStart, 56),
			distanceKm: 420,
			usageContext: "stuttgart",
			customerType: "household",
			costDisplayMode: "withBaseCosts",
		}),
	},
	{
		id: "van",
		name: "Transporterfahrt",
		description: "5 Stunden, 70 km, Klasse F",
		getInput: (baseStart) => ({
			vehicleClass: "F",
			start: baseStart,
			end: addHours(baseStart, 5),
			distanceKm: 70,
			usageContext: "stuttgart",
			customerType: "individual",
			costDisplayMode: "variableOnly",
		}),
	},
];
