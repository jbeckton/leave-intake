import { StateGraph, START, END, Annotation, messagesStateReducer, LangGraphRunnableConfig } from '@langchain/langgraph'
import { BaseMessage, AIMessageChunk } from '@langchain/core/messages';

import { calculator } from './common/tools'
import { RuntimeContext, RuntimeContextSchema } from './common/types';
import { geminiModel } from './utils/llm-models'

// System message, this will be leave intake assistant behavior
// const sysMsg = new SystemMessage("You are a helpful assistant.");

/*
// This WizardState is just an idea.
export const WizardState = Annotation.Root({
  // 1. Conversation History (Append-only reducer)
  // Used for LLM context (Chatbot memory)
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),

  // 2. The Wizard "Form Data" (Merge/Overwrite reducer)
  // This holds the actual answers (e.g., { leaveType: 'Medical', startDate: '2023-01-01' })
  // This is the "Truth" for the business logic.
  wizardData: Annotation<Record<string, any>>({
    reducer: (curr, update) => ({ ...curr, ...update }),
    default: () => ({}),
  }),

  // 3. Flow Control
  currentStepId: Annotation<string>(), // The ID of the current active step
  status: Annotation<'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'>(),

  // 4. UI Contract (The Generative UI Payload)
  // The Frontend reads this to know what to render next.
  uiPayload: Annotation<{
    type: 'form' | 'message' | 'review'
    schema?: any // JSON Schema for the form component
    data?: any // Pre-filled data or validation errors
  }>(),
});
 */

// Define a WizardState
const WizardState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

// Entry Node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assistant = async (state: typeof WizardState.State, config: LangGraphRunnableConfig<RuntimeContext>) => {
  const llm = geminiModel.bindTools([calculator]);

  const response = await llm.invoke(state.messages);
  // {"messages": ["what is 3 times 3?"]}
  const messages = [];

  // console.log('LLM Response:', response);

  if (response.tool_calls && response.tool_calls.length > 0) {
    // Handle tool calls if any
    // const toolResult = await runTools(state);
    // return toolResult;
    messages.push(new AIMessageChunk('The answer is 5!.'));
  }
  else {
    messages.push(new AIMessageChunk('I can only do math, im a calculator dummy.'));
  };

  return { messages };
}

/* const runTools = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCall = lastMessage.tool_calls[0];

  // Actually run the code here!
  if (toolCall.name === 'calculator') {
    const result = toolCall.args.a * toolCall.args.b; // 27

    // Return the result to the chat history
    return {
      messages: [new ToolMessage({ content: result.toString(), tool_call_id: toolCall.id })],
    };
  }
} */

// Define a new graph.
const workflow = new StateGraph(WizardState, RuntimeContextSchema)
// nodes
  .addNode('assistant', assistant)
  // edges
  .addEdge(START, 'assistant')
  .addEdge('assistant', END);

export const graph = workflow.compile();
