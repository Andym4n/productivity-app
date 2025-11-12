/**
 * Rich Text Editor Component
 * 
 * A Slate.js-based rich text editor for journal entries.
 * Supports basic formatting: bold, italic, underline, lists, links.
 */

import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { createEditor, Editor, Transforms, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';

/**
 * Custom types for Slate.js elements
 */
const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

/**
 * Check if a format is active
 */
const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

/**
 * Check if a block format is active
 */
const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType] === format,
    })
  );

  return !!match;
};

/**
 * Toggle a mark (bold, italic, underline)
 */
const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

/**
 * Toggle a block format (heading, list, etc.)
 */
const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type),
    split: true,
  });

  let newProperties;
  if (isActive) {
    newProperties = { type: 'paragraph' };
  } else if (isList) {
    newProperties = { type: format };
  } else {
    newProperties = { type: format };
  }

  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: 'list-item', children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

/**
 * Render element based on type
 */
const Element = ({ attributes, children, element }) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes}>
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case 'heading-one':
      return (
        <h1 style={style} {...attributes}>
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 style={style} {...attributes}>
          {children}
        </h2>
      );
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

/**
 * UUID regex pattern for matching UUIDs in text
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

/**
 * Render leaf (text formatting)
 */
const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  // Render linked UUIDs as clickable links
  if (leaf.link && leaf.uuid) {
    children = (
      <a
        href={`#${leaf.uuid}`}
        onClick={(e) => {
          e.preventDefault();
          // Could trigger navigation to task/event here
          console.log('Link clicked:', leaf.uuid);
        }}
        className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
        title={`Linked: ${leaf.uuid.substring(0, 8)}...`}
      >
        {children}
      </a>
    );
  }

  return <span {...attributes}>{children}</span>;
};

/**
 * Toolbar component
 */
const Toolbar = ({ editor }) => {
  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-dark-border bg-dark-bg-secondary">
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleMark(editor, 'bold');
        }}
        className={`px-3 py-1 rounded ${
          isMarkActive(editor, 'bold')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleMark(editor, 'italic');
        }}
        className={`px-3 py-1 rounded ${
          isMarkActive(editor, 'italic')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleMark(editor, 'underline');
        }}
        className={`px-3 py-1 rounded ${
          isMarkActive(editor, 'underline')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        <u>U</u>
      </button>
      <div className="border-l border-dark-border mx-1" />
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleBlock(editor, 'heading-one');
        }}
        className={`px-3 py-1 rounded ${
          isBlockActive(editor, 'heading-one')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        H1
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleBlock(editor, 'heading-two');
        }}
        className={`px-3 py-1 rounded ${
          isBlockActive(editor, 'heading-two')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        H2
      </button>
      <div className="border-l border-dark-border mx-1" />
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleBlock(editor, 'bulleted-list');
        }}
        className={`px-3 py-1 rounded ${
          isBlockActive(editor, 'bulleted-list')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        •
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleBlock(editor, 'numbered-list');
        }}
        className={`px-3 py-1 rounded ${
          isBlockActive(editor, 'numbered-list')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        1.
      </button>
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          toggleBlock(editor, 'block-quote');
        }}
        className={`px-3 py-1 rounded ${
          isBlockActive(editor, 'block-quote')
            ? 'bg-blue-500 text-white'
            : 'bg-dark-bg-tertiary hover:bg-dark-bg-hover text-dark-text-primary'
        }`}
      >
        "
      </button>
    </div>
  );
};

/**
 * Decorate function to mark UUIDs as links
 * This function is called by Slate.js to add decorations to text nodes
 */
const createDecorateWithLinks = (linkedIds) => {
  if (!linkedIds || linkedIds.length === 0) {
    return () => [];
  }

  const linkedIdsLower = linkedIds.map(id => id.toLowerCase());

  return ([node, path]) => {
    const decorations = [];
    
    if (!Editor.isText(node)) {
      return decorations;
    }

    const text = node.text;
    const uuidRegex = new RegExp(UUID_PATTERN.source, 'gi');
    let match;
    const matches = [];

    // Find all UUID matches
    while ((match = uuidRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        uuid: match[0].toLowerCase()
      });
    }

    // Create decorations for linked UUIDs
    for (const { index, length, uuid } of matches) {
      if (linkedIdsLower.includes(uuid)) {
        const range = {
          anchor: { path, offset: index },
          focus: { path, offset: index + length }
        };
        
        decorations.push({
          ...range,
          link: true,
          uuid: uuid
        });
      }
    }

    return decorations;
  };
};

/**
 * RichTextEditor component
 * @param {Object} props
 * @param {Array} props.value - Slate.js editor value (array of nodes)
 * @param {Function} props.onChange - Callback when content changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.readOnly - Whether editor is read-only
 * @param {boolean} props.showToolbar - Whether to show the toolbar
 * @param {Array<string>} props.linkedTaskIds - Array of linked task IDs for highlighting
 * @param {Array<string>} props.linkedEventIds - Array of linked event IDs for highlighting
 */
export default function RichTextEditor({
  value = [{ type: 'paragraph', children: [{ text: '' }] }], // Default parameter ensures value is never undefined
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
  showToolbar = true,
  linkedTaskIds = [],
  linkedEventIds = []
}) {
  // Default empty value - this MUST be defined as a constant
  const DEFAULT_VALUE = [{ type: 'paragraph', children: [{ text: '' }] }];
  
  // All hooks must be called in the same order every render
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const linkedIds = useMemo(() => [
    ...linkedTaskIds.map(id => id.toLowerCase()),
    ...linkedEventIds.map(id => id.toLowerCase())
  ], [linkedTaskIds, linkedEventIds]);

  // Normalize and validate the incoming value prop
  // This MUST be computed synchronously and be stable
  const normalizedValue = useMemo(() => {
    try {
      // If value is undefined, null, or not an array, use default immediately
      if (!value) {
        console.warn('RichTextEditor: value is falsy, using DEFAULT_VALUE', value);
        return DEFAULT_VALUE;
      }
      
      if (!Array.isArray(value)) {
        console.warn('RichTextEditor: value is not an array, using default', value);
        return DEFAULT_VALUE;
      }
      
      if (value.length === 0) {
        console.warn('RichTextEditor: value is empty array, using default');
        return DEFAULT_VALUE;
      }
      
      // Validate that each node has required structure
      const validated = value.map(node => {
        if (!node || typeof node !== 'object') {
          return { type: 'paragraph', children: [{ text: '' }] };
        }
        if (!node.type || !Array.isArray(node.children)) {
          return { type: 'paragraph', children: [{ text: '' }] };
        }
        return node;
      });
      
      const result = validated.length > 0 ? validated : DEFAULT_VALUE;
      console.log('RichTextEditor: normalizedValue computed', {
        inputLength: value?.length,
        outputLength: result.length,
        firstNode: result[0]
      });
      return result;
    } catch (error) {
      console.error('RichTextEditor: Error normalizing value', error);
      return DEFAULT_VALUE;
    }
  }, [value]);

  // Use internal state to track editor value
  // Initialize with normalizedValue if valid, otherwise DEFAULT_VALUE
  // This ensures Slate gets the correct value immediately on first render
  const [editorValue, setEditorValue] = useState(() => {
    // Synchronously compute the initial value - this runs before Slate mounts
    if (normalizedValue && Array.isArray(normalizedValue) && normalizedValue.length > 0) {
      return normalizedValue;
    }
    return DEFAULT_VALUE;
  });
  
  // Sync with normalizedValue when it changes (but only after initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, editorValue is already set correctly via useState initializer
      return;
    }
    
    // On subsequent updates, sync with normalizedValue if it changed
    const currentStr = JSON.stringify(editorValue);
    const newStr = JSON.stringify(normalizedValue);
    
    if (currentStr !== newStr) {
      console.log('RichTextEditor: Syncing editorValue with normalizedValue', {
        currentLength: editorValue?.length,
        newLength: normalizedValue?.length
      });
      setEditorValue(normalizedValue);
    }
  }, [normalizedValue, editorValue]);

  const handleChange = useCallback(
    (newValue) => {
      setEditorValue(newValue);
      if (onChange) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Decorate function for highlighting links
  const decorate = useMemo(
    () => createDecorateWithLinks(linkedIds),
    [linkedIds]
  );

  // CRITICAL: Final validation - ensure editorValue is always a valid array
  // If invalid, use DEFAULT_VALUE and log the error
  const finalEditorValue = useMemo(() => {
    if (!editorValue || !Array.isArray(editorValue) || editorValue.length === 0) {
      console.error('RichTextEditor: editorValue is invalid, using default', { editorValue, value });
      return DEFAULT_VALUE;
    }
    return editorValue;
  }, [editorValue, value]);

  // Final safety check - ensure finalEditorValue is valid before rendering Slate
  // This should never fail due to our validation above, but provides extra safety
  if (!finalEditorValue || !Array.isArray(finalEditorValue) || finalEditorValue.length === 0) {
    console.error('RichTextEditor: finalEditorValue is still invalid after all checks!', {
      finalEditorValue,
      editorValue,
      normalizedValue,
      value
    });
    // Return a simple div instead of crashing
    return (
      <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-bg-tertiary p-4">
        <div className="text-red-400">Error: Unable to initialize editor. Please refresh the page.</div>
      </div>
    );
  }

  // Compute the value to pass to Slate
  // CRITICAL: This must be absolutely stable and valid - Slate will check it synchronously
  const slateValue = useMemo(() => {
    // Use editorValue - it should already be valid from useState initialization
    let val = editorValue;
    
    // Double-check editorValue is valid
    if (!val || !Array.isArray(val) || val.length === 0) {
      console.warn('RichTextEditor: editorValue invalid in slateValue computation, using DEFAULT_VALUE', {
        editorValue,
        editorValueType: typeof editorValue,
        editorValueIsArray: Array.isArray(editorValue)
      });
      val = DEFAULT_VALUE;
    }
    
    // Validate first node structure
    if (!val[0] || !val[0].type || !Array.isArray(val[0].children)) {
      console.warn('RichTextEditor: First node invalid, using DEFAULT_VALUE', {
        firstNode: val[0]
      });
      val = DEFAULT_VALUE;
    }
    
    // Log for debugging
    console.log('RichTextEditor: Computing slateValue', {
      slateValueLength: val.length,
      slateValueIsArray: Array.isArray(val),
      editorValueLength: editorValue?.length,
      normalizedValueLength: normalizedValue?.length,
      firstNode: val[0],
      firstNodeType: val[0]?.type,
      firstNodeChildrenLength: val[0]?.children?.length
    });
    
    // Return the value directly - don't clone as it might cause issues with Slate's internal checks
    // Slate expects the exact structure we provide
    return val;
  }, [editorValue, normalizedValue]); // Depend on both to ensure we're in sync

  // CRITICAL: Final validation - ensure slateValue is absolutely valid
  if (!slateValue || !Array.isArray(slateValue) || slateValue.length === 0) {
    console.error('RichTextEditor: slateValue is invalid right before Slate render!', {
      slateValue,
      editorValue,
      normalizedValue,
      finalEditorValue
    });
    // Don't render Slate at all if we don't have a valid value
    return (
      <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-bg-tertiary p-4">
        <div className="text-red-400">Error: Invalid editor content. Please refresh the page.</div>
      </div>
    );
  }
  
  // One more check - ensure the first node is valid
  if (!slateValue[0] || !slateValue[0].type || !Array.isArray(slateValue[0].children)) {
    console.error('RichTextEditor: First node in slateValue is invalid!', {
      firstNode: slateValue[0],
      slateValue
    });
    // Use DEFAULT_VALUE if structure is invalid
    const safeValue = [...DEFAULT_VALUE];
    console.log('RichTextEditor: Using DEFAULT_VALUE instead', safeValue);
      return (
      <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-bg-tertiary">
        {showToolbar && !readOnly && <Toolbar editor={editor} />}
        <Slate editor={editor} initialValue={safeValue} onChange={handleChange}>
          <Editable
            readOnly={readOnly}
            renderElement={Element}
            renderLeaf={Leaf}
            decorate={linkedIds.length > 0 ? decorate : undefined}
            placeholder={placeholder}
            className="p-4 min-h-[200px] focus:outline-none prose max-w-none text-dark-text-primary"
            style={{ minHeight: '200px' }}
          />
        </Slate>
      </div>
    );
  }

  // Final check - log exactly what we're passing to Slate
  console.log('RichTextEditor: About to render Slate', {
    slateValue,
    slateValueType: typeof slateValue,
    slateValueIsArray: Array.isArray(slateValue),
    slateValueLength: slateValue?.length,
    firstNode: slateValue?.[0],
    editorExists: !!editor
  });

  return (
    <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-bg-tertiary">
      {showToolbar && !readOnly && <Toolbar editor={editor} />}
      <Slate editor={editor} initialValue={slateValue} onChange={handleChange}>
        <Editable
          readOnly={readOnly}
          renderElement={Element}
          renderLeaf={Leaf}
          decorate={linkedIds.length > 0 ? decorate : undefined}
          placeholder={placeholder}
          className="p-4 min-h-[200px] focus:outline-none prose max-w-none text-dark-text-primary"
          style={{ minHeight: '200px' }}
        />
      </Slate>
    </div>
  );
}

