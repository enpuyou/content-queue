import { useEffect, useRef } from "react";
import { contentAPI } from "@/lib/api";
import { ContentItem } from "@/types";

/**
 * Custom hook to poll for processing status updates
 *
 * @param items - Array of content items to monitor
 * @param onUpdate - Callback when an item's processing completes
 * @param pollingInterval - How often to check (milliseconds), default 5000ms (5 seconds)
 */
export function useProcessingPolling(
  items: ContentItem[],
  onUpdate: (updatedItem: ContentItem) => void,
  pollingInterval: number = 5000
) {
  // useRef to store interval ID so we can clear it on unmount
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Filter for items that are still processing
    // These are the ones we need to poll
    const processingItems = items.filter(
      (item) =>
        item.processing_status === "pending" ||
        item.processing_status === "processing"
    );

    // If no items are processing, no need to poll
    if (processingItems.length === 0) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to check all processing items
    const checkProcessingStatus = async () => {
      try {
        // Poll each processing item to see if it's done
        const checks = processingItems.map(async (item) => {
          try {
            // Fetch the latest version of this item
            const updated = await contentAPI.getById(item.id);

            // If status changed to completed (or failed), notify parent
            if (
              updated.processing_status === "completed" ||
              updated.processing_status === "failed"
            ) {
              onUpdate(updated);
            }
          } catch (error) {
            // Silently fail for individual item checks
            // Don't want one failed request to break the whole polling
            console.error(`Failed to check status for item ${item.id}:`, error);
          }
        });

        // Wait for all checks to complete
        await Promise.all(checks);
      } catch (error) {
        console.error("Error during polling:", error);
      }
    };

    // Set up the polling interval
    intervalRef.current = setInterval(checkProcessingStatus, pollingInterval);

    // Also check immediately on mount (don't wait for first interval)
    checkProcessingStatus();

    // Cleanup function - runs when component unmounts or dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [items, onUpdate, pollingInterval]);

  // This hook doesn't return anything - it works via the onUpdate callback
}
