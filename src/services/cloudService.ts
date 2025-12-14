
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

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                // Leggiamo il testo della risposta per capire cosa sta tornando (spesso è l'HTML della home o una pagina di errore Vercel)
                const text = await response.text();
                console.error("Non-JSON Response Body:", text.substring(0, 500)); // Logga i primi 500 caratteri
                throw new Error(`API returned non-JSON response (${response.status}). Check console for details.`);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Cloud save failed:', error);
            throw error;
        }
    },

    async loadData(): Promise<CloudData | null> {
        try {
            const response = await fetch(API_ENDPOINT);
            
            const contentType = response.headers.get("content-type");
            
            // Gestione specifica per 404 o risposte non JSON
            if (response.status === 404 || (contentType && contentType.indexOf("application/json") === -1)) {
                console.warn('API endpoint not accessible (404) or returned HTML. This usually means the API function is not deployed correctly or you are running locally without "vercel dev".');
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `Error loading data: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Cloud load failed:', error);
            return null;
        }
    },

    async clearData(): Promise<void> {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Error clearing data: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Cloud clear failed:', error);
            throw error;
        }
    }
};