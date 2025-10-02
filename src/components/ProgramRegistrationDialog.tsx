import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().email("Email tidak valid").max(255),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").max(15),
  message: z.string().max(1000).optional(),
});

interface ProgramRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programTitle: string;
}

const ProgramRegistrationDialog = ({ open, onOpenChange, programTitle }: ProgramRegistrationDialogProps) => {
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
          program: programTitle,
          type: "program",
        },
      });

      if (error) throw error;

      toast({
        title: "Pendaftaran Berhasil!",
        description: "Data pendaftaran Anda telah dikirim. Kami akan menghubungi Anda segera.",
      });

      form.reset();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Daftar Program: {programTitle}</DialogTitle>
          <DialogDescription>
            Isi formulir di bawah ini untuk mendaftar program pelatihan
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  );
};

export default ProgramRegistrationDialog;
