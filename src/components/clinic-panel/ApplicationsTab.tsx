import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getContactRequests, updateContactRequest, type ContactRequest } from "@/lib/services";
import { Mail, Phone, Search, Lock, Unlock, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationsTabProps {
  clinicId: string;
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return '***'
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 5)}${phone.slice(-2)}`
}

const statusLabel = (s: string) =>
  s === "new" ? "New" : s === "contacted" ? "Contacted" : s === "completed" ? "Completed" : s;

const statusTone = (s: string) =>
  s === "new" ? "bg-blue-500" : s === "contacted" ? "bg-yellow-500" : s === "completed" ? "bg-green-500" : "bg-gray-500";

export default function ApplicationsTab({ clinicId }: ApplicationsTabProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState(false);
  const [billingType, setBillingType] = useState<string>('paid');

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "contacted" | "completed">("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [res, purchasesRes, billingRes] = await Promise.all([
        getContactRequests(clinicId, { q, status, page, limit }),
        supabase.from('lead_purchases').select('contact_request_id').eq('clinic_id', clinicId),
        supabase.from('clinic_billing_settings').select('billing_type').eq('clinic_id', clinicId).single()
      ]);
      
      setRequests(res.requests);
      setTotal(res.total);
      setPurchasedIds(new Set(purchasesRes.data?.map(p => p.contact_request_id) || []));
      setBillingType(billingRes.data?.billing_type || 'paid');
    } catch (e: any) {
      console.error("Could not load patients:", e);
      toast({ title: "Error", description: "An error occurred while loading patients.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clinicId, status, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const handleApplySearch = () => { setPage(1); load(); };

  const handleUpdate = async (id: string, updates: Partial<Pick<ContactRequest, "status" | "notes">>) => {
    try {
      const updated = await updateContactRequest(id, updates);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast({ title: "Updated", description: "Patient record updated." });
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleUnlockLeads = async () => {
    const ids = Array.from(selectedIds).filter(id => !purchasedIds.has(id));
    if (ids.length === 0) {
      toast({ title: "Info", description: "All selected leads are already unlocked." });
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lead-checkout', {
        body: { clinicId, contactRequestIds: ids }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.free) {
        toast({ title: "Success!", description: `${data.purchasedCount} leads unlocked for free!` });
        setSelectedIds(new Set());
        load();
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to process.", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const unpurchasedSelected = Array.from(selectedIds).filter(id => !purchasedIds.has(id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Patients
          <Badge variant="outline" className="ml-2">{total} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name..." className="pl-10 w-72" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleApplySearch()} />
            </div>
            <select className="px-3 py-2 border border-border rounded-md bg-background" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
            </select>
            <Button variant="outline" onClick={handleApplySearch}>Search</Button>
          </div>
        </div>

        {/* Unlock bar */}
        {unpurchasedSelected.length > 0 && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {unpurchasedSelected.length} lead{unpurchasedSelected.length > 1 ? 's' : ''} selected
                {billingType === 'free' ? ' (Free)' : ` ($${(unpurchasedSelected.length * 25).toFixed(2)})`}
              </span>
            </div>
            <Button size="sm" onClick={handleUnlockLeads} disabled={purchasing}>
              {purchasing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              {billingType === 'free' ? 'Unlock for Free' : 'Unlock Leads'}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No patients found.</div>
          ) : (
            requests.map((r) => {
              const isPurchased = purchasedIds.has(r.id);
              return (
                <div key={r.id} className="p-4 border border-border/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    {!isPurchased && (
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">{r.name}</span>
                        <Badge className={`${statusTone(r.status)} text-white`}>{statusLabel(r.status)}</Badge>
                        {isPurchased ? (
                          <Badge className="bg-green-500 text-white"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge>
                        ) : (
                          <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                      {r.message && <div className="mt-2 text-sm">{r.message}</div>}
                      
                      {/* Contact info - masked or revealed */}
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {isPurchased ? r.email : maskEmail(r.email)}
                        </span>
                        {r.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {isPurchased ? r.phone : maskPhone(r.phone)}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPurchased && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <a href={`mailto:${r.email}`}>
                          <Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" />Email</Button>
                        </a>
                        {r.phone && (
                          <a href={`tel:${r.phone}`}>
                            <Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" />Call</Button>
                          </a>
                        )}
                        <select className="px-2 py-1 border border-border rounded-md bg-background text-sm" value={r.status} onChange={(e) => handleUpdate(r.id, { status: e.target.value as any })}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {isPurchased && (
                    <div className="mt-3">
                      <label className="text-xs text-muted-foreground mb-1 block">Internal notes</label>
                      <div className="flex gap-2">
                        <Textarea rows={2} placeholder="Notes..." value={r.notes || ""} onChange={(e) => setRequests(prev => prev.map(x => x.id === r.id ? { ...x, notes: e.target.value } : x))} />
                        <Button size="sm" onClick={() => handleUpdate(r.id, { notes: requests.find(x => x.id === r.id)?.notes })}>Save</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <div className="text-sm">Page {page} / {totalPages}</div>
            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
