import { Streamdown } from "streamdown";

import "streamdown/styles.css";

type MarkdownMessageProps = {
  readonly isAnimating: boolean;
  readonly text: string;
};

const CONTROLS = { table: false } as const;

export default function MarkdownMessage({ isAnimating, text }: MarkdownMessageProps) {
  return (
    <Streamdown
      className="model-response my-1 wrap-anywhere space-y-2 first:mt-0 last:mb-0 [&_li]:py-0 [&_p]:leading-chat"
      controls={CONTROLS}
      isAnimating={isAnimating}
    >
      {text}
    </Streamdown>
  );
}
