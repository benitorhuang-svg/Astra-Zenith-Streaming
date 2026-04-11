"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTurnTracking = void 0;
const withTurnTracking = (maxTurns = 5) => async (context, next) => {
    const nextTurn = context.turnCount + 1;
    if (nextTurn > maxTurns)
        throw new Error(`TURN_LIMIT_EXCEEDED: ${nextTurn}/${maxTurns}`);
    context.turnCount = nextTurn;
    await next();
};
exports.withTurnTracking = withTurnTracking;
