import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const CtaBand = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.cta;
  return (
    <section id="cta" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-navy-mesh px-6 py-12 md:px-14 md:py-16 text-center text-primary-foreground">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance">{c.title}</h2>
            <p className="mt-4 text-base md:text-lg text-primary-foreground/75">{c.subtitle}</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" variant="gold"><Link to="/kursus">{c.primaryCta}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-white/30 hover:bg-white/10 hover:text-white hover:border-white/50">
                <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{c.secondaryCta}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBand;
