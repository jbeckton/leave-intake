import { tool } from 'langchain';
import * as z from 'zod';

/**
 * Calculator tool - Performs basic arithmetic operations
 */
export const calculator = tool(
  async (input) => {
    const { operation, a, b } = input;

    switch (operation) {
      case 'add':
        return `${a} + ${b} = ${a + b}`;
      case 'subtract':
        return `${a} - ${b} = ${a - b}`;
      case 'multiply':
        return `${a} * ${b} = ${a * b}`;
      case 'divide':
        return b !== 0 ? `${a} / ${b} = ${a / b}` : 'Error: Division by zero';
      default:
        return 'Unknown operation';
    }
  },
  {
    name: 'calculator',
    description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
    schema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('The arithmetic operation to perform'),
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
  },
);
