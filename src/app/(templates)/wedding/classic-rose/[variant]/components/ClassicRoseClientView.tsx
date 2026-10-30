// src/app/(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView.tsx
"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { ClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";
import { withDefaultPreviewAssets } from "@/features/invitations/default-preview-assets";

import OpeningSection from "./OpeningSection";
import HeroSection from "./HeroSection";
import CoupleSection from "./CoupleSection";
import EventSection from "./EventSection";
import GallerySection from "./GallerySection";
import LoveStorySection from "./LoveStorySection"; // Impor komponen baru
import GiftSection from "./GiftSection";
import WishesSection from "./WishesSection";
import MusicPlayer from "./MusicPlayer";

function InvitationView({
	invitationSlug,
	themeConfig,
	data,
	isDraftPreview = false,
	hasMissingMedia = false,
	usesPublicSampleMedia = false,
}: {
	invitationSlug: string;
	themeConfig: ClassicRoseThemeConfig;
	data: InvitationData;
	isDraftPreview?: boolean;
	hasMissingMedia?: boolean;
	usesPublicSampleMedia?: boolean;
}) {
	const [isOpened, setIsOpened] = useState(false);
	const searchParams = useSearchParams();
	const guestName = searchParams.get("to");

	const handleOpenInvitation = () => {
		setIsOpened(true);
		window.scrollTo(0, 0);
	};

	const themeStyle = {
		"--color-primary": themeConfig.colors.primary,
		"--color-text": themeConfig.colors.text,
		"--font-heading": themeConfig.fonts.heading,
		"--font-body": themeConfig.fonts.body,
		"--font-script": themeConfig.fonts.script,
		"--background-tile": `url(${themeConfig.assets.background})`,
		"--canvas-color": themeConfig.colors.canvas,
		"--surface-color": themeConfig.colors.surface,
		"--surface-text-color": themeConfig.colors.surfaceText,
		"--on-primary-color": themeConfig.colors.onPrimary,
	} as React.CSSProperties;

	const sections = data.sections || {
		couple: true,
		events: true,
		gallery: true,
		loveStory: true,
		gifts: true,
		wishes: true,
	};

	return (
		<div style={themeStyle} className='classic-rose-background min-h-[100svh] font-[--font-body]'>
			{isDraftPreview && <div role='status' className='sticky top-0 z-50 bg-[#17243d] px-4 py-3 text-center text-sm font-bold text-white'>Pratinjau draf · Konfirmasi dan ucapan tidak dapat dikirim{hasMissingMedia ? " · Foto belum tersedia ditampilkan sebagai placeholder" : ""}{usesPublicSampleMedia ? " · Foto contoh mengikuti tampilan publik default-preview" : ""}</div>}
			<AnimatePresence>
				{!isOpened ? (
					<motion.div
						key='opening'
						exit={{ opacity: 0, y: -50 }}
						transition={{ duration: 0.5 }}>
						<OpeningSection
							coupleNames={`${data.couple.groom.name} & ${data.couple.bride.name}`}
							guestName={guestName}
							onOpen={handleOpenInvitation}
							theme={themeConfig}
							heroImage={data.couple.heroImage}
								isPreview={invitationSlug === "default-preview"}
						/>
					</motion.div>
				) : (
					<main className='seamless-background'>
						<motion.div
							key='content'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.8 }}>
							{data.musicUrl && (
								<MusicPlayer videoUrl={data.musicUrl} theme={themeConfig} />
							)}

							<HeroSection data={data.couple} theme={themeConfig} />

							{sections.couple && (
								<CoupleSection data={data.couple} theme={themeConfig} />
							)}

							{sections.events && (
								<EventSection events={data.events} theme={themeConfig} />
							)}

							{/* --- LOGIKA RENDERING DIPERBAIKI --- */}
							{/* Sekarang mereka dipanggil terpisah */}
							{sections.gallery && data.gallery && (
								<GallerySection gallery={data.gallery} theme={themeConfig} />
							)}

							{sections.loveStory && data.loveStory && (
								<LoveStorySection loveStory={data.loveStory} theme={themeConfig} />
							)}

							{sections.gifts && data.gifts && (
								<GiftSection gifts={data.gifts} theme={themeConfig} />
							)}

							{sections.wishes && !isDraftPreview && (
								<WishesSection invitationSlug={invitationSlug} theme={themeConfig} />
							)}
							{sections.wishes && isDraftPreview && <section className='mx-auto max-w-xl px-5 py-20 text-center'><h2 className='text-2xl'>Konfirmasi &amp; Ucapan</h2><p className='mt-4'>Formulir dinonaktifkan dalam pratinjau draf.</p></section>}
						</motion.div>
					</main>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function ClassicRoseClientView({
	invitationSlug,
	themeConfig,
	data,
	isDraftPreview = false,
}: {
	invitationSlug: string;
	themeConfig: ClassicRoseThemeConfig;
	data: InvitationData;
	isDraftPreview?: boolean;
}) {
	const previewPhoto = "/images/themes/preview-photo-placeholder.svg";
	const sampleRecord = invitationSlug === "default-preview";
	const hasMissingMedia = !sampleRecord && (!data.couple.heroImage || !data.couple.groom.photo || !data.couple.bride.photo);
	const displayData = isDraftPreview && !sampleRecord ? {
		...data,
		couple: {
			...data.couple,
			heroImage: data.couple.heroImage || previewPhoto,
			groom: { ...data.couple.groom, photo: data.couple.groom.photo || previewPhoto },
			bride: { ...data.couple.bride, photo: data.couple.bride.photo || previewPhoto },
		},
	} : withDefaultPreviewAssets(invitationSlug, data);
	return (
		<Suspense
			fallback={
				<div className='bg-white min-h-screen flex items-center justify-center'>
					Loading Guest...
				</div>
			}>
			<InvitationView
				invitationSlug={invitationSlug}
				themeConfig={themeConfig}
				data={displayData}
				isDraftPreview={isDraftPreview}
				hasMissingMedia={hasMissingMedia}
				usesPublicSampleMedia={isDraftPreview && sampleRecord}
			/>
		</Suspense>
	);
}
