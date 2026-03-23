import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  tenant_id?: string;
}

interface PendingInvitesListProps {
  tenantId: string;
  onUpdate: () => void;
}

export function PendingInvitesList({ tenantId, onUpdate }: PendingInvitesListProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, [tenantId]);

  const fetchInvites = async () => {
    try {
      if (!tenantId) {
        setInvites([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('sieg_fin_pending_invites')
        .select('*')
        .eq('workspace_id', tenantId)
        .is('used_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `https://app.ziontraffic.com.br/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const revokeInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sieg_fin_pending_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Convite revogado');
      fetchInvites();
      onUpdate();
    } catch (error) {
      console.error('Erro ao revogar convite:', error);
      toast.error('Erro ao revogar convite');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando convites...</div>;
  }

  if (invites.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum convite pendente</div>;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Convites Pendentes</h4>
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
        >
          <div className="flex-1">
            <p className="font-medium text-sm text-foreground">{invite.email}</p>
            <p className="text-xs text-muted-foreground">
              Role: {invite.role} • Criado{' '}
              {formatDistanceToNow(new Date(invite.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
            {isExpired(invite.expires_at) && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                Expirado
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyInviteLink(invite.token)}
              disabled={isExpired(invite.expires_at)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeInvite(invite.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
