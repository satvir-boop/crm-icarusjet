import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db, type Client, type Quote } from "@/lib/crm";
import { Users, FileText, CheckCircle2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null as number | null },
];

function Dashboard() {
  const [range, setRange] = useState("7");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [clients, quotes, leads] = await Promise.all([
        db.from("clients").select("*"),
        db.from("quotes").select("*").order("created_at", { ascending: false }),
        db.from("leads").select("*"),
      ]);
      return {
        clients: (clients.data ?? []) as Client[],
        quotes: (quotes.data ?? []) as Quote[],
        leads: (leads.data ?? []) as any[],
      };
    },
  });

  const selected = RANGES.find((r) => r.key === range)!;
  const cutoff = selected.days ? Date.now() - selected.days * 86400000 : 0;
  const inRange = <T extends { created_at?: string }>(arr: T[]) =>
    selected.days ? arr.filter((x) => x.created_at && new Date(x.created_at).getTime() >= cutoff) : arr;

  const quotes = inRange(data?.quotes ?? []);
  const clients = inRange(data?.clients ?? []);
  const leads = inRange(data?.leads ?? []);
  const revenue = quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.price), 0);
  const recent = quotes.slice(0, 5);

  const stats = [
    { label: "Leads", value: leads.length, icon: UserPlus },
    { label: "Clients", value: clients.length, icon: Users },
    { label: "Quotes", value: quotes.length, icon: FileText },
    { label: "Accepted revenue", value: formatMoney(revenue), icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Dashboard" description="An overview of your charter business." />

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            variant={range === r.key ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">
              {isLoading ? "—" : s.value}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Recent quotes</h2>
          <span className="text-xs text-muted-foreground">{selected.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Route</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Pax</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No quotes in this range.</td></tr>
              )}
              {recent.map((q) => (
                <tr key={q.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{q.departure} → {q.arrival}</td>
                  <td className="py-3 text-muted-foreground">{q.departure_date}</td>
                  <td className="py-3 text-muted-foreground">{q.passengers}</td>
                  <td className="py-3">{formatMoney(Number(q.price))}</td>
                  <td className="py-3"><Badge variant="secondary" className={statusStyles[q.status]}>{q.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
