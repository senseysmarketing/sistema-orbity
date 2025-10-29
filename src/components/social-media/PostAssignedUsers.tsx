import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface PostAssignedUsersProps {
  users: User[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
}

export function PostAssignedUsers({ 
  users, 
  maxDisplay = 3, 
  size = 'sm',
  showNames = false 
}: PostAssignedUsersProps) {
  if (!users || users.length === 0) {
    return null;
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs';
      case 'md':
        return 'h-8 w-8 text-sm';
      case 'lg':
        return 'h-10 w-10 text-base';
      default:
        return 'h-6 w-6 text-xs';
    }
  };

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  // Se houver apenas um usuário e showNames for true
  if (users.length === 1 && showNames) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className={getSizeClasses()}>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getUserInitials(users[0].name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">{users[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center -space-x-2">
        {displayUsers.map((user) => (
          <Avatar 
            key={user.id} 
            className={`${getSizeClasses()} border-2 border-background`}
            title={user.name}
          >
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainingCount > 0 && (
          <div 
            className={`${getSizeClasses()} rounded-full bg-muted border-2 border-background flex items-center justify-center`}
            title={`+${remainingCount} usuário${remainingCount > 1 ? 's' : ''}`}
          >
            <span className="text-xs text-muted-foreground">+{remainingCount}</span>
          </div>
        )}
      </div>
      {showNames && users.length > 1 && (
        <span className="text-xs text-muted-foreground">
          {users.map(u => u.name.split(' ')[0]).join(', ')}
        </span>
      )}
    </div>
  );
}
