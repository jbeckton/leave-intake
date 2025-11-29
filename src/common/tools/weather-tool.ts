import { tool } from 'langchain';
import * as z from 'zod';

/**
 * Weather tool - Returns weather information for a given city
 */
export const getWeather = tool(
  async (input) => {
    return `It's always sunny in ${input.city}!`;
  },
  {
    name: 'get_weather',
    description: 'Get the weather for a given city',
    schema: z.object({
      city: z.string().describe('The city to get the weather for'),
    }),
  },
);
