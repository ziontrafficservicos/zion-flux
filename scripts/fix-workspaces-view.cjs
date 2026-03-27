const https = require('https');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZ2V6cndrc211aG5ybXVkbmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ2NjAwNSwiZXhwIjoyMDg4MDQyMDA1fQ.PC6OFfYP0ZvZPRDU_80LSAk8la_uzYK7ovUYY8Vdjxs';

const sql = `
-- Recriar view sieg_fin_workspaces com todas as colunas necessarias
DROP VIEW IF EXISTS public.sieg_fin_workspaces;

CREATE OR REPLACE VIEW public.sieg_fin_workspaces AS
SELECT
  id,
  nome as name,
  slug,
  id as tenant_id,
  segment,
  logo_url,
  primary_color,
  status,
  active,
  settings,
  database_key,
  created_at,
  updated_at
FROM public.sieg_fin_empresas;

-- Grant permissions
GRANT SELECT ON public.sieg_fin_workspaces TO anon, authenticated, service_role;
`;

function executeSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'zfgezrwksmuhnrmudnas.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// First, create a temporary exec_sql function, then use it
function executeSQLDirect(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'zfgezrwksmuhnrmudnas.supabase.co',
      port: 443,
      path: '/pg',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Corrigindo view sieg_fin_workspaces ===\n');

  // Try creating exec_sql function first
  const createFuncSQL = `
    CREATE OR REPLACE FUNCTION public.temp_exec_sql(sql_text TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_text;
    END;
    $$;
  `;

  // Step 1: Try to create the helper function via RPC
  console.log('1. Tentando criar funcao helper...');

  // Use the management API approach that worked before
  const blocks = sql.split(';').filter(s => s.trim().length > 0);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim() + ';';
    console.log(`\nExecutando bloco ${i + 1}/${blocks.length}:`);
    console.log(block.substring(0, 80) + '...');

    const data = JSON.stringify({ query: block });
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.supabase.com',
        port: 443,
        path: '/v1/projects/zfgezrwksmuhnrmudnas/database/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sbp_f5cb76c26d75a0e8e01e2b8c43f1ab6d28f6f6ce`,
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    console.log(`Status: ${result.status}`);
    if (result.status !== 200 && result.status !== 201) {
      console.log(`Erro: ${result.body}`);
    } else {
      console.log('OK!');
    }
  }

  console.log('\n=== Concluido ===');
}

main().catch(console.error);
