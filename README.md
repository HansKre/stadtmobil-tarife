# stadtmobil Tarifrechner

React-SPA zur Berechnung und zum tabellarischen Vergleich der Nutzungskosten für stadtmobil Stuttgart Privatkundentarife.

## Funktionen

- Berechnet Classic, Basic und Easy gleichzeitig.
- Markiert günstigsten und zweitgünstigsten Tarif.
- Vergleicht Zeitkosten, Kilometerkosten, variable Gesamtkosten und separat ausgewiesene Monatsgrundkosten.
- Unterstützt die Fahrzeugtarifklassen A, B, C, D und F laut „Unsere Fahrzeugklassen“.
- Rundet nicht-halbstündige Buchungszeiten automatisch auf die nächste halbe Stunde auf.
- Zeigt transparente Detailaufschlüsselungen für Nutzungsdauer-Staffeln, 24h-/Wochentarif-Kandidaten und Kilometerstaffeln.
- Läuft ohne Backend-Abhängigkeit mit lokal versionierten Tarifdaten.

## Tarifdaten

Die Tarifdaten sind in `src/lib/tariffs/data.ts` gepflegt. Quelle ist die offizielle stadtmobil-Stuttgart-Privatkundenseite:

https://stuttgart.stadtmobil.de/privatkunden/preise-tarife/

Verwendeter Stand laut Seite: gültig seit 18.05.2026.

Hinweise:

- Business ist nicht enthalten, weil die App auf Privatkundentarife fokussiert ist.
- Grundkosten werden separat angezeigt und nicht anteilig auf Fahrtkosten umgelegt.
- Bei Quernutzung werden Classic-Fahrtkosten gemäß Hinweis mit Basic-Fahrtkosten berechnet.

## Entwicklung

```bash
pnpm install
pnpm dev
```

## Qualitätssicherung

```bash
pnpm check
pnpm test
pnpm build
```

## Tech-Stack

- React
- TypeScript
- TanStack Router / TanStack Start ohne Serverdaten
- Tailwind CSS
- Vitest
- Biome
