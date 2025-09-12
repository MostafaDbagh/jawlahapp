-- =============================================
-- Vendor Services Database Schema
-- =============================================

-- UUID extension (for PostgreSQL only)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Vendor Table
-- =============================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500), -- URL
    about TEXT,
    subscript_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 2. Branch Table
-- =============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500), -- optional branch-specific image
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    work_time JSONB, -- e.g., { "mon": "09:00-18:00", "fri": "10:00-22:00" }
    delivery_time VARCHAR(50), -- e.g., "30-45 min"
    min_order DECIMAL(10,2) DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    free_delivery BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- =============================================
-- 3. Main Category (System-wide)
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 4. Subcategory (Assigned per Branch)
-- =============================================
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    category_id UUID NOT NULL, -- references main category
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500),
    has_offer BOOLEAN DEFAULT FALSE,
    free_delivery BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- =============================================
-- 5. Product
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    subcategory_id UUID, -- optional: can be NULL if not categorized
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500), -- default product image
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
);

-- =============================================
-- 6. Product Variation (e.g., size, color)
-- =============================================
CREATE TABLE product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    attributes JSONB NOT NULL, -- e.g., {"size": "Large", "color": "Red"}
    price DECIMAL(10,2), -- variation-specific pricing
    image VARCHAR(500), -- optional variation-specific image
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =============================================
-- 7. Reviews (for Branches)
-- =============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    user_id UUID NOT NULL, -- assumed to be from external user system
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    -- Prevent duplicate reviews from same user for same branch
    CONSTRAINT unique_user_branch_review UNIQUE (user_id, branch_id),
    CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- =============================================
-- 8. Offers (Promotions at different levels)
-- =============================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('branch', 'subcategory', 'product')),
    entity_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
    value DECIMAL(10,2), -- e.g., 20.0 for 20% off
    title VARCHAR(255),
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 9. Promotions (Marketing Campaigns)
-- =============================================
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE, -- e.g., WELCOME20
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_delivery')),
    value DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INTEGER DEFAULT NULL, -- total uses allowed
    used_count INTEGER DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 10. Payment Methods (for Vendors/Branches)
-- =============================================
CREATE TABLE vendor_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    method VARCHAR(50) NOT NULL, -- e.g., 'cash', 'credit_card', 'apple_pay'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    CONSTRAINT unique_vendor_method UNIQUE (vendor_id, method)
);

-- =============================================
-- 11. Work Schedules (Alternative: if you want history or shifts)
-- =============================================
-- Optional: if you need more than JSON work_time in branches
-- You can remove 'work_time' from 'branches' and use this instead
CREATE TABLE branch_work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT unique_branch_day UNIQUE (branch_id, day_of_week)
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Vendor indexes
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_created ON vendors(created_at);

-- Branch indexes
CREATE INDEX idx_branches_vendor ON branches(vendor_id);
CREATE INDEX idx_branches_active ON branches(is_active);
CREATE INDEX idx_branches_location ON branches(lat, lng);
CREATE INDEX idx_branches_city ON branches(city);

-- Category indexes
CREATE INDEX idx_categories_active ON categories(is_active);

-- Subcategory indexes
CREATE INDEX idx_subcategories_branch ON subcategories(branch_id);
CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_subcategories_active ON subcategories(is_active);

-- Product indexes
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Product variation indexes
CREATE INDEX idx_product_variations_product ON product_variations(product_id);

-- Review indexes
CREATE INDEX idx_reviews_branch ON reviews(branch_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Offer indexes (for offer lookups)
CREATE INDEX idx_offers_entity ON offers (entity_type, entity_id, is_active);
CREATE INDEX idx_offers_dates ON offers(start_date, end_date, is_active);

-- Promotion indexes
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

-- Payment method indexes
CREATE INDEX idx_vendor_payment_methods_vendor ON vendor_payment_methods(vendor_id);

-- Work schedule indexes
CREATE INDEX idx_branch_work_schedules_branch ON branch_work_schedules(branch_id);

-- =============================================
-- Sample Data
-- =============================================

-- Insert sample categories
INSERT INTO categories (name, image) VALUES
('Food & Beverage', 'https://example.com/food.jpg'),
('Electronics', 'https://example.com/electronics.jpg'),
('Fashion', 'https://example.com/fashion.jpg'),
('Home & Garden', 'https://example.com/home.jpg'),
('Health & Beauty', 'https://example.com/health.jpg');

-- Insert sample vendors
INSERT INTO vendors (name, image, about, subscript_date) VALUES
('Pizza Palace', 'https://example.com/pizza-palace.jpg', 'Best pizza in town with fresh ingredients', NOW()),
('Tech Store', 'https://example.com/tech-store.jpg', 'Latest electronics and gadgets', NOW()),
('Fashion Boutique', 'https://example.com/fashion-boutique.jpg', 'Trendy clothing for all ages', NOW());

-- Insert sample branches
INSERT INTO branches (vendor_id, name, lat, lng, address, city, work_time, delivery_time, min_order, delivery_fee, free_delivery) VALUES
((SELECT id FROM vendors WHERE name = 'Pizza Palace'), 'Downtown Branch', 40.7128, -74.0060, '123 Main St, Floor 2', 'New York', '{"mon": "08:00-20:00", "sun": "10:00-18:00"}', '25-40 min', 20.00, 3.99, false),
((SELECT id FROM vendors WHERE name = 'Pizza Palace'), 'Uptown Branch', 40.7589, -73.9851, '456 Broadway', 'New York', '{"mon": "09:00-22:00", "sun": "11:00-19:00"}', '30-45 min', 25.00, 4.99, true),
((SELECT id FROM vendors WHERE name = 'Tech Store'), 'Main Store', 40.7505, -73.9934, '789 5th Ave', 'New York', '{"mon": "10:00-21:00", "sun": "12:00-20:00"}', '15-30 min', 50.00, 0.00, true);

-- Insert sample subcategories
INSERT INTO subcategories (branch_id, category_id, name, has_offer, free_delivery, sort_order) VALUES
((SELECT id FROM branches WHERE name = 'Downtown Branch'), (SELECT id FROM categories WHERE name = 'Food & Beverage'), 'Pizza', true, false, 1),
((SELECT id FROM branches WHERE name = 'Downtown Branch'), (SELECT id FROM categories WHERE name = 'Food & Beverage'), 'Burgers', false, true, 2),
((SELECT id FROM branches WHERE name = 'Uptown Branch'), (SELECT id FROM categories WHERE name = 'Food & Beverage'), 'Pizza', false, true, 1),
((SELECT id FROM branches WHERE name = 'Main Store'), (SELECT id FROM categories WHERE name = 'Electronics'), 'Smartphones', true, true, 1),
((SELECT id FROM branches WHERE name = 'Main Store'), (SELECT id FROM categories WHERE name = 'Electronics'), 'Laptops', false, false, 2);

-- Insert sample products
INSERT INTO products (branch_id, subcategory_id, name, description, price, image) VALUES
((SELECT id FROM branches WHERE name = 'Downtown Branch'), (SELECT id FROM subcategories WHERE name = 'Pizza' AND branch_id = (SELECT id FROM branches WHERE name = 'Downtown Branch')), 'Margherita Pizza', 'Classic tomato and mozzarella pizza', 15.99, 'https://example.com/margherita.jpg'),
((SELECT id FROM branches WHERE name = 'Downtown Branch'), (SELECT id FROM subcategories WHERE name = 'Burgers' AND branch_id = (SELECT id FROM branches WHERE name = 'Downtown Branch')), 'Cheese Burger', 'Juicy beef patty with cheese', 12.99, 'https://example.com/cheese-burger.jpg'),
((SELECT id FROM branches WHERE name = 'Main Store'), (SELECT id FROM subcategories WHERE name = 'Smartphones' AND branch_id = (SELECT id FROM branches WHERE name = 'Main Store')), 'iPhone 15', 'Latest iPhone with advanced features', 999.99, 'https://example.com/iphone15.jpg');

-- Insert sample reviews
INSERT INTO reviews (branch_id, user_id, rating, comment) VALUES
((SELECT id FROM branches WHERE name = 'Downtown Branch'), gen_random_uuid(), 5, 'Fast delivery and delicious food!'),
((SELECT id FROM branches WHERE name = 'Downtown Branch'), gen_random_uuid(), 4, 'Good pizza, could be better'),
((SELECT id FROM branches WHERE name = 'Main Store'), gen_random_uuid(), 5, 'Great service and quality products');

-- Insert sample offers
INSERT INTO offers (entity_type, entity_id, type, value, title, description, start_date, end_date) VALUES
('branch', (SELECT id FROM branches WHERE name = 'Downtown Branch'), 'percentage', 20.0, 'Weekend Special', '20% off all orders', NOW(), NOW() + INTERVAL '7 days'),
('subcategory', (SELECT id FROM subcategories WHERE name = 'Pizza' AND branch_id = (SELECT id FROM branches WHERE name = 'Downtown Branch')), 'fixed', 5.0, 'Pizza Discount', '$5 off pizza orders', NOW(), NOW() + INTERVAL '3 days');

-- Insert sample promotions
INSERT INTO promotions (title, code, type, value, min_order_amount, max_discount, usage_limit, start_date, end_date) VALUES
('Welcome Offer', 'WELCOME20', 'percentage', 20.0, 30.00, 10.00, 100, NOW(), NOW() + INTERVAL '30 days'),
('Free Delivery Weekend', 'FREEDEL', 'free_delivery', 0.0, 25.00, NULL, 500, NOW(), NOW() + INTERVAL '2 days');
