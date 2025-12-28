
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MoonIcon, SunIcon, CalendarIcon, CashIcon, TrendingUpIcon, DesktopComputerIcon, ScaleIcon, LinkIcon, UsersIcon, DocumentReportIcon, MenuIcon, XIcon, ChevronDownIcon, PlusCircleIcon, PencilIcon, TrashIcon, DownloadIcon, CloudUploadIcon } from './components/icons';
import MonthlyPlanner from './components/MonthlyPlanner';
import BudgetPlanner from './components/BudgetPlanner';
import RollingForecast from './components/RollingForecast';
import Monitoring from './components/Monitoring';
import Costi from './components/Costi';
import TabellaPressione from './components/TabellaPressione';
import Competitors from './components/Competitors';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CloudSync } from './components/CloudSync';
import { cloudService } from './services/cloudService';
import type { Apartment, MonthlyData, BudgetDataForMonth, ForecastData, SavedActualData, ForecastInputs } from './types';

// Mappa delle icone per poterle salvare/caricare dal JSON
const iconMap: Record<string, React.ReactElement> = {
    'Calendar': <CalendarIcon />,
    'Cash': <CashIcon />,
    'TrendingUp': <TrendingUpIcon />,
    'Desktop': <DesktopComputerIcon />,
    'Scale': <ScaleIcon />,
    'Link': <LinkIcon />,
    'Users': <UsersIcon />,
    'Report': <DocumentReportIcon />
};

// Definizione della struttura di navigazione iniziale con stringhe per le icone
const initialNavigationConfig = [
    {
        name: "cluster",
        clusters: [
            {
                name: "Pianificazione Mensile",
                children: [
                    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
                ].map(m => ({ name: m, iconName: 'Calendar' }))
            },
            {
                name: "Analisi & Strumenti",
                children: [
                    { name: "Budget", iconName: 'Cash' },
                    { name: "Rolling Forecast", iconName: 'TrendingUp' },
                    { name: "Monitoring", iconName: 'Desktop' },
                    { name: "Prestazioni", iconName: 'TrendingUp' },
                    { name: "Costi", iconName: 'Cash' },
                    { name: "Tabella pressione", iconName: 'Scale' },
                    { name: "Derivazioni", iconName: 'Link' },
                    { name: "Competitors", iconName: 'Users' }
                ]
            }
        ]
    }
];

// Funzione helper per clonare in modo sicuro oggetti
const deepClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = deepClone(obj[key]);
        }
    }
    return newObj;
};

interface CellData {
    color: string;
    price?: number;
}


const initialApartmentsData = [
    "Pamar 2", "Alba marina", "Balcone sul Mare", "Casa del fico",
    "Casa Indipendenza", "Corte marina", "Gondola Apartment", "Kame house",
    "La conchiglia", "L'onda", "Mediterraneo apartment", "Nenetta a mare",
    "Orsini house", "Pamar 1", "Riviera", "Suite Centrale"
];

const initialApartments: Apartment[] = initialApartmentsData.map((name, index) => ({ id: index, name }));

const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const getDaysInMonth = (monthIndex: number, year: number) => new Date(year, monthIndex + 1, 0).getDate();

interface PageContentProps {
    activePage: string;
    currentYear: number;
    apartments: Apartment[];
    onApartmentNameChange: (id: number, newName: string) => void;
    onAddApartment: () => void;
    onRemoveApartment: (id: number) => void;
    onPreviousYear: () => void;
    onNextYear: () => void;
    onBudgetUpdate: (data: Record<string, BudgetDataForMonth>) => void;
    forecastData: ForecastData;
    budgetDataForMonitoring: MonthlyData | null;
    allBudgetData: Record<string, BudgetDataForMonth>;
    savedActualData: SavedActualData | null;
    onSaveActualData: (data: SavedActualData['data']) => void;
    allCellData: Record<string, Record<string, CellData>>;
    setAllCellData: React.Dispatch<React.SetStateAction<Record<string, Record<string, CellData>>>>;
    actualData: SavedActualData['data'] | null;
    onUpdateActuals: () => void;
    isUpdatingActuals: boolean;
    forecastInputs: ForecastInputs;
    setForecastInputs: React.Dispatch<React.SetStateAction<ForecastInputs>>;
    forecastMonthlyUnits: number[];
    setForecastMonthlyUnits: React.Dispatch<React.SetStateAction<number[]>>;
    availableClusters: string[];
    storagePrefix: string;
}

const PageContent: React.FC<PageContentProps> = ({ 
    activePage, 
    currentYear, 
    apartments, 
    onApartmentNameChange, 
    onAddApartment, 
    onRemoveApartment, 
    onPreviousYear, 
    onNextYear, 
    onBudgetUpdate,
    forecastData,
    budgetDataForMonitoring,
    allBudgetData,
    savedActualData,
    onSaveActualData,
    allCellData,
    setAllCellData,
    actualData,
    onUpdateActuals,
    isUpdatingActuals,
    forecastInputs,
    setForecastInputs,
    forecastMonthlyUnits,
    setForecastMonthlyUnits,
    availableClusters,
    storagePrefix
}) => {
    const isMonthPage = months.includes(activePage);
    
    if (activePage === 'Budget') {
        return (
            <BudgetPlanner 
                apartments={apartments}
                year={currentYear}
                onUpdate={onBudgetUpdate}
                storagePrefix={storagePrefix}
            />
        );
    }
    
    if (activePage === 'Rolling Forecast') {
        return (
            <RollingForecast
                apartments={apartments}
                year={currentYear}
                forecastInputs={forecastInputs}
                setForecastInputs={setForecastInputs}
                forecastMonthlyUnits={forecastMonthlyUnits}
                setForecastMonthlyUnits={setForecastMonthlyUnits}
            />
        );
    }

    if (activePage === 'Monitoring') {
        return <Monitoring 
            forecastData={forecastData} 
            budgetData={budgetDataForMonitoring} 
            savedActualData={savedActualData}
            onSaveActualData={onSaveActualData}
            actualData={actualData}
            onUpdateActuals={onUpdateActuals}
            isUpdatingActuals={isUpdatingActuals}
        />;
    }
    
    if (activePage === 'Costi') {
        return <Costi 
            forecastRevenue={forecastData.forecast} 
            availableNightsData={forecastData.occupazionePotenziale}
            forecastSoldNightsData={forecastData.totaleCamereOccupate}
            apartments={apartments}
            storagePrefix={storagePrefix}
        />;
    }

    if (activePage === 'Tabella pressione') {
        return <TabellaPressione storagePrefix={storagePrefix} />;
    }

    if (activePage === 'Competitors') {
        return <Competitors availableClusters={availableClusters} storagePrefix={storagePrefix} />;
    }

    if (isMonthPage) {
        return (
            <MonthlyPlanner 
                month={activePage} 
                year={currentYear} 
                apartments={apartments}
                onApartmentNameChange={onApartmentNameChange}
                onAddApartment={onAddApartment}
                onRemoveApartment={onRemoveApartment}
                onPreviousYear={onPreviousYear}
                onNextYear={onNextYear}
                allBudgetData={allBudgetData}
                allCellData={allCellData}
                setAllCellData={setAllCellData}
                storagePrefix={storagePrefix}
            />
        );
    }
    
    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md border dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-300">
                    Questa è l'area di contenuto per la pagina <span className="font-semibold text-primary">{activePage}</span>.
                </p>
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Prossimamente qui verranno visualizzati i dati e gli strumenti specifici.
                </p>
            </div>
        </div>
    );
};

// --- Components Extracted for Performance ---

const NavLink: React.FC<{name: string, icon: React.ReactElement<{ className?: string }>, isActive: boolean, onClick: () => void}> = ({ name, icon, isActive, onClick }) => (
    <a
        href="#"
        onClick={(e) => {
            e.preventDefault();
            onClick();
        }}
        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-white/20 dark:bg-primary text-white shadow-sm'
                : 'text-green-100 dark:text-gray-300 hover:bg-primary-light dark:hover:bg-dark-secondary'
        }`}
    >
        {React.cloneElement(icon, { className: "w-5 h-5 mr-3" })}
        <span>{name}</span>
    </a>
);

interface SidebarProps {
    navigationData: typeof initialNavigationConfig;
    openMacroClusters: string[];
    openClusters: string[];
    activePage: string;
    toggleMacroCluster: (name: string) => void;
    toggleCluster: (name: string) => void;
    setActivePage: (name: string) => void;
    setIsSidebarOpen: (isOpen: boolean) => void;
    handleCreateCluster: () => void;
    openRenameModal: (name: string) => void;
    openDeleteModal: (name: string) => void;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
    setActiveMacroCluster: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    navigationData, openMacroClusters, openClusters, activePage,
    toggleMacroCluster, toggleCluster, setActivePage, setIsSidebarOpen,
    handleCreateCluster, openRenameModal, openDeleteModal,
    onExport, onImport, onReset, setActiveMacroCluster
}) => {
    return (
        <aside className="flex flex-col w-64 h-full px-4 py-8 bg-primary dark:bg-black border-r border-primary-dark dark:border-dark-border overflow-y-auto">
            <div className="px-2">
                <h2 className="text-2xl font-bold text-white">Jimmi</h2>
                <span className="text-xs text-green-200/70 font-medium">by Quality Host</span>
            </div>

            <div className="mt-6">
                <button
                    onClick={handleCreateCluster}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-600 transition-colors duration-200 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>Crea Cluster</span>
                </button>
            </div>

            <div className="relative mt-6 flex-1">
                <nav className="space-y-2">
                    {navigationData.map(macroCluster => {
                        const isMacroOpen = openMacroClusters.includes(macroCluster.name);
                        return (
                            <div key={macroCluster.name}>
                                <div className="w-full flex items-center justify-between text-sm font-semibold text-white dark:text-gray-200 uppercase tracking-wider rounded-lg bg-primary-dark dark:bg-dark-card mb-1 overflow-hidden group">
                                    <button
                                        onClick={() => toggleMacroCluster(macroCluster.name)}
                                        className="flex-grow flex items-center justify-between px-2 py-3 focus:outline-none hover:bg-primary dark:hover:bg-dark-secondary transition-colors"
                                    >
                                        <span className="truncate">{macroCluster.name}</span>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${isMacroOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className="flex items-center pr-2 gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openRenameModal(macroCluster.name); }} className="p-1 text-green-100 hover:text-white dark:text-gray-400 dark:hover:text-white rounded hover:bg-primary/50 dark:hover:bg-dark-secondary transition-colors" title="Rinomina">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openDeleteModal(macroCluster.name); }} className="p-1 text-green-100 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 rounded hover:bg-primary/50 dark:hover:bg-dark-secondary transition-colors" title="Elimina">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className={`mt-1 space-y-2 transition-all duration-300 ease-in-out overflow-hidden ${isMacroOpen ? 'max-h-screen' : 'max-h-0'}`}>
                                    <div className="pl-2 space-y-2">
                                        {macroCluster.clusters.map(cluster => {
                                            const isOpen = openClusters.includes(cluster.name);
                                            return (
                                                <div key={cluster.name}>
                                                    <button
                                                        onClick={() => toggleCluster(cluster.name)}
                                                        className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-green-100 dark:text-gray-400 uppercase tracking-wider rounded-lg hover:bg-primary-light dark:hover:bg-dark-secondary focus:outline-none"
                                                    >
                                                        <span>{cluster.name}</span>
                                                        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <div className={`mt-1 space-y-1 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                                                        <div className="pl-2 pr-1 py-1">
                                                            {cluster.children.map((item: any) => (
                                                                <NavLink
                                                                    key={item.name}
                                                                    name={item.name}
                                                                    icon={iconMap[item.iconName] || <DocumentReportIcon />}
                                                                    isActive={activePage === item.name}
                                                                    onClick={() => { 
                                                                        setActivePage(item.name); 
                                                                        setActiveMacroCluster(macroCluster.name);
                                                                        setIsSidebarOpen(false); 
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Import / Export / Reset Footer */}
            <div className="mt-auto pt-6 px-2 border-t border-primary-dark dark:border-dark-border space-y-3">
                <CloudSync />

                <h3 className="text-xs font-bold text-green-200 dark:text-gray-500 uppercase tracking-wider px-2">Gestione Backup</h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onExport}
                        className="w-full flex items-center justify-center gap-2 bg-primary-dark/50 hover:bg-primary-light dark:bg-dark-card dark:hover:bg-dark-secondary text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        ESPORTA JSON
                    </button>
                    <label className="w-full flex items-center justify-center gap-2 bg-primary-light hover:bg-primary dark:bg-primary/50 dark:hover:bg-primary text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                        <CloudUploadIcon className="w-4 h-4" />
                        RIPRISTINA JSON
                        <input type="file" onChange={onImport} className="hidden" accept=".json" />
                    </label>
                    <button
                        onClick={onReset}
                        className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 dark:bg-red-900/50 dark:hover:bg-red-800 text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors mt-2"
                    >
                        <TrashIcon className="w-4 h-4" />
                        RESET TOTALE
                    </button>
                </div>
            </div>
        </aside>
    );
};

const Header: React.FC<{ activePage: string; isSidebarOpen: boolean; setIsSidebarOpen: (v: boolean) => void; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void; isSidebarCollapsed: boolean; setIsSidebarCollapsed: (v: boolean) => void }> = ({ activePage, isSidebarOpen, setIsSidebarOpen, isDarkMode, setIsDarkMode, isSidebarCollapsed, setIsSidebarCollapsed }) => (
    <header className="bg-white dark:bg-dark-card shadow-sm z-10 border-b dark:border-dark-border">
        <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                    aria-label="Apri menu"
                    className="text-gray-500 dark:text-gray-400 focus:outline-none md:hidden"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                </button>
                {/* Desktop sidebar toggle */}
                <button
                    aria-label={isSidebarCollapsed ? "Mostra sidebar" : "Nascondi sidebar"}
                    className="hidden md:flex text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary focus:outline-none p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    {isSidebarCollapsed ? <MenuIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5 -rotate-90" />}
                </button>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{activePage}</h1>
            </div>
            <button aria-label="Cambia tema" onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-secondary">
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
        </div>
    </header>
);

const CreateClusterModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void }> = ({ isOpen, onClose, onSubmit, name, setName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Crea un nuovo Cluster</h3>
                    <button aria-label="Chiudi" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={onSubmit}>
                    <label htmlFor="clusterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome del Cluster</label>
                    <input type="text" id="clusterName" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" autoFocus />
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Annulla</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">Crea</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RenameClusterModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void }> = ({ isOpen, onClose, onSubmit, name, setName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Rinomina Cluster</h3>
                    <button aria-label="Chiudi" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={onSubmit}>
                    <label htmlFor="renameCluster" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nuovo Nome</label>
                    <input type="text" id="renameCluster" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" autoFocus />
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Annulla</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">Salva</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteClusterModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; clusterName: string | null }> = ({ isOpen, onClose, onConfirm, clusterName }) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        if (isOpen) setIsConfirmed(false);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all border border-red-200 dark:border-red-900">
                <div className="flex flex-col items-center text-center mb-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                        <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Elimina Cluster</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Sei sicuro di voler eliminare il cluster <span className="font-bold text-gray-800 dark:text-white">"{clusterName}"</span>?
                        <br/>Questa azione non può essere annullata.
                    </p>
                </div>
                
                <div className="flex items-start gap-2 mb-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/30">
                    <input 
                        type="checkbox" 
                        id="confirmDelete" 
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="confirmDelete" className="text-xs text-left text-gray-600 dark:text-gray-300">
                        Confermo di voler eliminare definitivamente questo cluster e tutto il suo contenuto.
                    </label>
                </div>

                <div className="mt-2 flex justify-center gap-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Annulla</button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        disabled={!isConfirmed}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Elimina Definitivamente
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main App Component ---

const App: React.FC = () => {
    const [activePage, setActivePage] = useLocalStorage<string>('budget-app-active-page', 'Gennaio');
    const [activeMacroCluster, setActiveMacroCluster] = useLocalStorage<string>('budget-app-active-macro-cluster', 'cluster');
    const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('budget-app-dark-mode', false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>('budget-app-sidebar-collapsed', false);
    const [openClusters, setOpenClusters] = useLocalStorage<string[]>('budget-app-open-clusters', ['Pianificazione Mensile']);
    const [openMacroClusters, setOpenMacroClusters] = useLocalStorage<string[]>('budget-app-open-macro-clusters', ['cluster']);
    const [navigationData, setNavigationData] = useLocalStorage('budget-app-navigation', initialNavigationConfig);
    
    // Prefix for scoped storage keys based on active cluster
    const storagePrefix = `budget-app-${activeMacroCluster}`;

    // Modal States
    const [isCreateClusterModalOpen, setIsCreateClusterModalOpen] = useState(false);
    const [newClusterName, setNewClusterName] = useState('');
    
    const [renameClusterModalOpen, setRenameClusterModalOpen] = useState(false);
    const [editingCluster, setEditingCluster] = useState<string | null>(null);
    const [renameClusterName, setRenameClusterName] = useState('');

    const [deleteClusterModalOpen, setDeleteClusterModalOpen] = useState(false);
    const [deletingCluster, setDeletingCluster] = useState<string | null>(null);

    const [currentYear, setCurrentYear] = useLocalStorage<number>(`${storagePrefix}-current-year`, new Date().getFullYear());
    
    const [apartments, setApartments] = useLocalStorage<Apartment[]>(`${storagePrefix}-apartments`, initialApartments);
    
    const [allCellData, setAllCellData] = useLocalStorage<Record<string, Record<string, CellData>>>(`${storagePrefix}-cell-data`, () => {
        const initialAllData: Record<string, Record<string, CellData>> = {};
        const blockedInfo = [
            { name: "Pamar 2", start: 18, end: 27, text: "Bloccata" },
            { name: "La conchiglia", start: 5, end: 15, text: "Blocc." },
            { name: "Pamar 1", start: 15, end: 24, text: "Bloccata" },
        ];
        
        const year = new Date().getFullYear();
        const initialDataForJanuary: Record<string, CellData> = {};
        
        blockedInfo.forEach(info => {
            const apt = initialApartments.find(a => a.name === info.name);
            if (apt) {
                for (let i = info.start; i <= info.end; i++) {
                    initialDataForJanuary[`${apt.id}-${i}`] = { 
                        price: i === info.start ? -1 : undefined,
                        color: '' 
                    };
                }
            }
        });

        initialAllData[`${year}-Gennaio`] = initialDataForJanuary;
        return initialAllData;
    });


    // Stato per i dati di monitoring
    const [budgetDataForMonitoring, setBudgetDataForMonitoring] = useState<MonthlyData | null>(null);
    const [allBudgetData, setAllBudgetData] = useLocalStorage<Record<string, BudgetDataForMonth>>(`${storagePrefix}-all-budget-data`, {});
    const [savedActualData, setSavedActualData] = useLocalStorage<SavedActualData | null>(`${storagePrefix}-saved-actual`, null);
    const [actualData, setActualData] = useLocalStorage<SavedActualData['data'] | null>(`${storagePrefix}-actual-data`, null);
    const [isUpdatingActuals, setIsUpdatingActuals] = useState(false);

    // Stato per gli input del forecast
    const [forecastInputs, setForecastInputs] = useLocalStorage<ForecastInputs>(`${storagePrefix}-forecast-inputs`, {
        percentualeOccupazionePrevista: [1.00, 3.00, 10.00, 30.00, 30.00, 70.00, 80.00, 90.00, 70.00, 10.00, 1.00, 3.00],
        adr: [60.00, 60.00, 50.00, 60.00, 55.00, 90.00, 100.00, 150.00, 90.00, 50.00, 60.00, 60.00],
        fatturatoAnnoPrecedente: Array(12).fill(0),
    });
    const [forecastMonthlyUnits, setForecastMonthlyUnits] = useLocalStorage<number[]>(`${storagePrefix}-forecast-units`, Array(12).fill(apartments.length));
    
    const availableClusters = useMemo(() => navigationData.map(item => item.name), [navigationData]);

    useEffect(() => {
        if (forecastMonthlyUnits.length === 0) {
             setForecastMonthlyUnits(Array(12).fill(apartments.length));
        }
    }, [apartments.length]);

    // Calcolo centralizzato dei dati di forecast
    const forecastData = useMemo((): ForecastData => {
        const monthlyCalculations = months.map((_, i) => {
            const daysInMonth = getDaysInMonth(i, currentYear);
            const numberOfUnits = forecastMonthlyUnits[i] || 0;
            const occupazionePotenzialeMassima = numberOfUnits * daysInMonth;
            const percentualeOccupazione = forecastInputs.percentualeOccupazionePrevista[i] / 100;
            const adr = forecastInputs.adr[i];

            const totaleCamereOccupate = occupazionePotenzialeMassima * percentualeOccupazione;
            const obiettivo = totaleCamereOccupate * adr;
            const revPar = occupazionePotenzialeMassima > 0 ? obiettivo / occupazionePotenzialeMassima : 0;
            
            return {
                occupazionePotenzialeMassima,
                totaleCamereOccupate,
                obiettivo,
                revPar,
            };
        });

        const totals = {
            occupazionePotenzialeMassima: monthlyCalculations.reduce((sum, data) => sum + data.occupazionePotenzialeMassima, 0),
            totaleCamereOccupate: monthlyCalculations.reduce((sum, data) => sum + data.totaleCamereOccupate, 0),
            obiettivo: monthlyCalculations.reduce((sum, data) => sum + data.obiettivo, 0),
        };
        
        const totalPercentage = totals.occupazionePotenzialeMassima > 0 ? (totals.totaleCamereOccupate / totals.occupazionePotenzialeMassima) * 100 : 0;
        const totalAdr = totals.totaleCamereOccupate > 0 ? totals.obiettivo / totals.totaleCamereOccupate : 0;
        const totalRevPar = totals.occupazionePotenzialeMassima > 0 ? totals.obiettivo / totals.occupazionePotenzialeMassima : 0;
        
        return {
            occupazionePotenziale: { values: [totals.occupazionePotenzialeMassima, ...monthlyCalculations.map(c => c.occupazionePotenzialeMassima)] },
            percentualeOccupazione: { values: [totalPercentage, ...forecastInputs.percentualeOccupazionePrevista] },
            totaleCamereOccupate: { values: [totals.totaleCamereOccupate, ...monthlyCalculations.map(c => c.totaleCamereOccupate)] },
            adr: { values: [totalAdr, ...forecastInputs.adr] },
            revPar: { values: [totalRevPar, ...monthlyCalculations.map(c => c.revPar)] },
            forecast: { values: [totals.obiettivo, ...monthlyCalculations.map(c => c.obiettivo)] }
        };
    }, [forecastInputs, forecastMonthlyUnits, currentYear]);


    const handleUpdateActualsFromMonthlyPlans = async () => {
        setIsUpdatingActuals(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const monthlyMetrics = months.map((month, monthIndex) => {
            const monthKey = `${currentYear}-${month}`;
            const cellDataForMonth = allCellData[monthKey] || {};
            const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();

            let totalRevenue = 0;
            let totalSoldNights = 0;

            apartments.forEach(apt => {
                for (let day = 1; day <= daysInMonth; day++) {
                    const key = `${apt.id}-${day}`;
                    const data = cellDataForMonth[key];
                    if (data && data.color && data.price && data.price > 0) {
                        totalSoldNights++;
                        totalRevenue += data.price || 0;
                    }
                }
            });

            const totalAvailableNights = apartments.length > 0 ? apartments.length * daysInMonth : 0;
            const occupancyRate = totalAvailableNights > 0 ? (totalSoldNights / totalAvailableNights) * 100 : 0;
            const adr = totalSoldNights > 0 ? totalRevenue / totalSoldNights : 0;
            const revPar = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0;

            return {
                businessOnTheBooks: totalRevenue,
                roomNightsOnTheBooks: totalSoldNights,
                occupazioneOnTheBooks: occupancyRate,
                adrAttuale: adr,
                revParAttuale: revPar,
            };
        });

        const totalBusiness = monthlyMetrics.reduce((sum, m) => sum + m.businessOnTheBooks, 0);
        const totalNights = monthlyMetrics.reduce((sum, m) => sum + m.roomNightsOnTheBooks, 0);
        const totalAvailableNightsAllYear = months.reduce((sum, month, i) => sum + (apartments.length * new Date(currentYear, i + 1, 0).getDate()), 0);
        const totalOccupancy = totalAvailableNightsAllYear > 0 ? (totalNights / totalAvailableNightsAllYear) * 100 : 0;
        const totalAdr = totalNights > 0 ? totalBusiness / totalNights : 0;
        const totalRevPar = totalAvailableNightsAllYear > 0 ? totalBusiness / totalAvailableNightsAllYear : 0;

        const finalActualData: SavedActualData['data'] = {
            businessOnTheBooks: { values: [totalBusiness, ...monthlyMetrics.map(m => m.businessOnTheBooks)] },
            roomNightsOnTheBooks: { values: [totalNights, ...monthlyMetrics.map(m => m.roomNightsOnTheBooks)] },
            occupazioneOnTheBooks: { values: [totalOccupancy, ...monthlyMetrics.map(m => m.occupazioneOnTheBooks)] },
            adrAttuale: { values: [totalAdr, ...monthlyMetrics.map(m => m.adrAttuale)] },
            revParAttuale: { values: [totalRevPar, ...monthlyMetrics.map(m => m.revParAttuale)] },
        };
        
        setActualData(finalActualData);
        setIsUpdatingActuals(false);
    };

    const handleBudgetUpdate = useCallback((data: Record<string, BudgetDataForMonth>) => {
        setAllBudgetData(data);
        
        const totalBudget = Object.values(data).reduce((sum, monthData) => sum + monthData.budgetMensile, 0);
        const monthlyBudgets = months.map(month => data[`${currentYear}-${month}`]?.budgetMensile || 0);
        setBudgetDataForMonitoring({ values: [totalBudget, ...monthlyBudgets] });
    }, [currentYear]);

    const handleSaveActualData = (dataToSave: SavedActualData['data']) => {
        setSavedActualData({
            timestamp: new Date().toISOString(),
            data: dataToSave,
        });
        alert('Dati "Actual" salvati con successo!');
    };


    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
        }
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        // Only auto-open the cluster that contains the active page
        // within the currently selected macro cluster
        const currentMacro = navigationData.find(m => m.name === activeMacroCluster);
        if (currentMacro) {
            for (const sub of currentMacro.clusters) {
                if (sub.children.some((child: any) => child.name === activePage)) {
                    if (!openMacroClusters.includes(currentMacro.name)) {
                        setOpenMacroClusters(prev => [...prev, currentMacro.name]);
                    }
                    if (!openClusters.includes(sub.name)) {
                        setOpenClusters(prev => [...prev, sub.name]);
                    }
                    break;
                }
            }
        }
    }, [activePage, activeMacroCluster]);
    
    const handleCreateCluster = () => {
        setIsCreateClusterModalOpen(true);
    };

    const handleConfirmCreateCluster = (e: React.FormEvent) => {
        e.preventDefault();
        if (newClusterName && newClusterName.trim() !== "") {
            const trimmedName = newClusterName.trim();
            
            const newClusters = deepClone(initialNavigationConfig[0].clusters);
            
            const newMacroCluster = {
                name: trimmedName,
                clusters: newClusters,
            };
            
            setNavigationData(prev => [...prev, newMacroCluster]);
            setOpenMacroClusters(prev => [...prev, trimmedName]);
            setIsCreateClusterModalOpen(false);
            setNewClusterName('');
        }
    };

    const openRenameModal = (clusterName: string) => {
        setEditingCluster(clusterName);
        setRenameClusterName(clusterName);
        setRenameClusterModalOpen(true);
    };

    const handleConfirmRenameCluster = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCluster && renameClusterName.trim() !== "") {
            setNavigationData(prev => prev.map(cluster => 
                cluster.name === editingCluster ? { ...cluster, name: renameClusterName.trim() } : cluster
            ));
            
            if (openMacroClusters.includes(editingCluster)) {
                setOpenMacroClusters(prev => prev.map(name => name === editingCluster ? renameClusterName.trim() : name));
            }
            
            setRenameClusterModalOpen(false);
            setEditingCluster(null);
            setRenameClusterName('');
        }
    };

    const openDeleteModal = (clusterName: string) => {
        setDeletingCluster(clusterName);
        setDeleteClusterModalOpen(true);
    };

    const handleConfirmDeleteCluster = () => {
        if (deletingCluster) {
            setNavigationData(prev => prev.filter(cluster => cluster.name !== deletingCluster));
            setOpenMacroClusters(prev => prev.filter(name => name !== deletingCluster));
            setDeleteClusterModalOpen(false);
            setDeletingCluster(null);
        }
    };
    
    const handleApartmentNameChange = (id: number, newName: string) => {
        setApartments(current => current.map(apt => apt.id === id ? { ...apt, name: newName } : apt));
    };

    const handleAddApartment = () => {
        const newApartment: Apartment = { id: Date.now(), name: "Nuova Struttura" };
        setApartments(current => [...current, newApartment]);
    };

    const handleRemoveApartment = (id: number) => {
        setApartments(current => current.filter(apt => apt.id !== id));
    };

    const toggleMacroCluster = (macroName: string) => {
        setOpenMacroClusters(prev =>
            prev.includes(macroName)
                ? prev.filter(name => name !== macroName)
                : [...prev, macroName]
        );
    };

    const toggleCluster = (clusterName: string) => {
        setOpenClusters(prev => 
            prev.includes(clusterName)
                ? prev.filter(name => name !== clusterName)
                : [...prev, clusterName]
        );
    };

    const handleExportBackup = () => {
        const backup: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('budget-app-')) {
                const value = localStorage.getItem(key);
                try {
                    backup[key] = JSON.parse(value || 'null');
                } catch (e) {
                    backup[key] = value;
                }
            }
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "budget_backup_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files[0]) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        const backup = JSON.parse(content);
                        Object.keys(backup).forEach(key => {
                            if (key.startsWith('budget-app-')) {
                                localStorage.setItem(key, JSON.stringify(backup[key]));
                            }
                        });
                        alert('Backup ripristinato con successo! La pagina verrà ricaricata.');
                        window.location.reload();
                    }
                } catch (error) {
                    alert('Errore durante la lettura del file di backup.');
                    console.error(error);
                }
            };
        }
    };

    const handleFullReset = async () => {
        if (confirm("ATTENZIONE: Stai per cancellare TUTTI i dati salvati, sia sul tuo computer che sul Cloud (se connesso). Questa azione è irreversibile. Sei sicuro?")) {
            if (confirm("Conferma finale: Vuoi davvero cancellare tutto?")) {
                try {
                    // 1. Clear Cloud
                    await cloudService.clearData();
                    // 2. Clear LocalStorage
                    localStorage.clear();
                    // 3. Reload
                    window.location.reload();
                } catch (e) {
                    console.error("Reset fallito:", e);
                    // Fallback se il cloud fallisce: cancella almeno locale
                    localStorage.clear();
                    window.location.reload();
                }
            }
        }
    };

    return (
        <div className="flex h-screen bg-light dark:bg-dark text-gray-900 dark:text-gray-100 font-sans">
            <div className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
                <Sidebar 
                    navigationData={navigationData}
                    openMacroClusters={openMacroClusters}
                    openClusters={openClusters}
                    activePage={activePage}
                    toggleMacroCluster={toggleMacroCluster}
                    toggleCluster={toggleCluster}
                    setActivePage={setActivePage}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleCreateCluster={handleCreateCluster}
                    openRenameModal={openRenameModal}
                    openDeleteModal={openDeleteModal}
                    onExport={handleExportBackup}
                    onImport={handleImportBackup}
                    onReset={handleFullReset}
                    setActiveMacroCluster={setActiveMacroCluster}
                />
            </div>

            <div className={`fixed inset-0 z-30 transition-opacity bg-black bg-opacity-50 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)}></div>
            <div className={`fixed inset-y-0 left-0 z-40 w-64 transition-transform transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <Sidebar 
                    navigationData={navigationData}
                    openMacroClusters={openMacroClusters}
                    openClusters={openClusters}
                    activePage={activePage}
                    toggleMacroCluster={toggleMacroCluster}
                    toggleCluster={toggleCluster}
                    setActivePage={setActivePage}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleCreateCluster={handleCreateCluster}
                    openRenameModal={openRenameModal}
                    openDeleteModal={openDeleteModal}
                    onExport={handleExportBackup}
                    onImport={handleImportBackup}
                    onReset={handleFullReset}
                    setActiveMacroCluster={setActiveMacroCluster}
                />
            </div>

            <div className="flex flex-col flex-1 w-0">
                <Header
                    activePage={activePage}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                />
                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                   <PageContent 
                        activePage={activePage}
                        currentYear={currentYear}
                        apartments={apartments}
                        onApartmentNameChange={handleApartmentNameChange}
                        onAddApartment={handleAddApartment}
                        onRemoveApartment={handleRemoveApartment}
                        onPreviousYear={() => setCurrentYear(y => y - 1)}
                        onNextYear={() => setCurrentYear(y => y + 1)}
                        onBudgetUpdate={handleBudgetUpdate}
                        forecastData={forecastData}
                        budgetDataForMonitoring={budgetDataForMonitoring}
                        allBudgetData={allBudgetData}
                        savedActualData={savedActualData}
                        onSaveActualData={handleSaveActualData}
                        allCellData={allCellData}
                        setAllCellData={setAllCellData}
                        actualData={actualData}
                        onUpdateActuals={handleUpdateActualsFromMonthlyPlans}
                        isUpdatingActuals={isUpdatingActuals}
                        forecastInputs={forecastInputs}
                        setForecastInputs={setForecastInputs}
                        forecastMonthlyUnits={forecastMonthlyUnits}
                        setForecastMonthlyUnits={setForecastMonthlyUnits}
                        availableClusters={availableClusters}
                        storagePrefix={storagePrefix}
                   />
                </main>
            </div>
            
            <CreateClusterModal 
                isOpen={isCreateClusterModalOpen} 
                onClose={() => setIsCreateClusterModalOpen(false)} 
                onSubmit={handleConfirmCreateCluster} 
                name={newClusterName} 
                setName={setNewClusterName} 
            />
            <RenameClusterModal 
                isOpen={renameClusterModalOpen} 
                onClose={() => setRenameClusterModalOpen(false)} 
                onSubmit={handleConfirmRenameCluster} 
                name={renameClusterName} 
                setName={setRenameClusterName} 
            />
            <DeleteClusterModal 
                isOpen={deleteClusterModalOpen} 
                onClose={() => setDeleteClusterModalOpen(false)} 
                onConfirm={handleConfirmDeleteCluster} 
                clusterName={deletingCluster} 
            />
        </div>
    );
};

export default App;
