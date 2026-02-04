import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRoleLabel, type AppRole } from "@/lib/auth";

interface UserRoleBadgeProps {
  role: AppRole;
  className?: string;
}

const roleStyles: Record<AppRole, string> = {
  ti: "border-primary/30 bg-primary/10 text-primary",
  guarita: "border-warning/30 bg-warning/10 text-warning",
  colaborador: "border-info/30 bg-info/10 text-info",
};

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", roleStyles[role], className)}
    >
      {getRoleLabel(role)}
    </Badge>
  );
}
