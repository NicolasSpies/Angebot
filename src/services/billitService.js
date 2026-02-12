/**
 * Billit API Service Stub
 */

export const billitService = {
    createOffer: async (offerData) => {
        console.log('Exporting to Billit:', offerData);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            success: true,
            billit_id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            url: 'https://app.billit.be/invoices/mock'
        };
    },

    syncStatus: async (billitId) => {
        const statuses = ['sent', 'viewed', 'signed'];
        return {
            id: billitId,
            status: statuses[Math.floor(Math.random() * statuses.length)]
        };
    }
};
