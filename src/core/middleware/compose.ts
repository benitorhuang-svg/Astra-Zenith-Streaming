import { PipelineContext } from '../types';

export type Middleware<T extends PipelineContext = PipelineContext> = (context: T, next: () => Promise<void>) => Promise<void>;
export type FinalHandler<T extends PipelineContext = PipelineContext> = (context: T) => Promise<void>;

export function composeMiddlewares<T extends PipelineContext>(
    middlewares: Middleware<T>[],
    finalHandler: FinalHandler<T>
): FinalHandler<T> {
    return (context: T) => {
        const dispatch = async (i: number): Promise<void> => {
            const fn = i === middlewares.length ? finalHandler : middlewares[i];
            if (!fn) return Promise.resolve();
            return fn(context, () => dispatch(i + 1));
        };
        return dispatch(0);
    };
}
