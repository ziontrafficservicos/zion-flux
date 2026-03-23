import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { validarSenha } from '@/utils/seguranca';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

type InviteCustomData = {
  tenant_id?: string;
  tenant_name?: string | null;
  tenant_slug?: string | null;
  requester_role?: string | null;
  requester_active?: boolean | null;
  is_existing_member?: boolean | null;
  [key: string]: unknown;
};

type InviteData = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at?: string | null;
  accepted_at?: string | null;
  workspace_id?: string;
  permissions?: string | null;
  custom_data?: InviteCustomData | string | null;
  workspaces?: { name?: string | null } | null;
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const parsedCustomData = useMemo<InviteCustomData>(() => {
    if (!inviteData?.custom_data) return {};
    if (typeof inviteData.custom_data === 'object') {
      return inviteData.custom_data as InviteCustomData;
    }

    try {
      return JSON.parse(inviteData.custom_data) as InviteCustomData;
    } catch (error) {
      console.warn('[AcceptInvite] Não foi possível parsear custom_data:', error);
      return {};
    }
  }, [inviteData]);

  const tenantName = parsedCustomData.tenant_name ?? inviteData?.workspaces?.name ?? 'empresa';

  useEffect(() => {
    console.log('🔍 AcceptInvite: Token from URL:', token);
    
    if (!token) {
      console.error('❌ AcceptInvite: No token provided');
      toast.error('Link de convite inválido');
      navigate('/auth');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      console.log('🔍 AcceptInvite: Verifying token in database...');
      
      const { data, error } = await supabase
        .from('sieg_fin_pending_invites')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      console.log('📊 AcceptInvite: Query result:', { data, error });

      if (error) {
        console.error('❌ AcceptInvite: Database error', error);
        
        // Verificar se é erro de RLS ou outro problema
        if (error.code === 'PGRST116') {
          toast.error('Convite inválido ou expirado');
        } else {
          toast.error('Erro ao verificar convite. Verifique as permissões RLS.');
        }
        navigate('/auth');
        return;
      }

      if (!data) {
        console.error('❌ AcceptInvite: No invite data found');
        toast.error('Convite inválido ou expirado');
        navigate('/auth');
        return;
      }

      console.log('✅ AcceptInvite: Invite verified successfully');
      setInviteData(data as InviteData);
    } catch (error) {
      console.error('❌ AcceptInvite: Error verifying token:', error);
      toast.error('Erro ao verificar convite');
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fullName.trim().length < 2) {
      toast.error('O nome deve ter no mínimo 2 caracteres');
      return;
    }

    // Validar força da senha
    const validacaoSenha = validarSenha(password);
    if (!validacaoSenha.valida) {
      toast.error(validacaoSenha.erros[0] || 'Senha não atende aos requisitos de segurança');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsProcessing(true);

    try {
      let userId: string | undefined;
      
      // Tentar criar conta
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData!.email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            invited_via_token: token
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          console.log('[AcceptInvite] Email já cadastrado, tentando fazer login...');
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteData!.email,
            password
          });

          if (signInError) {
            console.error('[AcceptInvite] Erro ao fazer login:', signInError);
            setIsProcessing(false);
            toast.error(
              'Este email já está cadastrado. Por favor, use a senha da sua conta existente.',
              { duration: 5000 }
            );
            return;
          }

          console.log('[AcceptInvite] Login realizado com sucesso');
          userId = signInData.user?.id;
        } else {
          throw signUpError;
        }
      } else {
        userId = authData.user?.id;
      }

      if (!userId) {
        throw new Error('Erro ao criar/autenticar usuário');
      }

      // Aguardar sessão
      await new Promise(resolve => setTimeout(resolve, 500));

      // Atualizar nome no user_metadata (caso seja usuário existente que fez login)
      console.log('[AcceptInvite] Atualizando nome no user_metadata:', { userId, fullName: fullName.trim() });
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });

      // Parsear custom_data para obter tenant_id
      let workspaceId = inviteData!.workspace_id;
      if (!workspaceId && inviteData!.custom_data) {
        try {
          const customData = typeof inviteData!.custom_data === 'string' 
            ? JSON.parse(inviteData!.custom_data) 
            : inviteData!.custom_data;
          workspaceId = customData.tenant_id;
        } catch (e) {
          console.warn('Erro ao parsear custom_data:', e);
        }
      }

      // Parsear permissões
      let permissions: string[] = [];
      if (inviteData!.permissions) {
        try {
          permissions = typeof inviteData!.permissions === 'string'
            ? JSON.parse(inviteData!.permissions)
            : inviteData!.permissions;
        } catch (e) {
          console.warn('Erro ao parsear permissions:', e);
        }
      }

      console.log('[AcceptInvite] Adicionando usuário ao workspace:', { userId, workspaceId, role: inviteData!.role });

      // Adicionar usuário ao workspace diretamente (usando any para contornar tipagem)
      const { error: memberError } = await (supabase as any)
        .from('sieg_fin_tenant_users')
        .insert({
          tenant_id: workspaceId,
          user_id: userId,
          role: inviteData!.role,
          active: true,
          custom_permissions: permissions.length > 0 ? permissions : null
        });

      if (memberError) {
        // Se já é membro, apenas atualizar
        if (memberError.code === '23505') {
          console.log('[AcceptInvite] Usuário já é membro, atualizando...');
          await (supabase as any)
            .from('sieg_fin_tenant_users')
            .update({ 
              role: inviteData!.role, 
              active: true,
              custom_permissions: permissions.length > 0 ? permissions : null
            })
            .eq('tenant_id', workspaceId)
            .eq('user_id', userId);
        } else {
          console.error('[AcceptInvite] Erro ao adicionar membro:', memberError);
          throw new Error('Erro ao adicionar ao workspace');
        }
      }

      // Marcar convite como aceito
      await (supabase as any)
        .from('sieg_fin_pending_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token);

      console.log('[AcceptInvite] Convite aceito com sucesso!');

      toast.success(`Bem-vindo à empresa ${tenantName}!`);
      
      // Forçar reload completo para recarregar todos os contextos
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error);
      toast.error(error.message || 'Erro ao processar convite');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 border-border/50">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Aceitar Convite</h1>
          <p className="text-muted-foreground">
            Você foi convidado para a empresa <strong className="text-foreground">{tenantName}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Email: {inviteData.email}
          </p>
          <p className="text-sm text-muted-foreground">
            Função: {inviteData.role}
          </p>
        </div>

        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            ℹ️ <strong>Importante:</strong> Se este email já estiver cadastrado no sistema, use a senha da sua conta existente para aceitar o convite.
          </p>
        </div>

        <form onSubmit={handleAcceptInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite seu nome completo"
              required
              minLength={2}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Defina sua senha (ou use a senha existente)</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres com maiúscula, número e especial"
                required
                minLength={8}
                disabled={isProcessing}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isProcessing}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirme sua senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                minLength={8}
                disabled={isProcessing}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isProcessing}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Aceitar Convite e Criar Conta'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
