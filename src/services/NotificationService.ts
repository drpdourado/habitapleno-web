import api from './api';

/**
 * Handles communication for system-wide and tenant-specific notifications. 
 * Replaces old Firestore listener notifications during API separation.
 */
export const notificationService = {
  /**
   * Fetches the user's personal notifications from the Node API.
   */
  getNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      return { success: false, data: [] };
    }
  },

  /**
   * Sends a generic notification to a specific user.
   */
  send: async (payload: { userId: string; title: string, message: string, type?: string, link?: string }) => {
    try {
      const response = await api.post('/notifications', payload);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
       console.error("Error sending notification:", error);
       return { success: false };
    }
  },

  /**
   * Bulk dispatch for high-priority alerts (e.g. Ocorrencia registration).
   */
  sendBulkNotifications: async (userIds: string[], title: string, message: string, tenantId: string, options: any = {}) => {
    try {
      const response = await api.post('/notifications/bulk', {
        userIds,
        title,
        message,
        tenantId,
        ...options
      });
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
       console.error("Error sending bulk notifications:", error);
       return { success: false };
    }
  },

  /**
   * Marks a single notification as read in the Node API DB.
   */
  markAsRead: async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      return { success: true };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false };
    }
  }
};

export default notificationService;
