import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingInvitesList } from './PendingInvitesList';
import { PermissionSelector } from '@/components/permissions/PermissionSelector';
import { PermissionKey, DEFAULT_PERMISSIONS_BY_ROLE } from '@/types/permissions';
import { useCurrentTenant } from '@/contexts/TenantContext';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMember: (email: string, role: string, tenantId: string) => Promise<void>;
  currentTenantId: string | null;
  currentTenantName?: string | null;
}

const addMemberSchema = z.object({
  tenant_id: z.string().uuid('Empresa inválida'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  role: z.enum(['owner', 'admin', 'member', 'viewer'], {
    errorMap: () => ({ message: 'Por favor, selecione uma função válida' })
  })
});

export function AddMemberModal({ open, onOpenChange, onAddMember, currentTenantId, currentTenantName }: AddMemberModalProps) {
  const { tenant } = useCurrentTenant();
  const effectiveTenantId = tenant?.id || currentTenantId || '';
  const effectiveTenantName = tenant?.name || currentTenantName || 'Empresa';
  const [tenantId, setTenantId] = useState<string>(effectiveTenantId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>(
    [...DEFAULT_PERMISSIONS_BY_ROLE.member] as PermissionKey[]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<any>(null);

  const handleClose = () => {
    setTenantId(effectiveTenantId);
    setEmail('');
    setRole('member');
    setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE.member] as PermissionKey[]);
    setError(null);
    setGeneratedLink(null);
    setInviteDetails(null);
    onOpenChange(false);
  };

  // Função para gerar token seguro
  const generateSecureToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateLink = async () => {
    setError(null);
    
    const targetTenantId = tenantId || effectiveTenantId;
    
    if (!targetTenantId) {
      setError('Nenhuma empresa selecionada');
      return;
    }

    if (!email) {
      setError('Digite um email');
      return;
    }

    try {
      // Verificar se está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Você precisa estar autenticado. Faça logout e login novamente.');
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const validation = addMemberSchema.parse({
        tenant_id: targetTenantId,
        email,
        role
      });

      setIsLoading(true);

      // Gerar token único
      const inviteToken = generateSecureToken();
      
      // Data de expiração (7 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Inserir convite diretamente no banco
      const { data: invite, error: insertError } = await supabase
        .from('sieg_fin_pending_invites')
        .insert({
          workspace_id: targetTenantId,
          email: validation.email.toLowerCase().trim(),
          role: validation.role,
          token: inviteToken,
          invited_by: session.user.id,
          expires_at: expiresAt.toISOString(),
          permissions: selectedPermissions.length > 0 ? JSON.stringify(selectedPermissions) : null,
          custom_data: JSON.stringify({
            tenant_id: targetTenantId,
            tenant_name: effectiveTenantName,
          })
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar convite:', insertError);
        throw new Error(insertError.message || 'Erro ao criar convite');
      }

      // Gerar URL de convite
      const appUrl = window.location.origin;
      const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

      setGeneratedLink(inviteUrl);
      setInviteDetails({
        email: validation.email,
        role: validation.role,
        expires_at: expiresAt.toISOString(),
        token: inviteToken
      });
      toast.success('Link de convite gerado!');
      
    } catch (err: any) {
      console.error('Erro ao gerar link:', err);
      const errorMessage = err.message || 'Erro ao gerar link de convite';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Link copiado!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto border-border/50 bg-gradient-to-b from-background to-background/95 p-0">
        {/* Header com gradiente */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border/30 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-white" />
              </div>
              Gerenciar Convites
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione novos membros ao workspace {effectiveTenantName}
            </p>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger 
                value="generate" 
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Gerar Convite
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
              >
                Convites Pendentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-6 space-y-6">
              {/* Card de Empresa */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Workspace Selecionado
                </Label>
                <p className="text-lg font-semibold text-foreground mt-1">{effectiveTenantName}</p>
              </div>

              {/* Grid responsivo para Email e Função */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email do Usuário
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11 bg-background/50 border-border/60 focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Função
                  </Label>
                  <Select 
                    value={role} 
                    onValueChange={(newRole) => {
                      setRole(newRole);
                      if (DEFAULT_PERMISSIONS_BY_ROLE[newRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]) {
                        setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE[newRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE]] as PermissionKey[]);
                      }
                    }} 
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11 bg-background/50 border-border/60">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">Owner</span>
                          <span className="text-xs text-muted-foreground">Controle total do workspace</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">Admin</span>
                          <span className="text-xs text-muted-foreground">Gerenciar usuários e configurações</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="member" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">Member</span>
                          <span className="text-xs text-muted-foreground">Acesso básico às funcionalidades</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">Viewer</span>
                          <span className="text-xs text-muted-foreground">Apenas visualização de dados</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seletor de Permissões com scroll */}
              <div className="space-y-3">
                <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/40 bg-background/30 p-4">
                  <PermissionSelector
                    selectedPermissions={selectedPermissions}
                    onPermissionsChange={setSelectedPermissions}
                    userRole={role}
                  />
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-destructive text-lg">!</span>
                  </div>
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Link gerado */}
              {generatedLink && inviteDetails && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <LinkIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">Link de Convite Gerado!</p>
                      <p className="text-xs text-muted-foreground">Compartilhe com o usuário</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      value={generatedLink} 
                      readOnly 
                      className="font-mono text-xs bg-background/80"
                    />
                    <Button variant="outline" size="icon" onClick={copyLink} className="flex-shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2 rounded-lg bg-background/50">
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium truncate">{inviteDetails.email}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <p className="text-muted-foreground">Função</p>
                      <p className="font-medium capitalize">{inviteDetails.role}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-background/50">
                      <p className="text-muted-foreground">Expira em</p>
                      <p className="font-medium">{new Date(inviteDetails.expires_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de ação - Simplificado */}
              <div className="flex gap-3 pt-4 border-t border-border/30">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGenerateLink} 
                  disabled={isLoading || !email}
                  className="flex-[2] bg-gradient-to-r from-primary to-secondary hover:opacity-90 gap-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  {isLoading ? 'Gerando...' : 'Gerar Convite'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <div className="rounded-xl border border-border/40 bg-background/30 p-4">
                <PendingInvitesList 
                  tenantId={tenantId || effectiveTenantId} 
                  onUpdate={() => {}}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
