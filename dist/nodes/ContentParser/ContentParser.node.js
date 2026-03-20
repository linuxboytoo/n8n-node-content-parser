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
            description: 'Parse Hugo/Jekyll markdown: splits frontmatter and body content',
            defaults: {
                name: 'Content Parser',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Markdown Field',
                    name: 'markdownField',
                    type: 'string',
                    default: 'content',
                    description: 'Name of the input field containing the markdown string',
                },
                {
                    displayName: 'Frontmatter Engine',
                    name: 'engine',
                    type: 'options',
                    options: [
                        { name: 'YAML (default)', value: 'yaml' },
                        { name: 'TOML', value: 'toml' },
                        { name: 'JSON', value: 'json' },
                    ],
                    default: 'yaml',
                    description: 'Frontmatter format used in the markdown file',
                },
                {
                    displayName: 'Output Mode',
                    name: 'outputMode',
                    type: 'options',
                    options: [
                        {
                            name: 'Merge Into Item',
                            value: 'merge',
                            description: 'Add frontmatter keys and content to the existing item',
                        },
                        {
                            name: 'Replace Item',
                            value: 'replace',
                            description: 'Output only the parsed result (frontmatter + content)',
                        },
                    ],
                    default: 'merge',
                },
                {
                    displayName: 'Content Output Field',
                    name: 'contentField',
                    type: 'string',
                    default: 'body',
                    description: 'Field name to store the parsed body content',
                },
                {
                    displayName: 'Frontmatter Output Field',
                    name: 'frontmatterField',
                    type: 'string',
                    default: 'frontmatter',
                    description: 'Field name to store the frontmatter object (leave empty to spread keys directly onto the item)',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const results = [];
        for (let i = 0; i < items.length; i++) {
            const markdownField = this.getNodeParameter('markdownField', i);
            const engine = this.getNodeParameter('engine', i);
            const outputMode = this.getNodeParameter('outputMode', i);
            const contentField = this.getNodeParameter('contentField', i);
            const frontmatterField = this.getNodeParameter('frontmatterField', i);
            const raw = items[i].json[markdownField];
            if (typeof raw !== 'string') {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Field "${markdownField}" is not a string or does not exist on item ${i}`, { itemIndex: i });
            }
            let parsed;
            try {
                parsed = (0, gray_matter_1.default)(raw, { engines: engine === 'toml' ? { toml: tomlEngine } : undefined });
            }
            catch (err) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to parse frontmatter on item ${i}: ${err.message}`, { itemIndex: i });
            }
            const base = outputMode === 'merge' ? { ...items[i].json } : {};
            let output;
            if (frontmatterField) {
                output = {
                    ...base,
                    [frontmatterField]: parsed.data,
                    [contentField]: parsed.content.trim(),
                };
            }
            else {
                // Spread frontmatter keys directly onto the item
                output = {
                    ...base,
                    ...parsed.data,
                    [contentField]: parsed.content.trim(),
                };
            }
            results.push({ json: output, pairedItem: { item: i } });
        }
        return [results];
    }
}
exports.ContentParser = ContentParser;
// Minimal TOML engine using gray-matter's built-in fallback
// gray-matter doesn't bundle a TOML parser, so we provide a basic one
// that handles simple key=value pairs (good enough for most static site configs).
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
            // Strip quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            result[key] = val;
        }
        return result;
    },
    stringify(_obj) {
        throw new Error('TOML stringify not supported');
    },
};
//# sourceMappingURL=ContentParser.node.js.map