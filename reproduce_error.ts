import { graph } from './src/agent.ts';
import { HumanMessage } from '@langchain/core/messages';

async function main() {
  const config = { configurable: { thread_id: "test-thread" } };
  const inputs = { messages: [new HumanMessage("What is 2 + 2?")] };
  
  try {
    const stream = await graph.stream(inputs, config);
    for await (const event of stream) {
      console.log(event);
    }
  } catch (error) {
    console.error("Error running graph:", error);
  }
}

main();
