import * as React from "react";
import { cn } from "@/lib/utils";
import "react-phone-number-input/style.css";
import PhoneNumberInput, {
  type Value,
  type Country,
} from "react-phone-number-input";

export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof PhoneNumberInput>, "onChange" | "value"> {
  value?: Value;
  onChange?: (value?: Value) => void;
  error?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, error, defaultCountry, ...props }, ref) => {
    return (
      <PhoneNumberInput
        ref={ref as any}
        value={value}
        onChange={onChange}
        international
        defaultCountry={defaultCountry || "US"}
        className={cn(
          "PhoneInput flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
export type { Value as PhoneValue, Country };
