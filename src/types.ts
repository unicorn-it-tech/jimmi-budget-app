export interface Apartment {
    id: number;
    name: string;
}

export interface MonthlyData {
    values: number[]; // 13 elements: total + 12 months
}

export interface BudgetDataForMonth {
    budgetMensile: number;
    roomNightsAtteso: number;
    occupazioneAttesa: number;
    prezzoMedioAtteso: number;
    revParAtteso: number;
}

export interface ForecastData {
    occupazionePotenziale: MonthlyData;
    percentualeOccupazione: MonthlyData;
    totaleCamereOccupate: MonthlyData;
    adr: MonthlyData;
    revPar: MonthlyData;
    forecast: MonthlyData;
}

export interface SavedActualData {
  timestamp: string;
  data: {
    businessOnTheBooks: MonthlyData;
    roomNightsOnTheBooks: MonthlyData;
    occupazioneOnTheBooks: MonthlyData;
    adrAttuale: MonthlyData;
    revParAttuale: MonthlyData;
  };
}

export interface ForecastInputs {
    percentualeOccupazionePrevista: number[];
    adr: number[];
    fatturatoAnnoPrecedente: number[];
}

export interface Booking {
    day: number;
    price: number;
    channel?: string;
}

export interface BookingImportData {
    apartmentName: string;
    bookings: Booking[];
}

// Runtime export to ensure this file is treated as a valid module
export const TYPES_VERSION = '1.0.2';
