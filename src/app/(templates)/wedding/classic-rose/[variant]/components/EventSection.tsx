// src/components/templates/classic-rose/EventSection.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";

// --- SVG Icons ---
const TimeIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'>
		<circle cx='12' cy='12' r='10'></circle>
		<polyline points='12 6 12 12 16 14'></polyline>
	</svg>
);

const MapIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'>
		<path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'></path>
		<circle cx='12' cy='10' r='3'></circle>
	</svg>
);

// --- Helper Function ---
/**
 * Mengubah string tanggal dan waktu dari data menjadi objek Date.
 * Contoh input: "20 Desember 2025", "09:00 WIB - 10:00 WIB"
 */
const parseEventDateTime = (dateStr: string, timeStr: string): Date => {
	const monthMap: { [key: string]: number } = {
		Januari: 0,
		Februari: 1,
		Maret: 2,
		April: 3,
		Mei: 4,
		Juni: 5,
		Juli: 6,
		Agustus: 7,
		September: 8,
		Oktober: 9,
		November: 10,
		Desember: 11,
	};
	const [day, monthName, year] = dateStr.split(" ");
	const startTime = timeStr.split(" ")[0]; // Ambil waktu mulai, e.g., "09:00"
	const [hours, minutes] = startTime.split(":");

	return new Date(
		Number(year),
		monthMap[monthName],
		Number(day),
		Number(hours),
		Number(minutes)
	);
};

// --- Sub-Components ---
const CountdownTimer: React.FC<{ targetDate: Date }> = ({ targetDate }) => {
	const calculateTimeLeft = useCallback(() => {
		const difference = +targetDate - +new Date();
		let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

		if (difference > 0) {
			timeLeft = {
				days: Math.floor(difference / (1000 * 60 * 60 * 24)),
				hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
				minutes: Math.floor((difference / 1000 / 60) % 60),
				seconds: Math.floor((difference / 1000) % 60),
			};
		}
		return timeLeft;
	}, [targetDate]); // Tambahkan targetDate sebagai dependensi

	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

	useEffect(() => {
		const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
		return () => clearInterval(timer);
	}, [calculateTimeLeft]); // Gunakan calculateTimeLeft sebagai dependensi

	const timeUnits = [
		{ label: "Hari", value: timeLeft.days },
		{ label: "Jam", value: timeLeft.hours },
		{ label: "Menit", value: timeLeft.minutes },
		{ label: "Detik", value: timeLeft.seconds },
	];

	return (
		<div className='grid grid-cols-4 gap-2 sm:gap-3' style={{ color: 'var(--on-primary-color)' }}>
			{timeUnits.map((unit) => (
				<div
					key={unit.label}
					style={{ backgroundColor: "var(--color-primary)" }}
					className='rounded-lg p-2 flex flex-col items-center justify-center aspect-square'>
					<span className='text-2xl' style={{ fontFamily: "var(--font-body)" }}>
						{String(unit.value).padStart(2, "0")}
					</span>
					<span className='text-xs' style={{ fontFamily: "var(--font-body)" }}>
						{unit.label}
					</span>
				</div>
			))}
		</div>
	);
};

const EventCard: React.FC<{
	event: InvitationData["events"][0];
}> = ({ event }) => {
	const [day, month, year] = event.date.split(" ");
	// Setiap card sekarang membuat targetDate-nya sendiri
	const eventTargetDate = parseEventDateTime(event.date, event.time);

	return (
		<div className='classic-rose-surface classic-rose-event-card relative w-full p-6 text-center sm:p-9'>
			<span aria-hidden='true' className='classic-rose-event-corner classic-rose-event-corner--start' />
			<span aria-hidden='true' className='classic-rose-event-corner classic-rose-event-corner--end' />
			<div
				className='relative z-10 flex flex-col items-center gap-4'
				style={{ fontFamily: "var(--font-body)" }}>
				<h3 className='text-3xl' style={{ fontFamily: "var(--font-heading)" }}>{event.name}</h3>
				<span aria-hidden='true' className='classic-rose-event-rule' />
				<div className='flex items-center justify-center gap-4'>
					<p className='text-5xl font-bold sm:text-7xl'>{day}</p>
					<div className='text-left'>
						<p className='text-2xl'>{month}</p>
						<p className='text-2xl'>{year}</p>
					</div>
				</div>
				<div className='flex items-center gap-2 text-sm'>
					<TimeIcon className='w-4 h-4' />
					<p>{event.time}</p>
				</div>
				<div className='mt-2'>
					<p className='text-xl font-semibold'>{event.location}</p>
					<p className='text-xs max-w-xs mx-auto mt-1'>{event.address}</p>
				</div>
				<a
					href={event.mapLink}
					target='_blank'
					rel='noopener noreferrer'
					style={{ backgroundColor: "var(--color-primary)", color: "var(--on-primary-color)" }}
					className='mt-2 inline-flex min-h-11 items-center gap-2 text-sm px-6 py-2 rounded-lg hover:opacity-90 transition-opacity'>
					<MapIcon className='w-4 h-4' />
					Lokasi Acara
				</a>
				<div className='w-full max-w-xs mt-2'>
					<CountdownTimer targetDate={eventTargetDate} />
				</div>
			</div>
		</div>
	);
};

// --- Main Component ---
interface EventSectionProps {
	events: InvitationData["events"];
	theme: ThemeConfig;
}

const EventSection: React.FC<EventSectionProps> = ({ events }) => {
	return (
		<section className='relative'>
			<div className='relative z-20 container mx-auto px-4 sm:px-8 max-w-5xl flex flex-col items-center gap-10 pt-16 pb-20 md:pt-20 md:pb-28'>
				<motion.div
					className='text-center'
					initial={{ opacity: 0, y: -50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}>
					<h2
						className='text-3xl'
						style={{
							fontFamily: "var(--font-heading)",
							color: "var(--color-primary)",
						}}>
						Rangkaian Acara
					</h2>
					<span aria-hidden='true' className='classic-rose-event-rule mx-auto mt-4 block' />
				</motion.div>

				<div className='grid w-full gap-6 md:grid-cols-2'>
				{events.map((event, index) => (
					<motion.div
						key={index}
						className='w-full'
						initial={{ opacity: 0, y: 50 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: index * 0.2 }}>
						<EventCard event={event} />
					</motion.div>
				))}
				</div>

			</div>
		</section>
	);
};

export default EventSection;
