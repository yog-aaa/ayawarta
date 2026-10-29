// src/components/templates/classic-rose/HeroSection.tsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";

interface HeroProps {
	data: InvitationData["couple"];
	theme: ThemeConfig;
}

const HeroSection: React.FC<HeroProps> = ({ data, theme }) => {
	return (
		<section className='relative min-h-[100svh] flex flex-col items-center justify-center px-5 py-20'>
			<div className='relative z-10 w-full max-w-2xl text-center'>
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 1, ease: "easeOut" }}>
					<p
						className='font-[--font-body] text-sm tracking-widest mb-5'
						style={{ color: "var(--color-text)" }}>
						Undangan Pernikahan
					</p>
					<div className='relative mx-auto mb-7 aspect-square w-[min(70vw,280px)] sm:w-80'>
						<Image
							src={theme.assets.photoFrame}
							alt=''
							fill
							sizes='(max-width: 639px) 70vw, 320px'
							className='z-10 object-contain'
						/>
						<div className='absolute inset-[14%] rounded-full overflow-hidden'>
							<Image
								src={data.heroImage}
								alt={`${data.groom.name} & ${data.bride.name}`}
								fill
								sizes='(max-width: 639px) 51vw, 230px'
								quality={78}
								className='object-cover'
							/>
						</div>
					</div>
					<h1
						className='text-[clamp(2.25rem,9vw,4rem)] leading-tight text-balance'
						style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
						<span className='block'>{data.groom.name}</span>
						<span className='block'>&amp; {data.bride.name}</span>
					</h1>
				</motion.div>
			</div>
		</section>
	);
};

export default HeroSection;
