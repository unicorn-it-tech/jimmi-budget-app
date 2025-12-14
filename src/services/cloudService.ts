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

            // Controllo se la risposta è valida JSON (evita crash se ritorna HTML di errore/fallback)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                // Se non è JSON, probabilmente è una pagina HTML di errore o fallback (404)
                throw new Error(`API returned non-JSON response (${response.status}). Are you running locally without 'vercel dev'?`);
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
            
            // Check speciale per ambiente locale o errori di routing
            const contentType = response.headers.get("content-type");
            if (response.status === 404 || (contentType && contentType.indexOf("application/json") === -1)) {
                console.warn('API endpoint not accessible or returned HTML (Local/Offline mode active).');
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
            // Non lanciare errore qui per permettere il caricamento offline
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