import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createContactRequest } from "@/lib/services";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().min(2, "Please enter your full name."),
  phone: z.string().min(7, "Please enter a valid phone."),
  email: z.string().email("Please enter a valid email."),
  treatment: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export interface ContactClinicFormProps {
  clinicId: string;
  initialTreatment?: string;
  onSuccess?: () => void;
  submitLabel?: string;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export const ContactClinicForm: React.FC<ContactClinicFormProps> = ({
  clinicId,
  initialTreatment = "",
  onSuccess,
  submitLabel = "Send Request",
}) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      treatment: initialTreatment,
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!clinicId || !isUuid(clinicId)) {
      toast({ title: "Error", description: "Invalid clinic id.", variant: "destructive" });
      return;
    }

    try {
      // Input sanitization - prevent XSS and limit input lengths
      const sanitizedValues = {
        name: values.name.trim().substring(0, 100),
        phone: values.phone?.trim().substring(0, 20) || '',
        email: values.email.trim().toLowerCase().substring(0, 255),
        message: values.message?.trim().substring(0, 1000) || '',
        treatment: values.treatment?.trim().substring(0, 200) || ''
      }

      // Validate email format more strictly
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedValues.email)) {
        toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }

      // Check for potential spam/abuse patterns
      const suspiciousPatterns = [
        /https?:\/\//i, // URLs
        /\b(bitcoin|crypto|investment|lottery|prize)\b/i, // Common spam keywords
        /(.)\1{10,}/, // Repeated characters (more than 10)
      ];
      
      const messageToCheck = `${sanitizedValues.name} ${sanitizedValues.message} ${sanitizedValues.treatment}`;
      if (suspiciousPatterns.some(pattern => pattern.test(messageToCheck))) {
        toast({ 
          title: "Message blocked", 
          description: "Your message contains content that is not allowed. Please revise and try again.", 
          variant: "destructive" 
        });
        return;
      }

      await createContactRequest({
        clinic_id: clinicId,
        name: sanitizedValues.name,
        email: sanitizedValues.email,
        phone: sanitizedValues.phone,
        message: sanitizedValues.message || (sanitizedValues.treatment ? `Treatment: ${sanitizedValues.treatment}` : undefined),
        source: "website",
        status: "new",
        ip_address: '0.0.0.0', // In production, get real IP from server
        user_agent: navigator.userAgent
      } as any);

      toast({ title: "Inquiry received", description: "The clinic will contact you soon.", variant: "default" });
      reset({ name: "", phone: "", email: "", treatment: "", message: "" });
      onSuccess?.();
    } catch (err: any) {
      console.error("Contact request error", { payload: { clinicId, ...values } }, err);
      
      // Handle rate limiting errors
      if (err?.message?.includes('rate limit') || err?.code === 'RATE_LIMIT_EXCEEDED') {
        toast({ 
          title: "Too many requests", 
          description: "Please wait before submitting another request.", 
          variant: "destructive" 
        });
        return;
      }
      
      const description = err?.details || err?.message || "Submission failed. Please try again.";
      toast({ title: "Error", description, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input placeholder="Full Name *" autoComplete="name" {...register("name")} required />
      <Input placeholder="Phone *" type="tel" autoComplete="tel" {...register("phone")} required />
      <Input placeholder="Email *" type="email" autoComplete="email" {...register("email")} required />
      <Input placeholder="Treatment (optional)" {...register("treatment")} />
      <Textarea placeholder="Your message (optional)" className="min-h-[80px]" {...register("message")} />
      <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary group overflow-hidden">
        <span className="inline-flex">
          {(isSubmitting ? "Sending..." : submitLabel).split('').map((letter, index) => (
            <span
              key={index}
              className="inline-block opacity-100 transition-all duration-300 group-hover:animate-[letter-fade-in_0.5s_ease-out_forwards]"
              style={{
                animationDelay: `${index * 0.05}s`
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </span>
      </Button>
    </form>
  );
};
