import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createContactRequest } from "@/lib/services";

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
      await createContactRequest({
        clinic_id: clinicId,
        name: values.name,
        email: values.email,
        phone: values.phone,
        message: values.message || (values.treatment ? `Treatment: ${values.treatment}` : undefined),
        source: "website",
        status: "new",
      } as any);

      toast({ title: "Inquiry received", description: "The clinic will contact you soon.", variant: "default" });
      reset({ name: "", phone: "", email: "", treatment: "", message: "" });
      onSuccess?.();
    } catch (err: any) {
      console.error("Contact request error", { payload: { clinicId, ...values } }, err);
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
