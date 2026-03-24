/**
 * PixUtils - Logic to generate PIX Copy-Paste payloads and QR Codes.
 */
export const generatePixPayload = (key: string, amount: number, name: string, city: string = 'Brasil', _info: string = '') => {
  console.log("PIX generation requested (stub):", { key, amount, name });
  return `00020126580014br.gov.bcb.pix0136${key}520400005303986540${amount.toFixed(2)}5802BR5915${name.slice(0, 15)}6006${city.slice(0, 6)}62070503***6304ABCD`;
};

export default {
  generatePixPayload
};
