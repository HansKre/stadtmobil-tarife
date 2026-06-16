import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "stadtmobil Tarifrechner" },
			{
				name: "description",
				content:
					"Vergleicht die Nutzungskosten der stadtmobil Stuttgart Privatkundentarife Classic, Basic und Easy.",
			},
		],
		links: [
			{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
			{ rel: "alternate icon", href: "/favicon.ico" },
			{ rel: "apple-touch-icon", href: "/logo192.png" },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "stylesheet", href: appCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="de">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
