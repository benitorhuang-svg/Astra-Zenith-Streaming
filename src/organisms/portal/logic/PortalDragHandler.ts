/**
 * AZ DRAG SYSTEM — Atomic Interaction Module
 */

import type { Agent } from '../../../core/agents';

export interface SeatRect {
    index: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

export interface DragState {
    agent: Agent;
    originSeatIndex?: number;
    ghost: HTMLElement;
    cachedSeatRects: SeatRect[];
    snappedIndex: number;
}

export function handlePointerDown(e: PointerEvent, agentCode: string, context: { agentPool: Agent[]; activeDrag: DragState | null }) {
    const agent = context.agentPool.find((a) => a.code === agentCode);
    if (!agent) return;

    // Find origin seat if dragging an existing participant
    let originSeatIndex: number | undefined = undefined;
    const slot = (e.target as HTMLElement).closest('[data-seat-index]');
    if (slot) {
        originSeatIndex = parseInt(slot.getAttribute('data-seat-index') || '0', 10);
    }

    context.activeDrag = initiateCustomDrag(e, agent, originSeatIndex);
}

/**
 * Atomic Utility: Cache seat positions to prevent layout reflows during move
 */
function cacheSeatRects(hostElement: HTMLElement | Document): SeatRect[] {
    const seats = hostElement.querySelectorAll('.u-table-seat');
    const rects: SeatRect[] = [];
    
    seats.forEach(seat => {
        const indexStr = seat.getAttribute('data-seat-index');
        if (indexStr === null) return;
        
        const rect = seat.getBoundingClientRect();
        rects.push({
            index: parseInt(indexStr),
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
        });
    });
    return rects;
}

export function initiateCustomDrag(e: PointerEvent, agent: Agent, originSeatIndex?: number): DragState {
    // 1. Snapshot State
    const cachedSeatRects = cacheSeatRects(document);
    
    // 2. Clear visual cues
    document.body.classList.add('u-dragging');
    document.body.style.cursor = 'grabbing';

    // 3. Create Ghost (Atomic Atom: DragGhost)
    const ghost = document.createElement('div');
    ghost.className = 'u-drag-ghost w-28 h-28';
    ghost.style.top = '0';
    ghost.style.left = '0';
    ghost.style.transform = `translate3d(${e.clientX - 56}px, ${e.clientY - 56}px, 0) scale(1.1)`;
    ghost.innerHTML = `<img src="./images/${agent.img}" class="w-full h-full object-cover rounded-md border-2 border-primary a-img-contrast" draggable="false" style="pointer-events: none;">`;
    document.body.appendChild(ghost);

    return { agent, originSeatIndex, ghost, cachedSeatRects, snappedIndex: -1 };
}

export function handlePointerMove(e: PointerEvent, drag: DragState) {
    const { cachedSeatRects, ghost } = drag;
    let snappedIndex = -1;
    let minDist = 80; // Threshold for snap

    // Atomic Hit Testing
    for (const sr of cachedSeatRects) {
        const dx = e.clientX - sr.centerX;
        const dy = e.clientY - sr.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
            minDist = dist;
            snappedIndex = sr.index;
        }
    }

    // Visual Feedback (Ghost Snapping)
    if (snappedIndex !== drag.snappedIndex) {
        // Clear previous hover states
        document.querySelectorAll('.u-table-seat').forEach(s => s.classList.remove('u-drag-over'));
        
        if (snappedIndex >= 0) {
            const seatEl = document.querySelector(`.u-table-seat[data-seat-index="${snappedIndex}"]`);
            if (seatEl) seatEl.classList.add('u-drag-over');
        }
        drag.snappedIndex = snappedIndex;
    }

    // Update Ghost Position
    if (snappedIndex >= 0) {
        const sr = cachedSeatRects[snappedIndex];
        ghost.style.transform = `translate3d(${sr.centerX - 56}px, ${sr.centerY - 56}px, 0) scale(1.2)`;
    } else {
        ghost.style.transform = `translate3d(${e.clientX - 56}px, ${e.clientY - 56}px, 0) scale(1.1)`;
    }
}

export function handlePointerUp(
    drag: DragState, 
    participants: (string | null)[],
    onCommit: (index: number, code: string) => void,
    onClear: (index: number) => void,
    onCancel: () => void
) {
    const snappedIndex = drag.snappedIndex;
    const { originSeatIndex, agent, ghost } = drag;

    document.body.classList.remove('u-dragging');
    document.body.style.cursor = '';
    document.querySelectorAll('.u-table-seat').forEach(s => s.classList.remove('u-drag-over'));

    if (snappedIndex >= 0) {
        const targetOccupant = participants[snappedIndex];

        if (originSeatIndex !== undefined) {
             if (originSeatIndex === snappedIndex) {
                 // Dropped back to original seat
                 onCancel();
             } else {
                 // SWAP logic
                 onCommit(snappedIndex, agent.code);
                 if (targetOccupant) {
                     onCommit(originSeatIndex, targetOccupant);
                 } else {
                     onClear(originSeatIndex);
                 }
             }
        } else {
            // New Deployment from POOL
            onCommit(snappedIndex, agent.code);
        }
    } else {
        // Dragged to VOID
        if (originSeatIndex !== undefined) {
            onClear(originSeatIndex);
        } else {
            onCancel();
        }
    }

    ghost.remove();
}
