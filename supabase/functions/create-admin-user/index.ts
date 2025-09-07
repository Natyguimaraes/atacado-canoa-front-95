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

    // First try to get the user by email using a different approach
    let existingUser = null;
    
    try {
      const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
      if (!fetchError && existingUsers) {
        existingUser = existingUsers.users.find(u => u.email === 'atacadocanoa@gmail.com');
        console.log("Found existing users:", existingUsers.users.length);
        console.log("Target user found:", !!existingUser);
      }
    } catch (e) {
      console.log("Error fetching users:", e);
    }

    // Try to create the user first, and handle the error if it exists
    try {
      console.log("Attempting to create new admin user");
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: 'atacadocanoa@gmail.com',
        password: 'Admin@2025!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrador Atacado Canoa'
        }
      });

      if (userError) {
        throw userError;
      }

      console.log("User created successfully, adding admin role");
      existingUser = userData.user;

    } catch (createError) {
      console.log("User creation failed:", createError);
      
      // If user already exists, try to find and update them
      if (createError.message && createError.message.includes('already registered')) {
        console.log("User already exists, attempting to find and update");
        
        // Try to get users again after the error
        const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
        if (!fetchError && existingUsers) {
          existingUser = existingUsers.users.find(u => u.email === 'atacadocanoa@gmail.com');
        }

        if (!existingUser) {
          throw new Error('User exists but cannot be found in user list');
        }

        // Update password for existing user and confirm email
        console.log("Updating password for existing user:", existingUser.id);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { 
            password: 'Admin@2025!',
            email_confirm: true
          }
        );
        
        if (updateError) {
          console.error('Error updating password:', updateError);
        }
      } else {
        throw createError;
      }
    }

    if (!existingUser) {
      throw new Error('No user available after creation/update process');
    }

    console.log("Setting up profile and admin role for user:", existingUser.id);

    // Create/update profile for the user
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

    // Add/update admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: existingUser.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error creating/updating admin role:', roleError);
    }

    console.log("Admin user setup completed successfully");

    return new Response(
      JSON.stringify({ 
        message: 'Admin user setup completed successfully',
        user: existingUser,
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