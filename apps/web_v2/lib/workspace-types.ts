export type WorkspaceEntry =
  | {
      readonly type: "dir";
      readonly name: string;
      readonly path: string;
      readonly children: WorkspaceEntry[];
    }
  | {
      readonly type: "file";
      readonly name: string;
      readonly path: string;
      readonly size: number;
    };

export const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".jsonc",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".env",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".dockerfile",
  ".gitignore",
  ".npmrc",
  ".csv",
  ".tsv",
  ".log",
  ".svg",
]);

export function fileExtension(relativePath: string): string {
  const base = relativePath.split("/").pop()?.toLowerCase() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot) : "";
}

export function isTextPath(relativePath: string): boolean {
  const base = relativePath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile" || base === "makefile" || base === "license" || base === "readme") {
    return true;
  }
  return TEXT_EXTENSIONS.has(fileExtension(relativePath));
}

export type OfficeViewerKind =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "image"
  | "unsupported-office";

const VIEWER_BY_EXT: Record<string, OfficeViewerKind> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".docm": "docx",
  ".xlsx": "xlsx",
  ".xlsm": "xlsx",
  ".xls": "xlsx",
  ".pptx": "pptx",
  ".pptm": "pptx",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".bmp": "image",
  ".doc": "unsupported-office",
  ".ppt": "unsupported-office",
  ".odt": "unsupported-office",
  ".ods": "unsupported-office",
  ".odp": "unsupported-office",
};

export function getOfficeViewerKind(relativePath: string): OfficeViewerKind | null {
  return VIEWER_BY_EXT[fileExtension(relativePath)] ?? null;
}

export function isOfficeViewerPath(relativePath: string): boolean {
  return getOfficeViewerKind(relativePath) !== null;
}

export function mimeTypeForPath(relativePath: string): string {
  switch (fileExtension(relativePath)) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
    case ".docm":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xlsx":
    case ".xlsm":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".pptx":
    case ".pptm":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

export function languageFromPath(filePath: string): string {
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  const ext = base.includes(".") ? `.${base.split(".").pop()}` : "";
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
      return "python";
    case ".md":
    case ".markdown":
      return "markdown";
    case ".json":
    case ".jsonc":
      return "json";
    case ".css":
      return "css";
    case ".html":
    case ".htm":
      return "html";
    case ".yml":
    case ".yaml":
      return "yaml";
    case ".sh":
    case ".bash":
    case ".zsh":
      return "bash";
    case ".sql":
      return "sql";
    case ".rs":
      return "rust";
    case ".go":
      return "go";
    default:
      return "text";
  }
}
