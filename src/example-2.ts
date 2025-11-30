import { StateGraph, START, END, Annotation, messagesStateReducer, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { openAIModel } from './utils/llm-models';
import { calculator } from './common/tools/calculator-tool';
import { getWeather } from './common/tools/weather-tool';

// Define custom state with Annotation.Root
const ExampleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // Add custom state properties here
  customData: Annotation<Record<string, unknown>>({
    reducer: (oldValue, newValue) => ({ ...oldValue, ...newValue }),
    default: () => ({}),
  }),
});

const assistant = async (state: typeof ExampleState.State) => {
  const llm = openAIModel.bindTools([calculator, getWeather]);
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
};

const shouldContinue = (state: typeof ExampleState.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  return 'responseFormatter';
};

const responseFormatter = async (state: typeof ExampleState.State) => {
  return {
    messages: state.messages,
    customData: state.customData,
  };
};

// Define the graph
const workflow = new StateGraph(ExampleState)
  .addNode('assistant', assistant)
  .addNode('tools', new ToolNode([calculator, getWeather]))
  .addNode('responseFormatter', responseFormatter)
  .addEdge(START, 'assistant')
  .addConditionalEdges('assistant', shouldContinue, {
    tools: 'tools',
    responseFormatter: 'responseFormatter',
  })
  .addEdge('tools', 'assistant')
  .addEdge('responseFormatter', END);

export const graph = workflow.compile({ checkpointer: new MemorySaver() });
