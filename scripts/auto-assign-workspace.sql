-- Função para auto-assign de novos usuários ao workspace SIEG
-- SECURITY DEFINER = roda com permissão do dono da função (bypassa RLS)
-- Isso permite que um usuário recém-criado se auto-associe ao workspace

CREATE OR REPLACE FUNCTION public.sieg_fin_auto_assign_user(
  _user_id UUID,
  _tenant_id UUID DEFAULT 'a0000000-0000-0000-0000-000000000001'::UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário já está associado a este tenant
  IF EXISTS (
    SELECT 1 FROM public.sieg_fin_tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) THEN
    -- Já existe, reativar se estiver inativo
    UPDATE public.sieg_fin_tenant_users
    SET active = true
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND active = false;
    RETURN TRUE;
  END IF;

  -- Inserir novo membro
  INSERT INTO public.sieg_fin_tenant_users (tenant_id, user_id, role, active)
  VALUES (_tenant_id, _user_id, 'member', true);

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Auto-assign falhou para user %: %', _user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Permitir que qualquer usuário autenticado chame esta função
GRANT EXECUTE ON FUNCTION public.sieg_fin_auto_assign_user TO authenticated;
