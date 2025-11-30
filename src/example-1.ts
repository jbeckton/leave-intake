import { StateGraph, START, END, MessagesAnnotation, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage } from '@langchain/core/messages';
import { openAIModel } from './utils/llm-models';
import { calculator } from './common/tools/calculator-tool';
import { getWeather } from './common/tools/weather-tool';

const assistant = async (state: typeof MessagesAnnotation.State) => {
  const llm = openAIModel.bindTools([calculator, getWeather]);
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
};

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  return END;
};

// Define the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode('assistant', assistant)
  .addNode('tools', new ToolNode([calculator, getWeather]))
  .addEdge(START, 'assistant')
  .addConditionalEdges('assistant', shouldContinue, {
    tools: 'tools',
    [END]: END,
  })
  .addEdge('tools', 'assistant');

export const graph = workflow.compile({ checkpointer: new MemorySaver() });
