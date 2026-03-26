import type { Setting } from '../contexts/AppContext.tsx';

export interface EncargosResult {
    valorOriginal: number;
    multa: number;
    juros: number;
    total: number;
    diasAtraso: number;
}

/**
 * Calcula a multa e juros pro-rata para um pagamento em atraso.
 * @param valor Valor original da cobrança
 * @param vencimento Data de vencimento (DD/MM/AAAA ou ISO String)
 * @param settings Configurações de multa (%) e juros mensais (%)
 * @returns Objeto com o detalhamento dos encargos
 */
export function calcularEncargos(valor: number, vencimento: string, settings: Setting): EncargosResult {
    const result: EncargosResult = {
        valorOriginal: valor,
        multa: 0,
        juros: 0,
        total: valor,
        diasAtraso: 0
    };

    if (!vencimento || valor <= 0) return result;

    let dueDate: Date;
    if (vencimento.includes('/')) {
        const [d, m, y] = vencimento.split('/').map(Number);
        dueDate = new Date(y, m - 1, d, 23, 59, 59);
    } else {
        dueDate = new Date(vencimento);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        result.diasAtraso = diffDays;

        const multaPercent = settings.multaPercent || 0;
        const jurosMensalPercent = settings.jurosMensalPercent || 0;

        // Multa: valor * (settings.multaPercent / 100)
        result.multa = valor * (multaPercent / 100);

        // Juros (Pro-rata): valor * ((settings.jurosMensalPercent / 30 / 100) * diasDeAtraso)
        result.juros = valor * ((jurosMensalPercent / 30 / 100) * diffDays);

        result.total = valor + result.multa + result.juros;
    }

    return result;
}

/**
 * Formata um valor numérico para o formato de moeda brasileiro (BRL).
 * @param val Valor numérico a ser formatado
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export const formatCurrency = (val: number): string => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
