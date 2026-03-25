import { useMemo } from "react";
import { RefreshCw, Activity, ChevronRight, Clock, AlertTriangle, Wallet, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { ClientData, ClientResponsibleOption } from "./ClientCard";

interface ClientListRowProps {
  client: ClientData;
  agencyMembers: ClientResponsibleOption[];
  onSelect: (client: ClientData) => void;
  onRefreshBalance: (accountId: string) => void;
  onOpenOptimization: (client: ClientData) => void;
  isRefreshing?: boolean;
}

export function ClientListRow({
  client,
  agencyMembers,
  onSelect,
  onRefreshBalance,
  onOpenOptimization,
  isRefreshing,
}: ClientListRowProps) {
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
    switch (results) {
      case "excellent":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px] px-1.5 py-0">Excelentes</Badge>;
      case "good":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px] px-1.5 py-0">Bons</Badge>;
      case "average":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px] px-1.5 py-0">Médios</Badge>;
      case "bad":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px] px-1.5 py-0">Ruins</Badge>;
      case "terrible":
        return <Badge className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 text-[10px] px-1.5 py-0">Péssimos</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">N/D</Badge>;
    }
  };

  const borderColor =
    balanceStatus === "critical"
      ? "border-l-red-500"
      : balanceStatus === "warning"
      ? "border-l-yellow-500"
      : "border-l-green-500";

  const mainValue = isPrepaid ? client.balance : (client.current_month_spend || 0);
  const mainValueColor = isPrepaid
    ? balanceStatus === "critical"
      ? "text-destructive"
      : balanceStatus === "warning"
      ? "text-yellow-600"
      : "text-green-600"
    : "text-orange-600";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 border border-l-4 rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
        borderColor
      )}
      onClick={() => onSelect(client)}
    >
      {/* Status dot */}
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full flex-shrink-0",
          balanceStatus === "critical" && "bg-red-500",
          balanceStatus === "warning" && "bg-yellow-500",
          balanceStatus === "healthy" && "bg-green-500"
        )}
      />

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{client.ad_account_name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
            {isPrepaid ? (
              <><Wallet className="h-3 w-3 mr-0.5" />Pré</>
            ) : (
              <><CreditCard className="h-3 w-3 mr-0.5" />Pós</>
            )}
          </Badge>
        </div>
      </div>

      {/* Main value */}
      <div className="hidden sm:block text-right min-w-[110px]">
        <span className={cn("font-bold text-sm", mainValueColor)}>
          {formatCurrency(mainValue)}
        </span>
        <p className="text-[10px] text-muted-foreground">
          {isPrepaid ? "Saldo" : "Gasto mês"}
        </p>
      </div>

      {/* Results badge */}
      <div className="hidden md:flex items-center min-w-[80px] justify-center">
        {getResultsBadge(client.results)}
      </div>

      {/* Manager */}
      <div className="hidden lg:block text-xs text-muted-foreground min-w-[100px] truncate">
        {responsibleLabel ? (
          <span className="text-foreground">{responsibleLabel}</span>
        ) : (
          <span className="italic">Sem gestor</span>
        )}
      </div>

      {/* Optimization days */}
      <div className="hidden lg:flex items-center gap-1 min-w-[70px]">
        {needsOptimization ? (
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span
          className={cn(
            "text-xs",
            needsOptimization ? "text-orange-600 font-medium" : "text-muted-foreground"
          )}
        >
          {daysSinceOptimization !== null ? `${daysSinceOptimization}d` : "N/A"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onRefreshBalance(client.ad_account_id);
          }}
          disabled={isRefreshing}
          title="Atualizar dados"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onOpenOptimization(client);
          }}
          title="Diário de Otimizações"
        >
          <Activity className="h-3.5 w-3.5" />
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
