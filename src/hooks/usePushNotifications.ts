import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

export const usePushNotifications = (userUid: string | null) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Apenas tenta registrar se for mobile e se tiver um usuário autênticado
    if (!Capacitor.isNativePlatform() || !userUid) return;

    const registerPush = async () => {
      try {
        
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('[Push] User denied permissions.');
          return;
        }

        // Registrar no APNs/FCM
        await PushNotifications.register();

        // Listeners: Token Recebido
        PushNotifications.addListener('registration', async (token: Token) => {
          console.log('[Push] Registration token: ', token.value);
          setFcmToken(token.value);
          
          try {
            await api.put('/user/fcm-token', {
              uid: userUid,
              fcmToken: token.value
            });
            console.log('[Push] Token sent to backend API successfully.');
          } catch (apiError) {
            console.error('[Push] Falha ao enviar o token para a API', apiError);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Push] Error on registration: ' + JSON.stringify(error));
        });

        // Listeners: Notificação Recedida em Primeiro Plano
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('[Push] Push notification received: ', JSON.stringify(notification));
          // Emitir alerta / toast ou qualquer lógica de UI. Pode-se usar um toast nativo ou react-hot-toast.
          // Aqui loga-se ou avisa:
          alert(`Nova Notificação: ${notification.title}\n${notification.body}`);
        });

        // Listeners: Notificação Clicada
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[Push] Push action performed: ', JSON.stringify(action.notification));
          // Lógica de redirectionamento pode ir aqui usando os `data` properties.
        });

      } catch (e) {
        console.error('[Push] Exception on registerPush', e);
      }
    };

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userUid]);

  return { fcmToken };
};
