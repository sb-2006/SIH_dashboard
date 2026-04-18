import { useMemo, useState } from "react";
import MapBox from "./MapBox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// import {
//   Tooltip,
//   TooltipTrigger,
//   TooltipContent,
//   TooltipProvider,
// } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Clock3,
  Database,
  FileSpreadsheet,
  Gauge,
  Map,
  Play,
  RefreshCcw,
  ShieldCheck,
  // TrafficCone,
  Upload,
  Zap,
  BarChart3,
  Sun,
  Moon,
  ListOrdered,
  Wrench,
  Image as ImageIcon,
  MapIcon,
  // Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

type Trainset = {
  id: string; // e.g., KMRL-TS-01
  carCount: number; // 4
  mileageKm: number; // cumulative
  lastServiceKm: number;
  fitness: {
    rollingStockValidTill: string; // ISO date
    signallingValidTill: string;
    telecomValidTill: string;
  };
  jobCardsOpen: number; // from Maximo
  branding: {
    campaign: string | null;
    hoursCommitted: number; // SLA hours / week
    hoursDelivered: number; // achieved
  };
  cleaningDue: boolean;
  stabledAt: "MAIN_DEPOT_A" | "MAIN_DEPOT_B" | "SATELLITE";
  bay: string; // geometric position label
  status: "Ready" | "Standby" | "IBL";
};

type Weights = {
  fitness: number;
  jobs: number;
  mileage: number;
  branding: number;
  cleaning: number;
  stabling: number;
};

type RankedTrain = Trainset & {
  rank: number;
  score: number; // can be -Infinity for blocked
  blocked: boolean;
  displayScore: string;
};

// -------------------------------------------------------------
// Seed demo data
// -------------------------------------------------------------

const seed: Trainset[] = Array.from({ length: 25 }).map((_, i) => {
  const id = `KMRL-TS-${String(i + 1).padStart(2, "0")}`;
  const mileageKm = 30000 + Math.round(Math.random() * 12000);
  const lastServiceKm = mileageKm - (1000 + Math.round(Math.random() * 5000));
  const days = (d: number) =>
    new Date(Date.now() + d * 24 * 3600 * 1000).toISOString();
  return {
    id,
    carCount: 4,
    mileageKm,
    lastServiceKm,
    fitness: {
      rollingStockValidTill: days(2 + Math.floor(Math.random() * 20)),
      signallingValidTill: days(1 + Math.floor(Math.random() * 15)),
      telecomValidTill: days(-2 + Math.floor(Math.random() * 10)),
    },
    jobCardsOpen: Math.floor(Math.random() * 4),
    branding: {
      campaign:
        Math.random() > 0.4
          ? Math.random() > 0.5
            ? "Kerala Tourism"
            : "Bank Promo"
          : null,
      hoursCommitted: Math.random() > 0.4 ? 40 : 0,
      hoursDelivered: Math.random() > 0.4 ? Math.floor(Math.random() * 35) : 0,
    },
    cleaningDue: Math.random() > 0.6,
    stabledAt:
      Math.random() > 0.7
        ? "SATELLITE"
        : Math.random() > 0.5
        ? "MAIN_DEPOT_B"
        : "MAIN_DEPOT_A",
    bay: `B${1 + Math.floor(Math.random() * 12)}`,
    status: ["Ready", "Standby", "IBL"][
      Math.floor(Math.random() * 3)
    ] as Trainset["status"],
  };
});

// -------------------------------------------------------------
// Scoring: fitness is a hard constraint (block if expired), plus soft scores
// -------------------------------------------------------------

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}

function scoreTrain(t: Trainset, weights: Weights) {
  const minFitnessDays = Math.min(
    daysLeft(t.fitness.rollingStockValidTill),
    daysLeft(t.fitness.signallingValidTill),
    daysLeft(t.fitness.telecomValidTill)
  );

  if (!Number.isFinite(minFitnessDays) || minFitnessDays <= 0) {
    return -Infinity; // hard block if any fitness expired or date is invalid
  }

  const fitnessScore = Math.max(0, Math.min(1, minFitnessDays / 10)); // 0..1
  const jobPenalty = Math.max(0, 1 - Math.min(1, t.jobCardsOpen / 3)); // 1 if 0 jobs, 0 if >=3
  const mileageBalance =
    1 - Math.min(1, Math.abs((t.mileageKm - 36000) / 20000)); // prefer closer to 36k
  const brandingScore = t.branding.campaign
    ? Math.min(
        1,
        (t.branding.hoursCommitted - t.branding.hoursDelivered) /
          Math.max(1, t.branding.hoursCommitted)
      )
    : 0.3; // neutral if no campaign
  const cleaningPenalty = t.cleaningDue ? 0.4 : 1;
  const stablingBonus =
    t.stabledAt === "MAIN_DEPOT_A"
      ? 1
      : t.stabledAt === "MAIN_DEPOT_B"
      ? 0.85
      : 0.7; // geometry/shunting

  return (
    fitnessScore * weights.fitness +
    jobPenalty * weights.jobs +
    mileageBalance * weights.mileage +
    brandingScore * weights.branding +
    cleaningPenalty * weights.cleaning +
    stablingBonus * weights.stabling
  );
}

const defaultWeights: Weights = {
  fitness: 0.35, // increased priority (user requested)
  jobs: 0.2,
  mileage: 0.15,
  branding: 0.1,
  cleaning: 0.1,
  stabling: 0.1,
};

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------

export default function KMRLDashboard() {
  // const [trains, setTrains] = useState<Trainset[]>(seed);
  const [trains] = useState<Trainset[]>(seed);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [nightMode, setNightMode] = useState(true);
  const [serviceDemand, setServiceDemand] = useState(18); // how many rakes at dawn
  const [simulateCleaningSlots, setSimulateCleaningSlots] = useState(6);
  const [respectBranding, setRespectBranding] = useState(true);

  // Build ranked list. Blocked trains (fitness expired) are always placed at the bottom.
  const ranked: RankedTrain[] = useMemo(() => {
    const w: Weights = respectBranding ? weights : { ...weights, branding: 0 };

    const scored = trains.map((t) => {
      const s = scoreTrain(t, w);
      const blocked = !Number.isFinite(s) || s === -Infinity;
      return {
        ...t,
        score: s,
        blocked,
        rank: -1,
        displayScore: blocked
          ? "BLOCKED"
          : typeof s === "number"
          ? s.toFixed(3)
          : "N/A",
      } as RankedTrain;
    });

    scored.sort((a, b) => {
      // blocked last
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      // both non-blocked: higher score first
      return (b.score as number) - (a.score as number);
    });

    return scored.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [trains, weights, respectBranding]);

  // Set of train IDs chosen for induction: top N non-blocked
  const inductedIds = useMemo(() => {
    return new Set(
      ranked
        .filter((r) => !r.blocked)
        .slice(0, serviceDemand)
        .map((r) => r.id)
    );
  }, [ranked, serviceDemand]);

  const readyCount = trains.filter((t) => t.status !== "IBL").length;
  const campaigns = trains.filter((t) => t.branding.campaign);
  const campaignCompliance = campaigns.length
    ? Math.round(
        (trains.filter(
          (t) =>
            t.branding.campaign &&
            t.branding.hoursDelivered >= Math.min(t.branding.hoursCommitted, 1)
        ).length /
          campaigns.length) *
          100
      )
    : 100;

  const alerts = useMemo(() => {
    const a: { level: "high" | "med" | "low"; text: string }[] = [];
    ranked.forEach((r) => {
      const soon = (iso: string) =>
        new Date(iso).getTime() < Date.now() + 48 * 3600 * 1000;
      if (soon(r.fitness.telecomValidTill))
        a.push({
          level: "high",
          text: `${r.id}: Telecom fitness expiring soon.`,
        });
      if (r.jobCardsOpen >= 3)
        a.push({
          level: "med",
          text: `${r.id}: ${r.jobCardsOpen} open job-cards.`,
        });
      if (r.cleaningDue)
        a.push({ level: "low", text: `${r.id}: Deep clean due.` });
    });
    return a.slice(0, 6);
  }, [ranked]);

  // What-if: recompute expected shunting cost (toy calc)
  const shuntingCost = useMemo(() => {
    const top = ranked.filter((r) => !r.blocked).slice(0, serviceDemand);
    const cost = top.reduce(
      (acc, r) =>
        acc +
        (r.stabledAt === "MAIN_DEPOT_A"
          ? 1
          : r.stabledAt === "MAIN_DEPOT_B"
          ? 2
          : 3),
      0
    );
    return Math.round(cost * 1.4); // arbitrary units
  }, [ranked, serviceDemand]);

  const kpiData = Array.from({ length: 14 }).map((_, i) => ({
    day: `D-${14 - i}`,
    availability: 85 + Math.round(Math.random() * 12),
    punctuality: 98 + Math.round(Math.random() * 2),
  }));

  // Helper: update a single weight safely
  function updateWeight<K extends keyof Weights>(key: K, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={nightMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* <TrafficCone className="h-5 w-5" /> */}
            <div className="h-5 w-10 flex items-center justify-center">
              <img src="/icon.png" alt="" />
            </div>
            <h1 className="text-lg font-semibold">
              KMRL – AI Induction Planner
            </h1>
            <Badge variant="secondary" className="ml-2">
              Beta
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => setNightMode((v) => !v)}
              >
                {nightMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {nightMode ? "Light" : "Dark"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Upload className="h-4 w-4" /> Import Data
              </Button>
              <Button size="sm" className="gap-2">
                <Play className="h-4 w-4" /> Run Optimiser
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-muted">
                  <Gauge className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    Ready / Total
                  </div>
                  <div className="text-xl font-semibold">
                    {readyCount} / {trains.length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-muted">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    Target at Dawn
                  </div>
                  <div className="text-xl font-semibold">
                    {serviceDemand} rakes
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-muted">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    Branding SLA
                  </div>
                  <div className="text-xl font-semibold">
                    {campaignCompliance}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-muted">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    Est. Shunting Cost
                  </div>
                  <div className="text-xl font-semibold">{shuntingCost} u</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            {/* Left: Rank & Explain */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" /> Ranked Induction List
                </CardTitle>
                <CardDescription>
                  Explainable selection for dawn induction. Use sliders to tune
                  weights and try what-if scenarios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-4">
                  <div className="w-64">
                    <div className="text-xs text-muted-foreground mb-1">
                      Service demand (rakes)
                    </div>
                    <Slider
                      value={[serviceDemand]}
                      min={8}
                      max={Math.max(8, trains.length)}
                      step={1}
                      onValueChange={(v) => setServiceDemand(v[0])}
                    />
                  </div>
                  <div className="w-64">
                    <div className="text-xs text-muted-foreground mb-1">
                      Cleaning slots available
                    </div>
                    <Slider
                      value={[simulateCleaningSlots]}
                      min={0}
                      max={12}
                      step={1}
                      onValueChange={(v) => setSimulateCleaningSlots(v[0])}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="branding"
                      checked={respectBranding}
                      onCheckedChange={(v) => setRespectBranding(Boolean(v))}
                    />
                    <label htmlFor="branding" className="text-sm">
                      Respect branding priorities
                    </label>
                  </div>
                </div>

                <div className="overflow-auto rounded-2xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Trainset</th>
                        <th className="text-left p-2">Score</th>
                        <th className="text-left p-2">Fitness</th>
                        <th className="text-left p-2">Jobs</th>
                        <th className="text-left p-2">Branding</th>
                        <th className="text-left p-2">Mileage</th>
                        <th className="text-left p-2">Cleaning</th>
                        <th className="text-left p-2">Depot/Bay</th>
                        <th className="text-left p-2">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((r) => {
                        const minDays = Math.min(
                          daysLeft(r.fitness.rollingStockValidTill),
                          daysLeft(r.fitness.signallingValidTill),
                          daysLeft(r.fitness.telecomValidTill)
                        );

                        const withinDemand = inductedIds.has(r.id);

                        return (
                          <tr
                            key={r.id}
                            className={
                              r.blocked
                                ? "bg-red-50 dark:bg-red-950/20"
                                : withinDemand
                                ? "bg-green-50 dark:bg-green-950/30"
                                : undefined
                            }
                          >
                            <td className="p-2 font-semibold">{r.rank}</td>
                            <td className="p-2">{r.id}</td>
                            <td className="p-2">{r.displayScore}</td>
                            <td className="p-2">
                              <div className="flex gap-1 flex-wrap">
                                <Badge
                                  variant={
                                    minDays > 2 ? "default" : "destructive"
                                  }
                                >
                                  {minDays}d
                                </Badge>
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge
                                variant={
                                  r.jobCardsOpen < 3 ? "default" : "destructive"
                                }
                              >
                                {r.jobCardsOpen} open
                              </Badge>
                            </td>
                            <td className="p-2">
                              {r.branding.campaign ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {r.branding.campaign}
                                  </Badge>
                                  <Badge
                                    variant={
                                      Math.max(
                                        0,
                                        r.branding.hoursCommitted -
                                          r.branding.hoursDelivered
                                      ) <= 8
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {Math.max(
                                      0,
                                      r.branding.hoursCommitted -
                                        r.branding.hoursDelivered
                                    )}
                                    h due
                                  </Badge>
                                </div>
                              ) : (
                                <Badge variant="secondary">No Campaign</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              {r.mileageKm.toLocaleString()} km
                            </td>
                            <td className="p-2">
                              {r.cleaningDue ? (
                                <Badge variant="destructive">Due</Badge>
                              ) : (
                                <Badge variant="secondary">OK</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              {r.stabledAt} / {r.bay}
                            </td>
                            <td className="p-2">
                              {r.blocked ? (
                                <Badge variant="destructive">
                                  Blocked (fitness)
                                </Badge>
                              ) : withinDemand ? (
                                <Badge className="bg-green-600 hover:bg-green-600">
                                  Induct
                                </Badge>
                              ) : (
                                <Badge variant="outline">Standby</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  *Decision is a function of fitness windows (hard constraint),
                  job-cards, branding exposure gap, mileage balancing, cleaning
                  slots & depot geometry.
                </div>
              </CardContent>
            </Card>

            {/* Right: Health, Alerts, Trends */}
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Constraint Health
                  </CardTitle>
                  <CardDescription>
                    Live checks before finalisation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Fitness Certificates</div>
                    <Badge variant="default">OK</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Job-Card Conflicts</div>
                    <Badge variant="default">Low</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Branding SLA Risk</div>
                    <Badge
                      variant={
                        campaignCompliance >= 80 ? "default" : "destructive"
                      }
                    >
                      {campaignCompliance}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Cleaning Bay Load</div>
                    <Badge
                      variant={
                        simulateCleaningSlots >= 5 ? "default" : "destructive"
                      }
                    >
                      {simulateCleaningSlots} slots
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Stabling Geometry</div>
                    <Badge variant="default">Optimised</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Alerts
                  </CardTitle>
                  <CardDescription>
                    Top issues needing attention.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>{a.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Availability & Punctuality
                  </CardTitle>
                  <CardDescription>Last 2 weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kpiData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <RTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="availability" />
                        <Line type="monotone" dataKey="punctuality" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Data Integrations & Admin */}
          <Card className="mt-6 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" /> Data Integrations
              </CardTitle>
              <CardDescription>
                Bring siloed data into a single source of truth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="streams" className="w-full">
                <TabsList>
                  <TabsTrigger value="streams">Live Streams</TabsTrigger>
                  <TabsTrigger value="imports">Manual Imports</TabsTrigger>
                  <TabsTrigger value="weights">Weights</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="streams" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" /> Maximo
                          Job-Cards
                        </CardTitle>
                        <CardDescription>Open vs Closed WOs</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          4 feeds configured
                        </div>
                        <Button size="sm" variant="outline" className="gap-2">
                          <RefreshCcw className="h-4 w-4" /> Sync
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" /> Branding Priorities
                        </CardTitle>
                        <CardDescription>
                          Advertiser SLA windows
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          2 active campaigns
                        </div>
                        <Button size="sm" variant="outline" className="gap-2">
                          <RefreshCcw className="h-4 w-4" /> Sync
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wrench className="h-4 w-4" /> Cleaning & Detailing
                        </CardTitle>
                        <CardDescription>
                          Bay occupancy & manpower
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Slots tonight: {simulateCleaningSlots}
                        </div>
                        <Button size="sm" variant="outline" className="gap-2">
                          <RefreshCcw className="h-4 w-4" /> Pull
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Upload className="h-4 w-4" /> IoT Fitness (UNS)
                        </CardTitle>
                        <CardDescription>
                          Rolling-Stock, Signalling, Telecom
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Latency &lt; 5 min
                        </div>
                        <Button size="sm" variant="outline" className="gap-2">
                          <RefreshCcw className="h-4 w-4" /> Refresh
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="imports" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Upload Maximo CSV
                        </CardTitle>
                        <CardDescription>
                          WO_ID, TRAIN_ID, STATUS, PRIORITY...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Input type="file" accept=".csv" />
                        <Button size="sm" className="w-full">
                          Upload
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Upload Fitness JSON
                        </CardTitle>
                        <CardDescription>
                          Rolling/Signalling/Telecom certificates
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Input type="file" accept=".json" />
                        <Button size="sm" className="w-full">
                          Upload
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Upload Branding XLSX
                        </CardTitle>
                        <CardDescription>
                          Campaign windows and targets
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Input type="file" accept=".xlsx" />
                        <Button size="sm" className="w-full">
                          Upload
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="weights" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(weights).map(([k, v]) => (
                      <Card key={k}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {k.toUpperCase()}
                          </CardTitle>
                          <CardDescription>
                            Weight: {Number(v).toFixed(2)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Slider
                            value={[v as number]}
                            min={0}
                            max={0.5}
                            step={0.01}
                            onValueChange={(val) =>
                              updateWeight(k as keyof Weights, val[0])
                            }
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="pt-4">
                  <Textarea
                    placeholder="Operator notes, overrides, exceptions..."
                    className="min-h-[120px]"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button variant="outline">Save Notes</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="mt-6 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="h-5 w-5" /> Train Map
              </CardTitle>
              {/* <CardDescription>
                Bring siloed data into a single source of truth.
              </CardDescription> */}
            </CardHeader>
            <CardContent className="min-h-[400px]">
              <MapBox />
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-xs text-muted-foreground mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span>Depot Layout: MAIN_DEPOT_A / MAIN_DEPOT_B / SATELLITE</span>
            </div>
            <div className="flex items-center gap-2">
              <span>v0.1</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
