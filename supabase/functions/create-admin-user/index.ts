import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Function called");
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Creating Supabase admin client");
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking if admin user already exists");

    // First check if user already exists
    const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    if (fetchError) {
      throw fetchError;
    }
    
    const existingUser = existingUsers.users.find(u => u.email === 'atacadocanoa@gmail.com');
    
    if (existingUser) {
      console.log("User already exists, updating password and ensuring admin role");
      
      // Update password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: 'Admin@2025!' }
      );
      
      if (updateError) {
        console.error('Error updating password:', updateError);
      }

      // Ensure profile exists
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: existingUser.id,
          full_name: 'Administrador Atacado Canoa',
          email: 'atacadocanoa@gmail.com'
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
      }

      // Ensure admin role exists
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: existingUser.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('Error creating/updating admin role:', roleError);
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'Admin user already exists, password updated, admin role ensured',
          user: existingUser,
          email: 'atacadocanoa@gmail.com',
          password: 'Admin@2025!'
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    console.log("User doesn't exist, creating new admin user");

    // Create admin user with confirmed email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'atacadocanoa@gmail.com',
      password: 'Admin@2025!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrador Atacado Canoa'
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    console.log("User created successfully, adding admin role");

    // Create profile for the user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userData.user.id,
        full_name: 'Administrador Atacado Canoa',
        email: 'atacadocanoa@gmail.com'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userData.user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error adding admin role:', roleError);
    }

    console.log("Admin user created successfully");

    return new Response(
      JSON.stringify({ 
        message: 'Admin user created successfully',
        user: userData.user,
        email: 'atacadocanoa@gmail.com',
        password: 'Admin@2025!'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});