import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketplacePreview } from "@/components/MarketplacePreview";
import { CTAFooter } from "@/components/CTAFooter";

const Index = () => {
  return (
    <main className="relative bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <MarketplacePreview />
      <CTAFooter />
    </main>
  );
};

export default Index;
