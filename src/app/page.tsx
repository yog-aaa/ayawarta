import Header from "./components/landing/Header";
import HomeSection from "./components/landing/HomeSection";
import FeatureSection from "./components/landing/FeatureSection";
import PricingSection from "./components/landing/PricingSection";
import ThemeSection from "./components/landing/ThemeSection";
import TestimonialSection from "./components/landing/TestimonialSection";
import Footer from "./components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Loncat ke konten utama
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <HomeSection />
        <FeatureSection />
        <PricingSection />
        <ThemeSection />
        <TestimonialSection />
      </main>
      <Footer />
    </>
  );
}
