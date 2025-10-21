import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, Calendar, MessageSquare, UserPlus, 
  FileText, Clock 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  type: "task" | "meeting" | "post" | "lead" | "contract";
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "task":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case "post":
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case "lead":
        return <UserPlus className="h-4 w-4 text-orange-600" />;
      case "contract":
        return <FileText className="h-4 w-4 text-indigo-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: Activity["type"]) => {
    const labels = {
      task: "Tarefa",
      meeting: "Reunião",
      post: "Post",
      lead: "Lead",
      contract: "Contrato",
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade recente
            </p>
          ) : (
            activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="mt-1">{getIcon(activity.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(activity.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    {activity.user && <span>• {activity.user}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}