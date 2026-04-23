import { ReactNode } from "react";
import { Flag, MoreHorizontal, RotateCw, Pencil, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AssignedUser {
  user_id: string;
  name: string;
  role: string;
  id: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high" | string;
  client_id: string | null;
  due_date: string | null;
  task_type?: string | null;
  is_recurring?: boolean;
  is_internal?: boolean;
  [key: string]: any;
}

interface StatusItem {
  slug: string;
  name: string;
  color: string;
}

interface TaskListViewProps {
  tasks: Task[];
  statuses: StatusItem[];
  getAssignedUsers: (taskId: string) => AssignedUser[];
  getClientName: (clientId: string | null, task?: Task) => string;
  getTypeIcon: (slug: string | null | undefined) => string | ReactNode;
  getTypeShortName: (slug: string | null | undefined) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  formatDateBR: (value: string | null) => string;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
}

const priorityRank: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function getFirstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] ?? "";
}

export function TaskListView({
  tasks,
  statuses,
  getAssignedUsers,
  getClientName,
  getTypeIcon,
  getTypeShortName,
  getPriorityColor,
  getPriorityLabel,
  formatDateBR,
  onViewDetails,
  onEdit,
  onDelete,
  onToggleComplete,
}: TaskListViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = statuses
    .map((status) => {
      const groupTasks = tasks.filter((t) => t.status === status.slug);
      const sorted = [...groupTasks].sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        if (da !== db) return da - db;
        return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
      });
      return { status, tasks: sorted };
    })
    .filter((g) => g.tasks.length > 0);

  const defaultOpen = groups
    .filter((g) => g.status.slug !== "done")
    .map((g) => g.status.slug);

  if (groups.length === 0) {
    return (
      <div className="rounded-md border bg-card p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        {groups.map(({ status, tasks: groupTasks }) => (
          <AccordionItem
            key={status.slug}
            value={status.slug}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger
              className="hover:no-underline px-3 py-2 bg-muted/30 hover:bg-muted/50 border-l-4 rounded-none"
              style={{ borderLeftColor: status.color }}
            >
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                {status.name}
                <span className="text-muted-foreground normal-case tracking-normal">
                  ({groupTasks.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="w-full">
                <Table className="table-fixed w-full">
                  <colgroup>
                    <col style={{ width: "40px" }} />
                    <col style={{ width: "32px" }} />
                    <col />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "40px" }} />
                  </colgroup>
                  <TableBody>
                    {groupTasks.map((task) => {
                      const isDone = task.status === "done";
                      const assigned = getAssignedUsers(task.id);
                      const overdue =
                        !!task.due_date &&
                        !isDone &&
                        new Date(task.due_date) < today;
                      return (
                        <TableRow
                          key={task.id}
                          className="h-10 border-b border-border/40 hover:bg-muted/40 cursor-pointer"
                          onClick={() => onViewDetails(task)}
                        >
                          {/* Checkbox */}
                          <TableCell
                            className="w-[32px] py-1.5 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={() => onToggleComplete(task)}
                              aria-label="Marcar como concluída"
                            />
                          </TableCell>

                          {/* Tipo */}
                          <TableCell className="w-[28px] py-1.5 whitespace-nowrap text-base">
                            <span title={getTypeShortName(task.task_type)}>
                              {getTypeIcon(task.task_type)}
                            </span>
                          </TableCell>

                          {/* Título */}
                          <TableCell className="py-1.5 max-w-0">
                            <div className="flex items-center gap-1 min-w-0 w-full">
                              <span
                                className={cn(
                                  "text-sm font-normal block truncate min-w-0 flex-1",
                                  isDone && "opacity-60 line-through",
                                )}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                              {task.is_recurring && (
                                <RotateCw className="h-3 w-3 shrink-0 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>

                          {/* Cliente */}
                          <TableCell className="w-[160px] py-1.5 whitespace-nowrap">
                            {task.client_id || task.is_internal ? (
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal max-w-[150px] truncate inline-block"
                                title={getClientName(task.client_id, task)}
                              >
                                <span className="truncate block">
                                  {getClientName(task.client_id, task)}
                                </span>
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Responsáveis */}
                          <TableCell className="py-1.5 whitespace-nowrap">
                            {assigned.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : assigned.length === 1 ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(assigned[0].name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{getFirstName(assigned[0].name)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                {assigned.slice(0, 3).map((u, i) => (
                                  <Avatar
                                    key={u.user_id}
                                    className={cn(
                                      "h-6 w-6 border-2 border-card",
                                      i > 0 && "-ml-2",
                                    )}
                                    title={u.name}
                                  >
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(u.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {assigned.length > 3 && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    +{assigned.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          {/* Prioridade */}
                          <TableCell className="w-[80px] py-1.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
                              <span className="hidden sm:inline text-xs">
                                {getPriorityLabel(task.priority)}
                              </span>
                            </span>
                          </TableCell>

                          {/* Entrega */}
                          <TableCell
                            className={cn(
                              "w-[110px] py-1.5 whitespace-nowrap text-xs",
                              overdue && "text-destructive font-medium",
                            )}
                          >
                            {task.due_date ? formatDateBR(task.due_date) : "—"}
                          </TableCell>

                          {/* Ações */}
                          <TableCell
                            className="w-[32px] py-1.5 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted"
                                  aria-label="Ações"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(task)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDelete(task.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
