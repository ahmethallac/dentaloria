import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinicId, token, action, rejectionReason } = await req.json();

    if (!clinicId || !token || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify token
    const { data: approval, error: fetchError } = await supabase
      .from('clinic_approvals')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('approval_token', token)
      .single();

    if (fetchError || !approval) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (approval.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'This clinic has already been reviewed', status: approval.status }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update clinic_approvals
    const { error: updateApprovalError } = await supabase
      .from('clinic_approvals')
      .update({
        status: newStatus,
        rejection_reason: action === 'reject' ? rejectionReason : null,
        reviewed_at: new Date().toISOString(),
        approval_token: null // Invalidate token
      })
      .eq('id', approval.id);

    if (updateApprovalError) throw updateApprovalError;

    // Update clinics.approval_status
    const { error: updateClinicError } = await supabase
      .from('clinics')
      .update({ approval_status: newStatus })
      .eq('id', clinicId);

    if (updateClinicError) throw updateClinicError;

    // Get clinic info for notification
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, email')
      .eq('id', clinicId)
      .single();

    console.log(`Clinic ${clinic?.name} has been ${newStatus}. Notification would be sent to ${clinic?.email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      status: newStatus,
      clinicName: clinic?.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in clinic-approval-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
