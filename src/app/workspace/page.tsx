"use client";

import WorkspaceCanvas from "./WorkspaceCanvas";
import WorkspaceInspector from "./WorkspaceInspector";
import WorkspaceModals from "./WorkspaceModals";
import WorkspacePromptPanel from "./WorkspacePromptPanel";
import { useWorkspace } from "./workspace-context";

export default function WorkspacePage() {
  const { view } = useWorkspace();
  const isFullView = view.viewMode === "full";

  return (
    <>
      <div
        className={`grid gap-6 ${
          isFullView ? "grid-cols-1" : "lg:grid-cols-[360px_1fr]"
        }`}
      >
        {isFullView ? null : <WorkspacePromptPanel />}
        <div className="flex flex-col gap-6">
          <WorkspaceCanvas />
          {isFullView ? <WorkspaceInspector /> : null}
        </div>
      </div>
      <WorkspaceModals />
    </>
  );
}
