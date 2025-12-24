
import React, { useState, useMemo, useEffect } from 'react';
import type { Apartment, BudgetDataForMonth } from '../types';
import { LockClosedIcon, LockOpenIcon, ClipboardListIcon, XIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface BudgetPlannerProps {
    apartments: Apartment[];
    year: number;
    onUpdate: (data: Record<string, BudgetDataForMonth>) => void;
    storagePrefix: string;
}

interface LogEntry {
    timestamp: Date;
    description: string;
}

const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const getDaysInMonth = (monthIndex: number, year: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
};

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '€ 0,00';
    return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0,00%';
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatRevPar = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '€ 0,00';
    return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatIndex = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0,00';
    return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ apartments, year, onUpdate, storagePrefix }) => {
    
    const [monthlyUnits, setMonthlyUnits] = useLocalStorage<number[]>(`${storagePrefix}-budget-units`, Array(12).fill(0));
    
    const [budgetData, setBudgetData] = useLocalStorage(`${storagePrefix}-budget-data`, {
        percentualeOccupazionePrevista: [1.00, 3.00, 10.00, 30.00, 30.00, 70.00, 80.00, 90.00, 70.00, 10.00, 1.00, 3.00],
        adr: [60.00, 60.00, 50.00, 60.00, 55.00, 90.00, 100.00, 150.00, 90.00, 50.00, 60.00, 60.00],
        fatturatoAnnoPrecedente: Array(12).fill(0),
    });

    const [isBudgetLocked, setIsBudgetLocked] = useLocalStorage<boolean>(`${storagePrefix}-budget-locked`, false);
    const [isLogVisible, setIsLogVisible] = useState(false);
    
    const [storedLogEntries, setStoredLogEntries] = useLocalStorage<{timestamp: string, description: string}[]>(`${storagePrefix}-budget-logs`, [{ timestamp: new Date().toISOString(), description: "Sessione budget avviata." }]);
    
    const logEntries = useMemo(() => {
        return storedLogEntries.map(e => ({ ...e, timestamp: new Date(e.timestamp) }));
    }, [storedLogEntries]);

    useEffect(() => {
        // Sincronizza il numero di unità con l'elenco principale degli appartamenti SOLO se non impostato
        if (apartments.length > 0 && monthlyUnits.every(u => u === 0)) {
            setMonthlyUnits(Array(12).fill(apartments.length));
        }
    }, [apartments.length]);

    const addLogEntry = (description: string) => {
        const newEntry = { timestamp: new Date().toISOString(), description };
        setStoredLogEntries(prev => [newEntry, ...prev]);
    };

    const handleDataChange = (type: keyof typeof budgetData, index: number, value: string) => {
        if (isBudgetLocked) return;
        
        const numericValue = parseFloat(value.replace(',', '.')) || 0;
        const oldValue = budgetData[type][index];

        if (oldValue !== numericValue) {
            let fieldName = '';
            let formatter: (val: number) => string = formatCurrency;
            if (type === 'percentualeOccupazionePrevista') {
                fieldName = 'Occupazione prevista';
                formatter = formatPercentage;
            } else if (type === 'adr') {
                fieldName = 'ADR';
            } else if (type === 'fatturatoAnnoPrecedente') {
                fieldName = 'Fatturato Anno Precedente';
            }
            addLogEntry(`Modificato ${fieldName} per ${months[index]} da ${formatter(oldValue)} a ${formatter(numericValue)}`);
        }

        setBudgetData(prev => {
            const newData = [...prev[type]];
            newData[index] = numericValue;
            return { ...prev, [type]: newData };
        });
    };
    
    const handleUnitsChange = (index: number, value: string) => {
        if (isBudgetLocked) return;

        const numericValue = parseInt(value, 10);
        const oldValue = monthlyUnits[index];

        if (!isNaN(numericValue) && numericValue >= 0) {
            if (oldValue !== numericValue) {
                addLogEntry(`Modificato Unità per ${months[index]} da ${oldValue} a ${numericValue}`);
            }
            setMonthlyUnits(prev => {
                const newUnits = [...prev];
                newUnits[index] = numericValue;
                return newUnits;
            });
        } else if (value === '') {
             if (oldValue !== 0) {
                addLogEntry(`Modificato Unità per ${months[index]} da ${oldValue} a 0`);
            }
            setMonthlyUnits(prev => {
                const newUnits = [...prev];
                newUnits[index] = 0;
                return newUnits;
            });
        }
    };
    
    const handleLockToggle = () => {
        const newState = !isBudgetLocked;
        setIsBudgetLocked(newState);
        addLogEntry(newState ? "Budget bloccato." : "Budget sbloccato.");
    };
    
    const calculations = useMemo(() => {
        const monthlyCalculations = months.map((_, i) => {
            const daysInMonth = getDaysInMonth(i, year);
            const numberOfUnits = monthlyUnits[i] || 0;
            const occupazionePotenzialeMassima = numberOfUnits * daysInMonth;
            const percentualeOccupazione = budgetData.percentualeOccupazionePrevista[i] / 100;
            const adr = budgetData.adr[i];

            const totaleCamereOccupate = occupazionePotenzialeMassima * percentualeOccupazione;
            const obiettivo = totaleCamereOccupate * adr;
            const revPar = occupazionePotenzialeMassima > 0 ? obiettivo / occupazionePotenzialeMassima : 0;
            const indiceDiRevPar = revPar > 0 ? adr / revPar : 0;
            
            return {
                occupazionePotenzialeMassima,
                totaleCamereOccupate,
                obiettivo,
                revPar,
                indiceDiRevPar,
            };
        });

        const totals = {
            occupazionePotenzialeMassima: monthlyCalculations.reduce((sum, data) => sum + data.occupazionePotenzialeMassima, 0),
            totaleCamereOccupate: monthlyCalculations.reduce((sum, data) => sum + data.totaleCamereOccupate, 0),
            obiettivo: monthlyCalculations.reduce((sum, data) => sum + data.obiettivo, 0),
            fatturatoAnnoPrecedente: budgetData.fatturatoAnnoPrecedente.reduce((sum, val) => sum + val, 0),
        };
        
        const totalPercentage = totals.occupazionePotenzialeMassima > 0 ? (totals.totaleCamereOccupate / totals.occupazionePotenzialeMassima) * 100 : 0;
        const totalAdr = totals.totaleCamereOccupate > 0 ? totals.obiettivo / totals.totaleCamereOccupate : 0;
        const totalRevPar = totals.occupazionePotenzialeMassima > 0 ? totals.obiettivo / totals.occupazionePotenzialeMassima : 0;
        const totalIndiceDiRevPar = totalRevPar > 0 ? totalAdr / totalRevPar : 0;

        return { monthly: monthlyCalculations, totals, totalPercentage, totalAdr, totalRevPar, totalIndiceDiRevPar };

    }, [budgetData, monthlyUnits, year]);

    useEffect(() => {
        const yearBudgetData: Record<string, BudgetDataForMonth> = {};
        months.forEach((month, i) => {
            const key = `${year}-${month}`;
            yearBudgetData[key] = {
                budgetMensile: calculations.monthly[i].obiettivo,
                roomNightsAtteso: calculations.monthly[i].totaleCamereOccupate,
                occupazioneAttesa: budgetData.percentualeOccupazionePrevista[i],
                prezzoMedioAtteso: budgetData.adr[i],
                revParAtteso: calculations.monthly[i].revPar,
            };
        });
        onUpdate(yearBudgetData);
    }, [calculations, budgetData, year, onUpdate]);


    const renderRow = (label: string, data: (number | string)[], total: number | string, formatter: (val: number) => string, customRowClass = "") => (
         <tr className={`border-b border-gray-100 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${customRowClass}`}>
            <td className={`sticky left-0 z-10 py-3 px-4 font-bold text-left text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-[#141414] border-r border-gray-100 dark:border-slate-700/50`}>{label}</td>
            <td className={`py-3 px-4 font-bold text-center text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-700/50`}>{typeof total === 'number' ? formatter(total) : total}</td>
            {data.map((val, i) => (
                <td key={i} className="py-3 px-4 text-center text-sm text-gray-700 dark:text-slate-300 border-r border-gray-100 dark:border-slate-700/50 last:border-0">{typeof val === 'number' ? formatter(val) : val}</td>
            ))}
        </tr>
    );
    
    const renderInputRow = (label: string, data: number[], total: number | string, formatter: (val: number) => string, type: keyof typeof budgetData, options: { isPercentage?: boolean, isCurrency?: boolean } = {}) => (
        <tr className="border-b border-gray-100 dark:border-slate-700/50 last:border-0 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 transition-colors">
            <td className="sticky left-0 z-10 py-3 px-4 font-bold text-left text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wider bg-yellow-50/90 dark:bg-[#141414] border-r border-gray-100 dark:border-slate-700/50 backdrop-blur-sm">{label}</td>
            <td className="py-3 px-4 font-bold text-center text-sm text-gray-900 dark:text-white bg-yellow-100/50 dark:bg-yellow-900/30 border-r border-gray-100 dark:border-slate-700/50">{typeof total === 'number' ? formatter(total) : total}</td>
            {data.map((val, i) => (
                <td key={i} className="py-3 px-2 text-center text-sm border-r border-gray-100 dark:border-slate-700/50 last:border-0">
                    <div className="relative flex items-center justify-center">
                        {options.isCurrency && <span className="absolute left-1 text-gray-400 text-xs pointer-events-none">€</span>}
                        <input 
                            type="text"
                            inputMode="decimal"
                            value={val.toString().replace('.', ',')}
                            onChange={(e) => handleDataChange(type, i, e.target.value)}
                            readOnly={isBudgetLocked}
                            className={`w-full bg-white dark:bg-slate-800 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 rounded-md p-1 text-gray-900 dark:text-slate-200 shadow-sm ${options.isCurrency ? 'pl-4' : ''} ${options.isPercentage ? 'pr-4' : ''} ${isBudgetLocked ? 'cursor-not-allowed opacity-70 bg-gray-100 dark:bg-slate-900' : ''}`}
                        />
                        {options.isPercentage && <span className="absolute right-1 text-gray-400 text-xs pointer-events-none">%</span>}
                    </div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Budget Planner</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLockToggle}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all ${
                                isBudgetLocked
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                            }`}
                            aria-label={isBudgetLocked ? 'Sblocca budget' : 'Blocca budget'}
                        >
                            {isBudgetLocked ? <LockClosedIcon className="w-5 h-5" /> : <LockOpenIcon className="w-5 h-5" />}
                            <span>{isBudgetLocked ? 'BLOCCATO' : 'SBLOCCATO'}</span>
                        </button>
                         <button
                            onClick={() => setIsLogVisible(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-all"
                            aria-label="Mostra log eventi"
                        >
                            <ClipboardListIcon className="w-5 h-5" />
                            <span>LOG</span>
                        </button>
                    </div>
                </div>

                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-slate-700">
                            <th className="sticky left-0 z-20 py-4 px-4 text-left font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider w-52 bg-gray-50 dark:bg-[#0d0d0d] border-r border-gray-200 dark:border-slate-700">RICAVI VENDITA</th>
                            <th className="py-4 px-4 text-center font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider w-36 border-r border-gray-200 dark:border-slate-700">TOTALE</th>
                            {months.map(m => (
                                <th key={m} className="py-4 px-4 text-center font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider w-32 border-r border-gray-200 dark:border-slate-700 last:border-0">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-gray-50 dark:bg-slate-900/20 border-b border-gray-200 dark:border-slate-700">
                            <td className="sticky left-0 z-10 py-3 px-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-[#141414] border-r border-gray-200 dark:border-slate-700">Unità n.</td>
                            <td className="py-3 px-4 text-center text-sm border-r border-gray-200 dark:border-slate-700"></td>
                             {monthlyUnits.map((units, i) => (
                                <td key={i} className="py-3 px-2 text-center text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 border-r border-gray-200 dark:border-slate-700 last:border-0">
                                     <input 
                                        type="number"
                                        value={units}
                                        onChange={(e) => handleUnitsChange(i, e.target.value)}
                                        readOnly={isBudgetLocked}
                                        className={`w-full bg-transparent text-center font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded p-1 dark:text-yellow-400 ${isBudgetLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                                    />
                                </td>
                             ))}
                        </tr>
                        {renderRow('Occupazione potenziale massima', calculations.monthly.map(c => c.occupazionePotenzialeMassima), calculations.totals.occupazionePotenzialeMassima, formatNumber)}
                        {renderInputRow('Occupazione prevista', budgetData.percentualeOccupazionePrevista, calculations.totalPercentage, formatPercentage, 'percentualeOccupazionePrevista', { isPercentage: true })}
                        {renderRow('Tot unità occupate per mese', calculations.monthly.map(c => c.totaleCamereOccupate), calculations.totals.totaleCamereOccupate, formatNumber)}
                        {renderInputRow('ADR', budgetData.adr, calculations.totalAdr, formatCurrency, 'adr', { isCurrency: true })}
                        {renderRow('Obiettivo', calculations.monthly.map(c => c.obiettivo), calculations.totals.obiettivo, formatCurrency, '!bg-green-50 dark:!bg-green-900/20 text-green-800 dark:text-green-300')}
                        {renderRow('RevPar', calculations.monthly.map(c => c.revPar), calculations.totalRevPar, formatRevPar)}
                        {renderRow('Indice di RevPar', calculations.monthly.map(c => c.indiceDiRevPar), calculations.totalIndiceDiRevPar, formatIndex, '!bg-indigo-50 dark:!bg-indigo-900/10 text-indigo-700 dark:text-indigo-300')}
                        <tr className="h-6 bg-gray-50 dark:bg-slate-900/30 border-b border-gray-200 dark:border-slate-700"><td colSpan={14}></td></tr>
                        {renderInputRow('Fatturato ANNO PRECEDENTE', budgetData.fatturatoAnnoPrecedente, calculations.totals.fatturatoAnnoPrecedente, formatCurrency, 'fatturatoAnnoPrecedente', { isCurrency: true })}
                        <tr className="h-2 bg-blue-500 dark:bg-blue-600"><td colSpan={14}></td></tr>
                    </tbody>
                     <tbody>
                        {renderRow('Business on the Books', Array(12).fill(0), 0, formatCurrency, '!bg-emerald-50/50 dark:!bg-emerald-900/10')}
                        {renderRow('Room Nights On the Books', Array(12).fill(0), 0, formatNumber, '!bg-emerald-50/50 dark:!bg-emerald-900/10')}
                        {renderRow('Occupazione On the Books', Array(12).fill(0), 0, formatPercentage, '!bg-emerald-50/50 dark:!bg-emerald-900/10')}
                    </tbody>
                </table>
            </div>

            {/* Log Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#141414] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isLogVisible ? 'translate-x-0' : 'translate-x-full'} border-l border-gray-200 dark:border-slate-700`}>
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#0d0d0d]">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Log Eventi</h3>
                        <button onClick={() => setIsLogVisible(false)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6">
                        <ul className="space-y-6">
                            {logEntries.map((entry, index) => (
                                <li key={index} className="relative pl-6 border-l-2 border-gray-200 dark:border-slate-700">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#141414] ${index === 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{entry.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 font-mono">
                                        {entry.timestamp.toLocaleDateString('it-IT')} - {entry.timestamp.toLocaleTimeString('it-IT')}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
             {isLogVisible && <div onClick={() => setIsLogVisible(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"></div>}
        </div>
    );
};

export default BudgetPlanner;
