"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const storyEngine_1 = require("./storyEngine");
const handler = async (event) => {
    console.log('[ArchiveStream] Processing batch', {
        recordCount: event.Records.length,
    });
    for (const record of event.Records) {
        if (record.eventName !== 'MODIFY')
            continue;
        const oldImage = record.dynamodb?.OldImage;
        const newImage = record.dynamodb?.NewImage;
        if (!oldImage || !newImage) {
            console.warn('[ArchiveStream] Missing OldImage or NewImage', {
                eventName: record.eventName,
                hasOldImage: !!oldImage,
                hasNewImage: !!newImage,
            });
            continue;
        }
        const oldStatus = oldImage.status?.S;
        const newStatus = newImage.status?.S;
        const isArchived = newImage.isArchived?.BOOL ?? false;
        const storyId = newImage.storyId?.S;
        if (!storyId) {
            console.warn('[ArchiveStream] Missing storyId in NewImage');
            continue;
        }
        const isCompletionTransition = oldStatus !== 'completed' && newStatus === 'completed';
        if (isCompletionTransition && !isArchived) {
            console.log('[ArchiveStream] Story completed, starting archive', {
                storyId,
                oldStatus,
                newStatus,
            });
            try {
                const s3Key = await (0, storyEngine_1.archiveCompletedStoryById)(storyId);
                if (s3Key) {
                    console.log('[ArchiveStream] Story archived successfully', {
                        storyId,
                        s3Key,
                    });
                }
                else {
                    console.warn('[ArchiveStream] Archive returned null', { storyId });
                }
            }
            catch (err) {
                console.error('[ArchiveStream] Failed to archive story', {
                    storyId,
                    error: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                });
                throw err;
            }
        }
        else if (isArchived) {
            console.log('[ArchiveStream] Story already archived, skipping', {
                storyId,
                newStatus,
            });
        }
    }
    console.log('[ArchiveStream] Batch processing complete');
};
exports.handler = handler;
