import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getFeaturedClinics } from "@/lib/services";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export default function FeaturedClinic() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const clinics = await getFeaturedClinics(1);
        if (!mounted) return;
        if (clinics && clinics.length > 0) {
          navigate(`/clinic/${clinics[0].id}`, { replace: true });
        } else {
          navigate('/clinic-listing', { replace: true });
        }
      } catch {
        navigate('/clinic-listing', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Redirecting...</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}
