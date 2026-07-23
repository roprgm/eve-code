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
      className="model-response wrap-anywhere space-y-2 [&_li]:py-0 [&_p]:leading-chat"
      controls={CONTROLS}
      isAnimating={isAnimating}
    >
      {text}
    </Streamdown>
  );
}
