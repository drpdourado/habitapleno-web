/**
 * OfxUtils - Logic to parse OFX files into structured transaction data.
 */

export interface OfxTransaction {
    id: string;
    date: string;
    amount: number;
    description: string;
    type: 'DEBIT' | 'CREDIT';
    originalFitId?: string;
}

export function parseOfx(content: string): OfxTransaction[] {
    const transactions: OfxTransaction[] = [];
    // Basic regex-based OFX parser for standard bank formats
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    
    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const transBlock = match[1];
        const getTagValue = (tag: string) => {
            const tagRegex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
            const tagMatch = transBlock.match(tagRegex);
            return tagMatch ? tagMatch[1].trim() : '';
        };

        const fitId = getTagValue('FITID');
        const type = getTagValue('TRNTYPE').toUpperCase() === 'DEBIT' ? 'DEBIT' : 'CREDIT';
        
        // Date format in OFX is usually YYYYMMDDHHMMSS
        const datePostedStr = getTagValue('DTPOSTED');
        let formattedDate = '';
        if (datePostedStr && datePostedStr.length >= 8) {
            formattedDate = `${datePostedStr.slice(0, 4)}-${datePostedStr.slice(4, 6)}-${datePostedStr.slice(6, 8)}`;
        }
        
        const amountStr = getTagValue('TRNAMT');
        const amount = amountStr ? parseFloat(amountStr.replace(',', '.')) : 0;
        
        // MEMO or NAME usually contains the transaction description
        const memo = getTagValue('MEMO') || getTagValue('NAME') || 'Sem descrição';

        transactions.push({
            id: fitId,
            date: formattedDate,
            amount: Math.abs(amount), // We use absolute values and the 'type' field
            description: memo,
            type,
            originalFitId: fitId
        });
    }
    
    return transactions;
}

export default {
    parseOfx
};
