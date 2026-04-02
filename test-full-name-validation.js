// Test full_name validation logic directly
const { body, validationResult } = require('express-validator');

// Simulate the validation rules
const validateFullName = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
];

// Test the regex pattern directly
const fullNameRegex = /^[a-zA-Z\s'-]+$/;

console.log('🧪 Testing full_name validation regex pattern...\n');

const testCases = [
  { name: 'mostafa dbagh', expected: true, description: 'Simple name with space' },
  { name: 'John Doe', expected: true, description: 'Two words with space' },
  { name: 'Mary-Jane Smith', expected: true, description: 'Name with hyphen and space' },
  { name: "O'Connor", expected: true, description: 'Name with apostrophe' },
  { name: 'Jean-Pierre Van Der Berg', expected: true, description: 'Multiple words with spaces' },
  { name: 'mostafa', expected: true, description: 'Single word (no spaces)' },
  { name: '  mostafa dbagh  ', expected: true, description: 'Name with leading/trailing spaces (will be trimmed)' },
  { name: 'mostafa123', expected: false, description: 'Name with numbers (should fail)' },
  { name: 'mostafa@dbagh', expected: false, description: 'Name with special character @ (should fail)' },
  { name: 'mostafa.dbagh', expected: false, description: 'Name with dot (should fail)' },
  { name: 'mostafa_dbagh', expected: false, description: 'Name with underscore (should fail)' },
  { name: 'mostafa  dbagh', expected: true, description: 'Name with multiple spaces' }
];

console.log('Testing regex pattern: /^[a-zA-Z\\s\'-]+$/\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = fullNameRegex.test(testCase.name.trim());
  const status = result === testCase.expected ? '✅' : '❌';
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} Test ${index + 1}: "${testCase.name}"`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`   Description: ${testCase.description}`);
  console.log('');
});

console.log('='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 All regex tests passed! The pattern correctly accepts spaces.');
  console.log('\n✅ Full name validation will accept:');
  console.log('   - Letters (a-z, A-Z)');
  console.log('   - Spaces (multiple spaces allowed)');
  console.log('   - Hyphens (-)');
  console.log('   - Apostrophes (\')');
  console.log('\n❌ Full name validation will reject:');
  console.log('   - Numbers');
  console.log('   - Special characters (@, ., _, etc.)');
  console.log('   - Names shorter than 2 characters');
  console.log('   - Names longer than 100 characters');
} else {
  console.log('\n❌ Some tests failed. Please review the regex pattern.');
  process.exit(1);
}

