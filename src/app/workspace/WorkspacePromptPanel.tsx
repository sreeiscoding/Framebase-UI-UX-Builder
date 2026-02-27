"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faCircleQuestion,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useRef } from "react";
import { useWorkspace } from "./workspace-context";
import WorkspaceInspector from "./WorkspaceInspector";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ToastProvider";

const SUGGESTIONS = [
  "SaaS dashboard",
  "Calm palette",
  "Minimal cards",
  "Trust section",
  "Pricing focus",
];

export default function WorkspacePromptPanel() {
  const {
    state,
    ui,
    updatePrompt,
    runPrompt,
    openKnowYourDesign,
    openPromptGenerator,
    openProjectCode,
    generateCaseStudyPpt,
  } = useWorkspace();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const authReason = "Create an account to continue.";
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ui.errorMessage || ui.errorMessage === lastErrorRef.current) return;
    showToast({ message: ui.errorMessage, variant: "error" });
    lastErrorRef.current = ui.errorMessage;
  }, [ui.errorMessage, showToast]);

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
  const canOpenProjectModals = Boolean(state.activeProjectId && projectPages.length);
  const canGenerateCaseStudy = canOpenProjectModals && !ui.caseStudyGenerating;

  const promptValue = activePage?.prompt ?? "";
  const canRun = promptValue.trim().length > 0 && !ui.isGenerating;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 h-[640px]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Prompt</h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Draft
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        Start with structure. Select your platform and describe what you are
        building.
      </p>
      <div className="mt-4 flex h-[520px] flex-col">
        <textarea
          className="min-h-180px w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/20"
          placeholder="Describe your design..."
          value={promptValue}
          onChange={(event) => updatePrompt(event.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => updatePrompt(suggestion)}
              className="rounded-full border border-gray-200 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {ui.errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {ui.errorMessage}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => requireAuth(() => runPrompt(promptValue), authReason)}
            disabled={!canRun}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
              canRun
                ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                : "cursor-not-allowed bg-indigo-600/60"
            }`}
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-sm" />
            {ui.isGenerating ? "Building..." : "Run"}
          </button>
          <button
            type="button"
            onClick={() => requireAuth(openKnowYourDesign, authReason)}
            disabled={!canOpenProjectModals}
            title={
              canOpenProjectModals ? "" : "Select a project with pages first"
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canOpenProjectModals
                ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
            }`}
          >
            <FontAwesomeIcon icon={faCircleQuestion} className="text-sm" />
            Know Your Project
          </button>
          <button
            type="button"
            onClick={() => requireAuth(openPromptGenerator, authReason)}
            disabled={!canOpenProjectModals}
            title={
              canOpenProjectModals ? "" : "Select a project with pages first"
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canOpenProjectModals
                ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} className="text-sm" />
            MVP Prompt (Project)
          </button>
          <button
            type="button"
            onClick={() => requireAuth(openProjectCode, authReason)}
            disabled={!canOpenProjectModals}
            title={
              canOpenProjectModals ? "" : "Select a project with pages first"
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canOpenProjectModals
                ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} className="text-sm" />
            {state.activeProjectId
              ? `${state.projects.find((project) => project.id === state.activeProjectId)?.name || "Project"} Code`
              : "Project Code"}
          </button>
          <button
            type="button"
            onClick={() => requireAuth(generateCaseStudyPpt, authReason)}
            disabled={!canGenerateCaseStudy}
            title={
              canOpenProjectModals ? "" : "Select a project with pages first"
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canGenerateCaseStudy
                ? "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                : "cursor-not-allowed border-gray-200/60 bg-gray-50 text-gray-400 dark:border-gray-800/60 dark:bg-gray-900/40 dark:text-gray-500"
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} className="text-sm" />
            {state.activeProjectId
              ? `Case Study for ${
                  state.projects.find((project) => project.id === state.activeProjectId)?.name ||
                  "Project"
                }`
              : "Case Study"}
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto scroll-hidden">
          <WorkspaceInspector />
        </div>
      </div>
    </section>
  );
}
