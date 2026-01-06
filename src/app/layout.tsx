import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Clutch - 내전 팀 구성기",
		template: "%s - Clutch",
	},
	description: "리그 오브 레전드 내전을 위한 팀 구성 도구. 플레이어 성과 분석 및 밸런스 좋은 팀 자동 구성",
	keywords: ["롤", "리그 오브 레전드", "팀 구성", "내전", "게임 분석"],
	robots: {
		index: true,
		follow: true,
		nocache: false,
	},
	openGraph: {
		title: "Clutch - 내전 팀 구성기",
		description: "리그 오브 레전드 내전을 위한 팀 구성 도구",
		url: "https://clutch.bitworkspace.kr",
		type: "website",
		locale: "ko_KR",
	},
	alternates: {
		canonical: "https://clutch.bitworkspace.kr",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="google-site-verification" content="Kfe9KFkihJVcT4bVxBUvzdPOQClS9GIrKTybJsId4Iw" />
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<div className="min-h-screen bg-gray-100">
					<div className="max-w-6xl mx-auto px-4 py-8">
						{/* 헤더 (네비게이션 포함) */}
						<Header />

						{/* 콘텐츠 */}
						<div className="bg-white rounded-lg shadow p-8">
							{children}
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
