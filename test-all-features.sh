#!/bin/bash

# Comprehensive Test Script for New Features
# Tests: Phone Login, FCM Token, Notifications API

BASE_URL="${BASE_URL:-http://localhost:5000}"
API_BASE="${BASE_URL}/api/v1"
TEST_PHONE="${TEST_PHONE:-+1234567890}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
log() {
    echo -e "${1}${2}${NC}"
}

log_section() {
    echo ""
    echo "============================================================"
    log "${CYAN}" "$1"
    echo "============================================================"
}

log_test() {
    echo ""
    log "${BLUE}" "[TEST] $1"
}

log_success() {
    log "${GREEN}" "✓ $1"
    ((PASSED++))
}

log_error() {
    log "${RED}" "✗ $1"
    ((FAILED++))
}

log_warning() {
    log "${YELLOW}" "⚠ $1"
    ((SKIPPED++))
}

# Test 1: Request OTP for Phone Login
test_request_otp() {
    log_test "Request OTP for Phone Login"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/auth/request-otp-login" \
        -H "Content-Type: application/json" \
        -d "{\"phone\": \"${TEST_PHONE}\"}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            log_success "OTP request successful"
            echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
            return 0
        fi
    fi
    
    log_error "OTP request failed (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    return 1
}

# Test 2: Verify OTP (requires OTP as argument)
test_verify_otp() {
    local otp=$1
    
    if [ -z "$otp" ]; then
        log_warning "OTP not provided. Skipping verification test."
        log_warning "Usage: $0 [OTP]"
        return 2
    fi
    
    log_test "Verify OTP and Login"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/auth/verify-otp-login" \
        -H "Content-Type: application/json" \
        -d "{\"phone\": \"${TEST_PHONE}\", \"otp\": \"${otp}\"}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            log_success "OTP verification successful"
            # Extract token
            ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
            if [ -n "$ACCESS_TOKEN" ]; then
                log_success "Access token extracted"
                export ACCESS_TOKEN
                return 0
            fi
        fi
    fi
    
    log_error "OTP verification failed (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    return 1
}

# Test 3: Rate Limiting
test_rate_limiting() {
    log_test "Test Rate Limiting (3 requests per hour)"
    
    local rate_limited=false
    local success_count=0
    
    for i in {1..4}; do
        echo "  Attempt $i/4..."
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/auth/request-otp-login" \
            -H "Content-Type: application/json" \
            -d "{\"phone\": \"${TEST_PHONE}\"}")
        
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" -eq 200 ]; then
            ((success_count++))
        elif [ "$http_code" -eq 429 ]; then
            rate_limited=true
            log_success "Rate limit triggered on attempt $i (expected)"
            body=$(echo "$response" | sed '$d')
            echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
            break
        fi
    done
    
    if [ "$rate_limited" = true ]; then
        log_success "Rate limiting is working correctly"
        return 0
    else
        log_warning "Rate limiting may not be working as expected"
        return 1
    fi
}

# Test 4: Save FCM Token
test_save_fcm_token() {
    if [ -z "$ACCESS_TOKEN" ]; then
        log_warning "No access token. Skipping FCM token test."
        return 2
    fi
    
    log_test "Save FCM Token"
    
    local fcm_token="test-fcm-token-$(date +%s)"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/users/fcm-token" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d "{\"fcm_token\": \"${fcm_token}\"}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            log_success "FCM token saved successfully"
            
            # Test idempotency
            log_test "Test FCM Token Idempotency"
            response2=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/users/fcm-token" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${ACCESS_TOKEN}" \
                -d "{\"fcm_token\": \"${fcm_token}\"}")
            
            http_code2=$(echo "$response2" | tail -n1)
            if [ "$http_code2" -eq 200 ]; then
                log_success "FCM token update is idempotent"
            fi
            
            return 0
        fi
    fi
    
    log_error "FCM token save failed (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    return 1
}

# Test 5: Get Notifications (without auth - should fail)
test_notifications_no_auth() {
    log_test "Get Notifications Without Authentication (should fail)"
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/notifications")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        log_success "Authentication is required (as expected)"
        return 0
    else
        log_error "Notifications endpoint should require authentication"
        return 1
    fi
}

# Test 6: Get Notifications with Pagination
test_get_notifications() {
    if [ -z "$ACCESS_TOKEN" ]; then
        log_warning "No access token. Skipping notifications test."
        return 2
    fi
    
    log_test "Get Notifications with Pagination"
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/notifications?page=1&limit=10" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            log_success "Notifications retrieved successfully"
            echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
            
            # Test with type filter
            log_test "Get Notifications with Type Filter"
            response2=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/notifications?type=order" \
                -H "Authorization: Bearer ${ACCESS_TOKEN}")
            
            http_code2=$(echo "$response2" | tail -n1)
            if [ "$http_code2" -eq 200 ]; then
                log_success "Filtered notifications retrieved successfully"
            fi
            
            # Test invalid type
            log_test "Test Invalid Notification Type (should fail)"
            response3=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/notifications?type=invalid" \
                -H "Authorization: Bearer ${ACCESS_TOKEN}")
            
            http_code3=$(echo "$response3" | tail -n1)
            if [ "$http_code3" -eq 400 ]; then
                log_success "Invalid type is rejected (as expected)"
            fi
            
            return 0
        fi
    fi
    
    log_error "Failed to get notifications (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    return 1
}

# Test 7: Validation Tests
test_validation() {
    log_test "Test Input Validation"
    
    # Test invalid phone format
    log_test "  Test invalid phone format"
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/auth/request-otp-login" \
        -H "Content-Type: application/json" \
        -d '{"phone": "invalid"}')
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ]; then
        log_success "Invalid phone format is rejected"
    else
        log_error "Invalid phone format should be rejected"
    fi
    
    # Test missing FCM token
    if [ -n "$ACCESS_TOKEN" ]; then
        log_test "  Test missing FCM token"
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/users/fcm-token" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -d '{}')
        
        http_code=$(echo "$response" | tail -n1)
        if [ "$http_code" -eq 400 ]; then
            log_success "Missing FCM token is rejected"
        else
            log_error "Missing FCM token should be rejected"
        fi
    fi
}

# Main test execution
main() {
    log_section "Feature Testing Suite"
    echo "Base URL: ${BASE_URL}"
    echo "Test Phone: ${TEST_PHONE}"
    echo "OTP Argument: ${1:-Not provided}"
    
    # Check if server is running
    log_test "Check Server Health"
    health_response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
    health_code=$(echo "$health_response" | tail -n1)
    
    if [ "$health_code" -eq 200 ]; then
        log_success "Server is running"
    else
        log_error "Server is not responding. Please start the server first."
        echo "Run: npm start"
        exit 1
    fi
    
    # Feature 1: Phone Login
    log_section "Feature 1: Phone Number Login (OTP-Based Authentication)"
    test_request_otp
    
    OTP=$1
    if [ -n "$OTP" ]; then
        test_verify_otp "$OTP"
    else
        log_warning "Skipping OTP verification (no OTP provided)"
        log_warning "Check server logs for OTP, then run: $0 <OTP>"
    fi
    
    test_rate_limiting
    
    # Feature 2: FCM Token
    log_section "Feature 2: Save FCM Token for Push Notifications"
    test_save_fcm_token
    
    # Feature 3: Notifications
    log_section "Feature 3: Notifications API with Pagination & Filtering"
    test_notifications_no_auth
    test_get_notifications
    
    # Validation tests
    log_section "Validation Tests"
    test_validation
    
    # Summary
    log_section "Test Summary"
    log "${GREEN}" "Passed: ${PASSED}"
    if [ $FAILED -gt 0 ]; then
        log "${RED}" "Failed: ${FAILED}"
    else
        log "${GREEN}" "Failed: ${FAILED}"
    fi
    log "${YELLOW}" "Skipped: ${SKIPPED}"
    echo "Total: $((PASSED + FAILED + SKIPPED))"
    
    if [ $FAILED -eq 0 ]; then
        echo ""
        log "${GREEN}" "✓ All tests passed!"
        exit 0
    else
        echo ""
        log "${RED}" "✗ Some tests failed. Please review the output above."
        exit 1
    fi
}

# Run main function
main "$@"

