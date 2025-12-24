import React, { useState, useMemo, useEffect } from 'react';
import { LockClosedIcon, LockOpenIcon, ClipboardListIcon, XIcon, ChatAltIcon } from './icons';
import type { Apartment, ForecastInputs } from '../types';

interface RollingForecastProps {
    apartments: Apartment[];
    year: number;
    forecastInputs: ForecastInputs;
    setForecastInputs: React.Dispatch<React.SetStateAction<ForecastInputs>>;
    forecastMonthlyUnits: number[];
    setForecastMonthlyUnits: React.Dispatch<React.SetStateAction<number[]>>;
}

interface LogEntry {
    timestamp: Date;
    description: string;
    comment?: string;
}

interface PendingChange {
    type: 'data' | 'units';
    dataType?: keyof ForecastInputs;
    index: number;
    oldValue: number;
    newValue: number;
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

const RollingForecast: React.FC<RollingForecastProps> = ({ 
    apartments, 
    year,
    forecastInputs,
    setForecastInputs,
    forecastMonthlyUnits,
    setForecastMonthlyUnits
 }) => {
    
    const [isBudgetLocked, setIsBudgetLocked] = useState(false);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [logEntries, setLogEntries] = useState<LogEntry[]>([{ timestamp: new Date(), description: "Sessione Rolling Forecast avviata." }]);
    
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
    const [comment, setComment] = useState('');
    const [fieldBeforeEdit, setFieldBeforeEdit] = useState<{
        type: 'data' | 'units';
        dataType?: keyof ForecastInputs;
        index: number;
        value: number;
    } | null>(null);

    const addLogEntry = (description: string, comment?: string) => {
        const newEntry: LogEntry = { timestamp: new Date(), description, comment };
        setLogEntries(prev => [newEntry, ...prev]);
    };
    
    const handleFocus = (type: 'data' | 'units', index: number, dataType?: keyof ForecastInputs) => {
        const value = type === 'units' ? forecastMonthlyUnits[index] : forecastInputs[dataType!][index];
        setFieldBeforeEdit({ type, index, dataType, value });
    };

    const handleValueChange = (type: 'data' | 'units', index: number, value: string, dataType?: keyof ForecastInputs) => {
        if (isBudgetLocked) return;
        
        if (type === 'units') {
            const numericValue = parseInt(value, 10);
            if (!isNaN(numericValue) && numericValue >= 0) {
                 setForecastMonthlyUnits(prev => {
                    const newUnits = [...prev];
                    newUnits[index] = numericValue;
                    return newUnits;
                });
            } else if (value === '') {
                 setForecastMonthlyUnits(prev => {
                    const newUnits = [...prev];
                    newUnits[index] = 0;
                    return newUnits;
                });
            }
        } else if (type === 'data' && dataType) {
            // Allow comma as decimal separator for user input
            const numericValue = parseFloat(value.replace(',', '.')) || 0;
             setForecastInputs(prev => {
                const newData = [...prev[dataType]];
                newData[index] = numericValue;
                return { ...prev, [dataType]: newData };
            });
        }
    };
    
    const handleBlur = (type: 'data' | 'units', index: number, dataType?: keyof ForecastInputs) => {
        if (isBudgetLocked || !fieldBeforeEdit) return;

        const oldValue = fieldBeforeEdit.value;
        const newValue = type === 'units' ? forecastMonthlyUnits[index] : forecastInputs[dataType!][index];

        if (oldValue !== newValue) {
            setPendingChange({ type, dataType, index, oldValue, newValue });
            setIsCommentModalVisible(true);
        }
        setFieldBeforeEdit(null);
    };

    const handleConfirmChange = () => {
        if (!pendingChange || !comment.trim()) {
            alert("Il commento è obbligatorio per salvare la modifica.");
            return;
        }
        
        addLogEntry(getChangeDescription(pendingChange), comment);

        setIsCommentModalVisible(false);
        setPendingChange(null);
        setComment('');
    };

    const handleCancelChange = () => {
        if (pendingChange) {
            const { type, dataType, index, oldValue } = pendingChange;
             if (type === 'units') {
                setForecastMonthlyUnits(prev => {
                    const newUnits = [...prev];
                    newUnits[index] = oldValue;
                    return newUnits;
                });
            } else if (type === 'data' && dataType) {
                 setForecastInputs(prev => {
                    const newData = [...prev[dataType]];
                    newData[index] = oldValue;
                    return { ...prev, [dataType]: newData };
                });
            }
        }
        setIsCommentModalVisible(false);
        setPendingChange(null);
        setComment('');
    };
    
    const getChangeDescription = (change: PendingChange | null): string => {
        if (!change) return '';
        const { type, dataType, index, oldValue, newValue } = change;
        
        let fieldName = '';
        let formatter: (val: any) => string = val => val.toString();

        if (type === 'units') {
            fieldName = 'Unità';
        } else if (dataType === 'percentualeOccupazionePrevista') {
            fieldName = 'Occupazione prevista';
            formatter = formatPercentage;
        } else if (dataType === 'adr') {
            fieldName = 'ADR';
            formatter = formatCurrency;
        } else if (dataType === 'fatturatoAnnoPrecedente') {
            fieldName = 'Fatturato Anno Precedente';
            formatter = formatCurrency;
        }

        return `Modifica ${fieldName} per ${months[index]} da ${formatter(oldValue)} a ${formatter(newValue)}`;
    };
    
    const handleLockToggle = () => {
        const newState = !isBudgetLocked;
        setIsBudgetLocked(newState);
        addLogEntry(newState ? "Forecast bloccato." : "Forecast sbloccato.");
    };
    
    const calculations = useMemo(() => {
        const monthlyCalculations = months.map((_, i) => {
            const daysInMonth = getDaysInMonth(i, year);
            const numberOfUnits = forecastMonthlyUnits[i] || 0;
            const occupazionePotenzialeMassima = numberOfUnits * daysInMonth;
            const percentualeOccupazione = forecastInputs.percentualeOccupazionePrevista[i] / 100;
            const adr = forecastInputs.adr[i];

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
            fatturatoAnnoPrecedente: forecastInputs.fatturatoAnnoPrecedente.reduce((sum, val) => sum + val, 0),
        };
        
        const totalPercentage = totals.occupazionePotenzialeMassima > 0 ? (totals.totaleCamereOccupate / totals.occupazionePotenzialeMassima) * 100 : 0;
        const totalAdr = totals.totaleCamereOccupate > 0 ? totals.obiettivo / totals.totaleCamereOccupate : 0;
        const totalRevPar = totals.occupazionePotenzialeMassima > 0 ? totals.obiettivo / totals.occupazionePotenzialeMassima : 0;
        const totalIndiceDiRevPar = totalRevPar > 0 ? totalAdr / totalRevPar : 0;

        return { monthly: monthlyCalculations, totals, totalPercentage, totalAdr, totalRevPar, totalIndiceDiRevPar };

    }, [forecastInputs, forecastMonthlyUnits, year]);


    const renderRow = (label: string, data: (number | string)[], total: number | string, formatter: (val: number) => string, customRowClass = "") => (
         <tr className={`border-b border-gray-100 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${customRowClass}`}>
            <td className={`sticky left-0 z-10 py-3 px-4 font-bold text-left text-xs text-gray-600 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-[#141414] border-r border-gray-100 dark:border-slate-700/50`}>{label}</td>
            <td className={`py-3 px-4 font-bold text-center text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-700/50`}>{typeof total === 'number' ? formatter(total) : total}</td>
            {data.map((val, i) => (
                <td key={i} className="py-3 px-4 text-center text-sm text-gray-700 dark:text-slate-300 border-r border-gray-100 dark:border-slate-700/50 last:border-0">{typeof val === 'number' ? formatter(val) : val}</td>
            ))}
        </tr>
    );
    
    const renderInputRow = (label: string, data: number[], total: number | string, formatter: (val: number) => string, type: keyof ForecastInputs, options: { isPercentage?: boolean, isCurrency?: boolean } = {}) => (
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
                            value={(val ?? '').toString().replace('.', ',')}
                            onFocus={() => handleFocus('data', i, type)}
                            onChange={(e) => handleValueChange('data', i, e.target.value, type)}
                            onBlur={() => handleBlur('data', i, type)}
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
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Rolling Forecast</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLockToggle}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all ${
                                isBudgetLocked
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                            }`}
                            aria-label={isBudgetLocked ? 'Sblocca forecast' : 'Blocca forecast'}
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
                             {forecastMonthlyUnits.map((units, i) => (
                                <td key={i} className="py-3 px-2 text-center text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 border-r border-gray-200 dark:border-slate-700 last:border-0">
                                     <input 
                                        type="number"
                                        value={units}
                                        onFocus={() => handleFocus('units', i)}
                                        onChange={(e) => handleValueChange('units', i, e.target.value)}
                                        onBlur={() => handleBlur('units', i)}
                                        readOnly={isBudgetLocked}
                                        className={`w-full bg-transparent text-center font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded p-1 dark:text-yellow-400 ${isBudgetLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                                    />
                                </td>
                             ))}
                        </tr>
                        {renderRow('Occupazione potenziale massima', calculations.monthly.map(c => c.occupazionePotenzialeMassima), calculations.totals.occupazionePotenzialeMassima, formatNumber)}
                        {renderInputRow('Occupazione prevista', forecastInputs.percentualeOccupazionePrevista, calculations.totalPercentage, formatPercentage, 'percentualeOccupazionePrevista', { isPercentage: true })}
                        {renderRow('Tot unità occupate per mese', calculations.monthly.map(c => c.totaleCamereOccupate), calculations.totals.totaleCamereOccupate, formatNumber)}
                        {renderInputRow('ADR', forecastInputs.adr, calculations.totalAdr, formatCurrency, 'adr', { isCurrency: true })}
                        {renderRow('Obiettivo', calculations.monthly.map(c => c.obiettivo), calculations.totals.obiettivo, formatCurrency, '!bg-green-50 dark:!bg-green-900/20 text-green-800 dark:text-green-300')}
                        {renderRow('RevPar', calculations.monthly.map(c => c.revPar), calculations.totalRevPar, formatRevPar)}
                        {renderRow('Indice di RevPar', calculations.monthly.map(c => c.indiceDiRevPar), calculations.totalIndiceDiRevPar, formatIndex, '!bg-indigo-50 dark:!bg-indigo-900/10 text-indigo-700 dark:text-indigo-300')}
                        <tr className="h-6 bg-gray-50 dark:bg-slate-900/30 border-b border-gray-200 dark:border-slate-700"><td colSpan={14}></td></tr>
                        {renderInputRow('Fatturato ANNO PRECEDENTE', forecastInputs.fatturatoAnnoPrecedente, calculations.totals.fatturatoAnnoPrecedente, formatCurrency, 'fatturatoAnnoPrecedente', { isCurrency: true })}
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
                                    {entry.comment && (
                                        <div className="mt-3 flex items-start gap-3 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                                            <ChatAltIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm italic text-gray-600 dark:text-slate-400">"{entry.comment}"</p>
                                        </div>
                                    )}
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

            {/* Comment Modal */}
            {isCommentModalVisible && pendingChange && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all border border-gray-200 dark:border-slate-600">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Conferma Modifica</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">{getChangeDescription(pendingChange)}</p>
                        <form onSubmit={(e) => { e.preventDefault(); handleConfirmChange(); }}>
                            <label htmlFor="comment" className="block text-sm font-bold text-gray-700 dark:text-slate-200 mb-2">
                                Commento (obbligatorio)
                            </label>
                            <textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                                autoFocus
                                placeholder="Inserisci il motivo della modifica..."
                            ></textarea>
                            <div className="mt-8 flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={handleCancelChange}
                                    className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-lg shadow-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={!comment.trim()}
                                >
                                    Conferma
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RollingForecast;
