import api from '../services/api';

export const generateReceiptPDF = async (data: any) => {
  try {
    const response = await api.post('/financial/generate-pdf', {
      unitId: data.unitId || data.unit?.id,
      referenceMonth: data.referenceMonth,
      type: data.type || 'fatura'
    }, { responseType: 'blob' });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const unitId = data.unitId || data.unit?.id;
    const type = data.type || 'fatura';
    const unitIdentifier = data.unit?.number || unitId;
    const safeRef = (data.referenceMonth || '').replace(/\//g, '-');
    const fileName = `${type.toUpperCase()}_${unitIdentifier}_${safeRef}.pdf`;
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Falha ao gerar o boleto/recibo. Tente novamente.");
  }
};

export default generateReceiptPDF;
