const HALF_HOUR_MS = 30 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function roundUpToHalfHour(date: Date) {
	return new Date(Math.ceil(date.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
}

export function addHours(date: Date, hours: number) {
	return new Date(date.getTime() + hours * HOUR_MS);
}

export function durationHours(start: Date, end: Date) {
	return (end.getTime() - start.getTime()) / HOUR_MS;
}

export function toDateInputValue(date: Date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

export function toTimeInputValue(date: Date) {
	return [
		String(date.getHours()).padStart(2, "0"),
		String(date.getMinutes()).padStart(2, "0"),
	].join(":");
}

export function combineDateAndTime(dateValue: string, timeValue: string) {
	const [year = "0", month = "1", day = "1"] = dateValue.split("-");
	const [hours = "0", minutes = "0"] = timeValue.split(":");
	return new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hours),
		Number(minutes),
	);
}

export function formatWeekday(date: Date) {
	return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
}

export function formatDateTime(date: Date) {
	return new Intl.DateTimeFormat("de-DE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function formatHours(hours: number) {
	return `${hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`;
}
