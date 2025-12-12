import React, { useState, useMemo } from 'react';
import type { MonthlyData, Apartment } from '../types';
import { ChartIcon, UsersIcon, ChevronLeftIcon, PlusCircleIcon, TrashIcon, BuildingIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CostiProps {
    forecastRevenue: MonthlyData | null;
    availableNightsData: MonthlyData | null;
    forecastSoldNightsData: MonthlyData | null;
    apartments: Apartment[];
}

const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '€ 0,00';
    return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0,00%';
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

interface FixedCost {
    id: number;
    name: string;
    annualAmount: number;
}

interface VariableCost {
    id: number;
    name: string;
    type: 'variabile' | 'percentuale' | 'semivariabile';
    values: number[]; // 13 elements: total/rate + 12 months
}

const AnalisiComplessiva: React.FC<{ 
    forecastRevenue: MonthlyData | null; 
    availableNightsData: MonthlyData | null;
    forecastSoldNightsData: MonthlyData | null;
    onBack: () => void; 
}> = ({ forecastRevenue, availableNightsData, forecastSoldNightsData, onBack }) => {
    const [showMonths, setShowMonths] = useState(false);

    const [fixedCosts, setFixedCosts] = useLocalStorage<FixedCost[]>('budget-app-costi-fixed', [
        { id: 100, name: 'Affitto', annualAmount: 24000 },
    ]);
    const [variableCosts, setVariableCosts] = useLocalStorage<VariableCost[]>('budget-app-costi-variable', [
        { id: 200, name: 'Commissioni OTA', type: 'percentuale', values: [15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { id: 201, name: 'Utenze', type: 'variabile', values: [3950, 200, 220, 250, 300, 350, 400, 450, 400, 300, 250, 220, 210] },
    ]);

    const handleFixedCostChange = (id: number, field: 'name' | 'annualAmount', value: string) => {
        const newCosts = fixedCosts.map(cost => {
            if (cost.id === id) {
                if (field === 'name') {
                    return { ...cost, name: value };
                }
                const numValue = parseFloat(value.replace(',', '.')) || 0;
                return { ...cost, annualAmount: numValue };
            }
            return cost;
        });
        setFixedCosts(newCosts);
    };

    const addFixedCost = () => {
        setFixedCosts([...fixedCosts, { id: Date.now(), name: 'Nuovo Costo Fisso', annualAmount: 0 }]);
    };

    const removeFixedCost = (id: number) => {
        setFixedCosts(fixedCosts.filter(cost => cost.id !== id));
    };

    const handleVariableCostChange = (id: number, field: 'name' | 'type', value: string) => {
        const newCosts = variableCosts.map(cost => {
            if (cost.id === id) {
                if (field === 'type' && value !== cost.type) {
                     return { ...cost, [field]: value as VariableCost['type'], values: Array(13).fill(0) };
                }
                return { ...cost, [field]: value as any };
            }
            return cost;
        });
        setVariableCosts(newCosts);
    };
    
    const handleVariableCostValueChange = (id: number, index: number, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        const newCosts = variableCosts.map(cost => {
            if (cost.id === id) {
                const newValues = [...cost.values];
                newValues[index] = numValue;
                // Recalculate total for 'variabile' type
                if (cost.type !== 'percentuale') {
                    newValues[0] = newValues.slice(1).reduce((sum, v) => sum + v, 0);
                }
                return { ...cost, values: newValues };
            }
            return cost;
        });
        setVariableCosts(newCosts);
    };

    const addVariableCost = () => {
        setVariableCosts([...variableCosts, { id: Date.now(), name: 'Nuovo Costo Variabile', type: 'variabile', values: Array(13).fill(0) }]);
    };

    const removeVariableCost = (id: number) => {
        setVariableCosts(variableCosts.filter(cost => cost.id !== id));
    };

    const calculations = useMemo(() => {
        const revenueValues = forecastRevenue?.values || Array(13).fill(0);
        const availableNights = availableNightsData?.values || Array(13).fill(0);
        const forecastSoldNights = forecastSoldNightsData?.values || Array(13).fill(0);

        const totalFixedAnnual = fixedCosts.reduce((sum, cost) => sum + cost.annualAmount, 0);
        const totalFixedMonthly = Array(12).fill(totalFixedAnnual / 12);

        const variableCostsDetails = variableCosts.map(cost => {
            const monthlyValues = Array(12).fill(0);
            let annualTotal = 0;
            if (cost.type === 'percentuale') {
                const rate = cost.values[0] || 0;
                for (let i = 0; i < 12; i++) {
                    monthlyValues[i] = revenueValues[i + 1] * (rate / 100);
                }
                annualTotal = monthlyValues.reduce((sum, v) => sum + v, 0);
            } else {
                for (let i = 0; i < 12; i++) {
                    monthlyValues[i] = cost.values[i + 1] || 0;
                }
                annualTotal = cost.values[0];
            }
            return { ...cost, monthlyValues, annualTotal };
        });

        const totalVariableMonthly = Array(12).fill(0).map((_, i) => variableCostsDetails.reduce((sum, cost) => sum + cost.monthlyValues[i], 0));
        const totalVariableAnnual = variableCostsDetails.reduce((sum, cost) => sum + cost.annualTotal, 0);

        const totalCostsMonthly = totalFixedMonthly.map((v, i) => v + totalVariableMonthly[i]);
        const totalCostsAnnual = totalFixedAnnual + totalVariableAnnual;

        const marginMonthly = revenueValues.slice(1).map((rev, i) => rev - totalCostsMonthly[i]);
        const marginAnnual = revenueValues[0] - totalCostsAnnual;

        const marginPercentageMonthly = revenueValues.slice(1).map((rev, i) => rev > 0 ? (marginMonthly[i] / rev) * 100 : 0);
        const marginPercentageAnnual = revenueValues[0] > 0 ? (marginAnnual / revenueValues[0]) * 100 : 0;
        
        const totalFixedMonthlyWithTotal = [totalFixedAnnual, ...totalFixedMonthly];
        const totalVariableMonthlyWithTotal = [totalVariableAnnual, ...totalVariableMonthly];
        const totalCostsWithTotal = [totalCostsAnnual, ...totalCostsMonthly];

        const costoUnitarioDisponibili = Array(13).fill(0).map((_, i) =>
            availableNights[i] > 0 ? totalFixedMonthlyWithTotal[i] / availableNights[i] : 0
        );

        const costoUnitarioVendute = Array(13).fill(0).map((_, i) =>
            forecastSoldNights[i] > 0 ? totalVariableMonthlyWithTotal[i] / forecastSoldNights[i] : 0
        );
        
        const bottomRate = Array(13).fill(0).map((_, i) =>
            forecastSoldNights[i] > 0 ? totalCostsWithTotal[i] / forecastSoldNights[i] : 0
        );


        return {
            revenueValues,
            totalFixedMonthly: totalFixedMonthlyWithTotal,
            totalVariableMonthly: totalVariableMonthlyWithTotal,
            totalCosts: totalCostsWithTotal,
            margin: [marginAnnual, ...marginMonthly],
            marginPercentage: [marginPercentageAnnual, ...marginPercentageMonthly],
            variableCostsDetails,
            costoUnitarioDisponibili,
            costoUnitarioVendute,
            bottomRate,
        };
    }, [fixedCosts, variableCosts, forecastRevenue, availableNightsData, forecastSoldNightsData]);

    const inputClasses = "w-full bg-transparent text-right focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 rounded p-1";

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200 transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" />
                    TORNA ALLA SELEZIONE
                </button>
                <button
                    onClick={() => setShowMonths(!showMonths)}
                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900 transition-all"
                >
                    {showMonths ? 'NASCONDI' : 'MOSTRA'} DETTAGLIO MESI
                </button>
            </div>
            
            {/* Costi Fissi */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Costi Fissi</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700">
                                <th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Voce di Costo</th>
                                <th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Totale Annuo</th>
                                {showMonths && months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {fixedCosts.map(cost => (
                                <tr key={cost.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-3 flex items-center gap-2">
                                        <button onClick={() => removeFixedCost(cost.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                                        <input type="text" value={cost.name} onChange={e => handleFixedCostChange(cost.id, 'name', e.target.value)} className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 rounded p-1 text-gray-700 dark:text-slate-200 font-medium" />
                                    </td>
                                    <td className="p-3"><input type="text" value={cost.annualAmount.toString().replace('.', ',')} onChange={e => handleFixedCostChange(cost.id, 'annualAmount', e.target.value)} className={`${inputClasses} font-bold text-gray-800 dark:text-slate-200`} /></td>
                                    {showMonths && Array(12).fill(0).map((_, i) => <td key={i} className="p-3 text-right text-gray-600 dark:text-slate-400">{formatCurrency(cost.annualAmount / 12)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 dark:bg-slate-900/30 font-bold">
                                <td className="p-3"><button onClick={addFixedCost} className="flex items-center gap-2 text-primary hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors text-sm font-bold uppercase tracking-wide"><PlusCircleIcon className="w-5 h-5" /> Aggiungi</button></td>
                                <td className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(calculations.totalFixedMonthly[0])}</td>
                                {showMonths && calculations.totalFixedMonthly.slice(1).map((total, i) => <td key={i} className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(total)}</td>)}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Costi Variabili */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Costi Variabili</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700">
                                <th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce di Costo</th>
                                <th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-[150px]">Tipo</th>
                                <th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-[120px]">Totale / Tasso %</th>
                                {showMonths && months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {calculations.variableCostsDetails.map(cost => (
                                <tr key={cost.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-3 flex items-center gap-2">
                                        <button onClick={() => removeVariableCost(cost.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                                        <input type="text" value={cost.name} onChange={e => handleVariableCostChange(cost.id, 'name', e.target.value)} className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 rounded p-1 text-gray-700 dark:text-slate-200 font-medium" />
                                    </td>
                                    <td className="p-3">
                                        <select value={cost.type} onChange={e => handleVariableCostChange(cost.id, 'type', e.target.value)} className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 rounded p-1 text-gray-600 dark:text-slate-300">
                                            <option value="variabile">Variabile</option>
                                            <option value="percentuale">Percentuale</option>
                                            <option value="semivariabile">Semivariabile</option>
                                        </select>
                                    </td>
                                    <td className="p-3 text-right font-semibold">
                                        {cost.type === 'percentuale'
                                            ? <input type="text" value={cost.values[0].toString().replace('.', ',')} onChange={e => handleVariableCostValueChange(cost.id, 0, e.target.value)} className={`${inputClasses} text-gray-800 dark:text-slate-200`} />
                                            : formatCurrency(cost.annualTotal)
                                        }
                                    </td>
                                    {showMonths && cost.monthlyValues.map((val, i) => (
                                        <td key={i} className="p-3">
                                            {cost.type === 'percentuale'
                                                ? <span className="text-gray-500 dark:text-slate-500 block text-right text-xs">{formatCurrency(val)}</span>
                                                : <input type="text" value={cost.values[i+1].toString().replace('.', ',')} onChange={e => handleVariableCostValueChange(cost.id, i + 1, e.target.value)} className={`${inputClasses} text-gray-600 dark:text-slate-400`} />
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                         <tfoot>
                            <tr className="bg-gray-50 dark:bg-slate-900/30 font-bold">
                                <td className="p-3" colSpan={2}><button onClick={addVariableCost} className="flex items-center gap-2 text-primary hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors text-sm font-bold uppercase tracking-wide"><PlusCircleIcon className="w-5 h-5" /> Aggiungi</button></td>
                                <td className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(calculations.totalVariableMonthly[0])}</td>
                                {showMonths && calculations.totalVariableMonthly.slice(1).map((total, i) => <td key={i} className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(total)}</td>)}
                            </tr>
                             <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                                <td className="p-3 font-bold text-blue-800 dark:text-blue-300" colSpan={2}>Costo unitario su notti disponibili</td>
                                <td className="p-3 text-right font-bold text-blue-900 dark:text-white">{formatCurrency(calculations.costoUnitarioDisponibili[0])}</td>
                                {showMonths && calculations.costoUnitarioDisponibili.slice(1).map((val, i) => <td key={i} className="p-3 text-right font-bold text-blue-900 dark:text-blue-100">{formatCurrency(val)}</td>)}
                            </tr>
                            <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                                <td className="p-3 font-bold text-blue-800 dark:text-blue-300" colSpan={2}>Costo unitario su notti vendute</td>
                                <td className="p-3 text-right font-bold text-blue-900 dark:text-white">{formatCurrency(calculations.costoUnitarioVendute[0])}</td>
                                {showMonths && calculations.costoUnitarioVendute.slice(1).map((val, i) => <td key={i} className="p-3 text-right font-bold text-blue-900 dark:text-blue-100">{formatCurrency(val)}</td>)}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

             {/* Riepilogo Redditività */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Riepilogo Redditività</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700">
                                <th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce</th>
                                <th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-[150px]">Totale Annuo</th>
                                {showMonths && months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><td className="p-3 font-bold text-gray-800 dark:text-slate-200">{`Fatturato Previsto (${new Date().getFullYear()})`}</td><td className="p-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(calculations.revenueValues[0])}</td>{showMonths && calculations.revenueValues.slice(1).map((rev, i) => <td key={i} className="p-3 text-right font-medium text-gray-700 dark:text-slate-300">{formatCurrency(rev)}</td>)}</tr>
                            <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><td className="p-3 text-gray-600 dark:text-slate-400 pl-6">Totale Costi Fissi</td><td className="p-3 text-right text-gray-600 dark:text-slate-400">{formatCurrency(calculations.totalFixedMonthly[0])}</td>{showMonths && calculations.totalFixedMonthly.slice(1).map((cost, i) => <td key={i} className="p-3 text-right text-gray-500 dark:text-slate-500">{formatCurrency(cost)}</td>)}</tr>
                            <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><td className="p-3 text-gray-600 dark:text-slate-400 pl-6">Totale Costi Variabili</td><td className="p-3 text-right text-gray-600 dark:text-slate-400">{formatCurrency(calculations.totalVariableMonthly[0])}</td>{showMonths && calculations.totalVariableMonthly.slice(1).map((cost, i) => <td key={i} className="p-3 text-right text-gray-500 dark:text-slate-500">{formatCurrency(cost)}</td>)}</tr>
                            <tr className="border-b-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/30"><td className="p-3 font-bold text-gray-800 dark:text-white">Totale Costi</td><td className="p-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(calculations.totalCosts[0])}</td>{showMonths && calculations.totalCosts.slice(1).map((cost, i) => <td key={i} className="p-3 text-right font-bold text-gray-700 dark:text-slate-300">{formatCurrency(cost)}</td>)}</tr>
                            <tr className="font-bold bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"><td className="p-3">Margine di Guadagno (€)</td><td className="p-3 text-right">{formatCurrency(calculations.margin[0])}</td>{showMonths && calculations.margin.slice(1).map((margin, i) => <td key={i} className="p-3 text-right">{formatCurrency(margin)}</td>)}</tr>
                            <tr className="font-bold bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200"><td className="p-3">Margine di Guadagno (%)</td><td className="p-3 text-right">{formatPercentage(calculations.marginPercentage[0])}</td>{showMonths && calculations.marginPercentage.slice(1).map((margin, i) => <td key={i} className="p-3 text-right">{formatPercentage(margin)}</td>)}</tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tariffa Bottom Rate */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Tariffa Bottom Rate</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700">
                                <th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce</th>
                                <th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-[150px]">Media Annuale</th>
                                {showMonths && months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                                <td className="p-3">Tariffa minima per notte venduta</td>
                                <td className="p-3 text-right">{formatCurrency(calculations.bottomRate[0])}</td>
                                {showMonths && calculations.bottomRate.slice(1).map((rate, i) => <td key={i} className="p-3 text-right">{formatCurrency(rate)}</td>)}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AnalisiSelettiva: React.FC<{ apartments: Apartment[]; onBack: () => void; }> = ({ apartments, onBack }) => {
    const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
    const [allCosts, setAllCosts] = useLocalStorage<Record<number, { fixedCosts: FixedCost[], variableCosts: VariableCost[] }>>('budget-app-costi-selettiva', {});
    const [nottiAperte, setNottiAperte] = useLocalStorage<Record<number, number[]>>('budget-app-costi-selettiva-notti', {});

    const currentCosts = selectedApt ? allCosts[selectedApt.id] || { fixedCosts: [], variableCosts: [] } : { fixedCosts: [], variableCosts: [] };
    const currentNottiAperte = selectedApt ? nottiAperte[selectedApt.id] || Array(12).fill(0) : Array(12).fill(0);

    const handleNottiAperteChange = (aptId: number, monthIndex: number, value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) && value !== '') return;

        const currentNotti = nottiAperte[aptId] || Array(12).fill(0);
        const newNotti = [...currentNotti];
        newNotti[monthIndex] = isNaN(numValue) ? 0 : numValue;
        setNottiAperte(prev => ({ ...prev, [aptId]: newNotti }));
    };

    const handleFixedCostChange = (aptId: number, costId: number, field: 'name' | 'annualAmount', value: string) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const updatedFixedCosts = aptCurrentCosts.fixedCosts.map(cost => {
            if (cost.id === costId) {
                const newValue = field === 'name' ? value : (parseFloat(value.replace(',', '.')) || 0);
                return { ...cost, [field]: newValue };
            }
            return cost;
        });
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, fixedCosts: updatedFixedCosts } }));
    };
    
    const addFixedCost = (aptId: number) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const newCost = { id: Date.now(), name: 'Nuovo Costo Fisso', annualAmount: 0 };
        const updatedFixedCosts = [...aptCurrentCosts.fixedCosts, newCost];
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, fixedCosts: updatedFixedCosts } }));
    };

    const removeFixedCost = (aptId: number, costId: number) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const updatedFixedCosts = aptCurrentCosts.fixedCosts.filter(c => c.id !== costId);
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, fixedCosts: updatedFixedCosts } }));
    };

    const handleVariableCostChange = (aptId: number, costId: number, field: 'name' | 'type', value: string) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const updatedVariableCosts = aptCurrentCosts.variableCosts.map(cost => {
            if (cost.id === costId) {
                if (field === 'type' && value !== cost.type) {
                     return { ...cost, [field]: value as VariableCost['type'], values: Array(13).fill(0) };
                }
                return { ...cost, [field]: value as any };
            }
            return cost;
        });
         setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, variableCosts: updatedVariableCosts } }));
    };

    const handleVariableCostValueChange = (aptId: number, costId: number, index: number, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const updatedVariableCosts = aptCurrentCosts.variableCosts.map(cost => {
            if (cost.id === costId) {
                const newValues = [...cost.values];
                newValues[index] = numValue;
                if (cost.type !== 'percentuale') { // 'percentuale' non è usata qui ma manteniamo la logica
                    newValues[0] = newValues.slice(1).reduce((s, v) => s + v, 0);
                }
                return { ...cost, values: newValues };
            }
            return cost;
        });
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, variableCosts: updatedVariableCosts } }));
    };

    const addVariableCost = (aptId: number) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const newCost = { id: Date.now(), name: 'Nuovo Costo', type: 'variabile' as const, values: Array(13).fill(0) };
        const updatedVariableCosts = [...aptCurrentCosts.variableCosts, newCost];
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, variableCosts: updatedVariableCosts } }));
    };

    const removeVariableCost = (aptId: number, costId: number) => {
        const aptCurrentCosts = allCosts[aptId] || { fixedCosts: [], variableCosts: [] };
        const updatedVariableCosts = aptCurrentCosts.variableCosts.filter(c => c.id !== costId);
        setAllCosts(prev => ({ ...prev, [aptId]: { ...aptCurrentCosts, variableCosts: updatedVariableCosts } }));
    };


    const calculations = useMemo(() => {
        if (!selectedApt) return null;
        const costs = allCosts[selectedApt.id] || { fixedCosts: [], variableCosts: [] };
        const aptNottiAperte = nottiAperte[selectedApt.id] || Array(12).fill(0);

        const totalFixedAnnual = costs.fixedCosts.reduce((sum, cost) => sum + cost.annualAmount, 0);
        const totalFixedMonthly = Array(12).fill(totalFixedAnnual / 12);
        
        const totalVariableAnnual = costs.variableCosts.reduce((sum, cost) => sum + cost.values[0], 0);
        const totalVariableMonthly = Array(12).fill(0).map((_, i) => costs.variableCosts.reduce((sum, cost) => sum + cost.values[i + 1], 0));

        const totalCostsAnnual = totalFixedAnnual + totalVariableAnnual;
        const totalCostsMonthly = totalFixedMonthly.map((v, i) => v + totalVariableMonthly[i]);

        const totalNottiAperteAnnual = aptNottiAperte.reduce((sum, val) => sum + val, 0);

        const bottomRateMonthly = totalCostsMonthly.map((cost, i) => 
            aptNottiAperte[i] > 0 ? cost / aptNottiAperte[i] : 0
        );

        const bottomRateAnnual = totalNottiAperteAnnual > 0 ? totalCostsAnnual / totalNottiAperteAnnual : 0;

        return {
            totalFixed: [totalFixedAnnual, ...totalFixedMonthly],
            totalVariable: [totalVariableAnnual, ...totalVariableMonthly],
            total: [totalCostsAnnual, ...totalCostsMonthly],
            nottiAperte: [totalNottiAperteAnnual, ...aptNottiAperte],
            bottomRate: [bottomRateAnnual, ...bottomRateMonthly]
        };
    }, [selectedApt, allCosts, nottiAperte]);

    if (!selectedApt) {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold text-primary hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200 transition-colors uppercase tracking-wide">
                    <ChevronLeftIcon className="w-5 h-5" />
                    Torna alla selezione
                 </button>
                 <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-6 tracking-tight">Seleziona una Struttura</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                     {apartments.map(apt => (
                         <button 
                            key={apt.id}
                            onClick={() => setSelectedApt(apt)}
                            className="group flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-teal-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                         >
                            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-primary/10 transition-colors">
                                <BuildingIcon className="w-10 h-10 text-gray-500 dark:text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-bold text-lg text-gray-800 dark:text-slate-200 group-hover:text-primary transition-colors">{apt.name}</span>
                         </button>
                     ))}
                 </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
             <button onClick={() => setSelectedApt(null)} className="flex items-center gap-2 mb-6 text-sm font-bold text-primary hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200 uppercase tracking-wide transition-colors">
                <ChevronLeftIcon className="w-5 h-5" />
                Torna all'elenco Strutture
             </button>
             <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-8 tracking-tight">Gestione Costi: <span className="text-primary">{selectedApt.name}</span></h2>
             
             {/* Costi Fissi */}
             <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Costi Fissi</h3>
                <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700"><th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Voce di Costo</th><th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Totale Annuo</th></tr></thead>
                    <tbody>
                        {currentCosts.fixedCosts.map(c => (
                            <tr key={c.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"><td className="p-3 flex items-center gap-2"><button onClick={() => removeFixedCost(selectedApt.id, c.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button><input type="text" value={c.name} onChange={e => handleFixedCostChange(selectedApt.id, c.id, 'name', e.target.value)} className="w-full bg-transparent p-1 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 text-gray-800 dark:text-slate-200 font-medium"/></td><td className="p-3"><input type="text" value={c.annualAmount.toString().replace('.',',')} onChange={e => handleFixedCostChange(selectedApt.id, c.id, 'annualAmount', e.target.value)} className="w-full bg-transparent p-1 rounded text-right focus:outline-none focus:ring-1 focus:ring-primary text-gray-800 dark:text-slate-200 font-bold"/></td></tr>
                        ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 dark:bg-slate-900/30 font-bold"><td className="p-3"><button onClick={() => addFixedCost(selectedApt.id)} className="flex items-center gap-2 text-primary hover:text-teal-600 dark:text-teal-400 transition-colors text-sm font-bold uppercase tracking-wide"><PlusCircleIcon className="w-5 h-5"/> Aggiungi</button></td><td className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(calculations?.totalFixed[0] || 0)}</td></tr></tfoot>
                </table>
            </div>

            {/* Costi Variabili */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Costi Variabili</h3>
                <table className="w-full text-sm min-w-[1200px]">
                    <thead><tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700"><th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce</th><th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Totale</th>{months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{m}</th>)}</tr></thead>
                    <tbody>
                        {currentCosts.variableCosts.map(c => (
                             <tr key={c.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"><td className="p-3 flex items-center gap-2"><button onClick={() => removeVariableCost(selectedApt.id, c.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button><input type="text" value={c.name} onChange={e => handleVariableCostChange(selectedApt.id, c.id, 'name', e.target.value)} className="w-full bg-transparent p-1 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 text-gray-800 dark:text-slate-200 font-medium"/></td><td className="p-3 text-right font-bold text-gray-800 dark:text-slate-200">{formatCurrency(c.values[0])}</td>{c.values.slice(1).map((val, i) => <td key={i} className="p-3"><input type="text" value={val.toString().replace('.',',')} onChange={e => handleVariableCostValueChange(selectedApt.id, c.id, i + 1, e.target.value)} className="w-full bg-transparent p-1 rounded text-right focus:outline-none focus:ring-1 focus:ring-primary text-gray-600 dark:text-slate-400"/></td>)}</tr>
                        ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 dark:bg-slate-900/30 font-bold"><td className="p-3"><button onClick={() => addVariableCost(selectedApt.id)} className="flex items-center gap-2 text-primary hover:text-teal-600 dark:text-teal-400 transition-colors text-sm font-bold uppercase tracking-wide"><PlusCircleIcon className="w-5 h-5"/> Aggiungi</button></td><td className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(calculations?.totalVariable[0] || 0)}</td>{calculations?.totalVariable.slice(1).map((val, i) => <td key={i} className="p-3 text-right text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-600">{formatCurrency(val)}</td>)}</tr></tfoot>
                </table>
            </div>
            
            {/* Riepilogo Costi Struttura */}
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Riepilogo Costi: {selectedApt.name}</h3>
                 <table className="w-full text-sm min-w-[1200px]">
                     <thead><tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700"><th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce</th><th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Totale Annuo</th>{months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{m}</th>)}</tr></thead>
                     <tbody>
                        <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><td className="p-3 pl-6 text-gray-600 dark:text-slate-300">Costi Fissi</td><td className="p-3 text-right font-medium text-gray-700 dark:text-slate-300">{formatCurrency(calculations?.totalFixed[0] || 0)}</td>{calculations?.totalFixed.slice(1).map((val, i) => <td key={i} className="p-3 text-right text-gray-500 dark:text-slate-500">{formatCurrency(val)}</td>)}</tr>
                        <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><td className="p-3 pl-6 text-gray-600 dark:text-slate-300">Costi Variabili</td><td className="p-3 text-right font-medium text-gray-700 dark:text-slate-300">{formatCurrency(calculations?.totalVariable[0] || 0)}</td>{calculations?.totalVariable.slice(1).map((val, i) => <td key={i} className="p-3 text-right text-gray-500 dark:text-slate-500">{formatCurrency(val)}</td>)}</tr>
                        <tr className="font-bold bg-green-50 dark:bg-green-900/20 border-t-2 border-gray-200 dark:border-slate-600 text-green-900 dark:text-green-300"><td className="p-3">Totale Costi</td><td className="p-3 text-right">{formatCurrency(calculations?.total[0] || 0)}</td>{calculations?.total.slice(1).map((val, i) => <td key={i} className="p-3 text-right">{formatCurrency(val)}</td>)}</tr>
                     </tbody>
                 </table>
            </div>

             {/* Analisi Redditività */}
             <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Analisi Redditività: {selectedApt.name}</h3>
                 <table className="w-full text-sm min-w-[1200px]">
                     <thead><tr className="bg-gray-50 dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-700"><th className="p-3 text-left font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Voce</th><th className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Totale Annuo</th>{months.map(m => <th key={m} className="p-3 text-right font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{m}</th>)}</tr></thead>
                     <tbody>
                        <tr className="bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-slate-700">
                            <td className="p-3 font-bold text-yellow-900 dark:text-yellow-500">Notti Aperte</td>
                            <td className="p-3 text-right font-bold text-yellow-900 dark:text-yellow-500">{calculations?.nottiAperte[0] || 0}</td>
                            {currentNottiAperte.map((val, i) => (
                                <td key={i} className="p-3">
                                    <input 
                                        type="number" 
                                        value={val || ''} 
                                        onChange={e => handleNottiAperteChange(selectedApt.id, i, e.target.value)} 
                                        className="w-full bg-white dark:bg-slate-800 p-1 rounded text-right focus:outline-none focus:ring-2 focus:ring-yellow-400 text-yellow-900 dark:text-yellow-400 font-semibold shadow-sm"
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr className="font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300">
                            <td className="p-3">Bottom Rate (Costo per notte aperta)</td>
                            <td className="p-3 text-right">{formatCurrency(calculations?.bottomRate[0] || 0)}</td>
                            {calculations?.bottomRate.slice(1).map((val, i) => <td key={i} className="p-3 text-right">{formatCurrency(val)}</td>)}
                        </tr>
                     </tbody>
                 </table>
            </div>

        </div>
    );
};


const Costi: React.FC<CostiProps> = ({ forecastRevenue, availableNightsData, forecastSoldNightsData, apartments }) => {
    const [analysisType, setAnalysisType] = useState<'selection' | 'complessiva' | 'selettiva'>('selection');

    if (analysisType === 'selection') {
        return (
            <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center min-h-full">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white mb-6 tracking-tight">
                        Analisi dei Costi
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 leading-relaxed">
                        Scegli la modalità di analisi che preferisci per esplorare la struttura dei costi della tua attività con precisione e dettaglio.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                    <button
                        onClick={() => setAnalysisType('complessiva')}
                        className="group flex flex-col items-center justify-center text-center p-10 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-teal-400 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                    >
                        <div className="bg-primary/10 p-6 rounded-full mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                            <ChartIcon className="w-16 h-16 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Analisi Costi Complessiva
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                           In questa sezione i costi saranno spalmati su ogni unità gestendo la struttura dei costi come se fosse unificata.
                        </p>
                    </button>
                    <button
                        onClick={() => setAnalysisType('selettiva')}
                        className="group flex flex-col items-center justify-center text-center p-10 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-teal-400 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                    >
                         <div className="bg-primary/10 p-6 rounded-full mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                            <UsersIcon className="w-16 h-16 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Analisi Costi Selettiva
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                           L'analisi dei costi selettiva ti permette di vedere i costi di ogni singola struttura calcolando la sua specifica bottom rate.
                        </p>
                    </button>
                </div>
            </div>
        );
    }
    
    if (analysisType === 'complessiva') {
         return <AnalisiComplessiva 
            forecastRevenue={forecastRevenue} 
            availableNightsData={availableNightsData}
            forecastSoldNightsData={forecastSoldNightsData}
            onBack={() => setAnalysisType('selection')} 
        />;
    }

    if (analysisType === 'selettiva') {
        return <AnalisiSelettiva apartments={apartments} onBack={() => setAnalysisType('selection')} />;
    }

    return null;
};

export default Costi;