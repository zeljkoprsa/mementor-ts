# Documentation Snapshot - {{date}}

## Changes Since Last Snapshot

{{#changes}}

- **{{file}}** ({{type}}): {{description}}
  {{/changes}}

## Current Documentation State

{{#documents}}

### {{meta.title}}

Type: {{meta.type}}
Last Updated: {{meta.date}}
Tags: {{#meta.tags}}{{.}}, {{/meta.tags}}

{{content}}

---

{{/documents}}
