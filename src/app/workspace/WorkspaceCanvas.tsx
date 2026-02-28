"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExpand,
  faPlus,
  faMobileScreen,
  faLaptop,
  faWandMagicSparkles,
  faCircleQuestion,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { useWorkspace, type CanvasElement } from "./workspace-context";
import { useAuth } from "@/components/auth/AuthProvider";

// Infinite canvas configuration
const INFINITE_CANVAS_SIZE = 5000;
const MIN_WIDTH = 140;
const MIN_HEIGHT = 80;
const LOCAL_STORAGE_KEY = "design-system-data";

const BACKGROUND_STYLES: Record<string, string> = {
  surface:
    "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
  muted:
    "bg-gray-50 dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-800",
  accent:
    "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-500/30",
};

const TEXT_STYLES: Record<string, string> = {
  default: "text-gray-700 dark:text-gray-200",
  muted: "text-gray-500 dark:text-gray-300",
  accent: "text-indigo-600 dark:text-indigo-300",
};

const paddingClassFor = (padding: number) => {
  if (padding >= 26) return "p-6";
  if (padding >= 22) return "p-5";
  return "p-4";
};

type Handle = "nw" | "ne" | "sw" | "se";

type Interaction = {
  type: "drag" | "resize";
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
  handle?: Handle;
};

type PanState = {
  active: boolean;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  cursor: "grab" | "grabbing";
};

type DraftRect = { x: number; y: number; width: number; height: number };
type InteractionMode = "select" | "drag" | "edit-text" | "pan";

export default function WorkspaceCanvas() {
  const {
    state,
    view,
    ui,
    setSelectedElement,
    setActivePage,
    updateElement,
    addElement,
    removeElement,
    addPage,
    duplicatePage,
    deletePage,
    setZoom,
    updateZoom,
    updatePage,
    updatePrompt,
    runPrompt,
    openKnowYourDesign,
    openPromptGenerator,
    openProjectCode,
    generateCaseStudyPpt,
    closeActiveProject,
  } = useWorkspace();
  const { requireAuth } = useAuth();
  const authReason = "Create an account to continue.";
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<CanvasElement | null>(null);
  const editingRef = useRef<HTMLDivElement | null>(null);
  const editingDraftRef = useRef<Record<string, string>>({});
  const latestChangeRef = useRef<{
    id: string;
    changes: Partial<CanvasElement>;
  } | null>(null);
  const initialPanSetRef = useRef(false);
  
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [pageDragOrigin, setPageDragOrigin] = useState({ x: 0, y: 0, pageX: 0, pageY: 0 });
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pageContextMenu, setPageContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [panning, setPanning] = useState<PanState>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    cursor: "grab",
  });
  const [, forceRender] = useState(0);
  const interactionModeRef = useRef<InteractionMode>("select");
  const draftPositionsRef = useRef<Map<string, DraftRect>>(new Map());
  const renderRafRef = useRef<number | null>(null);
  const panRafRef = useRef<number | null>(null);
  const panDraftRef = useRef<{ x: number; y: number } | null>(null);
  const pointerElementRef = useRef<string | null>(null);
  const centeredPageIdsRef = useRef<Set<string>>(new Set());
  const manualPageIdsRef = useRef<Set<string>>(new Set());
  const prevPageIdsRef = useRef<string[]>([]);
  const pendingRenameRef = useRef(false);
  const initializedRef = useRef(false);
  const prevViewModeRef = useRef(view.viewMode);
  const hasSavedViewportRef = useRef(false);
  const viewportSaveRef = useRef<number | null>(null);
  const zoomRef = useRef(view.zoom);
  const viewportRestoreRef = useRef(false);

  const activePage = useMemo(
    () => state.pages.find((page) => page.id === state.activePageId),
    [state.pages, state.activePageId]
  );
  const projectPages = useMemo(
    () =>
      state.activeProjectId
        ? state.pages.filter((page) => page.projectId === state.activeProjectId)
        : [],
    [state.pages, state.activeProjectId]
  );
  const visiblePages = useMemo(
    () =>
      state.activeProjectId
        ? state.pages.filter((page) => page.projectId === state.activeProjectId)
        : [],
    [state.pages, state.activeProjectId]
  );
  const canOpenProjectModals = Boolean(state.activeProjectId && projectPages.length);
  const canGenerateCaseStudy = canOpenProjectModals && !ui.caseStudyGenerating;
  const isFullView = view.viewMode === "full";
  const promptValue = activePage?.prompt ?? "";
  const canRun = promptValue.trim().length > 0 && !ui.isGenerating;

  const frameWidth = state.platform === "web" ? 1200 : 428;
  const minFrameHeight = state.platform === "web" ? 640 : 720;

  const elements = activePage?.elements ?? [];
  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  const scale = Math.min(1.2, Math.max(0.5, view.zoom));

  const getViewportCenter = useCallback(() => {
    const width = containerWidth || viewportRef.current?.clientWidth || 0;
    const height = containerHeight || viewportRef.current?.clientHeight || 0;
    if (!width || !height) return null;
    const visibleCenterX = (width / 2 - pan.x) / scale;
    const visibleCenterY = (height / 2 - pan.y) / scale;
    return { x: visibleCenterX, y: visibleCenterY };
  }, [containerWidth, containerHeight, pan.x, pan.y, scale]);

  const getPageHeight = useCallback(
    (page: (typeof state.pages)[number]) => {
      if (!page.elements.length) return minFrameHeight;
      const map = new Map(page.elements.map((el) => [el.id, el]));
      return page.elements.reduce((max, element) => {
        const rect = getAbsoluteRect(element, map);
        return Math.max(max, rect.y + rect.height);
      }, minFrameHeight);
    },
    [minFrameHeight]
  );

  const isDefaultPagePosition = useCallback(
    (page: (typeof state.pages)[number]) => {
      const index = state.pages.findIndex((item) => item.id === page.id);
      if (index < 0) return false;
      const defaultX = 2000 + index * 60;
      const defaultY = 2000 + index * 60;
      return (
        Math.abs((page.canvasX ?? defaultX) - defaultX) < 1 &&
        Math.abs((page.canvasY ?? defaultY) - defaultY) < 1
      );
    },
    [state.pages]
  );

  const shouldAutoRename = useCallback((name?: string | null) => {
    if (!name) return true;
    const trimmed = name.trim();
    return trimmed === "" || trimmed === "Untitled Page";
  }, []);

  const centerPageInView = useCallback(
    (pageId: string) => {
      const center = getViewportCenter();
      if (!center) return;
      const page = state.pages.find((item) => item.id === pageId);
      if (!page) return;
      const width = frameWidth;
      const height = getPageHeight(page);
      updatePage(pageId, {
        canvasX: center.x - width / 2,
        canvasY: center.y - height / 2,
      });
      centeredPageIdsRef.current.add(pageId);
    },
    [getViewportCenter, state.pages, frameWidth, getPageHeight, updatePage]
  );

  const commitRename = useCallback(() => {
    if (!renamingPageId) return;
    const nextName = renameValue.trim();
    if (nextName) {
      updatePage(renamingPageId, { name: nextName });
    }
    setRenamingPageId(null);
    setRenameValue("");
  }, [renamingPageId, renameValue, updatePage]);

  const cancelRename = useCallback(() => {
    setRenamingPageId(null);
    setRenameValue("");
  }, []);

  useEffect(() => {
    if (!pageContextMenu) return;
    const handleClick = () => setPageContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPageContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pageContextMenu]);

  useEffect(() => {
    setEditingElementId(null);
    setRenamingPageId(null);
    setRenameValue("");
  }, [state.activeProjectId]);

  useEffect(() => {
    if (!canvasContextMenu) return;
    const handleClick = () => setCanvasContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCanvasContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [canvasContextMenu]);

  const scheduleRender = useCallback(() => {
    if (renderRafRef.current !== null) return;
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderRafRef.current = null;
      forceRender((tick) => tick + 1);
    });
  }, [forceRender]);

  const getDraftRect = (element: CanvasElement): DraftRect =>
    draftPositionsRef.current.get(element.id) ?? {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };

  const getAbsoluteRect = (
    element: CanvasElement,
    map: Map<string, CanvasElement> = elementMap
  ): DraftRect => {
    const rect = getDraftRect(element);
    let x = rect.x;
    let y = rect.y;
    let parentId = element.parentId;
    while (parentId) {
      const parent = map.get(parentId);
      if (!parent) break;
      const parentRect = getDraftRect(parent);
      x += parentRect.x;
      y += parentRect.y;
      parentId = parent.parentId ?? null;
    }
    return { x, y, width: rect.width, height: rect.height };
  };

  const frameHeight = activePage?.elements
    ? activePage.elements.reduce((max, element) => {
        const rect = getAbsoluteRect(element);
        return Math.max(max, rect.y + rect.height);
      }, minFrameHeight)
    : minFrameHeight;

  useEffect(() => {
    if (viewportRestoreRef.current) return;
    viewportRestoreRef.current = true;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        viewport?: { x: number; y: number; scale: number };
      };
      const viewport = parsed.viewport;
      if (
        viewport &&
        typeof viewport.x === "number" &&
        typeof viewport.y === "number" &&
        typeof viewport.scale === "number"
      ) {
        setPan({ x: viewport.x, y: viewport.y });
        setZoom(viewport.scale);
        initialPanSetRef.current = true;
        hasSavedViewportRef.current = true;
      }
    } catch {
      // ignore invalid storage
    }
  }, [setZoom]);

  // Initialize center pan on first load
  useEffect(() => {
    if (!viewportRef.current || initialPanSetRef.current) return;
    
    // Get viewport dimensions directly if ResizeObserver hasn't fired yet
    const width = containerWidth || viewportRef.current.clientWidth || 800;
    const height = containerHeight || viewportRef.current.clientHeight || 520;
    
    if (width === 0 || height === 0) return;

    // Center the infinite canvas in the viewport
    const centeredX = (width - INFINITE_CANVAS_SIZE * scale) / 2;
    const centeredY = (height - INFINITE_CANVAS_SIZE * scale) / 2;
    setPan({ x: centeredX, y: centeredY });
    initialPanSetRef.current = true;
  }, [containerWidth, containerHeight, scale, state.platform]);

  useEffect(() => {
    if (initializedRef.current) return;
    const width = containerWidth || viewportRef.current?.clientWidth || 0;
    const height = containerHeight || viewportRef.current?.clientHeight || 0;
    if (!width || !height) return;
    prevPageIdsRef.current = state.pages.map((page) => page.id);
    initializedRef.current = true;
    if (hasSavedViewportRef.current) return;
    if (
      state.pages.length === 1 &&
      activePage &&
      isDefaultPagePosition(activePage)
    ) {
      centerPageInView(activePage.id);
    }
  }, [
    containerWidth,
    containerHeight,
    state.pages,
    activePage,
    centerPageInView,
    isDefaultPagePosition,
  ]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const currentIds = state.pages.map((page) => page.id);
    const prevIds = prevPageIdsRef.current;
    const addedId = currentIds.find((id) => !prevIds.includes(id));
    if (addedId) {
      centerPageInView(addedId);
      if (pendingRenameRef.current) {
        const addedPage = state.pages.find((page) => page.id === addedId);
        if (shouldAutoRename(addedPage?.name)) {
          setRenamingPageId(addedId);
          setRenameValue(addedPage?.name ?? "");
        }
        pendingRenameRef.current = false;
      }
    }
    prevPageIdsRef.current = currentIds;
  }, [state.pages, centerPageInView, shouldAutoRename]);

  useEffect(() => {
    const prev = prevViewModeRef.current;
    if (prev !== view.viewMode && view.viewMode === "full") {
      if (
        activePage &&
        !manualPageIdsRef.current.has(activePage.id) &&
        isDefaultPagePosition(activePage)
      ) {
        centerPageInView(activePage.id);
      }
    }
    prevViewModeRef.current = view.viewMode;
  }, [view.viewMode, activePage, centerPageInView, isDefaultPagePosition]);

  useEffect(() => {
    if (!viewportRef.current) return;
    
    // Get initial dimensions
    const rect = viewportRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerWidth(rect.width);
      setContainerHeight(rect.height);
    }

    // Setup ResizeObserver for dynamic sizing
    if (typeof ResizeObserver === "undefined") return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!editingElementId) return;
    const node = editingRef.current;
    if (node) {
      const draft = editingDraftRef.current[editingElementId] ?? "";
      node.textContent = draft;
      node.focus();
    }
  }, [editingElementId]);

  useEffect(() => {
    zoomRef.current = view.zoom;
  }, [view.zoom]);

  useEffect(() => {
    if (!interaction) return;

    const handleMove = (event: PointerEvent) => {
      const dx = (event.clientX - interaction.startX) / scale;
      const dy = (event.clientY - interaction.startY) / scale;
      let nextX = interaction.originX;
      let nextY = interaction.originY;
      let nextWidth = interaction.originWidth;
      let nextHeight = interaction.originHeight;

      if (interaction.type === "drag") {
        nextX = clamp(interaction.originX + dx, 0, frameWidth - nextWidth);
        nextY = clamp(interaction.originY + dy, 0, frameHeight - nextHeight);
      }

      if (interaction.type === "resize" && interaction.handle) {
        const handle = interaction.handle;
        if (handle.includes("e")) {
          nextWidth = clamp(interaction.originWidth + dx, MIN_WIDTH, frameWidth);
        }
        if (handle.includes("s")) {
          nextHeight = clamp(
            interaction.originHeight + dy,
            MIN_HEIGHT,
            frameHeight
          );
        }
        if (handle.includes("w")) {
          const width = clamp(interaction.originWidth - dx, MIN_WIDTH, frameWidth);
          nextX = clamp(
            interaction.originX + (interaction.originWidth - width),
            0,
            frameWidth - width
          );
          nextWidth = width;
        }
        if (handle.includes("n")) {
          const height = clamp(
            interaction.originHeight - dy,
            MIN_HEIGHT,
            frameHeight
          );
          nextY = clamp(
            interaction.originY + (interaction.originHeight - height),
            0,
            frameHeight - height
          );
          nextHeight = height;
        }
      }

      const changes = {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      };
      draftPositionsRef.current.set(interaction.id, changes);
      latestChangeRef.current = { id: interaction.id, changes };
      scheduleRender();
    };

    const handleUp = () => {
      if (latestChangeRef.current) {
        updateElement(
          latestChangeRef.current.id,
          latestChangeRef.current.changes,
          true
        );
        draftPositionsRef.current.delete(latestChangeRef.current.id);
        latestChangeRef.current = null;
        scheduleRender();
      }
      setInteraction(null);
      interactionModeRef.current = "select";
      pointerElementRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [interaction, scale, frameWidth, frameHeight, updateElement, state.platform, scheduleRender]);

  const startDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    element: (typeof elements)[number]
  ) => {
    event.preventDefault();
    event.stopPropagation();
    interactionModeRef.current = "drag";
    const rect = getDraftRect(element);
    setInteraction({
      type: "drag",
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.x,
      originY: rect.y,
      originWidth: rect.width,
      originHeight: rect.height,
    });
  };

  const startResize = (
    event: React.PointerEvent<HTMLDivElement>,
    element: (typeof elements)[number],
    handle: Handle
  ) => {
    event.stopPropagation();
    event.preventDefault();
    interactionModeRef.current = "drag";
    setSelectedElement(element.id);
    const rect = getDraftRect(element);
    setInteraction({
      type: "resize",
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.x,
      originY: rect.y,
      originWidth: rect.width,
      originHeight: rect.height,
      handle,
    });
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.button === 2) return;
    if (
      target.closest("[data-floating-ui='true']") ||
      target.closest("[data-floating-dock='true']")
    )
      return;
    if (target.closest("[data-canvas-element='true']")) return;
    if (target.closest("[data-page-frame='true']")) return;
    event.preventDefault();
    setSelectedElement(null);
    interactionModeRef.current = "pan";
    setPanning({
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      cursor: "grabbing",
    });
  };

  useEffect(() => {
    if (!panning.active) return;

    const handleMove = (event: PointerEvent) => {
      const dx = event.clientX - panning.startX;
      const dy = event.clientY - panning.startY;
      panDraftRef.current = {
        x: panning.originX + dx,
        y: panning.originY + dy,
      };
      if (panRafRef.current !== null) return;
      panRafRef.current = window.requestAnimationFrame(() => {
        panRafRef.current = null;
        if (panDraftRef.current) {
          setPan(panDraftRef.current);
        }
      });
    };

    const handleUp = () => {
      setPanning((prev) => ({ ...prev, active: false, cursor: "grab" }));
      interactionModeRef.current = "select";
      pointerElementRef.current = null;
    };

    document.body.style.cursor = panning.cursor;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [panning, panning.active, panning.cursor]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key.toLowerCase();
    const hasModifier = event.metaKey || event.ctrlKey;
    
    // Don't handle keyboard shortcuts if focus is on an input element
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      return;
    }

    if (hasModifier && key === "c") {
      event.preventDefault();
      const selected = elements.find(
        (element) => element.id === view.selectedElementId
      );
      if (selected) {
        clipboardRef.current = createClipboard(selected);
      }
    }

    if (hasModifier && key === "v") {
      event.preventDefault();
      if (clipboardRef.current) {
        const newElement = {
          ...clipboardRef.current,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `id_${Math.random().toString(36).slice(2, 10)}`,
          x: clamp(clipboardRef.current.x + 24, 0, frameWidth - 160),
          y: clamp(clipboardRef.current.y + 24, 0, frameHeight - 120),
        };
        addElement(newElement);
      }
    }

    if (key === "backspace" || key === "delete") {
      if (view.selectedElementId) {
        event.preventDefault();
        removeElement(view.selectedElementId);
      }
    }
  };

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest("[data-floating-ui='true']") ||
        target.closest("[data-floating-dock='true']") ||
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      const delta = event.deltaY * -0.001;
      setZoom(zoomRef.current + delta, false);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, [setZoom]);

  useEffect(() => {
    if (viewportSaveRef.current !== null) {
      window.clearTimeout(viewportSaveRef.current);
    }
    viewportSaveRef.current = window.setTimeout(() => {
      let existing: Record<string, unknown> = {};
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          existing = JSON.parse(stored) as Record<string, unknown>;
        } catch {
          existing = {};
        }
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...existing,
          viewport: { x: pan.x, y: pan.y, scale: view.zoom },
        })
      );
    }, 150);
    return () => {
      if (viewportSaveRef.current !== null) {
        window.clearTimeout(viewportSaveRef.current);
      }
    };
  }, [pan.x, pan.y, view.zoom]);

  const handleElementDoubleClick = (element: CanvasElement) => {
    const isTextElement = ["text", "heading", "paragraph", "button", "input"].includes(element.type);
    if (isTextElement) {
      editingDraftRef.current[element.id] = element.content || "";
      setEditingElementId(element.id);
      interactionModeRef.current = "edit-text";
    }
  };

  const handleElementContentChange = (content: string) => {
    if (editingElementId) {
      editingDraftRef.current[editingElementId] = content;
    }
  };

  const finishEditingElement = () => {
    if (editingElementId) {
      const element = activePage?.elements.find((el) => el.id === editingElementId);
      if (element) {
        const content = editingDraftRef.current[editingElementId] ?? "";
        updateElement(editingElementId, { content }, true);
      }
    }
    if (editingElementId) {
      delete editingDraftRef.current[editingElementId];
    }
    setEditingElementId(null);
    interactionModeRef.current = "select";
  };

  const handlePagePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    pageId: string,
    pageX: number,
    pageY: number
  ) => {
    const target = event.target as HTMLElement;
    // Don't start page drag if clicking on an element inside the page
    if (editingElementId) return;
    if (event.button === 2) return;
    if (renamingPageId === pageId) return;
    if (target.closest("[data-canvas-element='true']")) return;
    
    event.stopPropagation();
    setDraggingPageId(pageId);
    setPageDragOrigin({
      x: event.clientX,
      y: event.clientY,
      pageX,
      pageY,
    });
  };

  useEffect(() => {
    if (!draggingPageId) return;

    const handleMove = (event: PointerEvent) => {
      const dx = event.clientX - pageDragOrigin.x;
      const dy = event.clientY - pageDragOrigin.y;
      
      const newPageX = pageDragOrigin.pageX + dx / scale;
      const newPageY = pageDragOrigin.pageY + dy / scale;
      
      manualPageIdsRef.current.add(draggingPageId);
      // Update page position optimistically (no history commit yet)
      updatePage(draggingPageId, {
        canvasX: newPageX,
        canvasY: newPageY,
      });
    };

    const handleUp = () => {
      setDraggingPageId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingPageId, pageDragOrigin, scale, updatePage]);

  const frameLabel = state.platform === "web" ? "Web Frame" : "Mobile Frame";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Canvas Preview</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {frameLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            <FontAwesomeIcon
              icon={state.platform === "web" ? faLaptop : faMobileScreen}
              className="text-[10px]"
            />
            {state.platform === "web" ? "1200px" : "428px"} frame
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`relative mt-6 h-130 w-full overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 ${
          panning.cursor === "grabbing" ? "cursor-grabbing" : "cursor-grab"
        }`}
        onContextMenu={(event) => {
          event.preventDefault();
          const target = event.target as HTMLElement;
          if (target.closest("[data-page-frame='true']")) return;
          setCanvasContextMenu({ x: event.clientX, y: event.clientY });
        }}
        onPointerDownCapture={(event) => {
          const target = event.target as HTMLElement;
          if (event.button === 2) return;
          if (
            target.closest("[data-floating-ui='true']") ||
            target.closest("[data-floating-dock='true']")
          )
            return;
          const elementsAtPoint = document.elementsFromPoint(
            event.clientX,
            event.clientY
          );
          const elementId =
            elementsAtPoint
              .find((node): node is HTMLElement => {
                if (!(node instanceof HTMLElement)) return false;
                const { dataset } = node;
                return (
                  dataset?.canvasElement === "true" &&
                  dataset?.ghost !== "true" &&
                  typeof dataset.elementId === "string" &&
                  dataset.elementId.length > 0
                );
              })
              ?.dataset.elementId ?? null;
          const pageTarget = target.closest("[data-page-frame='true']") as HTMLElement | null;
          const pageId = pageTarget?.dataset.pageId;
          pointerElementRef.current = elementId;
          if (pageId) {
            setActivePage(pageId);
          }
          if (elementId) {
            setSelectedElement(elementId);
          }
        }}
        onPointerDown={startPan}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest("[data-floating-ui='true']") ||
            target.closest("[data-floating-dock='true']")
          )
            return;
          if (target.closest("[data-canvas-element='true']")) return;
          if (target.closest("[data-page-frame='true']")) return;
          setSelectedElement(null);
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="presentation"
      >
        {/* Canvas Content (pan + zoom applied here) */}
        <div
          data-canvas-content="true"
          style={{
            position: "absolute" as const,
            width: INFINITE_CANVAS_SIZE,
            height: INFINITE_CANVAS_SIZE,
            left: 0,
            top: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "top left" as const,
            willChange: "transform" as const,
          }}
        >
          {/* Pages rendered inside infinite canvas */}
          {visiblePages.map((page, index) => {
            const isActive = page.id === state.activePageId;
            const pageElements = page.elements;
            const hasElements = pageElements.length > 0;
            const pageElementMap = new Map(pageElements.map((el) => [el.id, el]));
            const pageHeight = pageElements.reduce(
              (max, element) => {
                const rect = getAbsoluteRect(element, pageElementMap);
                return Math.max(max, rect.y + rect.height);
              },
              minFrameHeight
            );
            const selectedElement = isActive
              ? pageElements.find(
                  (element) =>
                    element.id === view.selectedElementId &&
                    !element.isGhost &&
                    element.type !== "background"
                )
              : null;
            const selectedRect = selectedElement
              ? getAbsoluteRect(selectedElement, pageElementMap)
              : null;

            // Ensure canvasX and canvasY are valid numbers for old saved state
            const canvasX = typeof page.canvasX === "number" ? page.canvasX : 2000 + index * 60;
            const canvasY = typeof page.canvasY === "number" ? page.canvasY : 2000 + index * 60;

            return (
              <div
                key={page.id}
                data-page-frame="true"
                data-page-id={page.id}
                onPointerDown={(e) => handlePagePointerDown(e, page.id, canvasX, canvasY)}
                onContextMenu={(event) => {
                  if (!isFullView) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setPageContextMenu({
                    id: page.id,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                style={{
                  position: "absolute" as const,
                  left: canvasX,
                  top: canvasY,
                  width: frameWidth,
                  height: pageHeight,
                  cursor: draggingPageId === page.id ? "grabbing" : "grab",
                  transition: draggingPageId === page.id ? "none" : "box-shadow 0.2s",
                  boxShadow: draggingPageId === page.id ? "0 20px 40px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                {/* Page Label */}
                <button
                  type="button"
                  onClick={() => setActivePage(page.id)}
                  className={`absolute -top-7 left-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                      : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                  }`}
                >
                  {renamingPageId === page.id ? (
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitRename();
                        }
                        if (event.key === "Escape") {
                          cancelRename();
                        }
                      }}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="w-28 rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-500/30 dark:bg-gray-950 dark:text-gray-200 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        setActivePage(page.id);
                        setRenamingPageId(page.id);
                        setRenameValue(page.name);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      {page.name}
                    </span>
                  )}
                </button>

                {/* Page Frame */}
                <div
                  className={`relative h-full w-full overflow-hidden rounded-3xl border bg-white shadow-sm transition dark:bg-gray-950 ${
                    state.platform === "mobile" ? "rounded-[36px]" : "rounded-3xl"
                  } ${
                    isActive
                      ? "border-indigo-200 shadow-md dark:border-indigo-500/30"
                      : "border-gray-200 opacity-80 dark:border-gray-800"
                  }`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-canvas-element='true']")) return;
                    e.stopPropagation();
                    setActivePage(page.id);
                  }}
                >
                  {/* Mobile notch indicator */}
                  {state.platform === "mobile" ? (
                    <div className="pointer-events-none absolute left-1/2 top-3 h-2 w-24 -translate-x-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                  ) : null}

                  {/* Canvas Elements */}
                  {pageElements.map((element) => {
                    const isEditing = editingElementId === element.id;
                    const isTextElement = ["text", "heading", "paragraph", "button", "input"].includes(element.type);
                    const rect = getDraftRect(element);
                    const absRect = getAbsoluteRect(element, pageElementMap);
                    const hasTextChildren =
                      !element.parentId &&
                      pageElements.some(
                        (child) =>
                          child.parentId === element.id &&
                          ["text", "heading", "paragraph", "button", "input"].includes(child.type)
                      );
                    const isGhostElement =
                      element.isGhost === true || element.type === "background";
                    const isSelected =
                      isActive &&
                      element.id === view.selectedElementId &&
                      !isGhostElement;

                    // Build full styles from element.style object
                    const elementStyles: React.CSSProperties = {
                      position: "absolute",
                      left: absRect.x,
                      top: absRect.y,
                      width: rect.width,
                      height: rect.height,
                      background:
                        element.style?.backgroundGradient ||
                        element.style?.backgroundColor ||
                        (isTextElement ? "transparent" : "#ffffff"),
                      color: element.style?.color || "#1f2937",
                      borderWidth: element.style?.borderWidth ? `${element.style.borderWidth}px` : 0,
                      borderColor: element.style?.borderColor || "transparent",
                      borderStyle: element.style?.borderStyle || "solid",
                      borderRadius:
                        element.style?.borderRadiusTopLeft ||
                        element.style?.borderRadiusTopRight ||
                        element.style?.borderRadiusBottomLeft ||
                        element.style?.borderRadiusBottomRight
                          ? `${element.style?.borderRadiusTopLeft || 0}px ${element.style?.borderRadiusTopRight || 0}px ${element.style?.borderRadiusBottomRight || 0}px ${element.style?.borderRadiusBottomLeft || 0}px`
                          : `${element.style?.borderRadius || 0}px`,
                      padding: `${element.style?.paddingTop || 0}px ${element.style?.paddingRight || 0}px ${element.style?.paddingBottom || 0}px ${element.style?.paddingLeft || 0}px`,
                      opacity: element.style?.opacity ?? 1,
                      fontSize: element.style?.fontSize ? `${element.style.fontSize}px` : 14,
                      fontWeight: element.style?.fontWeight || "400",
                      fontFamily: element.style?.fontFamily,
                      lineHeight: element.style?.lineHeight || 1.5,
                      letterSpacing: element.style?.letterSpacing ? `${element.style.letterSpacing}px` : 0,
                      textAlign: element.style?.textAlign || "left",
                      textTransform: element.style?.textTransform || "none",
                      zIndex: element.style?.zIndex || 1,
                    };

                    return (
                      <div
                        key={element.id}
                        data-canvas-element={isGhostElement ? undefined : "true"}
                        data-element-id={element.id}
                        data-ghost={isGhostElement ? "true" : undefined}
                        style={{
                          ...(elementStyles || {}),
                          pointerEvents: "auto",
                          userSelect: isTextElement && !isEditing ? "none" : "auto",
                        }}
                        onPointerDown={(event) => {
                          if (isGhostElement) return;
                          event.stopPropagation();
                          if (!isActive) {
                            setActivePage(page.id);
                          }
                          if (editingElementId === element.id) return;
                          if (
                            pointerElementRef.current &&
                            pointerElementRef.current !== element.id
                          ) {
                            return;
                          }
                          if (view.selectedElementId !== element.id) {
                            setSelectedElement(element.id);
                          }
                          startDrag(event, element);
                        }}
                        onDoubleClick={() => {
                          if (isGhostElement) return;
                          // Activate page if needed
                          if (!isActive) {
                            setActivePage(page.id);
                          }
                          // Enter edit mode for text elements
                          setSelectedElement(element.id);
                          handleElementDoubleClick(element);
                        }}
                        className={`absolute rounded-2xl transition-all duration-150 cursor-pointer ${
                          isTextElement ? "hover:shadow-none" : "shadow-sm hover:shadow-md"
                        }`}
                      >
                        {/* Text Editing Mode */}
                        {isEditing && isTextElement ? (
                          <div
                            ref={editingRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) =>
                              handleElementContentChange(
                                e.currentTarget.textContent ?? ""
                              )
                            }
                            onBlur={finishEditingElement}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Escape") {
                                finishEditingElement();
                              }
                            }}
                            className="h-full w-full bg-transparent p-2 outline-none text-inherit font-inherit"
                            spellCheck={false}
                          >
                          </div>
                        ) : isTextElement ? (
                          <div
                            className="flex h-full w-full items-center justify-start p-2 text-base font-inherit wrap-break-word overflow-hidden"
                            style={{
                              whiteSpace: "pre-wrap",
                              wordWrap: "break-word",
                              cursor: "text",
                            }}
                          >
                            {element.content || `Click to edit ${element.type}...`}
                          </div>
                        ) : hasTextChildren ? null : (
                          <div className={`flex h-full w-full flex-col justify-between items-start`}>
                            <div>
                              <div className="text-sm font-semibold">
                                {element.label}
                              </div>
                              <div className="mt-2 text-xs opacity-70">
                                {element.type}
                              </div>
                            </div>
                            <div className="mt-4 flex w-full gap-2">
                              <span className="h-2 flex-1 rounded-full bg-current opacity-20" />
                              <span className="h-2 w-10 rounded-full bg-current opacity-20" />
                            </div>
                          </div>
                        )}

                        {/* Resize Handles */}
                        {isSelected ? (
                          <>
                            <div
                              className="absolute -left-1 -top-1 h-3 w-3 cursor-nwse-resize rounded-full border border-indigo-400 bg-white shadow-sm dark:border-indigo-300 dark:bg-gray-950"
                              onPointerDown={(event) => startResize(event, element, "nw")}
                            />
                            <div
                              className="absolute -right-1 -top-1 h-3 w-3 cursor-nesw-resize rounded-full border border-indigo-400 bg-white shadow-sm dark:border-indigo-300 dark:bg-gray-950"
                              onPointerDown={(event) => startResize(event, element, "ne")}
                            />
                            <div
                              className="absolute -left-1 -bottom-1 h-3 w-3 cursor-nesw-resize rounded-full border border-indigo-400 bg-white shadow-sm dark:border-indigo-300 dark:bg-gray-950"
                              onPointerDown={(event) => startResize(event, element, "sw")}
                            />
                            <div
                              className="absolute -right-1 -bottom-1 h-3 w-3 cursor-nwse-resize rounded-full border border-indigo-400 bg-white shadow-sm dark:border-indigo-300 dark:bg-gray-950"
                              onPointerDown={(event) => startResize(event, element, "se")}
                            />
                          </>
                        ) : null}
                      </div>
                    );
                  })}

                  {isActive && selectedElement && selectedRect ? (
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        left: selectedRect.x,
                        top: selectedRect.y,
                        width: selectedRect.width,
                        height: selectedRect.height,
                        borderRadius:
                          selectedElement.style?.borderRadius ?? 12,
                        border: "1.5px solid #6366f1",
                        boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.15)",
                      }}
                    />
                  ) : null}

                  {/* Empty State */}
                  {!hasElements && !ui.isGenerating ? (
                    <div className="pointer-events-none flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      Start by describing your screen.
                    </div>
                  ) : null}

                  {/* Generation Loading State */}
                  {ui.isGenerating && isActive ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-gray-600 backdrop-blur dark:bg-gray-950/70 dark:text-gray-300">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-8 w-8 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400/40" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
                        </span>
                        {ui.generationMessage || "Building your design..."}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {isFullView ? (
          <div
            data-floating-dock="true"
            className="absolute bottom-5 right-5 z-40 flex w-72 flex-col gap-3"
          >
            <button
              type="button"
              data-floating-ui="true"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                requireAuth(() => {
                  const name = "Untitled Page";
                  pendingRenameRef.current = shouldAutoRename(name);
                  addPage(name);
                }, authReason);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 shadow-lg shadow-indigo-500/10 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-gray-900 dark:text-indigo-300 dark:shadow-black/40 dark:hover:bg-gray-950"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              Add Page
            </button>
            <div className="pointer-events-auto rounded-2xl border border-gray-200/70 bg-white/90 p-3 shadow-lg shadow-black/5 backdrop-blur dark:border-gray-800/70 dark:bg-gray-900/90 dark:shadow-black/40">
              <textarea
                value={promptValue}
                onChange={(event) => updatePrompt(event.target.value)}
                placeholder="Describe your layout..."
                className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/20"
                onPointerDown={(event) => event.stopPropagation()}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => requireAuth(() => runPrompt(promptValue), authReason)}
                  disabled={!canRun}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                    canRun
                      ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      : "cursor-not-allowed bg-indigo-600/60"
                  }`}
                >
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                  {ui.isGenerating ? "Building..." : "Run"}
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => requireAuth(openPromptGenerator, authReason)}
                  disabled={!canOpenProjectModals}
                  title={
                    canOpenProjectModals ? "" : "Select a project with pages first"
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    canOpenProjectModals
                      ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                      : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                  MVP Prompt (Project)
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => requireAuth(openProjectCode, authReason)}
                  disabled={!canOpenProjectModals}
                  title={
                    canOpenProjectModals ? "" : "Select a project with pages first"
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    canOpenProjectModals
                      ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                      : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                  {state.activeProjectId
                    ? `${state.projects.find((project) => project.id === state.activeProjectId)?.name || "Project"} Code`
                    : "Project Code"}
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => requireAuth(generateCaseStudyPpt, authReason)}
                  disabled={!canGenerateCaseStudy}
                  title={
                    canOpenProjectModals ? "" : "Select a project with pages first"
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    canGenerateCaseStudy
                      ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                      : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                  {state.activeProjectId
                    ? `Case Study for ${
                        state.projects.find((project) => project.id === state.activeProjectId)?.name ||
                        "Project"
                      }`
                    : "Case Study"}
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => requireAuth(openKnowYourDesign, authReason)}
                  disabled={!canOpenProjectModals}
                  title={
                    canOpenProjectModals ? "" : "Select a project with pages first"
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    canOpenProjectModals
                      ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                      : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={faCircleQuestion} className="text-[10px]" />
                  Know Your Project
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {canvasContextMenu ? (
        <div
          className="fixed z-50 w-40 rounded-xl border border-gray-200 bg-white p-2 text-xs shadow-lg dark:border-gray-800 dark:bg-gray-950"
          style={{
            left:
              typeof window === "undefined"
                ? canvasContextMenu.x
                : Math.min(canvasContextMenu.x, window.innerWidth - 180),
            top:
              typeof window === "undefined"
                ? canvasContextMenu.y
                : Math.min(canvasContextMenu.y, window.innerHeight - 140),
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (state.activeProjectId) {
                closeActiveProject();
              }
              setCanvasContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            {state.activeProjectId ? "Save & Close" : "Close"}
          </button>
          <button
            type="button"
            onClick={() => {
              updateZoom(0.1);
              setCanvasContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Zoom In
          </button>
          <button
            type="button"
            onClick={() => {
              updateZoom(-0.1);
              setCanvasContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Zoom Out
          </button>
        </div>
      ) : null}

      {isFullView && pageContextMenu ? (
        <div
          className="fixed z-50 w-40 rounded-xl border border-gray-200 bg-white p-2 text-xs shadow-lg dark:border-gray-800 dark:bg-gray-950"
          style={{
            left:
              typeof window === "undefined"
                ? pageContextMenu.x
                : Math.min(pageContextMenu.x, window.innerWidth - 180),
            top:
              typeof window === "undefined"
                ? pageContextMenu.y
                : Math.min(pageContextMenu.y, window.innerHeight - 140),
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() => {
              duplicatePage(pageContextMenu.id);
              setPageContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Duplicate Page
          </button>
          <button
            type="button"
            onClick={() => {
              deletePage(pageContextMenu.id);
              setEditingElementId(null);
              setRenamingPageId(null);
              setPageContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Delete Page
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium dark:border-gray-800 dark:bg-gray-950">
          <FontAwesomeIcon icon={faExpand} className="text-[10px]" />
          Drag empty space to pan. Scroll to zoom
        </span>
      </div>

    </section>
  );
}


const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const createClipboard = (element: CanvasElement) => ({ ...element });
