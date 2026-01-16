import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export default function MDContent({ text, inverted = false }: { text: string; inverted?: boolean }) {
  const textPrimary = inverted ? "text-white" : "text-ink-900";
  const textSecondary = inverted ? "text-white/90" : "text-ink-800";
  const textRegular = inverted ? "text-white/80" : "text-ink-700";
  const codeBg = inverted ? "bg-white/10" : "bg-surface-tertiary";
  const codeText = inverted ? "text-white" : "text-ink-700";
  const inlineCodeText = inverted ? "text-accent-light" : "text-accent";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        h1: (props) => <h1 className={`mt-4 text-xl font-semibold ${textPrimary}`} {...props} />,
        h2: (props) => <h2 className={`mt-4 text-lg font-semibold ${textPrimary}`} {...props} />,
        h3: (props) => <h3 className={`mt-3 text-base font-semibold ${textSecondary}`} {...props} />,
        p: (props) => <p className={`mt-2 text-base leading-relaxed ${textRegular}`} {...props} />,
        ul: (props) => <ul className="mt-2 ml-4 grid list-disc gap-1" {...props} />,
        ol: (props) => <ol className="mt-2 ml-4 grid list-decimal gap-1" {...props} />,
        li: (props) => <li className={`min-w-0 ${textRegular}`} {...props} />,
        strong: (props) => <strong className={`${textPrimary} font-semibold`} {...props} />,
        em: (props) => <em className={textSecondary} {...props} />,
        pre: (props) => (
          <pre
            className={`mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl ${codeBg} p-3 text-sm ${codeText}`}
            {...props}
          />
        ),
        code: (props) => {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");

          return isInline ? (
            <code className={`rounded ${codeBg} px-1.5 py-0.5 ${inlineCodeText} font-mono text-base`} {...rest}>
              {children}
            </code>
          ) : (
            <code className={`${className} font-mono`} {...rest}>
              {children}
            </code>
          );
        }
      }}
    >
      {String(text ?? "")}
    </ReactMarkdown>
  )
}
