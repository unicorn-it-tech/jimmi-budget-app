import React, { useState, useMemo } from 'react';
import { UsersIcon, LinkIcon, TrashIcon, PlusCircleIcon, StarIcon, LocationMarkerIcon, XIcon, CalendarIcon, ChevronRightIcon, ChartIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';


interface Competitor {
    id: number;
    name: string;
    cluster: string;
    score: number;
    distance: number; // in km o metri
    url: string;
    avgRate: number;
    note: string;
}

interface Period {
    from: string;
    to: string;
    price: number;
}

interface MonthlyPricing {
    periods: [Period, Period, Period]; // Exactly 3 periods
}

// Mappa: CompetitorID -> MonthIndex (0-11) -> MonthlyPricing
type PricingData = Record<number, Record<number, MonthlyPricing>>;

const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const cardColors = [
    { header: 'bg-yellow-400', border: 'border-yellow-400', text: 'text-yellow-400', ring: 'focus:ring-yellow-400' },
    { header: 'bg-orange-400', border: 'border-orange-400', text: 'text-orange-400', ring: 'focus:ring-orange-400' },
    { header: 'bg-cyan-400', border: 'border-cyan-400', text: 'text-cyan-400', ring: 'focus:ring-cyan-400' },
    { header: 'bg-green-500', border: 'border-green-500', text: 'text-green-500', ring: 'focus:ring-green-500' },
    { header: 'bg-red-600', border: 'border-red-600', text: 'text-red-600', ring: 'focus:ring-red-600' },
    { header: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500', ring: 'focus:ring-purple-500' },
];

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value) || value === 0) return '-';
    return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface CompetitorsProps {
    availableClusters: string[];
}

const Competitors: React.FC<CompetitorsProps> = ({ availableClusters }) => {
    // Use availableClusters prop or a default if empty, ensure "cluster" is handled as default
    const clusters = availableClusters.length > 0 ? availableClusters : ["cluster"];

    const [competitors, setCompetitors] = useLocalStorage<Competitor[]>('budget-app-competitors', [
        { id: 1, name: 'Hotel Bella Vista', cluster: 'cluster', score: 8.5, distance: 0.5, url: 'https://booking.com', avgRate: 120, note: 'Diretto concorrente' },
        { id: 2, name: 'Residence Mare', cluster: 'cluster', score: 9.2, distance: 1.2, url: '', avgRate: 145, note: 'Alta qualità' },
        { id: 3, name: 'B&B Centro', cluster: 'cluster', score: 7.8, distance: 0.2, url: '', avgRate: 90, note: 'Prezzi aggressivi' },
    ]);

    const [pricingData, setPricingData] = useLocalStorage<PricingData>('budget-app-competitors-pricing', {});
    
    // UI State
    const [activeCompetitorId, setActiveCompetitorId] = useState<number | null>(null);
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
    const [selectedCluster, setSelectedCluster] = useState<string>('Tutti');

    const handleAddCompetitor = () => {
        const newId = competitors.length > 0 ? Math.max(...competitors.map(c => c.id)) + 1 : 1;
        // Assign to current selected cluster if not "Tutti", otherwise the first available
        const defaultCluster = selectedCluster !== 'Tutti' ? selectedCluster : clusters[0];

        setCompetitors([...competitors, {
            id: newId,
            name: 'Nuovo Competitor',
            cluster: defaultCluster,
            score: 0,
            distance: 0,
            url: '',
            avgRate: 0,
            note: ''
        }]);
    };

    const handleRemoveCompetitor = (id: number) => {
        setCompetitors(competitors.filter(c => c.id !== id));
        if (activeCompetitorId === id) setActiveCompetitorId(null);
    };

    const handleChange = (id: number, field: keyof Competitor, value: string) => {
        setCompetitors(competitors.map(c => {
            if (c.id === id) {
                if (field === 'score' || field === 'distance' || field === 'avgRate') {
                    const num = parseFloat(value);
                    return { ...c, [field]: isNaN(num) ? 0 : num };
                }
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    // Pricing Data Handlers
    const getPricingFor = (compId: number, monthIndex: number): MonthlyPricing => {
        if (!pricingData[compId] || !pricingData[compId][monthIndex]) {
            return { periods: [{ from: '', to: '', price: 0 }, { from: '', to: '', price: 0 }, { from: '', to: '', price: 0 }] };
        }
        return pricingData[compId][monthIndex];
    };

    const updatePricing = (compId: number, monthIndex: number, periodIndex: number, field: keyof Period, value: string) => {
        setPricingData(prev => {
            const compData = prev[compId] || {};
            const monthData = compData[monthIndex] || { periods: [{ from: '', to: '', price: 0 }, { from: '', to: '', price: 0 }, { from: '', to: '', price: 0 }] };
            const newPeriods = [...monthData.periods] as [Period, Period, Period];
            
            if (field === 'price') {
                const num = parseFloat(value.replace(',', '.'));
                newPeriods[periodIndex] = { ...newPeriods[periodIndex], [field]: isNaN(num) ? 0 : num };
            } else {
                newPeriods[periodIndex] = { ...newPeriods[periodIndex], [field]: value };
            }

            return {
                ...prev,
                [compId]: {
                    ...compData,
                    [monthIndex]: { periods: newPeriods }
                }
            };
        });
    };

    const calculateAverage = (periods: Period[]) => {
        let sum = 0;
        let count = 0;
        periods.forEach(p => {
            if (p.price > 0) {
                sum += p.price;
                count++;
            }
        });
        return count > 0 ? sum / count : 0;
    };

    const filteredCompetitors = useMemo(() => {
        if (selectedCluster === 'Tutti') return competitors;
        return competitors.filter(c => c.cluster === selectedCluster);
    }, [competitors, selectedCluster]);

    const activeCompetitor = useMemo(() => {
        return competitors.find(c => c.id === activeCompetitorId);
    }, [competitors, activeCompetitorId]);

    return (
        <div className="p-6 space-y-8 relative">
             {/* Header Section */}
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center border border-slate-700">
                <div className="mb-4 md:mb-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg">
                             <UsersIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Analisi Competitors</h2>
                            <p className="text-slate-400 text-sm mt-1">Monitora le strutture concorrenti e le loro performance.</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-4 items-center flex-wrap justify-center">
                     <div className="flex flex-col items-start">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Filtra per Cluster</label>
                        <select
                            value={selectedCluster}
                            onChange={(e) => setSelectedCluster(e.target.value)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-cyan-400 text-sm font-bold h-[42px]"
                        >
                            <option value="Tutti">Tutti i Cluster</option>
                            {clusters.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex flex-col items-end">
                         <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Totale Monitorati</label>
                        <div className="flex items-center bg-slate-900 px-4 rounded-lg border border-slate-600 h-[42px]">
                            <span className="text-cyan-400 font-bold text-xl">{filteredCompetitors.length}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleAddCompetitor}
                        className="flex items-center gap-2 bg-primary hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors mt-5 h-[42px]"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        <span className="uppercase text-xs tracking-wider">Aggiungi</span>
                    </button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCompetitors.map((comp, index) => {
                    const style = cardColors[index % cardColors.length];
                    return (
                        <div key={comp.id} className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col transform transition-all hover:-translate-y-1 group relative">
                            
                            <button 
                                onClick={() => handleRemoveCompetitor(comp.id)}
                                className="absolute top-2 right-2 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-red-500/80 rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>

                            {/* Card Header */}
                            <div className={`${style.header} py-4 px-4 shadow-md relative z-10`}>
                                <input 
                                    type="text" 
                                    value={comp.name}
                                    onChange={(e) => handleChange(comp.id, 'name', e.target.value)}
                                    className="bg-transparent w-full text-slate-900 font-black text-lg tracking-wide placeholder-slate-800/50 focus:outline-none border-b border-transparent focus:border-slate-900/50 pb-1 text-center"
                                    placeholder="NOME COMPETITOR"
                                />
                                <div className="flex justify-center mt-1">
                                     <select 
                                        value={comp.cluster} 
                                        onChange={(e) => handleChange(comp.id, 'cluster', e.target.value)}
                                        className="bg-white/20 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full focus:outline-none text-center appearance-none cursor-pointer hover:bg-white/30"
                                    >
                                        {clusters.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4 bg-[#1e293b] flex-grow">
                                
                                {/* Row 1: Score & Distance */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                            <StarIcon className="w-3 h-3 text-yellow-500" /> Rating
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={comp.score}
                                                onChange={(e) => handleChange(comp.id, 'score', e.target.value)}
                                                className={`w-full bg-slate-900 text-white text-center font-bold py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 ${style.ring} transition-all shadow-inner`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                            <LocationMarkerIcon className="w-3 h-3 text-red-400" /> Distanza (Km)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={comp.distance}
                                                onChange={(e) => handleChange(comp.id, 'distance', e.target.value)}
                                                className={`w-full bg-slate-900 text-white text-center font-bold py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 ${style.ring} transition-all shadow-inner`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Price Avg */}
                                <div>
                                     <label className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider block text-center">Prezzo Medio Rilevato</label>
                                     <div className="relative w-2/3 mx-auto">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">€</span>
                                        <input
                                            type="number"
                                            value={comp.avgRate}
                                            onChange={(e) => handleChange(comp.id, 'avgRate', e.target.value)}
                                            className={`w-full bg-slate-900 text-white text-center text-xl font-bold py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 ${style.ring} transition-all shadow-inner`}
                                        />
                                     </div>
                                </div>

                                {/* Link */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider block">Link OTA / Sito</label>
                                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                        <div className="pl-3 text-slate-500">
                                            <LinkIcon className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={comp.url}
                                            onChange={(e) => handleChange(comp.id, 'url', e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-transparent text-slate-300 text-xs py-2 px-3 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider block">Note</label>
                                    <textarea
                                        value={comp.note}
                                        onChange={(e) => handleChange(comp.id, 'note', e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-900 text-slate-300 text-xs py-2 px-3 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 resize-none"
                                        placeholder="Osservazioni..."
                                    />
                                </div>
                                
                                {/* Action Button */}
                                <div className="pt-2">
                                     <button 
                                        onClick={() => { setActiveCompetitorId(comp.id); }}
                                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm uppercase tracking-wide transition-all shadow-lg bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-${style.text.replace('text-', '')}`}
                                    >
                                        <ChartIcon className={`w-4 h-4 ${style.text}`} />
                                        Analisi Tariffe
                                    </button>
                                </div>

                            </div>
                            
                             {/* Footer Line */}
                             <div className={`h-1.5 ${style.header}`}></div>
                        </div>
                    );
                })}

                {/* Add Card Placeholder */}
                 <button 
                    onClick={handleAddCompetitor}
                    className="bg-[#0f172a]/50 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-10 hover:bg-slate-800/50 hover:border-primary transition-all group min-h-[350px]"
                >
                    <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-primary group-hover:text-white text-slate-500 transition-colors">
                        <PlusCircleIcon className="w-8 h-8" />
                    </div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider group-hover:text-white transition-colors">Aggiungi Competitor</span>
                </button>

            </div>

            {/* SIDE DRAWER FOR SINGLE COMPETITOR ANALYSIS */}
            <div className={`fixed inset-0 z-50 overflow-hidden ${activeCompetitorId !== null ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${activeCompetitorId !== null ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setActiveCompetitorId(null)}
                />
                
                {/* Drawer Panel */}
                <div className={`absolute inset-y-0 right-0 max-w-full flex transition-transform duration-500 transform ${activeCompetitorId !== null ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="w-screen md:w-[80vw] lg:w-[70vw] bg-[#0f172a] shadow-2xl flex flex-col h-full border-l border-slate-700">
                        
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-6 bg-[#1e293b] border-b border-slate-700">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-3 mb-1">
                                    <CalendarIcon className="w-6 h-6 text-cyan-400" />
                                    <h2 className="text-2xl font-bold text-white tracking-wide">Analisi Tariffe Mensili</h2>
                                </div>
                                {activeCompetitor && (
                                    <span className="text-slate-400 font-medium text-sm ml-9">Competitor: <span className="text-white font-bold">{activeCompetitor.name}</span></span>
                                )}
                             </div>
                            <button onClick={() => setActiveCompetitorId(null)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-full">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex flex-1 overflow-hidden">
                            
                            {/* Sidebar Month Selector */}
                            <div className="w-48 bg-[#1e293b] border-r border-slate-700 overflow-y-auto py-4">
                                {months.map((month, idx) => (
                                    <button
                                        key={month}
                                        onClick={() => setSelectedMonthIndex(idx)}
                                        className={`w-full text-left px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-between group ${selectedMonthIndex === idx ? 'bg-slate-800 text-cyan-400 border-r-4 border-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                    >
                                        {month}
                                        {selectedMonthIndex === idx && <ChevronRightIcon className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>

                            {/* Main Analysis Area */}
                            <div className="flex-1 overflow-auto p-8 bg-[#0f172a] flex items-start justify-center">
                                {activeCompetitor && (
                                    <div className="w-full max-w-4xl bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                                        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                                            <h3 className="text-xl font-black text-white uppercase tracking-wider">{months[selectedMonthIndex]}</h3>
                                            <div className="px-3 py-1 rounded bg-slate-700 text-cyan-400 text-xs font-bold uppercase tracking-wide border border-slate-600">Dettaglio Periodi</div>
                                        </div>
                                        
                                        <div className="p-0">
                                            <table className="w-full text-sm text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                                                        <th className="p-4 border-b border-r border-slate-700 w-1/4 text-center">Periodo</th>
                                                        <th className="p-4 border-b border-r border-slate-700 w-1/4 text-center">Dal Giorno</th>
                                                        <th className="p-4 border-b border-r border-slate-700 w-1/4 text-center">Al Giorno</th>
                                                        <th className="p-4 border-b border-slate-700 w-1/4 text-center">Prezzo (€)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700">
                                                    {getPricingFor(activeCompetitor.id, selectedMonthIndex).periods.map((period, pIndex) => (
                                                        <tr key={pIndex} className="hover:bg-slate-800/30 transition-colors bg-[#1e293b]">
                                                            <td className="p-4 font-bold text-cyan-400 border-r border-slate-700 text-center bg-slate-800/20">
                                                                PERIODO {pIndex + 1}
                                                            </td>
                                                            <td className="p-4 border-r border-slate-700">
                                                                <input 
                                                                    type="text" 
                                                                    value={period.from}
                                                                    onChange={(e) => updatePricing(activeCompetitor.id, selectedMonthIndex, pIndex, 'from', e.target.value)}
                                                                    className="w-full bg-slate-900 text-center text-white font-medium rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 border border-slate-700 placeholder-slate-600"
                                                                    placeholder="gg"
                                                                />
                                                            </td>
                                                            <td className="p-4 border-r border-slate-700">
                                                                 <input 
                                                                    type="text" 
                                                                    value={period.to}
                                                                    onChange={(e) => updatePricing(activeCompetitor.id, selectedMonthIndex, pIndex, 'to', e.target.value)}
                                                                    className="w-full bg-slate-900 text-center text-white font-medium rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 border border-slate-700 placeholder-slate-600"
                                                                    placeholder="gg"
                                                                />
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                                                                    <input 
                                                                        type="number" 
                                                                        value={period.price || ''}
                                                                        onChange={(e) => updatePricing(activeCompetitor.id, selectedMonthIndex, pIndex, 'price', e.target.value)}
                                                                        className="w-full bg-slate-900 text-center text-white font-bold rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 border border-slate-700 pl-8"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-800 border-t-2 border-slate-700">
                                                        <td colSpan={3} className="p-5 text-right font-bold text-slate-300 uppercase tracking-wider text-sm">Tariffa Media Mensile</td>
                                                        <td className="p-5 text-center font-black text-2xl text-cyan-400">
                                                            {formatCurrency(calculateAverage(getPricingFor(activeCompetitor.id, selectedMonthIndex).periods))}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Competitors;