export interface ClassicRoseVariantConfig {
    assets: {
        background: string;
        flower: string;
        photoFrame: string;
        bismillah: string;
    };
    colors: {
        primary: string;
        text: string;
        canvas: string;
        surface: string;
        surfaceText: string;
        onPrimary: string;
    };
}

/**
 * Mendefinisikan struktur lengkap untuk konfigurasi tema Classic Rose.
 * Strukturnya disederhanakan karena semua aset sudah masuk variant.
 */
export interface ClassicRoseThemeConfig extends ClassicRoseVariantConfig {
    fonts: {
        heading: string;
        body: string;
        script: string;
    };
}

// Daftar varian warna yang valid dan palet warnanya
const validVariants = {
    red: { primary: '#630718', text: '#630718', canvas: '#f5ebec', surface: 'rgba(255,255,255,.91)', surfaceText: '#4e1620', onPrimary: '#ffffff' },
    green: { primary: '#4c6537', text: '#31452d', canvas: '#edf1e9', surface: 'rgba(255,255,255,.91)', surfaceText: '#31452d', onPrimary: '#ffffff' },
    blue: { primary: '#315b8b', text: '#28466a', canvas: '#edf2f7', surface: 'rgba(255,255,255,.91)', surfaceText: '#28466a', onPrimary: '#ffffff' },
    orange: { primary: '#9b4f23', text: '#713d27', canvas: '#f6ede5', surface: 'rgba(255,255,255,.91)', surfaceText: '#713d27', onPrimary: '#ffffff' },
    black: { primary: '#e4bd79', text: '#e9d5ad', canvas: '#202024', surface: 'rgba(27,27,30,.88)', surfaceText: '#f1e5cc', onPrimary: '#241b11' },
    white: { primary: '#8c6839', text: '#665039', canvas: '#f8f4ea', surface: 'rgba(255,255,255,.9)', surfaceText: '#665039', onPrimary: '#ffffff' },
};

/**
 * Fungsi untuk mendapatkan konfigurasi tema "Classic Rose" berdasarkan varian warna.
 * @param variant - Nama varian warna (e.g., 'red', 'green', 'blue').
 * @returns Object konfigurasi tema yang lengkap.
 */
export function getClassicRoseThemeConfig(variant: string): ClassicRoseThemeConfig {
    const variantKey = Object.keys(validVariants).includes(variant) ? variant : 'red';
    const colors = validVariants[variantKey as keyof typeof validVariants];

    // Konfigurasi spesifik untuk setiap varian
    const variantConfig: ClassicRoseVariantConfig = {
        assets: {
            background: `/images/themes/classic-rose/${variantKey}/texture.webp`,
            flower: `/images/themes/classic-rose/${variantKey}/bunga.webp`,
            photoFrame: `/images/themes/classic-rose/${variantKey}/border-foto.webp`,
            bismillah: `/images/themes/classic-rose/${variantKey}/bismillah.webp`,
        },
        colors: colors,
    };

    // Menggabungkan konfigurasi varian dengan font
    return {
        ...variantConfig,
        fonts: {
            heading: 'var(--font-playfair)',
            body: 'var(--font-alice)',
            script: 'var(--font-alex-brush)',
        },
    };
}
