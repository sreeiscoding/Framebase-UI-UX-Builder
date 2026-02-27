"use client";

import type { CanvasElement, Platform } from "./workspace-context";

export interface GeneratedLayout {
  elements: CanvasElement[];
  explanation: string;
  mvpPrompt: string;
  jsonOutline: string;
}

export type ElementType = CanvasElement["type"];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2, 10)}`;

const ELEMENT_PRESETS: Record<
  ElementType,
  {
    label: string;
    height: number;
    padding: number;
    align: CanvasElement["align"];
    background: CanvasElement["background"];
    color: CanvasElement["color"];
  }
> = {
  navbar: {
    label: "Header / Navbar",
    height: 72,
    padding: 20,
    align: "left",
    background: "surface",
    color: "default",
  },
  hero: {
    label: "Hero",
    height: 260,
    padding: 28,
    align: "center",
    background: "accent",
    color: "default",
  },
  features: {
    label: "Features",
    height: 220,
    padding: 24,
    align: "left",
    background: "surface",
    color: "default",
  },
  pricing: {
    label: "Pricing",
    height: 220,
    padding: 24,
    align: "center",
    background: "surface",
    color: "default",
  },
  form: {
    label: "Form / Input",
    height: 190,
    padding: 24,
    align: "left",
    background: "muted",
    color: "default",
  },
  cta: {
    label: "Call To Action",
    height: 160,
    padding: 24,
    align: "center",
    background: "accent",
    color: "default",
  },
  footer: {
    label: "Footer",
    height: 140,
    padding: 20,
    align: "left",
    background: "muted",
    color: "muted",
  },
  section: {
    label: "Content Section",
    height: 180,
    padding: 24,
    align: "left",
    background: "surface",
    color: "default",
  },
  text: {
    label: "Text",
    height: 60,
    padding: 12,
    align: "left",
    background: "surface",
    color: "default",
  },
  heading: {
    label: "Heading",
    height: 80,
    padding: 16,
    align: "left",
    background: "surface",
    color: "default",
  },
  paragraph: {
    label: "Paragraph",
    height: 100,
    padding: 12,
    align: "left",
    background: "surface",
    color: "default",
  },
  background: {
    label: "Background",
    height: 0,
    padding: 0,
    align: "left",
    background: "surface",
    color: "default",
  },
  button: {
    label: "Button",
    height: 48,
    padding: 12,
    align: "center",
    background: "accent",
    color: "default",
  },
  image: {
    label: "Image",
    height: 200,
    padding: 0,
    align: "center",
    background: "muted",
    color: "default",
  },
  container: {
    label: "Container",
    height: 200,
    padding: 16,
    align: "left",
    background: "surface",
    color: "default",
  },
  card: {
    label: "Card",
    height: 280,
    padding: 20,
    align: "left",
    background: "surface",
    color: "default",
  },
  input: {
    label: "Input Field",
    height: 44,
    padding: 12,
    align: "left",
    background: "muted",
    color: "default",
  },
};

const KEYWORD_MAP: { type: ElementType; keywords: string[] }[] = [
  { type: "navbar", keywords: ["nav", "navbar", "header", "top bar"] },
  { type: "hero", keywords: ["hero", "headline", "intro", "value prop"] },
  {
    type: "features",
    keywords: ["feature", "benefit", "highlights", "capabilities", "cards"],
  },
  { type: "pricing", keywords: ["pricing", "plans", "tiers", "subscription"] },
  { type: "form", keywords: ["form", "signup", "sign up", "contact", "input"] },
  { type: "cta", keywords: ["cta", "call to action", "get started", "trial"] },
  { type: "footer", keywords: ["footer", "links", "legal"] },
];

const DEFAULT_ORDER: ElementType[] = [
  "navbar",
  "hero",
  "features",
  "pricing",
  "cta",
  "footer",
];

const dedupe = (items: ElementType[]) => {
  const seen = new Set<ElementType>();
  return items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
};

const buildSections = (prompt: string): ElementType[] => {
  const normalized = prompt.toLowerCase();
  const matched = KEYWORD_MAP.filter(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  ).map(({ type }) => type);

  if (matched.length === 0) return DEFAULT_ORDER;
  const ordered = DEFAULT_ORDER.filter((item) => matched.includes(item));
  const extras = matched.filter((item) => !ordered.includes(item));
  return dedupe([...ordered, ...extras]);
};

const formatLabelList = (items: ElementType[]) =>
  items.map((item) => ELEMENT_PRESETS[item].label).join(", ");

const buildElementsFromSections = (sections: ElementType[], platform: Platform) => {
  const frameWidth = platform === "web" ? 1200 : 428;
  const horizontalPadding = platform === "web" ? 80 : 24;
  const gap = platform === "web" ? 32 : 24;
  let cursorY = platform === "web" ? 64 : 48;
  const bgColorMap: Record<string, string> = {
    surface: "#ffffff",
    muted: "#f5f5f5",
    accent: "#eef2ff",
  };
  const textColorMap: Record<string, string> = {
    default: "#1f2937",
    muted: "#6b7280",
  };

  return sections.map((section) => {
    const preset = ELEMENT_PRESETS[section];
    const width = Math.max(frameWidth - horizontalPadding * 2, 280);
    const element: CanvasElement = {
      id: createId(),
      type: section,
      label: preset.label,
      x: horizontalPadding,
      y: cursorY,
      width,
      height: preset.height,
      content: `Click to edit ${preset.label.toLowerCase()}...`,
      padding: preset.padding,
      align: preset.align,
      background: preset.background,
      color: preset.color,
      style: {
        paddingTop: preset.padding,
        paddingRight: preset.padding,
        paddingBottom: preset.padding,
        paddingLeft: preset.padding,
        backgroundColor: bgColorMap[preset.background || "surface"] || "#ffffff",
        textAlign: preset.align || "left",
        color: textColorMap[preset.color || "default"] || "#1f2937",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: "400",
        zIndex: 1,
      },
    };
    cursorY += preset.height + gap;
    return element;
  });
};

export const generateLayoutFromSections = (
  sections: ElementType[],
  platform: Platform,
  prompt: string
): GeneratedLayout => {
  const normalizedSections = sections.length ? sections : DEFAULT_ORDER;
  const spacingScale = platform === "web" ? "12 / 20 / 32" : "8 / 16 / 24";
  const elements = buildElementsFromSections(normalizedSections, platform);

  const pageName = prompt.toLowerCase().includes("pricing")
    ? "Pricing Page"
    : "Landing Page";

  const jsonOutline = JSON.stringify(
    {
      pageName,
      platform,
      sections: normalizedSections.map((section) => ({
        type: section,
        label: ELEMENT_PRESETS[section].label,
        layout: {
          x: elements.find((el) => el.type === section)?.x ?? 0,
          y: elements.find((el) => el.type === section)?.y ?? 0,
          width: elements.find((el) => el.type === section)?.width ?? 0,
          height: elements.find((el) => el.type === section)?.height ?? 0,
        },
      })),
      spacingScale,
    },
    null,
    2
  );

  return {
    elements,
    explanation: buildExplanation({
      pageName,
      platform,
      sections: normalizedSections,
      spacing: spacingScale,
    }),
    mvpPrompt: buildMvpPrompt({
      platform,
      prompt,
      sections: normalizedSections,
      spacing: spacingScale,
    }),
    jsonOutline,
  };
};

const buildExplanation = ({
  pageName,
  platform,
  sections,
  spacing,
}: {
  pageName: string;
  platform: Platform;
  sections: ElementType[];
  spacing: string;
}) => {
  const hierarchy = sections
    .map((section, index) => `${index + 1}. ${ELEMENT_PRESETS[section].label}`)
    .join("\n");
  return [
    `Page name: ${pageName}`,
    `Platform: ${platform === "web" ? "Web" : "Mobile"}`,
    "Section hierarchy:",
    hierarchy,
    "Component breakdown:",
    "Header elements, primary call-to-action, modular content blocks, supportive footer.",
    "Layout description:",
    "Clear vertical rhythm with strong hero emphasis followed by scannable blocks.",
    `Suggested spacing scale: ${spacing}`,
    "Why this structure:",
    "Balances narrative flow with conversion focus while keeping scan depth short.",
    "UX reasoning:",
    "Top-heavy value prop, mid-page proof, and repeated CTA improve intent clarity.",
    "Suggested improvements:",
    "Add testimonials or trust badges if the product needs stronger social proof.",
  ].join("\n");
};

const buildMvpPrompt = ({
  platform,
  prompt,
  sections,
  spacing,
}: {
  platform: Platform;
  prompt: string;
  sections: ElementType[];
  spacing: string;
}) => {
  const fullPrompt = [
    `Platform: ${platform === "web" ? "Web" : "Mobile"}`,
    `Design Brief: ${prompt.trim() || "Describe the UI layout and sections."}`,
    `Sections: ${formatLabelList(sections)}`,
    `Spacing Scale: ${spacing}`,
    "Notes: Use clean SaaS layout patterns with strong hierarchy and clear CTA.",
  ].join("\n");

  const shortPrompt = `${platform === "web" ? "Web" : "Mobile"} layout with ${formatLabelList(
    sections
  )}. Keep spacing ${spacing} and modern SaaS hierarchy.`;

  return `Full Prompt:\n${fullPrompt}\n\nShort Prompt:\n${shortPrompt}`;
};

export const generateLayoutFromPrompt = (
  prompt: string,
  platform: Platform
): GeneratedLayout => {
  const sections = buildSections(prompt);
  return generateLayoutFromSections(sections, platform, prompt);
};
