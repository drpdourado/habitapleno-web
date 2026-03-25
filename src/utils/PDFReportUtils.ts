import api from '../services/api';

export const generateMonthlyReport = async (data: any, _settings?: any) => {
  try {
    const response = await api.post('/financial/generate-monthly-report', {
      referenceMonth: data.referenceMonth,
      initialBalance: data.initialBalance || 0,
      includeReceipts: data.includeReceipts !== false
    }, { responseType: 'blob' });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const refForName = data.referenceMonth ? data.referenceMonth.replace('/', '-') : 'mes';
    link.setAttribute('download', `relatorio_${refForName}.pdf`);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao gerar Relatório Mensal:", error);
    alert("Falha ao gerar o relatório mensal em PDF. Tente novamente.");
  }
};

export const generateFinancialReport = async (data: any) => {
  return generateMonthlyReport(data);
};

export const generateGasReport = async (referenceMonth: string) => {
  try {
    const response = await api.post('/financial/generate-gas-report', {
      referenceMonth
    }, { responseType: 'blob' });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const refForName = referenceMonth ? referenceMonth.replace('/', '-') : 'mes';
    link.setAttribute('download', `relatorio_gas_${refForName}.pdf`);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao gerar Relatório de Gás:", error);
    alert("Falha ao gerar o relatório de gás em PDF. Tente novamente.");
  }
};

export const generateDelinquencyReport = async () => {
  try {
    const response = await api.post('/financial/generate-delinquency-report', {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_inadimplencia.pdf`);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error("Erro ao gerar Relatório de Inadimplência:", error);
    alert("Falha ao gerar o relatório de inadimplência em PDF.");
  }
};

export const generateOcorrenciasReport = async () => {
  try {
    const response = await api.post('/financial/generate-ocorrencias-report', {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_operacional.pdf`);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error("Erro ao gerar Relatório Operacional:", error);
    alert("Falha ao gerar o relatório operacional em PDF.");
  }
};

export default {
  generateMonthlyReport,
  generateFinancialReport,
  generateGasReport,
  generateDelinquencyReport,
  generateOcorrenciasReport
};
