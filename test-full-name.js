const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testFullNameWithSpaces() {
  console.log('🧪 Testing full_name with spaces...\n');

  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;
  const testUsername = `testuser_${timestamp}`;
  const fullNameWithSpaces = 'mostafa dbagh';

  try {
    // Test 1: Registration with full_name containing spaces
    console.log('Test 1: Registering user with full_name containing spaces...');
    console.log(`   Full name: "${fullNameWithSpaces}"`);
    
    const registerResponse = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
      username: testUsername,
      email: testEmail,
      full_name: fullNameWithSpaces,
      country_code: '+1',
      phone_number: '1234567890',
      password_hash: 'TestPassword123',
      account_type: 'CUSTOMER'
    });

    if (registerResponse.data.success) {
      console.log('   ✅ Registration successful!');
      console.log(`   User full_name: "${registerResponse.data.data.user.full_name}"`);
      
      if (registerResponse.data.data.user.full_name === fullNameWithSpaces) {
        console.log('   ✅ Full name with spaces saved correctly!\n');
      } else {
        console.log('   ❌ Full name mismatch!\n');
        return false;
      }
    } else {
      console.log('   ❌ Registration failed:', registerResponse.data.message);
      return false;
    }

    const accessToken = registerResponse.data.data.accessToken;

    // Test 2: Update profile with full_name containing spaces
    console.log('Test 2: Updating profile with full_name containing spaces...');
    const newFullName = 'John Doe Smith';
    console.log(`   New full name: "${newFullName}"`);

    const updateResponse = await axios.patch(
      `${BASE_URL}/api/v1/auth/profile`,
      {
        full_name: newFullName
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (updateResponse.data.success) {
      console.log('   ✅ Profile update successful!');
      console.log(`   Updated full_name: "${updateResponse.data.data.user.full_name}"`);
      
      if (updateResponse.data.data.user.full_name === newFullName) {
        console.log('   ✅ Full name with spaces updated correctly!\n');
      } else {
        console.log('   ❌ Full name mismatch after update!\n');
        return false;
      }
    } else {
      console.log('   ❌ Profile update failed:', updateResponse.data.message);
      return false;
    }

    // Test 3: Test with multiple spaces
    console.log('Test 3: Testing with multiple spaces...');
    const multiSpaceName = 'Mary  Jane  Smith';
    console.log(`   Full name: "${multiSpaceName}"`);

    const multiSpaceResponse = await axios.patch(
      `${BASE_URL}/api/v1/auth/profile`,
      {
        full_name: multiSpaceName
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (multiSpaceResponse.data.success) {
      console.log('   ✅ Multiple spaces accepted!');
      console.log(`   Full name: "${multiSpaceResponse.data.data.user.full_name}"\n`);
    } else {
      console.log('   ❌ Multiple spaces rejected:', multiSpaceResponse.data.message);
      return false;
    }

    // Test 4: Test validation - should reject invalid characters
    console.log('Test 4: Testing validation (should reject numbers)...');
    const invalidName = 'Mostafa123';
    
    try {
      await axios.patch(
        `${BASE_URL}/api/v1/auth/profile`,
        {
          full_name: invalidName
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      console.log('   ❌ Validation failed - should have rejected numbers!\n');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Validation working - rejected invalid characters!\n');
      } else {
        console.log('   ❌ Unexpected error:', error.message);
        return false;
      }
    }

    console.log('🎉 All tests passed! full_name accepts spaces correctly!');
    return true;

  } catch (error) {
    if (error.response) {
      console.error('❌ Test failed:', error.response.data);
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message || error.response.data.error);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Make sure the server is running on', BASE_URL);
      console.error('   Start the server with: npm start');
    } else {
      console.error('❌ Test failed:', error.message);
    }
    return false;
  }
}

// Run the test
testFullNameWithSpaces()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

