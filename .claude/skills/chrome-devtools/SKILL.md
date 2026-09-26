---
name: chrome-devtools
description: 'Expert-level browser automation, debugging, and performance analysis using Chrome DevTools MCP. Use for interacting with web pages, capturing screenshots, analyzing network traffic, and profiling performance.'
license: MIT
---

# Chrome DevTools Agent

## Overview

A specialized skill for controlling and inspecting a live Chrome browser. This skill leverages the `chrome-devtools` MCP server to perform a wide range of browser-related tasks, from simple navigation to complex performance profiling.

## Project-Specific Configuration

### Base URL

```
http://localhost:3000
```

### Test Credentials

- **Email**: yordanpz@hotmail.com
- **Password**: Yoselania23.

### Login Flow

1. Navigate to `http://localhost:3000`
2. If redirected to login page, fill email and password fields
3. Click the login/submit button
4. Wait for redirect to `/dashboard`

### CRITICAL: Always Check Routing First

**Before testing any feature, ALWAYS verify the navigation path to reach the target page.** Do NOT assume URLs - follow the actual sidebar navigation:

1. Take a snapshot of the current page to identify sidebar links
2. Click through the sidebar to reach the target section
3. If the page uses tabs, identify and click the correct tab
4. Only then interact with the feature being tested

### Key Routes Reference

| Feature            | Sidebar Link                          | URL                                           | Default Tab |
| ------------------ | ------------------------------------- | --------------------------------------------- | ----------- |
| Operaciones        | "Operaciones" (position 7)            | `/dashboard/operations`                       | `preparte`  |
| Preparte (Pedidos) | Operaciones > Tab "Gestor de Pedidos" | `/dashboard/operations?tab=preparte`          | -           |
| Partes Diarios     | Operaciones > Tab "Partes Diarios"    | `/dashboard/operations?tab=dailyreportstable` | -           |
| Empleados          | "Empleados"                           | `/dashboard/employee`                         | -           |
| Equipos            | "Equipos"                             | `/dashboard/equipment`                        | -           |
| Configuracion      | "Configuración"                       | `/dashboard/configuration`                                    | -           |
| Documentacion      | "Documentacion"                       | `/dashboard/document`                         | -           |
| Mantenimiento      | "Mantenimiento"                       | `/dashboard/maintenance`                      | -           |

### Supabase MCP for Test Data

Use `supabase-LOCAL` MCP (default) for:

- Inserting test data before testing a feature
- Verifying database state after performing actions in the browser
- Checking that records were created/updated correctly after form submissions
- Validating migrations by checking table structure

**Workflow pattern:**

1. Insert test data via `supabase-LOCAL` MCP if needed
2. Navigate to the feature in the browser via chrome-devtools
3. Perform the action (fill forms, click buttons, etc.)
4. Verify results visually via chrome-devtools (snapshot/screenshot)
5. Verify data integrity via `supabase-LOCAL` MCP (execute_sql)

## When to Use

Use this skill when:

- **Browser Automation**: Navigating pages, clicking elements, filling forms, and handling dialogs.
- **Visual Inspection**: Taking screenshots or text snapshots of web pages.
- **Debugging**: Inspecting console messages, evaluating JavaScript in the page context, and analyzing network requests.
- **Performance Analysis**: Recording and analyzing performance traces to identify bottlenecks and Core Web Vital issues.
- **Emulation**: Resizing the viewport or emulating network/CPU conditions.
- **Feature Testing**: Testing new features end-to-end by navigating to the page, interacting with elements, and verifying results.
- **Migration Verification**: Checking that data flows correctly between features (e.g., preparte to daily report).

## Tool Categories

### 1. Navigation & Page Management

- `new_page`: Open a new tab/page.
- `navigate_page`: Go to a specific URL, reload, or navigate history.
- `select_page`: Switch context between open pages.
- `list_pages`: See all open pages and their IDs.
- `close_page`: Close a specific page.
- `wait_for`: Wait for specific text to appear on the page.

### 2. Input & Interaction

- `click`: Click on an element (use `uid` from snapshot).
- `fill` / `fill_form`: Type text into inputs or fill multiple fields at once.
- `hover`: Move the mouse over an element.
- `press_key`: Send keyboard shortcuts or special keys (e.g., "Enter", "Control+C").
- `drag`: Drag and drop elements.
- `handle_dialog`: Accept or dismiss browser alerts/prompts.
- `upload_file`: Upload a file through a file input.

### 3. Debugging & Inspection

- `take_snapshot`: Get a text-based accessibility tree (best for identifying elements).
- `take_screenshot`: Capture a visual representation of the page or a specific element.
- `list_console_messages` / `get_console_message`: Inspect the page's console output.
- `evaluate_script`: Run custom JavaScript in the page context.
- `list_network_requests` / `get_network_request`: Analyze network traffic and request details.

### 4. Emulation & Performance

- `resize_page`: Change the viewport dimensions.
- `emulate`: Throttling CPU/Network or emulating geolocation.
- `performance_start_trace`: Start recording a performance profile.
- `performance_stop_trace`: Stop recording and save the trace.
- `performance_analyze_insight`: Get detailed analysis from recorded performance data.

## Workflow Patterns

### Pattern A: Identifying Elements (Snapshot-First)

Always prefer `take_snapshot` over `take_screenshot` for finding elements. The snapshot provides `uid` values which are required by interaction tools.

```markdown
1. `take_snapshot` to get the current page structure.
2. Find the `uid` of the target element.
3. Use `click(uid=...)` or `fill(uid=..., value=...)`.
```

### Pattern B: Troubleshooting Errors

When a page is failing, check both console logs and network requests.

```markdown
1. `list_console_messages` to check for JavaScript errors.
2. `list_network_requests` to identify failed (4xx/5xx) resources.
3. `evaluate_script` to check the value of specific DOM elements or global variables.
```

### Pattern C: Performance Profiling

Identify why a page is slow.

```markdown
1. `performance_start_trace(reload=true, autoStop=true)`
2. Wait for the page to load/trace to finish.
3. `performance_analyze_insight` to find LCP issues or layout shifts.
```

### Pattern D: Full Feature Testing (Project-Specific)

End-to-end testing of a feature with database verification.

```markdown
1. Login if needed (check if already authenticated).
2. Navigate to the feature via sidebar (follow routing table above).
3. `take_snapshot` to identify interactive elements.
4. Fill forms / click buttons to perform the action.
5. `take_snapshot` or `take_screenshot` to verify visual result.
6. Use `supabase-LOCAL` MCP to verify database state.
```

### Pattern E: Preparte to Daily Report Migration Testing

Test the flow of confirming a preparte and verifying it appears in the daily report.

```markdown
1. (Optional) Insert test preparte via `supabase-LOCAL` MCP.
2. Navigate to /dashboard/operations?tab=preparte.
3. Find a preparte with status "pendiente" in the table.
4. Click the confirm button on the preparte row.
5. Verify toast message appears ("Pedido confirmado y enviado al parte diario").
6. Switch to "Partes Diarios" tab.
7. Verify the daily report row was created with correct data.
8. Use `supabase-LOCAL` MCP to verify:
   - `dailyreportrows` has a row with `preparte_id` matching the confirmed preparte
   - `preparte` status was updated to "confirmado"
```

## Best Practices

- **Context Awareness**: Always run `list_pages` and `select_page` if you are unsure which tab is currently active.
- **Snapshots**: Take a new snapshot after any major navigation or DOM change, as `uid` values may change.
- **Timeouts**: Use reasonable timeouts for `wait_for` to avoid hanging on slow-loading elements.
- **Screenshots**: Use `take_screenshot` sparingly for visual verification, but rely on `take_snapshot` for logic.
- **Routing First**: ALWAYS check the current page URL and navigate via sidebar before interacting with features.
- **Database Verification**: After any CRUD operation, verify the database state using `supabase-LOCAL` MCP.
- **Login State**: Always check if the user is already logged in before attempting login. If on `/dashboard/*`, the user is authenticated.
- **CRITICAL - UI Refresh Bug Detection**: If at any point during testing you observe that a database action succeeds but the UI does not update (cards, tables, counts, etc.), you MUST fix the refresh bug immediately. The UI must always reflect the current state after every action. Common fix: ensure `router.refresh()` is called alongside `queryClient.invalidateQueries()` to refresh both client-side queries and Server Components.
