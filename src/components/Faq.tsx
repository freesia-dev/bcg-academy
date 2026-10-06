import { MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/SectionHeader";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Faq = () => {
  const { brand, sections } = useSiteConfig();
  const c = sections.faq;
  if (!c.items.length) return null;
  return (
    <section id="faq" className="py-20 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionHeader align="left" eyebrow={c.eyebrow} title={c.title} highlight={c.titleHighlight} subtitle={c.subtitle} className="mb-6" />
            <Button asChild variant="outline"><a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Tanya via WhatsApp</a></Button>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5">
            {c.items.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`} className={i === c.items.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-left text-base font-semibold text-primary hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default Faq;
