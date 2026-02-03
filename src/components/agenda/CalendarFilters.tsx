import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, 
  Users, 
  Building, 
  PhoneCall, 
  GraduationCap, 
  PresentationIcon,
  User
} from "lucide-react";

export type MeetingTypeFilter = "commercial" | "client" | "internal" | "quick_call" | "workshop" | "results";
export type MeetingStatusFilter = "scheduled" | "completed" | "cancelled" | "no_show";

export interface AgencyUser {
  id: string;
  name: string;
}

interface CalendarFiltersProps {
  users: AgencyUser[];
  userFilters: string[];
  onUserFilterChange: (userIds: string[]) => void;
  typeFilters: MeetingTypeFilter[];
  statusFilters: MeetingStatusFilter[];
  onTypeFilterChange: (types: MeetingTypeFilter[]) => void;
  onStatusFilterChange: (statuses: MeetingStatusFilter[]) => void;
}

const meetingTypes: { value: MeetingTypeFilter; label: string; color: string; icon: any }[] = [
  { value: "commercial", label: "Comercial", color: "bg-green-500", icon: Briefcase },
  { value: "client", label: "Cliente", color: "bg-blue-500", icon: Users },
  { value: "internal", label: "Interna", color: "bg-purple-500", icon: Building },
  { value: "quick_call", label: "Call Rápida", color: "bg-orange-500", icon: PhoneCall },
  { value: "workshop", label: "Workshop", color: "bg-pink-500", icon: GraduationCap },
  { value: "results", label: "Resultados", color: "bg-cyan-500", icon: PresentationIcon },
];

const meetingStatuses: { value: MeetingStatusFilter; label: string }[] = [
  { value: "scheduled", label: "Agendada" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "Não Compareceu" },
];

export const CalendarFilters = ({
  users,
  userFilters,
  onUserFilterChange,
  typeFilters,
  statusFilters,
  onTypeFilterChange,
  onStatusFilterChange,
}: CalendarFiltersProps) => {
  const toggleUserFilter = (userId: string) => {
    if (userFilters.includes(userId)) {
      onUserFilterChange(userFilters.filter((id) => id !== userId));
    } else {
      onUserFilterChange([...userFilters, userId]);
    }
  };
  const toggleTypeFilter = (type: MeetingTypeFilter) => {
    if (typeFilters.includes(type)) {
      onTypeFilterChange(typeFilters.filter((t) => t !== type));
    } else {
      onTypeFilterChange([...typeFilters, type]);
    }
  };

  const toggleStatusFilter = (status: MeetingStatusFilter) => {
    if (statusFilters.includes(status)) {
      onStatusFilterChange(statusFilters.filter((s) => s !== status));
    } else {
      onStatusFilterChange([...statusFilters, status]);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro de Usuário - PRIMEIRO */}
        {users.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Responsável</p>
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={userFilters.includes(user.id)}
                  onCheckedChange={() => toggleUserFilter(user.id)}
                />
                <User className="h-3 w-3 text-muted-foreground" />
                <Label 
                  htmlFor={`user-${user.id}`} 
                  className="text-sm cursor-pointer"
                >
                  {user.name}
                </Label>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Tipo</p>
          {meetingTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={typeFilters.includes(type.value)}
                  onCheckedChange={() => toggleTypeFilter(type.value)}
                />
                <div className={`w-2 h-2 rounded-full ${type.color}`} />
                <Label 
                  htmlFor={`type-${type.value}`} 
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {type.label}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
          {meetingStatuses.map((status) => (
            <div key={status.value} className="flex items-center gap-2">
              <Checkbox
                id={`status-${status.value}`}
                checked={statusFilters.includes(status.value)}
                onCheckedChange={() => toggleStatusFilter(status.value)}
              />
              <Label 
                htmlFor={`status-${status.value}`} 
                className="text-sm cursor-pointer"
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
