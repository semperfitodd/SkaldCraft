"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const storyEngine_1 = require("./storyEngine");
/**
 * DynamoDB Stream handler that automatically archives stories when they transition to 'completed' status.
 *
 * This handler:
 * - Listens to MODIFY events on the Story table
 * - Detects when status changes from non-completed to completed
 * - Triggers async archiving (S3 upload + node cleanup)
 * - Allows Lambda to retry on failure via stream configuration
 */
const handler = async (event) => {
    console.log('[ArchiveStream] Processing batch', { recordCount: event.Records.length });
    for (const record of event.Records) {
        // Only process MODIFY events (status changes)
        if (record.eventName !== 'MODIFY') {
            continue;
        }
        const oldImage = record.dynamodb?.OldImage;
        const newImage = record.dynamodb?.NewImage;
        if (!oldImage || !newImage) {
            console.warn('[ArchiveStream] Missing image data', {
                eventName: record.eventName,
                hasOldImage: !!oldImage,
                hasNewImage: !!newImage,
            });
            continue;
        }
        // Extract status values
        const oldStatus = oldImage.status?.S;
        const newStatus = newImage.status?.S;
        const isArchived = newImage.isArchived?.BOOL ?? false;
        const storyId = newImage.storyId?.S;
        if (!storyId) {
            console.warn('[ArchiveStream] Missing storyId in record');
            continue;
        }
        // Check if this is a transition to completed status and not already archived
        if (oldStatus !== 'completed' && newStatus === 'completed' && !isArchived) {
            console.log('[ArchiveStream] Detected story completion', {
                storyId,
                oldStatus,
                newStatus,
            });
            try {
                const s3Key = await (0, storyEngine_1.archiveCompletedStoryById)(storyId);
                if (s3Key) {
                    console.log('[ArchiveStream] Successfully archived story', { storyId, s3Key });
                }
                else {
                    console.warn('[ArchiveStream] Archive returned null (story may not exist or already archived)', { storyId });
                }
            }
            catch (err) {
                console.error('[ArchiveStream] Failed to archive story', {
                    storyId,
                    error: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                });
                // Let Lambda retry according to the stream's retry/DLQ config
                throw err;
            }
        }
    }
    console.log('[ArchiveStream] Batch processing complete');
};
exports.handler = handler;
