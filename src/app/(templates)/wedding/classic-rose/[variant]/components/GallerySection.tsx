// src/components/templates/classic-rose/GallerySection.tsx
"use client";
import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import CornerFlower from "./CornerFlower";
import type { InvitationData } from "@/features/invitations/types";

const PlayIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='currentColor'
		xmlns='http://www.w3.org/2000/svg'>
		<path d='M8 5v14l11-7z' />
	</svg>
);

const TitleDivider: React.FC<{ src: string }> = ({ src }) => (
	<div className='relative w-20 h-4'>
		<Image src={src} alt='Divider' fill className='object-contain' />
	</div>
);

// Props sekarang hanya butuh 'gallery'
interface GallerySectionProps {
	gallery: NonNullable<InvitationData["gallery"]>;
	theme: ThemeConfig;
}

const GallerySection: React.FC<GallerySectionProps> = ({ gallery, theme }) => {
	const [playVideo, setPlayVideo] = useState(false);

	const getEmbedUrl = (url: string) => {
		const videoId = url.split("v=")[1]?.split("&")[0];
		return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : "";
	};

	const isVideoValid = gallery.videoUrl && getEmbedUrl(gallery.videoUrl) !== "";

	return (
		<section className='relative'>
			<CornerFlower flowerSrc={theme.assets.flower} position='top-right' />
			<CornerFlower flowerSrc={theme.assets.flower} position='bottom-left' />
			<div
				className='relative z-20 container mx-auto px-4 sm:px-8 max-w-md flex flex-col items-center gap-10 py-20 md:py-32'
				style={{ color: "var(--color-text)" }}>
				<motion.div
					className='w-full p-4 text-center bg-white/90 backdrop-blur-sm rounded-2xl'
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}>
					<div className='flex items-center justify-center gap-4'>
						<TitleDivider src={theme.assets.divider} />
						<h2 className='text-xl' style={{ fontFamily: "var(--font-body)" }}>
							Momen Indah Kami
						</h2>
						<div className='transform -scale-x-100'>
							<TitleDivider src={theme.assets.divider} />
						</div>
					</div>
					<p className='text-base mt-2' style={{ fontFamily: "var(--font-body)" }}>
						The Memorable Wedding Gallery
					</p>
					<div className='grid grid-cols-3 grid-rows-4 gap-2 mt-6 h-[500px]'>
						<div className='col-span-3 row-span-2 relative rounded-lg overflow-hidden group bg-black'>
							{isVideoValid && !playVideo ? (
								<>
									<Image
										src={gallery.images[0]}
										alt='Video Thumbnail'
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-300'
									/>
									<div
										className='absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer'
										onClick={() => setPlayVideo(true)}>
										<PlayIcon className='w-16 h-16 text-white/80 drop-shadow-lg' />
									</div>
								</>
							) : isVideoValid && playVideo ? (
								<iframe
									src={getEmbedUrl(gallery.videoUrl!)}
									title='YouTube video player'
									frameBorder='0'
									allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
									allowFullScreen
									className='w-full h-full'></iframe>
							) : (
								<Image
									src={gallery.images[0]}
									alt='Gallery Image'
									fill
									className='object-cover'
								/>
							)}
						</div>
						{gallery.images.slice(1, 6).map((imgSrc, index) => (
							<div
								key={index}
								className={`relative rounded-lg overflow-hidden ${
									index === 1 ? "col-span-2" : "col-span-1"
								}`}>
								<Image
									src={imgSrc}
									alt={`Gallery ${index + 2}`}
									fill
									className='object-cover'
								/>
							</div>
						))}
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default GallerySection;
