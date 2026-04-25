import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Bold, Italic, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 140,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p]:my-1"
        ),
        style: `min-height: ${minHeight}px;`,
      },
      transformPastedHTML: (html) => sanitizeRichText(html),
    },
    onUpdate: ({ editor }) => {
      const html = sanitizeRichText(editor.getHTML());
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "<p></p>";
    if (current !== incoming && incoming !== "<p></p>") {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    cn(
      "h-8 w-8 inline-flex items-center justify-center rounded-md text-sm transition-colors",
      active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
    );

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <div className="flex items-center gap-1 border-b border-border/60 p-1">
        <button
          type="button"
          aria-label="Bold"
          className={btnCls(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          className={btnCls(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Bullet list"
          className={btnCls(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
