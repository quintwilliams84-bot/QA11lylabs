'use strict';

/**
 * QA11Y Labs Phase 1 — Automated WCAG 2.2 Remediation Engine
 *
 * Maps machine-readable axe-core / Pa11y rule identifiers to client-ready
 * remediation guidance, WCAG success criteria, and practical HTML/React fixes.
 */

const remediationDatabase = {
  'image-alt': {
    wcag: '1.1.1 Non-text Content (Level A)',
    issue: 'Images must have alternate text.',
    explanation:
      'Screen readers like JAWS, NVDA, VoiceOver, and TalkBack rely on the alt attribute to convey the meaning of informative images. Without it, users may hear the filename, an unhelpful URL, or nothing at all.',
    htmlFix: '<img src="icon.png" alt="Search">',
    reactFix: '<img src="icon.png" alt="Search" />',
  },
  'input-image-alt': {
    wcag: '1.1.1 Non-text Content (Level A)',
    issue: 'Image submit buttons must have alternate text.',
    explanation:
      'An input with type="image" is announced like a button. It needs an alt attribute that describes the action, not the image file.',
    htmlFix: '<input type="image" src="submit.png" alt="Submit search">',
    reactFix: '<input type="image" src="submit.png" alt="Submit search" />',
  },
  'svg-img-alt': {
    wcag: '1.1.1 Non-text Content (Level A) & 4.1.2 Name, Role, Value (Level A)',
    issue: 'SVG images with image roles must have accessible names.',
    explanation:
      'An SVG exposed as an image needs a programmatic name so assistive technology can announce its purpose.',
    htmlFix: '<svg role="img" aria-labelledby="searchTitle"><title id="searchTitle">Search</title>...</svg>',
    reactFix: '<svg role="img" aria-labelledby="searchTitle"><title id="searchTitle">Search</title>...</svg>',
  },
  'role-img-alt': {
    wcag: '1.1.1 Non-text Content (Level A) & 4.1.2 Name, Role, Value (Level A)',
    issue: 'Elements with role="img" must have alternate text.',
    explanation:
      'When a non-image element is exposed as an image, it still needs an accessible name through aria-label or aria-labelledby.',
    htmlFix: '<span role="img" aria-label="Warning">⚠</span>',
    reactFix: '<span role="img" aria-label="Warning">⚠</span>',
  },
  label: {
    wcag: '3.3.2 Labels or Instructions (Level A) & 1.3.1 Info and Relationships (Level A)',
    issue: 'Form elements must have programmatic labels.',
    explanation:
      'Visual proximity is not enough. The <label> for attribute must exactly match the <input> id so screen readers announce the label when the field receives focus.',
    htmlFix: '<label for="firstName">First Name</label>\n<input id="firstName" type="text" name="fname">',
    reactFix:
      '<label htmlFor="firstName">First Name</label>\n<input id="firstName" type="text" name="fname" />',
  },
  'select-name': {
    wcag: '4.1.2 Name, Role, Value (Level A) & 3.3.2 Labels or Instructions (Level A)',
    issue: 'Select elements must have accessible names.',
    explanation:
      'A select menu needs a visible label or another accessible-name source so users know what choice they are making.',
    htmlFix: '<label for="state">State</label>\n<select id="state" name="state">...</select>',
    reactFix: '<label htmlFor="state">State</label>\n<select id="state" name="state">...</select>',
  },
  'button-name': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'Buttons must have discernible text.',
    explanation:
      'If a button only contains an icon, SVG, or background image, it needs an aria-label or visually hidden text so screen reader users know what action the button performs.',
    htmlFix: '<button aria-label="Close modal">\n  <svg aria-hidden="true">...</svg>\n</button>',
    reactFix: '<button aria-label="Close modal">\n  <svg aria-hidden="true">...</svg>\n</button>',
  },
  'input-button-name': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'Input buttons must have discernible text.',
    explanation:
      'Submit, reset, and button inputs need a value or accessible name that describes the action.',
    htmlFix: '<input type="submit" value="Search">',
    reactFix: '<input type="submit" value="Search" />',
  },
  'link-name': {
    wcag: '2.4.4 Link Purpose (In Context) (Level A) & 4.1.2 Name, Role, Value (Level A)',
    issue: 'Links must have discernible text.',
    explanation:
      'A link needs meaningful visible text, aria-label, or labelled content so screen reader users understand the destination or action.',
    htmlFix: '<a href="/contact">Contact QA11Y Labs</a>',
    reactFix: '<a href="/contact">Contact QA11Y Labs</a>',
  },
  'aria-allowed-attr': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'Elements must only use allowed ARIA attributes.',
    explanation:
      'Using an ARIA attribute that is not supported by the element role, such as aria-expanded on a static <div>, creates inaccurate data in the Accessibility Tree.',
    htmlFix: 'Change <div aria-expanded="true"> to <button aria-expanded="true">',
    reactFix: 'Change <div aria-expanded={true}> to <button aria-expanded={true}>',
  },
  'aria-required-attr': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'ARIA roles must include required states and properties.',
    explanation:
      'Some ARIA roles require specific attributes so assistive technologies can understand current state, value, or relationship.',
    htmlFix: '<div role="checkbox" aria-checked="false" tabindex="0">Subscribe</div>',
    reactFix: '<div role="checkbox" aria-checked={false} tabIndex={0}>Subscribe</div>',
  },
  'aria-valid-attr': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'ARIA attributes must be valid and spelled correctly.',
    explanation:
      'Invalid ARIA attributes are ignored by browsers and assistive technology, which can leave the Accessibility Tree incomplete or misleading.',
    htmlFix: 'Change aria-labeledby="name" to aria-labelledby="name"',
    reactFix: 'Change aria-labeledby="name" to aria-labelledby="name"',
  },
  'aria-valid-attr-value': {
    wcag: '4.1.2 Name, Role, Value (Level A)',
    issue: 'ARIA attribute values must be valid.',
    explanation:
      'ARIA values must match the allowed value type. Invalid values can make controls announce the wrong state or no state.',
    htmlFix: '<button aria-expanded="false">Menu</button>',
    reactFix: '<button aria-expanded={false}>Menu</button>',
  },
  'aria-hidden-focus': {
    wcag: '4.1.2 Name, Role, Value (Level A) & 2.4.3 Focus Order (Level A)',
    issue: 'aria-hidden elements must not contain focusable elements.',
    explanation:
      'Keyboard users can land on controls that screen readers cannot perceive when focusable content is hidden from the Accessibility Tree.',
    htmlFix: '<div aria-hidden="true"><button tabindex="-1">Hidden action</button></div>',
    reactFix: '<div aria-hidden="true"><button tabIndex={-1}>Hidden action</button></div>',
  },
  'color-contrast': {
    wcag: '1.4.3 Contrast (Minimum) (Level AA)',
    issue: 'Text must meet minimum contrast requirements.',
    explanation:
      'Normal text needs at least 4.5:1 contrast and large text needs at least 3:1 so users with low vision can read the content.',
    htmlFix: '<p style="color:#1a1d26;background:#ffffff;">Readable text</p>',
    reactFix: '<p style={{ color: "#1a1d26", background: "#ffffff" }}>Readable text</p>',
  },
  'html-has-lang': {
    wcag: '3.1.1 Language of Page (Level A)',
    issue: 'The page must declare a language.',
    explanation:
      'Screen readers use the page language to choose pronunciation rules and voice behavior.',
    htmlFix: '<html lang="en">',
    reactFix: '<html lang="en">',
  },
  'html-lang-valid': {
    wcag: '3.1.1 Language of Page (Level A)',
    issue: 'The html lang value must be valid.',
    explanation:
      'Invalid language codes can cause screen readers to use the wrong pronunciation rules.',
    htmlFix: '<html lang="en">',
    reactFix: '<html lang="en">',
  },
  'document-title': {
    wcag: '2.4.2 Page Titled (Level A)',
    issue: 'Documents must have descriptive titles.',
    explanation:
      'A clear page title helps screen reader users, keyboard users, and browser-tab users understand where they are.',
    htmlFix: '<title>Contact QA11Y Labs</title>',
    reactFix: '<title>Contact QA11Y Labs</title>',
  },
  'frame-title': {
    wcag: '2.4.1 Bypass Blocks (Level A) & 4.1.2 Name, Role, Value (Level A)',
    issue: 'Frames and iframes must have descriptive titles.',
    explanation:
      'Screen reader users navigate frames by title. A missing or vague iframe title makes it difficult to understand the frame purpose or skip past embedded content.',
    htmlFix: '<iframe title="Payment form" src="/payment"></iframe>',
    reactFix: '<iframe title="Payment form" src="/payment" />',
  },
  'heading-order': {
    wcag: '1.3.1 Info and Relationships (Level A) & 2.4.6 Headings and Labels (Level AA)',
    issue: 'Heading levels should follow a logical order.',
    explanation:
      'Screen reader users often navigate by headings. Skipped or disordered heading levels can make the page structure harder to understand.',
    htmlFix: '<h2>Billing details</h2>\n<h3>Payment method</h3>',
    reactFix: '<h2>Billing details</h2>\n<h3>Payment method</h3>',
  },
  'landmark-no-duplicate-contentinfo': {
    wcag: '1.3.1 Info and Relationships (Level A)',
    issue: 'Pages should not contain duplicate contentinfo landmarks.',
    explanation:
      'Multiple footer/contentinfo landmarks with the same purpose can make landmark navigation confusing for screen reader users.',
    htmlFix: '<footer>Site footer content</footer>',
    reactFix: '<footer>Site footer content</footer>',
  },
  region: {
    wcag: '1.3.1 Info and Relationships (Level A) & 2.4.1 Bypass Blocks (Level A)',
    issue: 'All page content should be contained by landmarks.',
    explanation:
      'Landmarks such as header, nav, main, aside, and footer help screen reader users jump directly to major page regions.',
    htmlFix: '<main id="main">Page content</main>',
    reactFix: '<main id="main">Page content</main>',
  },
  bypass: {
    wcag: '2.4.1 Bypass Blocks (Level A)',
    issue: 'Pages should include a way to bypass repeated content.',
    explanation:
      'Skip links let keyboard and screen reader users jump directly to the main content instead of tabbing through repeated navigation.',
    htmlFix: '<a class="skip-link" href="#main">Skip to main content</a>\n<main id="main">...</main>',
    reactFix: '<a className="skip-link" href="#main">Skip to main content</a>\n<main id="main">...</main>',
  },
  'target-size': {
    wcag: '2.5.8 Target Size (Minimum) (Level AA)',
    issue: 'Pointer targets must be large enough or have sufficient spacing.',
    explanation:
      'WCAG 2.2 adds a minimum target-size requirement to reduce activation errors for users with motor disabilities.',
    htmlFix: '<button style="min-width:24px;min-height:24px;">Edit</button>',
    reactFix: '<button style={{ minWidth: 24, minHeight: 24 }}>Edit</button>',
  },
};

const pa11yCodeAliases = [
  { pattern: /Principle1\.Guideline1_1\.1_1_1/i, ruleId: 'image-alt' },
  { pattern: /Principle1\.Guideline1_3\.1_3_1.*(Label|Info and Relationships)/i, ruleId: 'label' },
  { pattern: /Principle1\.Guideline1_4\.1_4_3/i, ruleId: 'color-contrast' },
  { pattern: /Principle2\.Guideline2_4\.2_4_1/i, ruleId: 'bypass' },
  { pattern: /Principle2\.Guideline2_4\.2_4_2/i, ruleId: 'document-title' },
  { pattern: /Principle2\.Guideline2_4\.2_4_4/i, ruleId: 'link-name' },
  { pattern: /Principle3\.Guideline3_1\.3_1_1/i, ruleId: 'html-has-lang' },
  { pattern: /Principle3\.Guideline3_3\.3_3_2/i, ruleId: 'label' },
  { pattern: /Principle4\.Guideline4_1\.4_1_2/i, ruleId: 'button-name' },
];

function normaliseRuleId(ruleId) {
  return String(ruleId || '').trim();
}

function getRuleIdFromPa11yCode(code) {
  const raw = normaliseRuleId(code);
  if (!raw) return '';
  for (const alias of pa11yCodeAliases) {
    if (alias.pattern.test(raw)) return alias.ruleId;
  }
  return raw;
}

function getRemediation(ruleId) {
  const key = normaliseRuleId(ruleId);
  if (remediationDatabase[key]) {
    return { ...remediationDatabase[key], ruleId: key, mapped: true };
  }
  const aliased = getRuleIdFromPa11yCode(key);
  if (aliased !== key && remediationDatabase[aliased]) {
    return { ...remediationDatabase[aliased], ruleId: aliased, sourceRuleId: key, mapped: true };
  }
  return {
    ruleId: key || 'unknown',
    mapped: false,
    wcag: 'Requires Manual Mapping',
    issue: `Rule ID: ${key || 'unknown'} failed.`,
    explanation:
      'Custom or complex issue detected. Manual review is required to map the DOM failure to WCAG and produce a context-specific fix.',
    htmlFix: 'N/A',
    reactFix: 'N/A',
  };
}

function attachRemediationToAxeViolation(violation) {
  return {
    ...violation,
    remediation: getRemediation(violation?.id),
  };
}

function attachRemediationToPa11yIssue(issue) {
  const ruleId = getRuleIdFromPa11yCode(issue?.code || issue?.runnerExtras?.rule || issue?.type);
  return {
    ...issue,
    remediation: getRemediation(ruleId),
  };
}

module.exports = {
  remediationDatabase,
  getRemediation,
  getRuleIdFromPa11yCode,
  attachRemediationToAxeViolation,
  attachRemediationToPa11yIssue,
};
