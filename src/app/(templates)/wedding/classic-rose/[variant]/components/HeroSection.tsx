// src/components/templates/classic-rose/HeroSection.tsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import CornerFlower from "./CornerFlower";
import type { InvitationData } from "@/features/invitations/types";

interface HeroProps {
	data: InvitationData["couple"];
	theme: ThemeConfig;
}

const HeroSection: React.FC<HeroProps> = ({ data, theme }) => {
	return (
		<section className='relative min-h-screen flex flex-col items-center justify-center'>
			<CornerFlower flowerSrc={theme.assets.flower} position='top-left' />
			<CornerFlower flowerSrc={theme.assets.flower} position='bottom-right' />
			<div className='relative z-20 p-8 text-center'>
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 1, ease: "easeOut" }}>
					<p
						className='font-[--font-body] text-sm tracking-widest mb-4'
						style={{ color: "var(--color-text)" }}>
						Undangan Pernikahan
					</p>
					<div className='relative w-64 h-64 mx-auto mb-6'>
						<Image
							src={theme.assets.photoFrame}
							alt='Frame'
							fill
							sizes='256px'
							priority
							className='z-10 object-contain'
						/>
						<div className='absolute inset-[35px] rounded-full overflow-hidden'>
							<Image
								src={data.heroImage}
								alt={`${data.groom.name} & ${data.bride.name}`}
								fill
								sizes='186px'
								priority
								className='object-cover'
							/>
						</div>
					</div>
					<h1
						className='text-5xl'
						style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
						{data.groom.name}
					</h1>
					<h1
						className='text-5xl'
						style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
						& {data.bride.name}
					</h1>
				</motion.div>
			</div>
		</section>
	);
};

export default HeroSection;
