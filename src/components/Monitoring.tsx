import React, { useMemo, useState } from 'react';
import type { ForecastData, MonthlyData, SavedActualData } from '../types';
import { RefreshIcon } from './icons';

type FormatType = 'currency' | 'percentage' | 'integer' | 'decimal';

interface MetricRow {
  label: string;
  isHeader?: boolean;
  values: (number | string | null)[];
  format: FormatType | null;
  bold?: boolean;
  highlightRow?: boolean;
}

interface MonitoringProps {
    forecastData: ForecastData | null;
    budgetData: MonthlyData | null;
    savedActualData: SavedActualData | null;
    onSaveActualData: (data: SavedActualData['data']) => void;
    actualData: SavedActualData['data'] | null;
    onUpdateActuals: () => void;
    isUpdatingActuals: boolean;
}

const headers = ['TOTALE', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const formatters: Record<FormatType, (val: number) => string> = {
    currency: (val: number) => val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
    percentage: (val: number) => `${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    integer: (val: number) => val.toLocaleString('it-IT', { maximumFractionDigits: 0 }),
    decimal: (val: number) => val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

const formatValue = (value: number | string | null, format: FormatType | null): string => {
    if (typeof value !== 'number') {
        return value || '';
    }
    if (isNaN(value)) {
        return '#DIV/0!';
    }
    if (format && formatters[format]) {
        return formatters[format](value);
    }
    return value.toString();
};

const getCellClasses = (value: any, isLabel: boolean, colIndex: number, row: MetricRow): string => {
    const classes = ['p-3', 'border-b', 'border-gray-100', 'dark:border-slate-700/50', 'whitespace-nowrap', 'transition-colors', 'duration-150'];
    const { bold, highlightRow, format, label } = row;
    const isTotalCol = colIndex === 0;

    // Base styling for label vs data cells
    if (isLabel) {
        classes.push('text-left', 'text-gray-600', 'dark:text-slate-400', 'bg-white', 'dark:bg-[#141414]', 'border-r', 'dark:border-slate-700');
        if (bold) {
            classes.push('font-bold', 'text-gray-800', 'dark:text-slate-200');
        }
    } else {
        classes.push('text-right', 'text-gray-800', 'dark:text-slate-200', 'bg-white', 'dark:bg-[#141414]', 'border-r', 'dark:border-slate-700/50', 'last:border-0');
    }

    if (bold) {
        classes.push('font-semibold');
    }
    
    // Highlight TOTALE column
    if (isTotalCol && !isLabel) {
        classes.push('bg-gray-50', 'dark:bg-slate-900/30', 'font-bold', 'text-gray-900', 'dark:text-white');
    }

    // Highlight FORECAST/BUDGET rows (overrides other styles)
    if (label === 'FORECAST' || label === 'BUDGET') {
        classes.push('!bg-teal-50', '!dark:bg-teal-900/20', 'font-black', '!text-teal-800', '!dark:text-teal-300');
    }

    const isNegative = typeof value === 'number' && value < 0;
    if (highlightRow) {
        classes.push('!bg-red-50', '!dark:bg-red-900/20', '!text-red-800', '!dark:text-red-300', 'font-bold');
    } else if (isNegative && !isLabel && format !== 'percentage') {
         classes.push('text-red-600', 'dark:text-red-400', 'font-medium');
    }
    
    return classes.join(' ');
};

const monitoringDataTemplate: MetricRow[] = [
    // Panoramica
    { label: 'Occupazione potenziale', values: Array(13).fill(0), format: 'integer' },
    { label: 'Percentuale di occupazione prevista', values: Array(13).fill(0), format: 'percentage' },
    { label: 'Totale camere occupate per mese', values: Array(13).fill(0), format: 'integer' },
    { label: 'ADR', values: Array(13).fill(0), format: 'currency' },
    { label: 'REV PAR (Revenue per available room)', values: Array(13).fill(0), format: 'currency' },
    { label: 'FORECAST', values: Array(13).fill(0), format: 'currency', bold: true },
    { label: 'BUDGET', values: Array(13).fill(0), format: 'currency', bold: true },
    
    // ACTUAL
    { label: 'ACTUAL', isHeader: true, values: [], format: null },
    { label: 'Business on the Books', values: Array(13).fill(0), format: 'currency' },
    { label: 'Room Nights On The Books', values: Array(13).fill(0), format: 'integer' },
    { label: 'Occupazione On The Books', values: Array(13).fill(0), format: 'percentage' },
    { label: 'ADR Attuale', values: Array(13).fill(0), format: 'currency' },
    { label: 'Rev Par Attuale', values: Array(13).fill(0), format: 'currency' },

    // SCOSTAMENTI CON ACTUAL
    { label: 'SCOSTAMENTI CON ACTUAL', isHeader: true, values: [], format: null },
    { label: 'Business on the Books', values: Array(13).fill(0), format: 'currency' },
    { label: 'Room Nights On The Books', values: Array(13).fill(0), format: 'integer' },
    { label: 'Occupazione On The Books', values: Array(13).fill(0), format: 'percentage', highlightRow: true },
    { label: 'ADR Attuale', values: Array(13).fill(0), format: 'currency' },
    { label: 'Rev Par Attuale', values: Array(13).fill(0), format: 'currency' },

    // DATI AL...
    { label: 'DATI AL...', isHeader: true, values: [], format: null },
    { label: 'Business on the Books', values: Array(13).fill(0), format: 'currency' },
    { label: 'Room Nights On The Books', values: Array(13).fill(0), format: 'integer' },
    { label: 'Occupazione On The Books', values: Array(13).fill(0), format: 'percentage' },
    { label: 'ADR Attuale', values: Array(13).fill(0), format: 'currency' },
    { label: 'Rev Par Attuale', values: Array(13).fill(0), format: 'currency' },
    
    // SCOSTAMENTI CON DATA PASSATA
    { label: 'SCOSTAMENTI CON DATA PASSATA', isHeader: true, values: [], format: null },
    { label: 'Scostamento Business on the Books', values: Array(13).fill(0), format: 'currency' },
    { label: 'Differenza camere', values: Array(13).fill(0), format: 'integer' },
    { label: 'Scostamento Occupazione', values: Array(13).fill(0), format: 'percentage', highlightRow: true },
    { label: 'Scostamento ADR', values: Array(13).fill(0), format: 'currency' },
    { label: 'Scostamento Rev Par', values: Array(13).fill(0), format: 'currency' },
    
    // SCOSTAMENTI CON DATA ANNO PASSATO
    { label: 'SCOSTAMENTI CON DATA ANNO PASSATO', isHeader: true, values: [], format: null },
    { label: 'FATTURATO ANNO PRECEDENTE $$$', values: Array(13).fill(0), format: 'currency' },
    { label: 'Room Nights On The Books', values: Array(13).fill(0), format: 'integer' },
    { label: 'Occupazione anno precedente', values: Array(13).fill(0), format: 'percentage' },
    { label: 'ADR', values: Array(13).fill(0), format: 'currency' },
    { label: 'REV PAR', values: Array(13).fill(0), format: 'currency' },
];

const Monitoring: React.FC<MonitoringProps> = ({ forecastData, budgetData, savedActualData, onSaveActualData, actualData, onUpdateActuals, isUpdatingActuals }) => {
    
    const [importedData, setImportedData] = useState<{title: string, rows: MetricRow[]} | null>(null);

    const monitoringData = useMemo(() => {
        const dynamicData: MetricRow[] = JSON.parse(JSON.stringify(monitoringDataTemplate));

        const updateRow = (label: string, newValues: number[]) => {
            const row = dynamicData.find(r => r.label === label);
            if (row) {
                row.values = newValues;
            }
        };

        if (forecastData) {
            updateRow('Occupazione potenziale', forecastData.occupazionePotenziale.values);
            updateRow('Percentuale di occupazione prevista', forecastData.percentualeOccupazione.values);
            updateRow('Totale camere occupate per mese', forecastData.totaleCamereOccupate.values);
            updateRow('ADR', forecastData.adr.values);
            updateRow('REV PAR (Revenue per available room)', forecastData.revPar.values);
            updateRow('FORECAST', forecastData.forecast.values);
        }

        if (budgetData) {
            updateRow('BUDGET', budgetData.values);
        }
        
        if (actualData) {
            const actualSectionIndex = dynamicData.findIndex(r => r.label === 'ACTUAL' && r.isHeader);
            if (actualSectionIndex > -1) {
                dynamicData[actualSectionIndex + 1].values = actualData.businessOnTheBooks.values;
                dynamicData[actualSectionIndex + 2].values = actualData.roomNightsOnTheBooks.values;
                dynamicData[actualSectionIndex + 3].values = actualData.occupazioneOnTheBooks.values;
                dynamicData[actualSectionIndex + 4].values = actualData.adrAttuale.values;
                dynamicData[actualSectionIndex + 5].values = actualData.revParAttuale.values;
            }
            
            const scostamentiSectionIndex = dynamicData.findIndex(r => r.label === 'SCOSTAMENTI CON ACTUAL' && r.isHeader);
            if (scostamentiSectionIndex > -1) {
                const forecastBusinessRow = dynamicData.find(r => r.label === 'FORECAST');
                const actualBusinessRow = dynamicData[actualSectionIndex + 1];
                if (forecastBusinessRow) {
                    dynamicData[scostamentiSectionIndex + 1].values = forecastBusinessRow.values.map((f, i) => (actualBusinessRow.values[i] as number) - (f as number));
                }

                const forecastRoomNightsRow = dynamicData.find(r => r.label === 'Totale camere occupate per mese');
                const actualRoomNightsRow = dynamicData[actualSectionIndex + 2];
                if (forecastRoomNightsRow) {
                    dynamicData[scostamentiSectionIndex + 2].values = forecastRoomNightsRow.values.map((f, i) => (actualRoomNightsRow.values[i] as number) - (f as number));
                }

                const forecastOccRow = dynamicData.find(r => r.label === 'Percentuale di occupazione prevista');
                const actualOccRow = dynamicData[actualSectionIndex + 3];
                if (forecastOccRow) {
                    dynamicData[scostamentiSectionIndex + 3].values = forecastOccRow.values.map((f, i) => (actualOccRow.values[i] as number) - (f as number));
                }
                
                const forecastAdrRow = dynamicData.find(r => r.label === 'ADR');
                const actualAdrRow = dynamicData[actualSectionIndex + 4];
                if (forecastAdrRow) {
                    dynamicData[scostamentiSectionIndex + 4].values = forecastAdrRow.values.map((f, i) => (actualAdrRow.values[i] as number) - (f as number));
                }

                const forecastRevParRow = dynamicData.find(r => r.label === 'REV PAR (Revenue per available room)');
                const actualRevParRow = dynamicData[actualSectionIndex + 5];
                if (forecastRevParRow) {
                    dynamicData[scostamentiSectionIndex + 5].values = forecastRevParRow.values.map((f, i) => (actualRevParRow.values[i] as number) - (f as number));
                }
            }
        }


        if (importedData) {
            const datiAlHeaderIndex = dynamicData.findIndex(r => r.label.startsWith('DATI AL'));
            if (datiAlHeaderIndex > -1) {
                dynamicData[datiAlHeaderIndex].label = importedData.title;
                dynamicData.splice(datiAlHeaderIndex + 1, 5, ...importedData.rows);
            }
        }

        return dynamicData;
    }, [forecastData, budgetData, importedData, actualData]);

    const tableSections = useMemo(() => {
        const sections: { title: string; rows: MetricRow[] }[] = [];
        let currentSection: { title: string; rows: MetricRow[] } = { title: 'Panoramica', rows: [] };

        monitoringData.forEach(row => {
            if (row.isHeader) {
                if (currentSection.rows.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = { title: row.label, rows: [] };
            } else {
                currentSection.rows.push(row);
            }
        });
        sections.push(currentSection);

        // Reorder sections
        const order = ['Panoramica', 'ACTUAL', 'SCOSTAMENTI CON ACTUAL', 'DATI AL', 'SCOSTAMENTI CON DATA PASSATA', 'SCOSTAMENTI CON DATA ANNO PASSATO'];
        
        return sections.sort((a, b) => {
            const aIndex = order.findIndex(title => a.title.startsWith(title));
            const bIndex = order.findIndex(title => b.title.startsWith(title));
            return aIndex - bIndex;
        });

    }, [monitoringData]);

    const handleSaveActualData = () => {
        const actualSection = tableSections.find(s => s.title === 'ACTUAL');
        if (!actualSection) {
            alert("Sezione 'ACTUAL' non trovata.");
            return;
        }

        const findRowValues = (label: string): number[] => {
            const row = actualSection.rows.find(r => r.label === label);
            return row ? (row.values as number[]) : Array(13).fill(0);
        };

        const dataToSave: SavedActualData['data'] = {
            businessOnTheBooks: { values: findRowValues('Business on the Books') },
            roomNightsOnTheBooks: { values: findRowValues('Room Nights On The Books') },
            occupazioneOnTheBooks: { values: findRowValues('Occupazione On The Books') },
            adrAttuale: { values: findRowValues('ADR Attuale') },
            revParAttuale: { values: findRowValues('Rev Par Attuale') },
        };

        onSaveActualData(dataToSave);
    };

    const handleImportSavedData = () => {
        if (!savedActualData) {
            alert('Nessun dato salvato da importare.');
            return;
        }

        const { timestamp, data } = savedActualData;
        const newTitle = `DATI AL ${new Date(timestamp).toLocaleDateString('it-IT')}`;
        
        const datiAlHeaderIndexTemplate = monitoringDataTemplate.findIndex(r => r.label.startsWith('DATI AL'));
        const templateRows = monitoringDataTemplate.slice(datiAlHeaderIndexTemplate + 1, datiAlHeaderIndexTemplate + 6);
        
        const newRows: MetricRow[] = [
            { ...templateRows[0], values: data.businessOnTheBooks.values },
            { ...templateRows[1], values: data.roomNightsOnTheBooks.values },
            { ...templateRows[2], values: data.occupazioneOnTheBooks.values },
            { ...templateRows[3], values: data.adrAttuale.values },
            { ...templateRows[4], values: data.revParAttuale.values },
        ];

        setImportedData({ title: newTitle, rows: newRows });
        alert('Dati importati con successo!');
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {tableSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="bg-white dark:bg-[#141414] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{section.title}</h3>
                        <div className="flex items-center gap-3">
                             {section.title === 'ACTUAL' && (
                                <>
                                    <button 
                                        onClick={onUpdateActuals}
                                        disabled={isUpdatingActuals}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-wait transition-all"
                                    >
                                        {isUpdatingActuals ? (
                                            <RefreshIcon className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshIcon className="w-4 h-4" />
                                        )}
                                        {isUpdatingActuals ? 'AGGIORNAMENTO...' : 'AGGIORNA DA PIANI MENSILI'}
                                    </button>
                                    <button 
                                        onClick={handleSaveActualData} 
                                        disabled={isUpdatingActuals}
                                        className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-wait transition-all"
                                    >
                                        SALVA
                                    </button>
                                </>
                            )}
                            {section.title.startsWith('DATI AL') && (
                                <button 
                                    onClick={handleImportSavedData} 
                                    disabled={!savedActualData || isUpdatingActuals}
                                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus:ring-offset-slate-900 transition-all"
                                >
                                    IMPORTA
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto relative rounded-lg border border-gray-200 dark:border-slate-700">
                         {isUpdatingActuals && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
                                <div className="flex items-center gap-3 text-lg font-semibold text-gray-800 dark:text-white">
                                    <RefreshIcon className="w-6 h-6 animate-spin text-primary" />
                                    <span>Aggiornamento dati...</span>
                                </div>
                            </div>
                        )}
                        <table className="w-full border-collapse text-xs table-fixed min-w-[1800px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#0d0d0d]">
                                    <th className="sticky top-0 left-0 z-20 p-3 border-b border-r border-gray-200 dark:border-slate-700 text-left w-[250px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-[#0d0d0d]"></th>
                                    {headers.map((header) => (
                                        <th key={header} className="sticky top-0 z-10 p-3 border-b border-r border-gray-200 dark:border-slate-700 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-[120px] text-center bg-gray-50 dark:bg-[#0d0d0d] last:border-r-0">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {section.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className={`${getCellClasses(row.label, true, -1, row)} sticky left-0 z-10`}>
                                            {row.label}
                                        </td>
                                        {row.values.map((value, colIndex) => (
                                            <td key={colIndex} className={getCellClasses(value, false, colIndex, row)}>
                                                {formatValue(value, row.format)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Monitoring;
