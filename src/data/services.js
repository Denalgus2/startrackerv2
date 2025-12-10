export const serviceCategories = {
    Forsikring: {
        // One-time insurance tiers
        '1-99kr': 1,
        '100-299kr': 2,
        '300-499kr': 3,
        '500-999kr': 4,
        '1000-1499kr': 5,
        '1500-2499kr': 6,
        '2500-3499kr': 7,
        '3500-4499kr': 8,
        '4500-5499kr': 9,
        '5500kr+': 10,

        // Recurring insurance tiers (calculated directly in AddSaleModal)
        'Gjentakende - Under 100kr': 2,
        'Gjentakende - 100-299kr': 3,
        'Gjentakende - 300kr+': 4
    },
    'AVS/Support': {
        'MOBOFUSM': 1,
        'devicetime15': 1,
        'devicetime30': 2,
        'devicetime60': 3,
        'rtgwearable': 1,
        'RTG annen': 2,
        'SUPPORTAVTALE 6mnd': 3,
        'SUPPORTAVTALE 12mnd': 4,
        'SUPPORTAVTALE 24mnd': 5,
        'SUPPORTAVTALE 36mnd': 6,
        'Installasjon hvitevare': 3,
        'Returgreen': 1
    },
    'Kundeklubb': {
        // Count-based weekly brackets
        '3-4': 1,
        '5-6': 2,
        '7-9': 3,
        '10-14': 4,
        '15+': 5
    },
    'Annet': {
        'Kunnskap Sjekkliste': 1,
        'Todolist - Fylt ut 1 uke': 1,
        'Todolist - Alt JA 1 uke': 2,
    }
};