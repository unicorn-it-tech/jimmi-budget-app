import React, { useEffect, useState, useRef } from 'react';
import { cloudService } from '../services/cloudService';
import { RefreshIcon, CloudUploadIcon } from './icons';

// Icone inline se non esistono in icons.tsx, o riutilizzo
const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
);

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline';

export const CloudSync: React.FC = () => {
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const timeoutRef = useRef<any>(null);

    // Caricamento iniziale dal cloud
    useEffect(() => {
        const initLoad = async () => {
            setStatus('syncing');
            const data = await cloudService.loadData();
            
            if (data) {
                // Aggiorna localStorage con i dati dal cloud
                let updateCount = 0;
                Object.keys(data).forEach(key => {
                    if (key.startsWith('budget-app-')) {
                        const localValue = localStorage.getItem(key);
                        const cloudValue = JSON.stringify(data[key]);
                        
                        if (localValue !== cloudValue) {
                            localStorage.setItem(key, cloudValue);
                            // Notifica l'app che il dato è cambiato
                            window.dispatchEvent(new CustomEvent('budget-app-sync-event', { detail: { key } }));
                            updateCount++;
                        }
                    }
                });
                console.log(`Cloud sync: Updated ${updateCount} keys from server.`);
                setLastSynced(new Date());
                setStatus('saved');
            } else {
                // Se null, potrebbe essere offline o primo avvio
                setStatus('idle'); 
            }
        };

        initLoad();
    }, []);

    // Ascolta le modifiche locali e salva
    useEffect(() => {
        const handleLocalChange = () => {
            setStatus('syncing');
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Debounce: aspetta 2 secondi di inattività prima di salvare
            timeoutRef.current = setTimeout(async () => {
                const dataToSave: Record<string, any> = {};
                
                // Raccogli tutti i dati dell'app
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('budget-app-')) {
                        try {
                            dataToSave[key] = JSON.parse(localStorage.getItem(key) || 'null');
                        } catch (e) {
                            dataToSave[key] = localStorage.getItem(key);
                        }
                    }
                }

                try {
                    await cloudService.saveData(dataToSave);
                    setLastSynced(new Date());
                    setStatus('saved');
                } catch (error) {
                    console.error("Save failed", error);
                    setStatus('error');
                }
            }, 2000);
        };

        window.addEventListener('budget-app-local-change', handleLocalChange);
        return () => {
            window.removeEventListener('budget-app-local-change', handleLocalChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="mt-4 mx-2 p-3 bg-blue-900/50 dark:bg-black/20 rounded-lg border border-blue-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {status === 'syncing' && <RefreshIcon className="w-4 h-4 text-blue-300 animate-spin" />}
                    {status === 'saved' && <CheckIcon className="w-4 h-4 text-green-400" />}
                    {status === 'error' && <WarningIcon className="w-4 h-4 text-red-400" />}
                    {status === 'idle' && <CloudUploadIcon className="w-4 h-4 text-gray-400" />}
                    
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                        status === 'error' ? 'text-red-300' : 
                        status === 'saved' ? 'text-green-300' : 
                        'text-blue-200'
                    }`}>
                        {status === 'syncing' ? 'Sincronizzazione...' : 
                         status === 'saved' ? 'Cloud Salvato' : 
                         status === 'error' ? 'Errore Sync' : 
                         'Cloud Ready'}
                    </span>
                </div>
            </div>
            {lastSynced && (
                <div className="text-[10px] text-blue-300/70 mt-1 text-right">
                    Ultimo: {lastSynced.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};