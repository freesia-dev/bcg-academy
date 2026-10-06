import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/** Bar bawah khusus HP: WhatsApp + tombol utama. Halaman bisa mengganti tombol utamanya. */
const MobileBar = ({ primary }: { primary?: ReactNode }) => {
  const { brand } = useSiteConfig();
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-3">
        <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-input text-primary" aria-label="Chat WhatsApp">
          <MessageCircle className="h-5 w-5" />
        </a>
        {primary ?? (
          <Link to="/kursus" className="flex h-12 flex-1 items-center justify-center rounded-lg bg-gold font-semibold text-primary shadow-glow">
            Lihat Program &amp; Daftar
          </Link>
        )}
      </div>
    </div>
  );
};

export default MobileBar;
