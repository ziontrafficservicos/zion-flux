import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionSelector } from './PermissionSelector';
import { PermissionKey, DEFAULT_PERMISSIONS_BY_ROLE } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Shield } from 'lucide-react';

interface EditPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  workspaceId: string;
  onPermissionsUpdated: () => void;
}

export function EditPermissionsModal({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  userRole,
  workspaceId,
  onPermissionsUpdated
}: EditPermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar permissões atuais do usuário
  const fetchUserPermissions = async () => {
    if (!open || !userId || !workspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('sieg_fin_get_user_permissions', {
        p_workspace_id: workspaceId,
        p_user_id: userId
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        const permissions = data.permissions || [];
        
        // Se não há permissões customizadas, usar padrões do role
        if (permissions.length === 0 && DEFAULT_PERMISSIONS_BY_ROLE[userRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]) {
          setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE[userRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]] as PermissionKey[]);
        } else {
          setSelectedPermissions(permissions);
        }
      } else {
        throw new Error(data?.error || 'Erro ao buscar permissões');
      }
    } catch (err: any) {
      console.error('Erro ao buscar permissões:', err);
      setError(err.message || 'Erro ao carregar permissões do usuário');
      
      // Fallback para permissões padrão do role
      if (DEFAULT_PERMISSIONS_BY_ROLE[userRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]) {
        setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE[userRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]] as PermissionKey[]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar permissões atualizadas
  const handleSavePermissions = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('sieg_fin_save_user_permissions', {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_permissions: selectedPermissions
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        toast.success('Permissões atualizadas com sucesso!');
        onPermissionsUpdated();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Erro ao salvar permissões');
      }
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err);
      const errorMessage = err.message || 'Erro ao atualizar permissões';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar permissões quando o modal abre
  useEffect(() => {
    fetchUserPermissions();
  }, [open, userId, workspaceId]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            Editar Permissões do Usuário
          </DialogTitle>
        </DialogHeader>

        {/* Informações do usuário */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{userName}</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
          <Badge variant="outline" className="capitalize">
            {userRole}
          </Badge>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando permissões...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Selecione as permissões específicas que este usuário deve ter. 
              As permissões selecionadas substituirão as permissões padrão do role.
            </div>
            
            <PermissionSelector
              selectedPermissions={selectedPermissions}
              onPermissionsChange={setSelectedPermissions}
              userRole={userRole}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSavePermissions} 
            disabled={isLoading || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Permissões'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
