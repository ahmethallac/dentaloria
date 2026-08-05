import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Props {
  steps: string[];
  currentStep: number; // 1-indexed, matches steps[currentStep - 1]
}

export default function OnboardingStepper({ steps, currentStep }: Props) {
  return (
    <div className="flex items-start justify-center gap-1.5 sm:gap-3 mb-8 px-2">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5 w-14 sm:w-20">
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors duration-300 ${
                  isDone || isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.5)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNum}
              </motion.div>
              <span
                className={`text-[10px] sm:text-xs text-center leading-tight ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {stepNum < steps.length && (
              <div className="w-4 sm:w-10 h-0.5 rounded-full bg-muted overflow-hidden mt-4 sm:mt-5">
                <motion.div
                  className="h-full bg-gradient-primary"
                  initial={false}
                  animate={{ width: isDone ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
