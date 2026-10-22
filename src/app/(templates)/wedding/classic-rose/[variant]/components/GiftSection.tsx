// src/components/templates/classic-rose/GiftSection.tsx
"use client";
import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import CornerFlower from "./CornerFlower";
import type { InvitationData } from "@/features/invitations/types";

const CopyIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'>
		<rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
		<path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
	</svg>
);

const TitleDivider: React.FC<{ src: string }> = ({ src }) => (
	<div className='relative w-20 h-4'>
		<Image src={src} alt='Divider' fill className='object-contain' />
	</div>
);

interface GiftSectionProps {
	gifts?: InvitationData["gifts"]; // made optional
	theme: ThemeConfig;
}

const GiftSection: React.FC<GiftSectionProps> = ({ gifts, theme }) => {
	const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
	const giftList = gifts ?? []; // safe fallback

	const handleCopy = (accountNumber: string) => {
		// Trik untuk menyalin teks ke clipboard
		const textArea = document.createElement("textarea");
		textArea.value = accountNumber;
		document.body.appendChild(textArea);
		textArea.select();
		try {
			document.execCommand("copy");
			setCopiedAccount(accountNumber);
			setTimeout(() => setCopiedAccount(null), 2000); // Reset setelah 2 detik
		} catch (err) {
			console.error("Gagal menyalin nomor rekening", err);
		}
		document.body.removeChild(textArea);
	};

	return (
		<section className='relative'>
			<CornerFlower flowerSrc={theme.assets.flower} position='top-left' />
			<CornerFlower flowerSrc={theme.assets.flower} position='bottom-right' />
			<div
				className='relative z-20 container mx-auto px-4 sm:px-8 max-w-md flex flex-col items-center gap-8 text-center py-20 md:py-32'
				style={{ color: "var(--color-text)" }}>
				<motion.div
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}>
					<div className='flex items-center justify-center gap-4'>
						<TitleDivider src={theme.assets.divider} />
						<h2 className='text-xl' style={{ fontFamily: "var(--font-body)" }}>
							Kirim Hadiah
						</h2>
						<div className='transform -scale-x-100'>
							<TitleDivider src={theme.assets.divider} />
						</div>
					</div>
					<p className='text-sm mt-4 max-w-xs mx-auto'>
						Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika
						memberi adalah ungkapan tanda kasih, Anda dapat memberi kado secara
						digital.
					</p>
				</motion.div>

				<div className='w-full space-y-4'>
					{giftList.map((gift, index) => (
						<motion.div
							key={index}
							className='bg-white/90 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center'
							initial={{ opacity: 0, y: 50 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}>
							<div className='relative h-8 w-24 mb-2'>
								<Image
									src={gift.logo}
									alt={`${gift.platform} logo`}
									fill
									className='object-contain'
								/>
							</div>
							<p
								className='font-semibold text-lg'
								style={{ fontFamily: "var(--font-heading)" }}>
								{gift.accountNumber}
							</p>
							<p className='text-sm'>a/n {gift.accountHolder}</p>
							<button
								onClick={() => handleCopy(gift.accountNumber)}
								style={{ backgroundColor: "var(--color-primary)" }}
								className='mt-3 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300'>
								<CopyIcon className='w-3 h-3' />
								<span>
									{copiedAccount === gift.accountNumber ? "Tersalin!" : "Salin Nomor"}
								</span>
							</button>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};

export default GiftSection;
