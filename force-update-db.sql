-- Atualizar configuração do SIEG para usar o banco Zion App
UPDATE database_configs
SET 
  url = 'https://wrebkgazdlyjenbpexnc.supabase.co',
  anon_key = '' -- Use variável de ambiente
WHERE database_key = 'sieg';

-- Verificar resultado
SELECT name, database_key, url 
FROM database_configs 
WHERE active = true
ORDER BY created_at;
