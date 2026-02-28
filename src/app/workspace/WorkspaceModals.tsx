"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faArrowUpFromBracket,
  faCopy,
  faCircleQuestion,
  faFileLines,
  faSliders,
  faCode,
  faChevronLeft,
  faChevronRight,
  faArrowDown,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "@/components/ThemeToggle";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  useWorkspace,
  type CaseStudySlide,
  type CanvasElement,
  type WorkspacePageData,
  type Platform,
} from "./workspace-context";

const PURPOSE_MAP: Record<string, string> = {
  navbar: "Brand anchor and navigation entry point.",
  hero: "Primary value proposition and initial conversion cue.",
  features: "Scannable product highlights and capability proof.",
  pricing: "Plan comparison and conversion decision support.",
  form: "Collect intent and capture next-step data.",
  cta: "Reinforce next action and increase intent.",
  footer: "Secondary navigation and trust baseline.",
  section: "Flexible content block for supporting information.",
};

type ExportMode = "full" | "selected";
type ExportStep = "mode" | "project" | "pages" | "format" | "confirm";
type ExportType = "html-css" | "combined" | "zip" | "pptx" | "pdf";

type ExportToast = { message: string; visible: boolean } | null;

const EXPORT_TYPES: Array<{
  id: ExportType;
  label: string;
  description: string;
  supported: boolean;
}> = [
  {
    id: "html-css",
    label: "HTML + CSS (separated)",
    description: "Generates HTML files plus a shared styles.css file.",
    supported: true,
  },
  {
    id: "combined",
    label: "Combined HTML",
    description: "Each HTML file includes its own embedded CSS.",
    supported: true,
  },
  {
    id: "zip",
    label: "ZIP package",
    description: "Bundles HTML, CSS, and assets into a ZIP.",
    supported: true,
  },
  {
    id: "pptx",
    label: "PPTX",
    description: "Export slides as a presentation.",
    supported: false,
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Export pages as a PDF document.",
    supported: false,
  },
];

const toFileName = (value: string, fallback: string) => {
  const cleaned = value.trim().replace(/[^a-z0-9]+/gi, "_");
  const normalized = cleaned.replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

const getFrameWidth = (platform: Platform) => (platform === "web" ? 1200 : 428);
const getMinFrameHeight = (platform: Platform) => (platform === "web" ? 640 : 720);

const getAbsoluteRect = (
  element: CanvasElement,
  map: Map<string, CanvasElement>
) => {
  let x = element.x;
  let y = element.y;
  let parentId = element.parentId ?? null;
  while (parentId) {
    const parent = map.get(parentId);
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    parentId = parent.parentId ?? null;
  }
  return { x, y, width: element.width, height: element.height };
};

const getPageHeight = (page: WorkspacePageData, platform: Platform) => {
  if (!page.elements.length) return getMinFrameHeight(platform);
  const map = new Map(page.elements.map((el) => [el.id, el]));
  return page.elements.reduce((max, element) => {
    const rect = getAbsoluteRect(element, map);
    return Math.max(max, rect.y + rect.height);
  }, getMinFrameHeight(platform));
};

export default function WorkspaceModals() {
  const {
    state,
    ui,
    closeExport,
    closeKnowYourDesign,
    closePromptGenerator,
    closeSettings,
    closePlatformLock,
    generateMvpPrompt,
    generateProjectAnalysis,
    generateProjectCode,
    closeProjectCode,
    downloadCaseStudyPpt,
    closeCaseStudyPreview,
    generateCaseStudyPpt,
  } = useWorkspace();
  const router = useRouter();
  const [exportMode, setExportMode] = useState<ExportMode | null>(null);
  const [exportStep, setExportStep] = useState<ExportStep>("mode");
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);
  const [exportPageIds, setExportPageIds] = useState<Set<string>>(new Set());
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportToast, setExportToast] = useState<ExportToast>(null);
  const exportToastTimersRef = useRef<number[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [codeCopyStatus, setCodeCopyStatus] = useState("");
  const [pageCopyStatus, setPageCopyStatus] = useState("");
  const [codeTab, setCodeTab] = useState<"html" | "css" | "combined">("html");
  const [caseStudyIndex, setCaseStudyIndex] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [settingsAvatarFile, setSettingsAvatarFile] = useState<File | null>(null);
  const [settingsAvatarPreview, setSettingsAvatarPreview] = useState("");
  const [settingsProfile, setSettingsProfile] = useState({
    fullName: "",
    username: "",
    email: "",
    avatarUrl: "",
    platformPreference: "",
  });
  const [settingsInitial, setSettingsInitial] = useState({
    fullName: "",
    username: "",
    email: "",
    avatarUrl: "",
    platformPreference: "",
  });

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
  const projectScopeAvailable = Boolean(state.activeProjectId && projectPages.length);
  const projectPrompt = useMemo(
    () =>
      projectScopeAvailable && state.activeProjectId
        ? generateMvpPrompt(state.activeProjectId)
        : "",
    [state.activeProjectId, projectScopeAvailable, generateMvpPrompt]
  );
  const projectAnalysis = useMemo(
    () =>
      projectScopeAvailable && state.activeProjectId
        ? generateProjectAnalysis(state.activeProjectId)
        : "",
    [state.activeProjectId, projectScopeAvailable, generateProjectAnalysis]
  );
  const promptScopeProject =
    ui.promptGeneratorScope === "project" && projectScopeAvailable;
  const knowScopeProject =
    ui.knowYourDesignScope === "project" && projectScopeAvailable;
  const resolvedPrompt = promptScopeProject
    ? projectPrompt
    : activePage?.mvpPrompt;
  const projectCodeData = useMemo(
    () =>
      projectScopeAvailable && state.activeProjectId
        ? generateProjectCode(state.activeProjectId)
        : null,
    [state.activeProjectId, projectScopeAvailable, generateProjectCode]
  );
  const projectCodePages = projectCodeData?.pages ?? [];
  const codeProjectName = useMemo(() => {
    if (!projectScopeAvailable || !state.activeProjectId) return "Project";
    const project = state.projects.find((item) => item.id === state.activeProjectId);
    return project?.name?.trim() || "Untitled Project";
  }, [state.activeProjectId, state.projects, projectScopeAvailable]);
  const htmlAll = projectCodePages
    .map((page) => `<!-- ${page.name} HTML -->\n${page.html}`)
    .join("\n\n");
  const combinedAll = projectCodePages
    .map((page) => `<!-- ${page.name} Combined -->\n${page.combined}`)
    .join("\n\n");
  const exportProjects = state.projects;
  const hasMultipleProjects = exportProjects.length > 1;
  const exportProject = exportProjectId
    ? exportProjects.find((project) => project.id === exportProjectId)
    : null;
  const exportProjectPages = exportProjectId
    ? state.pages.filter((page) => page.projectId === exportProjectId)
    : [];
  const exportPageCount = exportProjectPages.length;
  const anyModalOpen =
    ui.exportOpen ||
    ui.knowYourDesignOpen ||
    ui.promptGeneratorOpen ||
    ui.projectCodeOpen ||
    ui.caseStudyOpen ||
    ui.settingsOpen;

  useEffect(() => {
    if (!ui.settingsOpen) return;
    let active = true;
    setSettingsLoading(true);
    setSettingsErrors([]);
    const loadProfile = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw new Error("Unable to load your session.");
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError) {
        throw new Error(profileError.message || "Failed to load profile.");
      }
      if (!active) return;
      const metadata = (data.user.user_metadata || {}) as Record<string, string>;
      const next = {
        fullName: profile?.full_name ?? metadata.full_name ?? "",
        username: profile?.username ?? metadata.username ?? "",
        email: profile?.email ?? data.user.email ?? "",
        avatarUrl: profile?.avatar_url ?? metadata.avatar_url ?? "",
        platformPreference: profile?.platform_preference ?? "",
      };
      setSettingsProfile(next);
      setSettingsInitial(next);
      setSettingsAvatarPreview(next.avatarUrl);
      setSettingsAvatarFile(null);
    };
    loadProfile()
      .catch((error) => {
        if (!active) return;
        setSettingsErrors([
          error instanceof Error ? error.message : "Failed to load profile.",
        ]);
      })
      .finally(() => {
        if (!active) return;
        setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ui.settingsOpen]);

  useEffect(() => {
    if (!settingsAvatarFile) return;
    const previewUrl = URL.createObjectURL(settingsAvatarFile);
    setSettingsAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [settingsAvatarFile]);

  const settingsHasChanges =
    settingsProfile.fullName.trim() !== settingsInitial.fullName ||
    settingsProfile.username.trim() !== settingsInitial.username ||
    settingsProfile.avatarUrl.trim() !== settingsInitial.avatarUrl ||
    Boolean(settingsAvatarFile);

  const handleSettingsSave = async () => {
    if (!settingsHasChanges) return;
    try {
      setSettingsSaving(true);
      const supabase = getSupabaseClient();
      let nextAvatarUrl = settingsProfile.avatarUrl.trim();
      const { data } = await supabase.auth.getUser();
      if (settingsAvatarFile && data.user) {
        const fileExt = settingsAvatarFile.name.split(".").pop() || "png";
        const fileName = `${data.user.id}-${Date.now()}.${fileExt}`;
        const upload = await supabase.storage
          .from("avatars")
          .upload(fileName, settingsAvatarFile, { upsert: true });
        if (upload.error) {
          throw new Error(upload.error.message || "Avatar upload failed.");
        }
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        nextAvatarUrl = urlData.publicUrl;
      }
      const payload: Record<string, string> = {};
      if (settingsProfile.fullName.trim() !== settingsInitial.fullName) {
        payload.full_name = settingsProfile.fullName.trim();
      }
      if (settingsProfile.username.trim() !== settingsInitial.username) {
        payload.username = settingsProfile.username.trim();
      }
      if (nextAvatarUrl && nextAvatarUrl !== settingsInitial.avatarUrl) {
        payload.avatar_url = nextAvatarUrl;
      }
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Profile update failed.");
      }
      const profile = result?.data?.profile || {};
      const next = {
        fullName: profile.full_name ?? settingsProfile.fullName,
        username: profile.username ?? settingsProfile.username,
        email: profile.email ?? settingsProfile.email,
        avatarUrl: profile.avatar_url ?? nextAvatarUrl ?? settingsProfile.avatarUrl,
        platformPreference:
          profile.platform_preference ?? settingsProfile.platformPreference,
      };
      setSettingsProfile(next);
      setSettingsInitial(next);
      setSettingsAvatarPreview(next.avatarUrl);
      setSettingsAvatarFile(null);
      setSettingsErrors([]);
    } catch (error) {
      setSettingsErrors([
        error instanceof Error ? error.message : "Profile update failed.",
      ]);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!resolvedPrompt) return;
    try {
      await navigator.clipboard.writeText(resolvedPrompt);
      setCopyStatus("Copied to clipboard");
      window.setTimeout(() => setCopyStatus(""), 1200);
    } catch {
      setCopyStatus("Copy failed. Try again.");
    }
  };

  const handleCopyProjectCode = async () => {
    const payload =
      codeTab === "css"
        ? projectCodeData?.css
        : codeTab === "combined"
        ? combinedAll
        : htmlAll;
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCodeCopyStatus("Copied to clipboard");
      window.setTimeout(() => setCodeCopyStatus(""), 1200);
    } catch {
      setCodeCopyStatus("Copy failed. Try again.");
    }
  };

  const handleCopyPageCode = async (key: string, payload: string) => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setPageCopyStatus(key);
      window.setTimeout(() => setPageCopyStatus(""), 1200);
    } catch {
      setPageCopyStatus("");
    }
  };

  const showExportToast = (message: string) => {
    exportToastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    exportToastTimersRef.current = [];
    setExportToast({ message, visible: true });
    exportToastTimersRef.current.push(
      window.setTimeout(() => {
        setExportToast((prev) => (prev ? { ...prev, visible: false } : prev));
      }, 2500)
    );
    exportToastTimersRef.current.push(
      window.setTimeout(() => {
        setExportToast(null);
      }, 3000)
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const buildZip = async (params: {
    pages: Array<{ name: string; html: string; combined: string }>;
    css?: string;
    includeCss: boolean;
    combined: boolean;
    includeIndex: boolean;
    fileName: string;
    includeAssets: boolean;
  }) => {
    const { pages, css, includeCss, combined, includeIndex, fileName, includeAssets } = params;
    const zip = new JSZip();
    if (includeCss && css) {
      zip.file("styles.css", css);
    }
    if (includeAssets) {
      zip.folder("assets");
    }
    pages.forEach((page, index) => {
      const baseName = toFileName(page.name, `page_${index + 1}`);
      const file = includeIndex && index === 0 ? "index.html" : `${baseName}.html`;
      zip.file(file, combined ? page.combined : page.html);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, fileName);
  };

  const resetExportState = () => {
    const defaultProjectId = state.activeProjectId ?? exportProjects[0]?.id ?? null;
    setExportMode(null);
    setExportStep("mode");
    setExportProjectId(defaultProjectId);
    setExportPageIds(new Set());
    setExportType(null);
    setExportBusy(false);
  };

  const handleSelectExportMode = (mode: ExportMode) => {
    setExportMode(mode);
    setExportType(null);
    if (mode === "full") {
      if (!exportProjectId) {
        setExportProjectId(state.activeProjectId ?? exportProjects[0]?.id ?? null);
      }
      if (hasMultipleProjects) {
        setExportStep("project");
      } else {
        setExportStep("format");
      }
    } else {
      setExportProjectId(state.activeProjectId ?? null);
      setExportStep("pages");
    }
  };

  const toggleExportPage = (id: string) => {
    setExportPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllExportPages = () => {
    setExportPageIds(new Set(exportProjectPages.map((page) => page.id)));
  };

  const clearExportPages = () => {
    setExportPageIds(new Set());
  };

  const handleExportAction = async () => {
    if (!exportMode || !exportType || exportBusy) return;
    const selectedExport = EXPORT_TYPES.find((type) => type.id === exportType);
    if (!selectedExport || !selectedExport.supported) return;
    const projectId = exportProjectId;
    if (!projectId) return;
    const projectName = exportProject?.name?.trim() || "Untitled Project";
    const generated = generateProjectCode(projectId);
    const pages =
      exportMode === "selected"
        ? generated.pages.filter((page) => exportPageIds.has(page.id))
        : generated.pages;
    if (!pages.length) return;
    const sourcePages =
      exportMode === "selected"
        ? exportProjectPages.filter((page) => exportPageIds.has(page.id))
        : exportProjectPages;
    const hasAssets = sourcePages.some((page) =>
      page.elements.some((el) => el.type === "image" && !el.isGhost && el.type !== "background")
    );
    const baseName = toFileName(projectName, "Project");
    const suffix = exportMode === "full" ? "Full_Project" : "Selected_Pages";
    setExportBusy(true);
    try {
      if (exportType === "combined") {
        if (pages.length === 1) {
          const fileName = `${baseName}_${suffix}.html`;
          downloadBlob(new Blob([pages[0].combined], { type: "text/html" }), fileName);
        } else {
          const fileName = `${baseName}_${suffix}_Combined.zip`;
          await buildZip({
            pages,
            combined: true,
            includeCss: false,
            includeIndex: exportMode === "full",
            fileName,
            includeAssets: hasAssets,
          });
        }
      } else if (exportType === "html-css") {
        const fileName = `${baseName}_${suffix}_HTML_CSS.zip`;
        await buildZip({
          pages,
          css: generated.css,
          combined: false,
          includeCss: true,
          includeIndex: exportMode === "full",
          fileName,
          includeAssets: hasAssets,
        });
      } else if (exportType === "zip") {
        const fileName = `${baseName}_${suffix}.zip`;
        await buildZip({
          pages,
          css: generated.css,
          combined: false,
          includeCss: true,
          includeIndex: exportMode === "full",
          fileName,
          includeAssets: hasAssets,
        });
      }
      showExportToast(
        exportMode === "full"
          ? "Full project exported successfully."
          : "Selected pages exported successfully."
      );
      closeExport();
    } finally {
      setExportBusy(false);
    }
  };

  useEffect(() => {
    if (!anyModalOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [anyModalOpen]);

  useEffect(() => {
    if (ui.exportOpen) {
      resetExportState();
    }
  }, [ui.exportOpen, state.activeProjectId, exportProjects]);

  useEffect(() => {
    if (ui.caseStudyOpen) {
      setCaseStudyIndex(0);
    }
  }, [ui.caseStudyOpen]);

  const caseStudySlides = ui.caseStudySlides ?? [];
  const activeCaseStudySlide = caseStudySlides[caseStudyIndex];
  const selectedExportPages = exportProjectPages.filter((page) =>
    exportPageIds.has(page.id)
  );
  const exportPreviewPage = exportProjectPages[0];
  const exportTypeConfig = exportType
    ? EXPORT_TYPES.find((item) => item.id === exportType)
    : null;

  return (
    <>
      <Modal
        open={ui.exportOpen}
        onClose={closeExport}
        title="Export Project"
        icon={faArrowUpFromBracket}
        className="max-w-5xl"
      >
        <div className="space-y-6">
          {exportStep === "mode" ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose how you want to export your work. You can export an entire
                project or select specific pages.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSelectExportMode("full")}
                  className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                >
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Export as Full Project
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Bundle all pages, shared styles, and assets for one project.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectExportMode("selected")}
                  disabled={!projectScopeAvailable}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                    projectScopeAvailable
                      ? "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                      : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40"
                  }`}
                >
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Export Selected Page
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Pick specific pages from the active project to export.
                  </p>
                  {!projectScopeAvailable ? (
                    <p className="mt-3 text-xs font-semibold text-gray-400">
                      Select a project with pages first.
                    </p>
                  ) : null}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeExport}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}

          {exportStep === "project" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Select a project to export
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Choose one project. The first page preview is shown for reference.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {exportProjects.map((project) => {
                  const pages = state.pages.filter(
                    (page) => page.projectId === project.id
                  );
                  const firstPage = pages[0];
                  const isSelected = exportProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setExportProjectId(project.id)}
                      className={`flex gap-4 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                          : "border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-950"
                      }`}
                    >
                      <PageThumbnail page={firstPage} platform={state.platform} />
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {project.name || "Untitled Project"}
                          </h4>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Platform: {state.platform === "mobile" ? "Mobile" : "Web"}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {pages.length} page{pages.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExportStep("mode")}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setExportStep("format")}
                  disabled={!exportProjectId || exportPageCount === 0}
                  className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    exportProjectId && exportPageCount > 0
                      ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      : "cursor-not-allowed bg-indigo-600/60"
                  }`}
                >
                  Continue
                </button>
              </div>
            </>
          ) : null}

      {exportStep === "pages" ? (
        <>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Select pages to export
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Choose one or more pages from the active project.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllExportPages}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearExportPages}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {exportProjectPages.length ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {exportProjectPages.map((page) => {
                    const isSelected = exportPageIds.has(page.id);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => toggleExportPage(page.id)}
                        className={`relative rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                            : "border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-950"
                        }`}
                      >
                        <div className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {isSelected ? "✓" : ""}
                        </div>
                        <PageThumbnail page={page} platform={state.platform} />
                        <p className="mt-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {page.name || "Untitled Page"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  No pages available. Select a project with pages first.
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExportStep("mode")}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setExportStep("format")}
                  disabled={exportPageIds.size === 0}
                  className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    exportPageIds.size > 0
                      ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      : "cursor-not-allowed bg-indigo-600/60"
                  }`}
                >
                  Continue
                </button>
              </div>
            </>
          ) : null}

          {exportStep === "format" ? (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Select export format
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Choose the output type for your export.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {EXPORT_TYPES.map((format) => {
                  const isSelected = exportType === format.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => format.supported && setExportType(format.id)}
                      disabled={!format.supported}
                      className={`rounded-2xl border p-4 text-left transition ${
                        format.supported
                          ? isSelected
                            ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                            : "border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-950"
                          : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {format.label}
                        </h4>
                        {!format.supported ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Coming soon
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {format.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setExportStep(exportMode === "selected" ? "pages" : "project")
                  }
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setExportStep("confirm")}
                  disabled={
                    !exportTypeConfig ||
                    !exportTypeConfig.supported ||
                    (exportMode === "full" && exportPageCount === 0)
                  }
                  className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    exportTypeConfig &&
                    exportTypeConfig.supported &&
                    !(exportMode === "full" && exportPageCount === 0)
                      ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      : "cursor-not-allowed bg-indigo-600/60"
                  }`}
                >
                  Continue
                </button>
              </div>
            </>
          ) : null}

          {exportStep === "confirm" ? (
            <>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Confirm export
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Review your selections before exporting.
                </p>
              </div>

              {exportMode === "full" ? (
                <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
                  <PageThumbnail page={exportPreviewPage} platform={state.platform} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Project
                    </p>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {exportProject?.name || "Untitled Project"}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {exportPageCount} page{exportPageCount === 1 ? "" : "s"} •{" "}
                      {exportTypeConfig?.label}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Selected pages ({selectedExportPages.length})
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {selectedExportPages.map((page) => (
                      <div
                        key={page.id}
                        className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
                      >
                        <PageThumbnail page={page} platform={state.platform} />
                        <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {page.name || "Untitled Page"}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Export format: {exportTypeConfig?.label}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExportStep("format")}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeExport}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAction}
                    disabled={exportBusy}
                    className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                      exportBusy
                        ? "cursor-not-allowed bg-indigo-600/60"
                        : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    }`}
                  >
                    {exportBusy ? "Exporting..." : "Export"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={ui.knowYourDesignOpen}
        onClose={closeKnowYourDesign}
        title={knowScopeProject ? "Know Your Project" : "Know Your Design"}
        icon={faCircleQuestion}
      >
        {knowScopeProject ? (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="whitespace-pre-line rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
              {projectAnalysis || "Select a project with pages to generate a summary."}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Project Pages
              </p>
              <div className="mt-2 space-y-2">
                {projectPages.map((page) => (
                  <div
                    key={page.id}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {page.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {page.prompt ? "Has prompt context" : "No prompt yet"}
                    </div>
                  </div>
                ))}
                {!projectPages.length ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No pages yet. Add pages to generate a project summary.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            {activePage?.explanation ? (
              <div className="whitespace-pre-line rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                {activePage.explanation}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                Run a prompt to generate layout insights.
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Element Purpose
              </p>
              <div className="mt-2 space-y-2">
                {activePage?.elements.map((element) => (
                  <div
                    key={element.id}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {element.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {PURPOSE_MAP[element.type] || "Layout component."}
                    </div>
                  </div>
                ))}
                {!activePage?.elements.length ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No elements yet. Generate a layout to see details.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={ui.promptGeneratorOpen}
        onClose={closePromptGenerator}
        title={promptScopeProject ? "MVP Prompt (Project)" : "MVP Prompt Generator"}
        icon={faFileLines}
      >
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
          <p className="leading-relaxed">
            {resolvedPrompt ||
              (promptScopeProject
                ? "Select a project with pages to generate a project prompt."
                : "Run a prompt to generate a prompt block.")}
          </p>
        </div>

        {copyStatus ? (
          <div className="mt-3 text-xs font-semibold text-indigo-500">
            {copyStatus}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closePromptGenerator}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <FontAwesomeIcon icon={faCopy} className="text-sm" />
            Copy
          </button>
        </div>
      </Modal>

      <Modal
        open={ui.projectCodeOpen}
        onClose={closeProjectCode}
        title={`${codeProjectName} Code`}
        icon={faCode}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Starter HTML + CSS scaffold for your project.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([
            { id: "html", label: "HTML" },
            { id: "css", label: "CSS" },
            { id: "combined", label: "Combined" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCodeTab(tab.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                codeTab === tab.id
                  ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "border-gray-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {codeTab === "css" ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
            <div className="flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              <span>Global Styles</span>
              <button
                type="button"
                onClick={() =>
                  handleCopyPageCode("css", projectCodeData?.css ?? "")
                }
                className="rounded-full border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
              >
                {pageCopyStatus === "css" ? "Copied" : "Copy CSS"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono overflow-x-auto scroll-hidden">
              {projectCodeData?.css ||
                "Select a project with pages to generate code."}
            </pre>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {projectCodePages.length ? (
              projectCodePages.map((page) => {
                const payload =
                  codeTab === "combined" ? page.combined : page.html;
                const key = `${codeTab}:${page.id}`;
                return (
                  <div
                    key={page.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <div className="flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      <span>
                        {page.name} {codeTab === "combined" ? "Combined" : "HTML"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPageCode(key, payload)}
                        className="rounded-full border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                      >
                        {pageCopyStatus === key ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono overflow-x-auto scroll-hidden">
                      {payload}
                    </pre>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                Select a project with pages to generate code.
              </div>
            )}
          </div>
        )}

        {codeCopyStatus ? (
          <div className="mt-3 text-xs font-semibold text-indigo-500">
            {codeCopyStatus}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeProjectCode}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyProjectCode}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <FontAwesomeIcon icon={faCopy} className="text-sm" />
            Copy All
          </button>
        </div>
      </Modal>

      <CaseStudyModal
        open={ui.caseStudyOpen}
        projectName={ui.caseStudyProjectName}
        slideIndex={caseStudyIndex}
        slideCount={caseStudySlides.length}
        slide={activeCaseStudySlide}
        onClose={closeCaseStudyPreview}
        onDownload={downloadCaseStudyPpt}
        onPrev={() => setCaseStudyIndex((index) => Math.max(0, index - 1))}
        onNext={() =>
          setCaseStudyIndex((index) =>
            Math.min(Math.max(caseStudySlides.length - 1, 0), index + 1)
          )
        }
        onRegenerate={generateCaseStudyPpt}
        isGenerating={ui.caseStudyGenerating}
      />

      {exportToast ? (
        <div
          className={`pointer-events-none fixed bottom-6 right-6 z-70 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-500/10 backdrop-blur transition-all duration-300 dark:border-emerald-500/30 dark:bg-gray-900/90 dark:text-emerald-200 ${
            exportToast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          <span>{exportToast.message}</span>
        </div>
      ) : null}

      <Modal
        open={ui.settingsOpen}
        onClose={closeSettings}
        title="Workspace Preferences"
        icon={faSliders}
      >
        <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            Back to landing
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Account details
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update your workspace profile and avatar.
                </p>
              </div>
              {settingsSaving ? (
                <span className="text-xs font-semibold text-indigo-500">
                  Saving...
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  {settingsAvatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settingsAvatarPreview}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Profile picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setSettingsAvatarFile(event.target.files?.[0] || null)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                    disabled={settingsLoading}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Profile name
                  </label>
                  <input
                    value={settingsProfile.fullName}
                    onChange={(event) =>
                      setSettingsProfile((prev) => ({
                        ...prev,
                        fullName: event.target.value,
                      }))
                    }
                    placeholder="Your name"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                    disabled={settingsLoading}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Username
                  </label>
                  <input
                    value={settingsProfile.username}
                    onChange={(event) =>
                      setSettingsProfile((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Username"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                    disabled={settingsLoading}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Email
                </label>
                <input
                  value={settingsProfile.email}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 shadow-sm outline-none dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Platform preference
                </label>
                <input
                  value={settingsProfile.platformPreference}
                  readOnly
                  placeholder="Not set"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 shadow-sm outline-none dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
                />
              </div>

              {settingsErrors.length ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  <ul className="space-y-1">
                    {settingsErrors.map((error) => (
                      <li key={error}>- {error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSettingsSave}
                  disabled={settingsSaving || settingsLoading || !settingsHasChanges}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {settingsSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Theme
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Toggle light or dark mode.
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Workspace defaults
            </p>
            <ul className="mt-2 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <li>Remember last platform selection</li>
              <li>Persist canvas zoom and layout</li>
              <li>Keep accent styling consistent</li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        open={ui.platformLockOpen}
        onClose={closePlatformLock}
        title="Platform Locked"
        icon={faCircleQuestion}
        className="max-w-md"
      >
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Save and close the current project to change the platform.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closePlatformLock}
              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Modal({
  open,
  onClose,
  title,
  icon,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: any;
  className?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-70 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/40"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className={`scroll-hidden relative w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 max-h-[80vh] overflow-y-auto animate-fade-in ${
          className ?? "max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <FontAwesomeIcon icon={icon} className="text-sm" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Framebase workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function CaseStudyModal({
  open,
  projectName,
  slideIndex,
  slideCount,
  slide,
  onClose,
  onDownload,
  onPrev,
  onNext,
  onRegenerate,
  isGenerating,
}: {
  open: boolean;
  projectName: string;
  slideIndex: number;
  slideCount: number;
  slide?: CaseStudySlide;
  onClose: () => void;
  onDownload: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-80 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-gray-950/60 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative flex h-[90vh] w-[90vw] flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-950 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              {projectName || "Project"}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Case Study Preview
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div className="flex flex-1 items-center gap-4">
            <button
              type="button"
              onClick={onPrev}
              disabled={slideIndex <= 0}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-gray-500 transition ${
                slideIndex <= 0
                  ? "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-300 dark:border-gray-800/60 dark:bg-gray-900/40"
                  : "border-gray-200 bg-white hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="flex h-full flex-1 items-center justify-center">
              <div className="h-full w-full max-h-[68vh] max-w-[1200px] aspect-video">
                <div className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  {slide ? <CaseStudySlidePreview slide={slide} /> : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={slideIndex >= slideCount - 1}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-gray-500 transition ${
                slideIndex >= slideCount - 1
                  ? "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-300 dark:border-gray-800/60 dark:bg-gray-900/40"
                  : "border-gray-200 bg-white hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="text-center text-xs font-semibold text-gray-400">
            Slide {Math.min(slideIndex + 1, slideCount)} of {slideCount}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isGenerating
                ? "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40"
                : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            }`}
          >
            {isGenerating ? "Regenerating..." : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <FontAwesomeIcon icon={faArrowDown} />
            Download .pptx
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CaseStudySlidePreview({ slide }: { slide: CaseStudySlide }) {
  return (
    <div className="flex h-full w-full flex-col gap-6 rounded-2xl bg-gradient-to-br from-white to-indigo-50 px-8 py-6 text-gray-900">
      <div>
        <h4 className="text-2xl font-semibold">{slide.title}</h4>
        {slide.subtitle ? (
          <p className="mt-2 text-sm text-gray-500">{slide.subtitle}</p>
        ) : null}
      </div>

      {slide.template === "A" ? (
        <div className="grid flex-1 grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {slide.leftTitle || "Details"}
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              {(slide.left ?? []).slice(0, 6).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
              {slide.rightTitle || "Highlights"}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {(slide.right ?? []).slice(0, 6).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {slide.template === "B" ? (
        <div className="grid flex-1 grid-cols-2 gap-4">
          {(slide.bullets ?? [])
            .slice(0, 6)
            .map((item) => (
              <div key={item} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
        </div>
      ) : null}

      {slide.template === "C" ? (
        <div className="grid flex-1 grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {slide.leftTitle || "Left"}
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              {(slide.left ?? []).slice(0, 6).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {slide.rightTitle || "Right"}
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              {(slide.right ?? []).slice(0, 6).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {slide.template === "D" && slide.persona ? (
        <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <h5 className="text-lg font-semibold">{slide.persona.name}</h5>
            <p className="text-xs text-gray-500">{slide.persona.role}</p>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Goals:</span> {slide.persona.goals}
              </p>
              <p>
                <span className="font-semibold">Frustrations:</span>{" "}
                {slide.persona.frustrations}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Motivations
            </p>
            <p className="mt-3 text-sm text-gray-700">{slide.persona.motivations}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageThumbnail({
  page,
  platform,
}: {
  page?: WorkspacePageData;
  platform: Platform;
}) {
  const frameWidth = getFrameWidth(platform);
  const pageHeight = page ? getPageHeight(page, platform) : getMinFrameHeight(platform);
  const maxWidth = 160;
  const maxHeight = 120;
  const scale = Math.min(maxWidth / frameWidth, maxHeight / pageHeight);
  const innerWidth = Math.max(80, Math.round(frameWidth * scale));
  const innerHeight = Math.max(60, Math.round(pageHeight * scale));
  const thumbWidth = innerWidth + 10;
  const thumbHeight = innerHeight + 10;
  const elements = page
    ? page.elements.filter((el) => !el.isGhost && el.type !== "background")
    : [];
  const map = new Map(elements.map((el) => [el.id, el]));

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
      style={{ width: thumbWidth, height: thumbHeight }}
    >
      {page ? (
        <div
          className="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          style={{ width: innerWidth, height: innerHeight }}
        >
          {elements.map((element) => {
            const rect = getAbsoluteRect(element, map);
            const isText = ["text", "heading", "paragraph", "button", "input"].includes(
              element.type
            );
            return (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: rect.x * scale,
                  top: rect.y * scale,
                  width: Math.max(2, rect.width * scale),
                  height: Math.max(2, rect.height * scale),
                  backgroundColor: isText
                    ? "rgba(79, 70, 229, 0.2)"
                    : element.style?.backgroundColor || "rgba(148, 163, 184, 0.25)",
                  borderRadius: Math.max(2, (element.style?.borderRadius ?? 6) * scale),
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-[10px] text-gray-400">No preview</div>
      )}
    </div>
  );
}
