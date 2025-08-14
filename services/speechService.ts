// Wrapper for browser's SpeechSynthesis API, ElevenLabs API, and OpenAI API
let voices: SpeechSynthesisVoice[] = [];
let isSpeechReady = false;
let elevenLabsAudio: HTMLAudioElement | null = null;
let openAIAudio: HTMLAudioElement | null = null;
let microsoftAudio: HTMLAudioElement | null = null;
let currentSpeechResolve: ((value?: void | PromiseLike<void>) => void) | null = null;

// --- CRITICAL STATE FOR PREVENTING RACE CONDITIONS ---
// This ID uniquely identifies the current sentence being spoken. It is the core of a fix
// for a race condition where a rapid sequence of `speak()` and `cancel()` calls
// could cause a stale `onend` event from a cancelled utterance to incorrectly
// resolve the promise for the *next* utterance in the queue.
// By checking `currentUtteranceId` in all `onended` callbacks, we ensure that only
// the completion of the currently active speech act resolves its corresponding promise.
let currentUtteranceId: string | null = null;
const subscribers: (() => void)[] = [];

/**
 * A centralized fetch wrapper.
 * In a production environment with a backend, this function would be the single point of modification
 * to route all API calls through a secure server-side proxy. The proxy would then attach the API keys
 * securely, preventing them from ever being exposed on the client-side.
 * @param url The URL to fetch.
 * @param options The RequestInit options.
 * @returns A Promise that resolves to the Response.
 */
async function makeApiCall(url: string, options: RequestInit): Promise<Response> {
    // In this client-only version, it's a direct fetch.
    return fetch(url, options);
}

const notifySubscribers = () => {
  subscribers.forEach(cb => cb());
};

export const subscribeToVoiceChanges = (callback: () => void): (() => void) => {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
};

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

export interface OpenAIVoice {
  voice_id: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  name: string;
}

export interface MicrosoftVoice {
  Name: string;
  DisplayName: string;
  ShortName: string;
  Gender: 'Male' | 'Female';
  Locale: string;
}

const OPENAI_VOICES: OpenAIVoice[] = [
    { voice_id: 'alloy',   name: 'Alloy' },
    { voice_id: 'echo',    name: 'Echo' },
    { voice_id: 'fable',   name: 'Fable' },
    { voice_id: 'onyx',    name: 'Onyx' },
    { voice_id: 'nova',    name: 'Nova' },
    { voice_id: 'shimmer', name: 'Shimmer' },
];

// A curated list of common Azure neural voices.
const MICROSOFT_VOICES: MicrosoftVoice[] = [
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)', DisplayName: 'Jenny', ShortName: 'en-US-JennyNeural', Gender: 'Female', Locale: 'en-US' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)', DisplayName: 'Guy', ShortName: 'en-US-GuyNeural', Gender: 'Male', Locale: 'en-US' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-US, AnaNeural)', DisplayName: 'Ana', ShortName: 'en-US-AnaNeural', Gender: 'Female', Locale: 'en-US' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-GB, SoniaNeural)', DisplayName: 'Sonia', ShortName: 'en-GB-SoniaNeural', Gender: 'Female', Locale: 'en-GB' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-GB, RyanNeural)', DisplayName: 'Ryan', ShortName: 'en-GB-RyanNeural', Gender: 'Male', Locale: 'en-GB' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-AU, NatashaNeural)', DisplayName: 'Natasha', ShortName: 'en-AU-NatashaNeural', Gender: 'Female', Locale: 'en-AU' },
    { Name: 'Microsoft Server Speech Text to Speech Voice (en-CA, ClaraNeural)', DisplayName: 'Clara', ShortName: 'en-CA-ClaraNeural', Gender: 'Female', Locale: 'en-CA' },
];

/**
 * A robust parser for OpenAI API error responses.
 * @param response The fetch Response object.
 * @returns A formatted error string.
 */
const parseOpenAIError = async (response: Response): Promise<string> => {
    let message = `Request failed with HTTP ${response.status} (${response.statusText}).`;
    try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
            message = errorData.error.message;
        } else {
            message += ` Body: ${JSON.stringify(errorData)}`;
        }
    } catch (e) {
        try {
            const textError = await response.text();
            if (textError) message += ` Body: ${textError}`;
        } catch (textErr) {
            // Failsafe if text() also fails
        }
    }
    return message;
};


const loadVoices = () => {
  voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    isSpeechReady = true;
    console.log(`${voices.length} browser voices loaded.`);
    notifySubscribers();
  }
};

export const init = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech Synthesis not supported in this browser.');
    return;
  }
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
};

export const getVoices = (): SpeechSynthesisVoice[] => voices;
export const getOpenAIVoices = (): OpenAIVoice[] => OPENAI_VOICES;
export const getMicrosoftVoices = (): MicrosoftVoice[] => MICROSOFT_VOICES;

export const testOpenAITTSKey = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
  if (!apiKey) return { success: false, error: 'API key is missing.' };
  try {
    const response = await makeApiCall('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: 'This is a test of the text-to-speech API.', voice: 'alloy' }),
    });

    if (!response.ok) {
        const errorMsg = await parseOpenAIError(response);
        throw new Error(errorMsg);
    }

    const blob = await response.blob();
    // Instead of checking MIME type, which can be inconsistent,
    // we check if the blob has any data. An empty response is a clear failure.
    if (blob.size === 0) {
      throw new Error('Received an empty audio file from OpenAI TTS. Check key permissions or API status.');
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during OpenAI TTS test';
    return { success: false, error: message };
  }
};

export const testElevenLabsKey = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
  if (!apiKey) return { success: false, error: 'API key is missing.' };
  try {
    const response = await makeApiCall('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) {
        let errorMessage = `Request failed with HTTP ${response.status}.`;
        try {
            const errorData = await response.json();
            // ElevenLabs often provides detailed error messages in `detail.message` or `detail`
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (errorData.detail.message) {
                    errorMessage = errorData.detail.message;
                } else {
                    errorMessage += ` Response: ${JSON.stringify(errorData.detail)}`;
                }
            } else {
                 errorMessage += ` No details in response.`;
            }
        } catch (e) {
             // The response was not JSON, which can happen for some proxy errors, etc.
             errorMessage += ' The error response was not in the expected JSON format.';
        }
        throw new Error(errorMessage);
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: message };
  }
};

export const testMicrosoftCredentials = async (key: string, region: string): Promise<{ success: boolean; error?: string }> => {
  if (!key) return { success: false, error: "API key is missing." };
  if (!region) return { success: false, error: "Service region is missing." };
  try {
    const response = await makeApiCall(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get auth token: ${response.status} ${errorText}`);
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during Microsoft credentials test";
    return { success: false, error: message };
  }
};

export const fetchElevenLabsVoices = async (apiKey: string): Promise<ElevenLabsVoice[]> => {
  if (!apiKey) return [];
  try {
    const response = await makeApiCall('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) throw new Error('Failed to fetch ElevenLabs voices');
    const data = await response.json();
    return data.voices.map((v: any) => ({ voice_id: v.voice_id, name: v.name }));
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return [];
  }
};

const _playOpenAI = async (text: string, voiceId: string, volume: number, apiKey: string, utteranceId: string) => {
    let audioUrl: string | null = null;
    const handlePlaybackEnd = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (currentUtteranceId === utteranceId) {
            if (currentSpeechResolve) { currentSpeechResolve(); }
            currentSpeechResolve = null;
            currentUtteranceId = null;
        }
        openAIAudio = null;
    };
    
    if (!apiKey) {
        console.error("OpenAI API key is missing for TTS playback.");
        handlePlaybackEnd();
        return;
    }

    try {
        const response = await makeApiCall('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tts-1', input: text, voice: voiceId }),
        });
        if (!response.ok) {
            const errorMsg = await parseOpenAIError(response);
            throw new Error(`Failed to generate speech from OpenAI. Provider message: ${errorMsg}`);
        }
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        openAIAudio = new Audio(audioUrl);
        openAIAudio.volume = volume;
        openAIAudio.onended = handlePlaybackEnd;
        openAIAudio.onerror = handlePlaybackEnd;
        openAIAudio.play().catch(handlePlaybackEnd);
    } catch (error) {
        console.error("OpenAI TTS playback error:", error);
        handlePlaybackEnd();
    }
};

const _playElevenLabs = async (text: string, voiceId: string, volume: number, apiKey: string, utteranceId: string) => {
    let audioUrl: string | null = null;
    const handlePlaybackEnd = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (currentUtteranceId === utteranceId) {
            if (currentSpeechResolve) { currentSpeechResolve(); }
            currentSpeechResolve = null;
            currentUtteranceId = null;
        }
        elevenLabsAudio = null;
    };

    if (!apiKey) {
        console.error("ElevenLabs API key is missing for playback.");
        handlePlaybackEnd();
        return;
    };

    try {
        const response = await makeApiCall(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
            body: JSON.stringify({
                text: text, model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            }),
        });
        if (!response.ok) throw new Error(`Failed to generate speech from ElevenLabs: ${await response.text()}`);
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        elevenLabsAudio = new Audio(audioUrl);
        elevenLabsAudio.volume = volume;
        elevenLabsAudio.onended = handlePlaybackEnd;
        elevenLabsAudio.onerror = handlePlaybackEnd;
        elevenLabsAudio.play().catch(handlePlaybackEnd);
    } catch (error) {
        console.error("ElevenLabs playback error:", error);
        handlePlaybackEnd();
    }
};

const _playMicrosoft = async (text: string, voiceName: string, volume: number, key: string, region: string, utteranceId: string) => {
    let audioUrl: string | null = null;
    const handlePlaybackEnd = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (currentUtteranceId === utteranceId) {
            if (currentSpeechResolve) { currentSpeechResolve(); }
            currentSpeechResolve = null;
            currentUtteranceId = null;
        }
        microsoftAudio = null;
    };

    try {
        const response = await makeApiCall(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='${voiceName}'>${text}</voice></speak>`
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate speech from Azure: ${response.status} ${errorText}`);
        }
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        microsoftAudio = new Audio(audioUrl);
        microsoftAudio.volume = volume;
        microsoftAudio.onended = handlePlaybackEnd;
        microsoftAudio.onerror = handlePlaybackEnd;
        microsoftAudio.play().catch(handlePlaybackEnd);
    } catch (error) {
        console.error("Microsoft Azure TTS playback error:", error);
        handlePlaybackEnd();
    }
};

export const speak = (text: string, voiceIdentifier: string | null, volume: number, openAIKey: string, elevenLabsKey: string, microsoftKey: string, microsoftRegion: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!text) { resolve(); return; }
    
    // Clean up any previous speech state
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (currentSpeechResolve) {
        currentSpeechResolve(); // Resolve any dangling promise
    }

    // This unique ID is the core of the fix. It ensures that when an utterance
    // ends or is cancelled, it only affects THIS specific promise.
    const utteranceId = `utt-${Date.now()}-${Math.random()}`;
    currentUtteranceId = utteranceId;
    currentSpeechResolve = resolve;

    if (voiceIdentifier?.startsWith('openai:')) {
      _playOpenAI(text, voiceIdentifier.replace('openai:', ''), volume, openAIKey, utteranceId);
      return;
    }
    if (voiceIdentifier?.startsWith('elevenlabs:')) {
      _playElevenLabs(text, voiceIdentifier.replace('elevenlabs:', ''), volume, elevenLabsKey, utteranceId);
      return;
    }
    if (voiceIdentifier?.startsWith('microsoft:')) {
      _playMicrosoft(text, voiceIdentifier.replace('microsoft:', ''), volume, microsoftKey, microsoftRegion, utteranceId);
      return;
    }
    if (!isSpeechReady) {
      console.warn("Browser speech synthesis not ready, cannot speak.");
      if (currentSpeechResolve) { currentSpeechResolve(); currentSpeechResolve = null; currentUtteranceId = null; }
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0, Math.min(1, volume));
    utterance.lang = 'en-US';
    if (voiceIdentifier) {
      const selectedVoice = voices.find(v => v.voiceURI === voiceIdentifier);
      if (selectedVoice) { utterance.voice = selectedVoice; utterance.lang = selectedVoice.lang; }
    }
    utterance.onend = () => {
      // CRITICAL CHECK: Only resolve the promise if the utterance that just
      // ended is the one we are currently tracking. This prevents a stale `onend` event
      // from a previously cancelled utterance from incorrectly resolving the promise for a new one.
      if (currentUtteranceId === utteranceId) {
        if (currentSpeechResolve) { currentSpeechResolve(); }
        currentSpeechResolve = null;
        currentUtteranceId = null;
      }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  });
};

export const cancel = () => {
  if (elevenLabsAudio) { elevenLabsAudio.pause(); elevenLabsAudio = null; }
  if (openAIAudio) { openAIAudio.pause(); openAIAudio = null; }
  if (microsoftAudio) { microsoftAudio.pause(); microsoftAudio = null; }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  // The 'onend' event of the SpeechSynthesisUtterance will fire automatically
  // when `cancel()` is called. The logic inside `onend` (checking currentUtteranceId)
  // handles resolving the promise correctly. We also clear the state here as a failsafe.
  if (currentSpeechResolve) { currentSpeechResolve(); }
  currentSpeechResolve = null;
  currentUtteranceId = null;
};

export const transcribeWithOpenAI = async (audioBlob: Blob, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("OpenAI API key is not configured.");
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  try {
    const response = await makeApiCall('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
    
    if (!response.ok) {
      const errorMsg = await parseOpenAIError(response);
      throw new Error(`Failed to transcribe audio. Provider message: ${errorMsg}`);
    }
    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during transcription.');
  }
};

export const transcribeWithMicrosoft = async (audioBlob: Blob, key: string, region: string): Promise<string> => {
    if (!key || !region) throw new Error("Microsoft Azure credentials are not configured.");
    
    try {
        const authTokenResponse = await makeApiCall(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': key }
        });
        const authToken = await authTokenResponse.text();

        if (!authToken) throw new Error("Failed to retrieve Microsoft authentication token.");

        const response = await makeApiCall(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'audio/webm; codecs=opus',
            },
            body: audioBlob,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Microsoft STT request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.DisplayText || '';

    } catch (error) {
        console.error("Microsoft transcription error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during Microsoft transcription.');
    }
};