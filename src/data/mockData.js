export const mockServices = [
    {
        id: '1',
        category: 'Web Development',
        name_de: 'Standard Website',
        name_fr: 'Site Web Standard',
        description_de: 'Basis-Website mit bis zu 5 Seiten.',
        description_fr: 'Site web de base avec jusqu\'à 5 pages.',
        price: 1500,
        cost_price: 800,
        unit_type: 'flat',
        default_selected: false,
        active: true
    },
    {
        id: '2',
        category: 'Web Development',
        name_de: 'E-Commerce Modul',
        name_fr: 'Module E-Commerce',
        description_de: 'Online-Shop Funktionalität.',
        description_fr: 'Fonctionnalité de boutique en ligne.',
        price: 2500,
        cost_price: 1400,
        unit_type: 'flat',
        default_selected: false,
        active: true
    },
    {
        id: '3',
        category: 'Hosting',
        name_de: 'Standard Hosting (Jährlich)',
        name_fr: 'Hébergement Standard (Annuel)',
        description_de: 'Performance Hosting inkl. SSL.',
        description_fr: 'Hébergement performance incluant SSL.',
        price: 240,
        cost_price: 60,
        unit_type: 'yearly',
        default_selected: true,
        active: true
    },
    {
        id: '4',
        category: 'Design',
        name_de: 'Logo Design',
        name_fr: 'Design de Logo',
        description_de: '3 Konzepte zur Auswahl.',
        description_fr: '3 concepts au choix.',
        price: 800,
        cost_price: 350,
        unit_type: 'flat',
        default_selected: false,
        active: true
    },
    {
        id: '5',
        category: 'Marketing',
        name_de: 'SEO Setup',
        name_fr: 'Configuration SEO',
        description_de: 'On-page Optimierung.',
        description_fr: 'Optimisation on-page.',
        price: 600,
        cost_price: 250,
        unit_type: 'flat',
        default_selected: false,
        active: true
    }
];

export const mockCustomers = [
    {
        id: 'c1',
        company_name: 'Tech Solutions GmbH',
        language: 'de',
        country: 'DE',
        vat_number: 'DE123456789',
        default_discount: 5,
        payment_terms: '14 Tage netto'
    },
    {
        id: 'c2',
        company_name: 'Boulangerie Artisanale',
        language: 'fr',
        country: 'BE',
        vat_number: 'BE0987654321',
        default_discount: 0,
        payment_terms: '30 Tage netto'
    }
];

export const mockPackages = [
    {
        id: 'p1',
        name: 'Starter Bundle',
        included_services: ['1', '3', '5'],
        base_price: 2000
    }
];
