import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import {
  parseHtmlToBlocks,
  serializeBlocksToHtml,
  ContentBlock,
  BlockType,
} from "@/lib/blockParser";
import EditableBlock from "./EditableBlock";

interface BlockListProps {
  initialHtml: string;
  initialScrollTop?: number;
}

export interface BlockListRef {
  getHtml: () => string;
}

const BlockList = forwardRef<BlockListRef, BlockListProps>(
  ({ initialHtml, initialScrollTop }, ref) => {
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    // Initialize blocks from HTML
    useEffect(() => {
      const parsed = parseHtmlToBlocks(initialHtml);
      setBlocks(parsed);
    }, [initialHtml]);

    // Expose serialization method to parent
    useImperativeHandle(ref, () => ({
      getHtml: () => serializeBlocksToHtml(blocks),
    }));

    // Scroll Restoration
    const hasRestoredScroll = useRef(false);
    useEffect(() => {
      if (
        !hasRestoredScroll.current &&
        initialScrollTop !== undefined &&
        initialScrollTop > 0
      ) {
        window.scrollTo({
          top: initialScrollTop,
          behavior: "instant", // Instant jump to prevent visual jank
        });
        hasRestoredScroll.current = true;
      }
    }, [initialScrollTop]);

    const updateBlock = (id: string, newContent: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: newContent } : b)),
      );
    };

    const updateBlockType = (id: string, newType: BlockType) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, type: newType } : b)),
      );
    };

    const addBlockAfter = (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index === -1) return;

      const newBlock: ContentBlock = {
        id: self.crypto.randomUUID(),
        type: "paragraph",
        content: "",
        originalTag: "p",
      };

      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      setActiveBlockId(newBlock.id);
    };

    const mergeBlockWithPrevious = (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index <= 0) return; // Can't merge first block

      const currentBlock = blocks[index];
      const prevBlock = blocks[index - 1];

      // Don't merge distinct types if it feels weird, e.g. Image.
      // But text to text is fine.
      if (prevBlock.type === "image" || currentBlock.type === "image") return;

      const marker = '<span id="merge-cursor-marker"></span>';
      const newContent = prevBlock.content + marker + currentBlock.content;

      const newBlocks = [...blocks];
      // Update previous block
      newBlocks[index - 1] = { ...prevBlock, content: newContent };
      // Remove current block
      newBlocks.splice(index, 1);

      setBlocks(newBlocks);
      // Set active to previous block, cursor at end (this is tricky with contentEditable)
      // We'll just focus it for now.
      setActiveBlockId(prevBlock.id);
    };
    const deleteBlock = (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (activeBlockId === id) setActiveBlockId(null);
    };

    return (
      <div className="min-h-screen pb-32">
        {blocks.map((block) => (
          <EditableBlock
            key={block.id}
            block={block}
            isActive={activeBlockId === block.id}
            onActivate={() => setActiveBlockId(block.id)}
            onDeactivate={() => setActiveBlockId(null)} // Or keep active until clicked elsewhere?
            // Actually, onDeactivate logic in EditableBlock is called onBlur.
            // If we click another block, that bloack's onActivate will fire,
            // and the previous one's onBlur will fire.
            // We need to ensure state updates handle this cleanly.
            onChange={updateBlock}
            onTypeChange={updateBlockType}
            onDelete={() => deleteBlock(block.id)}
            onEnter={() => addBlockAfter(block.id)}
            onBackspace={(id: string, _cursorContent: number) => {
              // Only merge if cursor is at start (length 0 or logic handled in EditableBlock)
              mergeBlockWithPrevious(id);
            }}
          />
        ))}
        {/* Placeholder for empty state or to allow adding new blocks at end? */}
        <div
          className="h-32 cursor-text"
          onClick={() => {
            // Future: Create new paragraph at end
            setActiveBlockId(null);
          }}
        />
      </div>
    );
  },
);

BlockList.displayName = "BlockList";
export default BlockList;
