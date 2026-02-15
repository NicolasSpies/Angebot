export const calculateTotals = (services, discountPercent, country) => {
    if (!Array.isArray(services)) {
        return {
            subtotal: 0,
            discountAmount: 0,
            discountedSubtotal: 0,
            vat: 0,
            total: 0,
            totalCost: 0,
            grossProfit: 0,
            profitMargin: 0
        };
    }

    const subtotal = services.reduce((acc, s) => acc + ((s.unit_price || s.price || 0) * (s.quantity || 0)), 0);
    const totalCost = services.reduce((acc, s) => acc + ((s.cost_price || 0) * (s.quantity || 0)), 0);

    const discountAmount = subtotal * ((discountPercent || 0) / 100);
    const discountedSubtotal = subtotal - discountAmount;

    // VAT Rates: 21% for Belgium, 0% for others
    const vatRate = country === 'BE' ? 0.21 : 0.0;
    const vat = discountedSubtotal * vatRate;

    const total = discountedSubtotal + vat;

    // Profit Calculations
    const grossProfit = discountedSubtotal - totalCost;
    const profitMargin = discountedSubtotal > 0 ? (grossProfit / discountedSubtotal) * 100 : 0;

    return {
        subtotal,
        discountAmount,
        discountedSubtotal,
        vat,
        total,
        totalCost,
        grossProfit,
        profitMargin
    };
};

export const formatCurrency = (amount) => {
    try {
        if (amount === undefined || amount === null || isNaN(amount)) return '€0,00';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    } catch (error) {
        console.error("Error formatting currency:", error);
        return '€0,00';
    }
};
