import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { withLocalePrefix } from "@/lib/localePath";

interface BalanceWidgetProps {
  clinicId: string;
}

const PRICE_CENTS = 2500;

export default function BalanceWidget({ clinicId }: BalanceWidgetProps) {
  const { t } = useTranslation('applicationsTab');
  const { lang } = useParams();
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("clinic_balances")
        .select("balance_cents")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!cancelled) {
        setBalanceCents(data?.balance_cents ?? 0);
        setLoaded(true);
      }
    })();

    const channel = supabase
      .channel(`balance-widget-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_balances", filter: `clinic_id=eq.${clinicId}` },
        (payload: any) => {
          if (payload.new?.balance_cents != null) setBalanceCents(payload.new.balance_cents);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const leads = Math.floor(balanceCents / PRICE_CENTS);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('balanceLabel').replace(':', '')}</div>
          <div className="text-xl font-bold leading-tight">
            {loaded ? `€${(balanceCents / 100).toFixed(2)}` : "…"}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('leadsRemaining', { count: leads })}
          </div>
        </div>
      </div>
      <Link to={withLocalePrefix(`/clinic/${clinicId}/panel/balance`, lang)}>
        <Button className="bg-green-600 hover:bg-green-700 text-white">{t('addBalance')}</Button>
      </Link>
    </div>
  );
}
