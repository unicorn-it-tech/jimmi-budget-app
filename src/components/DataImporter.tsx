import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { XIcon, SparklesIcon, UploadIcon } from './icons';
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

const DataImporter: React.FC<DataImporterProps> = ({
    apartments,
    month,
    year,
    daysInMonth,
    legendItems,
    onClose,
    onImport,
}) => {
    const [pastedData, setPastedData] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle');
    const [parsedData, setParsedData] = useState<BookingImportData[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    const handleAnalyze = async () => {
        if (!pastedData.trim()) {
            setErrorMessage("Per favore, incolla i dati dal tuo foglio di calcolo.");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const apartmentNames = apartments.map(a => a.name).join(', ');
            const channelInfo = legendItems.map(i => `${i.name} (es. ${i.name.slice(0,3)}, ${i.name.charAt(0)}.)`).join(', ');

            const prompt = `
Sei un assistente intelligente per l'analisi di dati per un'applicazione di gestione alberghiera.
Il tuo compito è estrarre le informazioni di prenotazione (prezzi, stato di blocco, canale) per ogni appartamento per ogni giorno del mese dai dati forniti.

Ecco i dati incollati da un foglio di calcolo:
---
${pastedData}
---

Informazioni aggiuntive:
- Mese: ${month} ${year} (i giorni del mese vanno da 1 a ${daysInMonth})
- Nomi delle strutture da cercare: ${apartmentNames}
- Canali di prenotazione possibili: ${channelInfo}

Analizza i dati e restituisci un array JSON.
- Se una cella indica che la stanza è bloccata (es. 'Bloccata', 'chiuso'), imposta il prezzo a -1 e ometti il canale.
- Se una cella contiene solo un prezzo, estrai il numero.
- Se una cella contiene prezzo e canale (es. '€120 B.com', '95-AIR'), estrai entrambi.
- Se non trovi un prezzo o uno stato di blocco per un appartamento in un dato giorno, ometti semplicemente quella voce. Non creare voci con prezzo 0 a meno che non sia esplicitamente scritto '0'.
- Associa correttamente ogni riga di dati al nome della struttura corrispondente.
`;

            const responseSchema = {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    apartmentName: {
                      type: Type.STRING,
                      description: "Il nome della struttura."
                    },
                    bookings: {
                      type: Type.ARRAY,
                      description: "Un elenco di prenotazioni per questa struttura.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          day: {
                            type: Type.INTEGER,
                            description: "Il giorno del mese."
                          },
                          price: {
                            type: Type.NUMBER,
                            description: "Il prezzo della prenotazione. Usare -1 per le date bloccate."
                          },
                          channel: {
                            type: Type.STRING,
                            description: "Il canale di prenotazione (es. BOOKING, AIRBNB), se identificabile."
                          }
                        },
                        required: ["day", "price"]
                      }
                    }
                  },
                  required: ["apartmentName", "bookings"]
                }
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema,
                }
            });

            const jsonText = response.text.trim();
            const data = JSON.parse(jsonText) as BookingImportData[];
            
            setParsedData(data);
            setStatus('preview');
        } catch (error) {
            console.error("Errore durante l'analisi dei dati:", error);
            setErrorMessage("Si è verificato un errore durante l'analisi dei dati. Assicurati che i dati incollati siano corretti e riprova.");
            setStatus('error');
        }
    };
    
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">L'intelligenza artificiale sta leggendo i tuoi dati.</p>
                    </div>
                );
            case 'error':
                return (
                     <div className="p-4 text-center">
                        <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{errorMessage}</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Riprova
                        </button>
                    </div>
                );
            case 'preview':
                return (
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Anteprima Dati Analizzati</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Verifica che i dati siano corretti prima di importarli. Verranno importate solo le righe con un nome di struttura corrispondente.</p>
                        <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-semibold">Struttura</th>
                                        <th className="p-2 text-center font-semibold">Giorno</th>
                                        <th className="p-2 text-right font-semibold">Prezzo</th>
                                        <th className="p-2 text-left font-semibold">Canale</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800">
                                    {parsedData.flatMap(apt => apt.bookings.map(book => ({...book, apartmentName: apt.apartmentName}))).map((item, index) => (
                                        <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                            <td className="p-2 font-medium">{item.apartmentName}</td>
                                            <td className="p-2 text-center">{item.day}</td>
                                            <td className="p-2 text-right font-mono">{item.price === -1 ? 'BLOCC.' : `€${item.price.toFixed(2)}`}</td>
                                            <td className="p-2">{item.channel || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div>
                        <label htmlFor="data-paste-area" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Copia e incolla i dati dal tuo file XLS qui:
                        </label>
                        <textarea
                            id="data-paste-area"
                            rows={12}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                            placeholder="Es. copia una tabella con le strutture sulle righe e i giorni sulle colonne..."
                            value={pastedData}
                            onChange={(e) => setPastedData(e.target.value)}
                        />
                    </div>
                );
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 transform transition-all flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                           <UploadIcon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Importa Dati Prenotazioni</h3>
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

                <div className="mt-6 flex justify-end gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Annulla
                    </button>
                    {status === 'idle' && (
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Analizza con AI
                        </button>
                    )}
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
