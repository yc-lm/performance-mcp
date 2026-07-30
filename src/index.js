import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { createPerformanceClient } from './performance-client.js';

const client = createPerformanceClient({
  baseUrl: process.env.PERFORMANCE_BASE_URL,
  token: process.env.PERFORMANCE_TOKEN,
  username: process.env.PERFORMANCE_USERNAME,
  password: process.env.PERFORMANCE_PASSWORD,
});

const server = new McpServer({
  name: 'performance-mcp',
  version: '0.1.0',
});

server.registerTool(
  'list_periods',
  { description: 'List available performance assessment periods for the logged-in user.' },
  async () => textResult(await client.listPeriods()),
);

server.registerTool(
  'list_performance_evaluations',
  {
    description: 'List the current user performance evaluations. Use list_periods first when a period ID is needed.',
    inputSchema: {
      periodId: z.string().optional().describe('Assessment period ID.'),
      page: z.number().int().positive().optional().describe('Page number. Defaults to 1.'),
      limit: z.number().int().positive().max(100).optional().describe('Rows per page. Defaults to 10.'),
      status: z.string().optional().describe('Optional evaluation status filter.'),
      sortBy: z.string().optional().describe('Sort field. Defaults to finalTotal.'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to desc.'),
    },
  },
  async (input) => textResult(await client.listEvaluations(input)),
);

server.registerTool(
  'get_performance_evaluation_detail',
  {
    description: 'Get the complete detail for one performance evaluation, including tasks, scores, comments, and code/document summary.',
    inputSchema: {
      evaluationId: z.string().min(1).describe('Evaluation ID to query.'),
    },
  },
  async ({ evaluationId }) => textResult(await client.getEvaluation(evaluationId)),
);

server.registerTool(
  'save_performance_draft',
  {
    description: 'Save self-evaluation scores and comments as a draft using the evaluation scores endpoint. This tool never submits a final evaluation.',
    inputSchema: {
      evaluationId: z.string().min(1).describe('Evaluation ID to save.'),
      scores: z.array(z.object({
        categoryCode: z.string().min(1),
        indicatorCode: z.string().min(1),
        selfScore: z.number().min(0).max(100),
        customTaskName: z.string().optional(),
        plannedDays: z.number().nonnegative().optional(),
        completedDays: z.number().nonnegative().optional(),
      })).min(1).describe('All evaluation indicator scores to persist.'),
      selfComment: z.string().optional().describe('Short self-evaluation summary.'),
      docAndCode: z.string().optional().describe('Brief code and document delivery summary.'),
    },
  },
  async (input) => textResult(await client.saveDraft(input)),
);

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const transport = new StdioServerTransport();
await server.connect(transport);
