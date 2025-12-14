
export interface CloudData {
    [key: string]: any;
}

const API_ENDPOINT = '/api/store';

export const cloudService = {
    async saveData(data: CloudData): Promise<void> {
        console.log(`[CloudService] Attempting to SAVE to ${window.location.origin}${API_ENDPOINT}`);
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
                const text = await response.text();
                console.error("[CloudService] Non-JSON Response Body:", text.substring(0, 500));
                throw new Error(`API returned non-JSON response (${response.status}). The server might be returning the HTML homepage instead of the API.`);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('[CloudService] Save failed:', error);
            throw error;
        }
    },

    async loadData(): Promise<CloudData | null> {
        console.log(`[CloudService] Attempting to LOAD from ${window.location.origin}${API_ENDPOINT}`);
        try {
            const response = await fetch(API_ENDPOINT);
            
            const contentType = response.headers.get("content-type");
            
            if (response.status === 404 || (contentType && contentType.indexOf("application/json") === -1)) {
                console.warn('[CloudService] API endpoint not accessible (404) or returned HTML.');
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `Error loading data: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[CloudService] Load failed:', error);
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
            console.error('[CloudService] Clear failed:', error);
            throw error;
        }
    }
};