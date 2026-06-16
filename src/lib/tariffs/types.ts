export type VehicleClass = "S" | "A" | "B" | "C" | "D" | "F";

export type TariffId = "shorty" | "classic" | "basic" | "easy";

export type UsageContext = "stuttgart" | "crossUse";

export type CustomerType = "individual" | "household";

export type TimePriceKind = "hourly" | "daily" | "weekly" | "combined";

export type ValidationSeverity = "error" | "warning" | "info";

export interface VehicleClassInfo {
	code: VehicleClass;
	label: string;
	description: string;
}

export interface BaseCosts {
	admissionFee: number;
	monthly: Partial<Record<CustomerType, number>>;
	notes?: string[];
}

export interface TieredKilometerRate {
	upToKm?: number;
	fromKm: number;
	rate: number;
	label: string;
	requiresStuttgartVehicle?: boolean;
}

export interface HourlyTimeRate {
	fromHour: number;
	toHour?: number;
	rate: number;
	label: string;
}

export interface TimeRates {
	hourly: HourlyTimeRate[];
	daily?: number;
	weekly?: number;
	bookingFee?: number;
}

export interface VehicleTariffRates {
	time: TimeRates;
	kilometers: TieredKilometerRate[];
}

export interface TariffDefinition {
	id: TariffId;
	name: string;
	description: string;
	baseCosts: BaseCosts;
	rates: Record<VehicleClass, VehicleTariffRates>;
	notes: string[];
	crossUseBillingTariffId?: TariffId;
}

export interface TripInput {
	vehicleClass: VehicleClass;
	start: Date;
	end: Date;
	distanceKm: number;
	usageContext: UsageContext;
	customerType: CustomerType;
}

export interface NormalizedTripInput extends TripInput {
	normalizedStart: Date;
	normalizedEnd: Date;
	durationHours: number;
}

export interface ValidationMessage {
	severity: ValidationSeverity;
	message: string;
}

export interface TimeSegment {
	label: string;
	hours: number;
	rate: number;
	cost: number;
}

export interface TimeCostBreakdown {
	selectedKind: TimePriceKind;
	segments: TimeSegment[];
	selectedLabel: string;
	candidateCosts: Array<{
		kind: TimePriceKind;
		label: string;
		cost: number;
	}>;
	total: number;
	bookingFee: number;
}

export interface KilometerCostBreakdown {
	segments: Array<{
		label: string;
		kilometers: number;
		rate: number;
		cost: number;
	}>;
	total: number;
}

export interface TariffCalculationResult {
	tariff: TariffDefinition;
	billedTariff: TariffDefinition;
	isCrossUseSubstitution: boolean;
	baseCostMonthly: number | null;
	timeCost: TimeCostBreakdown;
	kilometerCost: KilometerCostBreakdown;
	variableTotal: number;
	totalWithBaseCosts: number | null;
	rank: number;
	highlight: "best" | "second" | "none";
	notes: string[];
}

export interface CalculationResult {
	input: NormalizedTripInput;
	messages: ValidationMessage[];
	results: TariffCalculationResult[];
}
