/**
 * Parseia valores monetários que podem vir em formato brasileiro ou decimal.
 *
 * Exemplos:
 * - "628,50"    → 628.50 (vírgula como decimal)
 * - "1.628,50"  → 1628.50 (ponto milhar + vírgula decimal)
 * - "628.50"    → 628.50 (formato decimal padrão)
 * - "1.601"     → 1601 (ponto como milhar, 3 dígitos após)
 * - 628.5       → 628.5 (já é número)
 */
export function parseValorBR(valor: any): number {
  if (!valor && valor !== 0) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  // Remove prefixo "R$" e espaços extras
  const str = String(valor).trim().replace(/^R\$\s*/i, '').trim();
  if (!str) return 0;

  let result: number;

  // Se tem ponto mas não tem vírgula
  if (str.includes('.') && !str.includes(',')) {
    const partes = str.split('.');
    // Se a parte depois do ponto tem 3 dígitos, é separador de milhar (ex: "1.601" = 1601)
    if (partes.length === 2 && partes[1].length === 3) {
      result = parseFloat(str.replace('.', ''));
      return isNaN(result) ? 0 : result;
    }
  }

  // Formato brasileiro com vírgula decimal (ex: "628,50" ou "1.628,50")
  if (str.includes(',')) {
    result = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(result) ? 0 : result;
  }

  result = parseFloat(str);
  return isNaN(result) ? 0 : result;
}
