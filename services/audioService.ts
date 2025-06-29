// This service manages playing sound effects and music for the application.
// It uses a blob-caching strategy to bypass cross-origin issues in sandboxed environments.

// Paths to audio files in the 'public' folder
const MESSAGE_SOUND_PATH = '/soundfiles/chat.mp3';
const WALKING_SOUND_PATH = '/soundfiles/walking.mp3';
const MENU_MUSIC_PATH = '/soundfiles/music/Menu.mp3';

// Available background music tracks
export const MUSIC_TRACKS = {
  'None': '',
  'Pixel Quest': '/soundfiles/music/Pixel_Quest.mp3',
};

// A Map to cache the blob URLs for our audio files.
const audioCache = new Map<string, string>();

// --- Volume Levels ---
let sfxMasterVolume = 1.0;

// --- Singleton Audio Elements ---
const createAudio = (loop: boolean, volume: number) => {
  if (typeof Audio === 'undefined') return null;
  const el = new Audio();
  el.loop = loop;
  el.volume = volume;
  el.crossOrigin = 'anonymous'; // Important for some environments
  el.addEventListener('error', (e) => {
    const error = (e.target as HTMLAudioElement).error;
    console.error(`Audio error code: ${error?.code}, message: ${error?.message}, for src: ${(e.target as HTMLAudioElement).src}`);
  });
  return el;
};

const musicAudio = createAudio(true, 0.3); 
const menuMusicAudio = createAudio(true, 0.3);
const playerWalkAudio = createAudio(true, 0.6);

// --- Core Audio Context Management ---
let audioContext: AudioContext | null = null;
let isReady = false;

// --- Settings ---
let sfxMuted = false;
let musicMuted = false;

export const setMusicVolume = (level: number) => {
    const newVolume = Math.max(0, Math.min(1, level));
    if (musicAudio) musicAudio.volume = newVolume;
    if (menuMusicAudio) menuMusicAudio.volume = newVolume;
};

export const setSfxVolume = (level: number) => {
    sfxMasterVolume = Math.max(0, Math.min(1, level));
    // Also update any persistent SFX audio elements.
    // Base volume for player walking is 0.6.
    if (playerWalkAudio) playerWalkAudio.volume = sfxMasterVolume * 0.6;
};

export const setSfxMuted = (muted: boolean) => {
  sfxMuted = muted;
  if (muted && playerWalkAudio && !playerWalkAudio.paused) {
    playerWalkAudio.pause();
  }
};

export const setMusicMuted = (muted: boolean) => {
  musicMuted = muted;
  if (musicAudio) musicAudio.muted = muted;
  if (menuMusicAudio) menuMusicAudio.muted = muted;
};

// --- Caching and Playback ---

/**
 * Fetches an audio file, converts it to a blob URL, and caches it.
 * This is the core of the fix for sandboxed environments.
 */
const loadAndCacheAudio = async (path: string) => {
  if (!path || audioCache.has(path)) {
    return;
  }
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    audioCache.set(path, blobUrl);
    console.log(`Cached audio: ${path}`);
  } catch (error) {
    console.error(`Could not load or cache audio for path: ${path}`, error);
  }
};

export const playMusic = async (trackUrl: string) => {
  if (!isReady || !musicAudio || !menuMusicAudio) return;
  
  menuMusicAudio.pause();

  if (!trackUrl || musicMuted) {
    musicAudio.pause();
    return;
  }

  // Ensure the track is cached before playing
  if (!audioCache.has(trackUrl)) {
    await loadAndCacheAudio(trackUrl);
  }

  const cachedUrl = audioCache.get(trackUrl);
  if (!cachedUrl) {
    console.error(`Could not find cached URL for track: ${trackUrl}`);
    return;
  }
  
  if (musicAudio.src !== cachedUrl) {
    musicAudio.src = cachedUrl;
  }

  if (musicAudio.paused) {
    musicAudio.play().catch(e => {
       if ((e as DOMException).name !== 'AbortError') {
         console.warn('Music play interrupted:', e);
       }
    });
  }
};

export const playMenuMusic = () => {
  if (!isReady || !menuMusicAudio || !musicAudio) return;
  
  musicAudio.pause();

  const cachedUrl = audioCache.get(MENU_MUSIC_PATH);
  if (!cachedUrl) return;

  if (menuMusicAudio.src !== cachedUrl) {
      menuMusicAudio.src = cachedUrl;
  }

  if (!musicMuted && menuMusicAudio.paused) {
    menuMusicAudio.play().catch(e => {
        if ((e as DOMException).name !== 'AbortError') {
         console.warn('Menu music play interrupted:', e);
        }
    });
  }
};

export const stopMenuMusic = () => {
  if (menuMusicAudio) menuMusicAudio.pause();
};

// --- SFX Playback ---
const playSound = (path: string, volume: number = 1.0) => {
  if (!isReady || sfxMuted) return;
  
  const cachedUrl = audioCache.get(path);
  if (!cachedUrl) {
      console.warn(`SFX not cached, cannot play: ${path}`);
      return;
  }

  const sound = new Audio(cachedUrl);
  sound.volume = volume * sfxMasterVolume;
  sound.play().catch(e => {
     if ((e as DOMException).name !== 'AbortError') {
       console.warn(`SFX play interrupted for ${path}:`, e);
     }
  });
};

export const playMessageSound = () => playSound(MESSAGE_SOUND_PATH, 1.0);

export const playAiWalkSound = () => playSound(WALKING_SOUND_PATH, 0.5);

export const startPlayerWalking = () => {
  if (!isReady || sfxMuted || !playerWalkAudio || !playerWalkAudio.paused) return;
  
  const cachedUrl = audioCache.get(WALKING_SOUND_PATH);
  if (!cachedUrl) return;

  if(playerWalkAudio.src !== cachedUrl) {
      playerWalkAudio.src = cachedUrl;
  }

  playerWalkAudio.play().catch(e => {
      if ((e as DOMException).name !== 'AbortError') {
        console.warn('Player walk sound interrupted:', e);
      }
  });
};

export const stopPlayerWalking = () => {
  if (playerWalkAudio) playerWalkAudio.pause();
};

// --- System ---
export const warmupAudio = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isReady || typeof window === 'undefined') {
      return resolve();
    }
    
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("AudioContext could not be created:", e);
        return reject(e);
      }
    }

    const startAudio = async () => {
        try {
            // Load all essential sounds into the cache
            await Promise.all([
                loadAndCacheAudio(MESSAGE_SOUND_PATH),
                loadAndCacheAudio(WALKING_SOUND_PATH),
                loadAndCacheAudio(MENU_MUSIC_PATH),
            ]);
            console.log("AudioContext resumed and essential sounds cached.");
            isReady = true;
            resolve();
        } catch(err) {
            console.error("Failed to cache sounds:", err);
            reject(err);
        }
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(startAudio).catch((err) => {
        console.error("Failed to resume AudioContext:", err);
        reject(err);
      });
    } else if (audioContext.state === 'running') {
        startAudio();
    } else {
        console.warn(`AudioContext is in an unhandled state: ${audioContext.state}`);
        reject(new Error(`AudioContext state is ${audioContext.state}`));
    }
  });
};