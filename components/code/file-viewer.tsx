import { File } from "@pierre/diffs/react";

const fileOptions = {
  disableFileHeader: true,
  theme: "pierre-dark-soft",
  themeType: "dark",
  unsafeCSS: "pre { --diffs-bg: var(--background) !important; }",
} as const;

export default function FileViewer({
  contents,
  path,
}: {
  readonly contents: string;
  readonly path: string;
}) {
  const file = { contents, name: path };
  return <File className="app-scrollbar workspace-file" file={file} options={fileOptions} />;
}
