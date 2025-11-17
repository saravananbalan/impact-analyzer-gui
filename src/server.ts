import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON bodies for POST requests
app.use(express.json());

// Simple mock POST endpoint for analyze-impact
app.post('/analyze-impact', (req, res) => {
  try {
    const b = req.body as Record<string, any>;
    const repositoryUrls: string[] = Array.isArray(b?.['repositoryUrls']) ? b?.['repositoryUrls'] : [];
    const localFilePath = b?.['localFilePath'] ? String(b?.['localFilePath']) : '/Users/user/projects/mock_test_repo';
    const targetFilename = b?.['targetFilename'] ? String(b?.['targetFilename']) : 'A_Helper.java';

    // Build a mocked affectedClasses response: return example classes for first two repos
    const affectedClasses = repositoryUrls.map((r: string, idx: number) => {
      if (idx < 2) return { [r]: ['testclass.java', 'testclass2.java'] };
      return { [r]: [] };
    });

    const payload = {
      status: 'success',
      affectedClasses,
      localFilePath,
      targetFilename,
    };

    console.log('Mock analyze-impact called (POST), returning:', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'failed to process' });
  }
});

// Mock POST endpoint for after-analyze: accepts { file, inputText } and echoes a response
app.post('/after-analyze', (req, res) => {
  try {
    const b = req.body as Record<string, any>;
    const file = b?.['file'] ? String(b['file']) : 'unknown';
    const inputText = b?.['inputText'] ? String(b['inputText']) : '';

    const response = {
      status: 'success',
      file,
      received: inputText,
      message: `Received ${inputText ? inputText.length : 0} characters for ${file}`,
      timestamp: new Date().toISOString(),
    };

    console.log('Mock after-analyze called (POST), payload:', b, 'responding:', response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'failed to process after-analyze' });
  }
});

app.post('/check-impact', (req, res) => {
  try {
    const b = req.body as Record<string, any>;
    const sourceRepo = b?.['sourceRepo'] ?? null;
    const compareRepos = Array.isArray(b?.['compareRepos']) ? b?.['compareRepos'] : [];
    const file = b?.['file'] ?? null;
  const original = b?.['original'] ?? '';
  const modified = b?.['modified'] ?? '';
  const message = b?.['message'] ?? null;
  const filePath = b?.['filePath'] ?? null;

    const llmResponse = [
      {
        changedMethod: 'getTimestamp',
        llmReport: {
          riskScore: 8,
          reasoning: `Dummy reasoning for getTimestamp change.${message ? ' Source message: ' + String(message).slice(0, 200) : ''}${filePath ? ' (filePath: ' + String(filePath).slice(0,200) + ')' : ''}`,
          impactedModules: [
            {
              moduleName: 'com.app.modulea.DataGenerator',
              impactType: 'SYNTACTIC_BREAK',
              description: 'Return type mismatch.'
            },
            {
              moduleName: 'com.app.modulea.DataGenerator2',
              impactType: 'SYNTACTIC_BREAK2',
              description: 'Return type mismatch error.'
            }
          ]
        }
      }
    ];

    console.log('Mock check-impact called (POST), payload:', b, 'responding with llm array');
    res.json(llmResponse);
  } catch (err) {
    res.status(500).json({ error: 'failed to process check-impact' });
  }
});

/** Serve static files from /browser */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/** Handle all other requests by rendering the Angular application. */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/** Start the server if this module is the main entry point */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** Request handler used by the Angular CLI (for dev-server and during build) */
export const reqHandler = createNodeRequestHandler(app);
