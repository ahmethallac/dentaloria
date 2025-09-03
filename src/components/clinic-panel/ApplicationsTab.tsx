import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getContactRequests, updateContactRequest, type ContactRequest } from "@/lib/services";
import { Mail, Phone, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationsTabProps {
  clinicId: string;
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

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "contacted" | "completed">("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getContactRequests(clinicId, { q, status, page, limit });
      setRequests(res.requests);
      setTotal(res.total);
    } catch (e: any) {
      console.error("Could not load applications:", e);
      toast({
        title: "Error",
        description: "An error occurred while loading applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, status, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const handleApplySearch = () => {
    setPage(1);
    load();
  };

  const handleUpdate = async (id: string, updates: Partial<Pick<ContactRequest, "status" | "notes">>) => {
    try {
      const updated = await updateContactRequest(id, updates);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      toast({ title: "Updated", description: "Application updated." });
    } catch (e: any) {
      console.error("Could not update application:", e);
      toast({
        title: "Error",
        description: "An error occurred while updating the application.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone or email..."
                className="pl-10 w-72"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplySearch()}
              />
            </div>
            <select
              className="px-3 py-2 border border-border rounded-md bg-background"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
            </select>
            <Button variant="outline" onClick={handleApplySearch}>
              Search
            </Button>
            <Button variant="outline" onClick={load}>
              Refresh
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">Total: {total}</div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No applications yet or no results found matching the filters.
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-4 border border-border/50 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="font-medium">{r.name}</div>
                      <Badge className={`${statusTone(r.status)} text-white`}>{statusLabel(r.status)}</Badge>
                      {r.source && <Badge variant="outline">{r.source}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm">{r.message}</div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.phone && (
                      <a href={`tel:${r.phone}`}>
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      </a>
                    )}
                    <a href={`mailto:${r.email}`}>
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </a>
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
                      placeholder="Internal notes about this application..."
                      value={r.notes || ""}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <div className="text-sm">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
