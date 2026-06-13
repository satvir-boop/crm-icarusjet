import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { db, type Lead } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  trip_type: Lead["trip_type"];
  departure: string;
  arrival: string;
  departure_date: string;
  return_date: string;
  passengers: number;
  aircraft_preference: string;
  budget: number;
  source: string;
  status: Lead["status"];
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  trip_type: "one-way",
  departure: "",
  arrival: "",
  departure_date: "",
  return_date: "",
  passengers: 1,
  aircraft_preference: "",
  budget: 0,
  source: "",
  status: "new",
  notes: "",
};

const statusStyles: Record<Lead["status"], string> = {
  new: "bg-secondary text-secondary-foreground",
  contacted: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  qualified: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  converted: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  lost: "bg-muted text-muted-foreground",
};

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user!.id;
      const payload = {
        ...form,
        owner_id,
        departure: form.departure || null,
        arrival: form.arrival || null,
        departure_date: form.departure_date || null,
        return_date: form.trip_type === "round-trip" ? form.return_date || null : null,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        aircraft_preference: form.aircraft_preference || null,
        source: form.source || null,
        notes: form.notes || null,
        budget: Number(form.budget) || 0,
        passengers: Number(form.passengers) || 1,
      };
      if (editing) {
        const { error } = await db.from("leads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("leads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Lead updated" : "Lead added");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.name.toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      (l.company ?? "").toLowerCase().includes(q) ||
      (l.departure ?? "").toLowerCase().includes(q) ||
      (l.arrival ?? "").toLowerCase().includes(q)
    );
  });

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(l: Lead) {
    setEditing(l);
    setForm({
      name: l.name,
      email: l.email ?? "",
      phone: l.phone ?? "",
      company: l.company ?? "",
      trip_type: l.trip_type,
      departure: l.departure ?? "",
      arrival: l.arrival ?? "",
      departure_date: l.departure_date ?? "",
      return_date: l.return_date ?? "",
      passengers: l.passengers,
      aircraft_preference: l.aircraft_preference ?? "",
      budget: Number(l.budget),
      source: l.source ?? "",
      status: l.status,
      notes: l.notes ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Leads"
        description="Capture and qualify new charter inquiries."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" />
                New lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  upsert.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Trip type</Label>
                    <Select
                      value={form.trip_type}
                      onValueChange={(v) => setForm({ ...form, trip_type: v as Lead["trip_type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-way">One-way</SelectItem>
                        <SelectItem value="round-trip">Round-trip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Passengers</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.passengers}
                      onChange={(e) =>
                        setForm({ ...form, passengers: parseInt(e.target.value || "1", 10) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Departure</Label>
                    <Input
                      placeholder="e.g. New York (KTEB)"
                      value={form.departure}
                      onChange={(e) => setForm({ ...form, departure: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival</Label>
                    <Input
                      placeholder="e.g. London (EGGW)"
                      value={form.arrival}
                      onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Departure date</Label>
                    <Input
                      type="date"
                      value={form.departure_date}
                      onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return date</Label>
                    <Input
                      type="date"
                      disabled={form.trip_type !== "round-trip"}
                      value={form.return_date}
                      onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Aircraft preference</Label>
                    <Input
                      placeholder="e.g. Heavy Jet"
                      value={form.aircraft_preference}
                      onChange={(e) =>
                        setForm({ ...form, aircraft_preference: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (USD)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.budget}
                      onChange={(e) =>
                        setForm({ ...form, budget: parseFloat(e.target.value || "0") })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input
                      placeholder="Website, Referral…"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as Lead["status"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Create lead"}
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
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Pax</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    {l.company && (
                      <div className="text-xs text-muted-foreground">{l.company}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{l.email}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {l.departure || l.arrival ? (
                      <div className="text-xs">
                        {l.departure ?? "—"} → {l.arrival ?? "—"}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <div className="text-xs text-muted-foreground capitalize">{l.trip_type}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.departure_date ?? "—"}
                    {l.return_date && (
                      <div className="text-muted-foreground">↩ {l.return_date}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{l.passengers}</td>
                  <td className="px-4 py-3">
                    {l.budget ? `$${Number(l.budget).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{l.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={statusStyles[l.status]}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {l.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(l.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
