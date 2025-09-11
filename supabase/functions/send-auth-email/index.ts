import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      token, 
      token_hash, 
      redirect_to, 
      email_action_type,
      site_url 
    }: AuthEmailRequest = await req.json();

    console.log("Sending auth email to:", email);
    console.log("Email action type:", email_action_type);

    let subject = "";
    let htmlContent = "";

    if (email_action_type === "signup") {
      subject = "Confirme seu email - Atacado Canoa";
      const confirmUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Atacado Canoa</h1>
          </div>
          
          <h2 style="color: #333; text-align: center;">Confirme seu email</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Olá! Bem-vindo ao Atacado Canoa. Para ativar sua conta, clique no botão abaixo:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Confirmar Email
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Ou copie e cole este link no seu navegador:
          </p>
          <p style="color: #2563eb; word-break: break-all; font-size: 14px;">
            ${confirmUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Se você não se cadastrou no Atacado Canoa, pode ignorar este email.
          </p>
        </div>
      `;
    } else if (email_action_type === "recovery") {
      subject = "Recuperar senha - Atacado Canoa";
      const resetUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Atacado Canoa</h1>
          </div>
          
          <h2 style="color: #333; text-align: center;">Recuperar senha</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Você solicitou a recuperação de senha. Clique no botão abaixo para redefinir sua senha:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Ou copie e cole este link no seu navegador:
          </p>
          <p style="color: #dc2626; word-break: break-all; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Se você não solicitou a recuperação de senha, pode ignorar este email.
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Atacado Canoa <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending auth email:", error);
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