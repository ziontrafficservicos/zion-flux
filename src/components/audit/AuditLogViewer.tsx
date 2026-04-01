import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Calendar,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { 
  useAuditLog, 
  AuditLogEntry, 
  AuditLogFilters, 
  traduzirTabela, 
  traduzirAcao,
  sanitizarDados 
} from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogViewerProps {
  className?: string;
}

export function AuditLogViewer({ className }: AuditLogViewerProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    logs,
    totalCount,
    isLoading,
    error,
    refetch,
    page,
    totalPages,
    nextPage,
    prevPage,
  } = useAuditLog(filters);

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const renderChangedFields = (log: AuditLogEntry) => {
    if (!log.campos_alterados || log.campos_alterados.length === 0) return null;

    const dadosAnteriores = sanitizarDados(log.dados_anteriores);
    const dadosNovos = sanitizarDados(log.dados_novos);

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Campos Alterados ({log.campos_alterados.length}):
        </h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {log.campos_alterados.map((campo) => {
            const valorAnterior = dadosAnteriores?.[campo];
            const valorNovo = dadosNovos?.[campo];
            
            // Não mostrar campos muito grandes
            const formatValue = (val: any) => {
              if (val === null || val === undefined) return '(vazio)';
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
              return str.length > 200 ? str.substring(0, 200) + '...' : str;
            };
            
            return (
              <div key={campo} className="p-3 rounded-lg bg-muted/30 text-sm">
                <span className="font-medium text-foreground">{campo}:</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <span className="text-xs text-red-400">Antes:</span>
                    <p className="text-red-300 break-all text-xs mt-1">
                      {formatValue(valorAnterior)}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <span className="text-xs text-green-400">Depois:</span>
                    <p className="text-green-300 break-all text-xs mt-1">
                      {formatValue(valorNovo)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <History className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Histórico de Alterações</h2>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0 ? `${totalCount} registros encontrados` : 'Audit Log do sistema'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6 glass border border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Tabela</label>
            <Select
              value={filters.tabela || 'all'}
              onValueChange={(v) => handleFilterChange('tabela', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as tabelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="sieg_fin_conversas_leads">Conversas</SelectItem>
                <SelectItem value="sieg_fin_financeiro">Financeiro SIEG</SelectItem>
                <SelectItem value="campanhas">Campanhas</SelectItem>
                <SelectItem value="tenant_users">Usuários</SelectItem>
                <SelectItem value="mapeamentos_tags_tenant">Tags</SelectItem>
                <SelectItem value="custos_anuncios_tenant">Custos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Ação</label>
            <Select
              value={filters.acao || 'all'}
              onValueChange={(v) => handleFilterChange('acao', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="INSERT">➕ Criação</SelectItem>
                <SelectItem value="UPDATE">✏️ Alteração</SelectItem>
                <SelectItem value="DELETE">🗑️ Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Data Início</label>
            <Input
              type="date"
              onChange={(e) =>
                handleFilterChange('dataInicio', e.target.value ? new Date(e.target.value) : undefined)
              }
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Data Fim</label>
            <Input
              type="date"
              onChange={(e) =>
                handleFilterChange('dataFim', e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined)
              }
            />
          </div>
        </div>
      </Card>

      {/* Mensagem de erro/configuração */}
      {error && (
        <Card className="p-6 mb-6 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-500">Configuração Necessária</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Execute o script SQL de criação da tabela <code className="bg-muted px-1 rounded">audit_log</code> no Supabase Dashboard.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Logs */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 glass border border-border/50">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 && !error ? (
        <Card className="p-12 glass border border-border/50 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Nenhum registro encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            As alterações começarão a aparecer aqui automaticamente após a configuração.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const acaoInfo = traduzirAcao(log.acao);
            
            return (
              <Card
                key={log.id}
                className="p-4 glass border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => handleViewDetails(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full ${acaoInfo.cor} text-lg`}>
                      {acaoInfo.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={acaoInfo.cor}>
                          {acaoInfo.texto}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {traduzirTabela(log.tabela)}
                        </Badge>
                        {log.campos_alterados && log.campos_alterados.length > 0 && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {log.campos_alterados.length} campo(s)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                        {log.descricao || `${acaoInfo.texto} em ${traduzirTabela(log.tabela)}`}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_email || 'Sistema'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(log.criado_em)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} ({totalCount} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={page >= totalPages - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalhes da Alteração
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Tabela</span>
                  <p className="font-medium">{traduzirTabela(selectedLog.tabela)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Ação</span>
                  <div className="mt-1">
                    <Badge className={traduzirAcao(selectedLog.acao).cor}>
                      {traduzirAcao(selectedLog.acao).emoji} {traduzirAcao(selectedLog.acao).texto}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Usuário</span>
                  <p className="font-medium">{selectedLog.user_email || 'Sistema'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Data/Hora</span>
                  <p className="font-medium">{formatDate(selectedLog.criado_em)}</p>
                </div>
              </div>

              {/* ID do registro */}
              {selectedLog.registro_id && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">ID do Registro</span>
                  <p className="font-mono text-sm break-all">{selectedLog.registro_id}</p>
                </div>
              )}

              {/* Descrição */}
              {selectedLog.descricao && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Descrição</span>
                  <p className="text-sm mt-1">{selectedLog.descricao}</p>
                </div>
              )}

              {/* Campos alterados para UPDATE */}
              {selectedLog.acao === 'UPDATE' && renderChangedFields(selectedLog)}

              {/* Dados completos para INSERT */}
              {selectedLog.acao === 'INSERT' && selectedLog.dados_novos && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    Dados do Novo Registro:
                  </h4>
                  <pre className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs overflow-x-auto max-h-[200px]">
                    {JSON.stringify(sanitizarDados(selectedLog.dados_novos), null, 2)}
                  </pre>
                </div>
              )}

              {/* Dados completos para DELETE */}
              {selectedLog.acao === 'DELETE' && selectedLog.dados_anteriores && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    Dados do Registro Excluído:
                  </h4>
                  <pre className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs overflow-x-auto max-h-[200px]">
                    {JSON.stringify(sanitizarDados(selectedLog.dados_anteriores), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
