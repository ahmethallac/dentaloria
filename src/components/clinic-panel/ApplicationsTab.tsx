import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getContactRequests, updateContactRequest, type ContactRequest } from "@/lib/services";
import { Mail, Phone, Search, Lock, Unlock, Loader2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

interface ApplicationsTabProps {
  clinicId: string;
}

const PRICE_CENTS = 2500;
const EXPIRY_HOURS = 48;
type LeadBucket = 'pending' | 'expired' | 'purchased';

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
};

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(1, phone.length - 5))}${phone.slice(-2)}`;
};

const statusLabel = (s: string) =>
  s === 'new' ? 'New' : s === 'contacted' ? 'Contacted' : s === 'completed' ? 'Completed' : s;

const statusTone = (s: string) =>
  s === 'new' ? 'bg-blue-500' : s === 'contacted' ? 'bg-yellow-500' : s === 'completed' ? 'bg-green-500' : 'bg-gray-500';

const isExpired = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() > EXPIRY_HOURS * 60 * 60 * 1000;

export default function ApplicationsTab({ clinicId }: ApplicationsTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [balanceCents, setBalanceCents] = useState(0);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [bulkUnlocking, setBulkUnlocking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState<LeadBucket>('pending');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const [res, purchasesRes, balanceRes] = await Promise.all([
        getContactRequests(clinicId, { q, status: 'all', page, limit }),
        supabase.from('lead_purchases').select('contact_request_id').eq('clinic_id', clinicId),
        supabase.from('clinic_balances').select('balance_cents').eq('clinic_id', clinicId).maybeSingle(),
      ]);
      setRequests(res.requests);
      setTotal(res.total);
      setPurchasedIds(new Set((purchasesRes.data || []).map((p: any) => p.contact_request_id)));
      setBalanceCents(balanceRes.data?.balance_cents ?? 0);
    } catch (e: any) {
      console.error('Could not load patients:', e);
      toast({ title: 'Error', description: 'An error occurred while loading patients.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clinicId, page]);

  // Detect successful direct purchase return
  useEffect(() => {
    const p = searchParams.get('purchase');
    if (p === 'success') {
      toast({ title: 'Purchase complete', description: 'Your selected leads have been unlocked.' });
      const next = new URLSearchParams(searchParams);
      next.delete('purchase');
      setSearchParams(next, { replace: true });
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime balance updates
  useEffect(() => {
    const channel = supabase
      .channel(`balance-${clinicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_balances', filter: `clinic_id=eq.${clinicId}` },
        (payload: any) => {
          if (payload.new?.balance_cents != null) setBalanceCents(payload.new.balance_cents);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  const handleUpdate = async (id: string, updates: Partial<Pick<ContactRequest, 'status' | 'notes'>>) => {
    try {
      const updated = await updateContactRequest(id, updates);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast({ title: 'Updated', description: 'Patient record updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
  };

  const unlockOne = async (requestId: string) => {
    if (balanceCents < PRICE_CENTS) {
      toast({ title: 'Insufficient balance', description: 'Top up your balance to unlock this lead.', variant: 'destructive' });
      return;
    }
    setUnlocking(requestId);
    try {
      const { data, error } = await supabase.rpc('debit_balance_for_lead', {
        p_clinic: clinicId,
        p_request: requestId,
      });
      if (error) throw error;
      const newBalance = (data as any)?.balance_cents ?? balanceCents - PRICE_CENTS;
      setBalanceCents(newBalance);
      setPurchasedIds((prev) => new Set(prev).add(requestId));
      toast({ title: 'Unlocked', description: 'Lead details revealed.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to unlock.', variant: 'destructive' });
    } finally {
      setUnlocking(null);
    }
  };

  const buckets = useMemo(() => {
    const pending: ContactRequest[] = [];
    const expired: ContactRequest[] = [];
    const purchased: ContactRequest[] = [];
    for (const r of requests) {
      if (purchasedIds.has(r.id)) purchased.push(r);
      else if (isExpired(r.created_at)) expired.push(r);
      else pending.push(r);
    }
    return { pending, expired, purchased };
  }, [requests, purchasedIds]);

  const lockedPending = buckets.pending; // all pending leads are locked (purchased ones moved out)
  const maxBulk = Math.floor(balanceCents / PRICE_CENTS);
  const bulkCount = Math.min(lockedPending.length, maxBulk);

  const unlockAllPending = async () => {
    if (lockedPending.length === 0) return;
    if (balanceCents < PRICE_CENTS) {
      toast({ title: 'Insufficient balance', description: 'Top up to unlock leads.', variant: 'destructive' });
      return;
    }
    setBulkUnlocking(true);
    let unlockedCount = 0;
    try {
      for (const lead of lockedPending) {
        if (balanceCents - unlockedCount * PRICE_CENTS < PRICE_CENTS) break;
        const { data, error } = await supabase.rpc('debit_balance_for_lead', {
          p_clinic: clinicId,
          p_request: lead.id,
        });
        if (error) {
          console.warn('Bulk unlock partial failure:', error.message);
          break;
        }
        unlockedCount++;
        const nb = (data as any)?.balance_cents;
        if (typeof nb === 'number') setBalanceCents(nb);
        setPurchasedIds((prev) => new Set(prev).add(lead.id));
      }
      toast({ title: 'Done', description: `${unlockedCount} lead${unlockedCount === 1 ? '' : 's'} unlocked.` });
    } finally {
      setBulkUnlocking(false);
    }
  };

  const filteredQ = (list: ContactRequest[]) => {
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((r) =>
      r.name?.toLowerCase().includes(needle) ||
      r.email?.toLowerCase().includes(needle) ||
      r.phone?.toLowerCase().includes(needle)
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visiblePending = filteredQ(buckets.pending);
  const allVisibleSelected =
    visiblePending.length > 0 && visiblePending.every((r) => selectedIds.has(r.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of visiblePending) next.delete(r.id);
      } else {
        for (const r of visiblePending) next.add(r.id);
      }
      return next;
    });
  };

  const goToPurchasePage = (ids: string[]) => {
    if (ids.length === 0) return;
    navigate(`/clinic/${clinicId}/panel/purchase-leads?ids=${ids.join(',')}`);
  };

  const renderPending = (list: ContactRequest[]) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No pending leads.</div>
      ) : (
        list.map((r) => (
          <div key={r.id} className="p-4 border border-border/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Checkbox
                className="mt-1"
                checked={selectedIds.has(r.id)}
                onCheckedChange={() => toggleSelect(r.id)}
                aria-label={`Select ${r.name}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                {r.message && <div className="mt-2 text-sm">{r.message}</div>}
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{maskEmail(r.email)}</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(r.phone)}</span>}
                </div>
              </div>
              <div className="shrink-0 flex flex-col gap-1 items-stretch">
                <Button
                  size="sm"
                  onClick={() => unlockOne(r.id)}
                  disabled={unlocking === r.id || balanceCents < PRICE_CENTS}
                >
                  {unlocking === r.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Unlock className="w-4 h-4 mr-1" />}
                  Unlock for €25
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => goToPurchasePage([r.id])}
                >
                  Buy now
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderExpired = (list: ContactRequest[]) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No expired leads.</div>
      ) : (
        list.map((r) => (
          <div key={r.id} className="p-4 border border-border/50 rounded-lg opacity-70">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    <Clock className="w-3 h-3 mr-1" />Expired
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{maskEmail(r.email)}</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(r.phone)}</span>}
                </div>
              </div>
              <div className="shrink-0">
                <Button size="sm" disabled>Unlock unavailable</Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPurchased = (list: ContactRequest[]) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No purchased leads yet.</div>
      ) : (
        list.map((r) => (
          <div key={r.id} className="p-4 border border-border/50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium">{r.name}</span>
                  <Badge className={`${statusTone(r.status)} text-white`}>{statusLabel(r.status)}</Badge>
                  <Badge className="bg-green-500 text-white"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                {r.message && <div className="mt-2 text-sm">{r.message}</div>}
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <a href={`mailto:${r.email}`}><Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" />Email</Button></a>
                {r.phone && <a href={`tel:${r.phone}`}><Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" />Call</Button></a>}
                <select
                  className="px-2 py-1 border border-border rounded-md bg-background text-sm"
                  value={r.status}
                  onChange={(e) => handleUpdate(r.id, { status: e.target.value as any })}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1 block">Internal notes</label>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Notes..."
                  value={r.notes || ''}
                  onChange={(e) =>
                    setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, notes: e.target.value } : x)))
                  }
                />
                <Button size="sm" onClick={() => handleUpdate(r.id, { notes: requests.find((x) => x.id === r.id)?.notes })}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Patients
          <Badge variant="outline" className="ml-2">{total} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance summary */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border border-border/60 bg-muted/40">
          <div className="text-sm">
            Balance: <span className="font-semibold">€{(balanceCents / 100).toFixed(2)}</span>
            <span className="text-muted-foreground"> · {Math.floor(balanceCents / PRICE_CENTS)} lead{Math.floor(balanceCents / PRICE_CENTS) === 1 ? '' : 's'} remaining</span>
          </div>
          <Link to={`/clinic/${clinicId}/panel/balance`}>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Add Balance</Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name..." className="pl-10 w-72" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        <Tabs value={bucket} onValueChange={(v) => setBucket(v as LeadBucket)}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({buckets.pending.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({buckets.expired.length})</TabsTrigger>
            <TabsTrigger value="purchased">Purchased ({buckets.purchased.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {lockedPending.length > 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAllVisible}
                    aria-label="Select all visible pending leads"
                  />
                  <span className="font-medium">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selected · €${((selectedIds.size * PRICE_CENTS) / 100).toFixed(2)}`
                      : 'Select leads to purchase'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedIds.size > 0 && balanceCents >= selectedIds.size * PRICE_CENTS && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setBulkUnlocking(true);
                        let count = 0;
                        for (const id of Array.from(selectedIds)) {
                          const { data, error } = await supabase.rpc('debit_balance_for_lead', {
                            p_clinic: clinicId,
                            p_request: id,
                          });
                          if (error) break;
                          count++;
                          const nb = (data as any)?.balance_cents;
                          if (typeof nb === 'number') setBalanceCents(nb);
                          setPurchasedIds((prev) => new Set(prev).add(id));
                        }
                        setSelectedIds(new Set());
                        setBulkUnlocking(false);
                        toast({ title: 'Done', description: `${count} lead${count === 1 ? '' : 's'} unlocked.` });
                      }}
                      disabled={bulkUnlocking}
                    >
                      {bulkUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                      Unlock with balance
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => goToPurchasePage(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                  >
                    Buy selected leads
                  </Button>
                  {bulkCount > 0 && selectedIds.size === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={unlockAllPending}
                      disabled={bulkUnlocking}
                    >
                      {bulkUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                      Unlock all ({bulkCount}) for €{((bulkCount * PRICE_CENTS) / 100).toFixed(2)}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {loading ? <div className="p-6 text-center text-muted-foreground">Loading...</div> : renderPending(visiblePending)}
          </TabsContent>

          <TabsContent value="expired" className="mt-4">
            {loading ? <div className="p-6 text-center text-muted-foreground">Loading...</div> : renderExpired(filteredQ(buckets.expired))}
          </TabsContent>

          <TabsContent value="purchased" className="mt-4">
            {loading ? <div className="p-6 text-center text-muted-foreground">Loading...</div> : renderPurchased(filteredQ(buckets.purchased))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
