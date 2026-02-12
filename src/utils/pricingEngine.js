export const calculateTotals = (services, discountPercent, country) => {
    const subtotal = services.reduce((acc, s) => acc + (s.price * s.quantity), 0);
    const totalCost = services.reduce((acc, s) => acc + ((s.cost_price || 0) * s.quantity), 0);

    const discountAmount = subtotal * (discountPercent / 100);
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
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};
