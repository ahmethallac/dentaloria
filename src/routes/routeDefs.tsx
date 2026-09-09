import { lazy, type ReactNode } from "react";
import Index from "@/pages/Index";
import Treatments from "@/pages/Treatments";
import AboutUs from "@/pages/AboutUs";
import ClinicDetail from "@/pages/ClinicDetail";
import ClinicTokenRoute from "@/pages/ClinicTokenRoute";
import ClinicDraftPreview from "@/pages/ClinicDraftPreview";
import ClinicListing from "@/pages/ClinicListing";
import FeaturedClinic from "@/pages/FeaturedClinic";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import RegisterClinic from "@/pages/RegisterClinic";

// Staff and clinic-owner screens, split out of the main bundle: none of them
// is reachable without signing in, so shipping them to every visitor only made
// the first paint slower. Everything a visitor can actually reach stays eager.
const ClinicPanel = lazy(() => import("@/pages/ClinicPanel"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const AdminApproveClinic = lazy(() => import("@/pages/AdminApproveClinic"));
const BalanceTopupPage = lazy(() => import("@/pages/BalanceTopupPage"));
const PurchaseLeadsPage = lazy(() => import("@/pages/PurchaseLeadsPage"));

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
  // Outreach draft, reachable only with its secret token. Short path because
  // the whole link goes into an email; the page sets noindex itself.
  { path: "/p/:token", element: <ClinicDraftPreview /> },
];
