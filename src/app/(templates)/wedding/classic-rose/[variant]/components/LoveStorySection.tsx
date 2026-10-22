// src/app/(templates)/wedding/classic-rose/[variant]/components/LoveStorySection.tsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";

const TitleDivider: React.FC<{ src: string }> = ({ src }) => (
	<div className='relative w-20 h-4'>
		<Image src={src} alt='Divider' fill className='object-contain' />
	</div>
);

// Props sekarang hanya butuh 'loveStory'
interface LoveStorySectionProps {
	loveStory: NonNullable<InvitationData["loveStory"]>;
	theme: ThemeConfig;
}

const LoveStorySection: React.FC<LoveStorySectionProps> = ({
	loveStory,
	theme,
}) => {
	return (
		<section className='relative pb-20 md:pb-32'>
			<div
				className='relative z-20 container mx-auto px-4 sm:px-8 max-w-md flex flex-col items-center'
				style={{ color: "var(--color-text)" }}>
				<motion.div
					className='w-full p-6 text-center bg-white/90 backdrop-blur-sm rounded-2xl'
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}>
					<div className='flex items-center justify-center gap-4'>
						<TitleDivider src={theme.assets.divider} />
						<h2 className='text-xl' style={{ fontFamily: "var(--font-body)" }}>
							Kisah Kami
						</h2>
						<div className='transform -scale-x-100'>
							<TitleDivider src={theme.assets.divider} />
						</div>
					</div>
					<div className='mt-6 space-y-6'>
						{loveStory.map((story) => (
							<div key={story.title}>
								<h3
									className='text-lg font-semibold'
									style={{ fontFamily: "var(--font-heading)" }}>
									{story.title}
								</h3>
								<p
									className='text-sm text-justify mt-2'
									style={{ fontFamily: "var(--font-body)" }}>
									{story.content}
								</p>
							</div>
						))}
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default LoveStorySection;
