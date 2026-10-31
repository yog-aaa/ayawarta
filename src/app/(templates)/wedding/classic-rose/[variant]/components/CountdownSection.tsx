"use client";
import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface CountdownProps {
	targetDate: Date;
}

const CountdownSection: React.FC<CountdownProps> = ({ targetDate }) => {
	const reducedMotion = useReducedMotion();
	const calculateTimeLeft = () => {
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
	};

	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

	useEffect(() => {
		const timer = setTimeout(() => {
			setTimeLeft(calculateTimeLeft());
		}, 1000);
		return () => clearTimeout(timer);
	});

	const timeUnits = [
		{ label: "Hari", value: timeLeft.days },
		{ label: "Jam", value: timeLeft.hours },
		{ label: "Menit", value: timeLeft.minutes },
		{ label: "Detik", value: timeLeft.seconds },
	];

	return (
		<section className='bg-white'>
			<div className='container mx-auto px-8 text-center'>
				<div className='grid grid-cols-4 gap-4 max-w-lg mx-auto'>
					{timeUnits.map((unit, index) => (
						<motion.div
							key={unit.label}
							className='bg-rose-50 p-4 rounded-lg shadow-md'
							initial={reducedMotion ? false : { opacity: 0, y: 20 }}
							whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
							transition={reducedMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.1 }}
							viewport={{ once: true }}>
							{/* FIX: Mengganti `font-serif` menjadi `font-heading` (Playfair Display) untuk angka */}
							<p className='font-heading text-4xl text-[#5C4033]'>
								{String(unit.value).padStart(2, "0")}
							</p>
							{/* FIX: Mengganti `font-sans` menjadi `font-body-alt` (Manrope) untuk label */}
							<p className='font-body-alt text-xs text-gray-500 mt-1'>{unit.label}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};
export default CountdownSection;
