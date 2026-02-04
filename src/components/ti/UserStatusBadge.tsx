import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function UserStatusBadge({ isActive, className }: UserStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        isActive
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className
      )}
    >
      {isActive ? "Ativo" : "Inativo"}
    </Badge>
  );
}
