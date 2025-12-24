import React, { useMemo, useState, useRef, useEffect } from 'react';
import { XCircleIcon } from './icons';

interface Apartment {
    id: number;
    name: string;
}

interface Day {
    dayNum: number;
    dayLetter: string;
    isWeekend: boolean;
}

interface DailyCalculation {
    revenue: number;
    soldNights: number;
    revPar: number;
    adr: number;
}

interface PressureSetting {
    level: string;
    min: number;
    max: number;
    color: string;
    label: string;
}

interface RateStrategyData {
    pressureSettings: PressureSetting[];
    occupancy: number[];
    masterPrices: number[];
    prices: { [key: string]: number[] };
    apartmentBaseRates: { [key: string]: string | number };
    pressureColors: string[];
}

interface RateStrategyPlannerProps {
    apartments: Apartment[];
    days: Day[];
    dailyCalculations: DailyCalculation[];
    rateStrategyData: RateStrategyData;
    formatNumber: (num: number, options?: any) => string;
    onDataChange: (
        type: 'occupancy' | 'masterPrice' | 'baseRate',
        dayIndex: number | null,
        aptName: string | null,
        newValue: string
    ) => void;
    onPressureSettingChange: (level: string, newColor: string) => void;
    onPressureColorChange: (dayIndex: number, newColor: string) => void;
}

const RateStrategyPlanner: React.FC<RateStrategyPlannerProps> = ({
    apartments,
    days,
    dailyCalculations,
    rateStrategyData,
    formatNumber,
    onDataChange,
    onPressureSettingChange,
    onPressureColorChange,
}) => {
    const { pressureSettings, occupancy, masterPrices, prices, apartmentBaseRates, pressureColors } = rateStrategyData;

    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const pickerRef = useRef<HTMLDivElement>(null);
    const pressureRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setEditingDayIndex(null);
            }
        };
        if (editingDayIndex !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingDayIndex]);

    const handlePressureCellClick = (event: React.MouseEvent<HTMLTableCellElement>, dayIndex: number) => {
        const cellRect = event.currentTarget.getBoundingClientRect();
        const containerRect = event.currentTarget.closest('.relative')?.getBoundingClientRect();

        if (containerRect) {
            setPickerPosition({
                top: cellRect.bottom - containerRect.top,
                left: cellRect.left - containerRect.left + cellRect.width / 2,
            });
            setEditingDayIndex(dayIndex);
        }
    };

    const forecastedCalculations = useMemo(() => {
        const totalApartments = apartments.length;
        if (totalApartments === 0) {
            return {
                nottiPrevistePerGiorno: Array(days.length).fill(0),
                fatturatoPrevistoPerGiorno: Array(days.length).fill(0),
                totaleNottiPreviste: 0,
                totaleFatturatoPrevisto: 0,
                adrMensilePrevisto: 0,
            };
        }

        const nottiPrevistePerGiorno = days.map((day, index) => {
            const occ = occupancy[index] || 0;
            return totalApartments * (occ / 100);
        });

        const fatturatoPrevistoPerGiorno = days.map((day, index) => {
            let totalDailyPotentialRevenue = 0;
            
            apartments.forEach(apt => {
                const isMaster = apartmentBaseRates[apt.name] === 'Master';
                const priceList = isMaster ? masterPrices : (prices[apt.name] || []);
                totalDailyPotentialRevenue += priceList[index] || 0;
            });

            const occ = occupancy[index] || 0;
            return totalDailyPotentialRevenue * (occ / 100);
        });

        const totaleNottiPreviste = nottiPrevistePerGiorno.reduce((sum, val) => sum + val, 0);
        const totaleFatturatoPrevisto = fatturatoPrevistoPerGiorno.reduce((sum, val) => sum + val, 0);
        const adrMensilePrevisto = totaleNottiPreviste > 0 ? totaleFatturatoPrevisto / totaleNottiPreviste : 0;

        return {
            nottiPrevistePerGiorno,
            fatturatoPrevistoPerGiorno,
            totaleNottiPreviste,
            totaleFatturatoPrevisto,
            adrMensilePrevisto,
        };
    }, [apartments, days, occupancy, masterPrices, prices, apartmentBaseRates]);


    const averageOccupancy = useMemo(() => {
        const validOccupancies = occupancy.filter(o => typeof o === 'number');
        if (validOccupancies.length === 0) return 0;
        const total = validOccupancies.reduce((sum, val) => sum + val, 0);
        return total / days.length;
    }, [occupancy, days.length]);

    const inputClasses = "w-full bg-transparent text-center focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:bg-white focus:text-gray-900 dark:focus:bg-slate-800 dark:focus:text-gray-100 rounded p-1 text-sm font-medium";

    return (
        <div className="mt-8 bg-white dark:bg-[#141414] p-1 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 mb-4">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white tracking-tight">Legenda Pressione</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {pressureSettings.map(setting => (
                        <div key={setting.level} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-[#0d0d0d]">
                            <span className={`w-6 h-6 rounded-full border-2 border-white dark:border-slate-500 shadow-sm flex-shrink-0 ${setting.color}`}></span>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-800 dark:text-white capitalize">
                                    {setting.level}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                    ({setting.min}% - {setting.max}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="min-w-[2800px] text-xs relative">
                <table className="w-full border-collapse text-center table-fixed">
                    <thead>
                        <tr ref={pressureRowRef} className="bg-gray-100 dark:bg-[#0d0d0d]">
                            <th className="p-3 border-b border-r border-gray-200 dark:border-slate-700 text-left w-[250px] font-bold text-gray-800 dark:text-white uppercase tracking-wider">Pressione</th>
                            {days.map((d, index) => (
                                <th key={d.dayNum} 
                                    onClick={(e) => handlePressureCellClick(e, index)}
                                    className={`p-3 border-b border-r border-gray-200 dark:border-slate-700 transition-all w-[65px] cursor-pointer hover:brightness-110 ${pressureColors[index] || 'bg-amber-50 dark:bg-gray-600'}`}
                                    aria-label={`Imposta colore per giorno ${d.dayNum}`}
                                >
                                    <div className="h-6 w-full rounded-sm" />
                                </th>
                            ))}
                            <th className="p-3 border-b border-gray-200 dark:border-slate-700 w-[85px]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-primary text-white border-b border-primary-dark">
                            <td className="p-3 border-r border-primary-dark text-left font-bold uppercase tracking-wider">Occupazione Prevista</td>
                            {days.map(d => (
                                <td key={d.dayNum} className="p-1 border-r border-primary-dark">
                                    <div className="relative">
                                         <input
                                            type="number"
                                            value={occupancy[d.dayNum - 1] || ''}
                                            onChange={(e) => onDataChange('occupancy', d.dayNum - 1, null, e.target.value)}
                                            className={`${inputClasses} pr-5 text-white placeholder-green-200 font-bold bg-primary-light/50 border border-primary-light hover:bg-primary-light/70 focus:ring-primary-light`}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-200 text-[10px] pointer-events-none">%</span>
                                    </div>
                                </td>
                            ))}
                            <td className="p-3 font-bold text-lg">
                                {formatNumber(averageOccupancy)}%
                            </td>
                        </tr>
                        {apartments.map(apt => {
                            const isMaster = apartmentBaseRates[apt.name] === 'Master';
                            const priceList = isMaster ? masterPrices : (prices[apt.name] || []);
                            return (
                                <tr key={apt.id} className={`border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${isMaster ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
                                    <td className="p-3 border-r border-gray-200 dark:border-slate-700 text-left font-medium text-gray-700 dark:text-slate-300">{apt.name}</td>
                                    {days.map(d => (
                                        <td key={d.dayNum} className="p-1 border-r border-gray-200 dark:border-slate-700/50">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">€</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={(priceList[d.dayNum - 1] ?? '').toString().replace('.', ',')}
                                                    onChange={(e) => {
                                                        if (isMaster) {
                                                            onDataChange('masterPrice', d.dayNum - 1, apt.name, e.target.value)
                                                        }
                                                    }}
                                                    readOnly={!isMaster}
                                                    className={`${inputClasses} pl-5 ${!isMaster ? 'text-gray-500 dark:text-slate-400 cursor-not-allowed bg-gray-50/50 dark:bg-slate-900/30' : 'font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-600'}`}
                                                />
                                            </div>
                                        </td>
                                    ))}
                                    <td className="p-1 font-bold">
                                         <input
                                            type="text"
                                            value={apartmentBaseRates[apt.name] || ''}
                                            onChange={(e) => onDataChange('baseRate', null, apt.name, e.target.value)}
                                            className={`${inputClasses} font-bold bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600`}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                        {/* Summary Rows */}
                        <tr className="font-bold bg-gray-100 dark:bg-[#0d0d0d] border-t-2 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200">
                            <td className="p-3 border-r border-gray-300 dark:border-slate-600 text-left uppercase text-xs tracking-wider">notti previste</td>
                             {days.map((d, index) => (
                                <td key={d.dayNum} className="p-3 border-r border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400">
                                    {formatNumber(forecastedCalculations.nottiPrevistePerGiorno[index], { decimals: 1 })}
                                </td>
                            ))}
                            <td className="p-3">
                                {formatNumber(forecastedCalculations.totaleNottiPreviste, { decimals: 1 })}
                            </td>
                        </tr>
                        <tr className="font-bold bg-gray-100 dark:bg-[#0d0d0d] border-t border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200">
                            <td className="p-3 border-r border-gray-300 dark:border-slate-600 text-left uppercase text-xs tracking-wider">fatturato del giorno</td>
                            {days.map((d, index) => (
                                <td key={d.dayNum} className="p-3 border-r border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                   €{formatNumber(forecastedCalculations.fatturatoPrevistoPerGiorno[index], { decimals: 0 })}
                                </td>
                            ))}
                            <td className="p-3 text-lg">
                               €{formatNumber(forecastedCalculations.totaleFatturatoPrevisto, { decimals: 0 })}
                            </td>
                        </tr>
                        <tr className="font-bold bg-gray-200 dark:bg-slate-800 border-t border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white h-12">
                            <td className="p-3 border-r border-gray-300 dark:border-slate-600 text-left uppercase text-xs tracking-wider">ADR Mensile</td>
                            <td className="p-3 border-r border-gray-300 dark:border-slate-600" colSpan={days.length}></td>
                            <td className="p-3 text-lg">
                                €{formatNumber(forecastedCalculations.adrMensilePrevisto)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                {editingDayIndex !== null && (
                    <div
                        ref={pickerRef}
                        style={{
                            position: 'absolute',
                            top: `${pickerPosition.top}px`,
                            left: `${pickerPosition.left}px`,
                            transform: 'translateX(-50%) translateY(4px)',
                        }}
                        className="z-30 bg-white dark:bg-[#141414] shadow-2xl rounded-xl border border-gray-200 dark:border-slate-600 p-3 flex gap-2 items-center ring-1 ring-black/5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {pressureSettings.map((setting) => (
                            <button
                                key={setting.level}
                                onClick={() => {
                                    const newColor = pressureColors[editingDayIndex] === setting.color ? '' : setting.color;
                                    onPressureColorChange(editingDayIndex, newColor);
                                    setEditingDayIndex(null);
                                }}
                                className={`w-8 h-8 rounded-full cursor-pointer ${setting.color} border-2 transition-all shadow-sm hover:scale-110 ${pressureColors[editingDayIndex] === setting.color ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500' : 'border-transparent'}`}
                                aria-label={`${setting.level} Pressione`}
                                title={`${setting.level} Pressione (${setting.min}-${setting.max}%)`}
                            />
                        ))}
                         <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1"></div>
                         <button
                            onClick={() => {
                                onPressureColorChange(editingDayIndex, '');
                                setEditingDayIndex(null);
                            }}
                            className="w-8 h-8 rounded-full cursor-pointer bg-gray-100 dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                            aria-label="Rimuovi colore"
                            title="Rimuovi colore"
                        >
                           <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RateStrategyPlanner;