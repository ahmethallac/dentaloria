import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createContactRequest } from "@/lib/services";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  loadPatientContactInfo,
  savePatientContactInfo,
  type PatientContactInfo,
} from "@/lib/patientInfo";
import { isPossiblePhoneNumber } from "react-phone-number-input";

const schema = z.object({
  name: z.string().min(2, "Please enter your full name."),
  phone: z
    .string()
    .min(1, "Please enter your phone number.")
    .refine((v) => isPossiblePhoneNumber(v), {
      message: "Please enter a valid phone number.",
    }),
  email: z.string().email("Please enter a valid email."),
  treatment: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export interface ContactClinicSubmittedValues {
  clinicId: string;
  name: string;
  email: string;
  phone: string;
  treatment?: string;
  message?: string;
}

export interface ContactClinicFormProps {
  clinicId: string;
  initialTreatment?: string;
  onSuccess?: (values: ContactClinicSubmittedValues) => void;
  submitLabel?: string;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

const detectCountryCode = async (): Promise<string | undefined> => {
  try {
    const res = await fetch("https://ipwho.is/", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return data?.country_code?.toUpperCase?.();
  } catch {
    return undefined;
  }
};

export const ContactClinicForm: React.FC<ContactClinicFormProps> = ({
  clinicId,
  initialTreatment = "",
  onSuccess,
  submitLabel = "Send Request",
}) => {
  const { toast } = useToast();
  const [defaultCountry, setDefaultCountry] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting, errors },
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

  // Load persisted patient info and detect country by IP on mount
  useEffect(() => {
    const persisted = loadPatientContactInfo();
    if (persisted) {
      setValue("name", persisted.name, { shouldValidate: false });
      setValue("email", persisted.email, { shouldValidate: false });
      setValue("phone", persisted.phone, { shouldValidate: false });
    }

    detectCountryCode().then((code) => {
      if (code) setDefaultCountry(code);
    });
  }, [setValue]);

  const onSubmit = async (values: FormValues) => {
    if (!clinicId || !isUuid(clinicId)) {
      toast({ title: "Error", description: "Invalid clinic id.", variant: "destructive" });
      return;
    }

    try {
      // Input sanitization - prevent XSS and limit input lengths
      const sanitizedValues = {
        name: values.name.trim().substring(0, 100),
        phone: values.phone?.trim().substring(0, 30) || "",
        email: values.email.trim().toLowerCase().substring(0, 255),
        message: values.message?.trim().substring(0, 1000) || "",
        treatment: values.treatment?.trim().substring(0, 200) || "",
      };

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
      if (suspiciousPatterns.some((pattern) => pattern.test(messageToCheck))) {
        toast({
          title: "Message blocked",
          description: "Your message contains content that is not allowed. Please revise and try again.",
          variant: "destructive",
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
        ip_address: "0.0.0.0", // In production, get real IP from server
        user_agent: navigator.userAgent,
      } as any);

      // Persist patient contact info across forms
      const patientInfo: PatientContactInfo = {
        name: sanitizedValues.name,
        email: sanitizedValues.email,
        phone: sanitizedValues.phone,
      };
      savePatientContactInfo(patientInfo);

      toast({ title: "Inquiry received", description: "The clinic will contact you soon.", variant: "default" });
      const submitted: ContactClinicSubmittedValues = {
        clinicId,
        name: sanitizedValues.name,
        email: sanitizedValues.email,
        phone: sanitizedValues.phone,
        treatment: sanitizedValues.treatment || undefined,
        message: sanitizedValues.message || undefined,
      };
      reset({ name: "", phone: "", email: "", treatment: "", message: "" });
      // Restore persisted values after reset so the next form in the same session is pre-filled
      const persisted = loadPatientContactInfo();
      if (persisted) {
        setValue("name", persisted.name, { shouldValidate: false });
        setValue("email", persisted.email, { shouldValidate: false });
        setValue("phone", persisted.phone, { shouldValidate: false });
      }
      onSuccess?.(submitted);
    } catch (err: any) {
      console.error("Contact request error", { payload: { clinicId, ...values } }, err);

      // Handle rate limiting errors
      if (err?.message?.includes("rate limit") || err?.code === "RATE_LIMIT_EXCEEDED") {
        toast({
          title: "Too many requests",
          description: "Please wait before submitting another request.",
          variant: "destructive",
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
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <PhoneInput
            placeholder="Phone *"
            value={field.value}
            onChange={field.onChange}
            defaultCountry={defaultCountry}
            autoComplete="tel"
            error={!!errors.phone}
          />
        )}
      />
      {errors.phone && <p className="text-xs text-destructive -mt-2">{errors.phone.message}</p>}
      <Input placeholder="Email *" type="email" autoComplete="email" {...register("email")} required />
      <Input placeholder="Treatment (optional)" {...register("treatment")} />
      <Textarea placeholder="Your message (optional)" className="min-h-[80px]" {...register("message")} />
      <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary group overflow-hidden">
        <span className="inline-flex">
          {(isSubmitting ? "Sending..." : submitLabel).split("").map((letter, index) => (
            <span
              key={index}
              className="inline-block opacity-100 transition-all duration-300 group-hover:animate-[letter-fade-in_0.5s_ease-out_forwards]"
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </span>
      </Button>
    </form>
  );
};
