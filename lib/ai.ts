// import { LlamaContext, LlamaGrammar, LlamaContextOptions } from 'llama.rn';
import NetInfo from "@react-native-community/netinfo";
import { agentApi } from "./api";
// import * as FileSystem from 'expo-file-system/legacy';

// Configuration for Local Model
// const MODEL_NAME = 'medgemma-1.5-4b.gguf';
// const MODEL_PATH = `${FileSystem.documentDirectory}${MODEL_NAME}`;

// let llamaContext: LlamaContext | null = null;

/*
const initLocalModel = async () => {
    if (llamaContext) return llamaContext;

    const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!fileInfo.exists) {
        throw new Error(`Local model not found at ${MODEL_PATH}. Please download it first.`);
    }

    try {
        llamaContext = await LlamaContext.create({
            model: MODEL_PATH,
            is_model_asset: false,
            n_ctx: 2048,
            n_threads: 4, // Adjust based on device
        });
        console.log("Local Llama Context Initialized");
        return llamaContext;
    } catch (err) {
        console.error("Failed to init local model:", err);
        throw err;
    }
};
*/

export const askAI = async (question: string) => {
    const state = await NetInfo.fetch();

    // 1. Online Mode: Use Powerful Server Agent
    if (state.isConnected) {
        console.log("Network available. Using Cloud Agent.");
        try {
            const response = await agentApi.ask({ question });
            // Adjust based on actual API response structure (e.g., response.data.answer if backend wraps it)
            // Assuming response.data is the direct answer or an object
            const data = response.data;
            if (typeof data === 'object' && data.answer) {
                return data.answer;
            }
            return data;
        } catch (err) {
            console.warn("Cloud Agent failed:", err);
            return "Unable to connect to the server. Please check your internet connection.";
        }
    }

    // 2. Offline Mode
    console.log("Network unavailable. Offline mode is disabled.");
    return "Offline support is currently disabled. Please connect to the internet to use the AI assistant.";

    /*
    // 2. Offline Mode: Use On-Device MedGemma
    console.log("Network unavailable or API failed. Using Local MedGemma.");
    try {
        const context = await initLocalModel();

        const prompt = `<start_of_turn>user\n${question}<end_of_turn>\n<start_of_turn>model\n`;

        const result = await context.completion({
            prompt,
            n_predict: 512,
            stop: ["<end_of_turn>", "user:"],
            temperature: 0.7,
        });

        return result.text.trim();

    } catch (err) {
        console.error("Local AI failed:", err);
        return "I'm currently offline and the local medical model is not ready. Please connect to the internet or ensure the model is downloaded.";
    }
    */
};

// Helper to check if model exists for UI feedback
export const isLocalModelAvailable = async () => {
    // const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    // return fileInfo.exists;
    return false;
};
