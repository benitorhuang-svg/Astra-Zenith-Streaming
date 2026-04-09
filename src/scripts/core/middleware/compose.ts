import { PipelineContext } from '../types';

export type Middleware<T extends PipelineContext = PipelineContext> = (context: T, next: () => Promise<void>) => Promise<void>;
export type FinalHandler<T extends PipelineContext = PipelineContext> = (context: T) => Promise<void>;

export function composeMiddlewares<T extends PipelineContext>(
    middlewares: Middleware<T>[],
    finalHandler: FinalHandler<T>
): FinalHandler<T> {
    return async (context: T) => {
        let index = -1;
        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error('next() called multiple times');
            index = i;
            const fn = middlewares[i];
            if (!fn) return finalHandler(context);
            await fn(context, () => dispatch(i + 1));
        };
        await dispatch(0);
    };
}
