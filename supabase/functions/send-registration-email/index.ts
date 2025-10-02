import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegistrationEmailRequest {
  name: string;
  email: string;
  phone: string;
  program?: string;
  message?: string;
  type: "general" | "program";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, program, message, type }: RegistrationEmailRequest = await req.json();

    console.log("Processing registration email:", { name, email, phone, program, type });

    const emailContent = type === "program" 
      ? `
        <h2>Pendaftaran Program Baru</h2>
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>No. HP:</strong> ${phone}</p>
        <p><strong>Program:</strong> ${program}</p>
        ${message ? `<p><strong>Pesan:</strong> ${message}</p>` : ''}
      `
      : `
        <h2>Pendaftaran Umum Baru</h2>
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>No. HP:</strong> ${phone}</p>
        ${message ? `<p><strong>Pesan:</strong> ${message}</p>` : ''}
      `;

    const emailResponse = await resend.emails.send({
      from: "LPK Borneo <onboarding@resend.dev>",
      to: ["lpk.borneocg@gmail.com"],
      subject: type === "program" 
        ? `Pendaftaran Program: ${program}` 
        : "Pendaftaran Baru - LPK Borneo Citra Gemilang",
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-registration-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
