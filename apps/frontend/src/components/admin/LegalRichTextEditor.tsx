'use client';

import { useEffect, useRef } from 'react';

interface LegalRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

type EditorCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'removeFormat';

export function LegalRichTextEditor({ value, onChange }: LegalRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  function emitChange() {
    onChange(editorRef.current?.innerHTML ?? '');
  }

  function run(command: EditorCommand) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    emitChange();
  }

  function setBlock(tag: 'p' | 'h2' | 'h3') {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt('Введите адрес ссылки, например https://example.ru');
    if (!url) return;

    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editorRef.current?.focus();
    document.execCommand('createLink', false, normalized);
    emitChange();
  }

  return (
    <div className="adm-rich-editor">
      <div className="adm-rich-editor__toolbar" role="toolbar" aria-label="Форматирование документа">
        <select
          className="adm-select adm-rich-editor__block-select"
          defaultValue="p"
          onChange={(event) => setBlock(event.target.value as 'p' | 'h2' | 'h3')}
          aria-label="Стиль абзаца"
        >
          <option value="p">Обычный текст</option>
          <option value="h2">Заголовок</option>
          <option value="h3">Подзаголовок</option>
        </select>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('bold')} aria-label="Полужирный"><strong>Ж</strong></button>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('italic')} aria-label="Курсив"><em>К</em></button>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('underline')} aria-label="Подчёркивание"><u>Ч</u></button>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('insertUnorderedList')} aria-label="Маркированный список">• Список</button>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('insertOrderedList')} aria-label="Нумерованный список">1. Список</button>
        <button className="adm-rich-editor__tool" type="button" onClick={insertLink}>Ссылка</button>
        <button className="adm-rich-editor__tool" type="button" onClick={() => run('removeFormat')}>Очистить формат</button>
      </div>
      <div
        ref={editorRef}
        className="adm-rich-editor__surface"
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        role="textbox"
        aria-multiline="true"
        aria-label="Содержимое документа"
        data-placeholder="Введите текст документа…"
      />
      <p className="adm-rich-editor__hint">HTML сохраняется системой автоматически, но в редакторе отображается только оформленный текст.</p>
    </div>
  );
}
