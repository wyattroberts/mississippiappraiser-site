import assert from "node:assert/strict";
import test from "node:test";

import { sanitizePostHtml } from "../lib/post-sanitize.ts";

test("keeps semantic article lists and blockquotes", () => {
  const html = "<blockquote><p>Quoted text</p></blockquote><p>Body text</p><ul><li><strong>First</strong></li><li>Second</li></ul>";
  assert.equal(sanitizePostHtml(html), html);
});

test("removes common contenteditable debris", () => {
  const html = "<p><br></p><span class=\"paste\" style=\"color:red\"><b>Bold</b> and <i>italic</i></span><ul></ul>";
  assert.equal(sanitizePostHtml(html), "<strong>Bold</strong> and <em>italic</em>");
});

test("removes unsafe editor content and event handlers", () => {
  const html = "<p onclick=\"alert(1)\">Safe</p><script>alert(1)</script><a href=\"javascript:alert(1)\">Link</a>";
  const sanitized = sanitizePostHtml(html);
  assert.doesNotMatch(sanitized, /onclick|script|javascript/i);
  assert.match(sanitized, /<p>Safe<\/p>/);
});
