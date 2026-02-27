"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faSwatchbook,
  faArrowsLeftRight,
  faTrash,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { useMemo } from "react";
import { useWorkspace } from "./workspace-context";

const COLOR_OPTIONS = [
  { value: "#ffffff", label: "White" },
  { value: "#f5f5f5", label: "Light Gray" },
  { value: "#eef2ff", label: "Light Indigo" },
  { value: "#1f2937", label: "Dark" },
  { value: "#4f46e5", label: "Indigo" },
  { value: "#6b7280", label: "Gray" },
];

const FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Courier New",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
];

export default function WorkspaceInspector() {
  const { state, view, updateElement, removeElement, addElement } = useWorkspace();

  const activePage = useMemo(
    () => state.pages.find((page) => page.id === state.activePageId),
    [state.pages, state.activePageId]
  );

  const selected = activePage?.elements.find(
    (element) => element.id === view.selectedElementId
  );

  const isTextElement = selected && ["text", "heading", "paragraph", "button", "input"].includes(selected.type);
  const showBoxControls = !isTextElement;

  const handleDuplicate = () => {
    if (!selected) return;
    const duplicated = {
      ...selected,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `id_${Math.random().toString(36).slice(2, 10)}`,
      x: selected.x + 20,
      y: selected.y + 20,
    };
    addElement(duplicated);
  };

  if (!selected) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Select an element to edit properties.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 max-h-150 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {selected.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selected.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDuplicate}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400"
            title="Duplicate element"
          >
            <FontAwesomeIcon icon={faCopy} className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => removeElement(selected.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
            title="Delete element"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Spacing Control */}
      <div className="mt-5 space-y-5 text-sm">
        {showBoxControls ? (
          <>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
            <FontAwesomeIcon icon={faArrowsLeftRight} className="text-[10px]" />
            Spacing
          </div>
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={selected.style?.paddingTop || selected.padding || 12}
            onChange={(event) => {
              const newPadding = Number(event.target.value);
              updateElement(selected.id, {
                padding: newPadding,
                style: {
                  ...selected.style,
                  paddingTop: newPadding,
                  paddingRight: newPadding,
                  paddingBottom: newPadding,
                  paddingLeft: newPadding,
                },
              });
            }}
            className="mt-3 w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Padding: {selected.style?.paddingTop || selected.padding || 0}px
          </div>
        </div>

        {/* Border Radius - Regular */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            ◊ Border Radius
          </div>
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={selected.style?.borderRadius || 0}
            onChange={(event) => {
              const newRadius = Number(event.target.value);
              updateElement(selected.id, {
                style: {
                  ...selected.style,
                  borderRadius: newRadius,
                },
              });
            }}
            className="w-full accent-indigo-600"
          />
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            All corners: {selected.style?.borderRadius || 0}px
          </div>
        </div>

        {/* Border Radius - Individual Corners */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "borderRadiusTopLeft", label: "Top Left" },
            { key: "borderRadiusTopRight", label: "Top Right" },
            { key: "borderRadiusBottomLeft", label: "Bottom Left" },
            { key: "borderRadiusBottomRight", label: "Bottom Right" },
          ].map((corner) => (
            <div key={corner.key}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {corner.label}
              </label>
              <input
                type="number"
                min={0}
                max={32}
                value={(selected.style as any)?.[corner.key] || 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      [corner.key]: value,
                    },
                  });
                }}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950"
              />
            </div>
          ))}
        </div>

        {/* Border Properties */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Border
          </div>
          <div className="space-y-2">
            {/* Border Width */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Width: {selected.style?.borderWidth || 0}px
              </label>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={selected.style?.borderWidth || 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      borderWidth: value,
                    },
                  });
                }}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Border Style */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Style
              </label>
              <div className="mt-2 flex gap-2">
                {["solid", "dashed", "dotted"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          borderStyle: style as any,
                        },
                      });
                    }}
                    className={`flex-1 rounded border px-2 py-1 text-xs font-semibold transition ${
                      selected.style?.borderStyle === style
                        ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Color */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Color
              </label>
              <input
                type="color"
                value={selected.style?.borderColor || "#000000"}
                onChange={(event) => {
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      borderColor: event.target.value,
                    },
                  });
                }}
                className="mt-2 h-8 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Background Color */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            <FontAwesomeIcon icon={faSwatchbook} className="text-[10px]" />
            Background
          </div>
          <div className="space-y-3">
            {/* Solid Color Picker */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-2">
                Solid Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selected.style?.backgroundColor || "#ffffff"}
                  onChange={(event) => {
                    updateElement(selected.id, {
                      style: {
                        ...selected.style,
                        backgroundColor: event.target.value,
                      },
                    });
                  }}
                  className="h-12 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
                  title="Pick a color"
                />
                <input
                  type="text"
                  value={selected.style?.backgroundColor || "#ffffff"}
                  onChange={(event) => {
                    updateElement(selected.id, {
                      style: {
                        ...selected.style,
                        backgroundColor: event.target.value,
                      },
                    });
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Preset Colors */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-2">
                Presets
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          backgroundColor: option.value,
                        },
                      })
                    }
                    className={`h-8 rounded border-2 transition ${
                      selected.style?.backgroundColor === option.value
                        ? "border-indigo-400 ring-2 ring-indigo-300 dark:ring-indigo-500/30"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Gradient Background */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-2">
                Gradient
              </label>
              <div className="space-y-2">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          backgroundGradient:
                            "linear-gradient(90deg, #4f46e5 0%, #ec4899 100%)",
                        },
                      })
                    }
                    className="flex-1 rounded px-2 py-1 text-xs font-semibold border border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600 bg-linear-to-r from-indigo-500 to-pink-500 text-white"
                  >
                    Purple→Pink
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          backgroundGradient:
                            "linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)",
                        },
                      })
                    }
                    className="flex-1 rounded px-2 py-1 text-xs font-semibold border border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600 bg-linear-to-r from-cyan-400 to-cyan-600 text-white"
                  >
                    Cyan
                  </button>
                </div>
                <textarea
                  value={selected.style?.backgroundGradient || ""}
                  onChange={(event) => {
                    updateElement(selected.id, {
                      style: {
                        ...selected.style,
                        backgroundGradient: event.target.value,
                      },
                    });
                  }}
                  placeholder="e.g., linear-gradient(90deg, #4f46e5 0%, #ec4899 100%)"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  rows={2}
                />
                {selected.style?.backgroundGradient && (
                  <div
                    className="h-16 rounded border border-gray-300 dark:border-gray-700"
                    style={{ background: selected.style.backgroundGradient }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

          </>
        ) : null}

        {/* Alignment Control */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            <FontAwesomeIcon icon={faAlignLeft} className="text-[10px]" />
            Alignment
          </div>
          <div className="flex items-center gap-2">
            {([
              { id: "left", icon: faAlignLeft },
              { id: "center", icon: faAlignCenter },
              { id: "right", icon: faAlignRight },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateElement(selected.id, {
                  align: item.id,
                  style: {
                    ...selected.style,
                    textAlign: item.id,
                  },
                })}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                  (selected.style?.textAlign || selected.align) === item.id
                    ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-xs" />
              </button>
            ))}
          </div>
        </div>

        {/* Text Properties */}
        {isTextElement ? (
          <>
            {/* Text Content */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Content
              </label>
              <textarea
                value={selected.content || ""}
                onChange={(event) => {
                  updateElement(selected.id, {
                    content: event.target.value,
                  });
                }}
                className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                rows={3}
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Font Family
              </label>
              <select
                value={selected.style?.fontFamily || "Arial"}
                onChange={(event) => {
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      fontFamily: event.target.value,
                    },
                  });
                }}
                className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Font Size: {selected.style?.fontSize || 14}px
              </label>
              <input
                type="range"
                min={8}
                max={72}
                step={1}
                value={selected.style?.fontSize || 14}
                onChange={(event) => {
                  const newSize = Number(event.target.value);
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      fontSize: newSize,
                    },
                  });
                }}
                className="mt-2 w-full accent-indigo-600"
              />
            </div>

            {/* Font Weight */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Font Weight
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["300", "400", "500", "600", "700", "800", "900"].map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          fontWeight: weight as any,
                        },
                      })
                    }
                    className={`rounded border px-2 py-1 text-xs font-semibold transition ${
                      (selected.style?.fontWeight || "400") === weight
                        ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
                  >
                    {weight}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Line Height: {selected.style?.lineHeight || 1.5}
              </label>
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.1}
                value={selected.style?.lineHeight || 1.5}
                onChange={(event) => {
                  const newLineHeight = Number(event.target.value);
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      lineHeight: newLineHeight,
                    },
                  });
                }}
                className="mt-2 w-full accent-indigo-600"
              />
            </div>

            {/* Text Color */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Text Color
              </label>
              <input
                type="color"
                value={selected.style?.color || "#1f2937"}
                onChange={(event) => {
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      color: event.target.value,
                    },
                  });
                }}
                className="mt-2 h-10 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
            </div>

            {/* Letter Spacing */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Letter Spacing: {selected.style?.letterSpacing || 0}px
              </label>
              <input
                type="range"
                min={-2}
                max={8}
                step={0.5}
                value={selected.style?.letterSpacing || 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateElement(selected.id, {
                    style: {
                      ...selected.style,
                      letterSpacing: value,
                    },
                  });
                }}
                className="mt-2 w-full accent-indigo-600"
              />
            </div>

            {/* Text Transform */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Text Transform
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["none", "uppercase", "lowercase", "capitalize"].map((transform) => (
                  <button
                    key={transform}
                    type="button"
                    onClick={() =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          textTransform: transform as any,
                        },
                      })
                    }
                    className={`rounded border px-2 py-1 text-xs font-semibold transition capitalize ${
                      (selected.style?.textTransform || "none") === transform
                        ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
                  >
                    {transform}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {/* Opacity Control (for all elements) */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Opacity: {Math.round((selected.style?.opacity ?? 1) * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={selected.style?.opacity ?? 1}
            onChange={(event) => {
              const value = Number(event.target.value);
              updateElement(selected.id, {
                style: {
                  ...selected.style,
                  opacity: value,
                },
              });
            }}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>
      </div>
    </section>
  );
}
