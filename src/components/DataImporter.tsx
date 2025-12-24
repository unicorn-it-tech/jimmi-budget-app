import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { XIcon, SparklesIcon, UploadIcon, DocumentIcon } from './icons';
import type { Apartment, BookingImportData } from '../types';

type LegendItem = { name: string; color: string };

interface DataImporterProps {
    apartments: Apartment[];
    month: string;
    year: number;
    daysInMonth: number;
    legendItems: LegendItem[];
    onClose: () => void;
    onImport: (data: BookingImportData[]) => void;
}

interface ParsedRow {
    apartmentName: string;
    bookings: { day: number; price: number; channel?: string }[];
}

const DataImporter: React.FC<DataImporterProps> = ({
    apartments,
    month,
    year,
    daysInMonth,
    legendItems,
    onClose,
    onImport,
}) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle');
    const [parsedData, setParsedData] = useState<BookingImportData[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [fileName, setFileName] = useState('');

    const parseExcelFile = useCallback((file: File) => {
        setStatus('loading');
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                // Cerca il foglio "Planner" o usa il primo foglio
                const sheetName = workbook.SheetNames.includes('Planner')
                    ? 'Planner'
                    : workbook.SheetNames[0];

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    setErrorMessage('Il file non contiene dati sufficienti.');
                    setStatus('error');
                    return;
                }

                // Prima riga: intestazioni con giorni
                const headerRow = jsonData[0] as string[];

                // Mappa giorni: trova le colonne dei giorni (formato "G DD" o solo numero)
                const dayColumnMap: { [col: number]: number } = {};
                headerRow.forEach((cell, colIndex) => {
                    if (cell) {
                        const cellStr = String(cell).trim();
                        // Cerca formato "V 01", "S 02", ecc. o numeri
                        const dayMatch = cellStr.match(/^[DLMMGVS]\s*(\d{1,2})$/i) || cellStr.match(/^(\d{1,2})$/);
                        if (dayMatch) {
                            const dayNum = parseInt(dayMatch[1], 10);
                            if (dayNum >= 1 && dayNum <= 31) {
                                dayColumnMap[colIndex] = dayNum;
                            }
                        }
                    }
                });

                // Nomi delle strutture disponibili (per matching)
                const apartmentNames = apartments.map(a => a.name.toLowerCase().trim());

                // Parse delle righe dati
                const results: ParsedRow[] = [];
                const excludeRows = ['totale', 'occ. %', 'occ.%', 'adr', 'adr day'];

                for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
                    const row = jsonData[rowIndex] as (string | number | undefined)[];
                    if (!row || row.length === 0) continue;

                    // Prima colonna: nome struttura
                    const firstCell = row[0];
                    if (!firstCell) continue;

                    const structureName = String(firstCell).trim();

                    // Salta righe di riepilogo
                    if (excludeRows.some(ex => structureName.toLowerCase().includes(ex))) continue;

                    // Verifica se il nome corrisponde a una struttura esistente
                    const matchedApartment = apartments.find(apt =>
                        apt.name.toLowerCase().trim() === structureName.toLowerCase().trim() ||
                        apt.name.toLowerCase().includes(structureName.toLowerCase()) ||
                        structureName.toLowerCase().includes(apt.name.toLowerCase())
                    );

                    if (!matchedApartment) continue;

                    const bookings: { day: number; price: number; channel?: string }[] = [];

                    // Parse dei valori per ogni giorno
                    Object.entries(dayColumnMap).forEach(([colIndexStr, dayNum]) => {
                        const colIndex = parseInt(colIndexStr, 10);
                        const cellValue = row[colIndex];

                        if (cellValue === undefined || cellValue === null || cellValue === '') return;

                        const cellStr = String(cellValue).trim().toLowerCase();

                        // Controlla se bloccata
                        if (cellStr.includes('blocc') || cellStr.includes('block') || cellStr.includes('chiuso') || cellStr.includes('closed')) {
                            bookings.push({ day: dayNum, price: -1 });
                            return;
                        }

                        // Prova a estrarre un numero (prezzo)
                        const numValue = typeof cellValue === 'number'
                            ? cellValue
                            : parseFloat(String(cellValue).replace(',', '.').replace(/[^0-9.-]/g, ''));

                        if (!isNaN(numValue) && numValue > 0) {
                            bookings.push({ day: dayNum, price: numValue });
                        }
                    });

                    if (bookings.length > 0) {
                        results.push({
                            apartmentName: matchedApartment.name,
                            bookings
                        });
                    }
                }

                if (results.length === 0) {
                    setErrorMessage('Nessuna struttura corrispondente trovata nel file. Verifica che i nomi delle strutture nel file corrispondano a quelle configurate.');
                    setStatus('error');
                    return;
                }

                setParsedData(results);
                setStatus('preview');
            } catch (error) {
                console.error('Errore durante la lettura del file Excel:', error);
                setErrorMessage('Errore durante la lettura del file Excel. Assicurati che il formato sia corretto.');
                setStatus('error');
            }
        };

        reader.onerror = () => {
            setErrorMessage('Errore durante la lettura del file.');
            setStatus('error');
        };

        reader.readAsArrayBuffer(file);
    }, [apartments]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            parseExcelFile(acceptedFiles[0]);
        }
    }, [parseExcelFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        multiple: false,
    });

    const handleConfirmImport = () => {
        onImport(parsedData);
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center h-64">
                        <SparklesIcon className="w-12 h-12 text-primary animate-pulse" />
                        <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Analisi in corso...</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Lettura del file {fileName}</p>
                    </div>
                );
            case 'error':
                return (
                    <div className="p-4 text-center">
                        <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{errorMessage}</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Riprova
                        </button>
                    </div>
                );
            case 'preview':
                const totalBookings = parsedData.reduce((sum, apt) => sum + apt.bookings.length, 0);
                const blockedCount = parsedData.reduce((sum, apt) => sum + apt.bookings.filter(b => b.price === -1).length, 0);
                const bookedCount = totalBookings - blockedCount;

                return (
                    <div>
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Riepilogo Import</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{parsedData.length}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Strutture</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{bookedCount}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Prenotazioni</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-orange-600 dark:text-orange-400">{blockedCount}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Bloccate</span>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Anteprima Dati</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Verifica che i dati siano corretti prima di importarli.</p>
                        <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-dark-card sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-semibold">Struttura</th>
                                        <th className="p-2 text-center font-semibold">Giorno</th>
                                        <th className="p-2 text-right font-semibold">Prezzo</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-dark-secondary">
                                    {parsedData.flatMap(apt => apt.bookings.map((book, idx) => ({...book, apartmentName: apt.apartmentName, key: `${apt.apartmentName}-${book.day}-${idx}`}))).slice(0, 100).map((item) => (
                                        <tr key={item.key} className="border-t border-gray-200 dark:border-gray-700">
                                            <td className="p-2 font-medium">{item.apartmentName}</td>
                                            <td className="p-2 text-center">{item.day}</td>
                                            <td className={`p-2 text-right font-mono ${item.price === -1 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                                {item.price === -1 ? 'BLOCC.' : `€${item.price.toFixed(2)}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.flatMap(apt => apt.bookings).length > 100 && (
                                <p className="p-2 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-card">
                                    ... e altri {parsedData.flatMap(apt => apt.bookings).length - 100} record
                                </p>
                            )}
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div>
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                isDragActive
                                    ? 'border-primary bg-primary/10'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-dark-secondary'
                            }`}
                        >
                            <input {...getInputProps()} />
                            <DocumentIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                            {isDragActive ? (
                                <p className="text-lg font-semibold text-primary">Rilascia il file qui...</p>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Trascina qui il file Excel
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        oppure clicca per selezionarlo
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Formati supportati: .xlsx, .xls
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Formato file atteso</h4>
                            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                                <li>Foglio "Planner" con strutture sulle righe</li>
                                <li>Giorni del mese sulle colonne (es. V 01, S 02, ...)</li>
                                <li>Prezzi numerici nelle celle</li>
                                <li>"Bloccata" per le date non disponibili</li>
                            </ul>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 transform transition-all flex flex-col border dark:border-dark-border">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <UploadIcon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Importa Dati da Excel</h3>
                    </div>
                    <button
                        aria-label="Chiudi"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {renderContent()}
                </div>

                <div className="mt-6 flex justify-end gap-4 border-t border-gray-200 dark:border-dark-border pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-dark-secondary dark:text-gray-200 dark:hover:bg-dark-card"
                    >
                        Annulla
                    </button>
                    {status === 'preview' && (
                        <button
                            type="button"
                            onClick={handleConfirmImport}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Importa Dati
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataImporter;
