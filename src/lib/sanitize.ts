import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "html",
  "head",
  "body",
  "main",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "button",
  "img",
  "form",
  "label",
  "input",
  "textarea",
];

const GLOBAL_ATTRS = ["class", "id", "role", "aria-label", "aria-hidden", "data-name"];

export const sanitizeWorkspaceHtml = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": GLOBAL_ATTRS,
      a: ["href", "target", "rel", ...GLOBAL_ATTRS],
      img: ["src", "alt", "width", "height", ...GLOBAL_ATTRS],
      input: ["type", "name", "value", "placeholder", "checked", "disabled", ...GLOBAL_ATTRS],
      textarea: ["name", "placeholder", "rows", "cols", ...GLOBAL_ATTRS],
      button: ["type", "disabled", ...GLOBAL_ATTRS],
      form: ["action", "method", ...GLOBAL_ATTRS],
      label: ["for", ...GLOBAL_ATTRS],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    disallowedTagsMode: "discard",
  });
