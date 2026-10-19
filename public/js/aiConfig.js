// Wayang Kancil - AI Provider Configuration
// Base URL dan model gratis dari ai.xemarux.com

export const AI_CONFIG = {
    // Base URL (untuk referensi, request via server proxy)
    baseURL: 'https://ai.xemarux.com/v1',
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

// Cek apakah AI tersedia di server (API key diset di env var AI_API_KEY)
export async function checkAiAvailable() {
    try {
        const res = await fetch('/api/ai/status');
        const data = await res.json();
        return data.available === true;
    } catch (e) {
        return false;
    }
}

// Helper: set API key (disimpan di localStorage, tapi server tetap pakai env var)
export function setApiKey(key) {
    try {
        localStorage.setItem('wayangkancil_api_key', key);
    } catch (e) {
        // silent
    }
}

// Load API key dari localStorage jika ada
export function loadApiKey() {
    try {
        return localStorage.getItem('wayangkancil_api_key') || '';
    } catch (e) {
        return '';
    }
}

// Simple AI client — via server proxy (API key tidak terekspos ke client)
export async function aiChat(messages, model = AI_CONFIG.defaultModel) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                model: model,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`AI request failed: ${response.status} - ${error.error || response.statusText}`);
        }

        const data = await response.json();
        return data.content || '';
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