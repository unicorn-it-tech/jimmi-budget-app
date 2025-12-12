import React, { useState } from 'react';
import { UsersIcon, ScaleIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface PressureLevelConfig {
    id: string;
    label: string;
    headerColor: string;
    borderColor: string;
    footerColor: string;
}

const pressureLevels: PressureLevelConfig[] = [
    { id: 'bassissima', label: 'BASSISSIMA', headerColor: 'bg-yellow-400', borderColor: 'border-yellow-400', footerColor: 'bg-yellow-400' },
    { id: 'bassa', label: 'BASSA', headerColor: 'bg-orange-400', borderColor: 'border-orange-400', footerColor: 'bg-orange-400' },
    { id: 'media', label: 'MEDIA', headerColor: 'bg-cyan-400', borderColor: 'border-cyan-400', footerColor: 'bg-cyan-400' },
    { id: 'alta', label: 'ALTA', headerColor: 'bg-green-500', borderColor: 'border-green-500', footerColor: 'bg-green-500' },
    { id: 'altissima', label: 'ALTISSIMA', headerColor: 'bg-red-600', borderColor: 'border-red-600', footerColor: 'bg-red-600' },
];

const TabellaPressione: React.FC = () => {
    const [step, setStep] = useLocalStorage<number>('budget-app-pressione-step', 10);
    const [numBars, setNumBars] = useLocalStorage<number>('budget-app-pressione-bars', 5);
    const [baseRates, setBaseRates] = useLocalStorage<Record<string, number>>('budget-app-pressione-rates', {
        bassissima: 60,
        bassa: 65,
        media: 75,
        alta: 110,
        altissima: 150,
    });

    const handleBaseRateChange = (id: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setBaseRates(prev => ({ ...prev, [id]: numValue }));
        } else if (value === '') {
             setBaseRates(prev => ({ ...prev, [id]: 0 }));
        }
    };

    const handleStepChange = (value: string) => {
         const numValue = parseFloat(value);
         if (!isNaN(numValue)) {
             setStep(numValue);
         } else if (value === '') {
             setStep(0);
         }
    }

    const handleNumBarsChange = (value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
            setNumBars(numValue);
        }
   }

    const formatCurrency = (val: number) => `€ ${val}`;

    return (
        <div className="p-6 space-y-8">
            {/* Header Section - Darker background for contrast */}
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center border border-slate-700">
                <div className="mb-4 md:mb-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg">
                             <ScaleIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Tabella Tariffaria</h2>
                            <p className="text-slate-400 text-sm mt-1">Configura le tariffe base e la struttura dinamica dei prezzi.</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-4 flex-wrap justify-center md:justify-end">
                    <div className="flex flex-col items-end">
                         <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Numero BAR</label>
                        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-600">
                            <input
                                type="number"
                                value={numBars}
                                onChange={(e) => handleNumBarsChange(e.target.value)}
                                className="w-16 bg-transparent text-cyan-400 text-center font-bold text-lg focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Step Incrementale (€)</label>
                        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-600">
                            <input
                                type="number"
                                value={step}
                                onChange={(e) => handleStepChange(e.target.value)}
                                className="w-20 bg-transparent text-cyan-400 text-center font-bold text-lg focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {pressureLevels.map((level) => {
                    const baseRate = baseRates[level.id] || 0;
                    return (
                        <div key={level.id} className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col transform transition-transform hover:-translate-y-1">
                            {/* Card Header */}
                            <div className={`${level.headerColor} py-4 px-4 text-center shadow-md relative z-10`}>
                                <h3 className="text-slate-900 font-black text-lg tracking-widest">{level.label}</h3>
                            </div>

                            {/* Base Rate Input Area */}
                            <div className="p-6 flex flex-col items-center border-b border-slate-800 bg-[#1e293b]">
                                <label className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Tariffa di Partenza</label>
                                <div className="relative w-full max-w-[120px]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-medium">€</span>
                                    <input
                                        type="number"
                                        value={baseRate}
                                        onChange={(e) => handleBaseRateChange(level.id, e.target.value)}
                                        className="w-full bg-slate-900 text-white text-center text-2xl font-bold py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Calculation List */}
                            <div className="p-4 flex-grow space-y-3 bg-[#0f172a]">
                                {Array.from({ length: numBars }, (_, i) => i + 1).map((i) => (
                                    <div key={i} className="flex justify-between items-center text-sm group px-2 py-1 rounded hover:bg-white/5 transition-colors">
                                        <span className="text-slate-500 font-semibold group-hover:text-slate-300 transition-colors text-xs uppercase tracking-wide">BAR {i}</span>
                                        <span className="text-slate-200 font-bold text-base">{formatCurrency(baseRate + (step * i))}</span>
                                    </div>
                                ))}
                                
                                <div className="h-px bg-slate-800 my-3 mx-2"></div>
                                
                                <div className="flex justify-between items-center py-2 px-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Rack Rate</span>
                                    <span className={`${level.headerColor.replace('bg-', 'text-')} font-black text-xl`}>
                                        {formatCurrency(baseRate + (step * (numBars + 1)))}
                                    </span>
                                </div>
                            </div>

                            {/* Footer Line */}
                            <div className={`h-1.5 ${level.footerColor}`}></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TabellaPressione;