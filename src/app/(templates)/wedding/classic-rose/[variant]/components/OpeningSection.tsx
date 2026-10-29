// src/components/templates/classic-rose/OpeningSection.tsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import { classicRoseCloudinaryLoader, isClassicRoseCloudinaryAsset } from "@/lib/theme-config/cloudinary-theme-loader";

const MailOpenIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
		className={className}>
		<path d='M19.25 7.33323V16.4999C19.25 16.743 19.1534 16.9762 18.9815 17.1481C18.8096 17.32 18.5764 17.4166 18.3333 17.4166H3.66667C3.42355 17.4166 3.19039 17.32 3.01849 17.1481C2.84658 16.9762 2.75 16.743 2.75 16.4999V7.33323M19.25 7.33323L14.6667 11.9166M19.25 7.33323L11.9561 2.87548C11.6682 2.69954 11.3374 2.60645 11 2.60645C10.6626 2.60645 10.3318 2.69954 10.0439 2.87548L2.75 7.33323M2.75 7.33323L7.33333 11.9166M3.66667 16.4999L8.6295 11.5371C8.97324 11.1932 9.43948 11 9.92567 10.9999H12.0743C12.5605 11 13.0268 11.1932 13.3705 11.5371L18.3333 16.4999' />
	</svg>
);

interface OpeningProps {
	coupleNames: string;
	guestName?: string | null;
	onOpen: () => void;
	theme: ThemeConfig;
	heroImage: string;
	isPreview?: boolean;
}

const OpeningSection: React.FC<OpeningProps> = ({
	coupleNames,
	guestName,
	onOpen,
	theme,
	heroImage,
	isPreview = false,
}) => {
	return (
		<div
			className='relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden font-[--font-body]'
			style={{ color: "var(--color-text)" }}>
			<motion.div
				className='relative z-10 flex flex-col items-center text-center px-5 py-12 w-full max-w-md md:max-w-xl'
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1, delay: 0.5 }}>
				{isPreview && (
					<p className='mb-5 rounded-full border border-current/40 px-4 py-1 text-xs tracking-widest'>
						PRATINJAU · FOTO ILUSTRASI
					</p>
				)}
				<p className='text-[25px] md:text-[32px]'>We Are Getting Married</p>
				<div className='relative my-4 aspect-square w-[min(72vw,290px)] md:w-[min(42vw,420px)]'>
					<Image
						src={theme.assets.photoFrame}
						loader={classicRoseCloudinaryLoader}
						alt=''
						fill
						sizes='(max-width: 767px) 72vw, 420px'
						priority
						className='object-contain z-10'
					/>
					<div className='absolute inset-0 p-[14.8%]'>
						<div className='relative w-full h-full rounded-full overflow-hidden'>
							<Image
								src={heroImage}
								loader={isClassicRoseCloudinaryAsset(heroImage) ? classicRoseCloudinaryLoader : undefined}
								alt={`Foto ${coupleNames}`}
								fill
								sizes='(max-width: 767px) 52vw, 300px'
							priority
							quality={78}
								className='object-cover'
							/>
						</div>
					</div>
				</div>
				<h1
					className='max-w-full text-[clamp(2rem,8vw,3rem)] leading-tight text-balance'
					style={{
						fontFamily: "var(--font-script)",
						color: "var(--color-primary)",
					}}>
					{coupleNames}
				</h1>
				{guestName && (
					<div className='mt-8'>
						<p className='text-sm md:text-base'>Kepada Yth. Bapak/Ibu/Saudara/i</p>
						<p className='text-lg md:text-xl mt-1 font-semibold'>{guestName}</p>
					</div>
				)}
				<p className='text-xs md:text-base max-w-[324px] md:max-w-[440px] mt-4 leading-snug md:leading-normal'>
					Dengan penuh rasa syukur, kami mengundang Anda untuk menjadi bagian dari
					momen berharga kami.
				</p>
				<button
					onClick={onOpen}
				className='classic-rose-primary-action mt-8 rounded-md flex min-h-12 items-center justify-center gap-2 px-8 py-3 md:px-12 md:py-4 hover:opacity-90 transition-opacity shadow-lg'
					aria-label='Buka undangan'
					data-invitation-open='true'>
					<MailOpenIcon className='w-4 h-4 md:w-6 md:h-6' />
					<span className='font-semibold text-sm md:text-xl'>Buka Undangan</span>
				</button>
			</motion.div>
		</div>
	);
};

export default OpeningSection;
