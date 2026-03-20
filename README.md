# n8n-node-content-parser

A private [n8n](https://n8n.io) community node that parses Hugo/Jekyll-style markdown — splitting YAML, TOML, or JSON frontmatter from body content.

## Installation

In your n8n custom nodes directory:

```bash
npm install github:linuxboytoo/n8n-node-content-parser
```

Then restart n8n. The **Content Parser** node will appear in the Transform group.

## Usage

The node takes a field containing a raw markdown string like this:

```markdown
---
title: Hello World
date: 2024-01-01
tags: [n8n, markdown]
draft: false
---

# Hello World

This is the body content.
```

And outputs the frontmatter and body as separate fields.

## Parameters

| Parameter | Default | Description |
|---|---|---|
| Markdown Field | `content` | Input field containing the raw markdown string |
| Frontmatter Engine | `yaml` | Format of the frontmatter: YAML, TOML, or JSON |
| Output Mode | `merge` | **Merge into item** adds parsed fields alongside existing data; **Replace item** outputs only the parsed result |
| Content Output Field | `body` | Field name for the parsed body content |
| Frontmatter Output Field | `frontmatter` | Field name for the frontmatter object. Leave empty to spread frontmatter keys directly onto the item |

## Example Output

Given the markdown above with default settings, the node outputs:

```json
{
  "frontmatter": {
    "title": "Hello World",
    "date": "2024-01-01T00:00:00.000Z",
    "tags": ["n8n", "markdown"],
    "draft": false
  },
  "body": "# Hello World\n\nThis is the body content."
}
```

## Development

```bash
npm install
npm run build   # compile TypeScript
npm run dev     # watch mode
```

## License

MIT
