import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useGroups, useGroupUnreadCounts, type Group } from '@/hooks/useGroups';
import { GroupChat } from '@/components/groups/GroupChat';

export default function ColaboradorGruposPage() {
  const { groups, isLoading } = useGroups();
  const { data: unread = {} } = useGroupUnreadCounts(groups.map(g => g.id));
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  if (selectedGroup) {
    return (
      <DashboardLayout>
        <GroupChat group={selectedGroup} onBack={() => setSelectedGroup(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Meus Grupos</h2>
          <p className="text-muted-foreground">Comunicação em tempo real com sua equipe</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <Card className="py-16 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Você ainda não faz parte de nenhum grupo</p>
            <p className="text-xs text-muted-foreground mt-1">Solicite acesso ao setor de TI</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => {
              const count = unread[group.id] || 0;
              return (
                <Card key={group.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                  onClick={() => setSelectedGroup(group)}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        {count > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        {group.description && <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
