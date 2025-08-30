-- User Permission System Database Schema for Jawalaa

-- =============================================
-- Account Types Enum Table
-- =============================================
CREATE TABLE account_types (
    type_code VARCHAR(30) PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO account_types (type_code, type_name, description) VALUES
('CUSTOMER', 'Customer', 'End users who place orders'),
('DRIVER', 'Driver', 'Delivery personnel'),
('SERVICE_PROVIDER_OWNER', 'Service Provider Owner', 'Restaurant/Store owner'),
('SERVICE_PROVIDER_ADMIN', 'Service Provider Admin', 'Restaurant/Store manager'),
('PLATFORM_OWNER', 'Platform Owner', 'System owner'),
('PLATFORM_ADMIN', 'Platform Admin', 'System administrator'),
('CUSTOMER_SERVICE', 'Customer Service', 'Support staff');

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    profile_image VARCHAR(500),
    account_type VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    preferred_language VARCHAR(5) DEFAULT 'ar',
    timezone VARCHAR(50) DEFAULT 'Asia/Dubai',
    metadata JSONB,
    FOREIGN KEY (account_type) REFERENCES account_types(type_code)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_active ON users(is_active);

-- =============================================
-- Modules Table
-- =============================================
CREATE TABLE modules (
    module_code VARCHAR(50) PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO modules (module_code, module_name, sort_order) VALUES
('USER_MANAGEMENT', 'User Management', 1),
('ORDER_MANAGEMENT', 'Order Management', 2),
('PRODUCT_MANAGEMENT', 'Product Management', 3),
('DRIVER_MANAGEMENT', 'Driver Management', 4),
('PAYMENT_MANAGEMENT', 'Payment Management', 5),
('REPORT_MANAGEMENT', 'Report Management', 6),
('SYSTEM_CONFIGURATION', 'System Configuration', 7),
('CUSTOMER_SERVICE', 'Customer Service', 8),
('MARKETING_MANAGEMENT', 'Marketing Management', 9),
('SUBSCRIPTION_MANAGEMENT', 'Subscription Management', 10);

-- =============================================
-- Permission Types Table
-- =============================================
CREATE TABLE permission_types (
    type_code VARCHAR(20) PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL
);

INSERT INTO permission_types (type_code, type_name) VALUES
('CREATE', 'Create'),
('READ', 'Read'),
('UPDATE', 'Update'),
('DELETE', 'Delete'),
('EXECUTE', 'Execute'),
('APPROVE', 'Approve'),
('REJECT', 'Reject'),
('EXPORT', 'Export'),
('IMPORT', 'Import'),
('ASSIGN', 'Assign'),
('REVOKE', 'Revoke');

-- =============================================
-- Permissions Table
-- =============================================
CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    description TEXT,
    module_code VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    action VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_code) REFERENCES modules(module_code),
    FOREIGN KEY (action) REFERENCES permission_types(type_code)
);

CREATE INDEX idx_permissions_module ON permissions(module_code);
CREATE INDEX idx_permissions_code ON permissions(permission_code);
CREATE INDEX idx_permissions_active ON permissions(is_active);

-- =============================================
-- Roles Table
-- =============================================
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    account_type VARCHAR(30) NOT NULL,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 100,
    parent_role_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    FOREIGN KEY (account_type) REFERENCES account_types(type_code),
    FOREIGN KEY (parent_role_id) REFERENCES roles(role_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE INDEX idx_roles_code ON roles(role_code);
CREATE INDEX idx_roles_account_type ON roles(account_type);
CREATE INDEX idx_roles_active ON roles(is_active);

-- =============================================
-- User Roles Junction Table
-- =============================================
CREATE TABLE user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    expires_at TIMESTAMP,
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at);

-- =============================================
-- Role Permissions Junction Table
-- =============================================
CREATE TABLE role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- =============================================
-- Direct User Permissions (Override)
-- =============================================
CREATE TABLE user_permissions (
    user_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = revoke
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    expires_at TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id),
    UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);

-- =============================================
-- Sessions Table
-- =============================================
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    access_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(255),
    device_type VARCHAR(50),
    location POINT,
    is_active BOOLEAN DEFAULT TRUE,
    terminated_at TIMESTAMP,
    terminated_by UUID,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (terminated_by) REFERENCES users(user_id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_access_token ON sessions(access_token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =============================================
-- Audit Log Table
-- =============================================
CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    module_code VARCHAR(50),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (module_code) REFERENCES modules(module_code),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =============================================
-- OTP Table (for password reset and verification)
-- =============================================
CREATE TABLE otps (
    otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('password_reset', 'email_verification', 'phone_verification')),
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_otps_user ON otps(user_id);
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_expires ON otps(expires_at);

-- =============================================
-- Helper Views
-- =============================================

-- View to get all permissions for a user (including role-based)
CREATE VIEW user_effective_permissions AS
SELECT DISTINCT
    u.user_id,
    u.username,
    p.permission_id,
    p.permission_code,
    p.permission_name,
    p.module_code,
    CASE 
        WHEN up.granted IS NOT NULL THEN up.granted
        ELSE TRUE
    END as is_granted,
    COALESCE(up.expires_at, ur.expires_at) as expires_at
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN roles r ON ur.role_id = r.role_id AND r.is_active = TRUE
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.permission_id
LEFT JOIN user_permissions up ON u.user_id = up.user_id AND p.permission_id = up.permission_id
WHERE u.is_active = TRUE 
    AND p.is_active = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- View to get active sessions with user info
CREATE VIEW active_sessions AS
SELECT 
    s.*,
    u.username,
    u.email,
    u.account_type
FROM sessions s
JOIN users u ON s.user_id = u.user_id
WHERE s.is_active = TRUE 
    AND s.expires_at > CURRENT_TIMESTAMP;

-- =============================================
-- Helper Functions
-- =============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_permission_code VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_effective_permissions
        WHERE user_id = p_user_id
            AND permission_code = p_permission_code
            AND is_granted = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_role_to_user(
    p_user_id UUID,
    p_role_code VARCHAR(50),
    p_assigned_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_expires_at TIMESTAMP DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_role_id UUID;
    v_account_type VARCHAR(30);
    v_role_account_type VARCHAR(30);
BEGIN
    -- Get role ID and account type
    SELECT role_id, account_type INTO v_role_id, v_role_account_type
    FROM roles
    WHERE role_code = p_role_code AND is_active = TRUE;
    
    -- Get user account type
    SELECT account_type INTO v_account_type
    FROM users
    WHERE user_id = p_user_id;
    
    -- Check if role is compatible with user account type
    IF v_role_account_type != v_account_type THEN
        RAISE EXCEPTION 'Role account type does not match user account type';
    END IF;
    
    -- Insert or update user role
    INSERT INTO user_roles (user_id, role_id, assigned_by, reason, expires_at)
    VALUES (p_user_id, v_role_id, p_assigned_by, p_reason, p_expires_at)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET 
        is_active = TRUE,
        assigned_at = CURRENT_TIMESTAMP,
        assigned_by = p_assigned_by,
        reason = p_reason,
        expires_at = p_expires_at;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
