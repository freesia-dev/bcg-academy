import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Award, Building } from "lucide-react";

// Gallery Images
import administrasiClass from "@/assets/gallery/administrasi-class.jpg";
import baristaTraining from "@/assets/gallery/barista-training.jpg";
import designWorkshop from "@/assets/gallery/design-workshop.jpg";
import bridalMakeupTraining from "@/assets/gallery/bridal-makeup-training.jpg";
import certificateHandover from "@/assets/gallery/certificate-handover.jpg";
import partnershipSigning from "@/assets/gallery/partnership-signing.jpg";
import digitalMarketingBootcamp from "@/assets/gallery/digital-marketing-bootcamp.jpg";
import alumniTestimonial from "@/assets/gallery/alumni-testimonial.jpg";

const Gallery = () => {
  const [activeTab, setActiveTab] = useState("all");

  const galleryItems = [
    {
      id: 1,
      title: "Kelas Administrasi Perkantoran",
      category: "training",
      type: "image",
      image: administrasiClass,
      description: "Suasana pembelajaran di kelas administrasi perkantoran dengan fasilitas modern"
    },
    {
      id: 2,
      title: "Pelatihan Barista Professional",
      category: "training",
      type: "image",
      image: baristaTraining,
      description: "Peserta sedang mempraktikkan teknik latte art dalam program barista"
    },
    {
      id: 3,
      title: "Workshop Desain Grafis",
      category: "training",
      type: "image",
      image: designWorkshop,
      description: "Workshop intensif desain grafis menggunakan software Adobe Creative Suite"
    },
    {
      id: 4,
      title: "Pelatihan Rias Pengantin",
      category: "training",
      type: "image",
      image: bridalMakeupTraining,
      description: "Praktik langsung teknik rias pengantin dengan instruktur berpengalaman"
    },
    {
      id: 5,
      title: "Testimoni Alumni",
      category: "testimonial",
      type: "video",
      image: alumniTestimonial,
      description: "Cerita sukses alumni yang telah berkarir di berbagai perusahaan"
    },
    {
      id: 6,
      title: "Penyerahan Sertifikat BNSP",
      category: "graduation",
      type: "image",
      image: certificateHandover,
      description: "Penyerahan sertifikat kompetensi BNSP kepada peserta yang telah lulus pelatihan"
    },
    {
      id: 7,
      title: "Kerjasama Industri",
      category: "partnership",
      type: "image",
      image: partnershipSigning,
      description: "Penandatanganan MoU dengan perusahaan mitra untuk program magang"
    },
    {
      id: 8,
      title: "Digital Marketing Bootcamp",
      category: "training",
      type: "image",
      image: digitalMarketingBootcamp,
      description: "Intensive bootcamp digital marketing dengan praktik langsung"
    }
  ];

  const tabs = [
    { id: "all", label: "Semua", icon: null },
    { id: "training", label: "Pelatihan", icon: Users },
    { id: "graduation", label: "Sertifikasi", icon: Award },
    { id: "partnership", label: "Kerjasama", icon: Building },
    { id: "testimonial", label: "Testimoni", icon: Play }
  ];

  const filteredItems = activeTab === "all" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeTab);

  return (
    <section id="gallery" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Galeri <span className="text-gradient">Kegiatan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Lihat berbagai kegiatan pembelajaran, wisuda, dan pencapaian LPK Borneo Citra Gemilang. 
            Saksikan langsung suasana belajar yang kondusif dan fasilitas berkualitas.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "gold" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="transition-all duration-300"
            >
              {tab.icon && <tab.icon size={16} className="mr-2" />}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden hover:shadow-strong transition-all duration-300 hover:-translate-y-2 cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-gold/10 to-corporate-blue/10 relative overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-accent-red/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Play className="text-white ml-1" size={24} />
                    </div>
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all duration-300"></div>
                
                {/* Category Badge */}
                <Badge 
                  className="absolute top-3 left-3 bg-background/80 text-primary border-0"
                  variant="secondary"
                >
                  {item.type === "video" ? "Video" : "Foto"}
                </Badge>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-primary group-hover:text-gold transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Gallery;