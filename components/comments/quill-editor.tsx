"use client";

import "quill/dist/quill.snow.css";
import { useEffect, useRef } from "react";

interface QuillEditorProps {
  disabled?: boolean;
  minHeight?: number;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  value: string;
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Write something…",
  disabled = false,
  minHeight = 80,
}: QuillEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<InstanceType<typeof import("quill").default> | null>(
    null
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    // Create a fresh inner div each time so Strict Mode's double-mount
    // can't re-use a div that already has Quill's DOM structure on it.
    const editorDiv = document.createElement("div");
    wrapper.appendChild(editorDiv);

    import("quill").then(({ default: Quill }) => {
      // If cleanup already ran (editorDiv removed from DOM), abort.
      // Also abort if another instance already registered.
      if (!document.contains(editorDiv) || quillRef.current) {
        return;
      }

      const quill = new Quill(editorDiv, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            ["blockquote", "code-block"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ indent: "-1" }, { indent: "+1" }],
            ["link"],
            ["clean"],
          ],
        },
      });

      quillRef.current = quill;

      if (value && value !== "<p><br></p>") {
        quill.root.innerHTML = value;
      }

      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        const text = quill.getText().trim();
        onChangeRef.current(html === "<p><br></p>" ? "" : html, text);
      });

      if (disabled) {
        quill.disable();
      }
    });

    return () => {
      quillRef.current = null;
      // Remove editorDiv + any toolbar Quill inserted as sibling inside wrapper
      wrapper.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync disabled state after init
  useEffect(() => {
    if (!quillRef.current) {
      return;
    }
    if (disabled) {
      quillRef.current.disable();
    } else {
      quillRef.current.enable();
    }
  }, [disabled]);

  return (
    <div
      className="border border-input bg-background focus-within:ring-2 focus-within:ring-ring"
      style={{ ["--ql-min-height" as string]: `${minHeight}px` }}
    >
      <div
        className={disabled ? "opacity-50 pointer-events-none" : ""}
        ref={wrapperRef}
      />
    </div>
  );
}
