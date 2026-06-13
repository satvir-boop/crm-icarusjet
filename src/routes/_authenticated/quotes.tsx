import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { db, type Quote, type Client } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotes")({
  component: QuotesPage,
});

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";
type FormState = {
  client_id: string;
  departure: string; arrival: string; departure_date: string;
  passengers: string; price: string; status: QuoteStatus;
};
const emptyForm: FormState = {
  client_id: "",
  departure: "", arrival: "", departure_date: new Date().toISOString().slice(0, 10),
  passengers: "1", price: "0", status: "draft",
};

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function QuotesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await db.from("quotes").select("*").order("departure_date", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await db.from("clients").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const upsert = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user!.id;
      const payload = {
        owner_id,
        client_id: form.client_id || null,
        departure: form.departure,
        arrival: form.arrival,
        departure_date: form.departure_date,
        passengers: Number(form.passengers || 1),
        price: Number(form.price || 0),
        status: form.status,
      };
      if (editing) {
        const { error } = await db.from("quotes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("quotes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Quote updated" : "Quote added");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quote deleted");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = quotes.filter((q) => {
    const s = search.toLowerCase();
    if (!s) return true;
    const c = q.client_id ? clientMap.get(q.client_id) : undefined;
    return q.departure.toLowerCase().includes(s)
      || q.arrival.toLowerCase().includes(s)
      || (c?.name.toLowerCase().includes(s) ?? false);
  });

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(q: Quote) {
    setEditing(q);
    setForm({
      client_id: q.client_id ?? "",
      departure: q.departure,
      arrival: q.arrival,
      departure_date: q.departure_date,
      passengers: String(q.passengers),
      price: String(q.price),
      status: q.status,
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Quotes"
        description="Manage charter quotes and their status."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New quote</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit quote" : "New quote"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Departure *</Label>
                    <Input required value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} placeholder="New York (KTEB)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival *</Label>
                    <Input required value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })} placeholder="London (EGGW)" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input required type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pax</Label>
                    <Input type="number" min={1} value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (USD)</Label>
                    <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as QuoteStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="p-0">
        <div className="border-b p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search route or client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Pax</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No quotes found.</td></tr>
              )}
              {filtered.map((q) => {
                const c = q.client_id ? clientMap.get(q.client_id) : undefined;
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{q.departure} → {q.arrival}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{q.departure_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{q.passengers}</td>
                    <td className="px-4 py-3">{fmtMoney(Number(q.price))}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={statusStyles[q.status]}>{q.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(q)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete quote?</AlertDialogTitle>
                              <AlertDialogDescription>{q.departure} → {q.arrival}. This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(q.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
