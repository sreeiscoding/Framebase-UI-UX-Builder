"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import {
  generateLayoutFromPrompt,
  generateLayoutFromSections,
  type GeneratedLayout,
} from "./workspace-generator";
import { apiFetch } from "@/lib/api-client";
import { getSupabaseClient } from "@/lib/supabase-client";

export type Platform = "web" | "mobile";
export type ViewMode = "split" | "full";

export type CaseStudyTemplate = "A" | "B" | "C" | "D";

export interface CaseStudyPersona {
  name: string;
  role: string;
  goals: string;
  frustrations: string;
  motivations: string;
}

export interface CaseStudySlide {
  id: string;
  title: string;
  subtitle?: string;
  template: CaseStudyTemplate;
  bullets?: string[];
  leftTitle?: string;
  rightTitle?: string;
  left?: string[];
  right?: string[];
  highlight?: string;
  persona?: CaseStudyPersona;
}

export type ElementType =
  | "navbar"
  | "hero"
  | "features"
  | "pricing"
  | "form"
  | "cta"
  | "footer"
  | "section"
  | "text"
  | "button"
  | "image"
  | "container"
  | "card"
  | "input"
  | "heading"
  | "paragraph"
  | "background";

export type TextAlign = "left" | "center" | "right" | "justify";
export type FontWeight = "300" | "400" | "500" | "600" | "700" | "800" | "900";
export type TextDecoration = "none" | "underline" | "line-through" | "overline";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

/** Complete styling object for any element */
export interface ElementStyle {
  // Layout
  position?: "absolute" | "relative";
  rotation?: number;
  zIndex?: number;

  // Spacing
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Appearance
  backgroundColor?: string;
  backgroundGradient?: string;
  opacity?: number;

  // Border
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted";
  borderRadius?: number;
  borderRadiusTopLeft?: number;
  borderRadiusTopRight?: number;
  borderRadiusBottomLeft?: number;
  borderRadiusBottomRight?: number;

  // Shadow & Effects
  boxShadow?: string;
  backdropFilter?: string;
  blur?: number;

  // Typography (text elements)
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  textAlign?: TextAlign;
  textDecoration?: TextDecoration;
  textTransform?: TextTransform;
  textShadow?: string;

  // Interactions
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverOpacity?: number;
  activeBackgroundColor?: string;
  activeColor?: string;
  transitionDuration?: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Hierarchy
  parentId?: string | null;
  zIndex?: number;

  // Content
  content?: string; // For text, heading, paragraph
  
  // Styling
  style: ElementStyle;

  // Non-interactive layout reference
  isGhost?: boolean;

  // Legacy props for backward compatibility
  padding?: number;
  align?: TextAlign;
  background?: string;
  color?: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  platform?: Platform;
}

export interface WorkspacePageData {
  id: string;
  name: string;
  projectId: string | null;
  prompt: string;
  elements: CanvasElement[];
  explanation: string;
  mvpPrompt: string;
  jsonOutline: string;
  canvasX: number;
  canvasY: number;
}

type ApiProject = {
  id: string;
  name: string;
  platform_type: string | null;
};

type ApiPage = {
  id: string;
  name: string;
  project_id: string;
  slug: string | null;
  order_index: number | null;
  html_content: string | null;
  metadata: any;
};

export interface WorkspaceState {
  platform: Platform;
  projects: ProjectFolder[];
  activeProjectId: string | null;
  pages: WorkspacePageData[];
  activePageId: string;
}

interface HistoryState {
  past: WorkspaceState[];
  present: WorkspaceState;
  future: WorkspaceState[];
}

interface ViewState {
  viewMode: ViewMode;
  zoom: number;
  selectedElementId: string | null;
}

type HistoryAction =
  | { type: "RESET"; state: WorkspaceState }
  | { type: "COMMIT"; state: WorkspaceState }
  | { type: "SET_PRESENT"; state: WorkspaceState }
  | { type: "UNDO" }
  | { type: "REDO" };

const LOCAL_STORAGE_KEY = "design-system-data";

type PersistedProject = ProjectFolder & { pages: WorkspacePageData[] };
type PersistedState = {
  projects: PersistedProject[];
  activeProjectId: string | null;
  activePageId: string | null;
  platform?: Platform;
  viewport?: {
    x: number;
    y: number;
    scale: number;
  };
};

const serializeState = (state: WorkspaceState): PersistedState => ({
  projects: state.projects.map((project) => ({
    ...project,
    pages: state.pages.filter((page) => page.projectId === project.id),
  })),
  activeProjectId: state.activeProjectId,
  activePageId: state.activePageId ?? null,
  platform: state.platform,
});

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2, 10)}`;

const serializePageMetadata = (page: WorkspacePageData) => ({
  prompt: page.prompt,
  elements: page.elements,
  explanation: page.explanation,
  mvpPrompt: page.mvpPrompt,
  jsonOutline: page.jsonOutline,
  canvasX: page.canvasX,
  canvasY: page.canvasY,
});

const buildPageFromRecord = (
  record: ApiPage,
  fallbackIndex: number
): WorkspacePageData => {
  const meta = record.metadata ?? {};
  const base: WorkspacePageData = {
    id: record.id,
    name: record.name,
    projectId: record.project_id,
    prompt: typeof meta.prompt === "string" ? meta.prompt : "",
    elements: Array.isArray(meta.elements) ? meta.elements : [],
    explanation: typeof meta.explanation === "string" ? meta.explanation : "",
    mvpPrompt: typeof meta.mvpPrompt === "string" ? meta.mvpPrompt : "",
    jsonOutline: typeof meta.jsonOutline === "string" ? meta.jsonOutline : "",
    canvasX:
      typeof meta.canvasX === "number" ? meta.canvasX : 2000 + fallbackIndex * 60,
    canvasY:
      typeof meta.canvasY === "number" ? meta.canvasY : 2000 + fallbackIndex * 60,
  };
  const result = ensureTextChildren(base.elements);
  return result.changed ? { ...base, elements: result.elements } : base;
};

const TEXT_ELEMENT_TYPES = new Set<ElementType>([
  "text",
  "heading",
  "paragraph",
  "button",
  "input",
]);

const AI_SECTION_TYPES = new Set<ElementType>([
  "navbar",
  "hero",
  "features",
  "pricing",
  "form",
  "cta",
  "footer",
  "section",
  "text",
  "heading",
  "paragraph",
  "button",
  "image",
  "container",
  "card",
  "input",
]);

const normalizeAiSections = (value: unknown): ElementType[] => {
  if (!Array.isArray(value)) return [];
  const sections: ElementType[] = [];
  value.forEach((item) => {
    if (typeof item !== "string") return;
    const candidate = item.trim().toLowerCase() as ElementType;
    if (AI_SECTION_TYPES.has(candidate)) {
      sections.push(candidate);
    }
  });
  return sections;
};

const getProjectPages = (state: WorkspaceState, projectId: string) =>
  state.pages.filter((page) => page.projectId === projectId);

const normalizeLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const slugifyClassName = (value: string, fallback: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const inferAudience = (value: string) => {
  const text = value.toLowerCase();
  const candidates: Array<{ keywords: string[]; label: string }> = [
    { keywords: ["student", "learn", "course", "education"], label: "Learners and students" },
    { keywords: ["fitness", "health", "workout", "wellness"], label: "Health and fitness users" },
    { keywords: ["finance", "budget", "bank", "invoice"], label: "Finance-focused users" },
    { keywords: ["team", "collab", "workspace", "saas", "dashboard"], label: "Teams and professionals" },
    { keywords: ["creator", "content", "video", "portfolio"], label: "Creators and builders" },
    { keywords: ["community", "social", "chat"], label: "Community-driven audiences" },
  ];
  const match = candidates.find((candidate) => includesAny(text, candidate.keywords));
  return match?.label ?? "Users described in the project brief";
};

const inferDifferentiators = (value: string) => {
  const text = value.toLowerCase();
  const options: Array<{ keywords: string[]; label: string }> = [
    { keywords: ["ai", "assistant", "automation", "ml"], label: "AI-assisted workflows" },
    { keywords: ["personal", "custom", "tailor"], label: "Personalized experiences" },
    { keywords: ["real-time", "live", "instant"], label: "Real-time feedback loops" },
    { keywords: ["community", "social"], label: "Social and community signals" },
    { keywords: ["insight", "analytics", "report"], label: "Insight-driven dashboards" },
  ];
  const matches = options
    .filter((option) => includesAny(text, option.keywords))
    .map((option) => option.label);
  return matches.length ? matches : ["Clear, focused core workflows"];
};

const buildFeatureSet = (pageText: string) => {
  const features: string[] = [];
  if (includesAny(pageText, ["onboard", "signup", "sign up", "welcome"])) {
    features.push("Onboarding and account creation");
  }
  if (includesAny(pageText, ["login", "sign in", "auth"])) {
    features.push("Authentication and account access");
  }
  if (includesAny(pageText, ["dashboard", "home"])) {
    features.push("Core dashboard and primary navigation");
  }
  if (includesAny(pageText, ["profile", "account"])) {
    features.push("Profile and account management");
  }
  if (includesAny(pageText, ["settings", "preferences"])) {
    features.push("Settings and preference controls");
  }
  if (includesAny(pageText, ["pricing", "plan", "checkout"])) {
    features.push("Plan selection and conversion flow");
  }
  if (includesAny(pageText, ["report", "analytics", "insight"])) {
    features.push("Analytics and reporting surface");
  }
  if (!features.length) {
    features.push("Primary flows derived from the listed pages");
  }
  return features;
};

const inferProductType = (value: string) => {
  const text = value.toLowerCase();
  if (includesAny(text, ["dashboard", "analytics", "report"])) return "dashboard";
  if (includesAny(text, ["store", "shop", "commerce", "market"])) return "commerce product";
  if (includesAny(text, ["platform", "portal"])) return "platform";
  if (includesAny(text, ["app", "mobile"])) return "application";
  return "product experience";
};

const joinNaturalList = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const describeLayout = (type: ElementType, childCount: number) => {
  if (type === "navbar") return "a horizontal flex row layout";
  if (type === "hero") return "a centered vertical stack layout";
  if (type === "features" || type === "pricing") return "a grid layout";
  if (type === "footer") return "a horizontal row layout";
  if (type === "form") return "a vertical form layout";
  if (type === "section" || type === "container" || type === "card") {
    return childCount > 2 ? "a vertical stack layout" : "a simple column layout";
  }
  return "a vertical stack layout";
};

const describeElements = (elements: CanvasElement[]) => {
  if (!elements.length) return "no explicit elements";
  const labels = elements.map((el) => normalizeLabel(el.label, el.type));
  const types = elements.map((el) => el.type);
  const mix = Array.from(new Set([...labels, ...types]));
  return joinNaturalList(mix);
};

const describeSectionName = (element: CanvasElement, index: number) =>
  normalizeLabel(element.label, `${element.type} section ${index + 1}`);

const describePosition = (index: number, total: number) => {
  if (index === 0) return "positioned at the top";
  if (index === total - 1) return "positioned near the bottom";
  return "positioned below the previous section";
};

const describeSpacing = (style?: ElementStyle) => {
  const padding =
    style?.paddingTop ?? style?.paddingLeft ?? style?.paddingBottom ?? style?.paddingRight;
  if (typeof padding === "number" && padding > 0) {
    return `with ${padding}px internal padding and consistent spacing`;
  }
  return "with consistent padding and margin spacing";
};

const describeBackground = (style?: ElementStyle) => {
  if (style?.backgroundGradient) return "with a subtle background gradient";
  if (style?.backgroundColor) return `with a ${style.backgroundColor} background`;
  return "with a neutral background";
};

const describeAlignment = (style?: ElementStyle) => {
  if (style?.textAlign) return `and ${style.textAlign}-aligned text`;
  return "and aligned content";
};

const toFileName = (value: string, fallback: string) => {
  const cleaned = value.trim().replace(/[^a-z0-9]+/gi, "_");
  const normalized = cleaned.replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

const buildCaseStudyPersona = (audience: string) => {
  if (audience.toLowerCase().includes("fitness")) {
    return {
      name: "Maya Carter",
      role: "Fitness Enthusiast",
      goals: "Track workouts quickly and see progress",
      frustrations: "Scattered tracking tools and unclear goals",
      motivations: "Stay consistent and celebrate progress",
    };
  }
  if (audience.toLowerCase().includes("finance")) {
    return {
      name: "Jordan Lee",
      role: "Small Business Owner",
      goals: "Monitor cash flow and stay organized",
      frustrations: "Manual reporting and slow reconciliation",
      motivations: "Confidence in daily financial decisions",
    };
  }
  if (audience.toLowerCase().includes("team")) {
    return {
      name: "Alex Morgan",
      role: "Product Manager",
      goals: "Align team work and track progress",
      frustrations: "Fragmented updates across tools",
      motivations: "Maintain momentum and clarity",
    };
  }
  return {
    name: "Taylor Kim",
    role: "Busy Professional",
    goals: "Complete key tasks with minimal friction",
    frustrations: "Overwhelming interfaces and unclear priorities",
    motivations: "Stay on top of critical work",
  };
};

const buildCaseStudyObjectives = (
  pageNames: string[],
  hasForms: boolean,
  hasNav: boolean,
  hasSettings: boolean
) => {
  const objectives = [
    "Guide users to the primary action with a clear, consistent flow.",
    "Provide scannable content sections that reduce cognitive load.",
  ];
  if (hasNav) {
    objectives.push("Enable fast switching between core pages via navigation.");
  }
  if (hasForms) {
    objectives.push("Capture essential inputs with simple, validated forms.");
  }
  if (hasSettings) {
    objectives.push("Allow personalization without leaving the main journey.");
  }
  if (objectives.length < 5 && pageNames.length > 3) {
    objectives.push("Maintain visual consistency across multiple pages.");
  }
  return objectives.slice(0, 5);
};

const buildCaseStudySlides = (params: {
  projectName: string;
  platformLabel: string;
  productType: string;
  audience: string;
  pageNames: string[];
  hasNav: boolean;
  hasForms: boolean;
  hasCards: boolean;
  hasSettings: boolean;
  authNeeded: boolean;
}): CaseStudySlide[] => {
  const {
    projectName,
    platformLabel,
    productType,
    audience,
    pageNames,
    hasNav,
    hasForms,
    hasCards,
    hasSettings,
    authNeeded,
  } = params;
  const objectives = buildCaseStudyObjectives(pageNames, hasForms, hasNav, hasSettings);
  const entryPoint = pageNames[0] ?? "Entry";
  const exitPoint = pageNames[pageNames.length - 1] ?? "Completion";
  const journeySteps =
    pageNames.length > 4
      ? `${pageNames.slice(0, 4).join(" -> ")} -> ...`
      : pageNames.join(" -> ");
  const persona = buildCaseStudyPersona(audience);

  const problemSlide: CaseStudySlide = {
    id: "problem",
    title: "Problem Statement",
    template: "A",
    leftTitle: "Context, Pain, Impact",
    left: [
      `Context: ${audience} need a guided experience for ${entryPoint.toLowerCase()} tasks.`,
      "Pain: key actions are fragmented, slowing decisions and follow-through.",
      `Impact: the ${platformLabel.toLowerCase()} experience feels inconsistent and hard to scan.`,
    ],
    rightTitle: "Design Challenge",
    right: [
      "Clarify the primary action and reduce friction.",
      "Create a structured flow across key pages.",
    ],
  };

  const researchSlide: CaseStudySlide = {
    id: "research",
    title: "Research Insights",
    template: "B",
    subtitle: `Target audience: ${audience}`,
    bullets: [
      "Insight: users scan for the main action within seconds.",
      "Insight: consistent section patterns improve comprehension.",
      "Insight: clear navigation reduces drop-off between pages.",
      "Behavioral takeaway: concise, structured layouts keep attention.",
    ],
  };

  const journeySlide: CaseStudySlide = {
    id: "journey",
    title: "User Journey / Flow",
    template: "C",
    leftTitle: "Core Flow",
    left: [
      `Entry: ${entryPoint}.`,
      `Steps: ${journeySteps || "Primary flow across key pages."}`,
      `Exit: ${exitPoint} with confirmation or next steps.`,
    ],
    rightTitle: "Decision Points",
    right: [
      authNeeded
        ? "Authenticate or onboard before full access."
        : "Choose primary action based on intent.",
      hasForms
        ? "Submit key inputs with validation feedback."
        : "Complete actions through prominent CTAs.",
    ],
  };

  const iaSlide: CaseStudySlide = {
    id: "ia",
    title: "Information Architecture",
    template: "C",
    leftTitle: "Structure",
    left: [
      `Total pages: ${pageNames.length}.`,
      `Hierarchy: ${pageNames.join(" -> ")}.`,
      "Pages organized into repeatable sections.",
    ],
    rightTitle: "Navigation Logic",
    right: [
      hasNav
        ? "Persistent navigation connects core pages."
        : "Linear links guide users through the journey.",
      "Section layout aligns with user priorities.",
    ],
  };

  const wireframeSlide: CaseStudySlide = {
    id: "wireframe",
    title: "Wireframe Thinking",
    template: "A",
    leftTitle: "Layout Decisions",
    left: [
      hasNav
        ? "Navigation and page identity anchored at the top."
        : "Page identity and orientation anchored at the top.",
      hasCards
        ? "Grouped content as cards for quick scanning."
        : "Content grouped into clear, readable sections.",
      hasForms
        ? "Inputs precede actions to support completion."
        : "Primary CTAs follow value statements.",
    ],
    rightTitle: "Hierarchy Rationale",
    right: [
      "Primary action appears before secondary content.",
      "Consistent spacing guides visual rhythm.",
    ],
  };

  const designSystemSlide: CaseStudySlide = {
    id: "design-system",
    title: "UI Design System",
    template: "C",
    leftTitle: "Typography & Spacing",
    left: [
      "Typography: 28px headers, 20px section titles, 16px labels, 14px body.",
      "Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 for rhythm.",
    ],
    rightTitle: "Components",
    right: [
      "Color logic: neutral grays with indigo action accents.",
      "Buttons: pill-shaped with bold labels.",
      "Cards: white surfaces, soft shadow, 16px radius.",
      platformLabel === "Web"
        ? "Responsive: centered containers with adaptive grids."
        : "Responsive: mobile-first stacked layout.",
    ],
  };

  const solutionSlide: CaseStudySlide = {
    id: "solution",
    title: "High-Fidelity Solution",
    template: "A",
    leftTitle: "Design Decisions",
    left: [
      "Clean, modern interface with consistent typography.",
      "Clear section hierarchy reinforces user focus.",
      hasNav ? "Navigation keeps context across pages." : "Linear flow reduces confusion.",
    ],
    rightTitle: "Interaction Patterns",
    right: [
      hasForms ? "Forms provide clear input states and validation." : "CTAs highlight primary actions.",
      "Visual consistency reinforces trust and usability.",
    ],
  };

  const outcomeSlide: CaseStudySlide = {
    id: "outcome",
    title: "Outcome & Impact",
    template: "B",
    bullets: [
      "Expected impact: faster path to key actions.",
      "Usability improvement: clearer scanability and structure.",
      "Efficiency gain: reduced effort across core tasks.",
      "Business alignment: supports conversion and retention goals.",
      "Lessons learned: prioritize clarity over feature volume.",
    ],
  };

  const reflectionSlide: CaseStudySlide = {
    id: "reflection",
    title: "Reflection",
    template: "A",
    leftTitle: "What Worked",
    left: [
      "Cohesive hierarchy and focused flow.",
      "Reusable section patterns improved clarity.",
    ],
    rightTitle: "Future Enhancements",
    right: [
      "Deeper validation with usability testing.",
      "Add personalization and accessibility passes.",
    ],
  };

  return [
    {
      id: "cover",
      title: projectName,
      subtitle: `A ${platformLabel} ${productType} designed for ${audience.toLowerCase()}.`,
      template: "B",
      bullets: ["Role: UI/UX Designer", `Platform: ${platformLabel}`],
    },
    problemSlide,
    {
      id: "goals",
      title: "Goal & Objectives",
      template: "A",
      leftTitle: "Primary Goal",
      left: [
        `Deliver a cohesive flow from ${entryPoint} to ${exitPoint}.`,
        ...objectives.map((item) => `Objective: ${item}`),
      ],
      rightTitle: "Target Users",
      right: [`${audience}.`],
    },
    researchSlide,
    {
      id: "persona",
      title: "User Persona",
      template: "D",
      persona,
    },
    journeySlide,
    iaSlide,
    wireframeSlide,
    designSystemSlide,
    solutionSlide,
    outcomeSlide,
    reflectionSlide,
  ];
};

export const generateMvpPrompt = (state: WorkspaceState, projectId: string) => {
  const project = state.projects.find((item) => item.id === projectId);
  const pages = getProjectPages(state, projectId);
  const platformLabel = state.platform === "mobile" ? "Mobile" : "Web";
  const projectName = normalizeLabel(project?.name, "Untitled Project");
  const pageNames = pages.map((page, index) => normalizeLabel(page.name, `Page ${index + 1}`));
  const totalPages = pages.length;
  const productType = inferProductType(projectName);
  const platformSentence = `This is a ${platformLabel} ${productType} with ${totalPages} page${totalPages === 1 ? "" : "s"}: ${pageNames.join(", ")}.`;

  const pageSentences = pages.map((page, pageIndex) => {
    const pageName = normalizeLabel(page.name, `Page ${pageIndex + 1}`);
    const pageElements = page.elements.filter(
      (el) => !el.isGhost && el.type !== "background"
    );
    const topLevel = pageElements.filter((el) => !el.parentId);
    const pageLayout = topLevel.length > 1 ? "a vertical stack layout" : "a centered column layout";
    const sectionsSentence = topLevel.length
      ? topLevel
          .map((section, sectionIndex) => {
            const children = pageElements.filter((el) => el.parentId === section.id);
            const sectionName = describeSectionName(section, sectionIndex);
            const position = describePosition(sectionIndex, topLevel.length);
            const layout = describeLayout(section.type, children.length);
            const spacing = describeSpacing(section.style);
            const background = describeBackground(section.style);
            const alignment = describeAlignment(section.style);
            const contained = describeElements(children.length ? children : [section]);
            return `${sectionName} is ${position}, uses ${layout}, ${spacing}, ${background}, ${alignment}, and contains ${contained}`;
          })
          .join("; ")
      : "it uses a basic single-section layout with primary content blocks";
    return `${pageName} uses ${pageLayout}, with sections defined as follows: ${sectionsSentence}.`;
  });

  const combinedText = [projectName, ...pageNames, ...pages.map((page) => page.prompt || "")].join(" ").toLowerCase();
  const authNeeded = includesAny(combinedText, ["login", "sign in", "signup", "onboarding", "account"]);
  const settingsNeeded = includesAny(combinedText, ["settings", "preferences", "profile"]);
  const crudNeeded = includesAny(combinedText, ["create", "edit", "update", "delete", "manage"]);
  const navNeeded = includesAny(combinedText, ["nav", "menu", "sidebar", "tab"]);
  const formNeeded = includesAny(combinedText, ["form", "input", "field", "submit"]);

  const interactionParts = [
    navNeeded ? "navigation links move between pages and preserve context" : "",
    authNeeded ? "authentication gates access where required" : "",
    formNeeded ? "forms validate inputs and submit data with feedback" : "",
    settingsNeeded ? "settings changes persist across sessions" : "",
    crudNeeded ? "core CRUD actions are supported where relevant" : "",
    "state is shared between pages to maintain continuity",
  ].filter(Boolean) as string[];
  const interactionSentence = `Interaction behavior includes ${joinNaturalList(interactionParts)}.`;

  const layoutRules =
    state.platform === "mobile"
      ? "Global layout rules specify a mobile-first structure with vertically stacked content, full-width sections, centered page containers, and touch-friendly spacing."
      : "Global layout rules specify responsive web containers with centered page widths, adaptive grids, and consistent alignment across breakpoints.";
  const stylingRules =
    "Styling rules include a clean modern UI, simple typography hierarchy, consistent spacing scale, balanced alignment, and reusable components with subtle borders and minimal shadows.";

  return [platformSentence, ...pageSentences, interactionSentence, layoutRules, stylingRules].join(" ");
};

export const generateProjectAnalysis = (state: WorkspaceState, projectId: string) => {
  const project = state.projects.find((item) => item.id === projectId);
  const pages = getProjectPages(state, projectId);
  const projectName = normalizeLabel(project?.name, "Untitled Project");
  const platformLabel = state.platform === "mobile" ? "Mobile" : "Web";
  const pageText = pages.map((page) => page.name).join(" ").toLowerCase();
  const combinedText = [
    projectName,
    pageText,
    ...pages.map((page) => page.prompt || ""),
  ]
    .join(" ")
    .toLowerCase();

  const hasMarketing = includesAny(pageText, ["landing", "marketing", "hero"]);
  const hasDashboard = includesAny(pageText, ["dashboard", "home"]);
  const stage = hasMarketing && !hasDashboard ? "Validation / marketing focus" : "MVP build";

  const assumptions = [
    `Users will move through ${pages.length || 1} core screens to achieve the main goal.`,
    `${platformLabel} usage is the primary context for this experience.`,
  ];
  if (!pages.some((page) => page.prompt?.trim())) {
    assumptions.push("Requirements are still light; prompts are minimal.");
  }

  const missing: string[] = [];
  if (!includesAny(pageText, ["onboard", "signup", "sign up", "welcome"])) {
    missing.push("Onboarding / first-run experience");
  }
  if (!includesAny(pageText, ["login", "sign in", "auth"])) {
    missing.push("Authentication flow");
  }
  if (!includesAny(pageText, ["settings", "preferences"])) {
    missing.push("Settings or preferences surface");
  }
  if (!includesAny(pageText, ["empty", "error", "state"])) {
    missing.push("Empty/error state definitions");
  }

  const risks: string[] = [];
  if (pages.length > 6) {
    risks.push("Scope may be broad for an MVP.");
  }
  if (!pages.length) {
    risks.push("No pages defined yet.");
  }
  if (!pages.some((page) => page.prompt?.trim())) {
    risks.push("Prompt detail is thin; requirements may be underspecified.");
  }

  const differentiators = inferDifferentiators(combinedText);

  return [
    `Project: ${projectName}`,
    `Platform: ${platformLabel}`,
    "",
    "Product type:",
    `- ${projectName}`,
    "Stage:",
    `- ${stage}`,
    "Assumptions:",
    assumptions.map((item) => `- ${item}`).join("\n"),
    "Missing / to validate:",
    (missing.length ? missing : ["- None flagged yet."]).join("\n"),
    "Risk areas:",
    (risks.length ? risks : ["- No major risks detected."]).join("\n"),
    "Differentiators:",
    differentiators.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
};

export const generateProjectCode = (state: WorkspaceState, projectId: string) => {
  const project = state.projects.find((item) => item.id === projectId);
  const pages = getProjectPages(state, projectId);
  const projectName = normalizeLabel(project?.name, "Untitled Project");
  const projectClass = slugifyClassName(projectName, "project");
  const platformLabel = state.platform === "mobile" ? "Mobile" : "Web";

  const pageSections = pages.map((page, index) => {
    const pageName = normalizeLabel(page.name, `Page ${index + 1}`);
    const pageClass = slugifyClassName(pageName, `page-${index + 1}`);
    const elementTypes = Array.from(
      new Set(
        page.elements
          .filter((el) => !el.isGhost && el.type !== "background")
          .map((el) => el.type)
      )
    );
    const blocks =
      elementTypes.length > 0
        ? elementTypes
            .map(
              (type) =>
                [
                  `          <section class="section section-${type} ${type}">`,
                  `            <h3 class="section__title">${type.replace(/-/g, " ")}</h3>`,
                  `            <div class="section__body">Add content here</div>`,
                  `          </section>`,
                ].join("\n")
            )
            .join("\n")
        : [
            `          <section class="section section-content content">`,
            `            <h3 class="section__title">Content</h3>`,
            `            <div class="section__body">Add content here</div>`,
            `          </section>`,
          ].join("\n");

    return {
      id: page.id,
      name: pageName,
      className: pageClass,
      blocks,
    };
  });

  const maxWidth = state.platform === "mobile" ? "428px" : "1200px";
  const css = [
    `* {`,
    `  box-sizing: border-box;`,
    `  margin: 0;`,
    `  padding: 0;`,
    `}`,
    ``,
    `body {`,
    `  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;`,
    `  color: #111827;`,
    `  background: #f8fafc;`,
    `}`,
    ``,
    `:root {`,
    `  --space-1: 4px;`,
    `  --space-2: 8px;`,
    `  --space-3: 12px;`,
    `  --space-4: 16px;`,
    `  --space-5: 24px;`,
    `  --space-6: 32px;`,
    `  --radius-1: 12px;`,
    `  --radius-2: 16px;`,
    `  --radius-3: 24px;`,
    `  --text-xs: 12px;`,
    `  --text-sm: 14px;`,
    `  --text-md: 16px;`,
    `  --text-lg: 20px;`,
    `  --text-xl: 28px;`,
    `}`,
    ``,
    `.project {`,
    `  max-width: ${maxWidth};`,
    `  margin: 0 auto;`,
    `  padding: 40px 24px;`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  gap: 32px;`,
    `}`,
    ``,
    `.project__header h1 {`,
    `  font-size: var(--text-xl);`,
    `  font-weight: 700;`,
    `}`,
    ``,
    `.project__header p {`,
    `  color: #6b7280;`,
    `  font-size: var(--text-sm);`,
    `}`,
    ``,
    `.project__pages {`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  gap: 32px;`,
    `}`,
    ``,
    `.page {`,
    `  border: 1px solid #e5e7eb;`,
    `  border-radius: var(--radius-3);`,
    `  background: #ffffff;`,
    `  padding: var(--space-6);`,
    `  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);`,
    `}`,
    ``,
    `.page__header {`,
    `  margin-bottom: 20px;`,
    `}`,
    ``,
    `.page__header h2 {`,
    `  font-size: var(--text-lg);`,
    `  font-weight: 600;`,
    `}`,
    ``,
    `.page__header p {`,
    `  color: #6b7280;`,
    `  font-size: var(--text-sm);`,
    `}`,
    ``,
    `.page__content {`,
    `  display: grid;`,
    `  gap: var(--space-4);`,
    `}`,
    ``,
    `.section {`,
    `  border: 1px dashed #cbd5f5;`,
    `  border-radius: var(--radius-2);`,
    `  padding: var(--space-4);`,
    `  background: #f9fafb;`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  gap: var(--space-2);`,
    `}`,
    ``,
    `.section__title {`,
    `  font-size: var(--text-md);`,
    `  font-weight: 600;`,
    `  text-transform: capitalize;`,
    `}`,
    ``,
    `.section__body {`,
    `  font-size: var(--text-sm);`,
    `  color: #4b5563;`,
    `}`,
    ``,
    `.navbar {`,
    `  display: flex;`,
    `  align-items: center;`,
    `  justify-content: space-between;`,
    `  padding: var(--space-4);`,
    `  border-radius: var(--radius-2);`,
    `  background: #ffffff;`,
    `  border: 1px solid #e5e7eb;`,
    `}`,
    ``,
    `.button {`,
    `  display: inline-flex;`,
    `  align-items: center;`,
    `  justify-content: center;`,
    `  padding: 10px 16px;`,
    `  border-radius: 999px;`,
    `  background: #4f46e5;`,
    `  color: #ffffff;`,
    `  font-size: var(--text-sm);`,
    `  font-weight: 600;`,
    `  border: none;`,
    `}`,
    ``,
    `.card {`,
    `  border-radius: var(--radius-2);`,
    `  border: 1px solid #e5e7eb;`,
    `  padding: var(--space-4);`,
    `  background: #ffffff;`,
    `  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);`,
    `}`,
    ``,
    `.grid {`,
    `  display: grid;`,
    `  gap: var(--space-4);`,
    `}`,
    ``,
    `.stack {`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  gap: var(--space-3);`,
    `}`,
    ``,
    state.platform === "web"
      ? `@media (max-width: 900px) {\n  .project { padding: 28px 18px; }\n  .page { padding: 24px; }\n}`
      : `@media (max-width: 480px) {\n  .project { padding: 24px 16px; }\n  .page { padding: 20px; }\n}`,
  ].join("\n");

  const pageHtml = pageSections.map((page, index) => {
    const document = [
      `<!doctype html>`,
      `<html lang="en">`,
      `<head>`,
      `  <meta charset="utf-8" />`,
      `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
      `  <title>${page.name} | ${projectName}</title>`,
      `  <link rel="stylesheet" href="styles.css" />`,
      `</head>`,
      `<body>`,
      `  <div class="project ${projectClass}">`,
      `    <header class="project__header">`,
      `      <h1>${projectName}</h1>`,
      `      <p>${platformLabel} project</p>`,
      `    </header>`,
      `    <main class="project__pages">`,
      `      <section class="page page-${index + 1} ${page.className}">`,
      `        <header class="page__header">`,
      `          <h2>${page.name}</h2>`,
      `          <p>${platformLabel} screen</p>`,
      `        </header>`,
      `        <div class="page__content">`,
      page.blocks,
      `        </div>`,
      `      </section>`,
      `    </main>`,
      `  </div>`,
      `</body>`,
      `</html>`,
    ].join("\n");
    const combined = [
      `<!doctype html>`,
      `<html lang="en">`,
      `<head>`,
      `  <meta charset="utf-8" />`,
      `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
      `  <title>${page.name} | ${projectName}</title>`,
      `  <style>`,
      css,
      `  </style>`,
      `</head>`,
      `<body>`,
      `  <div class="project ${projectClass}">`,
      `    <header class="project__header">`,
      `      <h1>${projectName}</h1>`,
      `      <p>${platformLabel} project</p>`,
      `    </header>`,
      `    <main class="project__pages">`,
      `      <section class="page page-${index + 1} ${page.className}">`,
      `        <header class="page__header">`,
      `          <h2>${page.name}</h2>`,
      `          <p>${platformLabel} screen</p>`,
      `        </header>`,
      `        <div class="page__content">`,
      page.blocks,
      `        </div>`,
      `      </section>`,
      `    </main>`,
      `  </div>`,
      `</body>`,
      `</html>`,
    ].join("\n");
    return { id: page.id, name: page.name, html: document, combined };
  });

  return { pages: pageHtml, css };
};

const ensureTextChildren = (elements: CanvasElement[]) => {
  const hasTextChild = new Set(
    elements
      .filter((el) => el.parentId && TEXT_ELEMENT_TYPES.has(el.type))
      .map((el) => el.parentId as string)
  );

  let changed = false;
  const next: CanvasElement[] = [];

  for (const element of elements) {
    next.push(element);
    if (element.parentId) continue;
    if (TEXT_ELEMENT_TYPES.has(element.type)) continue;
    if (hasTextChild.has(element.id)) continue;

    const content = element.label || element.content;
    if (!content) continue;

    const padding =
      element.style?.paddingTop ??
      element.style?.paddingLeft ??
      element.padding ??
      12;
    const paddingRight =
      element.style?.paddingRight ?? element.padding ?? padding;
    const paddingBottom =
      element.style?.paddingBottom ?? element.padding ?? padding;

    const width = Math.max(80, element.width - padding - paddingRight);
    const height = Math.max(24, Math.min(40, element.height - padding - paddingBottom));

    next.push({
      id: createId(),
      type: "text",
      label: `${element.label} Text`,
      parentId: element.id,
      x: padding,
      y: padding,
      width,
      height,
      content,
      style: {
        backgroundColor: "transparent",
        color: element.style?.color || "#111827",
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 1.3,
        textAlign: "left",
        letterSpacing: 0,
        zIndex: (element.style?.zIndex ?? 1) + 1,
      },
    });
    changed = true;
  }

  return { elements: next, changed };
};

const createDefaultPage = (
  projectId: string | null,
  index: number = 0
): WorkspacePageData => ({
  id: `page-${index + 1}`,
  name: "Landing Page",
  projectId,
  prompt: "",
  elements: [],
  explanation: "",
  mvpPrompt: "",
  jsonOutline: "",
  canvasX: 2000 + index * 60,
  canvasY: 2000 + index * 60,
});

const createDefaultState = (): WorkspaceState => {
  const page = createDefaultPage(null);
  return {
    platform: "web",
    projects: [],
    activeProjectId: null,
    pages: [page],
    activePageId: page.id,
  };
};

const defaultState: WorkspaceState = createDefaultState();
const defaultViewState: ViewState = {
  viewMode: "split",
  zoom: 1,
  selectedElementId: null,
};

const initialHistoryState = (): HistoryState => {
  const page = createDefaultPage(null);
  return {
    past: [],
    present: {
      ...defaultState,
      pages: [page],
      activePageId: page.id,
    },
    future: [],
  };
};

const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
  switch (action.type) {
    case "RESET":
      return { past: [], present: action.state, future: [] };
    case "COMMIT":
      return {
        past: [...state.past, state.present],
        present: action.state,
        future: [],
      };
    case "SET_PRESENT":
      return {
        ...state,
        present: action.state,
      };
    case "UNDO": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
};

interface WorkspaceUIState {
  isGenerating: boolean;
  generationMessage: string;
  errorMessage: string | null;
  exportOpen: boolean;
  knowYourDesignOpen: boolean;
  promptGeneratorOpen: boolean;
  promptGeneratorScope: "page" | "project";
  knowYourDesignScope: "page" | "project";
  projectCodeOpen: boolean;
  caseStudyGenerating: boolean;
  caseStudyOpen: boolean;
  caseStudySlides: CaseStudySlide[];
  caseStudyProjectName: string;
  caseStudyFileName: string;
  caseStudyBlob: Blob | null;
  caseStudyToast: { message: string; visible: boolean } | null;
  settingsOpen: boolean;
  viewPanelOpen: boolean;
  platformLockOpen: boolean;
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  view: ViewState;
  ui: WorkspaceUIState;
  generateMvpPrompt: (projectId: string) => string;
  generateProjectAnalysis: (projectId: string) => string;
  generateProjectCode: (projectId: string) => {
    pages: Array<{ id: string; name: string; html: string; combined: string }>;
    css: string;
  };
  generateCaseStudyPpt: () => void;
  downloadCaseStudyPpt: () => void;
  closeCaseStudyPreview: () => void;
  setPlatform: (platform: Platform) => void;
  setViewMode: (mode: ViewMode) => void;
  addProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  setActiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setZoom: (zoom: number, commit?: boolean) => void;
  updateZoom: (delta: number) => void;
  setSelectedElement: (id: string | null) => void;
  addPage: (name: string, projectId?: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  setActivePage: (id: string) => void;
  updatePage: (id: string, changes: Partial<WorkspacePageData>) => void;
  updatePrompt: (prompt: string) => void;
  runPrompt: (prompt: string) => void;
  updateElement: (id: string, changes: Partial<CanvasElement>, commit?: boolean) => void;
  addElement: (element: CanvasElement) => void;
  removeElement: (id: string) => void;
  undo: () => void;
  redo: () => void;
  openExport: () => void;
  closeExport: () => void;
  openKnowYourDesign: () => void;
  closeKnowYourDesign: () => void;
  openPromptGenerator: () => void;
  closePromptGenerator: () => void;
  openProjectCode: () => void;
  closeProjectCode: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  closeActiveProject: () => void;
  openPlatformLock: () => void;
  closePlatformLock: () => void;
  setError: (message: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [history, dispatch] = useReducer(historyReducer, undefined, initialHistoryState);
  const [ui, setUi] = useState<WorkspaceUIState>({
    isGenerating: false,
    generationMessage: "",
    errorMessage: null,
    exportOpen: false,
    knowYourDesignOpen: false,
    promptGeneratorOpen: false,
    promptGeneratorScope: "page",
    knowYourDesignScope: "page",
    projectCodeOpen: false,
    caseStudyGenerating: false,
    caseStudyOpen: false,
    caseStudySlides: [],
    caseStudyProjectName: "",
    caseStudyFileName: "",
    caseStudyBlob: null,
    caseStudyToast: null,
    settingsOpen: false,
    viewPanelOpen: false,
    platformLockOpen: false,
  });
  const [view, setView] = useState<ViewState>(defaultViewState);
  const [hydrated, setHydrated] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const hasHydratedRef = useRef(false);
  const caseStudyTimersRef = useRef<number[]>([]);
  const pageSyncTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      caseStudyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      caseStudyTimersRef.current = [];
      pageSyncTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pageSyncTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setSyncEnabled(true);
          const projectsRes = await apiFetch<{ projects: ApiProject[] }>("/api/projects");
          if (!projectsRes.success) {
            throw new Error(projectsRes.error || "Failed to load projects.");
          }
          let projects = projectsRes.data.projects ?? [];

          if (!projects.length) {
            const createRes = await apiFetch<{ project: ApiProject }>("/api/projects", {
              method: "POST",
              body: JSON.stringify({ name: "Untitled Project", platform_type: "web" }),
            });
            if (createRes.success) {
              projects = [createRes.data.project];
            }
          }

          const pages: WorkspacePageData[] = [];
          for (const project of projects) {
            const pagesRes = await apiFetch<{ pages: ApiPage[] }>(
              `/api/projects/${project.id}/pages`
            );
            if (pagesRes.success) {
              const projectPages = pagesRes.data.pages ?? [];
              projectPages.forEach((page, index) => {
                pages.push(buildPageFromRecord(page, index));
              });
              if (!projectPages.length) {
                const createPageRes = await apiFetch<{ page: ApiPage }>(
                  `/api/projects/${project.id}/pages`,
                  {
                    method: "POST",
                    body: JSON.stringify({ name: "Untitled Page", metadata: null }),
                  }
                );
                if (createPageRes.success) {
                  pages.push(buildPageFromRecord(createPageRes.data.page, 0));
                }
              }
            }
          }

          const mappedProjects: ProjectFolder[] = projects.map((project) => ({
            id: project.id,
            name: project.name,
            platform: project.platform_type === "mobile" ? "mobile" : "web",
          }));

          const activeProjectId = mappedProjects[0]?.id ?? null;
          const activePageId =
            pages.find((page) => page.projectId === activeProjectId)?.id ||
            pages[0]?.id ||
            "";

          if (active) {
            dispatch({
              type: "RESET",
              state: {
                ...defaultState,
                platform:
                  projects[0]?.platform_type === "mobile" ? "mobile" : "web",
                projects: mappedProjects,
                pages,
                activeProjectId,
                activePageId,
              },
            });
            setView((prev) => ({ ...prev, selectedElementId: null }));
          }
        } else {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as PersistedState;
              if (!parsed || !Array.isArray(parsed.projects)) {
                throw new Error("Invalid storage shape");
              }
              const projects = parsed.projects.map((project) => ({
                id: project.id,
                name: project.name,
                platform:
                  project.platform === "mobile" || project.platform === "web"
                    ? project.platform
                    : parsed.platform === "mobile" || parsed.platform === "web"
                    ? parsed.platform
                    : defaultState.platform,
              }));
              let pages = parsed.projects.flatMap((project) =>
                (project.pages ?? []).map((page, index) => ({
                  ...page,
                  projectId: project.id,
                  canvasX:
                    typeof page.canvasX === "number"
                      ? page.canvasX
                      : 2000 + index * 60,
                  canvasY:
                    typeof page.canvasY === "number"
                      ? page.canvasY
                      : 2000 + index * 60,
                }))
              );
              pages = pages.map((page) => {
                const result = ensureTextChildren(page.elements);
                return result.changed ? { ...page, elements: result.elements } : page;
              });
              const activeProjectId = projects.some(
                (project) => project.id === parsed.activeProjectId
              )
                ? parsed.activeProjectId
                : null;
              const activePageId =
                (parsed.activePageId &&
                  pages.some((page) => page.id === parsed.activePageId) &&
                  parsed.activePageId) ||
                pages.find((page) => page.projectId === activeProjectId)?.id ||
                pages[0]?.id ||
                "";
              const activeProject = projects.find(
                (project) => project.id === activeProjectId
              );
              const platform: Platform =
                activeProject?.platform ||
                (parsed.platform === "mobile" || parsed.platform === "web"
                  ? parsed.platform
                  : defaultState.platform);
              if (active) {
                dispatch({
                  type: "RESET",
                  state: {
                    ...defaultState,
                    platform,
                    projects,
                    pages,
                    activeProjectId,
                    activePageId,
                  },
                });
                setView((prev) => ({ ...prev, selectedElementId: null }));
              }
            } catch {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        if (active) {
          setUi((prev) => ({
            ...prev,
            errorMessage: "Unable to load workspace. Please refresh.",
          }));
        }
      } finally {
        if (active) {
          hasHydratedRef.current = true;
          setHydrated(true);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !hasHydratedRef.current || syncEnabled) return;
    let viewport: PersistedState["viewport"];
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as PersistedState;
        viewport = parsed.viewport;
      } catch {
        viewport = undefined;
      }
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        ...serializeState(history.present),
        viewport,
      })
    );
  }, [history.present, hydrated, syncEnabled]);

  const state = history.present;

  const syncProject = async (projectId: string, payload: { name?: string; platform_type?: string | null }) => {
    if (!syncEnabled) return;
    await apiFetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  };

  const syncPage = (page: WorkspacePageData) => {
    if (!syncEnabled) return;
    const existing = pageSyncTimersRef.current.get(page.id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(async () => {
      let htmlContent: string | null = null;
      if (page.projectId) {
        const generated = generateProjectCode(state, page.projectId);
        const match = generated.pages.find((item) => item.id === page.id);
        htmlContent = match?.html ?? null;
      }
      await apiFetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: page.name,
          metadata: serializePageMetadata(page),
          html_content: htmlContent,
        }),
      });
      pageSyncTimersRef.current.delete(page.id);
    }, 400);
    pageSyncTimersRef.current.set(page.id, timer);
  };

  const isSameDesignState = (next: WorkspaceState, current: WorkspaceState) =>
    next === current ||
    (next.platform === current.platform &&
      next.activeProjectId === current.activeProjectId &&
      next.activePageId === current.activePageId &&
      next.projects === current.projects &&
      next.pages === current.pages);

  const commit = (next: WorkspaceState) => {
    if (isSameDesignState(next, state)) return;
    dispatch({ type: "COMMIT", state: next });
  };

  const setPresent = (next: WorkspaceState) =>
    dispatch({ type: "SET_PRESENT", state: next });

  const activePage = useMemo(
    () => state.pages.find((page) => page.id === state.activePageId),
    [state.pages, state.activePageId]
  );

  useEffect(() => {
    if (!view.selectedElementId) return;
    const exists = state.pages.some((page) =>
      page.elements.some((element) => element.id === view.selectedElementId)
    );
    if (!exists) {
      setView((prev) =>
        prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
      );
    }
  }, [state.pages, view.selectedElementId]);

  const setPlatform = (platform: Platform) => {
    if (platform === state.platform) return;
    commit({ ...state, platform });
    if (state.activeProjectId) {
      syncProject(state.activeProjectId, { platform_type: platform });
    }
  };

  const setViewMode = (mode: ViewMode) => {
    setView((prev) =>
      prev.viewMode === mode ? prev : { ...prev, viewMode: mode }
    );
  };

  const addProject = async (name: string) => {
    const trimmed = name.trim() || "Untitled Project";
    const basePage: WorkspacePageData = {
      id: createId(),
      name: "Untitled Page",
      projectId: null,
      prompt: "",
      elements: [],
      explanation: "",
      mvpPrompt: "",
      jsonOutline: "",
      canvasX: 2000,
      canvasY: 2000,
    };
    if (syncEnabled) {
      const result = await apiFetch<{ project: ApiProject }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          platform_type: state.platform,
        }),
      });
      if (!result.success) {
        setUi((prev) => ({
          ...prev,
          errorMessage: result.error || "Unable to create project.",
        }));
        return;
      }
      const project: ProjectFolder = {
        id: result.data.project.id,
        name: result.data.project.name,
        platform:
          result.data.project.platform_type === "mobile" ? "mobile" : "web",
      };
      const pageResult = await apiFetch<{ page: ApiPage }>(
        `/api/projects/${project.id}/pages`,
        {
          method: "POST",
          body: JSON.stringify({
            name: basePage.name,
            metadata: serializePageMetadata({ ...basePage, projectId: project.id }),
          }),
        }
      );
      const page = pageResult.success
        ? buildPageFromRecord(pageResult.data.page, state.pages.length)
        : { ...basePage, projectId: project.id };
      commit({
        ...state,
        projects: [...state.projects, project],
        pages: [...state.pages, page],
        activeProjectId: project.id,
        activePageId: page.id,
      });
      setView((prev) =>
        prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
      );
      return;
    }
    const project: ProjectFolder = {
      id: createId(),
      name: trimmed,
      platform: state.platform,
    };
    const page = { ...basePage, projectId: project.id };
    commit({
      ...state,
      projects: [...state.projects, project],
      pages: [...state.pages, page],
      activeProjectId: project.id,
      activePageId: page.id,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const renameProject = async (id: string, name: string) => {
    const projects = state.projects.map((project) =>
      project.id === id ? { ...project, name } : project
    );
    commit({ ...state, projects });
    if (syncEnabled) {
      await syncProject(id, { name });
    }
  };

  const setActiveProject = (id: string) => {
    if (id === state.activeProjectId) return;
    const pagesForProject = state.pages.filter((page) => page.projectId === id);
    const nextActivePageId =
      pagesForProject.find((page) => page.id === state.activePageId)?.id ??
      pagesForProject[0]?.id ??
      state.activePageId;
    const nextProject = state.projects.find((project) => project.id === id);
    const nextPlatform = nextProject?.platform ?? state.platform;
    commit({
      ...state,
      activeProjectId: id,
      activePageId: nextActivePageId,
      platform: nextPlatform,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const deleteProject = async (id: string) => {
    const projects = state.projects.filter((project) => project.id !== id);
    const pages = state.pages.filter((page) => page.projectId !== id);
    let nextActiveProjectId: string | null = state.activeProjectId;
    if (state.activeProjectId === id) {
      nextActiveProjectId = projects[0]?.id ?? null;
    }
    let nextActivePageId = state.activePageId;
    if (!pages.some((page) => page.id === nextActivePageId)) {
      nextActivePageId =
        pages.find((page) => page.projectId === nextActiveProjectId)?.id ??
        pages[0]?.id ??
        "";
    }
    commit({
      ...state,
      projects,
      pages,
      activeProjectId: nextActiveProjectId,
      activePageId: nextActivePageId,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
    if (syncEnabled) {
      await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    }
  };

  const setZoom = (zoom: number, _commitChange = true) => {
    const clamped = clamp(zoom, 0.6, 1.2);
    setView((prev) => (prev.zoom === clamped ? prev : { ...prev, zoom: clamped }));
  };

  const updateZoom = (delta: number) => {
    setZoom(view.zoom + delta);
  };

  const setSelectedElement = (id: string | null) => {
    setView((prev) =>
      prev.selectedElementId === id ? prev : { ...prev, selectedElementId: id }
    );
  };

  const addPage = async (name: string, projectIdOverride?: string) => {
    const projectId = projectIdOverride ?? state.activeProjectId;
    if (!projectId) return;
    const lastPage = state.pages[state.pages.length - 1];
    const nextX = lastPage ? lastPage.canvasX + 60 : 0;
    const nextY = lastPage ? lastPage.canvasY + 60 : 0;
    const basePage: WorkspacePageData = {
      id: createId(),
      name,
      projectId,
      prompt: "",
      elements: [],
      explanation: "",
      mvpPrompt: "",
      jsonOutline: "",
      canvasX: nextX,
      canvasY: nextY,
    };
    let page = basePage;
    if (syncEnabled) {
      const result = await apiFetch<{ page: ApiPage }>(
        `/api/projects/${projectId}/pages`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            metadata: serializePageMetadata(basePage),
          }),
        }
      );
      if (!result.success) {
        setUi((prev) => ({
          ...prev,
          errorMessage: result.error || "Unable to create page.",
        }));
        return;
      }
      page = buildPageFromRecord(result.data.page, state.pages.length);
    }
    commit({
      ...state,
      pages: [...state.pages, page],
      activeProjectId: projectId,
      activePageId: page.id,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const renamePage = async (id: string, name: string) => {
    const pages = state.pages.map((page) =>
      page.id === id ? { ...page, name } : page
    );
    commit({ ...state, pages });
    const updated = pages.find((page) => page.id === id);
    if (updated) {
      syncPage(updated);
    }
  };

  const duplicatePage = async (id: string) => {
    const page = state.pages.find((p) => p.id === id);
    if (!page) return;
    const duplicatedBase: WorkspacePageData = {
      ...page,
      id: createId(),
      name: `${page.name} Copy`,
      canvasX: page.canvasX + 60,
      canvasY: page.canvasY + 60,
    };
    let duplicated = duplicatedBase;
    if (syncEnabled && page.projectId) {
      const result = await apiFetch<{ page: ApiPage }>(
        `/api/projects/${page.projectId}/pages`,
        {
          method: "POST",
          body: JSON.stringify({
            name: duplicatedBase.name,
            metadata: serializePageMetadata(duplicatedBase),
          }),
        }
      );
      if (!result.success) {
        setUi((prev) => ({
          ...prev,
          errorMessage: result.error || "Unable to duplicate page.",
        }));
        return;
      }
      duplicated = buildPageFromRecord(result.data.page, state.pages.length);
    }
    commit({
      ...state,
      pages: [...state.pages, duplicated],
      activePageId: duplicated.id,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const deletePage = async (id: string) => {
    if (state.pages.length === 1) return;
    const pages = state.pages.filter((page) => page.id !== id);
    const nextActiveId =
      state.activePageId === id ? pages[0]?.id ?? "" : state.activePageId;
    commit({
      ...state,
      pages,
      activePageId: nextActiveId,
    });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
    if (syncEnabled) {
      await apiFetch(`/api/pages/${id}`, { method: "DELETE" });
    }
  };

  const setActivePage = (id: string) => {
    if (id === state.activePageId) return;
    commit({ ...state, activePageId: id });
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const updatePage = (id: string, changes: Partial<WorkspacePageData>) => {
    const pages = state.pages.map((page) =>
      page.id === id ? { ...page, ...changes } : page
    );
    commit({ ...state, pages });
    const updated = pages.find((page) => page.id === id);
    if (updated) {
      syncPage(updated);
    }
  };

  const updatePrompt = (prompt: string) => {
    if (!activePage) return;
    const pages = state.pages.map((page) =>
      page.id === activePage.id ? { ...page, prompt } : page
    );
    setPresent({ ...state, pages });
    const updated = pages.find((page) => page.id === activePage.id);
    if (updated) {
      syncPage(updated);
    }
    if (ui.errorMessage) {
      setUi((prev) => ({ ...prev, errorMessage: null }));
    }
  };

  const runPrompt = async (prompt: string) => {
    if (!activePage || ui.isGenerating) return;
    setUi((prev) => ({
      ...prev,
      isGenerating: true,
      generationMessage: "Building your design...",
      errorMessage: null,
    }));

    const start = performance.now();

    try {
      let generated: GeneratedLayout | null = null;
      const context = [
        `Platform: ${state.platform === "mobile" ? "Mobile" : "Web"}`,
        `Page: ${activePage.name}`,
      ].join("\n");

      if (syncEnabled && state.activeProjectId) {
        const result = await apiFetch<{ output: any }>("/api/ai/layout", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            context,
            project_id: state.activeProjectId,
          }),
        });
        if (result.success) {
          const output = result.data.output ?? {};
          const sections = normalizeAiSections(output.sections);
          if (sections.length) {
            const base = generateLayoutFromSections(sections, state.platform, prompt);
            generated = {
              ...base,
              explanation:
                typeof output.explanation === "string"
                  ? output.explanation
                  : base.explanation,
              mvpPrompt:
                typeof output.mvpPrompt === "string"
                  ? output.mvpPrompt
                  : base.mvpPrompt,
              jsonOutline:
                typeof output.jsonOutline === "string"
                  ? output.jsonOutline
                  : base.jsonOutline,
            };
          }
        }
      }

      if (!generated) {
        generated = generateLayoutFromPrompt(prompt, state.platform);
      }

      const pages = state.pages.map((page) => {
        if (page.id !== activePage.id) return page;
        const result = ensureTextChildren(generated!.elements);
        return {
          ...page,
          prompt,
          elements: result.elements,
          explanation: generated!.explanation,
          mvpPrompt: generated!.mvpPrompt,
          jsonOutline: generated!.jsonOutline,
        };
      });
      const nextState = {
        ...state,
        pages,
      };
      commit(nextState);
      const updated = pages.find((page) => page.id === activePage.id);
      if (updated) {
        syncPage(updated);
      }
      setView((prev) => ({
        ...prev,
        selectedElementId: generated.elements[0]?.id ?? null,
      }));
      const elapsed = performance.now() - start;
      const delay = Math.min(Math.max(500 - elapsed, 0), 800);
      window.setTimeout(() => {
        setUi((prev) => ({
          ...prev,
          isGenerating: false,
          generationMessage: "",
          errorMessage: null,
        }));
      }, delay);
    } catch (error) {
      setUi((prev) => ({
        ...prev,
        isGenerating: false,
        generationMessage: "",
        errorMessage: "Unable to build layout. Please refine the prompt.",
      }));
    }
  };

  const updateElement = (
    id: string,
    changes: Partial<CanvasElement>,
    commitChange = true
  ) => {
    if (!activePage) return;
    const pages = state.pages.map((page) =>
      page.id === activePage.id
        ? {
            ...page,
            elements: page.elements.map((element) =>
              element.id === id ? { ...element, ...changes } : element
            ),
          }
        : page
    );
    const next = { ...state, pages };
    commitChange ? commit(next) : setPresent(next);
    const updated = pages.find((page) => page.id === activePage.id);
    if (updated) {
      syncPage(updated);
    }
  };

  const addElement = (element: CanvasElement) => {
    if (!activePage) return;
    const pages = state.pages.map((page) =>
      page.id === activePage.id
        ? { ...page, elements: [...page.elements, element] }
        : page
    );
    commit({
      ...state,
      pages,
    });
    const updated = pages.find((page) => page.id === activePage.id);
    if (updated) {
      syncPage(updated);
    }
    setView((prev) => ({ ...prev, selectedElementId: element.id }));
  };

  const removeElement = (id: string) => {
    if (!activePage) return;
    const pages = state.pages.map((page) =>
      page.id === activePage.id
        ? { ...page, elements: page.elements.filter((el) => el.id !== id) }
        : page
    );
    commit({
      ...state,
      pages,
    });
    const updated = pages.find((page) => page.id === activePage.id);
    if (updated) {
      syncPage(updated);
    }
    setView((prev) =>
      prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
    );
  };

  const showCaseStudyToast = (message: string) => {
    caseStudyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    caseStudyTimersRef.current = [];
    setUi((prev) => ({
      ...prev,
      caseStudyToast: { message, visible: true },
    }));
    caseStudyTimersRef.current.push(
      window.setTimeout(() => {
        setUi((prev) =>
          prev.caseStudyToast
            ? { ...prev, caseStudyToast: { ...prev.caseStudyToast, visible: false } }
            : prev
        );
      }, 2500)
    );
    caseStudyTimersRef.current.push(
      window.setTimeout(() => {
        setUi((prev) => ({ ...prev, caseStudyToast: null }));
      }, 3000)
    );
  };

  const generateCaseStudyPpt = async () => {
    const projectId = state.activeProjectId;
    const pages = projectId ? getProjectPages(state, projectId) : [];
    if (!projectId || pages.length === 0) return;
    if (ui.caseStudyGenerating) return;
    setUi((prev) => ({ ...prev, caseStudyGenerating: true }));
    const project = state.projects.find((item) => item.id === projectId);
    const projectName = normalizeLabel(project?.name, "Untitled Project");
    const platformLabel = state.platform === "mobile" ? "Mobile" : "Web";
    const pageNames = pages.map((page, index) => normalizeLabel(page.name, `Page ${index + 1}`));
    const allElements = pages.flatMap((page) =>
      page.elements.filter((el) => !el.isGhost && el.type !== "background")
    );
    const elementTypes = new Set(allElements.map((el) => el.type));
    const hasNav = elementTypes.has("navbar");
    const hasForms = elementTypes.has("form") || elementTypes.has("input");
    const hasCards = elementTypes.has("card") || elementTypes.has("features");
    const hasSettings = pageNames.some((name) => name.toLowerCase().includes("settings"));
    const combinedName = `${projectName} ${pageNames.join(" ")}`.trim();
    const audience = inferAudience(combinedName);
    const productType = inferProductType(projectName);
    const authNeeded = pageNames.some((name) =>
      includesAny(name.toLowerCase(), ["login", "sign in", "signup", "onboarding"])
    );
    const slides = buildCaseStudySlides({
      projectName,
      platformLabel,
      productType,
      audience,
      pageNames,
      hasNav,
      hasForms,
      hasCards,
      hasSettings,
      authNeeded,
    });

    try {
      const { default: PptxGenJS } = await import("pptxgenjs");
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "Framebase";
      pptx.company = "Framebase";
      (pptx as any).theme = {
        headFontFace: "Aptos",
        bodyFontFace: "Aptos",
        lang: "en-US",
      };

      const slideWidth = 13.33;
      const slideHeight = 7.5;
      const marginX = 0.7;
      const marginY = 0.5;
      const titleY = 0.5;
      const titleH = 0.6;
      const subtitleY = 1.2;
      const contentY = 1.7;
      const gutter = 0.4;
      const leftColW = 7.1;
      const rightColW = slideWidth - marginX * 2 - leftColW - gutter;
      const accentFill = "EEF2FF";
      const accentColor = "4F46E5";
      const textColor = "111827";
      const subTextColor = "4B5563";

      const addBackground = (slide: any) => {
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: slideWidth,
          h: slideHeight,
          fill: { color: "F8FAFC" },
          line: { color: "F8FAFC" },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 0.2,
          h: slideHeight,
          fill: { color: accentColor },
          line: { color: accentColor },
        });
      };

      const addTitle = (
        slide: any,
        title: string,
        subtitle?: string,
        align: "left" | "center" = "left"
      ) => {
        slide.addText(title, {
          x: marginX,
          y: titleY,
          w: slideWidth - marginX * 2,
          h: titleH,
          fontSize: 34,
          bold: true,
          color: textColor,
          align,
        });
        if (subtitle) {
          slide.addText(subtitle, {
            x: marginX,
            y: subtitleY,
            w: slideWidth - marginX * 2,
            h: 0.4,
            fontSize: 18,
            color: subTextColor,
            align,
          });
        }
      };

      const addBulletBlock = (
        slide: any,
        items: string[],
        x: number,
        y: number,
        w: number,
        h: number
      ) => {
        const trimmed = items.slice(0, 6);
        slide.addText(trimmed.join("\n"), {
          x,
          y,
          w,
          h,
          fontSize: 18,
          color: "374151",
          bullet: { indent: 18 },
          lineSpacingMultiple: 1.2,
        });
      };

      const addColumnHeader = (slide: any, title: string, x: number, y: number, w: number) => {
        slide.addText(title, {
          x,
          y,
          w,
          h: 0.3,
          fontSize: 14,
          color: subTextColor,
          bold: true,
        });
      };

      const renderTemplateA = (slide: any, data: CaseStudySlide) => {
        addBackground(slide);
        addTitle(slide, data.title, data.subtitle);
        addColumnHeader(slide, data.leftTitle ?? "Details", marginX, contentY, leftColW);
        addBulletBlock(slide, data.left ?? [], marginX, contentY + 0.4, leftColW, 4.8);
        const rightX = marginX + leftColW + gutter;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: rightX,
          y: contentY,
          w: rightColW,
          h: 4.8,
          fill: { color: accentFill },
          line: { color: accentFill },
          radius: 0.1,
        });
        addColumnHeader(
          slide,
          data.rightTitle ?? "Highlights",
          rightX + 0.3,
          contentY + 0.2,
          rightColW - 0.6
        );
        addBulletBlock(
          slide,
          data.right ?? [],
          rightX + 0.3,
          contentY + 0.7,
          rightColW - 0.6,
          4.0
        );
      };

      const renderTemplateB = (slide: any, data: CaseStudySlide) => {
        addBackground(slide);
        addTitle(slide, data.title, data.subtitle, "center");
        const bullets = data.bullets ?? [];
        const split = bullets.length > 4 ? Math.ceil(bullets.length / 2) : bullets.length;
        const leftItems = bullets.slice(0, split);
        const rightItems = bullets.slice(split);
        if (rightItems.length) {
          addBulletBlock(slide, leftItems, marginX, 2.4, 5.8, 3.8);
          addBulletBlock(slide, rightItems, marginX + 6.2, 2.4, 5.8, 3.8);
        } else {
          addBulletBlock(slide, leftItems, marginX + 1.2, 2.4, 9.8, 3.8);
        }
      };

      const renderTemplateC = (slide: any, data: CaseStudySlide) => {
        addBackground(slide);
        addTitle(slide, data.title, data.subtitle);
        const colW = (slideWidth - marginX * 2 - gutter) / 2;
        addColumnHeader(slide, data.leftTitle ?? "Left", marginX, contentY, colW);
        addBulletBlock(slide, data.left ?? [], marginX, contentY + 0.4, colW, 4.6);
        const rightX = marginX + colW + gutter;
        addColumnHeader(slide, data.rightTitle ?? "Right", rightX, contentY, colW);
        addBulletBlock(slide, data.right ?? [], rightX, contentY + 0.4, colW, 4.6);
      };

      const renderTemplateD = (slide: any, data: CaseStudySlide) => {
        addBackground(slide);
        addTitle(slide, data.title, data.subtitle);
        const persona = data.persona;
        if (!persona) return;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: marginX,
          y: contentY,
          w: 5.4,
          h: 4.8,
          fill: { color: accentFill },
          line: { color: accentFill },
          radius: 0.12,
        });
        slide.addText(persona.name, {
          x: marginX + 0.4,
          y: contentY + 0.4,
          w: 4.6,
          h: 0.4,
          fontSize: 22,
          bold: true,
          color: textColor,
        });
        slide.addText(persona.role, {
          x: marginX + 0.4,
          y: contentY + 0.9,
          w: 4.6,
          h: 0.3,
          fontSize: 14,
          color: subTextColor,
        });
        slide.addText(`Goals: ${persona.goals}\nFrustrations: ${persona.frustrations}`, {
          x: marginX + 0.4,
          y: contentY + 1.5,
          w: 4.6,
          h: 2.5,
          fontSize: 14,
          color: "374151",
        });
        const rightX = marginX + 5.8;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: rightX,
          y: contentY,
          w: slideWidth - marginX - rightX,
          h: 4.8,
          fill: { color: "FFFFFF" },
          line: { color: "E5E7EB" },
          radius: 0.12,
        });
        addColumnHeader(slide, "Motivations", rightX + 0.3, contentY + 0.3, 6);
        slide.addText(persona.motivations, {
          x: rightX + 0.3,
          y: contentY + 0.8,
          w: slideWidth - marginX - rightX - 0.6,
          h: 3.6,
          fontSize: 16,
          color: "374151",
        });
      };

      slides.forEach((slideData) => {
        const slide = pptx.addSlide();
        if (slideData.template === "A") renderTemplateA(slide, slideData);
        if (slideData.template === "B") renderTemplateB(slide, slideData);
        if (slideData.template === "C") renderTemplateC(slide, slideData);
        if (slideData.template === "D") renderTemplateD(slide, slideData);
      });

      const blob = (await pptx.write({ outputType: "blob" })) as Blob;
      const fileName = `${toFileName(projectName, "Project")}_Case_Study.pptx`;
      setUi((prev) => ({
        ...prev,
        caseStudyOpen: true,
        caseStudySlides: slides,
        caseStudyProjectName: projectName,
        caseStudyFileName: fileName,
        caseStudyBlob: blob,
      }));
    } catch {
      // ignore failures
    } finally {
      setUi((prev) => ({ ...prev, caseStudyGenerating: false }));
    }
  };

  const downloadCaseStudyPpt = () => {
    if (!ui.caseStudyBlob || !ui.caseStudyFileName) return;
    const url = URL.createObjectURL(ui.caseStudyBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ui.caseStudyFileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 200);
    showCaseStudyToast("Case Study downloaded successfully.");
  };

  const closeCaseStudyPreview = () =>
    setUi((prev) => ({
      ...prev,
      caseStudyOpen: false,
    }));

  const value: WorkspaceContextValue = useMemo(() => ({
    state,
    view,
    ui,
    generateMvpPrompt: (projectId: string) => generateMvpPrompt(state, projectId),
    generateProjectAnalysis: (projectId: string) => generateProjectAnalysis(state, projectId),
    generateProjectCode: (projectId: string) => generateProjectCode(state, projectId),
    generateCaseStudyPpt,
    downloadCaseStudyPpt,
    closeCaseStudyPreview,
    setPlatform,
    setViewMode,
    addProject,
    renameProject,
    setActiveProject,
    deleteProject,
    setZoom,
    updateZoom,
    setSelectedElement,
    addPage,
    renamePage,
    duplicatePage,
    deletePage,
    setActivePage,
    updatePage,
    updatePrompt,
    runPrompt,
    updateElement,
    addElement,
    removeElement,
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
    openExport: () => setUi((prev) => ({ ...prev, exportOpen: true })),
    closeExport: () => setUi((prev) => ({ ...prev, exportOpen: false })),
    openKnowYourDesign: () => {
      const projectId = state.activeProjectId;
      const projectPages = projectId ? getProjectPages(state, projectId) : [];
      if (!projectId || projectPages.length === 0) return;
      setUi((prev) => ({
        ...prev,
        knowYourDesignOpen: true,
        knowYourDesignScope: "project",
      }));
    },
    closeKnowYourDesign: () =>
      setUi((prev) => ({
        ...prev,
        knowYourDesignOpen: false,
        knowYourDesignScope: "page",
      })),
    openPromptGenerator: () => {
      const projectId = state.activeProjectId;
      const projectPages = projectId ? getProjectPages(state, projectId) : [];
      if (!projectId || projectPages.length === 0) return;
      setUi((prev) => ({
        ...prev,
        promptGeneratorOpen: true,
        promptGeneratorScope: "project",
      }));
    },
    closePromptGenerator: () =>
      setUi((prev) => ({
        ...prev,
        promptGeneratorOpen: false,
        promptGeneratorScope: "page",
      })),
    openProjectCode: () => {
      const projectId = state.activeProjectId;
      const projectPages = projectId ? getProjectPages(state, projectId) : [];
      if (!projectId || projectPages.length === 0) return;
      setUi((prev) => ({
        ...prev,
        projectCodeOpen: true,
      }));
    },
    closeProjectCode: () =>
      setUi((prev) => ({
        ...prev,
        projectCodeOpen: false,
      })),
    openSettings: () => setUi((prev) => ({ ...prev, settingsOpen: true })),
    closeSettings: () => setUi((prev) => ({ ...prev, settingsOpen: false })),
    closeActiveProject: () => {
      if (!state.activeProjectId) return;
      commit({ ...state, activeProjectId: null, activePageId: "" });
      setView((prev) =>
        prev.selectedElementId ? { ...prev, selectedElementId: null } : prev
      );
    },
    openPlatformLock: () =>
      setUi((prev) => ({ ...prev, platformLockOpen: true })),
    closePlatformLock: () =>
      setUi((prev) => ({ ...prev, platformLockOpen: false })),
    setError: (message: string | null) =>
      setUi((prev) => ({ ...prev, errorMessage: message })),
  }), [state, view, ui, setPlatform, setViewMode, addProject, renameProject, setActiveProject, deleteProject, setZoom, updateZoom, setSelectedElement, addPage, renamePage, duplicatePage, deletePage, setActivePage, updatePage, updatePrompt, runPrompt, updateElement, addElement, removeElement, generateMvpPrompt, generateProjectAnalysis, generateProjectCode, generateCaseStudyPpt, downloadCaseStudyPpt, closeCaseStudyPreview]);

  if (!hydrated) {
    return <LoadingScreen message="Loading your workspace..." />;
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
