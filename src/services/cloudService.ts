
export interface CloudData {
    [key: string]: any;
}

const API_ENDPOINT = '/api/store';

export const cloudService = {
    async saveData(data: CloudData): Promise<void> {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Error saving data: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Cloud save failed:', error);
            throw error;
        }
    },

    async loadData(): Promise<CloudData | null> {
        try {
            const response = await fetch(API_ENDPOINT);
            
            // Se siamo in locale senza 'vercel dev' o l'API non esiste, gestiamo l'errore gracefully
            if (response.status === 404) {
                console.warn('API endpoint not found. Running in offline mode?');
                return null;
            }

            if (!response.ok) {
                throw new Error(`Error loading data: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Cloud load failed:', error);
            return null;
        }
    }
};
