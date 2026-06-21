import { createFileRoute } from "@tanstack/react-router";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { calculateTariffs } from "#/lib/tariffs/calculator";
import { TARIFF_SOURCE, VEHICLE_CLASSES } from "#/lib/tariffs/data";
import {
	addHours,
	combineDateAndTime,
	durationHours,
	formatDateTime,
	formatHours,
	toDateInputValue,
	toTimeInputValue,
} from "#/lib/tariffs/dates";
import { EXAMPLE_SCENARIOS } from "#/lib/tariffs/examples";
import type {
	CustomerType,
	TripInput,
	UsageContext,
	VehicleClass,
} from "#/lib/tariffs/types";

export const Route = createFileRoute("/")({ component: Home });

const currency = new Intl.NumberFormat("de-DE", {
	style: "currency",
	currency: "EUR",
});

const usageContextOptions: Array<{ value: UsageContext; label: string }> = [
	{
		value: "stuttgart",
		label: "Fahrzeug der stadtmobil carsharing AG, Stuttgart",
	},
	{ value: "crossUse", label: "Quernutzungspool" },
];

const customerTypeOptions: Array<{ value: CustomerType; label: string }> = [
	{ value: "individual", label: "Einzelperson" },
	{ value: "household", label: "Haushalt" },
];

const TRIP_INPUT_STORAGE_KEY = "stadtmobil-tarife:trip-input:v1";

type StoredTripInput = Partial<{
	vehicleClass: VehicleClass;
	start: string;
	end: string;
	distanceKm: number;
	usageContext: UsageContext;
	customerType: CustomerType;
}>;

function createInitialInput(): TripInput {
	const now = new Date();
	const start = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
		9,
		0,
	);
	return {
		vehicleClass: "A",
		start,
		end: addHours(start, 3),
		distanceKm: 40,
		usageContext: "stuttgart",
		customerType: "individual",
	};
}

function createStoredInput(input: TripInput): StoredTripInput {
	return {
		vehicleClass: input.vehicleClass,
		start: input.start.toISOString(),
		end: input.end.toISOString(),
		distanceKm: input.distanceKm,
		usageContext: input.usageContext,
		customerType: input.customerType,
	};
}

function createInputFromSessionStorage(): TripInput {
	const initialInput = createInitialInput();

	if (typeof window === "undefined") {
		return initialInput;
	}

	const storedValue = window.sessionStorage.getItem(TRIP_INPUT_STORAGE_KEY);
	if (!storedValue) {
		return initialInput;
	}

	return mergeStoredInput(initialInput, storedValue);
}

function mergeStoredInput(
	initialInput: TripInput,
	storedValue: string,
): TripInput {
	const parsed = parseStoredInput(storedValue);
	if (!isRecord(parsed)) {
		return initialInput;
	}

	return {
		vehicleClass: isVehicleClass(parsed.vehicleClass)
			? parsed.vehicleClass
			: initialInput.vehicleClass,
		start: parseStoredDate(parsed.start) ?? initialInput.start,
		end: parseStoredDate(parsed.end) ?? initialInput.end,
		distanceKm: isValidDistance(parsed.distanceKm)
			? parsed.distanceKm
			: initialInput.distanceKm,
		usageContext: isOptionValue(parsed.usageContext, usageContextOptions)
			? parsed.usageContext
			: initialInput.usageContext,
		customerType: isOptionValue(parsed.customerType, customerTypeOptions)
			? parsed.customerType
			: initialInput.customerType,
	};
}

function parseStoredInput(storedValue: string): unknown {
	try {
		return JSON.parse(storedValue);
	} catch (error) {
		console.warn("Gespeicherte Eingaben konnten nicht gelesen werden.", error);
		return null;
	}
}

function parseStoredDate(value: unknown) {
	if (typeof value !== "string") {
		return null;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVehicleClass(value: unknown): value is VehicleClass {
	return VEHICLE_CLASSES.some((vehicleClass) => vehicleClass.code === value);
}

function isOptionValue<TValue extends string>(
	value: unknown,
	options: Array<{ value: TValue }>,
): value is TValue {
	return options.some((option) => option.value === value);
}

function isValidDistance(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function Home() {
	const [input, setInput] = useState<TripInput>(() =>
		createInputFromSessionStorage(),
	);
	const [selectedExampleId, setSelectedExampleId] = useState<
		string | undefined
	>();
	const calculation = useMemo(() => calculateTariffs(input), [input]);
	const currentDuration = Math.max(0, durationHours(input.start, input.end));
	const shortyMessage = calculation.messages.find(
		(m) => m.message === "Maximale Nutzungsdauer 24 Stunden.",
	);

	useEffect(() => {
		window.sessionStorage.setItem(
			TRIP_INPUT_STORAGE_KEY,
			JSON.stringify(createStoredInput(input)),
		);
	}, [input]);

	function updateDateTime(
		field: "start" | "end",
		dateValue: string,
		timeValue: string,
	) {
		setInput((current) => ({
			...current,
			[field]: combineDateAndTime(dateValue, timeValue),
		}));
	}

	function loadExample(id: string) {
		const scenario = EXAMPLE_SCENARIOS.find((candidate) => candidate.id === id);
		if (!scenario) {
			return;
		}
		setSelectedExampleId(id);
		setInput(scenario.getInput(input.start));
	}

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="stadtmobil-topline" />
			<header className="stadtmobil-hero">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
					<div className="flex items-start justify-between gap-4">
						<div className="stadtmobil-logo-mark">tarifrechner</div>
						<a
							className="stadtmobil-hero-link hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-sm no-underline transition-colors hover:bg-[#f76700] sm:inline-flex"
							href={TARIFF_SOURCE.url}
						>
							zu stadtmobil
							<ExternalLinkIcon className="size-4" aria-hidden="true" />
						</a>
					</div>
					<div className="max-w-4xl pt-4">
						<p className="island-kicker">Privatkunden · Classic, Basic, Easy</p>
						<h1 className="display-title mt-3 text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
							Tarifrechner für stadtmobil Carsharing
						</h1>
						<p className="mt-4 max-w-3xl text-[#4c4843] text-lg leading-7">
							Vergleicht die Nutzungskosten für alle Privatkundentarife
							gleichzeitig.
						</p>
						<p className="mt-3 max-w-3xl text-[#656568] text-sm">
							Tarifdaten:{" "}
							<a className="underline" href={TARIFF_SOURCE.url}>
								{TARIFF_SOURCE.label}
							</a>
							, gültig seit {TARIFF_SOURCE.validSince}. Grundkosten werden
							separat angezeigt und nicht anteilig auf Fahrtkosten umgelegt.
						</p>
					</div>
				</div>
			</header>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<section className="grid min-w-0 gap-6 min-[1270px]:grid-cols-[minmax(0,420px)_1fr]">
					<Card asChild className="section-card min-w-0 gap-0 py-0">
						<form onSubmit={(event) => event.preventDefault()}>
							<CardHeader className="border-b px-5 pt-5 pb-4">
								<CardTitle className="font-condensed text-2xl font-medium">
									Fahrt eingeben
								</CardTitle>
								<CardDescription>
									Buchungszeiten werden bei Bedarf automatisch auf die nächste
									halbe Stunde aufgerundet.
								</CardDescription>
							</CardHeader>

							<CardContent className="mt-5 grid min-w-0 gap-4 px-5 pb-5">
								<div className="flex flex-col gap-1.5 min-w-0">
									<Label htmlFor="vehicle-class">Fahrzeugtarifklasse</Label>
									<Select
										value={input.vehicleClass}
										onValueChange={(value) =>
											setInput((current) => ({
												...current,
												vehicleClass: value as VehicleClass,
											}))
										}
									>
										<SelectTrigger id="vehicle-class">
											<SelectValue placeholder="Fahrzeugtarifklasse wählen" />
										</SelectTrigger>
										<SelectContent>
											{VEHICLE_CLASSES.map((vehicleClass) => (
												<SelectItem
													key={vehicleClass.code}
													value={vehicleClass.code}
												>
													{vehicleClass.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{shortyMessage && (
									<Alert
										className={
											shortyMessage.severity === "error"
												? "border-red-200 bg-red-50 text-red-800"
												: "border-amber-200 bg-amber-50 text-amber-900"
										}
										variant={
											shortyMessage.severity === "error"
												? "destructive"
												: "default"
										}
									>
										<AlertDescription>{shortyMessage.message}</AlertDescription>
									</Alert>
								)}

								<div className="field-group grid min-w-0 gap-3 rounded-lg border p-3">
									<p className="font-medium text-sm">Buchungsbeginn</p>
									<div className="grid grid-cols-2 smallscreen-portrait:grid-cols-1 gap-3">
										<div className="flex flex-col gap-1.5 min-w-0">
											<Label htmlFor="start-date">Datum</Label>
											<Input
												className="picker-input"
												id="start-date"
												type="date"
												value={toDateInputValue(input.start)}
												onChange={(event) =>
													updateDateTime(
														"start",
														event.target.value,
														toTimeInputValue(input.start),
													)
												}
											/>
										</div>
										<div className="flex flex-col gap-1.5 min-w-0">
											<Label htmlFor="start-time">Uhrzeit</Label>
											<Input
												className="picker-input"
												id="start-time"
												type="time"
												step="1800"
												value={toTimeInputValue(input.start)}
												onChange={(event) =>
													updateDateTime(
														"start",
														toDateInputValue(input.start),
														event.target.value,
													)
												}
											/>
										</div>
									</div>
								</div>

								<div className="field-group grid min-w-0 gap-3 rounded-lg border p-3">
									<p className="font-medium text-sm">Buchungsende</p>
									<div className="grid grid-cols-2 smallscreen-portrait:grid-cols-1 gap-3">
										<div className="flex flex-col gap-1.5 min-w-0">
											<Label htmlFor="end-date">Datum</Label>
											<Input
												className="picker-input"
												id="end-date"
												type="date"
												value={toDateInputValue(input.end)}
												onChange={(event) =>
													updateDateTime(
														"end",
														event.target.value,
														toTimeInputValue(input.end),
													)
												}
											/>
										</div>
										<div className="flex flex-col gap-1.5 min-w-0">
											<Label htmlFor="end-time">Uhrzeit</Label>
											<Input
												className="picker-input"
												id="end-time"
												type="time"
												step="1800"
												value={toTimeInputValue(input.end)}
												onChange={(event) =>
													updateDateTime(
														"end",
														toDateInputValue(input.end),
														event.target.value,
													)
												}
											/>
										</div>
									</div>
								</div>

								<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
									<p>
										<span className="text-muted-foreground">
											Dauer in Stunden:
										</span>{" "}
										<span className="font-medium">
											{formatHours(currentDuration)}
										</span>
									</p>
									<p>
										<span className="text-muted-foreground">
											Dauer in Tagen:
										</span>{" "}
										<span className="font-medium">
											{Number.isFinite(currentDuration)
												? (currentDuration / 24).toLocaleString("de-DE", {
														maximumFractionDigits: 2,
													})
												: "0"}
										</span>
									</p>
								</div>

								<div className="flex flex-col gap-1.5 min-w-0">
									<Label htmlFor="distance-km">Entfernung in km</Label>
									<Input
										id="distance-km"
										min="0"
										step="1"
										type="number"
										value={input.distanceKm}
										onChange={(event) =>
											setInput((current) => ({
												...current,
												distanceKm: event.target.valueAsNumber,
											}))
										}
									/>
								</div>

								<FormSelect
									id="usage-context"
									label="Nutzungskontext"
									options={usageContextOptions}
									value={input.usageContext}
									onValueChange={(value) =>
										setInput((current) => ({
											...current,
											usageContext: value as UsageContext,
										}))
									}
								/>
								<FormSelect
									id="customer-type"
									label="Kundentyp für Monatsbeitrag"
									options={customerTypeOptions}
									value={input.customerType}
									onValueChange={(value) =>
										setInput((current) => ({
											...current,
											customerType: value as CustomerType,
										}))
									}
								/>

								<div className="flex flex-col gap-1.5 min-w-0">
									<Label htmlFor="example-scenario">Beispiel laden</Label>
									<Select value={selectedExampleId} onValueChange={loadExample}>
										<SelectTrigger id="example-scenario">
											<SelectValue placeholder="Typisches Szenario wählen" />
										</SelectTrigger>
										<SelectContent>
											{EXAMPLE_SCENARIOS.map((scenario) => (
												<SelectItem key={scenario.id} value={scenario.id}>
													{scenario.name} · {scenario.description}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</form>
					</Card>

					<section className="grid gap-4">
						<Card className="section-card">
							<CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
								<div>
									<CardTitle className="font-condensed text-2xl font-medium">
										Tarifvergleich
									</CardTitle>
									<CardDescription>
										Sortiert nach Gesamtkosten der Fahrt aufsteigend.
									</CardDescription>
								</div>
								<p className="max-w-md text-muted-foreground text-sm sm:text-right">
									Berechnet: {formatDateTime(calculation.input.normalizedStart)}{" "}
									bis {formatDateTime(calculation.input.normalizedEnd)} ·{" "}
									{formatHours(calculation.input.durationHours)}
								</p>
							</CardHeader>

							<CardContent>
								<div className="grid gap-2">
									{calculation.messages
										.filter(
											(message) =>
												message.message !==
												"Maximale Nutzungsdauer 24 Stunden.",
										)
										.map((message) => (
											<Alert
												className={
													message.severity === "error"
														? "border-red-200 bg-red-50 text-red-800"
														: message.severity === "warning"
															? "border-amber-200 bg-amber-50 text-amber-900"
															: "border-blue-200 bg-blue-50 text-blue-900"
												}
												key={message.message}
												variant={
													message.severity === "error"
														? "destructive"
														: "default"
												}
											>
												<AlertDescription>{message.message}</AlertDescription>
											</Alert>
										))}
								</div>

								{calculation.results.length > 0 && (
									<Results results={calculation.results} />
								)}
							</CardContent>
						</Card>
					</section>
				</section>
			</div>
		</main>
	);
}

function FormSelect<TValue extends string>({
	id,
	label,
	options,
	value,
	onValueChange,
}: {
	id: string;
	label: string;
	options: Array<{ value: TValue; label: string }>;
	value: TValue;
	onValueChange: (value: TValue) => void;
}) {
	return (
		<div className="grid gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Select
				value={value}
				onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
			>
				<SelectTrigger
					className="[&_[data-slot=select-value]]:truncate"
					id={id}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function Results({
	results,
}: {
	results: ReturnType<typeof calculateTariffs>["results"];
}) {
	return (
		<div className="mt-5">
			<div className="hidden table:block">
				<Table className="[&_td:first-child]:pl-3 [&_th:first-child]:pl-3">
					<TableHeader>
						<TableRow>
							<TableHead>Tarif</TableHead>
							<TableHead>Monatsbeitrag</TableHead>
							<TableHead>Zeitkosten</TableHead>
							<TableHead>Kilometerkosten</TableHead>
							<TableHead>Gesamtkosten Fahrt</TableHead>
							<TableHead>Hinweise</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{results.map((result) => (
							<ResultRow key={result.tariff.id} result={result} />
						))}
					</TableBody>
				</Table>
			</div>
			<div className="grid gap-3 table:hidden">
				{results.map((result) => (
					<ResultCard key={result.tariff.id} result={result} />
				))}
			</div>
			<div className="mt-5 grid gap-3">
				{results.map((result) => (
					<TariffDetails key={result.tariff.id} result={result} />
				))}
			</div>
		</div>
	);
}

function ResultRow({
	result,
}: {
	result: ReturnType<typeof calculateTariffs>["results"][number];
}) {
	return (
		<TableRow
			className={
				result.highlight === "best"
					? "bg-[#ffe4d2] hover:bg-[#ffe4d2]"
					: undefined
			}
		>
			<TableCell className="align-top">
				<TariffName result={result} />
			</TableCell>
			<TableCell className="align-top">
				{formatOptionalMoney(result.baseCostMonthly)}
			</TableCell>
			<TableCell className="align-top">
				{currency.format(result.timeCost.total + result.timeCost.bookingFee)}
			</TableCell>
			<TableCell className="align-top">
				{currency.format(result.kilometerCost.total)}
			</TableCell>
			<TableCell className="align-top font-semibold">
				{currency.format(result.variableTotal)}
			</TableCell>
			<TableCell className="align-top text-muted-foreground whitespace-normal">
				{result.notes[0]}
			</TableCell>
		</TableRow>
	);
}

function ResultCard({
	result,
}: {
	result: ReturnType<typeof calculateTariffs>["results"][number];
}) {
	return (
		<Card
			className={
				result.highlight === "best"
					? "border-[#ff8a36] bg-[#ffe4d2] py-4"
					: "py-4"
			}
		>
			<CardContent className="px-4">
				<TariffName result={result} />
				<dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
					<div>
						<dt className="text-muted-foreground">Zeit</dt>
						<dd>
							{currency.format(
								result.timeCost.total + result.timeCost.bookingFee,
							)}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Kilometer</dt>
						<dd>{currency.format(result.kilometerCost.total)}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Monat</dt>
						<dd>{formatOptionalMoney(result.baseCostMonthly)}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Fahrt</dt>
						<dd className="font-semibold">
							{currency.format(result.variableTotal)}
						</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}

function TariffName({
	result,
}: {
	result: ReturnType<typeof calculateTariffs>["results"][number];
}) {
	return (
		<div>
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-semibold">{result.tariff.name}</span>
				{result.highlight === "best" && (
					<Badge className="border-transparent bg-[#ff8a36] text-white hover:bg-[#ff8a36]">
						günstigster Tarif
					</Badge>
				)}
			</div>
			{result.isCrossUseSubstitution && (
				<p className="mt-1 text-[#9b4100] text-xs">
					berechnet mit {result.billedTariff.name}-Fahrtkosten
				</p>
			)}
		</div>
	);
}

function TariffDetails({
	result,
}: {
	result: ReturnType<typeof calculateTariffs>["results"][number];
}) {
	return (
		<Collapsible asChild>
			<Card className="section-card gap-0 py-0 shadow-none">
				<CollapsibleTrigger asChild>
					<Button
						className="h-auto cursor-pointer justify-between rounded-lg px-4 py-4 font-semibold hover:bg-[#ffe4d2] hover:text-[#9b4100]"
						variant="ghost"
					>
						Berechnungsdetails {result.tariff.name}
						<ChevronDownIcon className="size-4" />
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="px-4 pb-4">
						<div className="grid gap-4 text-sm lg:grid-cols-2">
							<section>
								<h3 className="font-medium">Zeitkosten</h3>
								{result.timeCost.selectedKind === "hourly" ? (
									<ul className="mt-2 grid gap-1 text-[#4c4843]">
										{result.timeCost.segments.map((segment) => (
											<li key={segment.label}>
												{segment.label}: {formatHours(segment.hours)} ×{" "}
												{currency.format(segment.rate)} ={" "}
												{currency.format(segment.cost)}
											</li>
										))}
									</ul>
								) : (
									<p className="mt-2 text-[#4c4843]">
										{result.timeCost.selectedLabel}:{" "}
										{currency.format(result.timeCost.total)}
									</p>
								)}
								<p className="mt-2 font-medium">
									Angesetzt:{" "}
									{currency.format(
										result.timeCost.total + result.timeCost.bookingFee,
									)}
								</p>
								{result.timeCost.bookingFee > 0 && (
									<p className="mt-1 text-muted-foreground text-xs">
										Buchungsgebühr:{" "}
										{currency.format(result.timeCost.bookingFee)}
									</p>
								)}
								<ul className="mt-2 grid gap-1 text-muted-foreground text-xs">
									{result.timeCost.candidateCosts.map((candidate) => (
										<li key={`${candidate.kind}-${candidate.label}`}>
											{candidate.label}: {currency.format(candidate.cost)}
										</li>
									))}
								</ul>
							</section>
							<section>
								<h3 className="font-medium">Kilometerkosten</h3>
								<ul className="mt-2 grid gap-1 text-[#4c4843]">
									{result.kilometerCost.segments.length > 0 ? (
										result.kilometerCost.segments.map((segment) => (
											<li key={segment.label}>
												{segment.label}:{" "}
												{segment.kilometers.toLocaleString("de-DE")} km ×{" "}
												{currency.format(segment.rate)} ={" "}
												{currency.format(segment.cost)}
											</li>
										))
									) : (
										<li>0 km = {currency.format(0)}</li>
									)}
								</ul>
								<p className="mt-2 font-medium">
									Summe Kilometer: {currency.format(result.kilometerCost.total)}
								</p>
							</section>
						</div>
						<ul className="mt-4 grid gap-1 text-muted-foreground text-xs">
							{result.notes.map((note) => (
								<li key={note}>• {note}</li>
							))}
						</ul>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

function formatOptionalMoney(value: number | null) {
	return value === null ? "—" : currency.format(value);
}
