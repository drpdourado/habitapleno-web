export interface Poll {
    id?: string;
    title: string;
    description: string;
    options: string[];
    startDate: string;
    endDate: string;
    status: 'active' | 'closed';
    condominiumId: string;
    createdBy: string;
    onAudit?: (poll: any) => void;
}

export interface PollVote {
    userId: string;
    unitId: string;
    selectedOptionIndex: number;
    timestamp: string;
}
