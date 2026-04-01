import { DollarSign, AlertTriangle, CheckCircle, User, Bot } from 'lucide-react';

interface ValoresPendentesProps {
  valorPendente: number;
  valorRecuperado: number;
  valorEmNegociacao: number;
  metaMensal?: number;
  isLoading?: boolean;
  valorRecuperadoHumano?: number;
  valorRecuperadoIA?: number;
}

export function ValoresPendentesCard({
  valorPendente = 0,
  valorRecuperado = 0,
  metaMensal = 0,
  isLoading = false,
  valorRecuperadoHumano = 0,
  valorRecuperadoIA = 0,
}: ValoresPendentesProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalCobrado = valorPendente + valorRecuperado;
  const taxaRecuperacao = totalCobrado > 0
    ? ((valorRecuperado / totalCobrado) * 100).toFixed(1)
    : '0.0';

  const progressoMeta = metaMensal > 0
    ? Math.min((valorRecuperado / metaMensal) * 100, 100)
    : 0;

  // Proporção Humano vs IA para barra
  const totalRec = valorRecuperadoHumano + valorRecuperadoIA;
  const pctHumano = totalRec > 0 ? (valorRecuperadoHumano / totalRec) * 100 : 50;
  const pctIA = totalRec > 0 ? (valorRecuperadoIA / totalRec) * 100 : 50;

  if (isLoading) {
    return (
      <div className="rounded-2xl p-6 border border-gray-200 bg-white">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-gray-100 rounded-xl" />
            <div className="h-28 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Valores Financeiros</h3>
          <p className="text-xs text-gray-500">Pendentes e Recuperados</p>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-4">
        {/* Valor Pendente */}
        <div className="rounded-xl p-5 bg-red-50 border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorPendente)}</p>
          <p className="text-xs text-gray-500 mt-1">Aguardando pagamento</p>
        </div>

        {/* Valor Recuperado */}
        <div className="rounded-xl p-5 bg-emerald-50 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Recuperado</span>
            </div>
            <span className="text-xs font-medium text-emerald-600">{taxaRecuperacao}% do total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorRecuperado)}</p>

          {/* Barra Humano vs IA */}
          {totalRec > 0 && (
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-blue-400 transition-all duration-500"
                  style={{ width: `${pctHumano}%` }}
                />
                <div
                  className="bg-purple-400 transition-all duration-500"
                  style={{ width: `${pctIA}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards Pago Humano e Pago IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
        {/* Pago Humano */}
        <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Pago Humano</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(valorRecuperadoHumano)}</p>
          {totalRec > 0 && (
            <p className="text-xs text-gray-500 mt-1">{pctHumano.toFixed(1)}% do recuperado</p>
          )}
        </div>

        {/* Pago IA */}
        <div className="rounded-xl p-4 bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Pago IA</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(valorRecuperadoIA)}</p>
          {totalRec > 0 && (
            <p className="text-xs text-gray-500 mt-1">{pctIA.toFixed(1)}% do recuperado</p>
          )}
        </div>
      </div>

    </div>
  );
}
