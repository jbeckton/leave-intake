import { StateGraph, START, END, MessagesAnnotation } from '@langchain/langgraph';
import { geminiModel } from './utils/llm-models';
import z from 'zod';
import { calculator } from './common/tools';
import { AIMessageChunk } from 'langchain';

// const ToDOSchema = z.object({
//   id: z.string().uuid(),
//   task: z.string().min(1),
//   completed: z.boolean().default(false),
// });

const assistant = async (state: typeof MessagesAnnotation.State) => {
  const llm = geminiModel.bindTools([calculator]);

  const response = await llm.invoke(state.messages);

  const messages = [];

  console.log('LLM Response:', response);

  if (response.tool_calls && response.tool_calls.length > 0) {
    // Handle tool calls if any
    // const toolResult = await runTools(state);
    // return toolResult;
    messages.push(new AIMessageChunk('The answer is 5!.'));
  }
  else {
    messages.push(new AIMessageChunk('I can only do math, im a calculator dummy.'));
  };

  // const aiResponse = new AIMessage('I do not know what I am doing!');

  return { messages };
};

// Define a new graph.
const workflow = new StateGraph(MessagesAnnotation)
// nodes
  .addNode('assistant', assistant)
  // flow
  .addEdge(START, 'assistant')
  .addEdge('assistant', END);

export const graph = workflow.compile();
