import NetInfo from "@react-native-community/netinfo";
import { db } from "./db";
import api from "./api"; // Base Axios instance

interface OfflineAction {
    id: number;
    endpoint: string;
    method: string;
    body: string;
    created_at: string;
}

export const saveOfflineAction = async (endpoint: string, method: string, body: any) => {
    const statement = await db.prepareAsync(
        'INSERT INTO offline_actions (endpoint, method, body, created_at) VALUES ($endpoint, $method, $body, $created_at)'
    );
    try {
        await statement.executeAsync({
            $endpoint: endpoint,
            $method: method,
            $body: JSON.stringify(body),
            $created_at: new Date().toISOString()
        });
        console.log("Action saved offline");
    } finally {
        await statement.finalizeAsync();
    }
};

export const syncOfflineActions = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    try {
        const result = await db.getAllAsync('SELECT * FROM offline_actions ORDER BY created_at ASC');
        const actions = result as OfflineAction[];

        if (actions.length === 0) return;

        console.log(`Syncing ${actions.length} offline actions...`);

        for (const action of actions) {
            try {
                const body = action.body ? JSON.parse(action.body) : null;
                // Execute API call
                if (action.method === 'POST') {
                    await api.post(action.endpoint, body);
                } else if (action.method === 'PUT') {
                    await api.put(action.endpoint, body);
                } else if (action.method === 'PATCH') {
                    await api.patch(action.endpoint, body);
                } else if (action.method === 'DELETE') {
                    await api.delete(action.endpoint);
                }

                // If successful, remove from DB
                await db.runAsync('DELETE FROM offline_actions WHERE id = ?', action.id);
            } catch (err) {
                console.error(`Failed to sync action ${action.id}:`, err);
                // Decide strategy: Retry later? Delete? Move to dead-letter queue?
                // For now, keep it to retry next sync.
            }
        }
    } catch (error) {
        console.error("Sync failed:", error);
    }
};
