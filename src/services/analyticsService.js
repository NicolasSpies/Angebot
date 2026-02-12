export const analyticsService = {
    getServicePopularity: (offers) => {
        const stats = {};
        offers.forEach(o => {
            o.services.forEach(s => {
                const name = s.name_de || s.name;
                stats[name] = (stats[name] || 0) + 1;
            });
        });
        return Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    },

    getPipelineEfficiency: (offers) => {
        const signedOffers = offers.filter(o => o.status === 'signed');
        if (signedOffers.length === 0) return 0;

        const totalDays = signedOffers.reduce((acc, o) => {
            const created = new Date(o.created_at);
            const updated = new Date(o.updated_at);
            return acc + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0);

        return Math.round(totalDays / signedOffers.length);
    },

    getMonthlyProfitability: (offers) => {
        const months = {};
        offers.forEach(o => {
            const month = new Date(o.created_at).toLocaleString('default', { month: 'short' });
            if (!months[month]) months[month] = { profit: 0, count: 0 };

            // Calculate profit again as it might not be stored in the offer yet
            // In a real app we'd store these totals
            const subtotal = o.services.reduce((acc, s) => acc + (s.price * s.quantity), 0);
            const totalCost = o.services.reduce((acc, s) => acc + ((s.cost_price || 0) * s.quantity), 0);
            const discountAmount = subtotal * ((o.discount_percent || 0) / 100);
            const profit = (subtotal - discountAmount) - totalCost;

            months[month].profit += profit;
            months[month].count += 1;
        });
        return Object.entries(months).slice(-6);
    }
};
