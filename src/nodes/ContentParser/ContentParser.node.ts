import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import matter from 'gray-matter';

export class ContentParser implements INodeType {
	description: INodeTypeDescription = {
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'parse') {
				results.push(parseItem.call(this, items[i], i));
			} else {
				results.push(stringifyItem.call(this, items[i], i));
			}
		}

		return [results];
	}
}

// ── Parse ─────────────────────────────────────────────────────────────────────

function parseItem(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	i: number,
): INodeExecutionData {
	const raw = this.getNodeParameter('markdownText', i) as string;
	const engine = this.getNodeParameter('engine', i) as string;
	const outputMode = this.getNodeParameter('outputMode', i) as string;
	const contentField = this.getNodeParameter('contentField', i) as string;
	const frontmatterField = this.getNodeParameter('frontmatterField', i) as string;

	if (typeof raw !== 'string' || raw.trim() === '') {
		throw new NodeOperationError(
			this.getNode(),
			`Markdown input is empty or not a string on item ${i}`,
			{ itemIndex: i },
		);
	}

	let parsed: matter.GrayMatterFile<string>;
	try {
		parsed = matter(raw, { engines: engine === 'toml' ? { toml: tomlEngine } : undefined });
	} catch (err) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to parse frontmatter on item ${i}: ${(err as Error).message}`,
			{ itemIndex: i },
		);
	}

	const base = outputMode === 'merge' ? { ...item.json } : {};

	const output: IDataObject = frontmatterField
		? {
				...base,
				[frontmatterField]: parsed.data as IDataObject,
				[contentField]: parsed.content.trim(),
		  }
		: {
				...base,
				...(parsed.data as IDataObject),
				[contentField]: parsed.content.trim(),
		  };

	return { json: output, pairedItem: { item: i } };
}

// ── Stringify ─────────────────────────────────────────────────────────────────

function stringifyItem(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	i: number,
): INodeExecutionData {
	const frontmatterRaw = this.getNodeParameter('frontmatterData', i);
	const body = this.getNodeParameter('bodyContent', i) as string;
	const engine = this.getNodeParameter('stringifyEngine', i) as string;
	const outputMode = this.getNodeParameter('stringifyOutputMode', i) as string;
	const markdownOutputField = this.getNodeParameter('markdownOutputField', i) as string;

	// frontmatterRaw may arrive as an object (expression) or a JSON string
	let frontmatterData: IDataObject;
	if (typeof frontmatterRaw === 'string') {
		try {
			frontmatterData = JSON.parse(frontmatterRaw) as IDataObject;
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`Frontmatter on item ${i} is not valid JSON`,
				{ itemIndex: i },
			);
		}
	} else if (frontmatterRaw && typeof frontmatterRaw === 'object') {
		frontmatterData = frontmatterRaw as IDataObject;
	} else {
		frontmatterData = {};
	}

	let markdown: string;
	try {
		markdown = matter.stringify(body ?? '', frontmatterData, {
			engines: engine === 'toml' ? { toml: tomlEngine } : undefined,
		});
	} catch (err) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to stringify on item ${i}: ${(err as Error).message}`,
			{ itemIndex: i },
		);
	}

	const base = outputMode === 'merge' ? { ...item.json } : {};
	const output: IDataObject = { ...base, [markdownOutputField]: markdown };

	return { json: output, pairedItem: { item: i } };
}

// ── Minimal TOML engine ───────────────────────────────────────────────────────

const tomlEngine = {
	parse(input: string): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		for (const line of input.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			let val = trimmed.slice(eq + 1).trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			result[key] = val;
		}
		return result;
	},
	stringify(obj: object): string {
		return Object.entries(obj)
			.map(([k, v]) => `${k} = "${String(v)}"`)
			.join('\n');
	},
};
