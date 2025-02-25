/**
 * Tiny subset of Markdown implemented with regex.
 * Author: Alexander Petros
 *
 * I wanted a way to let the users add links and bold text to the tournament
 * description, but didn't want to deal with escaping for XSS scripting.
 *
 * This ended up becoming a half-featured regex-based markdown parser. Currently
 * it supports links (only absolute ones, as a user-simplicity measure), bold, italics,
 * unordered lists with a single indent, and new paragraphs.
 *
 * I might add some more stuff as I need it, but this is pretty good for the thing
 * I wanted, which is a text box that felt customizable, within limits.
 */

/**
 * Sanitize HTML content with escape characters.
 *
 * Inserting HTML into the document dynamically creates securtiy risks, specifically the risk that a
 * malicious actor will insert script tags into user-supplied input. This kind of vulnerability is
 * called a Cross-Site Scripting (XSS) attack. In order to mitigate that, we escape certain control
 * characters so that HTML will know to render them, and not use them for control flow.
 *
 * This function is safe for all HTML content between tags, such as: `<li>${content}</li>`, and
 * *some* attributes (`<li class=${className}</li>`) but not all. That is because some attributes
 * will parse as pure text (like "id") and others will parse as JavaScript (like "onclick"). There's
 * a section on "Safe Sinks" in the link below that explains this, with a list of the safe
 * attributes to insert dynamic text into.
 *
 * For more information on mitigating XSS:
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#output-encoding-for-html-contexts
 */
function escapeHtmlText (value) {
  const stringValue = value.toString()
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&grave;',
    '=': '&#x3D;'
  }

  // Match any of the characters inside /[ ... ]/
  const regex = /[&<>"'`=/]/g
  return stringValue.replace(regex, match => entityMap[match])
}

/*
 * Escape all HTML text values in a template string.
 *
 * Import this function and put it in front of your template strings (the ones with backticks) to
 * escape any values for example:
 *
 *   html`<ul>Shopping List <li>${item1}<li>${item2}</ul>`
 *
 * If item1 or item2 have unsafe HTML characters in them, they will be escaped and display safely
 * and correctly in the browser.
 *
 * Note that we don't escape the entire string, *just the values*. That's because we don't want to
 * escape the actual tags (<tr>, <p>, and so forth) that we're trying to build, only the parts that
 * someone could insert an unwanted tag.
 */
export function html (strings, ...values) {
  const sanitizedValues = values.map(escapeHtmlText)
  // Using the sanitized values, substitute the values into the string
  return String.raw({ raw: strings }, ...sanitizedValues)
}

export function markdownToHtml(str) {
  const rules = [
    // if a url matches the escaped version of https://
    // then return the URL with JUST the forward slashes unescaped
    [/\[([^\n]+)\]\((https?:&#x2F;&#x2F;[^\n]+)\)/gm, (_match, p1, p2) => {
      const unescapedUrl = p2.replace(/&#x2F;/g, '/')
      return `<a href="${unescapedUrl}">${p1}</a>`
    }],
    // same as above but the unescaped version
    [/\[([^\n]+)\]\((https?:\/\/[^\n]+)\)/g, (_match, p1, p2) => {
      return `<a href="${p2}">${p1}</a>`
    }],
    // if a newline starts with a bullet and a space, make it a list item
    // note the /m option at the end, which means to use ^ and $ as line-delimiting,
    // not string-delimiting markers
    [/^\* (.*)$/gm, (_match, p1) => {
      return `<li>${p1}</li>`
    }],
    // wrap all the consecutive <li>s in a <ul>
    // Because <ul>s end paragraphs, start a new one after
    [/(<li>[^\n]*<\/li>(?:\n|$))+/g, (match) => {
      return `<ul>\n${match}</ul>\n<p>\n`
    }],
    // wrap bold and italic characters
    [/\*\*([^\n]+)\*\*/g, '<b>$1</b>'],
    [/\*([^\n]+)\*/g, '<em>$1</em>'],
    [/\n\n/gm, '\n<p>\n']
  ]

  // Do the escaping
  let html = str
  rules.forEach(([regex, replacement]) => {
    html = html.replace(regex, replacement)
  })

  return '<p>\n' + html
}

// Convert unsafe markdown text to escaped, formatted HTML
export const convert = (str) => markdownToHtml(escapeHtmlText(str))
