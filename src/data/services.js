export const serviceCategories = {
    Forsikring: {
        'Mindre enn 100kr x3': 1,  // Gives 1 star every 3 sales
        '100-299kr x2': 1,         // Gives 1 star every 2 sales
        '300-499kr': 1,
        '500-999kr': 2,
        '1000-1499kr': 3,
        '1500kr+': 4,
    },
    'AVS/Support': {
        'MOBOFUSM': 1,
        'Teletime15 x3': 1,        // Gives 1 star every 3 sales
        'Pctime15 x3': 1,          // Gives 1 star every 3 sales
        'Mdatime15 x3': 1,         // Gives 1 star every 3 sales
        'Teletime30 x2': 1,        // Gives 1 star every 2 sales
        'Pctime30 x2': 1,          // Gives 1 star every 2 sales
        'Mdatime30 x2': 1,         // Gives 1 star every 2 sales
        'Teletime60': 1,
        'Pctime60': 1,
        'Mdatime60': 1,
        'RTGWEARABLES x2': 1,      // Gives 1 star every 2 sales
        'Annen RTG': 1,
        'SUPPORTAVTALE 6mnd': 2,
        'SUPPORTAVTALE 12mnd': 3,
        'SUPPORTAVTALE 24mnd': 4,
        'SUPPORTAVTALE 36mnd': 5,
        'Installasjon hvitevare': 3,
        'Returgreen': 1,
    },
    'Kundeklubb': {
        '20%': 1,
        '40%': 2,
        '60%': 3,
        '80%': 4,
        '100%': 5,
    },
    'Annet': {
        'Kunnskap Sjekkliste': 1,
        'Todolist - Fylt ut 1 uke': 1,
        'Todolist - Alt JA 1 uke': 2,
    }
};