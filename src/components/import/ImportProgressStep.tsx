import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertTriangle, Link2, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  jobId: string;
  onDone: (job: ImportJob) => void;
}

export interface ImportJob {
  id: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  gateway_synced_count: number;
  gateway_skipped_count: number;
  status: string;
  errors: any[];
  sync_gateway: boolean;
}

export function ImportProgressStep({ jobId, onDone }: Props) {
  const [job, setJob] = useState<ImportJob | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchJob = async () => {
      const { data } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (data && !cancelled) {
        setJob(data as any);
        if (data.status === "done" || data.status === "failed") {
          onDone(data as any);
          if (pollTimer) clearInterval(pollTimer);
        }
      }
    };

    fetchJob();

    const channel = supabase
      .channel(`import_job:${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "import_jobs", filter: `id=eq.${jobId}` },
        (payload) => {
          if (!cancelled) {
            const next = payload.new as any;
            setJob(next);
            if (next.status === "done" || next.status === "failed") onDone(next);
          }
        }
      )
      .subscribe();

    // Fallback polling (Fail-Open)
    pollTimer = setInterval(fetchJob, 1500);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [jobId, onDone]);

  const total = job?.total_rows ?? 0;
  const processed = job?.processed_rows ?? 0;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {job?.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            Processando Importação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {processed} de {total} linhas ({pct}%)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <Stat label="Total" value={total} />
            <Stat label="Sucesso" value={job?.success_count ?? 0} className="text-emerald-600" />
            <Stat label="Erros" value={job?.error_count ?? 0} className="text-destructive" icon={AlertTriangle} />
            {job?.sync_gateway && (
              <>
                <Stat label="Sincronizados" value={job?.gateway_synced_count ?? 0} className="text-primary" icon={Link2} />
                <Stat label="Já existiam" value={job?.gateway_skipped_count ?? 0} className="text-muted-foreground" icon={RefreshCcw} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
  icon: Icon,
}: {
  label: string;
  value: number;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="flex items-center justify-center gap-1">
        {Icon ? <Icon className={`h-3 w-3 ${className}`} /> : null}
        <p className={`text-xl font-semibold ${className}`}>{value}</p>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
