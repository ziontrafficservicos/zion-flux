import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { motion } from 'framer-motion';
import logoZionCircular from "@/assets/logo-zion-circular.jpg";
import logoZionBlue from "@/assets/logo-zion-blue.png";

const passwordSchema = z.object({
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

const CompleteSignup = () => {
  const [searchParams] = useSearchParams();
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check if there's an active session from the email link
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          logger.error('No valid session found:', error);
          toast({
            title: "Link inválido ou expirado",
            description: "Por favor, solicite um novo convite ao administrador.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        setUserEmail(session.user.email || '');
        setIsVerifying(false);
      } catch (error) {
        logger.error('Error verifying token:', error);
        toast({
          title: "Erro ao verificar convite",
          description: "Por favor, tente novamente.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    };

    verifyToken();
  }, [navigate, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setIsLoading(true);

    try {
      // Validate passwords
      const validated = passwordSchema.parse({ password, confirmPassword });
      
      // Update user password
      const { error } = await supabase.auth.updateUser({
        password: validated.password
      });
      
      if (error) {
        throw error;
      }

      // Verificar se o usuário tem workspace antes de redirecionar
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Usar RPC para obter workspaces do usuário
        const { data: workspaceIds } = await supabase
          .rpc('sieg_fin_get_user_workspaces', { _user_id: user.id });
        
        const workspaceData = workspaceIds && workspaceIds.length > 0 
          ? [{ workspace_id: workspaceIds[0].workspace_id, role: 'member' }]
          : null;
        
        if (workspaceData) {
          // Salvar workspace no localStorage para o WorkspaceContext
          localStorage.setItem('currentWorkspaceId', workspaceData[0].workspace_id);
          
          toast({
            title: "Cadastro concluído!",
            description: "Sua senha foi definida com sucesso. Redirecionando...",
          });
          
          // Pequeno delay para garantir que o toast apareça
          setTimeout(() => {
            navigate('/');
            window.location.reload(); // Força reload para carregar o workspace
          }, 500);
        } else {
          toast({
            title: "Cadastro concluído!",
            description: "Sua senha foi definida. Aguarde a atribuição do workspace.",
          });
          
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      } else {
        toast({
          title: "Cadastro concluído!",
          description: "Sua senha foi definida com sucesso.",
        });
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
      } else if (error instanceof Error) {
        logger.error('Error completing signup:', error);
        toast({
          title: "Erro ao definir senha",
          description: error.message || "Ocorreu um erro. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1] as any
      }
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background com logo azul expandida */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${logoZionBlue})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(1.1)'
          }}
        />
      </div>

      {/* Card principal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-heavy rounded-apple-2xl shadow-apple-xl overflow-hidden border border-white/10 relative">
          {/* Gradient top blur */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-500/20 via-blue-400/10 to-transparent opacity-40 blur-3xl -mt-20" />
          
          {/* Content */}
          <div className="relative p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-3 rounded-full shadow-apple-xl mb-6 animate-apple-fade-in">
                <img 
                  src={logoZionCircular} 
                  alt="Zion" 
                  className="w-20 h-20 object-contain rounded-full"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Complete seu Cadastro
              </h2>
              <p className="text-center text-muted-foreground mt-2">
                Defina sua senha para acessar o sistema
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input (readonly) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly
                  disabled
                  className="flex h-12 w-full rounded-apple-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-60"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="flex h-12 w-full rounded-apple-md border border-white/10 bg-white/5 px-4 py-2 pr-16 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-apple-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive animate-apple-slide-up">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="flex h-12 w-full rounded-apple-md border border-white/10 bg-white/5 px-4 py-2 pr-16 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-apple-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-destructive animate-apple-slide-up">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 text-white font-medium rounded-apple-md transition-apple-base shadow-apple-sm hover:shadow-apple-md active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Cadastro
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteSignup;
