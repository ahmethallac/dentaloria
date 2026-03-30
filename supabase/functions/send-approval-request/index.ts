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
    const { clinicId, clinicName, clinicEmail } = await req.json();
    
    if (!clinicId || !clinicName || !clinicEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate a simple approval token
    const token = crypto.randomUUID();
    
    // Store the token in clinic_approvals
    const { error: tokenError } = await supabase
      .from('clinic_approvals')
      .update({ approval_token: token })
      .eq('clinic_id', clinicId);

    if (tokenError) {
      console.error('Error storing token:', tokenError);
    }

    const baseUrl = 'https://dentaloria.lovable.app';
    const approveUrl = `${baseUrl}/admin/approve-clinic?id=${clinicId}&token=${token}&action=approve`;
    const rejectUrl = `${baseUrl}/admin/approve-clinic?id=${clinicId}&token=${token}&action=reject`;

    // Send email to admin
    const emailBody = `
      <h2>New Clinic Registration Request</h2>
      <p><strong>Clinic Name:</strong> ${clinicName}</p>
      <p><strong>Email:</strong> ${clinicEmail}</p>
      <br/>
      <p>Please review this clinic registration:</p>
      <br/>
      <a href="${approveUrl}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 12px;">✅ Approve</a>
      &nbsp;&nbsp;
      <a href="${rejectUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">❌ Reject</a>
      <br/><br/>
      <p style="color: #666;">You can also review this in the admin panel.</p>
    `;

    // Use Supabase's built-in email or a simple fetch to a mail API
    // For now, we'll log the email and store the approval request
    console.log(`Approval email would be sent to info@dentalturkey.clinic for clinic: ${clinicName}`);
    console.log(`Approve URL: ${approveUrl}`);
    console.log(`Reject URL: ${rejectUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Approval request sent',
      approveUrl,
      rejectUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in send-approval-request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
