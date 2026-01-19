#!/usr/bin/env node
/**
 * Post-process the generated OpenAPI spec to add examples for jq API parameters.
 * Run this after `next-openapi-gen generate`.
 */

const fs = require('fs');
const path = require('path');

const OPENAPI_PATH = path.join(__dirname, '../public/openapi.json');

// Example values that users can run immediately
const GET_EXAMPLES = {
  json: '{"name": "jq", "version": "1.7"}',
  query: '.name',
  options: '-r,-c', // comma-separated string for query params
};

const POST_EXAMPLES = {
  json: '{"name": "jq", "version": "1.7"}',
  query: '.name',
  options: ['-r', '-c'], // array for request body
};

function addExamples() {
  const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));

  // Add examples to GET /jq query parameters
  const jqGetPath = spec.paths?.['/jq']?.get;
  if (jqGetPath?.parameters) {
    for (const param of jqGetPath.parameters) {
      if (param.name && GET_EXAMPLES[param.name]) {
        param.schema = param.schema || {};
        param.schema.example = GET_EXAMPLES[param.name];
      }
    }
  }

  // Add examples to POST /jq request body schema
  const jqPostPath = spec.paths?.['/jq']?.post;
  const postBodySchema = jqPostPath?.requestBody?.content?.['application/json']?.schema;
  if (postBodySchema) {
    // Handle $ref - need to update the component schema directly
    if (postBodySchema.$ref) {
      const schemaName = postBodySchema.$ref.split('/').pop();
      const componentSchema = spec.components?.schemas?.[schemaName];
      if (componentSchema?.properties) {
        addExamplesToProperties(componentSchema.properties, POST_EXAMPLES);
      }
    } else if (postBodySchema.properties) {
      addExamplesToProperties(postBodySchema.properties, POST_EXAMPLES);
    }
  }

  // Also update the JqQueryParamsSchema if it exists in components
  const queryParamsSchema = spec.components?.schemas?.JqQueryParamsSchema;
  if (queryParamsSchema?.properties) {
    addExamplesToProperties(queryParamsSchema.properties, GET_EXAMPLES);
  }

  // Add example to POST /snippets request body (exclude http field)
  const snippetsPostPath = spec.paths?.['/snippets']?.post;
  const snippetsBodyContent = snippetsPostPath?.requestBody?.content?.['application/json'];
  if (snippetsBodyContent) {
    snippetsBodyContent.example = {
      json: '{"name": "jq", "version": "1.7"}',
      query: '.name',
      options: ['-r'],
    };
  }

  // Change /jq endpoints to return text/plain instead of JSON
  // next-openapi-gen hardcodes application/json for responses, no tag to override
  for (const method of ['get', 'post']) {
    const jqPath = spec.paths?.['/jq']?.[method];
    if (jqPath?.responses?.['200']?.content?.['application/json']) {
      delete jqPath.responses['200'].content['application/json'];
      jqPath.responses['200'].content['text/plain'] = {
        schema: {
          type: 'string',
          description: 'Raw jq output',
          example: '"jq"',
        },
      };
    }
  }

  // Add description to Option enum explaining each flag (markdown table)
  // Note: next-openapi-gen doesn't pick up .describe() on standalone enum schemas
  const optionSchema = spec.components?.schemas?.Option;
  if (optionSchema && !optionSchema.description) {
    optionSchema.description = [
      'jq command-line flags:',
      '',
      '| Flag | Description |',
      '|------|-------------|',
      '| `-c` | Compact output |',
      '| `-n` | Null input (don\'t read any input) |',
      '| `-R` | Raw input (read as strings, not JSON) |',
      '| `-r` | Raw output (strings without quotes) |',
      '| `-s` | Slurp (read entire input into array) |',
      '| `-S` | Sort object keys |',
    ].join('\n');
  }

  fs.writeFileSync(OPENAPI_PATH, JSON.stringify(spec, null, 2) + '\n');
  console.log('Added examples to OpenAPI spec');
}

function addExamplesToProperties(properties, examples) {
  for (const [name, prop] of Object.entries(properties)) {
    if (examples[name] && !prop.example) {
      prop.example = examples[name];
    }
  }
}

addExamples();
