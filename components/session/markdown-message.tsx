import { Streamdown } from "streamdown";

import "streamdown/styles.css";

type MarkdownMessageProps = {
  readonly isAnimating: boolean;
  readonly text: string;
};

const CONTROLS = { table: false } as const;

export function MarkdownMessage({ isAnimating, text }: MarkdownMessageProps) {
  return (
    <Streamdown
      className="model-response space-y-2 leading-6 [&_li]:py-0"
      controls={CONTROLS}
      isAnimating={isAnimating}
    >
      {text}
    </Streamdown>
  );
}
