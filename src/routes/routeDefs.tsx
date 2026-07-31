import type { ReactNode } from "react";
import Index from "@/pages/Index";
import Treatments from "@/pages/Treatments";
import AboutUs from "@/pages/AboutUs";
import ClinicDetail from "@/pages/ClinicDetail";
import ClinicTokenRoute from "@/pages/ClinicTokenRoute";
import ClinicPanel from "@/pages/ClinicPanel";
import ClinicListing from "@/pages/ClinicListing";
import FeaturedClinic from "@/pages/FeaturedClinic";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import AdminApproveClinic from "@/pages/AdminApproveClinic";
import RegisterClinic from "@/pages/RegisterClinic";
import BalanceTopupPage from "@/pages/BalanceTopupPage";
import PurchaseLeadsPage from "@/pages/PurchaseLeadsPage";

export interface RouteDef {
  path: string;
  element: ReactNode;
}

// The app's 15 routes, defined once and mounted twice in App.tsx — bare
// (English, unprefixed, unchanged from before i18n) and nested under
// "/:lang" for the 6 translated locales. Keeping this list in one place
// means adding a route automatically makes it reachable at every locale.
export const ROUTE_DEFS: RouteDef[] = [
  { path: "/", element: <Index /> },
  { path: "/treatments", element: <Treatments /> },
  { path: "/about-us", element: <AboutUs /> },
  { path: "/auth", element: <Auth /> },
  { path: "/register-clinic", element: <RegisterClinic /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/add-clinic", element: <RegisterClinic /> },
  { path: "/admin", element: <Admin /> },
  { path: "/admin/approve-clinic", element: <AdminApproveClinic /> },
  { path: "/clinic", element: <FeaturedClinic /> },
  { path: "/clinic/:citySlug/:clinicSlug", element: <ClinicDetail /> },
  // Single-segment /clinic/:token is ambiguous (old numeric-id links vs a
  // pretty city slug) — ClinicTokenRoute decides which at render time.
  { path: "/clinic/:token", element: <ClinicTokenRoute /> },
  { path: "/clinic/:id/panel", element: <ClinicPanel /> },
  { path: "/clinic/:id/panel/balance", element: <BalanceTopupPage /> },
  { path: "/clinic/:id/panel/purchase-leads", element: <PurchaseLeadsPage /> },
  { path: "/clinic-listing", element: <ClinicListing /> },
];
