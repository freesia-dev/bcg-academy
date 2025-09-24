import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Award, Building } from "lucide-react";

const Gallery = () => {
  const [activeTab, setActiveTab] = useState("all");

  const galleryItems = [
    {
      id: 1,
      title: "Kelas Administrasi Perkantoran",
      category: "training",
      type: "image",
      description: "Suasana pembelajaran di kelas administrasi perkantoran dengan fasilitas modern"
    },
    {
      id: 2,
      title: "Pelatihan Barista Professional",
      category: "training",
      type: "image",
      description: "Peserta sedang mempraktikkan teknik latte art dalam program barista"
    },
    {
      id: 3,
      title: "Workshop Desain Grafis",
      category: "training",
      type: "image",
      description: "Workshop intensif desain grafis menggunakan software Adobe Creative Suite"
    },
    {
      id: 4,
      title: "Wisuda Angkatan 45",
      category: "graduation",
      type: "image",
      description: "Momen kebahagiaan wisuda angkatan 45 LPK Borneo Citra Gemilang"
    },
    {
      id: 5,
      title: "Testimoni Alumni",
      category: "testimonial",
      type: "video",
      description: "Cerita sukses alumni yang telah berkarir di berbagai perusahaan"
    },
    {
      id: 6,
      title: "Fasilitas Laboratorium",
      category: "facility",
      type: "image",
      description: "Laboratorium komputer dengan perangkat terbaru untuk mendukung pembelajaran"
    },
    {
      id: 7,
      title: "Kerjasama Industri",
      category: "partnership",
      type: "image",
      description: "Penandatanganan MoU dengan perusahaan mitra untuk program magang"
    },
    {
      id: 8,
      title: "Digital Marketing Bootcamp",
      category: "training",
      type: "image",
      description: "Intensive bootcamp digital marketing dengan praktik langsung"
    }
  ];

  const tabs = [
    { id: "all", label: "Semua", icon: null },
    { id: "training", label: "Pelatihan", icon: Users },
    { id: "graduation", label: "Wisuda", icon: Award },
    { id: "facility", label: "Fasilitas", icon: Building },
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
                {/* Placeholder for actual images */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
                  <div className="text-center space-y-2">
                    {item.type === "video" ? (
                      <div className="w-16 h-16 bg-accent-red/20 rounded-full flex items-center justify-center mx-auto">
                        <Play className="text-accent-red" size={24} />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto">
                        <Building className="text-gold" size={24} />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground px-2">
                      {item.title}
                    </p>
                  </div>
                </div>
                
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

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="corporate" size="lg">
            Lihat Lebih Banyak
          </Button>
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-gold mb-2">500+</div>
            <div className="text-sm text-muted-foreground">Foto Kegiatan</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-corporate-blue mb-2">50+</div>
            <div className="text-sm text-muted-foreground">Video Pembelajaran</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-accent-red mb-2">25+</div>
            <div className="text-sm text-muted-foreground">Testimoni Alumni</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gold mb-2">100+</div>
            <div className="text-sm text-muted-foreground">Momen Wisuda</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;