import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { RuntimeContext, RuntimeContextSchema } from '../common/types';

export const getContext = (config: LangGraphRunnableConfig<RuntimeContext>): RuntimeContext => {
  const rawConfig = config.configurable || {};
  return RuntimeContextSchema.parse(rawConfig);
};
