"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeMiddlewares = composeMiddlewares;
function composeMiddlewares(middlewares, finalHandler) {
    return (context) => {
        const dispatch = async (i) => {
            const fn = i === middlewares.length ? finalHandler : middlewares[i];
            if (!fn)
                return Promise.resolve();
            return fn(context, () => dispatch(i + 1));
        };
        return dispatch(0);
    };
}
