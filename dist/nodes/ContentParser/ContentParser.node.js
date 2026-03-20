"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentParser = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const gray_matter_1 = __importDefault(require("gray-matter"));
class ContentParser {
    constructor() {
        this.description = {
            displayName: 'Content Parser',
            name: 'contentParser',
            icon: 'fa:file-alt',
            group: ['transform'],
            version: 1,
            description: 'Parse Hugo/Jekyll markdown: splits frontmatter and body content, or recombines them',
            defaults: {
                name: 'Content Parser',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Parse',
                            value: 'parse',
                            description: 'Split a markdown string into frontmatter and body',
                        },
                        {
                            name: 'Stringify',
                            value: 'stringify',
                            description: 'Combine a frontmatter object and body into a markdown string',
                        },
                    ],
                    default: 'parse',
                },
                // ── Parse inputs ────────────────────────────────────────────────
                {
                    displayName: 'Markdown',
                    name: 'markdownText',
                    type: 'string',
                    default: '',
                    description: 'The markdown string to parse (drag a field here or use an expression)',
                    typeOptions: { rows: 4 },
                    displayOptions: { show: { operation: ['parse'] } },
                },
                {
                    displayName: 'Frontmatter Engine',
                    name: 'engine',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'YAML (default)', value: 'yaml' },
                        { name: 'TOML', value: 'toml' },
                        { name: 'JSON', value: 'json' },
                    ],
                    default: 'yaml',
                    description: 'Frontmatter format used in the markdown file',
                    displayOptions: { show: { operation: ['parse'] } },
                },
                {
                    displayName: 'Output Mode',
                    name: 'outputMode',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Merge Into Item',
                            value: 'merge',
                            description: 'Add parsed fields to the existing item',
                        },
                        {
                            name: 'Replace Item',
                            value: 'replace',
                            description: 'Output only the parsed result',
                        },
                    ],
                    default: 'merge',
                    displayOptions: { show: { operation: ['parse'] } },
                },
                {
                    displayName: 'Body Output Field',
                    name: 'contentField',
                    type: 'string',
                    default: 'body',
                    description: 'Field name to store the parsed body content',
                    displayOptions: { show: { operation: ['parse'] } },
                },
                {
                    displayName: 'Frontmatter Output Field',
                    name: 'frontmatterField',
                    type: 'string',
                    default: 'frontmatter',
                    description: 'Field name to store the frontmatter object. Leave empty to spread keys directly onto the item.',
                    displayOptions: { show: { operation: ['parse'] } },
                },
                // ── Stringify inputs ─────────────────────────────────────────────
                {
                    displayName: 'Frontmatter',
                    name: 'frontmatterData',
                    type: 'string',
                    default: '',
                    description: 'The frontmatter object (drag a field here or use an expression)',
                    displayOptions: { show: { operation: ['stringify'] } },
                },
                {
                    displayName: 'Body',
                    name: 'bodyContent',
                    type: 'string',
                    default: '',
                    description: 'The body content (drag a field here or use an expression)',
                    typeOptions: { rows: 4 },
                    displayOptions: { show: { operation: ['stringify'] } },
                },
                {
                    displayName: 'Frontmatter Engine',
                    name: 'stringifyEngine',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'YAML (default)', value: 'yaml' },
                        { name: 'TOML', value: 'toml' },
                    ],
                    default: 'yaml',
                    description: 'Frontmatter format to use when writing the output',
                    displayOptions: { show: { operation: ['stringify'] } },
                },
                {
                    displayName: 'Output Mode',
                    name: 'stringifyOutputMode',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Merge Into Item',
                            value: 'merge',
                            description: 'Add the markdown field to the existing item',
                        },
                        {
                            name: 'Replace Item',
                            value: 'replace',
                            description: 'Output only the markdown field',
                        },
                    ],
                    default: 'merge',
                    displayOptions: { show: { operation: ['stringify'] } },
                },
                {
                    displayName: 'Markdown Output Field',
                    name: 'markdownOutputField',
                    type: 'string',
                    default: 'markdown',
                    description: 'Field name to store the generated markdown string',
                    displayOptions: { show: { operation: ['stringify'] } },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const results = [];
        for (let i = 0; i < items.length; i++) {
            const operation = this.getNodeParameter('operation', i);
            if (operation === 'parse') {
                results.push(parseItem.call(this, items[i], i));
            }
            else {
                results.push(stringifyItem.call(this, items[i], i));
            }
        }
        return [results];
    }
}
exports.ContentParser = ContentParser;
// ── Parse ─────────────────────────────────────────────────────────────────────
function parseItem(item, i) {
    const raw = this.getNodeParameter('markdownText', i);
    const engine = this.getNodeParameter('engine', i);
    const outputMode = this.getNodeParameter('outputMode', i);
    const contentField = this.getNodeParameter('contentField', i);
    const frontmatterField = this.getNodeParameter('frontmatterField', i);
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Markdown input is empty or not a string on item ${i}`, { itemIndex: i });
    }
    let parsed;
    try {
        parsed = (0, gray_matter_1.default)(raw, { engines: engine === 'toml' ? { toml: tomlEngine } : undefined });
    }
    catch (err) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to parse frontmatter on item ${i}: ${err.message}`, { itemIndex: i });
    }
    const base = outputMode === 'merge' ? { ...item.json } : {};
    const output = frontmatterField
        ? {
            ...base,
            [frontmatterField]: parsed.data,
            [contentField]: parsed.content.trim(),
        }
        : {
            ...base,
            ...parsed.data,
            [contentField]: parsed.content.trim(),
        };
    return { json: output, pairedItem: { item: i } };
}
// ── Stringify ─────────────────────────────────────────────────────────────────
function stringifyItem(item, i) {
    const frontmatterRaw = this.getNodeParameter('frontmatterData', i);
    const body = this.getNodeParameter('bodyContent', i);
    const engine = this.getNodeParameter('stringifyEngine', i);
    const outputMode = this.getNodeParameter('stringifyOutputMode', i);
    const markdownOutputField = this.getNodeParameter('markdownOutputField', i);
    // frontmatterRaw may arrive as an object (expression) or a JSON string
    let frontmatterData;
    if (typeof frontmatterRaw === 'string') {
        try {
            frontmatterData = JSON.parse(frontmatterRaw);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Frontmatter on item ${i} is not valid JSON`, { itemIndex: i });
        }
    }
    else if (frontmatterRaw && typeof frontmatterRaw === 'object') {
        frontmatterData = frontmatterRaw;
    }
    else {
        frontmatterData = {};
    }
    let markdown;
    try {
        markdown = gray_matter_1.default.stringify(body !== null && body !== void 0 ? body : '', frontmatterData, {
            engines: engine === 'toml' ? { toml: tomlEngine } : undefined,
        });
    }
    catch (err) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to stringify on item ${i}: ${err.message}`, { itemIndex: i });
    }
    const base = outputMode === 'merge' ? { ...item.json } : {};
    const output = { ...base, [markdownOutputField]: markdown };
    return { json: output, pairedItem: { item: i } };
}
// ── Minimal TOML engine ───────────────────────────────────────────────────────
const tomlEngine = {
    parse(input) {
        const result = {};
        for (const line of input.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('['))
                continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1)
                continue;
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            result[key] = val;
        }
        return result;
    },
    stringify(obj) {
        return Object.entries(obj)
            .map(([k, v]) => `${k} = "${String(v)}"`)
            .join('\n');
    },
};
//# sourceMappingURL=ContentParser.node.js.map