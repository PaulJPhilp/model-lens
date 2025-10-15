import type { Metadata } from "next"
import { Geist_Mono, Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
	title: "ModelLens",
	description: "Explore and visualize LLM models",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className="">
			<body className={montserrat.className}>{children}</body>
		</html>
	)
}
