/**
 * readingCompositionService
 *
 * Assembles raw reading blocks into structured teaser + locked reading text.
 * Output is passed to aiPolishService before being stored.
 */

import type { ReadingBlocks } from './readingBlockService'

export interface ComposedReading {
  teaserRaw: string   // Recognition + Past + Present + Near-Future (pre-polish)
  cutLine: string
  lockedRaw: string   // Deeper continuation (pre-polish)
}

export function composeReading(blocks: ReadingBlocks): ComposedReading {
  const teaserRaw = [
    blocks.recognition,
    blocks.pastValidation,
    blocks.currentState,
    blocks.nearFuture,
  ]
    .map(b => b.trim())
    .join('\n\n')

  return {
    teaserRaw,
    cutLine: blocks.cutLine,
    lockedRaw: blocks.lockedContinuation,
  }
}
