import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ROUTE_DEFS } from "@/routes/routeDefs";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { GeoRedirectGate } from "@/components/i18n/GeoRedirectGate";
import { LocaleSuggestionBanner } from "@/components/i18n/LocaleSuggestionBanner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GeoRedirectGate>
            <LocaleSuggestionBanner />
            <Routes>
              {/* Bare English routes — unprefixed, unchanged from before i18n */}
              {ROUTE_DEFS.map(({ path, element }) => (
                <Route key={`en-${path}`} path={path} element={element} />
              ))}

              {/* Locale-prefixed variants: /tr, /ro, /pl, /ru, /de, /fr */}
              <Route path="/:lang" element={<LocaleLayout />}>
                {ROUTE_DEFS.map(({ path, element }) => (
                  <Route
                    key={`loc-${path}`}
                    index={path === "/"}
                    path={path === "/" ? undefined : path.slice(1)}
                    element={element}
                  />
                ))}
                {/* Unmatched paths under a valid locale (e.g. /de/typo) still go
                    through LocaleLayout so the 404 renders in that language,
                    rather than falling through to the unprefixed catch-all below. */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GeoRedirectGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
