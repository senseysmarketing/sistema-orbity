import { useMemo } from "react";
import { RefreshCw, Clock, AlertTriangle, Wallet, CreditCard, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { ClientData, ClientResponsibleOption } from "./ClientCard";

interface ClientMiniCardProps {
  client: ClientData;
  agencyMembers: ClientResponsibleOption[];
  onSelect: (client: ClientData) => void;
  onRefreshBalance: (accountId: string) => void;
  onOpenOptimization: (client: ClientData) => void;
  isRefreshing?: boolean;
}

export function ClientMiniCard({
  client,
  agencyMembers,
  onSelect,
  onRefreshBalance,
  onOpenOptimization,
  isRefreshing,
}: ClientMiniCardProps) {
  const isPrepaid = client.is_prepaid === true;

  const balanceStatus = useMemo(() => {
    if (isPrepaid) {
      if (client.min_threshold <= 0) return "healthy";
      if (client.balance < client.min_threshold) return "critical";
      if (client.balance < client.min_threshold * 3) return "warning";
      return "healthy";
    }
    const spendCap = client.spend_cap || 0;
    const amountSpent = client.amount_spent || 0;
    if (spendCap <= 0) return "healthy";
    const percentUsed = (amountSpent / spendCap) * 100;
    if (percentUsed >= 90) return "critical";
    if (percentUsed >= 70) return "warning";
    return "healthy";
  }, [client, isPrepaid]);

  const daysSinceOptimization = useMemo(() => {
    if (!client.last_campaign_update) return null;
    return differenceInDays(new Date(), new Date(client.last_campaign_update));
  }, [client.last_campaign_update]);

  const needsOptimization = daysSinceOptimization !== null && daysSinceOptimization > 7;

  const responsibleLabel = useMemo(() => {
    if (!client.responsible_user_id) return null;
    return agencyMembers.find((m) => m.user_id === client.responsible_user_id)?.name || null;
  }, [agencyMembers, client.responsible_user_id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: client.currency === "USD" ? "USD" : "BRL",
    }).format(value);

  const getResultsBadge = (results: string | null) => {
    const base = "text-[10px] px-1.5 py-0 font-medium";
    switch (results) {
      case "excellent":
        return <Badge className={cn(base, "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300")}>Excelentes</Badge>;
      case "good":
        return <Badge className={cn(base, "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300")}>Bons</Badge>;
      case "average":
        return <Badge className={cn(base, "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300")}>Médios</Badge>;
      case "bad":
        return <Badge className={cn(base, "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>Ruins</Badge>;
      case "terrible":
        return <Badge className={cn(base, "bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-100")}>Péssimos</Badge>;
      default:
        return <Badge variant="outline" className={cn(base)}>N/D</Badge>;
    }
  };

  const borderColor =
    balanceStatus === "critical"
      ? "border-t-red-500"
      : balanceStatus === "warning"
      ? "border-t-yellow-500"
      : "border-t-green-500";

  const mainValue = isPrepaid ? client.balance : (client.current_month_spend || 0);
  const mainValueColor = isPrepaid
    ? balanceStatus === "critical"
      ? "text-red-600 dark:text-red-400"
      : balanceStatus === "warning"
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-green-600 dark:text-green-400"
    : "text-foreground";

  return (
    <div
      className={cn(
        "group relative flex flex-col border border-t-[3px] rounded-lg bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/20",
        borderColor
      )}
      onClick={() => onSelect(client)}
    >
      {/* Top row: name + refresh */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate text-card-foreground">
            {client.ad_account_name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
              {isPrepaid ? (
                <><Wallet className="h-2.5 w-2.5" />Pré</>
              ) : (
                <><CreditCard className="h-2.5 w-2.5" />Pós</>
              )}
            </Badge>
            {getResultsBadge(client.results)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRefreshBalance(client.ad_account_id);
          }}
          disabled={isRefreshing}
          title="Atualizar dados"
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Main value */}
      <div className="px-3 py-2">
        <p className={cn("text-xl font-bold tracking-tight", mainValueColor)}>
          {formatCurrency(mainValue)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isPrepaid ? "Saldo disponível" : "Gasto do mês"}
        </p>
      </div>

      {/* Footer: manager + optimization */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5 mt-auto">
        <p className="text-[11px] text-muted-foreground truncate">
          {responsibleLabel ? (
            <span className="text-card-foreground">{responsibleLabel}</span>
          ) : (
            <span className="italic">Sem gestor</span>
          )}
        </p>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Optimization indicator */}
          <div className="flex items-center gap-0.5">
            {needsOptimization ? (
              <AlertTriangle className="h-3 w-3 text-orange-500" />
            ) : (
              <Clock className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-[10px]",
                needsOptimization ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground"
              )}
            >
              {daysSinceOptimization !== null ? `${daysSinceOptimization}d` : "N/A"}
            </span>
          </div>

          {/* Optimization sheet button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOptimization(client);
            }}
            title="Diário de Otimizações"
          >
            <Activity className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
