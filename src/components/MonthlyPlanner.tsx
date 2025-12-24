
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PlusIcon, TrashIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, UploadIcon } from './icons';
import type { BookingImportData, Apartment, BudgetDataForMonth } from '../types';
import SummaryDashboard from './SummaryDashboard';
import RateStrategyPlanner from './RateStrategyPlanner';
import DataImporter from './DataImporter';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CellData {
    color: string;
    price?: number;
}

export const legendItems = [
    { name: 'BOOKING', color: 'bg-blue-300' },
    { name: 'AIRBNB', color: 'bg-red-400' },
    { name: 'HOMEAWAY', color: 'bg-yellow-400' },
    { name: 'DIRETTE', color: 'bg-green-400' },
    { name: 'EXPEDIA', color: 'bg-orange-400' },
    { name: 'ALTRO', color: 'bg-gray-400' },
];

const getMonthData = (month: string, year: number) => {
    const monthMap: { [key: string]: number } = {
        "Gennaio": 0, "Febbraio": 1, "Marzo": 2, "Aprile": 3, "Maggio": 4, "Giugno": 5,
        "Luglio": 6, "Agosto": 7, "Settembre": 8, "Ottobre": 9, "Novembre": 10, "Dicembre": 11
    };
    const monthIndex = monthMap[month] ?? 0;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    const dayLetters = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, monthIndex, i);
        const dayOfWeek = date.getDay();
        days.push({
            dayNum: i,
            dayLetter: dayLetters[dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        });
    }
    return { days, daysInMonth };
};

interface MonthlyPlannerProps {
    month: string;
    year: number;
    apartments: Apartment[];
    onApartmentNameChange: (id: number, newName: string) => void;
    onAddApartment: () => void;
    onRemoveApartment: (id: number) => void;
    onPreviousYear: () => void;
    onNextYear: () => void;
    allBudgetData: Record<string, BudgetDataForMonth>;
    allCellData: Record<string, Record<string, CellData>>;
    setAllCellData: React.Dispatch<React.SetStateAction<Record<string, Record<string, CellData>>>>;
    storagePrefix: string;
}

const formatNumber = (num: number, options: { fallback?: string, decimals?: number, prefix?: string } = {}) => {
    const { fallback = '0,00', decimals = 2, prefix = '' } = options;
    if (isNaN(num) || !isFinite(num)) {
        return fallback;
    }
    return `${prefix}${num.toFixed(decimals).replace('.', ',')}`;
};


const MonthlyPlanner: React.FC<MonthlyPlannerProps> = ({ 
    month, year, apartments, 
    onApartmentNameChange, onAddApartment, onRemoveApartment,
    onPreviousYear, onNextYear, allBudgetData, allCellData, setAllCellData,
    storagePrefix
}) => {
    
    const currentMonthKey = useMemo(() => `${year}-${month}`, [year, month]);
    const cellData = useMemo(() => allCellData[currentMonthKey] || {}, [allCellData, currentMonthKey]);
    
    const currentMonthBudget = useMemo(() => {
        return allBudgetData?.[currentMonthKey] || {
            budgetMensile: 0,
            roomNightsAtteso: 0,
            occupazioneAttesa: 0,
            prezzoMedioAtteso: 0,
            revParAtteso: 0,
        };
    }, [allBudgetData, currentMonthKey]);

    const [activeCell, setActiveCell] = useState<{ aptId: number; dayNum: number } | null>(null);
    const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0, width: 0 });
    const [editorSelectedColor, setEditorSelectedColor] = useState("");
    const [editorPrice, setEditorPrice] = useState("");

    // Drag-to-copy state (Excel-like propagation)
    const [isDragging, setIsDragging] = useState(false);
    const [dragSource, setDragSource] = useState<{ aptId: number; dayNum: number } | null>(null);
    const [dragTarget, setDragTarget] = useState<number | null>(null); // target day number
    const tableRef = useRef<HTMLTableElement>(null);

    const editorRef = useRef<HTMLDivElement>(null);
    const { days, daysInMonth } = getMonthData(month, year);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    
    const [rateStrategyData, setRateStrategyData] = useLocalStorage(`${storagePrefix}-rate-strategy-${currentMonthKey}`, {
        pressureSettings: [
            { level: 'Bassissima', min: 0, max: 25, color: 'bg-[#008000]', label: 'Verde scuro: bassissima pressione (0-25%)' },
            { level: 'Bassa', min: 26, max: 40, color: 'bg-[#8fbc8f]', label: 'Verde chiaro: bassa pressione (26-40%)' },
            { level: 'Media', min: 41, max: 65, color: 'bg-[#daa520]', label: 'Giallo: media pressione (41-65%)' },
            { level: 'Alta', min: 66, max: 85, color: 'bg-[#ffa500]', label: 'Arancione: alta pressione (66-85%)' },
            { level: 'Altissima', min: 86, max: 100, color: 'bg-[#ff4500]', label: 'Rosso: altissima pressione (86-100%)' },
        ],
        occupancy: [10,0,10,10,0,0,0,10,10,0,0,10,10,0,0,0,0,10,10,0,0,0,0,10,10,0,0,0,0,10,10],
        masterPrices: [60,60,65,65,65,65,65,65,60,60,60,65,65,60,60,60,60,60,60,65,65,60,60,60,60,60,60,65,65,60,60],
        prices: {
            "Alba marina": [48,48,52,52,52,52,52,52,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48],
            "Balcone sul Mare": [45,45,49,49,49,49,49,49,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45],
            "Casa del fico": [60,60,65,65,65,65,65,65,60,60,60,65,65,60,60,60,60,60,60,65,65,60,60,60,60,60,60,65,65,60,60],
            "Casa Indipendenza": [48,48,52,52,52,52,52,52,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48],
            "Corte marina": [48,48,52,52,52,52,52,52,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48],
            "Gondola Apartment": [48,48,52,52,52,52,52,52,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48],
            "Kame house": [45,45,49,49,49,49,49,49,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45],
            "La conchiglia": [48,48,52,52,52,52,52,52,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48,48,48,48,48,52,52,48,48],
            "L'onda": [45,45,49,49,49,49,49,49,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45],
            "Mediterraneo apartment": [42,42,46,46,46,46,46,46,42,42,42,46,46,42,42,42,42,42,42,46,46,42,42,42,42,42,42,46,46,42,42],
            "Nenetta a mare": [90,90,98,98,98,98,98,98,90,90,90,98,98,90,90,90,90,90,90,98,98,90,90,90,90,90,90,98,98,90,90],
            "Orsini house": [42,42,46,46,46,46,46,46,42,42,42,46,46,42,42,42,42,42,42,46,46,42,42,42,42,42,42,46,46,42,42],
            "Pamar 1": [42,42,46,46,46,46,46,46,42,42,42,46,46,42,42,42,46,46,42,42,42,42,42,42,46,46,42,42,42,42,42,46,46,42,42],
            "Riviera": [54,54,59,59,59,59,59,59,54,54,54,59,59,54,54,54,54,54,54,59,59,54,54,54,54,54,54,59,59,54,54],
            "Suite Centrale": [45,45,49,49,49,49,49,49,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45,45,45,45,45,49,49,45,45],
        } as { [key: string]: number[] },
        apartmentBaseRates: {
            "Pamar 2": "Master", "Alba marina": 80, "Balcone sul Mare": 75, "Casa del fico": 100,
            "Casa Indipendenza": 80, "Corte marina": 80, "Gondola Apartment": 80, "Kame house": 75,
            "La conchiglia": 80, "L'onda": 75, "Mediterraneo apartment": 70, "Nenetta a mare": 150,
            "Orsini house": 70, "Pamar 1": 70, "Riviera": 90, "Suite Centrale": 75,
        } as {[key: string]: string | number},
        pressureColors: Array(31).fill(''),
    });

    const handleDataImport = (importedData: BookingImportData[]) => {
        const newCellDataForMonth = { ...(allCellData[currentMonthKey] || {}) };

        const channelToColor = new Map(legendItems.map(item => [item.name.toUpperCase(), item.color]));
        const apartmentNameToId = new Map(apartments.map(apt => [apt.name, apt.id]));
        
        importedData.forEach(aptData => {
            const aptId = apartmentNameToId.get(aptData.apartmentName);
            if (aptId !== undefined) {
                aptData.bookings.forEach((booking) => {
                    if (booking.day >= 1 && booking.day <= daysInMonth) {
                        const key = `${aptId}-${booking.day}`;
                        
                        let color = '';
                        if (booking.price > 0 && booking.channel) {
                             color = channelToColor.get(booking.channel.toUpperCase()) || legendItems[5].color;
                        }
                        
                        newCellDataForMonth[key] = {
                            price: booking.price,
                            color: color,
                        };
                    }
                });
            }
        });
        
        setAllCellData(prev => ({
            ...prev,
            [currentMonthKey]: newCellDataForMonth
        }));

        setIsImporterOpen(false);
    };

    const handleRateStrategyChange = (
        type: 'occupancy' | 'masterPrice' | 'baseRate',
        dayIndex: number | null,
        aptName: string | null,
        newValue: string
    ) => {
        setRateStrategyData(prev => {
            const newData = structuredClone(prev);
            const numValue = parseFloat(newValue.replace(',', '.')) || 0;
    
            switch (type) {
                case 'occupancy':
                    if (dayIndex !== null) newData.occupancy[dayIndex] = numValue;
                    break;
                case 'masterPrice':
                    if (dayIndex !== null) {
                        newData.masterPrices[dayIndex] = numValue;
                        Object.keys(newData.apartmentBaseRates).forEach(aptKey => {
                            const baseRate = newData.apartmentBaseRates[aptKey];
                            if (typeof baseRate === 'number') {
                                const derivedPrice = numValue * (baseRate / 100);
                                if (!newData.prices[aptKey]) {
                                    newData.prices[aptKey] = Array(days.length).fill(0);
                                }
                                newData.prices[aptKey][dayIndex] = derivedPrice;
                            }
                        });
                    }
                    break;
                case 'baseRate':
                    if (aptName) {
                        let newBaseRate: string | number;
                        if (newValue.toLowerCase().trim() === 'master') {
                            newBaseRate = 'Master';
                        } else {
                            newBaseRate = parseFloat(newValue.replace(',', '.')) || 0;
                        }
                        newData.apartmentBaseRates[aptName] = newBaseRate;

                        if (typeof newBaseRate === 'number') {
                            newData.prices[aptName] = newData.masterPrices.map(masterPrice => {
                                return masterPrice * (newBaseRate as number / 100);
                            });
                        }
                    }
                    break;
            }
            return newData;
        });
    };

    const handlePressureSettingChange = (level: string, newColor: string) => {
        setRateStrategyData(prev => {
            const newSettings = prev.pressureSettings.map(setting => 
                setting.level === level ? { ...setting, color: newColor } : setting
            );
            return { ...prev, pressureSettings: newSettings };
        });
    };

    const handlePressureColorChange = (dayIndex: number, newColor: string) => {
        setRateStrategyData(prev => {
            const newPressureColors = [...prev.pressureColors];
            newPressureColors[dayIndex] = newColor;
            return { ...prev, pressureColors: newPressureColors };
        });
    };

    const summaryCalculations = useMemo(() => {
        const results: Record<number, any> = {};
        apartments.forEach(apt => {
            let nottiVendute = 0;
            let revenueTotale = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const key = `${apt.id}-${day}`;
                const data = cellData[key];
                if (data && data.color && data.price && data.price > 0) { 
                    nottiVendute++;
                    revenueTotale += data.price || 0;
                }
            }

            const occupazione = (nottiVendute / daysInMonth) * 100;
            const adr = nottiVendute > 0 ? revenueTotale / nottiVendute : 0;
            const revPar = revenueTotale / daysInMonth;

            results[apt.id] = { nottiVendute, revenueTotale, occupazione, adr, revPar };
        });
        return results;
    }, [apartments, cellData, daysInMonth]);
    
    const dailyCalculations = useMemo(() => {
        const results = Array(daysInMonth + 1).fill(null).map(() => ({
            revenue: 0,
            soldNights: 0,
            revPar: 0,
            adr: 0,
        }));
        
        const totalApartments = apartments.length > 0 ? apartments.length : 1;

        apartments.forEach(apt => {
            for (let day = 1; day <= daysInMonth; day++) {
                const key = `${apt.id}-${day}`;
                const data = cellData[key];
                if (data && data.color && data.price && data.price > 0) {
                    results[day].soldNights++;
                    results[day].revenue += data.price;
                }
            }
        });

        for (let day = 1; day <= daysInMonth; day++) {
            results[day].adr = results[day].soldNights > 0 ? results[day].revenue / results[day].soldNights : 0;
            results[day].revPar = results[day].revenue / totalApartments;
        }

        return results;
    }, [apartments, cellData, daysInMonth]);

    const monthlySummary = useMemo(() => {
        const total = {
            revenue: 0,
            soldNights: 0,
        };

        apartments.forEach(apt => {
            const aptSummary = summaryCalculations[apt.id];
            if (aptSummary) {
                total.revenue += aptSummary.revenueTotale;
                total.soldNights += aptSummary.nottiVendute;
            }
        });
        
        const totalAvailableNights = apartments.length > 0 ? apartments.length * daysInMonth : 1;
        
        const occupancyRate = totalAvailableNights > 0 ? (total.soldNights / totalAvailableNights) * 100 : 0;
        const adr = total.soldNights > 0 ? total.revenue / total.soldNights : 0;
        const revPar = totalAvailableNights > 0 ? total.revenue / totalAvailableNights : 0;

        return {
            businessOnTheBooks: total.revenue,
            roomNightsVendute: total.soldNights,
            tassoOccupazione: occupancyRate,
            prezzoMedio: adr,
            revPar: revPar,
        };
    }, [summaryCalculations, apartments, daysInMonth]);

    const scostamento = monthlySummary.businessOnTheBooks - currentMonthBudget.budgetMensile;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
                setActiveCell(null);
            }
        };
        if (activeCell) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeCell]);
    
    const handleCellClick = (e: React.MouseEvent<HTMLTableCellElement>, aptId: number, dayNum: number) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setEditorPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
        });
        setActiveCell({ aptId, dayNum });
        const key = `${aptId}-${dayNum}`;
        const currentData = cellData[key];
        setEditorSelectedColor(currentData?.color || "");
        setEditorPrice(currentData?.price && currentData.price > 0 ? currentData.price.toString() : "");
    };

    const handleSaveCell = () => {
        if (!activeCell) return;
        const key = `${activeCell.aptId}-${activeCell.dayNum}`;
        const price = parseFloat(editorPrice.replace(',', '.'));
        
        const noValue = !editorSelectedColor && (!editorPrice || isNaN(price) || price <= 0);

        if (noValue) {
            handleClearCell();
        } else {
             setAllCellData(prev => {
                const currentMonthData = prev[currentMonthKey] || {};
                const newMonthData = {
                    ...currentMonthData,
                    [key]: {
                        color: editorSelectedColor,
                        price: isNaN(price) ? undefined : price
                    }
                };
                return { ...prev, [currentMonthKey]: newMonthData };
             });
        }
        setActiveCell(null);
    };

    const handleClearCell = () => {
        if (!activeCell) return;
        const key = `${activeCell.aptId}-${activeCell.dayNum}`;
        setAllCellData(prev => {
            const currentMonthData = prev[currentMonthKey] || {};
            const newMonthData = { ...currentMonthData };
            delete newMonthData[key];
            return {
                ...prev,
                [currentMonthKey]: newMonthData
            };
        });
        setEditorSelectedColor("");
        setEditorPrice("");
        setActiveCell(null);
    };

    // Drag-to-copy handlers (Excel-like propagation)
    const handleDragStart = (e: React.MouseEvent, aptId: number, dayNum: number) => {
        const key = `${aptId}-${dayNum}`;
        const sourceData = cellData[key];

        // Solo inizia drag se la cella ha dati (colore e prezzo)
        if (sourceData && sourceData.color && sourceData.price && sourceData.price > 0) {
            e.preventDefault();
            setIsDragging(true);
            setDragSource({ aptId, dayNum });
            setDragTarget(dayNum);
        }
    };

    const handleDragMove = (e: React.MouseEvent, aptId: number, dayNum: number) => {
        if (!isDragging || !dragSource) return;

        // Solo stesso appartamento (propagazione orizzontale)
        if (aptId === dragSource.aptId) {
            setDragTarget(dayNum);
        }
    };

    const handleDragEnd = () => {
        if (!isDragging || !dragSource || dragTarget === null) {
            setIsDragging(false);
            setDragSource(null);
            setDragTarget(null);
            return;
        }

        const sourceKey = `${dragSource.aptId}-${dragSource.dayNum}`;
        const sourceData = cellData[sourceKey];

        if (sourceData) {
            const startDay = Math.min(dragSource.dayNum, dragTarget);
            const endDay = Math.max(dragSource.dayNum, dragTarget);

            setAllCellData(prev => {
                const currentMonthData = { ...(prev[currentMonthKey] || {}) };

                for (let day = startDay; day <= endDay; day++) {
                    if (day !== dragSource.dayNum) {
                        const key = `${dragSource.aptId}-${day}`;
                        currentMonthData[key] = {
                            color: sourceData.color,
                            price: sourceData.price
                        };
                    }
                }

                return { ...prev, [currentMonthKey]: currentMonthData };
            });
        }

        setIsDragging(false);
        setDragSource(null);
        setDragTarget(null);
    };

    // Check if cell is in drag selection
    const isCellInDragSelection = (aptId: number, dayNum: number) => {
        if (!isDragging || !dragSource || dragTarget === null) return false;
        if (aptId !== dragSource.aptId) return false;

        const startDay = Math.min(dragSource.dayNum, dragTarget);
        const endDay = Math.max(dragSource.dayNum, dragTarget);

        return dayNum >= startDay && dayNum <= endDay;
    };

    // Add global mouseup listener for drag
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleDragEnd();
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, dragSource, dragTarget, cellData, currentMonthKey]);

    const getCellContent = (data: CellData | undefined) => {
        if (!data) return '';
        if (data.price && data.price > 0) {
            return formatNumber(data.price, { decimals: 0 });
        }
        if (data.price === -1) {
            return 'Blocc.';
        }
        return '';
    };
    
    const handleApartmentRemoveClick = (id: number) => {
        onRemoveApartment(id);
        setAllCellData(current => {
            const newData = { ...current };
            Object.keys(newData).forEach(monthKey => {
                const newMonthData = { ...newData[monthKey] };
                let changed = false;
                Object.keys(newMonthData).forEach(cellKey => {
                    if (cellKey.startsWith(`${id}-`)) {
                        delete newMonthData[cellKey];
                        changed = true;
                    }
                });
                if (changed) {
                    newData[monthKey] = newMonthData;
                }
            });
            return newData;
        });
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <div className="bg-white dark:bg-[#141414] p-1 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
                <div className="min-w-[2800px] text-xs">
                    <table className="w-full border-collapse text-center table-fixed">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black text-left w-[250px]">
                                    <span className="text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">Unit sell day</span>
                                </th>
                                {days.map(d => (
                                    <th key={d.dayNum} className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black font-bold text-gray-700 dark:text-slate-200 w-[65px]">
                                        {dailyCalculations[d.dayNum].soldNights}
                                    </th>
                                ))}
                                <th className="p-2 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black align-top" colSpan={6} rowSpan={3}>
                                    <div className="flex justify-center items-start p-1">
                                        <div>
                                            <div className="font-bold mb-2 text-center text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">Legenda</div>
                                            <div className="grid grid-cols-2 gap-2 w-full p-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card">
                                                {legendItems.map(item => (
                                                    <div key={item.name} className={`p-1.5 text-center text-white text-[10px] font-bold uppercase tracking-wider ${item.color} rounded-md shadow-sm`}>{item.name}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                             <tr>
                                <th className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black text-left">
                                     <span className="text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">Unit rev day</span>
                                </th>
                                {days.map(d => (
                                    <th key={d.dayNum} className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black text-gray-700 dark:text-slate-200 font-semibold">
                                        {formatNumber(dailyCalculations[d.dayNum].revenue, { decimals: 0 })}
                                    </th>
                                ))}
                            </tr>
                             <tr>
                                <th className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black text-left">
                                    <span className="text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">RevPar day</span>
                                </th>
                                {days.map(d => (
                                    <th key={d.dayNum} className="p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black text-gray-700 dark:text-slate-200 font-semibold">
                                        {formatNumber(dailyCalculations[d.dayNum].revPar)}
                                    </th>
                                ))}
                            </tr>
                            <tr className="font-bold">
                                <th className="p-3 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black align-bottom" rowSpan={2}>
                                    <div className="flex items-center justify-between text-gray-800 dark:text-white">
                                        <button onClick={onPreviousYear} aria-label="Anno precedente" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-secondary transition-colors">
                                            <ChevronLeftIcon className="w-5 h-5" />
                                        </button>
                                        <div className="text-center">
                                            <span className="text-xl font-black tracking-tight block">{month}</span>
                                            <span className="block text-sm font-medium text-gray-500 dark:text-slate-400">{year}</span>
                                        </div>
                                        <button onClick={onNextYear} aria-label="Anno successivo" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-secondary transition-colors">
                                            <ChevronRightIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </th>
                                {days.map((d) => (
                                    <th key={d.dayNum} className={`p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black ${d.isWeekend ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                        {d.dayLetter}
                                    </th>
                                ))}
                                {["Notti Vendute", "% Occupazione", "ADR", "Revenue Totale", "RevPar", "Extra"].map(h => (
                                    <th key={h} className="p-2 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black w-[85px] text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">{h}</th>
                                ))}
                            </tr>
                            <tr className="font-bold">
                                {days.map(d => (
                                    <th key={d.dayNum} className={`p-2 border-b border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-black ${d.isWeekend ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                        {d.dayNum}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {apartments.map(apt => {
                                const summary = summaryCalculations[apt.id] || { nottiVendute: 0, revenueTotale: 0, occupazione: 0, adr: 0, revPar: 0 };
                                const hasData = summary.nottiVendute > 0;
                                return (
                                <tr key={apt.id} className="group border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-2 border-r border-gray-200 dark:border-slate-700 text-left bg-white dark:bg-[#141414] group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={apt.name}
                                                onChange={(e) => onApartmentNameChange(apt.id, e.target.value)}
                                                className="flex-grow bg-transparent p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 w-full font-semibold text-gray-700 dark:text-slate-200 text-sm"
                                            />
                                            <button onClick={() => handleApartmentRemoveClick(apt.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity flex-shrink-0" aria-label={`Rimuovi ${apt.name}`}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    {days.map(d => {
                                        const key = `${apt.id}-${d.dayNum}`;
                                        const data = cellData[key];
                                        const content = getCellContent(data);

                                        const isBooked = data && data.color && data.price && data.price > 0;
                                        const isInDragSelection = isCellInDragSelection(apt.id, d.dayNum);
                                        const isDragSourceCell = dragSource?.aptId === apt.id && dragSource?.dayNum === d.dayNum;

                                        const textClass = isBooked ? 'font-bold text-black' : 'text-gray-400 dark:text-slate-600';
                                        const cellBgClass = isBooked
                                            ? data.color
                                            : 'bg-transparent';

                                        // Drag selection visual feedback
                                        const dragSelectionClass = isInDragSelection && !isDragSourceCell
                                            ? 'ring-2 ring-inset ring-primary bg-primary/20'
                                            : isDragSourceCell && isDragging
                                            ? 'ring-2 ring-inset ring-primary'
                                            : '';

                                        return (
                                            <td
                                                key={d.dayNum}
                                                onClick={(e) => !isDragging && handleCellClick(e, apt.id, d.dayNum)}
                                                onMouseDown={(e) => handleDragStart(e, apt.id, d.dayNum)}
                                                onMouseMove={(e) => handleDragMove(e, apt.id, d.dayNum)}
                                                className={`p-1 border-r border-gray-200 dark:border-slate-700 text-[10px] whitespace-nowrap cursor-pointer transition-all duration-150 ${cellBgClass} hover:bg-gray-100 dark:hover:bg-slate-700/50 relative select-none ${dragSelectionClass}`}
                                            >
                                                <div className={`h-full w-full truncate ${textClass}`}>{content}</div>
                                            </td>
                                        )
                                    })}
                                    <td className={`p-2 border-r border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>{summary.nottiVendute}</td>
                                    <td className={`p-2 border-r border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>{formatNumber(summary.occupazione)}%</td>
                                    <td className={`p-2 border-r border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>{formatNumber(summary.adr)}</td>
                                    <td className={`p-2 border-r border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>{formatNumber(summary.revenueTotale)}</td>
                                    <td className={`p-2 border-r border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>{formatNumber(summary.revPar)}</td>
                                    <td className={`p-2 font-semibold text-gray-700 dark:text-slate-300 ${hasData ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>0,00</td>
                                </tr>
                            )})}
                            <tr className="font-bold h-10 bg-yellow-50 dark:bg-yellow-900/20 border-t-2 border-gray-200 dark:border-slate-600">
                                <td className="p-2 border-r border-gray-300 dark:border-slate-600 text-left text-yellow-800 dark:text-yellow-500 uppercase tracking-wider text-xs">ADR day</td>
                                {days.map(d => {
                                    const dailyAdr = dailyCalculations[d.dayNum].adr;
                                    return (
                                        <td key={d.dayNum} className="p-2 border-r border-gray-300 dark:border-slate-600 text-yellow-800 dark:text-yellow-500">
                                            {formatNumber(dailyAdr)}
                                        </td>
                                    )
                                })}
                                <td className="p-1" colSpan={6}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="p-4 flex flex-wrap gap-4 bg-gray-50 dark:bg-[#0d0d0d] border-t border-gray-200 dark:border-slate-700">
                    <button onClick={onAddApartment} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900 transition-all">
                        <PlusIcon className="w-5 h-5" />
                        <span>AGGIUNGI STRUTTURA</span>
                    </button>
                    <button onClick={() => setIsImporterOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-all">
                        <UploadIcon className="w-5 h-5" />
                        <span>IMPORTA XLS</span>
                    </button>
                </div>
            </div>

            <SummaryDashboard
                scostamento={scostamento}
                businessOnTheBooks={monthlySummary.businessOnTheBooks}
                roomNightsVendute={monthlySummary.roomNightsVendute}
                tassoOccupazione={monthlySummary.tassoOccupazione}
                prezzoMedio={monthlySummary.prezzoMedio}
                revPar={monthlySummary.revPar}
                budgetMensile={currentMonthBudget.budgetMensile}
                roomNightsAtteso={currentMonthBudget.roomNightsAtteso}
                occupazioneAttesa={currentMonthBudget.occupazioneAttesa}
                prezzoMedioAtteso={currentMonthBudget.prezzoMedioAtteso}
                revParAtteso={currentMonthBudget.revParAtteso}
            />

            <RateStrategyPlanner
                apartments={apartments}
                days={days}
                dailyCalculations={dailyCalculations}
                rateStrategyData={rateStrategyData}
                formatNumber={formatNumber}
                onDataChange={handleRateStrategyChange}
                onPressureSettingChange={handlePressureSettingChange}
                onPressureColorChange={handlePressureColorChange}
            />

            {activeCell && (
                <div 
                    ref={editorRef} 
                    style={{ top: editorPosition.top, left: editorPosition.left, minWidth: editorPosition.width }} 
                    className="fixed z-20 bg-white dark:bg-[#141414] shadow-2xl rounded-xl border border-gray-200 dark:border-slate-600 p-4 flex flex-col gap-3 ring-1 ring-black/5"
                >
                    <select
                        value={editorSelectedColor}
                        onChange={(e) => setEditorSelectedColor(e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                         autoFocus
                    >
                        <option value="">Nessun Canale</option>
                        {legendItems.map(item => (
                            <option key={item.name} value={item.color}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Prezzo (€)"
                        value={editorPrice}
                        onChange={(e) => setEditorPrice(e.target.value)}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                    />
                     <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-slate-700 pt-3 mt-1">
                        <button onClick={handleClearCell} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-800" title="Pulisci Cella">
                            <XCircleIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={handleSaveCell} className="px-4 py-1.5 text-sm font-bold text-white bg-primary rounded-lg shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900 transition-all">
                            Salva
                        </button>
                    </div>
                </div>
            )}
            
            {isImporterOpen && (
                <DataImporter
                    apartments={apartments}
                    month={month}
                    year={year}
                    daysInMonth={daysInMonth}
                    legendItems={legendItems}
                    onClose={() => setIsImporterOpen(false)}
                    onImport={handleDataImport}
                />
            )}
        </div>
    );
};

export default MonthlyPlanner;