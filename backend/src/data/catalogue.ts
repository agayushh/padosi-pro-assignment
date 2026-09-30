export type CatalogueTask = {
  slug: string;
  name: string;
  description: string;
};

export type CatalogueCategory = {
  slug: string;
  name: string;
  description: string;
  tasks: CatalogueTask[];
};

export const catalogue: CatalogueCategory[] = [
  {
    slug: "errands",
    name: "Errands & Daily Tasks",
    description: "Bills, banks, documents, and government office work.",
    tasks: [
      {
        slug: "bill-payments",
        name: "Bill payments",
        description: "Pay electricity, water, gas, and other household bills.",
      },
      {
        slug: "bank-work",
        name: "Bank work",
        description: "Branch deposits, cheque drops, and other bank errands.",
      },
      {
        slug: "document-pickup",
        name: "Document pickup",
        description: "Collect papers from an office, school, or a person.",
      },
      {
        slug: "gov-office-visits",
        name: "Gov. office visits",
        description: "File or collect documents at a government office.",
      },
      {
        slug: "queue-standing",
        name: "Queue-standing",
        description: "Someone waits in the queue so you do not have to.",
      },
    ],
  },
  {
    slug: "home",
    name: "Home Services",
    description: "Repairs and upkeep inside the house.",
    tasks: [
      {
        slug: "ac-service",
        name: "AC service",
        description: "Servicing, filter cleaning, and gas checks for your AC.",
      },
      {
        slug: "plumber",
        name: "Plumber",
        description: "Leaks, blockages, and fittings fixed at home.",
      },
      {
        slug: "electrician",
        name: "Electrician",
        description: "Switches, wiring faults, and new points.",
      },
      {
        slug: "deep-cleaning",
        name: "Deep cleaning",
        description: "A full clean of the rooms you choose.",
      },
      {
        slug: "carpenter",
        name: "Carpenter",
        description: "Furniture fixes, fittings, and small woodwork.",
      },
      {
        slug: "pest-control",
        name: "Pest control",
        description: "Treatment for cockroaches, ants, and other pests.",
      },
    ],
  },
  {
    slug: "travel",
    name: "Travel & Tourism",
    description: "Flights, hotels, visas, transfers, and itineraries.",
    tasks: [
      {
        slug: "flight-hotel",
        name: "Flight & hotel booking",
        description: "Tickets and a stay booked around your dates.",
      },
      {
        slug: "visa-paperwork",
        name: "Visa paperwork",
        description: "Forms, appointments, and document checks for a visa.",
      },
      {
        slug: "itinerary",
        name: "Itinerary planning",
        description: "A day-by-day plan for the trip.",
      },
      {
        slug: "airport-transfer",
        name: "Airport transfer",
        description: "A pickup or drop at the airport.",
      },
      {
        slug: "car-rental",
        name: "Car rental",
        description: "A car arranged for the days you need it.",
      },
    ],
  },
  {
    slug: "health",
    name: "Health & Medical",
    description: "Doctor visits, pharmacy runs, labs, and physio.",
    tasks: [
      {
        slug: "home-doctor",
        name: "Home doctor visit",
        description: "A doctor visit arranged at home.",
      },
      {
        slug: "pharmacy",
        name: "Pharmacy",
        description: "Medicines picked up and dropped at your door.",
      },
      {
        slug: "lab-pickup",
        name: "Lab pickup",
        description: "Samples collected or reports brought back.",
      },
      {
        slug: "physio",
        name: "Physio at home",
        description: "A physiotherapy session at home.",
      },
      {
        slug: "diagnostics",
        name: "Diagnostics",
        description: "Scans and tests booked and followed through.",
      },
    ],
  },
  {
    slug: "senior",
    name: "Senior Care",
    description: "Check-ins, medicines, vitals, and companionship.",
    tasks: [
      {
        slug: "wellness-checkin",
        name: "Daily wellness check-ins",
        description: "A regular check that your parents are doing alright.",
      },
      {
        slug: "medicine-reminders",
        name: "Medicine reminders",
        description: "Refills and reminders so a dose is not missed.",
      },
      {
        slug: "vitals",
        name: "Vitals monitoring",
        description: "Blood pressure, sugar, and other readings noted.",
      },
      {
        slug: "companionship",
        name: "Companionship",
        description: "Time and company for an elder at home.",
      },
      {
        slug: "doctor-coordination",
        name: "Doctor coordination",
        description: "Appointments booked and the visit seen through.",
      },
    ],
  },
  {
    slug: "events",
    name: "Events & Management",
    description: "Weddings, décor, catering, and photography.",
    tasks: [
      {
        slug: "wedding",
        name: "Wedding coordination",
        description: "One person keeping the wedding vendors in step.",
      },
      {
        slug: "mehendi-sangeet",
        name: "Mehendi & sangeet",
        description: "Artists and the evening arranged.",
      },
      {
        slug: "decor",
        name: "Décor & florals",
        description: "Flowers and décor for the function.",
      },
      {
        slug: "catering",
        name: "Catering",
        description: "Food planned and the caterer followed up.",
      },
      {
        slug: "photography",
        name: "Photography",
        description: "A photographer booked for the event.",
      },
    ],
  },
  {
    slug: "workforce",
    name: "Workforce Management",
    description: "Maids, cooks, drivers, and nannies.",
    tasks: [
      {
        slug: "maid",
        name: "Maid hiring",
        description: "Help finding and settling household staff.",
      },
      {
        slug: "cook",
        name: "Cook placement",
        description: "A cook matched to how your kitchen runs.",
      },
      {
        slug: "driver",
        name: "Driver vetting",
        description: "A driver checked and introduced to the household.",
      },
      {
        slug: "nanny",
        name: "Nanny search",
        description: "Childcare help shortlisted for your family.",
      },
    ],
  },
  {
    slug: "tech",
    name: "Digital & Tech Help",
    description: "WiFi, CCTV, smart locks, and device repair.",
    tasks: [
      {
        slug: "wifi",
        name: "WiFi & routers",
        description: "Home internet set up or a dead connection fixed.",
      },
      {
        slug: "cctv",
        name: "CCTV install",
        description: "Cameras installed and the feed checked.",
      },
      {
        slug: "smart-locks",
        name: "Smart locks",
        description: "A smart lock fitted and shown to the household.",
      },
      {
        slug: "laptop-repair",
        name: "Laptop repair",
        description: "A laptop diagnosed and repaired.",
      },
    ],
  },
];
