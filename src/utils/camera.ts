import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Captura uma foto usando o Capacitor Camera.
 * Abre um seletor nativo para o usuário escolher entre tirar uma foto ou selecionar da galeria.
 * Converte o resultado em um objeto File compatível com FormData/API.
 * 
 * @returns {Promise<File | null>} O arquivo da imagem capturada ou null se cancelado.
 */
export const takePhoto = async (): Promise<File | null> => {
  try {
    // Considera mobile se for App Nativo OU se for um navegador em tela pequena (Smartphone/Tablet)
    const isMobile = Capacitor.isNativePlatform() || window.innerWidth < 768;

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      // No Mobile (App ou Web) mostramos o menu de escolha.
      // Apenas no Desktop Web vamos direto para o seletor de arquivos.
      source: isMobile ? CameraSource.Prompt : CameraSource.Photos,
      promptLabelHeader: 'Selecionar Imagem',
      promptLabelPhoto: 'Escolher da Galeria',
      promptLabelPicture: 'Tirar uma Foto',
      promptLabelCancel: 'Cancelar'
    });

    if (photo.webPath) {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      
      // Gera um nome único para o arquivo
      const fileName = `img_${Date.now()}.${photo.format}`;
      
      return new File([blob], fileName, { type: blob.type });
    }
    
    return null;
  } catch (error) {
    // No Capacitor, cancelar a ação dispara um erro. Tratamos aqui para não quebrar o fluxo.
    console.log('Operação de câmera cancelada pelo usuário ou indisponível.');
    return null;
  }
};
