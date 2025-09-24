import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface User {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface TaskAssignedUsersProps {
  users: User[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
}

export function TaskAssignedUsers({ 
  users, 
  maxDisplay = 3, 
  size = 'md',
  showNames = false 
}: TaskAssignedUsersProps) {
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs';
      case 'lg':
        return 'h-10 w-10 text-sm';
      default:
        return 'h-8 w-8 text-xs';
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm">Não atribuída</span>
      </div>
    );
  }

  const visibleUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  if (showNames && users.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className={getSizeClasses()}>
          <AvatarFallback>{getUserInitials(users[0].name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{users[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {visibleUsers.map((user) => (
          <Avatar 
            key={user.user_id} 
            className={`${getSizeClasses()} border-2 border-background`}
            title={user.name}
          >
            <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
          </Avatar>
        ))}
        
        {remainingCount > 0 && (
          <div 
            className={`${getSizeClasses()} rounded-full bg-muted border-2 border-background flex items-center justify-center`}
            title={`+${remainingCount} usuários`}
          >
            <span className="text-xs font-medium">+{remainingCount}</span>
          </div>
        )}
      </div>

      {showNames && users.length > 1 && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{users.length} usuários</span>
          <span className="text-xs text-muted-foreground">
            {users.slice(0, 2).map(u => u.name.split(' ')[0]).join(', ')}
            {users.length > 2 && ` e mais ${users.length - 2}`}
          </span>
        </div>
      )}
    </div>
  );
}