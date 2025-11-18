import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import cors from 'cors';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON bodies for POST requests
app.use(express.json());
// Enable CORS for browser clients (allow dev origin http://localhost:4200)
app.use(cors({ origin: ['http://localhost:4200', 'http://127.0.0.1:4200'], credentials: true }));

// Mock GET endpoint to return repositories list and details
app.get('/repos', (req, res) => {
  try {
    const repos = [
      { id: 1, name: 'Repo 1', url: 'https://example.com/repo1', description: 'Repository 1 description' },
      { id: 2, name: 'Repo 2', url: 'https://example.com/repo2', description: 'Repository 2 description' },
      { id: 3, name: 'Repo 3', url: 'https://example.com/repo3', description: 'Repository 3 description' }
    ];

    // simple details map that might include additional metadata or precomputed file trees
    const details: Record<string, any> = {};
    for (const r of repos) {
      details[r.id] = {
        id: r.id,
        name: r.name,
        url: r.url,
        description: r.description,
        // small mock file tree for client-side usage
        files: [
          { name: 'src', type: 'folder', children: [ { name: 'index.ts', type: 'file' }, { name: 'app.ts', type: 'file' } ] },
        ]
      };
    }

    const payload = { status: 'success', data: repos, details };
    console.log('Mock repos GET called, returning', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch repos' });
  }
});

// Simple mock POST endpoint for analyze-impact
app.post('/analyze-impact', (req, res) => {
  try {
    const b = req.body as Record<string, any>;
    const compareRepositoryUrls: string[] = Array.isArray(b?.['compareRepositoryUrls']) ? b?.['compareRepositoryUrls'] : [];
    const localFilePath = b?.['localFilePath'] ? String(b?.['localFilePath']) : '/Users/user/projects/mock_test_repo';
    const targetFilename = b?.['targetFilename'] ? String(b?.['targetFilename']) : 'A_Helper.java';

    // Build a mocked affectedClasses response: return example classes for first two repos
    const affectedClasses = compareRepositoryUrls.map((r: string, idx: number) => {
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

// New API route expected by the frontend: POST /api/v1/impact/analyze
app.post('/api/v1/impact/analyze', (req, res) => {
  try {
    const b = req.body as Record<string, any> || {};
    const repositoryUrls: string[] = Array.isArray(b?.['repositoryUrls']) ? b?.['repositoryUrls'] : [];
    // allow caller to pass explicit sourceRepo or fall back to first repositoryUrls
    const sourceRepo = b?.['sourceRepo'] ?? (repositoryUrls.length > 0 ? repositoryUrls[0] : null);

    // For demonstration, produce impactedModules based on sourceRepo contents
    const sampleModulesForOrderPurchase = [
      'com.app.analytics.AnalyticsEngine',
      'com.app.invoicing.InvoiceGenerator',
      'com.app.order.OrderProcessor',
      'com.app.finance.PricingUtility'
    ];

    const impactedModules = sourceRepo && String(sourceRepo).includes('order-purchase')
      ? sampleModulesForOrderPurchase
      : [ 'com.app.modulea.DataGenerator', 'com.app.modulea.DataGenerator2' ];

    const changedCode = b?.['changedCode'] ?? null;

    const payload = {
      status: 'success',
      impactedModules,
      selectedRepository: sourceRepo,
      changedCode,
      timestamp: new Date().toISOString()
    };

    console.log('Mock /api/v1/impact/analyze called, returning:', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'failed to process analyze' });
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
            changedMethod: 'calculateDiscount',
            llmReport: {
              analysisId: 'A1B2C3D4E5',
              riskScore: 9,
              reasoning: `1. Analyze Contractual Change in Module A: The ` + "`calculateDiscount`" + ` method in Module A (PricingUtility) has changed its return type from ` + "`double`" + ` to ` + "`BigDecimal`" + `. This is a significant change from a primitive type to an object type, primarily for precision, but it introduces breaking changes for any consumer expecting a ` + "`double`" + `.
2. Trace Direct Dependencies (Syntactic Check):
   - ` + "`com.app.analytics.AnalyticsEngine`" + `: The ` + "`logDiscount`" + ` method calls ` + "`calculateDiscount`" + `. The assignment ` + "`BigDecimal discount = pricing.calculateDiscount(price, percentage);`" + ` is syntactically correct as it now expects and receives a ` + "`BigDecimal`" + `.
   - ` + "`com.consumer.AuditService`" + `: The ` + "`printTaxAndInvoiceInfo`" + ` method calls ` + "`calculateDiscount`" + `. The assignment ` + "`double totalCalculateValue = pricingUtility.calculateDiscount(2, 3);`" + ` will result in a ` + "`SYNTACTIC_BREAK`" + ` because a ` + "`BigDecimal`" + ` cannot be implicitly converted to a ` + "`double`" + `.
   - ` + "`com.app.order.OrderProcessor`" + `: The ` + "`processOrder`" + ` method calls ` + "`calculateDiscount`" + `. The assignment ` + "`double appliedDiscount = pricing.calculateDiscount(total, discountPct);`" + ` will also result in a ` + "`SYNTACTIC_BREAK`" + ` for the same reason.
3. Trace Semantic Dependencies (Logic Check):
   - ` + "`com.app.analytics.AnalyticsEngine`" + `: Although syntactically correct, the change from a primitive ` + "`double`" + ` to an object ` + "`BigDecimal`" + ` introduces semantic implications. Primitives cannot be ` + "`null`" + `, whereas objects can. The contextual module's code explicitly includes ` + "`if (discount != null)`" + `, indicating an awareness of this new potential state. This change in data handling requirements, even if addressed, represents a ` + "`SEMANTIC_BREAK`" + ` as the nature of the data and its safety checks have fundamentally changed, introducing a runtime risk if not handled correctly.
   - ` + "`com.consumer.AuditService`" + `: The primary impact is syntactic. Once resolved, any subsequent arithmetic operations involving ` + "`totalCalculateValue`" + ` would need to be updated to use ` + "`BigDecimal`" + ` methods, which would be a further semantic change.
   - ` + "`com.app.order.OrderProcessor`" + `: The primary impact is syntactic. Once resolved, the subtraction ` + "`total - appliedDiscount`" + ` would need to be updated to use ` + "`BigDecimal`" + ` arithmetic (e.g., ` + "`BigDecimal.valueOf(total).subtract(appliedDiscount)`" + `), which would be a further semantic change.
4. Validate Code Removals (Dead Code Check): No methods were removed from Module A, so this step is not applicable.
5. Determine Risk Score: Two modules (` + "`com.consumer.AuditService`" + `, ` + "`com.app.order.OrderProcessor`" + `) will fail to compile due to ` + "`SYNTACTIC_BREAK`s`" + `. One module (` + "`com.app.analytics.AnalyticsEngine`" + `) requires a semantic adjustment to handle the new object type and its potential nullability, even if the current code handles it. This widespread impact on compilation and the fundamental change in data type handling warrants a high-risk score. A score of 9 is appropriate due to the immediate compilation failures and the necessary semantic adjustments.`,
              impactedModules: [
                {
                  moduleName: 'com.app.analytics.AnalyticsEngine',
                  impactType: 'SEMANTIC_BREAK',
                  description: "The return type of `calculateDiscount` changed from `double` to `BigDecimal`. While the code was updated to accept `BigDecimal`, the change from a primitive to an object type introduces a new runtime risk. `BigDecimal` can be `null`, unlike `double`, requiring explicit null checks. Although a null check is present, the fundamental change in data handling and the potential for `NullPointerException` if not handled correctly constitutes a semantic break. The subsequent operations on `BigDecimal` (e.g., `toPlainString()`) are also specific to the `BigDecimal` type and differ from primitive `double` operations."
                },
                {
                  moduleName: 'com.consumer.AuditService',
                  impactType: 'SYNTACTIC_BREAK',
                  description: "The `calculateDiscount` method now returns `BigDecimal`, but the `totalCalculateValue` variable is declared as `double`. This results in a compilation error: 'incompatible types: BigDecimal cannot be converted to double'. The code needs to be updated to declare `totalCalculateValue` as `BigDecimal` and adjust subsequent operations if any."
                },
                {
                  moduleName: 'com.app.order.OrderProcessor',
                  impactType: 'SYNTACTIC_BREAK',
                  description: "The `calculateDiscount` method now returns `BigDecimal`, but the `appliedDiscount` variable is declared as `double`. This results in a compilation error: 'incompatible types: BigDecimal cannot be converted to double'. The code needs to be updated to declare `appliedDiscount` as `BigDecimal` and modify the subtraction operation (`total - appliedDiscount`) to use `BigDecimal` arithmetic (e.g., `BigDecimal.valueOf(total).subtract(appliedDiscount)`)."
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
  const port = process.env['PORT'] || 8080;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** Request handler used by the Angular CLI (for dev-server and during build) */
export const reqHandler = createNodeRequestHandler(app);
