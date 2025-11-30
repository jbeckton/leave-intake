import { StateGraph, START, END, Annotation, messagesStateReducer, LangGraphRunnableConfig, MemorySaver } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseMessage, AIMessage } from '@langchain/core/messages';

import { calculator } from './common/tools'
import { RuntimeContext, RuntimeContextSchema } from './common/types';
import { openAIModel } from './utils/llm-models'

// Define a WizardState
const WizardState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  wizardName: Annotation<string>({
    reducer: (oldValue, newValue) => oldValue !== '' ? oldValue : newValue,
    default: () => '' }),
  myInput: Annotation<object | null>({
    reducer: (oldValue, newValue) => ({ ...oldValue, ...newValue }),
    default: () => null }),
});

// {"messages": ["What is 25%  of 145,000?"], "myInput": {"msg": "Deez Nuts!"}}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assistant = async (state: typeof WizardState.State, config: LangGraphRunnableConfig<RuntimeContext>) => {
  try {
    // console.log('#### Assistant node invoked with state:', state);
    const llm = openAIModel.bindTools([calculator]);
    const response = await llm.invoke(state.messages);

    return {
      messages: [response],
      wizardName: 'Stinky Wizard',
    };
  }
  catch (error) {
    console.error('Error in assistant node:', error);
    return { messages: [new AIMessage('Sorry, something went wrong.')] };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shouldContinue = (state: typeof WizardState.State, config: LangGraphRunnableConfig<RuntimeContext>) => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  return 'responseFormatter';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const responseFormatter = async (state: typeof WizardState.State, config: LangGraphRunnableConfig<RuntimeContext>) => {
  return {
    messages: state.messages,
    wizardName: state.wizardName,
    myInput: state.myInput,
  };
};

// Define the graph
const workflow = new StateGraph(WizardState, RuntimeContextSchema)
  // nodes
  .addNode('assistant', assistant)
  .addNode('tools', new ToolNode([calculator]))
  .addNode('responseFormatter', responseFormatter)
  // edges
  .addEdge(START, 'assistant')
  .addConditionalEdges('assistant', shouldContinue, {
    tools: 'tools',
    responseFormatter: 'responseFormatter',
  })
  .addEdge('tools', 'assistant')
  .addEdge('responseFormatter', END);

export const graph = workflow.compile({ checkpointer: new MemorySaver() });
