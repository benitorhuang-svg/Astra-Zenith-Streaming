import { PipelineContext } from '../types';

export const withTurnTracking = (maxTurns = 5) => async (context: PipelineContext, next: () => Promise<void>) => {
    const nextTurn = context.turnCount + 1;
    if (nextTurn > maxTurns) throw new Error(`TURN_LIMIT_EXCEEDED: ${nextTurn}/${maxTurns}`);
    context.turnCount = nextTurn;
    await next();
};
