"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link2,
  Minus,
  Quote,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Braces,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  Code,
  Eye,
  Type,
  Palette,
  Highlighter,
  ChevronDown,
} from "lucide-react";

export interface AttachmentItem {
  name: string;
  size: number;
  type: string;
  content: string; // base64
}

interface RichMessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  attachments?: AttachmentItem[];
  onAttachmentsChange?: (attachments: AttachmentItem[]) => void;
  placeholder?: string;
  lang?: "pt" | "en";
  availableVariables?: { code: string; label: string }[];
  maxFileSizeMb?: number;
  className?: string;
}

const DEFAULT_VARIABLES = [
  { code: "{{name}}", label: "Candidate Name / Nome Candidato" },
  { code: "{{role}}", label: "Job Role Title / Vaga" },
  { code: "{{slot}}", label: "Assigned Test Slot / Turno Agendado" },
  { code: "{{date}}", label: "Current Date / Data Atual" },
  { code: "{{location}}", label: "HQ Address / Localização Overwatch" },
  { code: "{{company}}", label: "Company Name / Overwatch Moçambique" },
];

const TEXT_COLORS = [
  { name: "Default Navy", value: "#0b1329" },
  { name: "Slate Dark", value: "#1e293b" },
  { name: "Overwatch Sky", value: "#0284c7" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Amber Gold", value: "#d97706" },
  { name: "Crimson Red", value: "#e11d48" },
  { name: "Purple", value: "#7c3aed" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "transparent" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Sky Blue", value: "#e0f2fe" },
  { name: "Light Green", value: "#dcfce7" },
  { name: "Soft Rose", value: "#ffe4e6" },
];

export default function RichMessageEditor({
  value,
  onChange,
  attachments = [],
  onAttachmentsChange,
  placeholder = "Write your official correspondence here...",
  lang = "pt",
  availableVariables = DEFAULT_VARIABLES,
  maxFileSizeMb = 10,
  className = "",
}: RichMessageEditorProps) {
  const [editorMode, setEditorMode] = useState<"visual" | "raw">("visual");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>("sans");
  const [fontSize, setFontSize] = useState<string>("14px");

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingFromProps = useRef<boolean>(false);
  const normalizeToHtml = useCallback((val: string) => {
    if (!val) return "";
    if (!val.includes("<p>") && !val.includes("<div>") && !val.includes("<br>")) {
      return val
        .split(/\n\s*\n/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
    }
    return val;
  }, []);

  // Sync incoming value to contentEditable when not user typing
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromProps.current) {
      const targetHtml = normalizeToHtml(value);
      if (editorRef.current.innerHTML !== targetHtml) {
        editorRef.current.innerHTML = targetHtml;
      }
    }
    isUpdatingFromProps.current = false;
  }, [value, editorMode, normalizeToHtml]);

  // Initial mount populate guarantee
  useEffect(() => {
    if (editorRef.current && value) {
      const targetHtml = normalizeToHtml(value);
      if (!editorRef.current.innerHTML) {
        editorRef.current.innerHTML = targetHtml;
      }
    }
  }, [value, normalizeToHtml]);

  // Robust mode switch handler with 100% bi-directional synchronization
  const handleSetEditorMode = (mode: "visual" | "raw") => {
    if (mode === editorMode) return;
    isUpdatingFromProps.current = false;

    if (mode === "raw") {
      // Switching from visual to source: sync editorRef content into value
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange(html);
      }
    } else {
      // Switching from source to visual: sync value into editorRef
      if (editorRef.current) {
        const targetHtml = normalizeToHtml(value);
        editorRef.current.innerHTML = targetHtml;
      }
    }
    setEditorMode(mode);
  };

  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      isUpdatingFromProps.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  }, [onChange]);

  // Execute standard formatting commands
  const execCmd = (command: string, cmdValue: string | undefined = undefined) => {
    if (editorMode === "raw") return;
    editorRef.current?.focus();
    document.execCommand(command, false, cmdValue);
    handleContentChange();
  };

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    let cssFont = "Inter, -apple-system, sans-serif";
    if (font === "serif") cssFont = "Georgia, Cambria, 'Times New Roman', serif";
    if (font === "mono") cssFont = "ui-monospace, SFMono-Regular, Menlo, monospace";
    execCmd("fontName", cssFont);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    // Use inline styling via selection or execCommand fontSize mapping
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = size;
      range.surroundContents(span);
      handleContentChange();
    } else {
      execCmd("fontSize", "3");
    }
  };

  const handleInsertVariable = (varCode: string) => {
    editorRef.current?.focus();
    if (editorMode === "visual") {
      document.execCommand("insertText", false, varCode);
      handleContentChange();
    } else {
      onChange(`${value} ${varCode}`);
    }
    setShowVariablePicker(false);
  };

  const handleInsertLink = () => {
    const url = prompt(
      lang === "en" ? "Enter link URL (e.g. https://...):" : "Insira o link URL (ex.: https://...):"
    );
    if (url) {
      execCmd("createLink", url);
    }
  };

  const handleInsertHorizontalRule = () => {
    execCmd("insertHorizontalRule");
  };

  const handleInsertQuote = () => {
    execCmd("formatBlock", "blockquote");
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        execCmd("bold");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        execCmd("italic");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        execCmd("underline");
      } else if (e.key === "z" || e.key === "Z") {
        if (e.shiftKey) {
          e.preventDefault();
          execCmd("redo");
        } else {
          e.preventDefault();
          execCmd("undo");
        }
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        execCmd("redo");
      }
    }
  };

  // File Upload Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    const newAttachments: AttachmentItem[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > maxBytes) {
        alert(
          (lang === "en" ? `File exceeds limit of ${maxFileSizeMb}MB:` : `O ficheiro excede o limite de ${maxFileSizeMb}MB:`) +
            ` ${file.name}`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(",")[1];
        const item: AttachmentItem = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: base64Data,
        };
        onAttachmentsChange?.([...attachments, item]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (idx: number) => {
    onAttachmentsChange?.(attachments.filter((_, i) => i !== idx));
  };

  // Stats
  const plainText = (editorRef.current?.innerText || value || "").replace(/<[^>]*>/g, "").trim();
  const charCount = plainText.length;
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col ${className}`}>
      {/* =========================================================================
          TOOLBAR HEADER
         ========================================================================= */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left Toolbar: Actions */}
        <div className="flex flex-wrap items-center gap-1">
          {/* History Undo / Redo */}
          <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => execCmd("undo")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("redo")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={14} />
            </button>
          </div>

          {/* Typography: Font Family */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-1">
            <div className="relative">
              <select
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="appearance-none text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 pr-6 text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                title="Font Family"
              >
                <option value="sans">Modern Sans</option>
                <option value="serif">Executive Serif</option>
                <option value="mono">Technical Mono</option>
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Typography: Font Size */}
            <div className="relative">
              <select
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                className="appearance-none text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 pr-5 text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                title="Font Size"
              >
                <option value="12px">12px Small</option>
                <option value="14px">14px Body</option>
                <option value="16px">16px Medium</option>
                <option value="18px">18px Large</option>
                <option value="22px">22px Heading</option>
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Inline Styles: Bold, Italic, Underline, Strikethrough */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => execCmd("bold")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 font-bold transition-colors cursor-pointer"
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("italic")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 italic transition-colors cursor-pointer"
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("underline")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 underline transition-colors cursor-pointer"
              title="Underline (Ctrl+U)"
            >
              <Underline size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("strikeThrough")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 line-through transition-colors cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>
          </div>

          {/* Color Palettes: Text Color & Highlight */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-1 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                  setShowVariablePicker(false);
                }}
                className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 flex items-center gap-1 transition-colors cursor-pointer"
                title="Text Color"
              >
                <Palette size={14} />
                <ChevronDown size={10} className="text-slate-400" />
              </button>
              {showColorPicker && (
                <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl p-2 shadow-xl grid grid-cols-4 gap-1.5 w-44">
                  {TEXT_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => {
                        execCmd("foreColor", col.value);
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                  setShowVariablePicker(false);
                }}
                className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 flex items-center gap-1 transition-colors cursor-pointer"
                title="Highlight Color"
              >
                <Highlighter size={14} />
                <ChevronDown size={10} className="text-slate-400" />
              </button>
              {showHighlightPicker && (
                <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl p-2 shadow-xl flex flex-wrap gap-1.5 w-40">
                  {HIGHLIGHT_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => {
                        execCmd("hiliteColor", col.value);
                        setShowHighlightPicker(false);
                      }}
                      className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 hover:scale-105 transition-transform cursor-pointer"
                      style={{ backgroundColor: col.value }}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alignment */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => execCmd("justifyLeft")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("justifyCenter")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("justifyRight")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("justifyFull")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Justify"
            >
              <AlignJustify size={14} />
            </button>
          </div>

          {/* Lists & Blocks */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => execCmd("insertUnorderedList")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Bullet List"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => execCmd("insertOrderedList")}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered size={14} />
            </button>
            <button
              type="button"
              onClick={handleInsertQuote}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Quote Block"
            >
              <Quote size={14} />
            </button>
            <button
              type="button"
              onClick={handleInsertHorizontalRule}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Horizontal Divider"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Insert Link"
            >
              <Link2 size={14} />
            </button>
          </div>

          {/* Personalized Variable Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowVariablePicker(!showVariablePicker);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Insert Dynamic Variable Token"
            >
              <Braces size={13} className="text-sky-600" />
              <span>{lang === "en" ? "Insert Variable" : "Inserir Variável"}</span>
              <ChevronDown size={11} className="text-sky-600" />
            </button>

            {showVariablePicker && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white border border-slate-200 rounded-xl p-2 shadow-2xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  {lang === "en" ? "Personalized Tokens" : "Campos Personalizados"}
                </div>
                {availableVariables.map((v) => (
                  <button
                    key={v.code}
                    type="button"
                    onClick={() => handleInsertVariable(v.code)}
                    className="w-full text-left p-2 rounded-lg hover:bg-sky-50 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                  >
                    <code className="text-sky-700 font-mono font-bold bg-sky-50 group-hover:bg-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                      {v.code}
                    </code>
                    <span className="text-[11px] text-slate-500 truncate ml-2">
                      {v.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => execCmd("removeFormat")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer ml-1"
            title="Clear Formatting"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        {/* Right Toolbar: View Mode Switcher */}
        <div className="flex items-center gap-1">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 border border-slate-300">
            <button
              type="button"
              onClick={() => handleSetEditorMode("visual")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                editorMode === "visual"
                  ? "bg-white text-sky-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye size={12} />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetEditorMode("raw")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                editorMode === "raw"
                  ? "bg-white text-sky-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code size={12} />
              <span>Source</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EDITOR CANVAS
         ========================================================================= */}
      <div className="relative min-h-[340px] flex-1 bg-white p-6">
        {/* ContentEditable Visual Element (Persistently preserved in DOM) */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          style={{ display: editorMode === "visual" ? "block" : "none" }}
          className="outline-none min-h-[300px] text-sm text-slate-900 leading-relaxed font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none prose prose-slate max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
        />

        {/* Source Textarea Element (Persistently preserved in DOM) */}
        <textarea
          value={value}
          onChange={(e) => {
            const newHtml = e.target.value;
            onChange(newHtml);
            if (editorRef.current) {
              editorRef.current.innerHTML = newHtml;
            }
          }}
          rows={14}
          style={{ display: editorMode === "raw" ? "block" : "none" }}
          className="w-full h-full min-h-[300px] text-xs font-mono text-slate-900 leading-relaxed outline-none resize-y p-3 bg-slate-50/50 rounded-xl border border-slate-200"
          placeholder={placeholder}
        />
      </div>

      {/* =========================================================================
          ATTACHMENTS DROPZONE & CHIPS BAR
         ========================================================================= */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Paperclip size={14} className="text-slate-500" />
              <span>{lang === "en" ? "Attachments (Offer Letter, Guidelines, Documents)" : "Anexos Oficiais (Carta de Oferta, Regulamento, Documentos)"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({attachments.length} {lang === "en" ? "attached" : "anexado(s)"})
            </span>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Paperclip size={13} className="text-sky-600" />
              <span>{lang === "en" ? "+ Attach Document / File" : "+ Anexar Documento / Ficheiro"}</span>
            </button>
          </div>
        </div>

        {/* Uploaded File Chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
              >
                {file.type.includes("pdf") ? (
                  <FileText size={14} className="text-rose-600 shrink-0" />
                ) : file.type.includes("image") ? (
                  <ImageIcon size={14} className="text-sky-600 shrink-0" />
                ) : (
                  <FileText size={14} className="text-blue-600 shrink-0" />
                )}
                <span className="truncate max-w-[200px]" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  ({Math.round(file.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          STATUS BAR (CHARS, WORDS, DYNAMIC NOTICE)
         ========================================================================= */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{charCount} {lang === "en" ? "characters" : "caracteres"}</span>
          <span>•</span>
          <span>{wordCount} {lang === "en" ? "words" : "palavras"}</span>
          <span>•</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 180))} min read</span>
        </div>
        <div className="text-slate-500 text-[10px] flex items-center gap-1.5 font-medium">
          <Braces size={11} className="text-sky-600" />
          <span>{lang === "en" ? "Use {{...}} tokens for dynamic per-candidate values" : "Variáveis {{...}} são substituídas automaticamente por candidato"}</span>
        </div>
      </div>
    </div>
  );
}
