import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddMemberRequest {
  email: string;
  tenant_id?: string;
  workspace_id?: string; // compatibilidade retroativa
  role: string;
  custom_permissions?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { email, tenant_id, workspace_id, role, custom_permissions }: AddMemberRequest = body;

    const tenantId = tenant_id ?? workspace_id;

    console.log('Add member request received');

    // Validate input
    if (!email || !tenantId || !role) {
      throw new Error('Email, tenant_id, and role are required');
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role. Must be one of: owner, admin, member, viewer');
    }

    // Check if the requesting user is owner or admin of the tenant
    const { data: requesterMembership, error: membershipError } = await supabaseClient
      .from('sieg_fin_tenant_users')
      .select('role, active')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !requesterMembership || requesterMembership.active === false) {
      throw new Error('You are not a member of this tenant');
    }

    if (!['owner', 'admin'].includes(requesterMembership.role)) {
      throw new Error('Only owners and admins can add members');
    }

    // Enforce role hierarchy - prevent privilege escalation
    if (role === 'owner' && requesterMembership.role !== 'owner') {
      throw new Error('Only workspace owners can add other owners');
    }

    if (role === 'admin' && requesterMembership.role !== 'owner') {
      throw new Error('Only workspace owners can add admins');
    }

    // Find user by email using service role
    const { data: targetUser, error: userError } = await supabaseClient.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      throw new Error('Failed to search for user');
    }

    let foundUser = targetUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    let userId: string;

    if (!foundUser) {
      // User doesn't exist - send invitation email (this creates the user AND sends email)
      console.log('User not found, sending invitation email');
      
      const redirectUrl = 'https://app.ziontraffic.com.br/complete-signup';
      
      const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: redirectUrl,
          data: {
            invited_to_tenant: tenantId,
            invited_role: role
          }
        }
      );

      if (inviteError) {
        console.error('❌ Error sending invitation email:', inviteError);
        throw new Error('Failed to send invitation email. Please try again.');
      }

      console.log('✅ Invitation email sent to:', email);

      // Get the newly created user
      const { data: updatedUsers, error: refreshError } = await supabaseClient.auth.admin.listUsers();
      
      if (refreshError) {
        console.error('Error fetching updated user list:', refreshError);
        throw new Error('Failed to retrieve user information');
      }

      foundUser = updatedUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        throw new Error('User was invited but could not be found');
      }

      userId = foundUser.id;
      console.log('New user ID retrieved:', userId);
    } else {
      userId = foundUser.id;
      console.log('Existing user found:', userId);
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('sieg_fin_tenant_users')
      .select('user_id, active')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember && existingMember.active) {
      throw new Error('User is already a member of this tenant');
    }

    let upsertError = null;

    if (existingMember) {
      const { error } = await supabaseClient
        .from('sieg_fin_tenant_users')
        .update({
          role,
          active: true,
          updated_at: new Date().toISOString(),
          invited_by: user.id,
          custom_permissions: custom_permissions ? JSON.stringify(custom_permissions) : null,
        })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      upsertError = error;
    } else {
      const { error } = await supabaseClient
        .from('sieg_fin_tenant_users')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role,
          active: true,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          custom_permissions: custom_permissions ? JSON.stringify(custom_permissions) : null,
        });

      upsertError = error;
    }

    if (upsertError) {
      console.error('Error inserting member', upsertError);
      throw new Error('Failed to add member to tenant');
    }

    console.log('Member added successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member added successfully',
        user_id: userId,
        user_created: !existingMember && !foundUser, // Indicates if a new user was created via invite
        tenant_id: tenantId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in add-workspace-member:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while adding the member';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
