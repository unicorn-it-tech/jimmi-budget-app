import React from 'react';

// Funzione helper per formattare i numeri in modo consistente
const formatNumber = (num: number, options: { decimals?: number, currency?: string, percentage?: boolean } = {}) => {
    const { decimals = 2, currency, percentage = false } = options;
    if (isNaN(num) || !isFinite(num)) {
        const zero = '0';
        return `${zero},${zero.repeat(decimals > 0 ? decimals : 2)}`;
    }
    const formatted = num.toFixed(decimals).replace('.', ',');
    if (currency) return `${currency} ${formatted}`;
    if (percentage) return `${formatted}%`;
    return formatted;
};

interface StatCardProps {
    label: string;
    value: number;
    currency?: string;
    percentage?: boolean;
    valueColor?: string;
    decimals?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, currency, percentage, valueColor = 'text-gray-900 dark:text-white', decimals = 2 }) => (
    <div className="flex flex-col text-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden shadow">
        <div className="bg-gray-200 dark:bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
            {label}
        </div>
        <div className={`bg-white dark:bg-gray-800 p-2 font-bold text-lg ${valueColor}`}>
            {formatNumber(value, { currency, percentage, decimals })}
        </div>
    </div>
);

export interface SummaryDashboardProps {
    scostamento: number;
    businessOnTheBooks: number;
    roomNightsVendute: number;
    tassoOccupazione: number;
    prezzoMedio: number;
    revPar: number;
    budgetMensile: number;
    roomNightsAtteso: number;
    occupazioneAttesa: number;
    prezzoMedioAtteso: number;
    revParAtteso: number;
}

const SummaryDashboard: React.FC<SummaryDashboardProps> = (props) => {
    return (
        <div className="mt-6 p-4 bg-secondary dark:bg-dark-secondary rounded-lg shadow-inner border dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Prima riga */}
                <StatCard 
                    label="Scostamento" 
                    value={props.scostamento} 
                    currency="€"
                    valueColor={props.scostamento < 0 ? 'text-red-500' : 'text-green-500'}
                />
                <StatCard 
                    label="Business on the Books" 
                    value={props.businessOnTheBooks} 
                    currency="€" 
                />
                <StatCard 
                    label="Room nights vendute" 
                    value={props.roomNightsVendute} 
                    decimals={0} 
                />
                <StatCard 
                    label="Tasso di occupazione" 
                    value={props.tassoOccupazione} 
                    percentage 
                />
                <StatCard 
                    label="Prezzo medio" 
                    value={props.prezzoMedio} 
                />
                <StatCard 
                    label="RevPar" 
                    value={props.revPar} 
                />
                
                {/* Seconda riga */}
                <div className="hidden lg:block"></div> {/* Cella vuota per allineamento */}
                <StatCard 
                    label="Budget Mensile" 
                    value={props.budgetMensile} 
                />
                 <StatCard 
                    label="Room nights atteso" 
                    value={props.roomNightsAtteso} 
                    decimals={0}
                />
                <StatCard 
                    label="Occupazione attesa" 
                    value={props.occupazioneAttesa} 
                    percentage
                />
                <StatCard 
                    label="Prezzo medio atteso" 
                    value={props.prezzoMedioAtteso} 
                />
                <StatCard 
                    label="RevPar Atteso" 
                    value={props.revParAtteso} 
                />
            </div>
        </div>
    );
};

export default SummaryDashboard;