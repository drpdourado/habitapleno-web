import api from './api';

export interface ContactTicket {
  id: string;
  subject: string;
  category: string;
  status: 'Aberto' | 'Respondido' | 'Fechado';
  authorId: string;
  authorName: string;
  unitId: string;
  condominiumId: string;
  updatedAt: string | number | Date;
  messages: Array<{
    id?: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string | number | Date;
  }>;
}

export const condoService = {
  getSettings: async () => {
    const response = await api.get('/condo/settings');
    return response.data?.data ?? response.data;
  },
  
  updateSettings: async (settings: any) => {
    const response = await api.put('/condo/settings', settings);
    return response.data?.data ?? response.data;
  },
  
  getMural: async () => {
    const response = await api.get('/condo/mural');
    return response.data?.data ?? response.data;
  },
  
  getPolls: async () => {
    const response = await api.get('/condo/polls');
    return response.data?.data ?? response.data;
  },

  getTickets: async () => {
    const response = await api.get('/condo/tickets');
    return response.data?.data ?? response.data;
  },

  listenTickets: (onData: (data: ContactTicket[]) => void, onError: (err: any) => void) => {
    // Para migração Node.js, removemos o listener real-time do Firebase
    // Mockamos com um fetch e retornamos um unsubscribe vazio
    api.get('/condo/tickets')
       .then(res => onData(res.data?.data || res.data || []))
       .catch(err => onError(err));
    
    return () => { /* No-op unsubscribe */ };
  },

  createTicket: async (data: any, condoId: string) => {
    try {
      const response = await api.post('/condo/tickets', { ...data, condoId });
      return { 
        success: true, 
        data: response.data?.data?.id || response.data?.id || response.data 
      };
    } catch (err) {
      console.error('Error creating ticket:', err);
      return { success: false };
    }
  },

  replyTicket: async (ticketId: string, _ticket: ContactTicket, message: any, isAdmin: boolean, condoId: string) => {
    const response = await api.post(`/condo/tickets/${ticketId}/reply`, { message, isAdmin, condoId });
    return response.data?.data ?? response.data;
  },

  updateTicketStatus: async (ticketId: string, _ticket: ContactTicket, status: string) => {
    const response = await api.put(`/condo/tickets/${ticketId}/status`, { status });
    return response.data?.data ?? response.data;
  },

  // Murais de Aviso
  saveNotice: async (notice: any, isNew: boolean, _tenantId: string) => {
    if (isNew) {
      const response = await api.post('/condo/mural', notice);
      return response.data;
    } else {
      const response = await api.put(`/condo/mural/${notice.id}`, notice);
      return response.data;
    }
  },

  approveNotice: async (notice: any, _tenantId: string) => {
    const response = await api.put(`/condo/mural/${notice.id}/approve`);
    return response.data;
  },

  rejectNotice: async (notice: any, _tenantId: string) => {
    const response = await api.put(`/condo/mural/${notice.id}/reject`);
    return response.data;
  },

  markNoticeAsRead: async (noticeId: string) => {
    const response = await api.put(`/condo/mural/${noticeId}/read`);
    return response.data;
  },

  updateMuralNotice: async (noticeId: string, data: any) => {
    const response = await api.put(`/condo/mural/${noticeId}`, data);
    return response.data;
  },

  // Enquetes (Polls)
  listenPolls: (onData: (data: any[]) => void, onError: (err: any) => void) => {
    api.get('/condo/polls')
       .then(res => onData(res.data?.data || res.data || []))
       .catch(err => onError(err));
    return () => { /* No-op unsubscribe */ };
  },

  listenVotes: (pollId: string, onData: (data: any[]) => void) => {
    api.get(`/condo/polls/${pollId}/votes`)
       .then(res => onData(res.data?.data || res.data || []))
       .catch(err => console.error('Error fetching votes:', err));
    return () => { /* No-op unsubscribe */ };
  },

  castVote: async (voteData: any) => {
    try {
      const response = await api.post(`/condo/polls/${voteData.pollId}/vote`, voteData);
      return { success: true, data: response.data };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Erro ao votar' };
    }
  },

  getVoteDetails: async (poll: any) => {
    try {
      const response = await api.get(`/condo/polls/${poll.id}/audit`);
      return { success: true, data: response.data?.data || response.data };
    } catch (err: any) {
      return { success: false, error: 'Erro ao carregar detalhes' };
    }
  }
};

export interface VoteDetail {
  unitId: string;
  userName: string;
  votedOption: string;
  timestamp: string;
}

export default condoService;
