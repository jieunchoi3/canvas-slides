import { create } from 'zustand';
import type { CanvasObject, Slide, Viewport } from '../types';
import { isSupabaseConfigured } from '../supabaseClient';
import {
  createSlideInDb,
  deleteSlideFromDb,
  getStoredActiveSlideId,
  loadSlides,
  persistAllSlides,
  setStoredActiveSlideId,
} from '../utils/supabaseSlides';
import { deleteMediaByUrl, deleteMediaForObjects } from '../utils/uploadMedia';

interface AppStore {
  slides: Slide[];
  activeSlideId: string;
  selectedObjectId: string | null;
  isPresenting: boolean;
  presentationSlideIndex: number;
  hydrated: boolean;
  loadError: string | null;

  addSlide: () => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  setActiveSlide: (id: string) => void;
  updateSlideTitle: (id: string, title: string) => void;
  updateSlideBackground: (id: string, backgroundColor: string) => void;
  updateViewport: (slideId: string, viewport: Partial<Viewport>) => void;
  setViewport: (slideId: string, viewport: Viewport) => void;

  addObject: (slideId: string, object: CanvasObject) => void;
  updateObject: (slideId: string, objectId: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (slideId: string, objectId: string) => void;
  selectObject: (id: string | null) => void;

  enterPresentation: () => void;
  exitPresentation: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setPresentationSlideIndex: (index: number) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  slides: [],
  activeSlideId: '',
  selectedObjectId: null,
  isPresenting: false,
  presentationSlideIndex: 0,
  hydrated: false,
  loadError: null,

  addSlide: async () => {
    const sortOrder = get().slides.length;
    const slide = await createSlideInDb(`Slide ${sortOrder + 1}`, sortOrder);
    set((s) => ({
      slides: [...s.slides, slide],
      activeSlideId: slide.id,
      selectedObjectId: null,
    }));
    setStoredActiveSlideId(slide.id);
  },

  deleteSlide: async (id) => {
    const { slides, activeSlideId } = get();
    if (slides.length <= 1) return;

    const slideToDelete = slides.find((s) => s.id === id);
    if (!slideToDelete) return;

    await deleteMediaForObjects(slideToDelete.objects);
    await deleteSlideFromDb(id);

    const index = slides.findIndex((s) => s.id === id);
    const nextSlides = slides.filter((s) => s.id !== id);
    let nextActiveId = activeSlideId;

    if (activeSlideId === id) {
      const nextIndex = Math.min(index, nextSlides.length - 1);
      nextActiveId = nextSlides[nextIndex].id;
    }

    set({
      slides: nextSlides,
      activeSlideId: nextActiveId,
      selectedObjectId: null,
    });
    setStoredActiveSlideId(nextActiveId);
  },

  setActiveSlide: (id) => {
    set({ activeSlideId: id, selectedObjectId: null });
    setStoredActiveSlideId(id);
  },

  updateSlideTitle: (id, title) =>
    set((s) => ({
      slides: s.slides.map((slide) => (slide.id === id ? { ...slide, title } : slide)),
    })),

  updateSlideBackground: (id, backgroundColor) =>
    set((s) => ({
      slides: s.slides.map((slide) =>
        slide.id === id ? { ...slide, backgroundColor } : slide,
      ),
    })),

  updateViewport: (slideId, viewport) =>
    set((s) => ({
      slides: s.slides.map((slide) =>
        slide.id === slideId ? { ...slide, viewport: { ...slide.viewport, ...viewport } } : slide,
      ),
    })),

  setViewport: (slideId, viewport) =>
    set((s) => ({
      slides: s.slides.map((slide) => (slide.id === slideId ? { ...slide, viewport } : slide)),
    })),

  addObject: (slideId, object) =>
    set((s) => ({
      slides: s.slides.map((slide) =>
        slide.id === slideId ? { ...slide, objects: [...slide.objects, object] } : slide,
      ),
      selectedObjectId: object.id,
    })),

  updateObject: (slideId, objectId, updates) =>
    set((s) => ({
      slides: s.slides.map((slide) =>
        slide.id === slideId
          ? {
              ...slide,
              objects: slide.objects.map((obj) =>
                obj.id === objectId ? { ...obj, ...updates } : obj,
              ),
            }
          : slide,
      ),
    })),

  deleteObject: (slideId, objectId) => {
    const slide = get().slides.find((s) => s.id === slideId);
    const obj = slide?.objects.find((o) => o.id === objectId);
    if (obj?.src) {
      void deleteMediaByUrl(obj.src);
    }

    set((s) => ({
      slides: s.slides.map((sl) =>
        sl.id === slideId
          ? { ...sl, objects: sl.objects.filter((o) => o.id !== objectId) }
          : sl,
      ),
      selectedObjectId: s.selectedObjectId === objectId ? null : s.selectedObjectId,
    }));
  },

  selectObject: (id) => set({ selectedObjectId: id }),

  enterPresentation: () => {
    set({
      isPresenting: true,
      presentationSlideIndex: 0,
      selectedObjectId: null,
    });
  },

  exitPresentation: () => set({ isPresenting: false }),

  nextSlide: () => {
    const { slides, presentationSlideIndex } = get();
    if (presentationSlideIndex < slides.length - 1) {
      set({ presentationSlideIndex: presentationSlideIndex + 1 });
    }
  },

  prevSlide: () => {
    const { presentationSlideIndex } = get();
    if (presentationSlideIndex > 0) {
      set({ presentationSlideIndex: presentationSlideIndex - 1 });
    }
  },

  setPresentationSlideIndex: (index) => set({ presentationSlideIndex: index }),
}));

let saveTimeout: ReturnType<typeof setTimeout> | undefined;

useStore.subscribe((state) => {
  if (!state.hydrated) return;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    void persistAllSlides(state.slides).catch((err) => {
      console.error('Failed to save slides:', err);
    });
    setStoredActiveSlideId(state.activeSlideId);
  }, 500);
});

export async function hydrateStore(): Promise<void> {
  if (!isSupabaseConfigured()) {
    useStore.setState({
      hydrated: true,
      loadError: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    });
    return;
  }

  try {
    let slides = await loadSlides();
    let activeSlideId = getStoredActiveSlideId();

    if (slides.length === 0) {
      const slide = await createSlideInDb('Slide 1', 0);
      slides = [slide];
      activeSlideId = slide.id;
    }

    if (!activeSlideId || !slides.some((s) => s.id === activeSlideId)) {
      activeSlideId = slides[0].id;
    }

    setStoredActiveSlideId(activeSlideId);
    useStore.setState({
      slides,
      activeSlideId,
      hydrated: true,
      loadError: null,
    });
  } catch (err) {
    useStore.setState({
      hydrated: true,
      loadError: err instanceof Error ? err.message : 'Failed to load slides',
    });
  }
}

export function getActiveSlide(state: AppStore): Slide | undefined {
  return state.slides.find((s) => s.id === state.activeSlideId);
}
