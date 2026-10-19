// Wayang Kancil - AI Provider Configuration
// Base URL dan model gratis dari ai.xemarux.com

export const AI_CONFIG = {
    baseURL: 'https://ai.xemarux.com/v1',
    // API key akan diisi oleh pengguna (nanti)
    apiKey: 'sk-router-k4HNo4mXPQ0c3N0s5sfth35MFBFOmZ0W',
    // Model gratis (×0.0)
    freeModels: [
        'deepseek-v4.1-flash',
        'hy3',
        'step-5-preview',
    ],
    // Model default
    defaultModel: 'deepseek-v4.1-flash',
    // Timeout request (ms)
    timeout: 30000,
};

// Helper: cek apakah API key sudah diisi
export function hasApiKey() {
    return !!AI_CONFIG.apiKey && AI_CONFIG.apiKey.trim().length > 0;
}

// Helper: set API key
export function setApiKey(key) {
    AI_CONFIG.apiKey = key;
    try {
        localStorage.setItem('wayangkancil_api_key', key);
    } catch (e) {
        // silent
    }
}

// Load API key dari localStorage jika ada
export function loadApiKey() {
    try {
        const key = localStorage.getItem('wayangkancil_api_key');
        if (key) AI_CONFIG.apiKey = key;
    } catch (e) {
        // silent
    }
}

loadApiKey();

// Simple AI client
export async function aiChat(messages, model = AI_CONFIG.defaultModel) {
    if (!hasApiKey()) {
        throw new Error('API key belum diisi. Silakan masukkan API key terlebih dahulu.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

    try {
        const response = await fetch(`${AI_CONFIG.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`AI request failed: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

// Helper: tanya AI untuk dialogue NPC
export async function aiNpcDialogue(npcName, context, playerMessage) {
    const messages = [{
            role: 'system',
            content: `Kamu adalah ${npcName}, karakter dalam game Wayang Kancil. Jawab dalam bahasa Indonesia dengan gaya wayang kulit. Konteks: ${context}`,
        },
        {
            role: 'user',
            content: playerMessage,
        },
    ];
    return await aiChat(messages);
}