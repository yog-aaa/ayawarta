// src/components/templates/classic-rose/CoupleSection.tsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";

// --- SVG Icons ---
const InstagramIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='currentColor'
		xmlns='http://www.w3.org/2000/svg'>
		<path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.441c-3.117 0-3.486.01-4.713.066-2.827.128-4.247 1.549-4.385 4.385-.057 1.228-.066 1.597-.066 4.713s.01 3.486.066 4.713c.138 2.836 1.558 4.257 4.385 4.385 1.228.057 1.597.066 4.713.066s3.486-.01 4.713-.066c2.827-.128 4.247-1.549 4.385-4.385.057-1.228.066-1.597.066-4.713s-.01-3.486-.066-4.713c-.138-2.836-1.558-4.257-4.385-4.385C15.486 3.613 15.117 3.604 12 3.604zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm0 1.441a2.31 2.31 0 110 4.62 2.31 2.31 0 010-4.62zM16.802 6.116a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z' />
	</svg>
);

const WeddingRingsIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.5'
		xmlns='http://www.w3.org/2000/svg'>
		<path
			d='M10.125 21.125a7.5 7.5 0 100-15 7.5 7.5 0 000 15z'
			strokeLinecap='round'
			strokeLinejoin='round'></path>
		<path
			d='M13.875 18.125a7.5 7.5 0 100-15 7.5 7.5 0 000 15z'
			strokeLinecap='round'
			strokeLinejoin='round'></path>
	</svg>
);

interface ProfileCardProps {
	person: InvitationData["couple"]["groom"];
	align: "left" | "right";
	theme: ThemeConfig;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ person, align, theme }) => {
	const isGroom = align === "left";
	const photoOrder = isGroom ? "" : "sm:order-2";
	const textOrder = isGroom ? "" : "sm:order-1";
	const itemAlign = isGroom ? "sm:items-end" : "sm:items-start";
	const textAlign = isGroom ? "sm:text-right" : "sm:text-left";

	return (
		<motion.div
			className='flex w-full flex-col items-center gap-4 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6'
			initial={{ opacity: 0, x: isGroom ? -50 : 50 }}
			whileInView={{ opacity: 1, x: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.8 }}>
			<div className={`relative aspect-square w-40 shrink-0 sm:w-44 ${photoOrder}`}>
				<Image
					src={theme.assets.photoFrame}
					alt=''
					fill
					sizes='(max-width: 639px) 160px, 176px'
					className='z-10 object-contain'
				/>
				<div className='absolute inset-0 p-[20px]'>
					<div className='relative w-full h-full rounded-full overflow-hidden'>
						<Image
							src={person.photo}
							alt={person.name}
							fill
							sizes='(max-width: 639px) 120px, 136px'
							quality={75}
							className='object-cover'
						/>
					</div>
				</div>
			</div>
			<div className={`flex min-w-0 flex-col items-center text-center ${itemAlign} ${textAlign} ${textOrder}`}>
				<h3
					className='max-w-full text-[clamp(1.75rem,6vw,2.25rem)] leading-tight break-words'
					style={{
						fontFamily: "var(--font-script)",
						color: "var(--color-primary)",
					}}>
					{person.name}
				</h3>
				<p
					className='font-[--font-body] text-sm mt-2 max-w-[260px]'
					style={{ color: "var(--color-text)" }}>
					{person.parents}
				</p>
				<a
					href={`https://instagram.com/${person.instagram}`}
					target='_blank'
					rel='noopener noreferrer'
					className='classic-rose-primary-action mt-3 inline-flex min-h-11 items-center gap-2 text-xs px-3 py-2 rounded-md hover:opacity-90 transition-opacity'>
					<InstagramIcon className='w-3.5 h-3.5' />
					<span>@{person.instagram}</span>
				</a>
			</div>
		</motion.div>
	);
};

interface CoupleSectionProps {
	data: InvitationData["couple"];
	theme: ThemeConfig;
}

const CoupleSection: React.FC<CoupleSectionProps> = ({ data, theme }) => {
	return (
		<section className='relative'>
			<div
				className='relative z-20 container mx-auto px-4 sm:px-8 max-w-2xl flex flex-col items-center gap-8 text-center pt-20 pb-16 md:pt-28 md:pb-20'
				style={{ color: "var(--color-text)" }}>
				<motion.div
					className='relative w-[300px] h-[70px]'
					initial={{ opacity: 0, y: -50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}>
					<div
						role='img'
						aria-label='Bismillah'
						className='h-full w-full bg-[var(--color-primary)]'
						style={{
							maskImage: `url(${theme.assets.bismillah})`,
							WebkitMaskImage: `url(${theme.assets.bismillah})`,
							maskSize: 'contain',
							WebkitMaskSize: 'contain',
							maskRepeat: 'no-repeat',
							WebkitMaskRepeat: 'no-repeat',
							maskPosition: 'center',
							WebkitMaskPosition: 'center',
						}}
					/>
				</motion.div>
				<motion.p
					className='font-[--font-body] text-sm max-w-md'
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}>
					Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang
					Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:
				</motion.p>
				<div className='w-full flex flex-col items-center gap-8 mt-4'>
					<ProfileCard person={data.groom} align='left' theme={theme} />
					<WeddingRingsIcon
						className='w-10 h-10 text-[var(--color-primary)]'
					/>
					<ProfileCard person={data.bride} align='right' theme={theme} />
				</div>
				<motion.div
					className='classic-rose-surface mt-12 max-w-md rounded-2xl p-6'
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}>
					<p dir='rtl' className='font-[--font-body] text-base leading-relaxed'>
						وَمِنْ اٰيٰتِهٖٓ اَنْ خَلَقَ لَكُمْ مِّنْ اَنْفُسِكُمْ اَزْوَاجًا
						لِّتَسْكُنُوْٓا اِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَّوَدَّةً وَّرَحْمَةًۗ
						اِنَّ فِيْ ذٰلِكَ لَاٰيٰتٍ لِّقَوْمٍ يَّتَفَكَّرُوْنَ
					</p>
					<p className='font-[--font-body] text-xs mt-4'>
						&quot;Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan
						pasangan-pasangan untukmu dari (jenis) dirimu sendiri agar kamu cenderung
						dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih
						dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat
						tanda-tanda (kebesaran Allah) bagi kaum yang berpikir.&quot;
					</p>
					<p className='font-[--font-body] text-sm font-semibold mt-4'>
						- Ar Rum ayat 21 -
					</p>
				</motion.div>
			</div>
		</section>
	);
};

export default CoupleSection;
