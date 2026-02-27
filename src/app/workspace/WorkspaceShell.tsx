"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChevronDown,
  faChevronRight,
  faGlobe,
  faMobileScreen,
  faPlus,
  faRotateLeft,
  faRotateRight,
  faArrowUpFromBracket,
  faGear,
  faEllipsisVertical,
  faFolder,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faFileLines, faUserCircle } from "@fortawesome/free-regular-svg-icons";
import { useWorkspace } from "./workspace-context";
import ConfirmModal from "./ConfirmModal";
import { useAuth } from "@/components/auth/AuthProvider";

export default function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    state,
    view,
    ui,
    setPlatform,
    setViewMode,
    addProject,
    renameProject,
    setActiveProject,
    deleteProject,
    setActivePage,
    addPage,
    renamePage,
    duplicatePage,
    deletePage,
    openSettings,
    openExport,
    undo,
    redo,
  } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameProjectValue, setRenameProjectValue] = useState("");
  const [pendingProjectRename, setPendingProjectRename] = useState(false);
  const [projectContextMenu, setProjectContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(state.projects.map((project) => [project.id, true]))
  );
  const [confirmTarget, setConfirmTarget] = useState<{
    type: "project" | "page";
    id: string;
  } | null>(null);
  const prevProjectIdsRef = useRef<string[]>(state.projects.map((project) => project.id));
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const { requireAuth } = useAuth();
  const authReason = "Create an account to continue.";


  const pagesByProject = useMemo(() => {
    const map = new Map<string, typeof state.pages>();
    state.projects.forEach((project) => {
      map.set(
        project.id,
        state.pages.filter((page) => page.projectId === project.id)
      );
    });
    return map;
  }, [state.projects, state.pages]);

  useEffect(() => {
    const currentIds = state.projects.map((project) => project.id);
    const prevIds = prevProjectIdsRef.current;
    const addedId = currentIds.find((id) => !prevIds.includes(id));
    if (addedId && pendingProjectRename) {
      setRenamingProjectId(addedId);
      const project = state.projects.find((item) => item.id === addedId);
      setRenameProjectValue(project?.name ?? "");
      setPendingProjectRename(false);
    }
    prevProjectIdsRef.current = currentIds;
  }, [state.projects, pendingProjectRename]);

  useEffect(() => {
    setExpandedProjects((prev) => {
      const next: Record<string, boolean> = {};
      state.projects.forEach((project) => {
        next[project.id] = prev[project.id] ?? true;
      });
      return next;
    });
  }, [state.projects]);

  useEffect(() => {
    const activePage = state.pages.find((page) => page.id === state.activePageId);
    const projectId = activePage?.projectId;
    if (!projectId) return;
    setExpandedProjects((prev) =>
      prev[projectId] ? prev : { ...prev, [projectId]: true }
    );
  }, [state.activePageId, state.pages]);

  useEffect(() => {
    if (!projectContextMenu) return;
    const handleClick = () => setProjectContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProjectContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [projectContextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", handleClose);
    document.addEventListener("contextmenu", handleClose);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("contextmenu", handleClose);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (view.viewMode === "full") {
      setSidebarOpen(false);
    }
  }, [view.viewMode]);

  const handleAddProject = () => {
    requireAuth(
      () => {
        setPendingProjectRename(true);
        addProject("Untitled Project");
      },
      "Create an account to continue."
    );
  };

  const commitRenameProject = () => {
    if (!renamingProjectId) return;
    const next = renameProjectValue.trim() || "Untitled Project";
    renameProject(renamingProjectId, next);
    setRenamingProjectId(null);
    setRenameProjectValue("");
  };

  const cancelRenameProject = () => {
    setRenamingProjectId(null);
    setRenameProjectValue("");
  };

  const startRename = (id: string, name: string) => {
    setRenamingPageId(id);
    setRenameValue(name);
  };

  const commitRename = () => {
    if (!renamingPageId) return;
    const next = renameValue.trim();
    if (next) {
      renamePage(renamingPageId, next);
    }
    setRenamingPageId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingPageId(null);
    setRenameValue("");
  };

  const handleContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    event.preventDefault();
    setContextMenu({ id, x: event.clientX, y: event.clientY });
  };

  const handleDelete = (id: string) => {
    if (state.pages.length === 1) return;
    setConfirmTarget({ type: "page", id });
  };

  const toggleProjectExpanded = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeProject = useMemo(
    () => state.projects.find((project) => project.id === state.activeProjectId),
    [state.projects, state.activeProjectId]
  );
  const activePage = useMemo(
    () => state.pages.find((page) => page.id === state.activePageId),
    [state.pages, state.activePageId]
  );
  const isCanvasEmpty = !activePage || activePage.elements.length === 0;

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
          Framebase
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            Beta
          </span>
          {onClose ? (
            <button
              type="button"
              className="rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300"
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Platform
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-2 dark:bg-gray-950/40">
            <button
              type="button"
              onClick={() => setPlatform("web")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                state.platform === "web"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
              aria-pressed={state.platform === "web"}
            >
              <FontAwesomeIcon icon={faGlobe} className="text-sm" />
              Web
            </button>
            <button
              type="button"
              onClick={() => setPlatform("mobile")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                state.platform === "mobile"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
              aria-pressed={state.platform === "mobile"}
            >
              <FontAwesomeIcon icon={faMobileScreen} className="text-sm" />
              Mobile
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Projects
            </p>
            <button
              type="button"
              onClick={handleAddProject}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              Add
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {state.projects.map((project) => {
              const projectPages = pagesByProject.get(project.id) ?? [];
              const hasActivePage = projectPages.some(
                (page) => page.id === state.activePageId
              );
              const isActive = project.id === state.activeProjectId || hasActivePage;
              const isRenaming = renamingProjectId === project.id;
              const isExpanded = expandedProjects[project.id] ?? true;
              const childCount = projectPages.length ? projectPages.length : 1;
              const maxHeight = isExpanded ? `${childCount * 44}px` : "0px";
              return (
                <div key={project.id} className="relative">
                  {isRenaming ? (
                    <input
                      value={renameProjectValue}
                      onChange={(event) => setRenameProjectValue(event.target.value)}
                      onBlur={commitRenameProject}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitRenameProject();
                        }
                        if (event.key === "Escape") {
                          cancelRenameProject();
                        }
                      }}
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-indigo-500/40 dark:bg-gray-950 dark:text-gray-100"
                      autoFocus
                    />
                  ) : (
                    <div className="space-y-2">
                      <div
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setProjectContextMenu({
                            id: project.id,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                            : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-800 dark:hover:bg-gray-950/40 dark:hover:text-gray-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleProjectExpanded(project.id)}
                          onDoubleClick={() => {
                            setRenamingProjectId(project.id);
                            setRenameProjectValue(project.name);
                          }}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            className={`text-xs transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : "rotate-0"
                            }`}
                          />
                          <FontAwesomeIcon
                            icon={faFolder}
                            className={`text-xs ${
                              isActive
                                ? "text-indigo-500 dark:text-indigo-300"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          />
                          <span className="truncate">{project.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setProjectContextMenu({
                              id: project.id,
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                          className="text-xs text-gray-300 transition hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                          aria-label="Project options"
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>
                      </div>
                      <div
                        className={`pl-8 pr-2 overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-in-out ${
                          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                        }`}
                        style={{ maxHeight }}
                      >
                        <div className="space-y-2 pt-2">
                          {projectPages.length ? (
                            projectPages.map((page) => {
                              const isPageActive = page.id === state.activePageId;
                              const isRenaming = renamingPageId === page.id;
                              return (
                                <div key={page.id} className="relative">
                                  {isRenaming ? (
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
                                      className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-indigo-500/40 dark:bg-gray-950 dark:text-gray-100"
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveProject(project.id);
                                        setActivePage(page.id);
                                        onClose?.();
                                      }}
                                      onContextMenu={(event) =>
                                        handleContextMenu(event, page.id)
                                      }
                                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                        isPageActive
                                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                                          : "border-transparent text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-800 dark:hover:bg-gray-950/40 dark:hover:text-gray-100"
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <FontAwesomeIcon
                                          icon={faFileLines}
                                          className={`text-xs ${
                                            isPageActive
                                              ? "text-indigo-500 dark:text-indigo-300"
                                              : "text-gray-400 dark:text-gray-500"
                                          }`}
                                        />
                                        {page.name}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-semibold text-gray-400 dark:border-gray-800 dark:text-gray-500">
                              No pages yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="mt-auto space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={openSettings}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-950/40 dark:hover:text-gray-100"
        >
          <FontAwesomeIcon icon={faGear} className="text-sm text-gray-400" />
          Settings
        </button>
        <button
          type="button"
          onClick={openSettings}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-950/40 dark:hover:text-gray-100"
        >
          <FontAwesomeIcon
            icon={faUserCircle}
            className="text-sm text-gray-400"
          />
          Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex min-h-screen">
        {view.viewMode === "full" ? null : (
          <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white/90 p-5 dark:border-gray-800 dark:bg-gray-900/90 lg:flex">
            <SidebarContent />
          </aside>
        )}

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-gray-950/50"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              />
              <motion.aside
                className="relative z-10 h-full w-64 border-r border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarContent onClose={() => setSidebarOpen(false)} />
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                disabled={view.viewMode === "full"}
              >
                <FontAwesomeIcon icon={faBars} className="text-sm" />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Framebase Workspace
                </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Design system -{" "}
                {activeProject?.name ?? "No Project Selected"}
              </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 md:inline-flex"
                onClick={undo}
              >
                <FontAwesomeIcon icon={faRotateLeft} className="text-sm" />
              </button>
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 md:inline-flex"
                onClick={redo}
              >
                <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
              </button>
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setViewOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                >
                  View
                  <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                </button>
                {viewOpen ? (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("split");
                        setViewOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        view.viewMode === "split"
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900/60"
                      }`}
                    >
                      Workspace view
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("full");
                        setViewOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        view.viewMode === "full"
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900/60"
                      }`}
                    >
                      Full canvas
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  isCanvasEmpty
                    ? "cursor-not-allowed bg-indigo-600/60"
                    : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                }`}
                onClick={() => requireAuth(openExport, authReason)}
                disabled={isCanvasEmpty}
              >
                <FontAwesomeIcon
                  icon={faArrowUpFromBracket}
                  className="text-sm"
                />
                Export
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 md:flex"
                aria-label="Open settings"
              >
                <FontAwesomeIcon icon={faUserCircle} className="text-lg" />
              </button>
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      {projectContextMenu ? (
        <div
          className="fixed z-60 w-40 rounded-xl border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950"
          style={{
            left:
              typeof window === "undefined"
                ? projectContextMenu.x
                : Math.min(projectContextMenu.x, window.innerWidth - 180),
            top:
              typeof window === "undefined"
                ? projectContextMenu.y
                : Math.min(projectContextMenu.y, window.innerHeight - 180),
          }}
        >
          <button
            type="button"
            onClick={() => {
              requireAuth(
                () => addPage("Untitled Page", projectContextMenu.id),
                authReason
              );
              setProjectContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Add Page
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmTarget({ type: "project", id: projectContextMenu.id });
              setProjectContextMenu(null);
            }}
            className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Delete Project
          </button>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed z-60 w-40 rounded-xl border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950"
          style={{
            left:
              typeof window === "undefined"
                ? contextMenu.x
                : Math.min(contextMenu.x, window.innerWidth - 180),
            top:
              typeof window === "undefined"
                ? contextMenu.y
                : Math.min(contextMenu.y, window.innerHeight - 180),
          }}
        >
          <button
            type="button"
            onClick={() => {
              const page = state.pages.find((item) => item.id === contextMenu.id);
              if (page) startRename(page.id, page.name);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              duplicatePage(contextMenu.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/60"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              handleDelete(contextMenu.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      ) : null}

      {confirmTarget ? (
        <ConfirmModal
          title={confirmTarget.type === "project" ? "Delete Project?" : "Delete Page?"}
          message={
            confirmTarget.type === "project"
              ? "This will permanently delete this project and all its pages. This action cannot be undone."
              : "This page will be permanently deleted. This action cannot be undone."
          }
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            if (confirmTarget.type === "project") {
              deleteProject(confirmTarget.id);
            } else {
              deletePage(confirmTarget.id);
            }
            setConfirmTarget(null);
          }}
        />
      ) : null}

      {ui.caseStudyToast ? (
        <div
          className={`pointer-events-none fixed bottom-6 right-6 z-70 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-500/10 backdrop-blur transition-all duration-300 dark:border-emerald-500/30 dark:bg-gray-900/90 dark:text-emerald-200 ${
            ui.caseStudyToast.visible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0"
          }`}
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          <span>{ui.caseStudyToast.message}</span>
        </div>
      ) : null}

    </div>
  );
}
