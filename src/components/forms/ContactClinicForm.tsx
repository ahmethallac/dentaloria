import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
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

const buildSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t("contactForm.nameTooShort")),
    phone: z
      .string()
      .min(1, t("contactForm.phoneRequired"))
      .refine((v) => isPossiblePhoneNumber(v), {
        message: t("contactForm.invalidPhone"),
      }),
    email: z.string().email(t("contactForm.invalidEmail")),
    treatment: z.string().optional().or(z.literal("")),
    message: z.string().optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  submitLabel,
}) => {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [defaultCountry, setDefaultCountry] = useState<string | undefined>(undefined);
  const resolvedSubmitLabel = submitLabel ?? t("contactForm.sendRequest");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
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
      toast({ title: "Error", description: t("contactForm.invalidClinicIdDesc"), variant: "destructive" });
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
        toast({ title: "Error", description: t("contactForm.invalidEmailToastDesc"), variant: "destructive" });
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
          title: t("contactForm.blockedTitle"),
          description: t("contactForm.blockedDesc"),
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

      toast({ title: t("contactForm.successTitle"), description: t("contactForm.successDesc"), variant: "default" });
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
          title: t("contactForm.rateLimitTitle"),
          description: t("contactForm.rateLimitDesc"),
          variant: "destructive",
        });
        return;
      }

      const description = err?.details || err?.message || t("contactForm.genericErrorDesc");
      toast({ title: "Error", description, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input placeholder={t("contactForm.fullName")} autoComplete="name" {...register("name")} required />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <PhoneInput
            placeholder={t("contactForm.phone")}
            value={field.value}
            onChange={field.onChange}
            defaultCountry={defaultCountry}
            autoComplete="tel"
            error={!!errors.phone}
          />
        )}
      />
      {errors.phone && <p className="text-xs text-destructive -mt-2">{errors.phone.message}</p>}
      <Input placeholder={t("contactForm.email")} type="email" autoComplete="email" {...register("email")} required />
      <Input placeholder={t("contactForm.treatment")} {...register("treatment")} />
      <Textarea placeholder={t("contactForm.message")} className="min-h-[80px]" {...register("message")} />
      <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary group overflow-hidden">
        <span className="inline-flex">
          {(isSubmitting ? t("contactForm.sending") : resolvedSubmitLabel).split("").map((letter, index) => (
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
