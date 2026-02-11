// This service manages playing sound effects and music for the application.
// It uses a blob-caching strategy to bypass cross-origin issues in sandboxed environments.

// Paths to audio files in the 'public' folder
const MESSAGE_SOUND_PATH = '/soundfiles/chat.mp3';
const WALKING_SOUND_PATH = '/soundfiles/walking.mp3';
const MENU_MUSIC_PATH = '/soundfiles/music/Menu.mp3';
const OUTSIDE_AMBIENCE_PATH = '/soundfiles/outside.mp3';
const VICTORY_SOUND_PATH = '/soundfiles/star_won.mp3';
const SKYNET_TYPING_SOUND_PATH = '/soundfiles/typing.mp3';

// Available background music tracks
export const MUSIC_TRACKS = {
  'None': '',
  'Pixel Quest': '/soundfiles/music/Pixel_Quest.mp3', // For AI Cafe, Outside
  'Creative Mind': '/soundfiles/music/Menu.mp3',      // For Studio & Office
  'Deep Thought': '/soundfiles/music/Menu.mp3',       // Placeholder for Philo Cafe
};

const audioCache = new Map<string, string>();

let sfxMasterVolume = 1.0;

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

const createAudio = (loop: boolean, volume: number) => {
  if (typeof Audio === 'undefined') return null;
  const el = new Audio();
  el.loop = loop;
  el.volume = volume;
  el.crossOrigin = 'anonymous';
  el.addEventListener('error', (e) => {
    const error = (e.target as HTMLAudioElement).error;
    console.error(`Audio error code: ${error?.code}, message: ${error?.message}, for src: ${(e.target as HTMLAudioElement).src}`);
  });
  return el;
};

const musicAudio = createAudio(true, 0.3); 
const menuMusicAudio = createAudio(true, 0.3);
const playerWalkAudio = createAudio(true, 0.6);
const aiWalkAudio = createAudio(true, 0.5); // New looping audio for all AI agents
const ambienceAudio = createAudio(true, 1.0); // New element for ambient sounds
const skynetTypingAudio = createAudio(true, 0.7);

let audioContext: AudioContext | null = null;
let isReady = false;

let sfxMuted = false;
let musicMuted = false;

export const setMusicVolume = (level: number) => {
    const newVolume = Math.max(0, Math.min(1, level));
    if (musicAudio) musicAudio.volume = newVolume;
    if (menuMusicAudio) menuMusicAudio.volume = newVolume;
};

export const setSfxVolume = (level: number) => {
    sfxMasterVolume = Math.max(0, Math.min(1, level));
    if (playerWalkAudio) playerWalkAudio.volume = sfxMasterVolume * 0.6;
    if (aiWalkAudio) aiWalkAudio.volume = sfxMasterVolume * 0.5;
    if (skynetTypingAudio) skynetTypingAudio.volume = sfxMasterVolume * 0.7;
    // Ambience sound (outside.mp3) is explicitly and correctly tied to SFX volume.
    if (ambienceAudio) ambienceAudio.volume = sfxMasterVolume * 1.0;
};

export const setSfxMuted = (muted: boolean) => {
  sfxMuted = muted;
  if (playerWalkAudio) playerWalkAudio.muted = muted;
  if (aiWalkAudio) aiWalkAudio.muted = muted;
  if (ambienceAudio) ambienceAudio.muted = muted;
  if (skynetTypingAudio) skynetTypingAudio.muted = muted;
};

export const setMusicMuted = (muted: boolean) => {
  musicMuted = muted;
  if (musicAudio) musicAudio.muted = muted;
  if (menuMusicAudio) menuMusicAudio.muted = muted;
};

const playAudioElement = (element: HTMLAudioElement | null, trackUrl: string, isMuted: boolean) => {
    if (!isReady || !element) return;
    
    if (!trackUrl || isMuted) {
        element.pause();
        return;
    }

    const play = (url: string) => {
        if (element.src !== url) {
            element.src = url;
        }
        if (element.paused) {
            element.play().catch(e => {
                if ((e as DOMException).name !== 'AbortError') console.warn('Audio play interrupted:', e);
            });
        }
    }

    const cachedUrl = audioCache.get(trackUrl);
    if (cachedUrl) {
        play(cachedUrl);
    } else {
        // Load on demand. Don't block.
        loadAndCacheAudio(trackUrl).then(() => {
            const newCachedUrl = audioCache.get(trackUrl);
            if (newCachedUrl) {
                // The higher-level logic in App.tsx handles pausing audio elements if they are no longer desired,
                // which prevents race conditions where an old sound might play after a context switch.
                play(newCachedUrl);
            }
        }).catch(err => {
            console.error(`On-demand audio loading failed for ${trackUrl}:`, err);
        });
    }
}

const loadAndCacheAudio = async (path: string) => {
  if (!path || audioCache.has(path)) return;
  try {
    const response = await makeApiCall(path, {});
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    audioCache.set(path, blobUrl);
    console.log(`Cached audio: ${path}`);
  } catch (error) {
    console.error(`Could not load or cache audio for path: ${path}`, error);
  }
};

export const playMusic = (trackUrl: string) => {
  if(menuMusicAudio) menuMusicAudio.pause();
  playAudioElement(musicAudio, trackUrl, musicMuted);
};

export const playAmbience = () => playAudioElement(ambienceAudio, OUTSIDE_AMBIENCE_PATH, sfxMuted);
export const stopAmbience = () => { if(ambienceAudio) ambienceAudio.pause(); };

export const playMenuMusic = () => {
  if(musicAudio) musicAudio.pause();
  if(ambienceAudio) ambienceAudio.pause();
  playAudioElement(menuMusicAudio, MENU_MUSIC_PATH, musicMuted);
};

export const stopMenuMusic = () => { if (menuMusicAudio) menuMusicAudio.pause(); };

const playSound = (path: string, volume: number = 1.0) => {
  if (!isReady || sfxMuted) return;
  
  const play = (url: string) => {
      const sound = new Audio(url);
      sound.volume = volume * sfxMasterVolume;
      sound.play().catch(e => {
         if ((e as DOMException).name !== 'AbortError') console.warn(`SFX play interrupted for ${path}:`, e);
      });
  }

  const cachedUrl = audioCache.get(path);
  if (cachedUrl) {
      play(cachedUrl);
  } else {
      loadAndCacheAudio(path).then(() => {
          const newCachedUrl = audioCache.get(path);
          if (newCachedUrl) play(newCachedUrl);
      }).catch(err => {
          console.error(`On-demand SFX loading failed for ${path}:`, err);
      });
  }
};

export const playMessageSound = () => playSound(MESSAGE_SOUND_PATH, 1.0);
export const playVictorySound = () => playSound(VICTORY_SOUND_PATH, 0.8);

export const startPlayerWalking = (isRunning: boolean = false) => {
    if (playerWalkAudio) {
        playerWalkAudio.playbackRate = isRunning ? 1.5 : 1.0;
    }
    playAudioElement(playerWalkAudio, WALKING_SOUND_PATH, sfxMuted);
};

export const stopPlayerWalking = () => {
  if (playerWalkAudio) {
    playerWalkAudio.pause();
    playerWalkAudio.playbackRate = 1.0; // Reset pitch
  }
};

// --- New AI Walking Sounds ---
export const startAiWalking = () => playAudioElement(aiWalkAudio, WALKING_SOUND_PATH, sfxMuted);
export const stopAiWalking = () => { if(aiWalkAudio) aiWalkAudio.pause(); };
// --- End New AI Walking Sounds ---

// --- Skynet Typing Sound ---
export const playSkynetTyping = () => playAudioElement(skynetTypingAudio, SKYNET_TYPING_SOUND_PATH, sfxMuted);
export const stopSkynetTyping = () => { if (skynetTypingAudio) skynetTypingAudio.pause(); };
// --- End Skynet Typing Sound ---

export const warmupAudio = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isReady || typeof window === 'undefined') return resolve();
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("AudioContext could not be created:", e);
        return reject(e);
      }
    }
    const startAudio = () => {
        isReady = true;
        console.log("AudioContext resumed. Pre-caching key sounds...");
        // Pre-cache sounds here. Don't await them, let them load in the background.
        loadAndCacheAudio(MESSAGE_SOUND_PATH);
        loadAndCacheAudio(WALKING_SOUND_PATH);
        loadAndCacheAudio(SKYNET_TYPING_SOUND_PATH);
        loadAndCacheAudio(VICTORY_SOUND_PATH);
        resolve();
    };
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(startAudio).catch(reject);
    } else {
        startAudio();
    }
  });
};