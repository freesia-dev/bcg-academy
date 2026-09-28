import { Card, CardContent } from "@/components/ui/card";
import euisPhoto from "@/assets/team/euis-paramitha.jpg";
import harisPhoto from "@/assets/team/haris-fadilah.jpg";
import yogaPhoto from "@/assets/team/yoga-satrya.jpg";

const team = [
  {
    photo: euisPhoto,
    name: "Euis Paramitha H., S.Pd",
    role: "Direktur / Instruktur",
    bio: "Memimpin LPK Borneo Citra Gemilang dengan visi membangun lembaga pelatihan yang berkualitas dan relevan dengan kebutuhan industri. Juga berperan sebagai instruktur yang membekali peserta dengan keterampilan administrasi modern, manajemen dokumen, serta aplikasi perkantoran.",
  },
  {
    photo: harisPhoto,
    name: "Haris Fadilah, S.M",
    role: "Instruktur Digital Marketing & Desain Grafis",
    bio: "Instruktur berpengalaman di bidang desain kreatif yang aktif dalam berbagai proyek digital dan branding. Membimbing peserta untuk menguasai software desain modern, memahami prinsip visual, serta menghasilkan karya yang profesional dan relevan dengan kebutuhan industri kreatif maupun dunia usaha.",
  },
  {
    photo: yogaPhoto,
    name: "Yoga Satrya Bagus, SH., A.Md.T",
    role: "Instruktur Operator Komputer",
    bio: "Berpengalaman di bidang teknologi informasi, membimbing peserta dalam menguasai keterampilan komputer, pengolahan data, serta aplikasi perkantoran untuk mendukung kebutuhan kerja secara praktis dan efektif.",
  },
];

const Team = () => (
  <section id="team" className="py-20 bg-secondary/30">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl font-bold text-primary mb-4">
          Instruktur <span className="text-gradient">Kami</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Setiap program pelatihan di BCG Academy dipandu instruktur profesional bersertifikasi
          dan berpengalaman, membimbing peserta siap menghadapi dunia kerja maupun wirausaha.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {team.map((member) => (
          <Card
            key={member.name}
            className="text-center hover:shadow-strong transition-all duration-300 hover:-translate-y-2 border-0 bg-card/80 backdrop-blur-sm"
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-gold/20">
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{member.name}</h3>
                <p className="text-sm font-medium text-gold">{member.role}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default Team;
