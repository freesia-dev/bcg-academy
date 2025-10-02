import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const formSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().email("Email tidak valid").max(255),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").max(15),
  message: z.string().max(1000).optional(),
});

const Registration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-registration-email", {
        body: {
          ...values,
          type: "general",
        },
      });

      if (error) throw error;

      toast({
        title: "Pendaftaran Berhasil!",
        description: "Data pendaftaran Anda telah dikirim. Kami akan menghubungi Anda segera.",
      });

      form.reset();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Gagal Mengirim",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <Card className="shadow-xl border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Daftar Sekarang</CardTitle>
            <CardDescription className="text-base mt-2">
              Isi formulir di bawah ini untuk mendaftar di LPK Borneo Citra Gemilang
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap *</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama lengkap" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor HP/WhatsApp *</FormLabel>
                      <FormControl>
                        <Input placeholder="08xxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pesan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tuliskan pesan atau pertanyaan Anda"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Pendaftaran"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registration;
