import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { db, type Client } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

type FormState = { name: string; email: string; phone: string; company: string; notes: string };
const emptyForm: FormState = { name: "", email: "", phone: "", company: "", notes: "" };

function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await db.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user!.id;
      const payload = { ...form, owner_id };
      if (editing) {
        const { error } = await db.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Client updated" : "Client added");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q);
  });

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your charter clients."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Create client"}
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
            <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No clients found.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label="Edit">
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
                            <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(c.id)}>Delete</AlertDialogAction>
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
